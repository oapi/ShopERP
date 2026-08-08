const test = require('node:test');
const assert = require('node:assert');
const { queryPaginated } = require('../server.js');
const { db } = require('../db.js');

test('queryPaginated tests', async (t) => {
  // Setup isolated table for tests
  db.exec('CREATE TABLE IF NOT EXISTS test_items (id INTEGER PRIMARY KEY, name TEXT, category TEXT, price REAL);');

  t.after(() => {
    db.exec('DROP TABLE IF EXISTS test_items;');
  });

  // clear table first
  db.exec('DELETE FROM test_items;');

  // insert some data
  const insert = db.prepare('INSERT INTO test_items (name, category, price) VALUES (?, ?, ?)');
  insert.run('Apple', 'fruit', 1.2);
  insert.run('Banana', 'fruit', 0.8);
  insert.run('Carrot', 'vegetable', 0.5);
  insert.run('Date', 'fruit', 2.0);
  insert.run('Eggplant', 'vegetable', 1.5);

  // Mock request query `q` object mapping get() to query params
  function mockQuery(params = {}) {
    return {
      get: (key) => params[key] !== undefined ? String(params[key]) : undefined
    };
  }

  await t.test('basic pagination and fetching', () => {
    const q = mockQuery(); // empty params
    const result = queryPaginated(q, {
      fromSql: 'test_items'
    });

    assert.strictEqual(result.total, 5);
    assert.strictEqual(result.limit, 10);
    assert.strictEqual(result.page, 1);
    assert.strictEqual(result.total_pages, 1);
    assert.strictEqual(result.data.length, 5);
    // Default sort is id DESC
    assert.strictEqual(result.data[0].name, 'Eggplant'); // id 5
  });

  await t.test('pagination with page and limit', () => {
    const q = mockQuery({ page: 2, limit: 2 });
    const result = queryPaginated(q, {
      fromSql: 'test_items',
      defaultSortCol: 'id',
      defaultSortDir: 'ASC'
    });

    assert.strictEqual(result.total, 5);
    assert.strictEqual(result.limit, 2);
    assert.strictEqual(result.page, 2);
    assert.strictEqual(result.total_pages, 3);
    assert.strictEqual(result.data.length, 2);
    // Page 2 should have items 3 and 4
    assert.strictEqual(result.data[0].name, 'Carrot'); // id 3
    assert.strictEqual(result.data[1].name, 'Date'); // id 4
  });

  await t.test('pagination out of bounds page', () => {
    const q = mockQuery({ page: 10, limit: 2 });
    const result = queryPaginated(q, {
      fromSql: 'test_items',
      defaultSortCol: 'id',
      defaultSortDir: 'ASC'
    });

    assert.strictEqual(result.total, 5);
    assert.strictEqual(result.limit, 2);
    assert.strictEqual(result.page, 3); // Validated page should be total_pages
    assert.strictEqual(result.total_pages, 3);
    assert.strictEqual(result.data.length, 1);
    // Page 3 should have item 5
    assert.strictEqual(result.data[0].name, 'Eggplant'); // id 5
  });

  await t.test('sorting logic', () => {
    const q = mockQuery({ sort_by: 'name', sort_dir: 'DESC', limit: 2 });
    const result = queryPaginated(q, {
      fromSql: 'test_items',
      allowedSortCols: { 'name': 'name' }
    });

    assert.strictEqual(result.data[0].name, 'Eggplant');
    assert.strictEqual(result.data[1].name, 'Date');
  });

  await t.test('search logic', () => {
    const q = mockQuery({ search: 'Ban' });
    const result = queryPaginated(q, {
      fromSql: 'test_items',
      searchCols: ['name', 'category']
    });

    assert.strictEqual(result.total, 1);
    assert.strictEqual(result.data[0].name, 'Banana');
  });

  await t.test('limit "all"', () => {
    const q = mockQuery({ limit: 'all' });
    const result = queryPaginated(q, {
      fromSql: 'test_items'
    });

    assert.strictEqual(result.limit, 5); // equals total if 'all'
    assert.strictEqual(result.total_pages, 1);
    assert.strictEqual(result.data.length, 5);
  });

  await t.test('buildWhere logic', () => {
    const q = mockQuery();
    const result = queryPaginated(q, {
      fromSql: 'test_items',
      buildWhere: (whereClauses, args) => {
        whereClauses.push('price < ?');
        args.push(1.0);
      }
    });

    // Banana (0.8), Carrot (0.5)
    assert.strictEqual(result.total, 2);
    assert.strictEqual(result.data.length, 2);
  });
});
