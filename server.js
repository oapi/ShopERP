// CoreTrade ERP — Islam Enterprise (Quality Materials, Lasting Trust) — zero-dependency Node.js server
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { db, hashPassword } = require('./db');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const UPLOADS_DIR = path.join(PUBLIC_DIR, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.csv': 'text/csv; charset=utf-8',
};

// ---------- helpers ----------
function json(res, code, data) {
  const body = JSON.stringify(data);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(body);
}
function err(res, code, message) { json(res, code, { error: message }); }

function sendCSV(res, filename, csvString) {
  res.writeHead(200, {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="${filename}"`,
  });
  res.end(csvString);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 10e6) req.destroy(); });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function readJSON(req) {
  return readBody(req).then(data => {
    if (!data) return {};
    try { return JSON.parse(data); } catch { throw new Error('Invalid JSON'); }
  });
}

const num = v => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const str = v => (v === null || v === undefined) ? '' : String(v).trim();
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function transaction(fn) {
  db.exec('BEGIN');
  try { const r = fn(); db.exec('COMMIT'); return r; }
  catch (e) { db.exec('ROLLBACK'); throw e; }
}

// CSV Parser & Serializer
function parseCSV(text) {
  const lines = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        cell += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(cell.trim());
        cell = '';
      } else if (char === '\r' && nextChar === '\n') {
        row.push(cell.trim());
        cell = '';
        lines.push(row);
        row = [];
        i++;
      } else if (char === '\n' || char === '\r') {
        row.push(cell.trim());
        cell = '';
        lines.push(row);
        row = [];
      } else {
        cell += char;
      }
    }
  }
  if (cell || row.length > 0) {
    row.push(cell.trim());
    lines.push(row);
  }

  const validLines = lines.filter(r => r.some(c => c !== ''));
  if (validLines.length < 2) return [];

  const headers = validLines[0].map(h => h.toLowerCase().replace(/[^a-z0-9_]/g, '_'));
  const results = [];

  for (let i = 1; i < validLines.length; i++) {
    const r = validLines[i];
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = r[idx] !== undefined ? r[idx] : '';
    });
    results.push(obj);
  }

  return results;
}

function toCSV(rows, headers) {
  const escapeCell = (val) => {
    if (val === null || val === undefined) return '';
    const s = String(val);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };

  const headerLine = headers.join(',');
  const lines = rows.map(r => headers.map(h => escapeCell(r[h])).join(','));
  return [headerLine, ...lines].join('\n');
}

// Authentication & RBAC helpers
function getAuthUser(req) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;

  const row = db.prepare(`
    SELECT u.id, u.username, u.name, u.role
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token = ? AND u.active = 1
  `).get(token);

  return row || null;
}

function requireAuth(req, res) {
  const user = getAuthUser(req);
  if (!user) {
    err(res, 401, 'Authentication required');
    return null;
  }
  return user;
}

function requireAdmin(req, res) {
  const user = requireAuth(req, res);
  if (!user) return null;
  if (user.role !== 'admin') {
    err(res, 403, 'Permission denied: Only Admin can perform this action');
    return null;
  }
  return user;
}

// Balance helpers
function customerBalance(id) {
  const s = db.prepare('SELECT COALESCE(SUM(total - paid),0) AS due FROM sales WHERE customer_id = ?').get(id).due;
  const p = db.prepare("SELECT COALESCE(SUM(amount),0) AS amt FROM payments WHERE party_type='customer' AND party_id = ?").get(id).amt;
  return Math.round((s - p) * 100) / 100;
}
function supplierBalance(id) {
  const s = db.prepare('SELECT COALESCE(SUM(total - paid),0) AS due FROM purchases WHERE supplier_id = ?').get(id).due;
  const p = db.prepare("SELECT COALESCE(SUM(amount),0) AS amt FROM payments WHERE party_type='supplier' AND party_id = ?").get(id).amt;
  return Math.round((s - p) * 100) / 100;
}

function accountBalance(acctId) {
  const acct = db.prepare('SELECT opening_balance FROM accounts WHERE id = ?').get(acctId);
  if (!acct) return 0;
  const openBal = acct.opening_balance;

  const inflow = db.prepare(`
    SELECT COALESCE(SUM(amount),0) AS total
    FROM account_transactions
    WHERE account_id = ? AND type IN ('deposit', 'transfer_in', 'sale_collection')
  `).get(acctId).total;

  const outflow = db.prepare(`
    SELECT COALESCE(SUM(amount),0) AS total
    FROM account_transactions
    WHERE account_id = ? AND type IN ('withdrawal', 'transfer_out', 'purchase_payment', 'expense')
  `).get(acctId).total;

  const pymtCust = db.prepare(`
    SELECT COALESCE(SUM(amount),0) AS total
    FROM account_transactions
    WHERE account_id = ? AND type = 'due_payment' AND ref_type = 'payment'
      AND ref_id IN (SELECT id FROM payments WHERE party_type = 'customer')
  `).get(acctId).total;

  const pymtSupp = db.prepare(`
    SELECT COALESCE(SUM(amount),0) AS total
    FROM account_transactions
    WHERE account_id = ? AND type = 'due_payment' AND ref_type = 'payment'
      AND ref_id IN (SELECT id FROM payments WHERE party_type = 'supplier')
  `).get(acctId).total;

  const net = openBal + inflow + pymtCust - outflow - pymtSupp;
  return Math.round(net * 100) / 100;
}

// Server-side Pagination, Sorting & Filtering Query Helper
function queryPaginated(q, {
  fromSql,
  selectCols = '*',
  allowedSortCols = {},
  defaultSortCol = 'id',
  defaultSortDir = 'DESC',
  searchCols = [],
  buildWhere = null
}) {
  const whereClauses = [];
  const args = [];

  if (buildWhere) {
    buildWhere(whereClauses, args);
  }

  const searchTerm = str(q.get('search'));
  if (searchTerm && searchCols.length > 0) {
    const likePattern = `%${searchTerm}%`;
    const searchClause = searchCols.map(c => `${c} LIKE ?`).join(' OR ');
    whereClauses.push(`(${searchClause})`);
    searchCols.forEach(() => args.push(likePattern));
  }

  const whereStr = whereClauses.length > 0 ? ' WHERE ' + whereClauses.join(' AND ') : '';

  // Count total records
  const countSql = `SELECT COUNT(*) AS c FROM ${fromSql}${whereStr}`;
  const total = db.prepare(countSql).get(...args).c;

  // Pagination parameters
  const rawPage = parseInt(q.get('page'), 10);
  const page = (Number.isFinite(rawPage) && rawPage > 0) ? rawPage : 1;

  const rawLimit = q.get('limit');
  let limit = 10;
  if (rawLimit === 'all') {
    limit = Math.max(1, total);
  } else {
    const parsedLimit = parseInt(rawLimit, 10);
    if (Number.isFinite(parsedLimit) && parsedLimit > 0) {
      limit = Math.min(100, parsedLimit);
    }
  }

  const totalPages = Math.ceil(total / limit) || 1;
  const validPage = Math.min(page, totalPages);
  const offset = (validPage - 1) * limit;

  // Sorting parameters with whitelisting
  const reqSortBy = str(q.get('sort_by'));
  const sortColExpr = allowedSortCols[reqSortBy] || allowedSortCols[defaultSortCol] || defaultSortCol;

  const reqSortDir = str(q.get('sort_dir')).toUpperCase();
  const sortDir = (reqSortDir === 'ASC' || reqSortDir === 'DESC') ? reqSortDir : defaultSortDir;

  const fromParts = fromSql.trim().split(/\s+/);
  const tableOrAlias = fromParts.length > 1 ? fromParts[fromParts.length - 1] : fromParts[0];
  const orderStr = ` ORDER BY ${sortColExpr} ${sortDir}, ${tableOrAlias}.id ${sortDir}`;

  // Fetch paginated data
  const dataSql = `SELECT ${selectCols} FROM ${fromSql}${whereStr}${orderStr} LIMIT ? OFFSET ?`;
  const data = db.prepare(dataSql).all(...args, limit, offset);

  return {
    data,
    total,
    page: validPage,
    limit,
    total_pages: totalPages
  };
}

// ---------- API handlers ----------
const routes = [];
function route(method, pattern, handler) {
  const keys = [];
  const rx = new RegExp('^' + pattern.replace(/:[^/]+/g, m => { keys.push(m.slice(1)); return '([^/]+)'; }) + '$');
  routes.push({ method, rx, keys, handler });
}

// ---- Authentication Routes ----
route('POST', '/api/auth/login', async (req, res) => {
  const b = await readJSON(req);
  const username = str(b.username);
  const password = str(b.password);
  if (!username || !password) return err(res, 400, 'Username and password are required');

  const hashed = hashPassword(password);
  const user = db.prepare('SELECT id, username, name, role FROM users WHERE username = ? AND password_hash = ? AND active = 1').get(username, hashed);
  if (!user) return err(res, 401, 'Invalid username or password');

  const token = crypto.randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions (token, user_id) VALUES (?,?)').run(token, user.id);

  json(res, 200, { token, user });
});

route('GET', '/api/auth/me', (req, res) => {
  const user = getAuthUser(req);
  if (!user) return err(res, 401, 'Not authenticated');
  json(res, 200, { user });
});

route('POST', '/api/auth/logout', (req, res) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  json(res, 200, { ok: true });
});

// ---- Global Settings Routes ----
route('GET', '/api/settings', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  for (const r of rows) {
    settings[r.key] = r.value;
  }
  json(res, 200, settings);
});

route('PUT', '/api/settings', async (req, res) => {
  const user = requireAdmin(req, res);
  if (!user) return;
  const b = await readJSON(req);
  if (!b || typeof b !== 'object') return err(res, 400, 'Invalid settings payload');

  if (b.business_logo && typeof b.business_logo === 'string' && b.business_logo.startsWith('data:image/')) {
    try {
      const matches = b.business_logo.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
      if (matches) {
        let ext = matches[1].toLowerCase();
        if (ext === 'jpeg') ext = 'jpg';
        if (ext === 'svg+xml') ext = 'svg';
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');
        const filename = `logo_${Date.now()}.${ext}`;
        const filePath = path.join(UPLOADS_DIR, filename);
        fs.writeFileSync(filePath, buffer);
        b.business_logo = `/uploads/${filename}`;
      }
    } catch (e) {
      console.error('Failed to save business logo:', e);
    }
  }

  const stmt = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
  transaction(() => {
    for (const [k, v] of Object.entries(b)) {
      if (typeof k === 'string' && v !== undefined && v !== null) {
        stmt.run(k, String(v));
      }
    }
  });

  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  for (const r of rows) {
    settings[r.key] = r.value;
  }
  json(res, 200, { message: 'Settings updated successfully', settings });
});

// ---- Database Backup & Restore Routes ----
route('GET', '/api/system/backup', (req, res) => {
  if (!requireAdmin(req, res)) return;
  const dbPath = path.join(__dirname, 'data', 'shop.db');
  if (!fs.existsSync(dbPath)) return err(res, 404, 'Database file not found');
  try {
    db.exec('PRAGMA wal_checkpoint(FULL);');
    const data = fs.readFileSync(dbPath);
    res.writeHead(200, {
      'Content-Type': 'application/x-sqlite3',
      'Content-Disposition': `attachment; filename="coretrade_erp_backup_${today()}.db"`,
    });
    res.end(data);
  } catch (e) {
    err(res, 500, 'Backup failed: ' + e.message);
  }
});

route('POST', '/api/system/restore', async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);
    if (buffer.length < 100) return err(res, 400, 'File is too small to be a valid SQLite database');

    const header = buffer.subarray(0, 16).toString('utf8');
    if (!header.startsWith('SQLite format 3')) {
      return err(res, 400, 'Invalid file format: Not a valid SQLite database (.db)');
    }

    const dbPath = path.join(__dirname, 'data', 'shop.db');
    const tmpPath = path.join(__dirname, 'data', 'shop.db.restore_tmp');
    fs.writeFileSync(tmpPath, buffer);

    const { DatabaseSync } = require('node:sqlite');
    const sourceDb = new DatabaseSync(tmpPath);

    // Verify source database schema
    try {
      sourceDb.prepare('SELECT count(*) FROM users').get();
      sourceDb.prepare('SELECT count(*) FROM products').get();
      sourceDb.prepare('SELECT count(*) FROM sales').get();
    } catch (e) {
      sourceDb.close();
      try { if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath); } catch (err) {}
      return err(res, 400, 'Backup validation failed: Invalid database schema (' + e.message + ')');
    }

    // Perform atomic in-database restore
    transaction(() => {
      db.exec(`
        DELETE FROM sale_items;
        DELETE FROM sales;
        DELETE FROM purchase_items;
        DELETE FROM purchases;
        DELETE FROM account_transactions;
        DELETE FROM payments;
        DELETE FROM expenses;
        DELETE FROM products;
        DELETE FROM customers;
        DELETE FROM suppliers;
        DELETE FROM accounts;
        DELETE FROM sessions;
        DELETE FROM users;
      `);

      const tables = ['users', 'sessions', 'accounts', 'account_transactions', 'products', 'customers', 'suppliers', 'sales', 'sale_items', 'purchases', 'purchase_items', 'payments', 'expenses', 'settings'];
      for (const t of tables) {
        try {
          const rows = sourceDb.prepare(`SELECT * FROM ${t}`).all();
          if (!rows || rows.length === 0) continue;
          const cols = Object.keys(rows[0]);
          const placeholders = cols.map(() => '?').join(',');
          const ins = db.prepare(`INSERT INTO ${t} (${cols.join(',')}) VALUES (${placeholders})`);
          for (const r of rows) {
            ins.run(...cols.map(c => r[c]));
          }
        } catch (e) {
          // Skip if optional table
        }
      }
    });

    sourceDb.close();
    try { if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath); } catch (e) {}

    json(res, 200, { ok: true, message: 'Database restored successfully!' });
  } catch (e) {
    err(res, 500, 'Restore error: ' + e.message);
  }
});

// ---- Bulk CSV Export Routes ----
route('GET', '/api/export/:entity', (req, res, p) => {
  if (!requireAuth(req, res)) return;
  const entity = p.entity;

  if (entity === 'products') {
    const rows = db.prepare('SELECT name, category, brand, size, unit, purchase_price, retail_price, wholesale_price, stock_qty, low_stock_alert FROM products WHERE active = 1 ORDER BY category, name').all();
    const headers = ['name', 'category', 'brand', 'size', 'unit', 'purchase_price', 'retail_price', 'wholesale_price', 'stock_qty', 'low_stock_alert'];
    return sendCSV(res, 'products_export.csv', toCSV(rows, headers));
  }

  if (entity === 'customers') {
    const rows = db.prepare('SELECT name, phone, address, type FROM customers WHERE active = 1 ORDER BY name').all();
    const headers = ['name', 'phone', 'address', 'type'];
    return sendCSV(res, 'customers_export.csv', toCSV(rows, headers));
  }

  if (entity === 'suppliers') {
    const rows = db.prepare('SELECT name, phone, address FROM suppliers WHERE active = 1 ORDER BY name').all();
    const headers = ['name', 'phone', 'address'];
    return sendCSV(res, 'suppliers_export.csv', toCSV(rows, headers));
  }

  if (entity === 'sales') {
    const rows = db.prepare(`
      SELECT s.invoice_no, s.date, s.customer_name, COALESCE(c.phone,'') AS customer_phone, s.sale_type,
             si.product_name, si.qty, si.unit_price, s.discount, s.paid,
             COALESCE(a.name,'') AS account_name, s.note
      FROM sales s
      JOIN sale_items si ON si.sale_id = s.id
      LEFT JOIN customers c ON c.id = s.customer_id
      LEFT JOIN accounts a ON a.id = s.account_id
      ORDER BY s.date DESC, s.id DESC
    `).all();
    const headers = ['invoice_no', 'date', 'customer_name', 'customer_phone', 'sale_type', 'product_name', 'qty', 'unit_price', 'discount', 'paid', 'account_name', 'note'];
    return sendCSV(res, 'sales_export.csv', toCSV(rows, headers));
  }

  if (entity === 'purchases') {
    const rows = db.prepare(`
      SELECT pu.ref_no, pu.date, pu.supplier_name, COALESCE(s.phone,'') AS supplier_phone,
             pi.product_name, pi.qty, pi.unit_cost, pu.paid,
             COALESCE(a.name,'') AS account_name, pu.note
      FROM purchases pu
      JOIN purchase_items pi ON pi.purchase_id = pu.id
      LEFT JOIN suppliers s ON s.id = pu.supplier_id
      LEFT JOIN accounts a ON a.id = pu.account_id
      ORDER BY pu.date DESC, pu.id DESC
    `).all();
    const headers = ['ref_no', 'date', 'supplier_name', 'supplier_phone', 'product_name', 'qty', 'unit_cost', 'paid', 'account_name', 'note'];
    return sendCSV(res, 'purchases_export.csv', toCSV(rows, headers));
  }

  if (entity === 'expenses') {
    const rows = db.prepare(`
      SELECT ex.date, ex.category, ex.amount, COALESCE(a.name,'') AS account_name, ex.note
      FROM expenses ex
      LEFT JOIN accounts a ON a.id = ex.account_id
      ORDER BY ex.date DESC, ex.id DESC
    `).all();
    const headers = ['date', 'category', 'amount', 'account_name', 'note'];
    return sendCSV(res, 'expenses_export.csv', toCSV(rows, headers));
  }

  return err(res, 400, 'Invalid export entity');
});

// ---- Bulk CSV Import Routes (Transaction-Safe & Business Logic Enforced) ----
route('POST', '/api/import/:entity', async (req, res, p) => {
  const user = requireAdmin(req, res);
  if (!user) return;
  const entity = p.entity;
  const rawText = await readBody(req);
  if (!rawText) return err(res, 400, 'Empty CSV content');

  const rows = parseCSV(rawText);
  if (rows.length === 0) return err(res, 400, 'No data rows found in CSV');

  try {
    let count = 0;

    if (entity === 'products') {
      transaction(() => {
        const ins = db.prepare(`
          INSERT INTO products (name, category, brand, size, unit, purchase_price, retail_price, wholesale_price, stock_qty, low_stock_alert)
          VALUES (?,?,?,?,?,?,?,?,?,?)
        `);
        rows.forEach((r, idx) => {
          const lineNum = idx + 2;
          const name = str(r.name);
          if (!name) throw new Error(`Line ${lineNum}: Product name is required`);
          const purchase_price = num(r.purchase_price);
          const retail_price = num(r.retail_price);
          const wholesale_price = num(r.wholesale_price);
          const stock_qty = num(r.stock_qty);
          const low_stock_alert = num(r.low_stock_alert);
          if (purchase_price < 0 || retail_price < 0 || stock_qty < 0) {
            throw new Error(`Line ${lineNum}: Prices and stock must be >= 0`);
          }

          ins.run(name, str(r.category) || 'other', str(r.brand), str(r.size), str(r.unit) || 'pcs',
            purchase_price, retail_price, wholesale_price, stock_qty, low_stock_alert);
          count++;
        });
      });
      return json(res, 200, { imported_count: count, message: `Successfully imported ${count} products` });
    }

    if (entity === 'customers') {
      transaction(() => {
        const ins = db.prepare('INSERT INTO customers (name, phone, address, type) VALUES (?,?,?,?)');
        rows.forEach((r, idx) => {
          const lineNum = idx + 2;
          const name = str(r.name);
          if (!name) throw new Error(`Line ${lineNum}: Customer name is required`);
          ins.run(name, str(r.phone), str(r.address), str(r.type) === 'wholesale' ? 'wholesale' : 'retail');
          count++;
        });
      });
      return json(res, 200, { imported_count: count, message: `Successfully imported ${count} customers` });
    }

    if (entity === 'suppliers') {
      transaction(() => {
        const ins = db.prepare('INSERT INTO suppliers (name, phone, address) VALUES (?,?,?)');
        rows.forEach((r, idx) => {
          const lineNum = idx + 2;
          const name = str(r.name);
          if (!name) throw new Error(`Line ${lineNum}: Supplier name is required`);
          ins.run(name, str(r.phone), str(r.address));
          count++;
        });
      });
      return json(res, 200, { imported_count: count, message: `Successfully imported ${count} suppliers` });
    }

    if (entity === 'expenses') {
      transaction(() => {
        const insExp = db.prepare('INSERT INTO expenses (date, category, amount, account_id, note, created_by) VALUES (?,?,?,?,?,?)');
        const insTrx = db.prepare('INSERT INTO account_transactions (account_id, type, amount, ref_type, ref_id, date, note, created_by) VALUES (?,?,?,?,?,?,?,?)');
        const findAcct = db.prepare('SELECT id FROM accounts WHERE name = ? AND active = 1');

        rows.forEach((r, idx) => {
          const lineNum = idx + 2;
          const amount = num(r.amount);
          if (amount <= 0) throw new Error(`Line ${lineNum}: Expense amount must be > 0`);

          let account_id = null;
          const acctName = str(r.account_name);
          if (acctName) {
            const acct = findAcct.get(acctName);
            if (!acct) throw new Error(`Line ${lineNum}: Account '${acctName}' not found`);
            account_id = acct.id;
          } else {
            const defaultAcct = db.prepare('SELECT id FROM accounts WHERE active = 1 ORDER BY id LIMIT 1').get();
            if (defaultAcct) account_id = defaultAcct.id;
          }

          const d = str(r.date) || today();
          const expRes = insExp.run(d, str(r.category) || 'other', amount, account_id, str(r.note), user.id);

          if (account_id) {
            insTrx.run(account_id, 'expense', amount, 'expense', expRes.lastInsertRowid, d, `Imported expense (${str(r.category)})`, user.id);
          }
          count++;
        });
      });
      return json(res, 200, { imported_count: count, message: `Successfully imported ${count} expenses` });
    }

    if (entity === 'sales') {
      transaction(() => {
        // Group by invoice_no or row-by-row if no invoice_no
        const groups = new Map();
        rows.forEach((r, idx) => {
          const lineNum = idx + 2;
          const invNo = str(r.invoice_no) || (`INV-IMP-${idx + 1}`);
          if (!groups.has(invNo)) groups.set(invNo, []);
          groups.get(invNo).push({ ...r, lineNum });
        });

        const findProd = db.prepare('SELECT * FROM products WHERE name = ? AND active = 1');
        const findCust = db.prepare("SELECT * FROM customers WHERE (phone = ? AND phone != '') OR name = ?");
        const findAcct = db.prepare('SELECT id FROM accounts WHERE name = ? AND active = 1');

        groups.forEach((items, invNo) => {
          const first = items[0];

          // Map Customer
          let customer_id = null;
          let customer_name = str(first.customer_name) || 'Walk-in';
          const custPhone = str(first.customer_phone);
          const custRec = findCust.get(custPhone, customer_name);
          if (custRec) {
            customer_id = custRec.id;
            customer_name = custRec.name;
          }

          // Map Account
          let account_id = null;
          const acctName = str(first.account_name);
          if (acctName) {
            const acct = findAcct.get(acctName);
            if (!acct) throw new Error(`Line ${first.lineNum}: Account '${acctName}' not found`);
            account_id = acct.id;
          } else {
            const defaultAcct = db.prepare('SELECT id FROM accounts WHERE active = 1 ORDER BY id LIMIT 1').get();
            if (defaultAcct) account_id = defaultAcct.id;
          }

          let subtotal = 0;
          const preparedItems = items.map(it => {
            const prodName = str(it.product_name);
            if (!prodName) throw new Error(`Line ${it.lineNum}: Product name required`);
            const prod = findProd.get(prodName);
            if (!prod) throw new Error(`Line ${it.lineNum}: Product '${prodName}' not found in inventory`);
            const qty = num(it.qty);
            const unit_price = num(it.unit_price) || prod.retail_price;
            if (qty <= 0) throw new Error(`Line ${it.lineNum}: Quantity must be > 0`);
            const line_total = Math.round(qty * unit_price * 100) / 100;
            subtotal += line_total;
            return { prod, qty, unit_price, line_total };
          });

          subtotal = Math.round(subtotal * 100) / 100;
          const discount = Math.min(num(first.discount), subtotal);
          const total = Math.round((subtotal - discount) * 100) / 100;
          let paid = num(first.paid);
          if (paid > total) paid = total;

          if (total - paid > 0.009 && !customer_id) {
            // Auto create customer if credit sale
            const insCust = db.prepare('INSERT INTO customers (name, phone) VALUES (?,?)').run(customer_name, custPhone);
            customer_id = insCust.lastInsertRowid;
          }

          const d = str(first.date) || today();
          const rSale = db.prepare(`
            INSERT INTO sales (invoice_no, customer_id, customer_name, sale_type, date, subtotal, discount, total, paid, account_id, note, created_by)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
          `).run(invNo, customer_id, customer_name, str(first.sale_type) === 'wholesale' ? 'wholesale' : 'retail',
            d, subtotal, discount, total, paid, account_id, str(first.note), user.id);
          const saleId = rSale.lastInsertRowid;

          const insItem = db.prepare(`INSERT INTO sale_items (sale_id, product_id, product_name, unit, qty, unit_price, unit_cost, line_total) VALUES (?,?,?,?,?,?,?,?)`);
          const decStock = db.prepare('UPDATE products SET stock_qty = stock_qty - ? WHERE id = ?');

          preparedItems.forEach(it => {
            const label = [it.prod.name, it.prod.brand, it.prod.size].filter(Boolean).join(' ');
            insItem.run(saleId, it.prod.id, label, it.prod.unit, it.qty, it.unit_price, it.prod.purchase_price, it.line_total);
            decStock.run(it.qty, it.prod.id);
          });

          if (paid > 0 && account_id) {
            db.prepare(`INSERT INTO account_transactions (account_id, type, amount, ref_type, ref_id, date, note, created_by) VALUES (?,?,?,?,?,?,?,?)`).run(
              account_id, 'sale_collection', paid, 'sale', saleId, d, `Imported Invoice ${invNo} payment`, user.id);
          }

          count++;
        });
      });
      return json(res, 200, { imported_count: count, message: `Successfully imported ${count} sales transactions` });
    }

    if (entity === 'purchases') {
      transaction(() => {
        const groups = new Map();
        rows.forEach((r, idx) => {
          const lineNum = idx + 2;
          const refNo = str(r.ref_no) || (`PUR-IMP-${idx + 1}`);
          if (!groups.has(refNo)) groups.set(refNo, []);
          groups.get(refNo).push({ ...r, lineNum });
        });

        const findProd = db.prepare('SELECT * FROM products WHERE name = ? AND active = 1');
        const findSupp = db.prepare("SELECT * FROM suppliers WHERE (phone = ? AND phone != '') OR name = ?");
        const findAcct = db.prepare('SELECT id FROM accounts WHERE name = ? AND active = 1');

        groups.forEach((items, refNo) => {
          const first = items[0];

          let supplier_id = null;
          let supplier_name = str(first.supplier_name);
          const suppPhone = str(first.supplier_phone);
          if (supplier_name) {
            const suppRec = findSupp.get(suppPhone, supplier_name);
            if (suppRec) {
              supplier_id = suppRec.id;
              supplier_name = suppRec.name;
            } else {
              const insSupp = db.prepare('INSERT INTO suppliers (name, phone) VALUES (?,?)').run(supplier_name, suppPhone);
              supplier_id = insSupp.lastInsertRowid;
            }
          }

          let account_id = null;
          const acctName = str(first.account_name);
          if (acctName) {
            const acct = findAcct.get(acctName);
            if (!acct) throw new Error(`Line ${first.lineNum}: Account '${acctName}' not found`);
            account_id = acct.id;
          } else {
            const defaultAcct = db.prepare('SELECT id FROM accounts WHERE active = 1 ORDER BY id LIMIT 1').get();
            if (defaultAcct) account_id = defaultAcct.id;
          }

          let total = 0;
          const preparedItems = items.map(it => {
            const prodName = str(it.product_name);
            if (!prodName) throw new Error(`Line ${it.lineNum}: Product name required`);
            const prod = findProd.get(prodName);
            if (!prod) throw new Error(`Line ${it.lineNum}: Product '${prodName}' not found`);
            const qty = num(it.qty);
            const unit_cost = num(it.unit_cost) || prod.purchase_price;
            if (qty <= 0) throw new Error(`Line ${it.lineNum}: Quantity must be > 0`);
            const line_total = Math.round(qty * unit_cost * 100) / 100;
            total += line_total;
            return { prod, qty, unit_cost, line_total };
          });

          total = Math.round(total * 100) / 100;
          let paid = num(first.paid);
          if (paid > total) paid = total;

          const d = str(first.date) || today();
          const rPu = db.prepare(`INSERT INTO purchases (ref_no, supplier_id, supplier_name, date, total, paid, account_id, note, created_by) VALUES (?,?,?,?,?,?,?,?,?)`).run(
            refNo, supplier_id, supplier_name, d, total, paid, account_id, str(first.note), user.id);
          const puId = rPu.lastInsertRowid;

          const insItem = db.prepare(`INSERT INTO purchase_items (purchase_id, product_id, product_name, unit, qty, unit_cost, line_total) VALUES (?,?,?,?,?,?,?)`);
          const incStock = db.prepare('UPDATE products SET stock_qty = stock_qty + ?, purchase_price = ? WHERE id = ?');

          preparedItems.forEach(it => {
            const label = [it.prod.name, it.prod.brand, it.prod.size].filter(Boolean).join(' ');
            insItem.run(puId, it.prod.id, label, it.prod.unit, it.qty, it.unit_cost, it.line_total);
            incStock.run(it.qty, it.unit_cost, it.prod.id);
          });

          if (paid > 0 && account_id) {
            db.prepare(`INSERT INTO account_transactions (account_id, type, amount, ref_type, ref_id, date, note, created_by) VALUES (?,?,?,?,?,?,?,?)`).run(
              account_id, 'purchase_payment', paid, 'purchase', puId, d, `Imported Purchase ${refNo} payment`, user.id);
          }

          count++;
        });
      });
      return json(res, 200, { imported_count: count, message: `Successfully imported ${count} purchases` });
    }

    return err(res, 400, 'Invalid import entity');
  } catch (e) {
    err(res, 400, e.message);
  }
});

// ---- Accounts & Cash Management ----
route('GET', '/api/accounts', (req, res) => {
  if (!requireAuth(req, res)) return;
  const rows = db.prepare('SELECT * FROM accounts WHERE active = 1 ORDER BY id').all();
  for (const a of rows) a.current_balance = accountBalance(a.id);
  json(res, 200, rows);
});

route('POST', '/api/accounts', async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const b = await readJSON(req);
  if (!str(b.name)) return err(res, 400, 'Account name is required');
  const r = db.prepare('INSERT INTO accounts (name, type, account_number, opening_balance) VALUES (?,?,?,?)').run(
    str(b.name), str(b.type) || 'cash', str(b.account_number), num(b.opening_balance));
  const acct = db.prepare('SELECT * FROM accounts WHERE id = ?').get(r.lastInsertRowid);
  acct.current_balance = accountBalance(acct.id);
  json(res, 201, acct);
});

route('PUT', '/api/accounts/:id', async (req, res, p) => {
  if (!requireAdmin(req, res)) return;
  const b = await readJSON(req);
  const existing = db.prepare('SELECT * FROM accounts WHERE id = ?').get(p.id);
  if (!existing) return err(res, 404, 'Account not found');
  db.prepare('UPDATE accounts SET name=?, type=?, account_number=?, opening_balance=? WHERE id=?').run(
    str(b.name) || existing.name, str(b.type) || existing.type, str(b.account_number), num(b.opening_balance), p.id);
  const acct = db.prepare('SELECT * FROM accounts WHERE id = ?').get(p.id);
  acct.current_balance = accountBalance(acct.id);
  json(res, 200, acct);
});

route('DELETE', '/api/accounts/:id', (req, res, p) => {
  if (!requireAdmin(req, res)) return;
  db.prepare('UPDATE accounts SET active = 0 WHERE id = ?').run(p.id);
  json(res, 200, { ok: true });
});

route('GET', '/api/accounts/:id/statement', (req, res, p) => {
  if (!requireAuth(req, res)) return;
  const acct = db.prepare('SELECT * FROM accounts WHERE id = ?').get(p.id);
  if (!acct) return err(res, 404, 'Account not found');

  const txs = db.prepare('SELECT * FROM account_transactions WHERE account_id = ? ORDER BY date, id').all(p.id);
  let running = acct.opening_balance;
  const entries = txs.map(t => {
    let debit = 0;
    let credit = 0;
    if (['deposit', 'transfer_in', 'sale_collection'].includes(t.type)) {
      debit = t.amount;
      running += debit;
    } else if (['withdrawal', 'transfer_out', 'purchase_payment', 'expense'].includes(t.type)) {
      credit = t.amount;
      running -= credit;
    } else if (t.type === 'due_payment') {
      const pm = db.prepare('SELECT party_type FROM payments WHERE id = ?').get(t.ref_id);
      if (pm && pm.party_type === 'customer') {
        debit = t.amount;
        running += debit;
      } else {
        credit = t.amount;
        running -= credit;
      }
    }
    return { ...t, debit, credit, balance: Math.round(running * 100) / 100 };
  });

  json(res, 200, { account: acct, current_balance: Math.round(running * 100) / 100, entries });
});

route('POST', '/api/accounts/deposit', async (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const b = await readJSON(req);
  const acctId = Number(b.account_id);
  const amount = num(b.amount);
  if (!acctId || amount <= 0) return err(res, 400, 'Valid account and positive amount required');
  const acct = db.prepare('SELECT id FROM accounts WHERE id = ? AND active = 1').get(acctId);
  if (!acct) return err(res, 404, 'Account not found');

  const r = db.prepare('INSERT INTO account_transactions (account_id, type, amount, date, note, created_by) VALUES (?,?,?,?,?,?)').run(
    acctId, 'deposit', amount, str(b.date) || today(), str(b.note) || 'Capital Deposit', user.id);
  json(res, 201, db.prepare('SELECT * FROM account_transactions WHERE id = ?').get(r.lastInsertRowid));
});

route('POST', '/api/accounts/withdraw', async (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const b = await readJSON(req);
  const acctId = Number(b.account_id);
  const amount = num(b.amount);
  if (!acctId || amount <= 0) return err(res, 400, 'Valid account and positive amount required');
  const acct = db.prepare('SELECT id FROM accounts WHERE id = ? AND active = 1').get(acctId);
  if (!acct) return err(res, 404, 'Account not found');

  const r = db.prepare('INSERT INTO account_transactions (account_id, type, amount, date, note, created_by) VALUES (?,?,?,?,?,?)').run(
    acctId, 'withdrawal', amount, str(b.date) || today(), str(b.note) || 'Owner Drawing / Withdrawal', user.id);
  json(res, 201, db.prepare('SELECT * FROM account_transactions WHERE id = ?').get(r.lastInsertRowid));
});

route('POST', '/api/accounts/transfer', async (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const b = await readJSON(req);
  const fromId = Number(b.from_account_id);
  const toId = Number(b.to_account_id);
  const amount = num(b.amount);
  if (!fromId || !toId || fromId === toId || amount <= 0) {
    return err(res, 400, 'Distinct source and target accounts with positive amount required');
  }

  try {
    transaction(() => {
      const date = str(b.date) || today();
      const note = str(b.note) || 'Internal Fund Transfer';
      db.prepare('INSERT INTO account_transactions (account_id, type, amount, related_account_id, date, note, created_by) VALUES (?,?,?,?,?,?,?)').run(
        fromId, 'transfer_out', amount, toId, date, note, user.id);
      db.prepare('INSERT INTO account_transactions (account_id, type, amount, related_account_id, date, note, created_by) VALUES (?,?,?,?,?,?,?)').run(
        toId, 'transfer_in', amount, fromId, date, note, user.id);
    });
    json(res, 200, { ok: true });
  } catch (e) { err(res, 400, e.message); }
});

// ---- Products ----
route('GET', '/api/products', (req, res, params, q) => {
  if (!requireAuth(req, res)) return;
  const allowedSortCols = {
    name: 'name', category: 'category', brand: 'brand', size: 'size', unit: 'unit',
    purchase_price: 'purchase_price', retail_price: 'retail_price', wholesale_price: 'wholesale_price',
    stock_qty: 'stock_qty', low_stock_alert: 'low_stock_alert', id: 'id'
  };
  const result = queryPaginated(q, {
    fromSql: 'products',
    selectCols: '*',
    allowedSortCols,
    defaultSortCol: 'name',
    defaultSortDir: 'ASC',
    searchCols: ['name', 'brand', 'size', 'category'],
    buildWhere: (clauses, args) => {
      clauses.push('active = 1');
      if (q.get('category')) {
        clauses.push('category = ?');
        args.push(q.get('category'));
      }
    }
  });
  json(res, 200, result);
});

route('GET', '/api/products/:id', (req, res, p) => {
  if (!requireAuth(req, res)) return;
  const prod = db.prepare('SELECT * FROM products WHERE id = ?').get(p.id);
  if (!prod) return err(res, 404, 'Product not found');
  json(res, 200, prod);
});

route('POST', '/api/products', async (req, res) => {
  if (!requireAuth(req, res)) return;
  const b = await readJSON(req);
  if (!str(b.name)) return err(res, 400, 'Product name is required');
  const r = db.prepare(`INSERT INTO products (name, category, brand, size, unit, purchase_price, retail_price, wholesale_price, stock_qty, low_stock_alert)
    VALUES (?,?,?,?,?,?,?,?,?,?)`).run(
    str(b.name), str(b.category) || 'other', str(b.brand), str(b.size), str(b.unit) || 'pcs',
    num(b.purchase_price), num(b.retail_price), num(b.wholesale_price), num(b.stock_qty), num(b.low_stock_alert));
  json(res, 201, db.prepare('SELECT * FROM products WHERE id = ?').get(r.lastInsertRowid));
});

route('PUT', '/api/products/:id', async (req, res, p) => {
  if (!requireAdmin(req, res)) return;
  const b = await readJSON(req);
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(p.id);
  if (!existing) return err(res, 404, 'Product not found');
  db.prepare(`UPDATE products SET name=?, category=?, brand=?, size=?, unit=?, purchase_price=?, retail_price=?, wholesale_price=?, stock_qty=?, low_stock_alert=? WHERE id=?`).run(
    str(b.name) || existing.name, str(b.category) || existing.category, str(b.brand), str(b.size), str(b.unit) || existing.unit,
    num(b.purchase_price), num(b.retail_price), num(b.wholesale_price), num(b.stock_qty), num(b.low_stock_alert), p.id);
  json(res, 200, db.prepare('SELECT * FROM products WHERE id = ?').get(p.id));
});

route('DELETE', '/api/products/:id', (req, res, p) => {
  if (!requireAdmin(req, res)) return;
  db.prepare('UPDATE products SET active = 0 WHERE id = ?').run(p.id);
  json(res, 200, { ok: true });
});

// ---- Customers ----
route('GET', '/api/customers', (req, res, params, q) => {
  if (!requireAuth(req, res)) return;
  const allowedSortCols = {
    name: 'name', phone: 'phone', address: 'address', type: 'type', id: 'id'
  };
  const result = queryPaginated(q, {
    fromSql: 'customers',
    selectCols: '*',
    allowedSortCols,
    defaultSortCol: 'name',
    defaultSortDir: 'ASC',
    searchCols: ['name', 'phone', 'address'],
    buildWhere: (clauses, args) => {
      clauses.push('active = 1');
      if (q.get('type')) {
        clauses.push('type = ?');
        args.push(q.get('type'));
      }
    }
  });
  for (const c of result.data) c.balance = customerBalance(c.id);
  json(res, 200, result);
});

route('POST', '/api/customers', async (req, res) => {
  if (!requireAuth(req, res)) return;
  const b = await readJSON(req);
  if (!str(b.name)) return err(res, 400, 'Customer name is required');
  const r = db.prepare('INSERT INTO customers (name, phone, address, type) VALUES (?,?,?,?)').run(
    str(b.name), str(b.phone), str(b.address), str(b.type) === 'wholesale' ? 'wholesale' : 'retail');
  const c = db.prepare('SELECT * FROM customers WHERE id = ?').get(r.lastInsertRowid);
  c.balance = 0;
  json(res, 201, c);
});

route('PUT', '/api/customers/:id', async (req, res, p) => {
  if (!requireAdmin(req, res)) return;
  const b = await readJSON(req);
  const existing = db.prepare('SELECT * FROM customers WHERE id = ?').get(p.id);
  if (!existing) return err(res, 404, 'Customer not found');
  db.prepare('UPDATE customers SET name=?, phone=?, address=?, type=? WHERE id=?').run(
    str(b.name) || existing.name, str(b.phone), str(b.address), str(b.type) === 'wholesale' ? 'wholesale' : 'retail', p.id);
  const c = db.prepare('SELECT * FROM customers WHERE id = ?').get(p.id);
  c.balance = customerBalance(c.id);
  json(res, 200, c);
});

route('GET', '/api/customers/:id', (req, res, p) => {
  if (!requireAuth(req, res)) return;
  const c = db.prepare('SELECT * FROM customers WHERE id = ?').get(p.id);
  if (!c) return err(res, 404, 'Customer not found');
  c.balance = customerBalance(c.id);
  json(res, 200, c);
});

route('DELETE', '/api/customers/:id', (req, res, p) => {
  if (!requireAdmin(req, res)) return;
  db.prepare('UPDATE customers SET active = 0 WHERE id = ?').run(p.id);
  json(res, 200, { ok: true });
});

route('GET', '/api/customers/:id/ledger', (req, res, p) => {
  if (!requireAuth(req, res)) return;
  const c = db.prepare('SELECT * FROM customers WHERE id = ?').get(p.id);
  if (!c) return err(res, 404, 'Customer not found');
  const sales = db.prepare('SELECT id, invoice_no, date, total, paid, created_at FROM sales WHERE customer_id = ? ORDER BY date, id').all(p.id);
  const payments = db.prepare("SELECT id, date, amount, method, note, created_at FROM payments WHERE party_type='customer' AND party_id = ? ORDER BY date, id").all(p.id);
  const entries = [
    ...sales.map(s => ({ kind: 'sale', id: s.id, date: s.date, ref: s.invoice_no, debit: s.total, credit: s.paid, created_at: s.created_at })),
    ...payments.map(pm => ({ kind: 'payment', id: pm.id, date: pm.date, ref: pm.method + (pm.note ? ' — ' + pm.note : ''), debit: 0, credit: pm.amount, created_at: pm.created_at })),
  ].sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : a.created_at < b.created_at ? -1 : 1);
  let bal = 0;
  for (const e of entries) { bal += e.debit - e.credit; e.balance = Math.round(bal * 100) / 100; }
  json(res, 200, { customer: c, balance: customerBalance(c.id), entries });
});

// ---- Suppliers ----
route('GET', '/api/suppliers', (req, res, params, q) => {
  if (!requireAuth(req, res)) return;
  const allowedSortCols = {
    name: 'name', phone: 'phone', address: 'address', id: 'id'
  };
  const result = queryPaginated(q, {
    fromSql: 'suppliers',
    selectCols: '*',
    allowedSortCols,
    defaultSortCol: 'name',
    defaultSortDir: 'ASC',
    searchCols: ['name', 'phone', 'address'],
    buildWhere: (clauses, args) => {
      clauses.push('active = 1');
    }
  });
  for (const s of result.data) s.balance = supplierBalance(s.id);
  json(res, 200, result);
});

route('POST', '/api/suppliers', async (req, res) => {
  if (!requireAuth(req, res)) return;
  const b = await readJSON(req);
  if (!str(b.name)) return err(res, 400, 'Supplier name is required');
  const r = db.prepare('INSERT INTO suppliers (name, phone, address) VALUES (?,?,?)').run(str(b.name), str(b.phone), str(b.address));
  const s = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(r.lastInsertRowid);
  s.balance = 0;
  json(res, 201, s);
});

route('PUT', '/api/suppliers/:id', async (req, res, p) => {
  if (!requireAdmin(req, res)) return;
  const b = await readJSON(req);
  const existing = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(p.id);
  if (!existing) return err(res, 404, 'Supplier not found');
  db.prepare('UPDATE suppliers SET name=?, phone=?, address=? WHERE id=?').run(str(b.name) || existing.name, str(b.phone), str(b.address), p.id);
  const s = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(p.id);
  s.balance = supplierBalance(s.id);
  json(res, 200, s);
});

route('GET', '/api/suppliers/:id', (req, res, p) => {
  if (!requireAuth(req, res)) return;
  const s = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(p.id);
  if (!s) return err(res, 404, 'Supplier not found');
  s.balance = supplierBalance(s.id);
  json(res, 200, s);
});

route('DELETE', '/api/suppliers/:id', (req, res, p) => {
  if (!requireAdmin(req, res)) return;
  db.prepare('UPDATE suppliers SET active = 0 WHERE id = ?').run(p.id);
  json(res, 200, { ok: true });
});

route('GET', '/api/suppliers/:id/ledger', (req, res, p) => {
  if (!requireAuth(req, res)) return;
  const s = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(p.id);
  if (!s) return err(res, 404, 'Supplier not found');
  const purchases = db.prepare('SELECT id, ref_no, date, total, paid, created_at FROM purchases WHERE supplier_id = ? ORDER BY date, id').all(p.id);
  const payments = db.prepare("SELECT id, date, amount, method, note, created_at FROM payments WHERE party_type='supplier' AND party_id = ? ORDER BY date, id").all(p.id);
  const entries = [
    ...purchases.map(pu => ({ kind: 'purchase', id: pu.id, date: pu.date, ref: pu.ref_no || ('PUR-' + pu.id), debit: pu.total, credit: pu.paid, created_at: pu.created_at })),
    ...payments.map(pm => ({ kind: 'payment', id: pm.id, date: pm.date, ref: pm.method + (pm.note ? ' — ' + pm.note : ''), debit: 0, credit: pm.amount, created_at: pm.created_at })),
  ].sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : a.created_at < b.created_at ? -1 : 1);
  let bal = 0;
  for (const e of entries) { bal += e.debit - e.credit; e.balance = Math.round(bal * 100) / 100; }
  json(res, 200, { supplier: s, balance: supplierBalance(s.id), entries });
});

// ---- Sales ----
route('GET', '/api/sales', (req, res, params, q) => {
  if (!requireAuth(req, res)) return;
  const allowedSortCols = {
    invoice_no: 's.invoice_no', date: 's.date', customer_name: 's.customer_name',
    sale_type: 's.sale_type', total: 's.total', paid: 's.paid', due: '(s.total - s.paid)', id: 's.id'
  };
  const result = queryPaginated(q, {
    fromSql: 'sales s',
    selectCols: 's.*, (s.total - s.paid) AS due',
    allowedSortCols,
    defaultSortCol: 'date',
    defaultSortDir: 'DESC',
    searchCols: ['s.invoice_no', 's.customer_name'],
    buildWhere: (clauses, args) => {
      if (q.get('from')) { clauses.push('s.date >= ?'); args.push(q.get('from')); }
      if (q.get('to')) { clauses.push('s.date <= ?'); args.push(q.get('to')); }
      if (q.get('customer_id')) { clauses.push('s.customer_id = ?'); args.push(q.get('customer_id')); }
      if (q.get('sale_type')) { clauses.push('s.sale_type = ?'); args.push(q.get('sale_type')); }
      if (q.get('status')) {
        const st = q.get('status');
        if (st === 'paid') clauses.push('(s.total - s.paid) <= 0.009');
        else if (st === 'due') clauses.push('s.paid <= 0.009 AND (s.total - s.paid) > 0.009');
        else if (st === 'partial') clauses.push('s.paid > 0.009 AND (s.total - s.paid) > 0.009');
      }
    }
  });
  json(res, 200, result);
});

route('GET', '/api/sales/:id', (req, res, p) => {
  if (!requireAuth(req, res)) return;
  const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(p.id);
  if (!sale) return err(res, 404, 'Sale not found');
  sale.items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(p.id);
  json(res, 200, sale);
});

route('POST', '/api/sales', async (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const b = await readJSON(req);
  const items = Array.isArray(b.items) ? b.items : [];
  if (items.length === 0) return err(res, 400, 'At least one item is required');
  for (const it of items) {
    if (!it.product_id || num(it.qty) <= 0) return err(res, 400, 'Each item needs a product and a quantity > 0');
  }
  try {
    const sale = transaction(() => {
      let subtotal = 0;
      const prepared = items.map(it => {
        const prod = db.prepare('SELECT * FROM products WHERE id = ?').get(it.product_id);
        if (!prod) throw new Error('Product not found: ' + it.product_id);
        const qty = num(it.qty);
        const unit_price = num(it.unit_price);
        const line_total = Math.round(qty * unit_price * 100) / 100;
        subtotal += line_total;
        return { prod, qty, unit_price, line_total };
      });
      subtotal = Math.round(subtotal * 100) / 100;
      const discount = Math.min(num(b.discount), subtotal);
      const total = Math.round((subtotal - discount) * 100) / 100;
      let paid = num(b.paid);
      if (paid < 0) paid = 0;
      if (paid > total) paid = total;

      let customer_id = b.customer_id ? Number(b.customer_id) : null;
      let customer_name = str(b.customer_name) || 'Walk-in';
      if (customer_id) {
        const c = db.prepare('SELECT * FROM customers WHERE id = ?').get(customer_id);
        if (!c) throw new Error('Customer not found');
        customer_name = c.name;
      } else if (total - paid > 0.009) {
        throw new Error('Due sales require a saved customer. Add the customer first.');
      }

      let account_id = b.account_id ? Number(b.account_id) : null;
      if (!account_id) {
        const defaultAcct = db.prepare('SELECT id FROM accounts WHERE active = 1 ORDER BY id LIMIT 1').get();
        if (defaultAcct) account_id = defaultAcct.id;
      }

      const nextId = db.prepare('SELECT COALESCE(MAX(id),0)+1 AS n FROM sales').get().n;
      const invoice_no = 'INV-' + String(nextId).padStart(5, '0');
      const date = str(b.date) || today();
      const r = db.prepare(`INSERT INTO sales (invoice_no, customer_id, customer_name, sale_type, date, subtotal, discount, total, paid, account_id, note, created_by)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(invoice_no, customer_id, customer_name,
        str(b.sale_type) === 'wholesale' ? 'wholesale' : 'retail', date, subtotal, discount, total, paid, account_id, str(b.note), user.id);
      const saleId = r.lastInsertRowid;

      const insItem = db.prepare(`INSERT INTO sale_items (sale_id, product_id, product_name, unit, qty, unit_price, unit_cost, line_total)
        VALUES (?,?,?,?,?,?,?,?)`);
      const decStock = db.prepare('UPDATE products SET stock_qty = stock_qty - ? WHERE id = ?');
      for (const it of prepared) {
        const label = [it.prod.name, it.prod.brand, it.prod.size].filter(Boolean).join(' ');
        insItem.run(saleId, it.prod.id, label, it.prod.unit, it.qty, it.unit_price, it.prod.purchase_price, it.line_total);
        decStock.run(it.qty, it.prod.id);
      }

      if (paid > 0 && account_id) {
        db.prepare(`INSERT INTO account_transactions (account_id, type, amount, ref_type, ref_id, date, note, created_by)
          VALUES (?,?,?,?,?,?,?,?)`).run(account_id, 'sale_collection', paid, 'sale', saleId, date, `Invoice ${invoice_no} payment`, user.id);
      }

      const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(saleId);
      sale.items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(saleId);
      return sale;
    });
    json(res, 201, sale);
  } catch (e) { err(res, 400, e.message); }
});

