const test = require('node:test');
const assert = require('node:assert');

// Use an in-memory DB so test initialization doesn't pollute real database
process.env.TEST_DB_PATH = ':memory:';

const { db } = require('./db.js');
const { accountBalance } = require('./server.js');

test('accountBalance', async (t) => {
  const originalPrepare = db.prepare;

  t.after(() => {
    db.prepare = originalPrepare;
  });

  await t.test('returns 0 if account does not exist', () => {
    db.prepare = (sql) => {
      return {
        get: (id) => {
          if (sql.includes('SELECT opening_balance FROM accounts')) {
            return undefined; // No account found
          }
          return { total: 0 };
        }
      };
    };

    const balance = accountBalance(999);
    assert.strictEqual(balance, 0);
  });

  await t.test('calculates balance with only opening balance', () => {
    db.prepare = (sql) => {
      return {
        get: (id) => {
          if (sql.includes('SELECT opening_balance FROM accounts')) {
            return { opening_balance: 1500.00 };
          }
          return { total: 0 };
        }
      };
    };

    const balance = accountBalance(1);
    assert.strictEqual(balance, 1500.00);
  });

  await t.test('calculates correct balance with inflows, outflows, and payments', () => {
    db.prepare = (sql) => {
      return {
        get: (id) => {
          if (sql.includes('SELECT opening_balance FROM accounts')) {
            return { opening_balance: 1000.50 };
          }
          if (sql.includes("type IN ('deposit', 'transfer_in', 'sale_collection')")) {
            return { total: 500.25 }; // inflow
          }
          if (sql.includes("type IN ('withdrawal', 'transfer_out', 'purchase_payment', 'expense')")) {
            return { total: 200.00 }; // outflow
          }
          if (sql.includes("party_type = 'customer'")) {
            return { total: 150.00 }; // pymtCust
          }
          if (sql.includes("party_type = 'supplier'")) {
            return { total: 50.75 }; // pymtSupp
          }
          return { total: 0 };
        }
      };
    };

    // net = openBal(1000.50) + inflow(500.25) + pymtCust(150.00) - outflow(200.00) - pymtSupp(50.75)
    // 1000.50 + 500.25 + 150.00 = 1650.75
    // - 200.00 - 50.75 = 1400.00
    const balance = accountBalance(1);
    assert.strictEqual(balance, 1400.00);
  });

  await t.test('rounds the final calculation to 2 decimal places', () => {
    db.prepare = (sql) => {
      return {
        get: (id) => {
          if (sql.includes('SELECT opening_balance FROM accounts')) {
            return { opening_balance: 100.123 };
          }
          if (sql.includes("type IN ('deposit', 'transfer_in', 'sale_collection')")) {
            return { total: 50.456 }; // inflow
          }
          return { total: 0 };
        }
      };
    };

    // net = 100.123 + 50.456 = 150.579 => rounded to 150.58
    const balance = accountBalance(1);
    assert.strictEqual(balance, 150.58);
  });
});
