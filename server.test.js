const { test } = require('node:test');
const assert = require('node:assert');
const { transaction } = require('./server.js');
const { db } = require('./db.js');

test('transaction helper rolls back on error', (t) => {
  const execMock = t.mock.method(db, 'exec', () => {});

  const expectedError = new Error('Test error');

  assert.throws(() => {
    transaction(() => {
      throw expectedError;
    });
  }, { message: 'Test error' });

  const calls = execMock.mock.calls.map(c => c.arguments[0]);
  assert.deepStrictEqual(calls, ['BEGIN', 'ROLLBACK']);
});

test('transaction helper commits on success', (t) => {
  const execMock = t.mock.method(db, 'exec', () => {});

  const result = transaction(() => {
    return 'success';
  });

  assert.strictEqual(result, 'success');
  const calls = execMock.mock.calls.map(c => c.arguments[0]);
  assert.deepStrictEqual(calls, ['BEGIN', 'COMMIT']);
});
