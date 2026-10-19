const test = require('node:test');
const assert = require('node:assert');
const { parseCSV } = require('./server.js');

test('parseCSV - standard happy path', (t) => {
  const csv = `Name,Age,Location\nAlice,30,New York\nBob,25,London`;
  const result = parseCSV(csv);
  assert.deepStrictEqual(result, [
    { name: 'Alice', age: '30', location: 'New York' },
    { name: 'Bob', age: '25', location: 'London' }
  ]);
});

test('parseCSV - fields with commas inside quotes', (t) => {
  const csv = `Product,Price,Description\nApple,1.00,"A sweet, red fruit"\nBanana,0.50,A yellow fruit`;
  const result = parseCSV(csv);
  assert.deepStrictEqual(result, [
    { product: 'Apple', price: '1.00', description: 'A sweet, red fruit' },
    { product: 'Banana', price: '0.50', description: 'A yellow fruit' }
  ]);
});

test('parseCSV - fields with newlines inside quotes', (t) => {
  const csv = `Name,Bio\nAlice,"Developer\nDesigner"\nBob,"Manager"`;
  const result = parseCSV(csv);
  assert.deepStrictEqual(result, [
    { name: 'Alice', bio: 'Developer\nDesigner' },
    { name: 'Bob', bio: 'Manager' }
  ]);
});

test('parseCSV - fields with escaped quotes', (t) => {
  const csv = `Item,Details\nLaptop,"15"" screen, 8GB RAM"\nMouse,"Wireless, ""Ergonomic"""`;
  const result = parseCSV(csv);
  assert.deepStrictEqual(result, [
    { item: 'Laptop', details: '15" screen, 8GB RAM' },
    { item: 'Mouse', details: 'Wireless, "Ergonomic"' }
  ]);
});

test('parseCSV - different line endings (CRLF)', (t) => {
  const csv = `Header1,Header2\r\nValue1,Value2\r\nValue3,Value4`;
  const result = parseCSV(csv);
  assert.deepStrictEqual(result, [
    { header1: 'Value1', header2: 'Value2' },
    { header1: 'Value3', header2: 'Value4' }
  ]);
});

test('parseCSV - different line endings (CR)', (t) => {
  const csv = `Header1,Header2\rValue1,Value2\rValue3,Value4`;
  const result = parseCSV(csv);
  assert.deepStrictEqual(result, [
    { header1: 'Value1', header2: 'Value2' },
    { header1: 'Value3', header2: 'Value4' }
  ]);
});

test('parseCSV - empty strings / empty lines', (t) => {
  const csv = `Col1,Col2\nVal1,\n,Val4\n\n\n`;
  const result = parseCSV(csv);
  assert.deepStrictEqual(result, [
    { col1: 'Val1', col2: '' },
    { col1: '', col2: 'Val4' }
  ]);
});

test('parseCSV - proper formatting of headers', (t) => {
  const csv = `First Name,Last-Name,Age (Yrs),E_Mail!,Contact#\nJohn,Doe,30,j@d.com,123`;
  const result = parseCSV(csv);
  assert.deepStrictEqual(result, [
    { first_name: 'John', last_name: 'Doe', age__yrs_: '30', e_mail_: 'j@d.com', contact_: '123' }
  ]);
});

test('parseCSV - insufficient lines (just header or empty)', (t) => {
  assert.deepStrictEqual(parseCSV(''), []);
  assert.deepStrictEqual(parseCSV('Header1,Header2'), []);
});
