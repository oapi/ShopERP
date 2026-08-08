const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');

// Set TEST_DB_PATH before requiring db.js
const TEST_DB_FILE = path.join(__dirname, 'data', `test-${Date.now()}.db`);
process.env.TEST_DB_PATH = TEST_DB_FILE;

// Require db.js after environment variable is set
const { db, hashPassword } = require('./db.js');

test('Database Setup and Seeds', async (t) => {
  t.after(() => {
    db.close();
    // Clean up test DB files, including WAL and SHM
    const files = [TEST_DB_FILE, `${TEST_DB_FILE}-wal`, `${TEST_DB_FILE}-shm`];
    for (const f of files) {
      if (fs.existsSync(f)) {
        fs.unlinkSync(f);
      }
    }
  });

  await t.test('users are seeded correctly', () => {
    const users = db.prepare('SELECT username, role FROM users ORDER BY username').all();
    assert.strictEqual(users.length, 2, 'Should have exactly 2 seeded users');

    assert.strictEqual(users[0].username, 'admin');
    assert.strictEqual(users[0].role, 'admin');

    assert.strictEqual(users[1].username, 'sales');
    assert.strictEqual(users[1].role, 'sales_manager');
  });

  await t.test('accounts are seeded correctly', () => {
    const accounts = db.prepare('SELECT name, type, opening_balance FROM accounts ORDER BY id').all();
    assert.strictEqual(accounts.length, 3, 'Should have exactly 3 seeded accounts');

    assert.strictEqual(accounts[0].name, 'Cash at Shop');
    assert.strictEqual(accounts[0].type, 'cash');

    assert.strictEqual(accounts[1].name, 'Bank Account');
    assert.strictEqual(accounts[1].type, 'bank');

    assert.strictEqual(accounts[2].name, 'Cash at Home');
    assert.strictEqual(accounts[2].type, 'cash');
  });

  await t.test('default settings are populated', () => {
    const settings = db.prepare('SELECT count(*) as c FROM settings').get();
    assert.strictEqual(settings.c, 8, 'Should have 8 default settings');

    const businessName = db.prepare("SELECT value FROM settings WHERE key = 'business_name'").get();
    assert.strictEqual(businessName.value, 'Islam Enterprise');
  });

  await t.test('hashPassword generates expected consistent hash', () => {
    const pwd1 = hashPassword('testpassword');
    const pwd2 = hashPassword('testpassword');
    assert.strictEqual(pwd1, pwd2, 'Same password should yield same hash');
    assert.ok(pwd1.length > 0, 'Hash should not be empty');
  });
});