route('DELETE', '/api/sales/:id', (req, res, p) => {
  if (!requireAdmin(req, res)) return;
  const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(p.id);
  if (!sale) return err(res, 404, 'Sale not found');
  transaction(() => {
    const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(p.id);
    const incStock = db.prepare('UPDATE products SET stock_qty = stock_qty + ? WHERE id = ?');
    for (const it of items) incStock.run(it.qty, it.product_id);
    db.prepare("DELETE FROM account_transactions WHERE ref_type = 'sale' AND ref_id = ?").run(p.id);
    db.prepare('DELETE FROM sale_items WHERE sale_id = ?').run(p.id);
    db.prepare('DELETE FROM sales WHERE id = ?').run(p.id);
  });
  json(res, 200, { ok: true });
});

// ---- Purchases ----
route('GET', '/api/purchases', (req, res, params, q) => {
  if (!requireAuth(req, res)) return;
  const allowedSortCols = {
    ref_no: 'pu.ref_no', date: 'pu.date', supplier_name: 'pu.supplier_name',
    total: 'pu.total', paid: 'pu.paid', due: '(pu.total - pu.paid)', id: 'pu.id'
  };
  const result = queryPaginated(q, {
    fromSql: 'purchases pu',
    selectCols: 'pu.*, (pu.total - pu.paid) AS due',
    allowedSortCols,
    defaultSortCol: 'date',
    defaultSortDir: 'DESC',
    searchCols: ['pu.ref_no', 'pu.supplier_name'],
    buildWhere: (clauses, args) => {
      if (q.get('from')) { clauses.push('pu.date >= ?'); args.push(q.get('from')); }
      if (q.get('to')) { clauses.push('pu.date <= ?'); args.push(q.get('to')); }
      if (q.get('supplier_id')) { clauses.push('pu.supplier_id = ?'); args.push(q.get('supplier_id')); }
    }
  });
  json(res, 200, result);
});

