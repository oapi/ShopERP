// Database setup — uses Node's built-in SQLite (node:sqlite), zero dependencies.
const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(path.join(DATA_DIR, 'shop.db'));

db.exec(`
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'sales_manager',    -- admin | sales_manager
  name TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'cash',             -- cash | bank | other
  account_number TEXT DEFAULT '',
  opening_balance REAL NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS account_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  type TEXT NOT NULL,                            -- deposit | withdrawal | transfer_in | transfer_out | sale_collection | purchase_payment | expense | due_payment
  amount REAL NOT NULL,
  related_account_id INTEGER REFERENCES accounts(id),
  ref_type TEXT DEFAULT '',                      -- sale | purchase | payment | expense | manual
  ref_id INTEGER,
  date TEXT NOT NULL,
  note TEXT DEFAULT '',
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',        -- rod | cement | other
  brand TEXT DEFAULT '',
  size TEXT DEFAULT '',                          -- e.g. 8mm, 10mm for rod
  unit TEXT NOT NULL DEFAULT 'pcs',              -- kg | ton | pcs | bag
  purchase_price REAL NOT NULL DEFAULT 0,        -- cost per unit
  retail_price REAL NOT NULL DEFAULT 0,
  wholesale_price REAL NOT NULL DEFAULT 0,
  stock_qty REAL NOT NULL DEFAULT 0,
  low_stock_alert REAL NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  type TEXT NOT NULL DEFAULT 'retail',           -- retail | wholesale
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS suppliers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_no TEXT NOT NULL UNIQUE,
  customer_id INTEGER REFERENCES customers(id),
  customer_name TEXT DEFAULT 'Walk-in',          -- snapshot / walk-in name
  sale_type TEXT NOT NULL DEFAULT 'retail',      -- retail | wholesale
  date TEXT NOT NULL,
  subtotal REAL NOT NULL DEFAULT 0,
  discount REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  paid REAL NOT NULL DEFAULT 0,
  account_id INTEGER REFERENCES accounts(id),
  note TEXT DEFAULT '',
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS sale_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  product_name TEXT NOT NULL,                    -- snapshot
  unit TEXT NOT NULL DEFAULT 'pcs',
  qty REAL NOT NULL,
  unit_price REAL NOT NULL,
  unit_cost REAL NOT NULL DEFAULT 0,             -- cost snapshot for profit calc
  line_total REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ref_no TEXT DEFAULT '',
  supplier_id INTEGER REFERENCES suppliers(id),
  supplier_name TEXT DEFAULT '',
  date TEXT NOT NULL,
  total REAL NOT NULL DEFAULT 0,
  paid REAL NOT NULL DEFAULT 0,
  account_id INTEGER REFERENCES accounts(id),
  note TEXT DEFAULT '',
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS purchase_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  purchase_id INTEGER NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  product_name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'pcs',
  qty REAL NOT NULL,
  unit_cost REAL NOT NULL,
  line_total REAL NOT NULL
);

-- Standalone payments (after-sale due collection / paying supplier dues)
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  party_type TEXT NOT NULL,                      -- customer | supplier
  party_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  amount REAL NOT NULL,
  method TEXT DEFAULT 'cash',                    -- cash | bank | bkash | nagad | other
  account_id INTEGER REFERENCES accounts(id),
  note TEXT DEFAULT '',
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',        -- rent | salary | transport | utility | other
  amount REAL NOT NULL,
  account_id INTEGER REFERENCES accounts(id),
  note TEXT DEFAULT '',
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(date);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_payments_party ON payments(party_type, party_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_acct_trx_acct ON account_transactions(account_id);
`);

