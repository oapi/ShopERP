const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync(':memory:');

db.exec(`
  CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT, brand TEXT, size TEXT, unit TEXT, purchase_price REAL, stock_qty REAL);
  CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT);
  CREATE TABLE accounts (id INTEGER PRIMARY KEY, name TEXT, active INTEGER);
  CREATE TABLE sales (id INTEGER PRIMARY KEY, invoice_no TEXT, customer_id INTEGER, customer_name TEXT, sale_type TEXT, date TEXT, subtotal REAL, discount REAL, total REAL, paid REAL, account_id INTEGER, note TEXT, created_by INTEGER);
  CREATE TABLE sale_items (id INTEGER PRIMARY KEY, sale_id INTEGER, product_id INTEGER, product_name TEXT, unit TEXT, qty REAL, unit_price REAL, unit_cost REAL, line_total REAL);
`);

const insertProd = db.prepare('INSERT INTO products (name, purchase_price, stock_qty) VALUES (?, ?, ?)');
for(let i=0; i<100; i++) {
  insertProd.run(`Product ${i}`, i*1.5, 1000);
}

db.exec(`
  INSERT INTO customers (name) VALUES ('Test Customer');
  INSERT INTO accounts (name, active) VALUES ('Main', 1);
`);

function num(v) { return Number(v) || 0; }
function str(v) { return v ? String(v) : ''; }
function today() { return new Date().toISOString().split('T')[0]; }
function transaction(fn) {
    db.exec('BEGIN');
    try {
        const result = fn();
        db.exec('COMMIT');
        return result;
    } catch (err) {
        db.exec('ROLLBACK');
        throw err;
    }
}

const b = {
  items: Array.from({length: 50}, (_, i) => ({ product_id: i+1, qty: 1, unit_price: 10 })),
  discount: 0,
  paid: 500,
  customer_id: 1,
  account_id: 1,
  sale_type: 'retail',
  note: ''
};
const user = { id: 1 };
const items = b.items;

const numIterations = 100;

console.time('baseline');
for (let iter = 0; iter < numIterations; iter++) {
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
      return { id: saleId, invoice_no };
  });
}
console.timeEnd('baseline');


console.time('optimized_in_clause');
for (let iter = 0; iter < numIterations; iter++) {
  const sale = transaction(() => {
      let subtotal = 0;

      const uniqueProductIds = [...new Set(items.map(it => it.product_id))];
      const placeholders = uniqueProductIds.map(() => '?').join(',');
      const products = db.prepare(`SELECT * FROM products WHERE id IN (${placeholders})`).all(...uniqueProductIds);
      const productsById = Object.fromEntries(products.map(p => [p.id, p]));

      const prepared = items.map(it => {
        const prod = productsById[it.product_id];
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
      return { id: saleId, invoice_no };
  });
}
console.timeEnd('optimized_in_clause');
