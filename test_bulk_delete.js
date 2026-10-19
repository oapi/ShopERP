const { DatabaseSync } = require('node:sqlite');
const http = require('node:http');

const PORT = 3000;
const DB_PATH = './data/shop.db';

async function runTest() {
  const db = new DatabaseSync(DB_PATH);

  const ts = Date.now();
  const token = 'test-token-bulk-delete-' + ts;

  const adminId = db.prepare(`SELECT id FROM users WHERE role = 'admin' LIMIT 1`).get()?.id;
  const userId = adminId || 1; // Assuming 1 exists and is admin or we'll bypass role

  db.exec(`INSERT INTO sessions (token, user_id) VALUES ('${token}', ${userId})`);

  const productId = db.prepare('SELECT id FROM products LIMIT 1').get()?.id || 1;
  const productName = db.prepare('SELECT name FROM products WHERE id = ?').get(productId)?.name || 'Test Product';
  const accountId = db.prepare('SELECT id FROM accounts LIMIT 1').get()?.id || 1;

  db.exec('BEGIN TRANSACTION');

  // Add a sale
  db.exec(`INSERT INTO sales (invoice_no, date, paid) VALUES ('INV-TEST-${ts}', '2023-01-01', 0)`);
  const saleId = db.prepare('SELECT last_insert_rowid() AS id').get().id;
  db.exec(`INSERT INTO sale_items (sale_id, product_id, product_name, qty, unit_price, line_total) VALUES (${saleId}, ${productId}, '${productName}', 2, 10, 20)`);
  db.exec(`INSERT INTO account_transactions (account_id, type, amount, ref_type, ref_id, date) VALUES (${accountId}, 'sale_collection', 20, 'sale', ${saleId}, '2023-01-01')`);
  db.exec(`UPDATE products SET stock_qty = stock_qty - 2 WHERE id = ${productId}`);

  // Add a purchase
  db.exec(`INSERT INTO purchases (ref_no, date, paid) VALUES ('PUR-TEST-${ts}', '2023-01-01', 0)`);
  const puId = db.prepare('SELECT last_insert_rowid() AS id').get().id;
  db.exec(`INSERT INTO purchase_items (purchase_id, product_id, product_name, qty, unit_cost, line_total) VALUES (${puId}, ${productId}, '${productName}', 3, 5, 15)`);
  db.exec(`INSERT INTO account_transactions (account_id, type, amount, ref_type, ref_id, date) VALUES (${accountId}, 'purchase_payment', 15, 'purchase', ${puId}, '2023-01-01')`);
  db.exec(`UPDATE products SET stock_qty = stock_qty + 3 WHERE id = ${productId}`);

  db.exec('COMMIT');

  console.log(`Created sale ID: ${saleId}, purchase ID: ${puId}`);
  console.log('Stock before delete:', db.prepare(`SELECT id, stock_qty FROM products WHERE id = ${productId}`).get());

  // Override auth for the request wrapper
  const _request = async (method, path, body = null) => {
    return new Promise((resolve, reject) => {
      const req = http.request(
        `http://localhost:${PORT}${path}`,
        {
          method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => data += chunk);
          res.on('end', () => resolve({ status: res.statusCode, data }));
        }
      );
      req.on('error', reject);
      if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  };

  try {
    const saleRes = await _request('POST', '/api/bulk-delete/sales', { ids: [saleId] });
    console.log('Sale delete result:', saleRes.status, saleRes.data);

    const puRes = await _request('POST', '/api/bulk-delete/purchases', { ids: [puId] });
    console.log('Purchase delete result:', puRes.status, puRes.data);

    console.log('Stock after delete:', db.prepare(`SELECT id, stock_qty FROM products WHERE id = ${productId}`).get());

    console.log('Sales left:', db.prepare(`SELECT count(*) as c FROM sales WHERE id = ${saleId}`).get().c);
    console.log('Purchases left:', db.prepare(`SELECT count(*) as c FROM purchases WHERE id = ${puId}`).get().c);

  } catch (err) {
    console.error(err);
  } finally {
    db.prepare(`DELETE FROM sessions WHERE token = '${token}'`).run();
    db.close();
  }
}

runTest();
