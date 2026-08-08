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

// Function to benchmark
function original(ids) {
  const getItems = db.prepare('SELECT * FROM purchase_items WHERE purchase_id = ?');
  const decStock = db.prepare('UPDATE products SET stock_qty = stock_qty - ? WHERE id = ?');
  const delTx = db.prepare("DELETE FROM account_transactions WHERE ref_type = 'purchase' AND ref_id = ?");
  const delItems = db.prepare('DELETE FROM purchase_items WHERE purchase_id = ?');
  const delPu = db.prepare('DELETE FROM purchases WHERE id = ?');

  let deletedCount = 0;
  for (const id of ids) {
    const items = getItems.all(id);
    for (const it of items) decStock.run(it.qty, it.product_id);
    delTx.run(id);
    delItems.run(id);
    delPu.run(id);
    deletedCount++;
  }
}

console.time('original');
db.exec('BEGIN TRANSACTION');
original(ids);
db.exec('COMMIT');
console.timeEnd('original');
