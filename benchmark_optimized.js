const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync(':memory:');

// Schema setup
db.exec(`
  CREATE TABLE products (id INTEGER PRIMARY KEY, stock_qty REAL);
  CREATE TABLE purchases (id INTEGER PRIMARY KEY);
  CREATE TABLE purchase_items (id INTEGER PRIMARY KEY, purchase_id INTEGER, product_id INTEGER, qty REAL);
  CREATE TABLE account_transactions (id INTEGER PRIMARY KEY, ref_type TEXT, ref_id INTEGER);
`);

// Insert some mock data
for (let i = 1; i <= 1000; i++) {
  db.exec(`INSERT INTO products (id, stock_qty) VALUES (${i}, 100);`);
}

const numPurchases = 1000;
const ids = [];
for (let i = 1; i <= numPurchases; i++) {
  db.exec(`INSERT INTO purchases (id) VALUES (${i});`);
  db.exec(`INSERT INTO purchase_items (purchase_id, product_id, qty) VALUES (${i}, ${i}, 1);`);
  db.exec(`INSERT INTO purchase_items (purchase_id, product_id, qty) VALUES (${i}, ${(i%500)+1}, 2);`);
  db.exec(`INSERT INTO account_transactions (ref_type, ref_id) VALUES ('purchase', ${i});`);
  ids.push(i);
}

function optimized(ids) {
  if (ids.length === 0) return 0;
  let deletedCount = 0;

  // Create placeholders for IN clause
  const placeholders = ids.map(() => '?').join(',');

  // Fetch all items across all purchases at once
  const allItemsStmt = db.prepare(`SELECT * FROM purchase_items WHERE purchase_id IN (${placeholders})`);
  const allItems = allItemsStmt.all(...ids);

  const decStock = db.prepare('UPDATE products SET stock_qty = stock_qty - ? WHERE id = ?');
  for (const it of allItems) decStock.run(it.qty, it.product_id);

  db.prepare(`DELETE FROM account_transactions WHERE ref_type = 'purchase' AND ref_id IN (${placeholders})`).run(...ids);
  db.prepare(`DELETE FROM purchase_items WHERE purchase_id IN (${placeholders})`).run(...ids);
  db.prepare(`DELETE FROM purchases WHERE id IN (${placeholders})`).run(...ids);

  deletedCount = ids.length;
  return deletedCount;
}

console.time('optimized');
db.exec('BEGIN TRANSACTION');
optimized(ids);
db.exec('COMMIT');
console.timeEnd('optimized');
