const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync(':memory:');
db.exec('CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT, purchase_price REAL);');
const insert = db.prepare('INSERT INTO products (name, purchase_price) VALUES (?, ?)');
for(let i=0; i<1000; i++) {
  insert.run(`Product ${i}`, i*1.5);
}

const items = Array.from({length: 100}, (_, i) => ({ product_id: i+1, qty: 1, unit_price: 10 }));

console.time('baseline');
for (let iter = 0; iter < 1000; iter++) {
  const prepared = items.map(it => {
    const prod = db.prepare('SELECT * FROM products WHERE id = ?').get(it.product_id);
    if (!prod) throw new Error('Product not found: ' + it.product_id);
    return { prod };
  });
}
console.timeEnd('baseline');

console.time('optimized_in_clause');
for (let iter = 0; iter < 1000; iter++) {
  const productIds = items.map(it => it.product_id);
  const placeholders = productIds.map(() => '?').join(',');
  const products = db.prepare(`SELECT * FROM products WHERE id IN (${placeholders})`).all(...productIds);
  const productsById = Object.fromEntries(products.map(p => [p.id, p]));

  const prepared = items.map(it => {
    const prod = productsById[it.product_id];
    if (!prod) throw new Error('Product not found: ' + it.product_id);
    return { prod };
  });
}
console.timeEnd('optimized_in_clause');

console.time('cached_prepare');
const getProd = db.prepare('SELECT * FROM products WHERE id = ?');
for (let iter = 0; iter < 1000; iter++) {
  const prepared = items.map(it => {
    const prod = getProd.get(it.product_id);
    if (!prod) throw new Error('Product not found: ' + it.product_id);
    return { prod };
  });
}
console.timeEnd('cached_prepare');