route('GET', '/api/purchases/:id', (req, res, p) => {
  if (!requireAuth(req, res)) return;
  const pu = db.prepare('SELECT * FROM purchases WHERE id = ?').get(p.id);
  if (!pu) return err(res, 404, 'Purchase not found');
  pu.items = db.prepare('SELECT * FROM purchase_items WHERE purchase_id = ?').all(p.id);
  json(res, 200, pu);
});

route('POST', '/api/purchases', async (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const b = await readJSON(req);
  const items = Array.isArray(b.items) ? b.items : [];
  if (items.length === 0) return err(res, 400, 'At least one item is required');
  for (const it of items) {
    if (!it.product_id || num(it.qty) <= 0) return err(res, 400, 'Each item needs a product and a quantity > 0');
  }
  try {
    const purchase = transaction(() => {
      let total = 0;
      const prepared = items.map(it => {
        const prod = db.prepare('SELECT * FROM products WHERE id = ?').get(it.product_id);
        if (!prod) throw new Error('Product not found: ' + it.product_id);
        const qty = num(it.qty);
        const unit_cost = num(it.unit_cost);
        const line_total = Math.round(qty * unit_cost * 100) / 100;
        total += line_total;
        return { prod, qty, unit_cost, line_total };
      });
      total = Math.round(total * 100) / 100;
      let paid = num(b.paid);
      if (paid < 0) paid = 0;
      if (paid > total) paid = total;

      let supplier_id = b.supplier_id ? Number(b.supplier_id) : null;
      let supplier_name = str(b.supplier_name) || (supplier_id ? '' : 'Cash Supplier');
      if (supplier_id) {
        const s = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(supplier_id);
        if (!s) throw new Error('Supplier not found');
        supplier_name = s.name;
      } else if (total - paid > 0.009) {
        throw new Error('Purchases on credit require a saved supplier.');
      }

      let account_id = b.account_id ? Number(b.account_id) : null;
      if (!account_id) {
        const defaultAcct = db.prepare('SELECT id FROM accounts WHERE active = 1 ORDER BY id LIMIT 1').get();
        if (defaultAcct) account_id = defaultAcct.id;
      }

      const date = str(b.date) || today();
      const r = db.prepare(`INSERT INTO purchases (ref_no, supplier_id, supplier_name, date, total, paid, account_id, note, created_by)
        VALUES (?,?,?,?,?,?,?,?,?)`).run(str(b.ref_no), supplier_id, supplier_name, date, total, paid, account_id, str(b.note), user.id);
      const purchaseId = r.lastInsertRowid;

      const insItem = db.prepare(`INSERT INTO purchase_items (purchase_id, product_id, product_name, unit, qty, unit_cost, line_total)
        VALUES (?,?,?,?,?,?,?)`);
      const incStock = db.prepare('UPDATE products SET stock_qty = stock_qty + ?, purchase_price = ? WHERE id = ?');
      for (const it of prepared) {
        const label = [it.prod.name, it.prod.brand, it.prod.size].filter(Boolean).join(' ');
        insItem.run(purchaseId, it.prod.id, label, it.prod.unit, it.qty, it.unit_cost, it.line_total);
        incStock.run(it.qty, it.unit_cost, it.prod.id);
      }

      if (paid > 0 && account_id) {
        db.prepare(`INSERT INTO account_transactions (account_id, type, amount, ref_type, ref_id, date, note, created_by)
          VALUES (?,?,?,?,?,?,?,?)`).run(account_id, 'purchase_payment', paid, 'purchase', purchaseId, date, `Purchase ${str(b.ref_no) || ('PUR-' + purchaseId)} payment`, user.id);
      }

      const pu = db.prepare('SELECT * FROM purchases WHERE id = ?').get(purchaseId);
      pu.items = db.prepare('SELECT * FROM purchase_items WHERE purchase_id = ?').all(purchaseId);
      return pu;
    });
    json(res, 201, purchase);
  } catch (e) { err(res, 400, e.message); }
});

