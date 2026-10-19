const { readJSON } = require('../server.js');
const { Readable } = require('node:stream');
const assert = require('node:assert');

async function runTests() {
  // test 1: valid JSON
  let req = Readable.from(['{"a": 1}']);
  let res = await readJSON(req);
  assert.deepStrictEqual(res, {a: 1});

  // test 2: empty JSON
  req = Readable.from(['']);
  res = await readJSON(req);
  assert.deepStrictEqual(res, {});

  // test 3: invalid JSON
  req = Readable.from(['{a: 1}']);
  await assert.rejects(readJSON(req), { message: 'Invalid JSON' });

  console.log('All readJSON tests passed!');
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
