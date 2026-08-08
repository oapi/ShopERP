const http = require('node:http');

async function testApi() {
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  }).then(r => r.json());

  const token = loginRes.token;

  const purchaseRes = await fetch('http://localhost:3000/api/purchases', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      supplier_name: 'Test Supplier',
      paid: 500, // full payment
      items: [{ product_id: 1, qty: 10, unit_cost: 50 }]
    })
  }).then(r => r.json());

  console.log('purchaseRes:', purchaseRes);
  const pId = purchaseRes.id;

  const saleRes = await fetch('http://localhost:3000/api/sales', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      customer_name: 'Test Customer',
      paid: 200, // full payment
      items: [{ product_id: 1, qty: 2, unit_price: 100 }]
    })
  }).then(r => r.json());
  console.log('saleRes:', saleRes);

  const sId = saleRes.id;

  if (!pId || !sId) return;

  const delSaleRes = await fetch('http://localhost:3000/api/bulk-delete/sales', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ ids: [sId] })
  }).then(r => r.json());

  const delPurRes = await fetch('http://localhost:3000/api/bulk-delete/purchases', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ ids: [pId] })
  }).then(r => r.json());

  console.log('Del Sale Res:', delSaleRes);
  console.log('Del Purchase Res:', delPurRes);
}

testApi().catch(console.error);
