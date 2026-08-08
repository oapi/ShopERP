const test = require('node:test');
const assert = require('node:assert');
const { db } = require('../db.js');
const { spawn } = require('node:child_process');

test('Pagination limit edge cases', async (t) => {
    // 1. Insert records to have > 100 products
    const initialCount = db.prepare('SELECT COUNT(*) as c FROM products').get().c;
    const needed = 120 - initialCount;
    if (needed > 0) {
        db.exec('BEGIN TRANSACTION');
        const ins = db.prepare(`INSERT INTO products (name, category, unit, purchase_price, retail_price, wholesale_price, stock_qty, low_stock_alert) VALUES (?, 'other', 'pcs', 10, 20, 15, 100, 10)`);
        for (let i = 1; i <= needed; i++) {
            ins.run(`Test Product ${i}`);
        }
        db.exec('COMMIT');
    }
    const totalRecords = db.prepare('SELECT COUNT(*) as c FROM products').get().c;
    assert.ok(totalRecords >= 120, 'Should have at least 120 products');

    // 2. Start server
    const serverProcess = spawn('node', ['server.js']);

    t.after(() => {
        serverProcess.kill();
        // Clean up test records
        if (needed > 0) {
            db.exec('BEGIN TRANSACTION');
            db.prepare(`DELETE FROM products WHERE name LIKE 'Test Product %'`).run();
            db.exec('COMMIT');
        }
    });

    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Authenticate
    const loginRes = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    const loginData = await loginRes.json();
    const token = loginData.token;

    const fetchProducts = async (query) => {
        const res = await fetch(`http://localhost:3000/api/products?${query}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return res.json();
    };

    // Edge case: default limit (should be 10)
    const d1 = await fetchProducts('');
    assert.strictEqual(d1.limit, 10, 'Default limit should be 10');
    assert.strictEqual(d1.data.length, 10, 'Should return exactly 10 items');

    // Edge case: limit=all (should return all records)
    const d2 = await fetchProducts('limit=all');
    assert.strictEqual(d2.limit, totalRecords, 'Limit "all" should set limit to total records');
    assert.strictEqual(d2.data.length, totalRecords, 'Should return all records');

    // Edge case: limit > 100 (should cap at 100)
    const d3 = await fetchProducts('limit=150');
    assert.strictEqual(d3.limit, 100, 'Limit above 100 should be capped at 100');
    assert.strictEqual(d3.data.length, 100, 'Should return max 100 records');

    // Edge case: invalid limits (negative, zero, NaN) should fallback to 10
    const invalidLimits = ['-1', '0', 'abc', ''];
    for (const l of invalidLimits) {
        const d = await fetchProducts(`limit=${l}`);
        assert.strictEqual(d.limit, 10, `Limit "${l}" should fallback to 10`);
        assert.strictEqual(d.data.length, 10, 'Should return 10 items');
    }

    // Edge case: valid limit but large page (should cap at total_pages)
    const d4 = await fetchProducts('limit=10&page=9999');
    assert.strictEqual(d4.limit, 10, 'Limit should be 10');
    assert.strictEqual(d4.page, d4.total_pages, 'Page should be capped at total_pages');
});
