const test = require('node:test');
const assert = require('node:assert');

// Load the actual transaction function from server.js
const { transaction } = require('../server');
// Load the actual db object so we can spy on it
const { db } = require('../db');

test('transaction helper tests', async (t) => {
  // We'll replace db.exec momentarily to intercept calls
  let execCalls = [];
  const originalExec = db.exec;
  db.exec = function(sql) {
    execCalls.push(sql);
    originalExec.call(db, sql);
  };

  t.after(() => {
    // Restore original exec
    db.exec = originalExec;
  });

  await t.test('Successful transaction (COMMIT)', () => {
    execCalls = [];

    const result = transaction(() => {
      return 'success_val';
    });

    assert.strictEqual(result, 'success_val', 'Should return the result of the function');
    assert.deepStrictEqual(execCalls, ['BEGIN', 'COMMIT'], 'Should call BEGIN and COMMIT on success');
  });

  await t.test('Failed transaction (ROLLBACK)', () => {
    execCalls = [];

    let thrownError;
    try {
      transaction(() => {
        throw new Error('test_error');
      });
    } catch (e) {
      thrownError = e;
    }

    assert.ok(thrownError, 'Should throw an error');
    assert.strictEqual(thrownError.message, 'test_error', 'Should throw the exact error');
    assert.deepStrictEqual(execCalls, ['BEGIN', 'ROLLBACK'], 'Should call BEGIN and ROLLBACK on error');
  });
});