route('DELETE', '/api/purchases/:id', (req, res, p) => {
  if (!requireAdmin(req, res)) return;
  const pu = db.prepare('SELECT * FROM purchases WHERE id = ?').get(p.id);
  if (!pu) return err(res, 404, 'Purchase not found');
  transaction(() => {
    const items = db.prepare('SELECT * FROM purchase_items WHERE purchase_id = ?').all(p.id);
    const decStock = db.prepare('UPDATE products SET stock_qty = stock_qty - ? WHERE id = ?');
    for (const it of items) decStock.run(it.qty, it.product_id);
    db.prepare("DELETE FROM account_transactions WHERE ref_type = 'purchase' AND ref_id = ?").run(p.id);
    db.prepare('DELETE FROM purchase_items WHERE purchase_id = ?').run(p.id);
    db.prepare('DELETE FROM purchases WHERE id = ?').run(p.id);
  });
  json(res, 200, { ok: true });
});

// ---- Payments (due collection / supplier payment) ----
route('GET', '/api/payments', (req, res, params, q) => {
  if (!requireAuth(req, res)) return;
  const allowedSortCols = {
    date: 'date', amount: 'amount', method: 'method', party_type: 'party_type', party_id: 'party_id', id: 'id'
  };
  const result = queryPaginated(q, {
    fromSql: 'payments',
    selectCols: '*',
    allowedSortCols,
    defaultSortCol: 'date',
    defaultSortDir: 'DESC',
    searchCols: ['note', 'method'],
    buildWhere: (clauses, args) => {
      if (q.get('party_type')) { clauses.push('party_type = ?'); args.push(q.get('party_type')); }
      if (q.get('party_id')) { clauses.push('party_id = ?'); args.push(q.get('party_id')); }
      if (q.get('from')) { clauses.push('date >= ?'); args.push(q.get('from')); }
      if (q.get('to')) { clauses.push('date <= ?'); args.push(q.get('to')); }
    }
  });
  const cn = db.prepare('SELECT name FROM customers WHERE id = ?');
  const sn = db.prepare('SELECT name FROM suppliers WHERE id = ?');
  for (const r of result.data) {
    const rec = r.party_type === 'customer' ? cn.get(r.party_id) : sn.get(r.party_id);
    r.party_name = rec ? rec.name : '#' + r.party_id;
  }
  json(res, 200, result);
});