// Migration helpers for optional columns in case table existed earlier
function addColumnIfNotExists(table, colDef) {
  if (!/^[a-zA-Z0-9_]+$/.test(table)) {
    throw new Error('Invalid table name format');
  }
  // Allow letters, numbers, spaces, underscores, parentheses, quotes, dots, and commas for valid SQL syntax.
  // We still block semicolons to prevent query stacking and double dashes to prevent comment injection.
  if (!/^[a-zA-Z0-9_\s()'.\-,]+$/.test(colDef)) {
    throw new Error('Invalid column definition format');
  }
  try { db.exec(`ALTER TABLE ${table} ADD COLUMN ${colDef}`); } catch (e) {}
}
addColumnIfNotExists('sales', 'account_id INTEGER REFERENCES accounts(id)');
addColumnIfNotExists('sales', 'created_by INTEGER REFERENCES users(id)');
addColumnIfNotExists('purchases', 'account_id INTEGER REFERENCES accounts(id)');
addColumnIfNotExists('purchases', 'created_by INTEGER REFERENCES users(id)');
addColumnIfNotExists('payments', 'account_id INTEGER REFERENCES accounts(id)');
addColumnIfNotExists('payments', 'created_by INTEGER REFERENCES users(id)');
addColumnIfNotExists('expenses', 'account_id INTEGER REFERENCES accounts(id)');
addColumnIfNotExists('expenses', 'created_by INTEGER REFERENCES users(id)');

// Password hashing helper
function hashPassword(pwd) {
  return crypto.createHash('sha256').update(pwd + 'islam_enterprise_salt').digest('hex');
}

// Seed Users
const userCount = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
if (userCount === 0) {
  const insUser = db.prepare('INSERT INTO users (username, password_hash, role, name) VALUES (?,?,?,?)');
  insUser.run('admin', hashPassword('admin123'), 'admin', 'System Admin');
  insUser.run('sales', hashPassword('sales123'), 'sales_manager', 'Sales Manager');
}

// Seed Capital / Cash Accounts
const acctCount = db.prepare('SELECT COUNT(*) AS c FROM accounts').get().c;
if (acctCount === 0) {
  const insAcct = db.prepare('INSERT INTO accounts (name, type, account_number, opening_balance) VALUES (?,?,?,?)');
  insAcct.run('Cash at Shop', 'cash', '', 0);
  insAcct.run('Bank Account', 'bank', 'DBBL-9988-1122', 0);
  insAcct.run('Cash at Home', 'cash', '', 0);
}

// Seed sample products on first run so the shop can start immediately.
const count = db.prepare('SELECT COUNT(*) AS c FROM products').get().c;
if (count === 0) {
  const ins = db.prepare(`INSERT INTO products
    (name, category, brand, size, unit, purchase_price, retail_price, wholesale_price, stock_qty, low_stock_alert)
    VALUES (?,?,?,?,?,?,?,?,?,?)`);
  const seed = [
    ['MS Rod 8mm',  'rod', 'BSRM',   '8mm',  'kg', 88,  95,  92,  0, 200],
    ['MS Rod 10mm', 'rod', 'BSRM',   '10mm', 'kg', 87,  94,  91,  0, 200],
    ['MS Rod 12mm', 'rod', 'BSRM',   '12mm', 'kg', 86,  93,  90,  0, 300],
    ['MS Rod 16mm', 'rod', 'BSRM',   '16mm', 'kg', 86,  93,  90,  0, 300],
    ['MS Rod 20mm', 'rod', 'AKS',    '20mm', 'kg', 85,  92,  89,  0, 200],
    ['Cement OPC',  'cement', 'Shah',    '50kg bag', 'bag', 480, 540, 520, 0, 50],
    ['Cement PCC',  'cement', 'Bashundhara', '50kg bag', 'bag', 460, 520, 500, 0, 50],
    ['Cement PCC',  'cement', 'Seven Rings', '50kg bag', 'bag', 455, 515, 495, 0, 50],
  ];
  for (const row of seed) ins.run(...row);
}

// Seed Default System Configurations
const insSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
const defaultSettings = [
  ['business_name', 'Islam Enterprise'],
  ['business_address', 'Main Road, Shop #12'],
  ['business_phone', '01700-000000'],
  ['business_tagline', 'Quality Materials, Lasting Trust'],
  ['business_logo', '/islamEnterprise_logo.png'],
  ['currency_symbol', '৳'],
  ['timezone_date_format', 'YYYY-MM-DD'],
  ['low_stock_threshold', '100'],
];
for (const [k, v] of defaultSettings) {
  insSetting.run(k, v);
}

module.exports = {
  db,
  hashPassword,
};
