const { db } = require('../db');

function setup() {
  db.exec('PRAGMA foreign_keys = OFF;');
  db.exec('DELETE FROM account_transactions;');
  db.exec('DELETE FROM sale_items;');
  db.exec('DELETE FROM sales;');
  db.exec('DELETE FROM products;');
  db.exec('PRAGMA foreign_keys = ON;');

  const insProd = db.prepare("INSERT INTO products (id, name, stock_qty) VALUES (?, 'test', 100)");
  for(let i=1; i<=100; i++) insProd.run(i);

  const insSale = db.prepare("INSERT INTO sales (id, invoice_no, date) VALUES (?, ?, '2023-01-01')");
  const insSaleItem = db.prepare("INSERT INTO sale_items (sale_id, product_id, product_name, qty, unit_price, line_total) VALUES (?, ?, 'test', 1, 10, 10)");
  const insTx = db.prepare("INSERT INTO account_transactions (account_id, type, amount, ref_type, ref_id, date) VALUES (1, 'deposit', 10, 'sale', ?, '2023-01-01')");

  db.exec('BEGIN');
  for (let i = 1; i <= 1000; i++) {
    insSale.run(i, `INV-${i}`);
    insTx.run(i);
    for(let j=1; j<=5; j++) {
      insSaleItem.run(i, (i % 100) + 1);
    }
  }
  db.exec('COMMIT');
}

function runBenchmark(ids) {
  const start = process.hrtime.bigint();

  db.exec('BEGIN');
  const getItems = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?');
  const incStock = db.prepare('UPDATE products SET stock_qty = stock_qty + ? WHERE id = ?');
  const delTx = db.prepare("DELETE FROM account_transactions WHERE ref_type = 'sale' AND ref_id = ?");
  const delItems = db.prepare('DELETE FROM sale_items WHERE sale_id = ?');
  const delSale = db.prepare('DELETE FROM sales WHERE id = ?');

  let deletedCount = 0;
  for (const id of ids) {
    const items = getItems.all(id);
    for (const it of items) incStock.run(it.qty, it.product_id);
    delTx.run(id);
    delItems.run(id);
    delSale.run(id);
    deletedCount++;
  }
  db.exec('COMMIT');

  const end = process.hrtime.bigint();
  return Number(end - start) / 1e6; // ms
}

setup();
const ids = Array.from({length: 1000}, (_, i) => i + 1);
const ms = runBenchmark(ids);
console.log(`Baseline time for 1000 sales (unoptimized): ${ms.toFixed(2)} ms`);

function setup2() {
  db.exec('PRAGMA foreign_keys = OFF;');
  db.exec('DELETE FROM account_transactions;');
  db.exec('DELETE FROM sale_items;');
  db.exec('DELETE FROM sales;');
  db.exec('DELETE FROM products;');
  db.exec('PRAGMA foreign_keys = ON;');

  const insProd = db.prepare("INSERT INTO products (id, name, stock_qty) VALUES (?, 'test', 100)");
  for(let i=1; i<=100; i++) insProd.run(i);

  const insSale = db.prepare("INSERT INTO sales (id, invoice_no, date) VALUES (?, ?, '2023-01-01')");
  const insSaleItem = db.prepare("INSERT INTO sale_items (sale_id, product_id, product_name, qty, unit_price, line_total) VALUES (?, ?, 'test', 1, 10, 10)");
  const insTx = db.prepare("INSERT INTO account_transactions (account_id, type, amount, ref_type, ref_id, date) VALUES (1, 'deposit', 10, 'sale', ?, '2023-01-01')");

  db.exec('BEGIN');
  for (let i = 1; i <= 1000; i++) {
    insSale.run(i, `INV-${i}`);
    insTx.run(i);
    for(let j=1; j<=5; j++) {
      insSaleItem.run(i, (i % 100) + 1);
    }
  }
  db.exec('COMMIT');
}

function runBenchmarkOptimized(ids) {
  const start = process.hrtime.bigint();

  db.exec('BEGIN');
  const incStock = db.prepare('UPDATE products SET stock_qty = stock_qty + ? WHERE id = ?');
  const delTx = db.prepare("DELETE FROM account_transactions WHERE ref_type = 'sale' AND ref_id = ?");
  const delItems = db.prepare('DELETE FROM sale_items WHERE sale_id = ?');
  const delSale = db.prepare('DELETE FROM sales WHERE id = ?');

  const MAX_BIND_VARS = 999;
  for (let i = 0; i < ids.length; i += MAX_BIND_VARS) {
    const chunkIds = ids.slice(i, i + MAX_BIND_VARS);
    if (chunkIds.length === 0) continue;
    const placeholders = chunkIds.map(() => '?').join(',');
    const items = db.prepare(`SELECT * FROM sale_items WHERE sale_id IN (${placeholders})`).all(...chunkIds);
    for (const it of items) incStock.run(it.qty, it.product_id);
  }

  let deletedCount = 0;
  for (const id of ids) {
    delTx.run(id);
    delItems.run(id);
    delSale.run(id);
    deletedCount++;
  }
  db.exec('COMMIT');

  const end = process.hrtime.bigint();
  return Number(end - start) / 1e6; // ms
}

setup2();
const msOpt = runBenchmarkOptimized(ids);
console.log(`Optimized time for 1000 sales: ${msOpt.toFixed(2)} ms`);