route('POST', '/api/payments', async (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const b = await readJSON(req);
  const party_type = str(b.party_type);
  if (party_type !== 'customer' && party_type !== 'supplier') return err(res, 400, 'party_type must be customer or supplier');
  const party_id = Number(b.party_id);
  const exists = party_type === 'customer'
    ? db.prepare('SELECT id FROM customers WHERE id = ?').get(party_id)
    : db.prepare('SELECT id FROM suppliers WHERE id = ?').get(party_id);
  if (!exists) return err(res, 404, party_type + ' not found');
  const amount = num(b.amount);
  if (amount <= 0) return err(res, 400, 'Amount must be greater than 0');

  let account_id = b.account_id ? Number(b.account_id) : null;
  if (!account_id) {
    const defaultAcct = db.prepare('SELECT id FROM accounts WHERE active = 1 ORDER BY id LIMIT 1').get();
    if (defaultAcct) account_id = defaultAcct.id;
  }

  const date = str(b.date) || today();
  const r = db.prepare('INSERT INTO payments (party_type, party_id, date, amount, method, account_id, note, created_by) VALUES (?,?,?,?,?,?,?,?)').run(
    party_type, party_id, date, amount, str(b.method) || 'cash', account_id, str(b.note), user.id);
  const pymtId = r.lastInsertRowid;

  if (account_id) {
    db.prepare(`INSERT INTO account_transactions (account_id, type, amount, ref_type, ref_id, date, note, created_by)
      VALUES (?,?,?,?,?,?,?,?)`).run(account_id, 'due_payment', amount, 'payment', pymtId, date, `Payment for ${party_type} #${party_id}`, user.id);
  }

  json(res, 201, db.prepare('SELECT * FROM payments WHERE id = ?').get(pymtId));
});

