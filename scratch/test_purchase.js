const { db } = require('../db');
const http = require('http');

// Let's inspect products, suppliers, accounts
console.log("=== PRODUCTS ===");
console.log(db.prepare('SELECT * FROM products').all());

console.log("=== SUPPLIERS ===");
console.log(db.prepare('SELECT * FROM suppliers').all());

console.log("=== ACCOUNTS ===");
console.log(db.prepare('SELECT * FROM accounts').all());

console.log("=== PURCHASES ===");
console.log(db.prepare('SELECT * FROM purchases').all());
