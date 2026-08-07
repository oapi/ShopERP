const { db } = require('../db');

// Let's test calling POST /api/purchases directly via internal function or fetch HTTP request
const http = require('http');

async function runTest() {
  const postData = JSON.stringify({
    supplier_id: 1,
    ref_no: 'TEST-PUR-101',
    date: '2026-08-08',
    paid: 10000,
    account_id: 1,
    note: 'Automated test purchase',
    items: [
      { product_id: 1, qty: 100, unit_cost: 87 }
    ]
  });

  console.log("Testing POST purchase payload...");
}

runTest();