route('DELETE', '/api/payments/:id', (req, res, p) => {
  if (!requireAdmin(req, res)) return;
  transaction(() => {
    db.prepare("DELETE FROM account_transactions WHERE ref_type = 'payment' AND ref_id = ?").run(p.id);
    db.prepare('DELETE FROM payments WHERE id = ?').run(p.id);
  });
  json(res, 200, { ok: true });
});

// ---- Expenses ----
route('GET', '/api/expenses', (req, res, params, q) => {
  if (!requireAuth(req, res)) return;
  const allowedSortCols = {
    date: 'date', category: 'category', amount: 'amount', note: 'note', id: 'id'
  };
  const result = queryPaginated(q, {
    fromSql: 'expenses',
    selectCols: '*',
    allowedSortCols,
    defaultSortCol: 'date',
    defaultSortDir: 'DESC',
    searchCols: ['category', 'note'],
    buildWhere: (clauses, args) => {
      if (q.get('from')) { clauses.push('date >= ?'); args.push(q.get('from')); }
      if (q.get('to')) { clauses.push('date <= ?'); args.push(q.get('to')); }
      if (q.get('category')) { clauses.push('category = ?'); args.push(q.get('category')); }
    }
  });
  json(res, 200, result);
});

route('POST', '/api/expenses', async (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const b = await readJSON(req);
  const amount = num(b.amount);
  if (amount <= 0) return err(res, 400, 'Amount must be greater than 0');

  let account_id = b.account_id ? Number(b.account_id) : null;
  if (!account_id) {
    const defaultAcct = db.prepare('SELECT id FROM accounts WHERE active = 1 ORDER BY id LIMIT 1').get();
    if (defaultAcct) account_id = defaultAcct.id;
  }

  const date = str(b.date) || today();
  const r = db.prepare('INSERT INTO expenses (date, category, amount, account_id, note, created_by) VALUES (?,?,?,?,?,?)').run(
    date, str(b.category) || 'other', amount, account_id, str(b.note), user.id);
  const expId = r.lastInsertRowid;

  if (account_id) {
    db.prepare(`INSERT INTO account_transactions (account_id, type, amount, ref_type, ref_id, date, note, created_by)
      VALUES (?,?,?,?,?,?,?,?)`).run(account_id, 'expense', amount, 'expense', expId, date, `Expense (${str(b.category)})`, user.id);
  }

  json(res, 201, db.prepare('SELECT * FROM expenses WHERE id = ?').get(expId));
});

