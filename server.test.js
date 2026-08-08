const test = require('node:test');
const assert = require('node:assert');
const { toCSV } = require('./server.js');

test('toCSV function tests', async (t) => {
  await t.test('Happy path: Simple rows and headers', () => {
    const headers = ['name', 'age'];
    const rows = [
      { name: 'Alice', age: 30 },
      { name: 'Bob', age: 25 }
    ];
    const expected = 'name,age\nAlice,30\nBob,25';
    assert.strictEqual(toCSV(rows, headers), expected);
  });

  await t.test('Edge case: Handle null and undefined as empty strings', () => {
    const headers = ['id', 'value', 'notes'];
    const rows = [
      { id: 1, value: null, notes: undefined },
      { id: 2, value: 'test', notes: 'something' }
    ];
    const expected = 'id,value,notes\n1,,\n2,test,something';
    assert.strictEqual(toCSV(rows, headers), expected);
  });

  await t.test('Escaping: Values with commas', () => {
    const headers = ['city', 'description'];
    const rows = [
      { city: 'New York, NY', description: 'Big Apple' }
    ];
    const expected = 'city,description\n"New York, NY",Big Apple';
    assert.strictEqual(toCSV(rows, headers), expected);
  });

  await t.test('Escaping: Values with quotes', () => {
    const headers = ['item', 'quote'];
    const rows = [
      { item: 'apple', quote: 'He said "hello"' }
    ];
    const expected = 'item,quote\napple,"He said ""hello"""';
    assert.strictEqual(toCSV(rows, headers), expected);
  });

  await t.test('Escaping: Values with newlines', () => {
    const headers = ['title', 'body'];
    const rows = [
      { title: 'Post 1', body: 'Line 1\nLine 2' }
    ];
    const expected = 'title,body\nPost 1,"Line 1\nLine 2"';
    assert.strictEqual(toCSV(rows, headers), expected);
  });

  await t.test('Escaping: Combinations of special characters', () => {
    const headers = ['field1'];
    const rows = [
      { field1: 'A "complex", \n value' }
    ];
    const expected = 'field1\n"A ""complex"", \n value"';
    assert.strictEqual(toCSV(rows, headers), expected);
  });

  await t.test('Empty dataset', () => {
    const headers = ['a', 'b'];
    const rows = [];
    const expected = 'a,b';
    assert.strictEqual(toCSV(rows, headers), expected);
  });
});