function setup3() {
  db.exec('PRAGMA foreign_keys = OFF;');
  db.exec('DELETE FROM account_transactions;');
  db.exec('DELETE FROM sale_items;');
  db.exec('DELETE FROM sales;');
  db.exec('DELETE FROM products;');
  db.exec('PRAGMA foreign_keys = ON;');

  const insProd = db.prepare("INSERT INTO products (id, name, stock_qty) VALUES (?, 'test', 100)");
  for(let i=1; i<=100; i++) insProd.run(i);

  const insSale = db.prepare("INSERT INTO sales (id, invoice_no, date) VALUES (?, ?, '2023-01-01')");
  const insSaleItem = db.prepare("INSERT INTO sale_items (sale_id, product_id, product_name, qty, unit_price, line_total) VALUES (?, ?, 'test', 1, 10, 10)");
  const insTx = db.prepare("INSERT INTO account_transactions (account_id, type, amount, ref_type, ref_id, date) VALUES (1, 'deposit', 10, 'sale', ?, '2023-01-01')");

  db.exec('BEGIN');
  for (let i = 1; i <= 1000; i++) {
    insSale.run(i, `INV-${i}`);
    insTx.run(i);
    for(let j=1; j<=5; j++) {
      insSaleItem.run(i, (i % 100) + 1);
    }
  }
  db.exec('COMMIT');
}

function runBenchmarkOptimized2(ids) {
  const start = process.hrtime.bigint();

  db.exec('BEGIN');
  const incStock = db.prepare('UPDATE products SET stock_qty = stock_qty + ? WHERE id = ?');
  const delTx = db.prepare("DELETE FROM account_transactions WHERE ref_type = 'sale' AND ref_id = ?");
  const delItems = db.prepare('DELETE FROM sale_items WHERE sale_id = ?');
  const delSale = db.prepare('DELETE FROM sales WHERE id = ?');

  const MAX_BIND_VARS = 999;
  for (let i = 0; i < ids.length; i += MAX_BIND_VARS) {
    const chunkIds = ids.slice(i, i + MAX_BIND_VARS);
    if (chunkIds.length === 0) continue;
    const placeholders = chunkIds.map(() => '?').join(',');
    const items = db.prepare(`SELECT * FROM sale_items WHERE sale_id IN (${placeholders})`).all(...chunkIds);
    for (const it of items) incStock.run(it.qty, it.product_id);

    const delTxBulk = db.prepare(`DELETE FROM account_transactions WHERE ref_type = 'sale' AND ref_id IN (${placeholders})`);
    delTxBulk.run(...chunkIds);
    const delItemsBulk = db.prepare(`DELETE FROM sale_items WHERE sale_id IN (${placeholders})`);
    delItemsBulk.run(...chunkIds);
    const delSaleBulk = db.prepare(`DELETE FROM sales WHERE id IN (${placeholders})`);
    delSaleBulk.run(...chunkIds);
  }
  db.exec('COMMIT');

  const end = process.hrtime.bigint();
  return Number(end - start) / 1e6; // ms
}

setup3();
const msOpt2 = runBenchmarkOptimized2(ids);
console.log(`Optimized time 2 (bulk deletes) for 1000 sales: ${msOpt2.toFixed(2)} ms`);

function setup4() {
  db.exec('PRAGMA foreign_keys = OFF;');
  db.exec('DELETE FROM account_transactions;');
  db.exec('DELETE FROM purchase_items;');
  db.exec('DELETE FROM purchases;');
  db.exec('DELETE FROM products;');
  db.exec('PRAGMA foreign_keys = ON;');

  const insProd = db.prepare("INSERT INTO products (id, name, stock_qty) VALUES (?, 'test', 100)");
  for(let i=1; i<=100; i++) insProd.run(i);

  const insSale = db.prepare("INSERT INTO purchases (id, ref_no, date) VALUES (?, ?, '2023-01-01')");
  const insSaleItem = db.prepare("INSERT INTO purchase_items (purchase_id, product_id, product_name, qty, unit_cost, line_total) VALUES (?, ?, 'test', 1, 10, 10)");
  const insTx = db.prepare("INSERT INTO account_transactions (account_id, type, amount, ref_type, ref_id, date) VALUES (1, 'withdrawal', 10, 'purchase', ?, '2023-01-01')");

  db.exec('BEGIN');
  for (let i = 1; i <= 1000; i++) {
    insSale.run(i, `PUR-${i}`);
    insTx.run(i);
    for(let j=1; j<=5; j++) {
      insSaleItem.run(i, (i % 100) + 1);
    }
  }
  db.exec('COMMIT');
}

function runBenchmarkPurchaseOptimized(ids) {
  const start = process.hrtime.bigint();

  db.exec('BEGIN');
  const decStock = db.prepare('UPDATE products SET stock_qty = stock_qty - ? WHERE id = ?');

  const MAX_BIND_VARS = 999;
  for (let i = 0; i < ids.length; i += MAX_BIND_VARS) {
    const chunkIds = ids.slice(i, i + MAX_BIND_VARS);
    if (chunkIds.length === 0) continue;
    const placeholders = chunkIds.map(() => '?').join(',');
    const items = db.prepare(`SELECT * FROM purchase_items WHERE purchase_id IN (${placeholders})`).all(...chunkIds);
    for (const it of items) decStock.run(it.qty, it.product_id);

    db.prepare(`DELETE FROM account_transactions WHERE ref_type = 'purchase' AND ref_id IN (${placeholders})`).run(...chunkIds);
    db.prepare(`DELETE FROM purchase_items WHERE purchase_id IN (${placeholders})`).run(...chunkIds);
    db.prepare(`DELETE FROM purchases WHERE id IN (${placeholders})`).run(...chunkIds);
  }
  db.exec('COMMIT');

  const end = process.hrtime.bigint();
  return Number(end - start) / 1e6; // ms
}

setup4();
const msOptPurchases = runBenchmarkPurchaseOptimized(ids);
console.log(`Optimized time (bulk deletes) for 1000 purchases: ${msOptPurchases.toFixed(2)} ms`);