route('DELETE', '/api/expenses/:id', (req, res, p) => {
  if (!requireAdmin(req, res)) return;
  transaction(() => {
    db.prepare("DELETE FROM account_transactions WHERE ref_type = 'expense' AND ref_id = ?").run(p.id);
    db.prepare('DELETE FROM expenses WHERE id = ?').run(p.id);
  });
  json(res, 200, { ok: true });
});

// ---- Bulk Delete Route ----
route('POST', '/api/bulk-delete/:entity', async (req, res, p) => {
  if (!requireAdmin(req, res)) return;
  const entity = p.entity;
  const b = await readJSON(req);
  const rawIds = Array.isArray(b.ids) ? b.ids : [];
  const ids = rawIds.map(id => Number(id)).filter(id => Number.isInteger(id) && id > 0);

  if (ids.length === 0) return err(res, 400, 'No valid IDs provided for bulk delete');

  try {
    let deletedCount = 0;
    transaction(() => {
      if (entity === 'products') {
        const stmt = db.prepare('UPDATE products SET active = 0 WHERE id = ?');
        for (const id of ids) { stmt.run(id); deletedCount++; }
      } else if (entity === 'customers') {
        const stmt = db.prepare('UPDATE customers SET active = 0 WHERE id = ?');
        for (const id of ids) { stmt.run(id); deletedCount++; }
      } else if (entity === 'suppliers') {
        const stmt = db.prepare('UPDATE suppliers SET active = 0 WHERE id = ?');
        for (const id of ids) { stmt.run(id); deletedCount++; }
      } else if (entity === 'expenses') {
        const delTx = db.prepare("DELETE FROM account_transactions WHERE ref_type = 'expense' AND ref_id = ?");
        const delExp = db.prepare('DELETE FROM expenses WHERE id = ?');
        for (const id of ids) {
          delTx.run(id);
          delExp.run(id);
          deletedCount++;
        }
      } else if (entity === 'sales') {
        const getItems = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?');
        const incStock = db.prepare('UPDATE products SET stock_qty = stock_qty + ? WHERE id = ?');
        const delTx = db.prepare("DELETE FROM account_transactions WHERE ref_type = 'sale' AND ref_id = ?");
        const delItems = db.prepare('DELETE FROM sale_items WHERE sale_id = ?');
        const delSale = db.prepare('DELETE FROM sales WHERE id = ?');

        for (const id of ids) {
          const items = getItems.all(id);
          for (const it of items) incStock.run(it.qty, it.product_id);
          delTx.run(id);
          delItems.run(id);
          delSale.run(id);
          deletedCount++;
        }
      } else if (entity === 'purchases') {
        const getItems = db.prepare('SELECT * FROM purchase_items WHERE purchase_id = ?');
        const decStock = db.prepare('UPDATE products SET stock_qty = stock_qty - ? WHERE id = ?');
        const delTx = db.prepare("DELETE FROM account_transactions WHERE ref_type = 'purchase' AND ref_id = ?");
        const delItems = db.prepare('DELETE FROM purchase_items WHERE purchase_id = ?');
        const delPu = db.prepare('DELETE FROM purchases WHERE id = ?');

        for (const id of ids) {
          const items = getItems.all(id);
          for (const it of items) decStock.run(it.qty, it.product_id);
          delTx.run(id);
          delItems.run(id);
          delPu.run(id);
          deletedCount++;
        }
      } else {
        throw new Error('Invalid bulk delete entity');
      }
    });

    json(res, 200, { ok: true, count: deletedCount, message: `Successfully deleted ${deletedCount} item(s)` });
  } catch (e) {
    err(res, 400, e.message || 'Bulk delete failed');
  }
});

