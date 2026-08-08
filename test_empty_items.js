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

    console.log("Starting empty items tests...");
    const loginRes = await postReq('/api/auth/login', { username: 'admin', password: 'admin123' }, '');
    const token = loginRes.data.token;

    // Test sales POST with missing product ID in one item
    const salesBody = {
        items: [{ product_id: 9999, qty: 2, unit_price: 15 }],
        paid: 30,
        customer_id: 1,
        account_id: 1
    };
    const salesRes = await postReq('/api/sales', salesBody, token);
    console.log("Sales Res (missing product):", salesRes.status, salesRes.data);

    if (salesRes.status !== 500 && salesRes.status !== 400) {
        console.error("Endpoint sales should have failed");
        process.exit(1);
    }
    console.log("Empty items tests passed!");
}

testApi().catch(console.error);
