const http = require('http');

async function testApi() {
    const postReq = (path, body, token) => new Promise((resolve, reject) => {
        const req = http.request({
            hostname: '127.0.0.1',
            port: 3000,
            path: path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        }, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(data || '{}') }));
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });

    console.log("Starting server tests...");
    // 1. Get a token by authenticating as admin
    const loginRes = await postReq('/api/auth/login', { username: 'admin', password: 'admin123' }, '');
    const token = loginRes.data.token;
    if (!token) {
        console.error("Login failed:", loginRes);
        process.exit(1);
    }

    // Create a product
    const prodRes = await postReq('/api/products', { name: "Test Product A", purchase_price: 10, retail_price: 15, stock_qty: 100 }, token);
    const prodId = prodRes.data.id;
    console.log("Product created:", prodId);

    // Test sales POST
    const salesBody = {
        items: [{ product_id: prodId, qty: 2, unit_price: 15 }],
        paid: 30,
        customer_id: 1, // Use seed data if available
        account_id: 1
    };
    const salesRes = await postReq('/api/sales', salesBody, token);
    console.log("Sales Res:", salesRes.status, salesRes.data);

    // Test purchases POST
    const purchasesBody = {
        items: [{ product_id: prodId, qty: 5, unit_cost: 10 }],
        paid: 50,
        supplier_name: 'Cash Supplier',
        account_id: 1
    };
    const purchasesRes = await postReq('/api/purchases', purchasesBody, token);
    console.log("Purchases Res:", purchasesRes.status, purchasesRes.data);

    if (salesRes.status !== 200 && salesRes.status !== 201) {
        console.error("Endpoint sales failed");
        process.exit(1);
    }
    if (purchasesRes.status !== 200 && purchasesRes.status !== 201) {
        console.error("Endpoint purchases failed");
        process.exit(1);
    }
    console.log("Endpoint tests passed!");
}

testApi().catch(console.error);