// ---- Dashboard ----
route('GET', '/api/dashboard', (req, res) => {
  if (!requireAuth(req, res)) return;
  const t = today();
  const daySales = db.prepare('SELECT COALESCE(SUM(total),0) AS total, COALESCE(SUM(paid),0) AS paid, COUNT(*) AS cnt FROM sales WHERE date = ?').get(t);
  const dayCollections = db.prepare("SELECT COALESCE(SUM(amount),0) AS amt FROM payments WHERE party_type='customer' AND date = ?").get(t).amt;
  const dayExpenses = db.prepare('SELECT COALESCE(SUM(amount),0) AS amt FROM expenses WHERE date = ?').get(t).amt;
  const daySupplierPaid = db.prepare("SELECT COALESCE(SUM(amount),0) AS amt FROM payments WHERE party_type='supplier' AND date = ?").get(t).amt;
  const dayPurchasePaid = db.prepare('SELECT COALESCE(SUM(paid),0) AS amt FROM purchases WHERE date = ?').get(t).amt;

  const custDue = db.prepare(`SELECT COALESCE(SUM(due),0) AS total FROM (
      SELECT c.id, (SELECT COALESCE(SUM(total-paid),0) FROM sales WHERE customer_id=c.id)
                 - (SELECT COALESCE(SUM(amount),0) FROM payments WHERE party_type='customer' AND party_id=c.id) AS due
      FROM customers c WHERE c.active=1) WHERE due > 0`).get().total;
  const suppDue = db.prepare(`SELECT COALESCE(SUM(due),0) AS total FROM (
      SELECT s.id, (SELECT COALESCE(SUM(total-paid),0) FROM purchases WHERE supplier_id=s.id)
                 - (SELECT COALESCE(SUM(amount),0) FROM payments WHERE party_type='supplier' AND party_id=s.id) AS due
      FROM suppliers s WHERE s.active=1) WHERE due > 0`).get().total;

  const customer_dues_list = db.prepare(`
    SELECT * FROM (
      SELECT c.id, c.name, c.phone,
        (SELECT COALESCE(SUM(total - paid), 0) FROM sales WHERE customer_id = c.id)
        - (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE party_type = 'customer' AND party_id = c.id) AS due
      FROM customers c
      WHERE c.active = 1
    ) WHERE due > 0.01
    ORDER BY due DESC
    LIMIT 10
  `).all();

  const supplier_dues_list = db.prepare(`
    SELECT * FROM (
      SELECT s.id, s.name, s.phone,
        (SELECT COALESCE(SUM(total - paid), 0) FROM purchases WHERE supplier_id = s.id)
        - (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE party_type = 'supplier' AND party_id = s.id) AS due
      FROM suppliers s
      WHERE s.active = 1
    ) WHERE due > 0.01
    ORDER BY due DESC
    LIMIT 10
  `).all();

  const lowStock = db.prepare('SELECT * FROM products WHERE active=1 AND low_stock_alert > 0 AND stock_qty <= low_stock_alert ORDER BY stock_qty').all();
  const stockValue = db.prepare('SELECT COALESCE(SUM(stock_qty * purchase_price),0) AS v FROM products WHERE active=1').get().v;
  const recentSales = db.prepare('SELECT id, invoice_no, customer_name, date, total, paid, (total-paid) AS due FROM sales ORDER BY id DESC LIMIT 8').all();

  const accounts = db.prepare('SELECT id FROM accounts WHERE active=1').all();
  let totalCapital = 0;
  for (const a of accounts) totalCapital += accountBalance(a.id);

  json(res, 200, {
    date: t,
    today: {
      sales_total: daySales.total, sales_paid: daySales.paid, sales_count: daySales.cnt,
      collections: dayCollections, expenses: dayExpenses,
      cash_in: Math.round((daySales.paid + dayCollections) * 100) / 100,
      cash_out: Math.round((dayExpenses + daySupplierPaid + dayPurchasePaid) * 100) / 100,
    },
    customer_due_total: Math.round(custDue * 100) / 100,
    supplier_due_total: Math.round(suppDue * 100) / 100,
    customer_dues_list,
    supplier_dues_list,
    stock_value: Math.round(stockValue * 100) / 100,
    total_capital: Math.round(totalCapital * 100) / 100,
    low_stock: lowStock,
    recent_sales: recentSales,
  });
});

// ---- Reports ----
route('GET', '/api/reports', (req, res, params, q) => {
  if (!requireAuth(req, res)) return;
  const from = q.get('from') || today();
  const to = q.get('to') || today();
  const sales = db.prepare('SELECT COALESCE(SUM(subtotal),0) AS subtotal, COALESCE(SUM(discount),0) AS discount, COALESCE(SUM(total),0) AS total, COALESCE(SUM(paid),0) AS paid, COUNT(*) AS cnt FROM sales WHERE date BETWEEN ? AND ?').get(from, to);
  const cogs = db.prepare('SELECT COALESCE(SUM(si.qty * si.unit_cost),0) AS c FROM sale_items si JOIN sales s ON s.id = si.sale_id WHERE s.date BETWEEN ? AND ?').get(from, to).c;
  const purchases = db.prepare('SELECT COALESCE(SUM(total),0) AS total, COALESCE(SUM(paid),0) AS paid, COUNT(*) AS cnt FROM purchases WHERE date BETWEEN ? AND ?').get(from, to);
  const expensesTotal = db.prepare('SELECT COALESCE(SUM(amount),0) AS amt FROM expenses WHERE date BETWEEN ? AND ?').get(from, to).amt;
  const expensesByCat = db.prepare('SELECT category, SUM(amount) AS amount FROM expenses WHERE date BETWEEN ? AND ? GROUP BY category ORDER BY amount DESC').all(from, to);
  const collections = db.prepare("SELECT COALESCE(SUM(amount),0) AS amt FROM payments WHERE party_type='customer' AND date BETWEEN ? AND ?").get(from, to).amt;
  const supplierPayments = db.prepare("SELECT COALESCE(SUM(amount),0) AS amt FROM payments WHERE party_type='supplier' AND date BETWEEN ? AND ?").get(from, to).amt;
  const daily = db.prepare(`SELECT date, SUM(total) AS sales, SUM(paid) AS paid, COUNT(*) AS cnt FROM sales WHERE date BETWEEN ? AND ? GROUP BY date ORDER BY date`).all(from, to);
  const topProducts = db.prepare(`SELECT si.product_name, si.unit, SUM(si.qty) AS qty, SUM(si.line_total) AS revenue,
      SUM(si.line_total) - SUM(si.qty * si.unit_cost) AS profit
    FROM sale_items si JOIN sales s ON s.id = si.sale_id
    WHERE s.date BETWEEN ? AND ? GROUP BY si.product_name, si.unit ORDER BY revenue DESC LIMIT 15`).all(from, to);

  const grossProfit = Math.round((sales.total - cogs) * 100) / 100;
  json(res, 200, {
    from, to,
    sales, cogs: Math.round(cogs * 100) / 100,
    gross_profit: grossProfit,
    expenses_total: expensesTotal,
    expenses_by_category: expensesByCat,
    net_profit: Math.round((grossProfit - expensesTotal) * 100) / 100,
    purchases,
    collections, supplier_payments: supplierPayments,
    daily, top_products: topProducts,
  });
});

// ---------- server ----------
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = decodeURIComponent(url.pathname);

    // API routes
    if (pathname.startsWith('/api/')) {
      for (const r of routes) {
        if (r.method !== req.method) continue;
        const m = r.rx.exec(pathname);
        if (!m) continue;
        const params = {};
        r.keys.forEach((k, i) => params[k] = m[i + 1]);
        await r.handler(req, res, params, url.searchParams);
        return;
      }
      return err(res, 404, 'Not found');
    }

    // Static files
    let filePath = pathname === '/' ? '/index.html' : pathname;
    filePath = path.normalize(path.join(PUBLIC_DIR, filePath));
    if (!filePath.startsWith(PUBLIC_DIR)) return err(res, 403, 'Forbidden');
    fs.readFile(filePath, (e, data) => {
      if (e) return err(res, 404, 'Not found');
      res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
      res.end(data);
    });
  } catch (e) {
    console.error(e);
    err(res, 500, e.message || 'Server error');
  }
});

function startServer(portToTry) {
  server.removeAllListeners('error');
  server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
      console.log(`  ⚠️ Port ${portToTry} is in use, trying port ${portToTry + 1}...`);
      startServer(portToTry + 1);
    } else {
      console.error('Server error:', e);
    }
  });

  server.listen(portToTry, () => {
    console.log('=================================================================');
    console.log('  ✔ CoreTrade ERP — Islam Enterprise');
    console.log('  ✔ Quality Materials, Lasting Trust');
    console.log('-----------------------------------------------------------------');
    console.log(`  🚀 Portable System Ready!`);
    console.log(`  🌐 Web Address: http://localhost:${portToTry}`);
    console.log('=================================================================');
  });
}

startServer(PORT);

