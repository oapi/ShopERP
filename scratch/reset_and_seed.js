const { db, hashPassword } = require('../db');

console.log('Resetting database records and populating fresh sample data...');

db.exec('BEGIN TRANSACTION;');

try {
  // Clear existing transactional & master data
  db.exec('DELETE FROM account_transactions;');
  db.exec('DELETE FROM purchase_items;');
  db.exec('DELETE FROM purchases;');
  db.exec('DELETE FROM sale_items;');
  db.exec('DELETE FROM sales;');
  db.exec('DELETE FROM payments;');
  db.exec('DELETE FROM expenses;');
  db.exec('DELETE FROM products;');
  db.exec('DELETE FROM customers;');
  db.exec('DELETE FROM suppliers;');
  db.exec('DELETE FROM accounts;');
  db.exec('DELETE FROM sessions;');

  // Reset sqlite autoincrement sequences
  db.exec("DELETE FROM sqlite_sequence WHERE name IN ('accounts', 'products', 'customers', 'suppliers', 'sales', 'sale_items', 'purchases', 'purchase_items', 'payments', 'expenses', 'account_transactions');");

  // 1. Seed Accounts
  const insAcct = db.prepare('INSERT INTO accounts (id, name, type, account_number, opening_balance, active) VALUES (?,?,?,?,?,?)');
  insAcct.run(1, 'Cash at Shop', 'cash', '', 50000, 1);
  insAcct.run(2, 'Agrani Bank (Bogura Branch)', 'bank', 'AGB-02000188921', 150000, 1);
  insAcct.run(3, 'Islami Bank (Satmatha Branch)', 'bank', 'IBBL-2050119982', 100000, 1);

  // 2. Seed Products (active = 1)
  const insProd = db.prepare(`INSERT INTO products
    (id, name, category, brand, size, unit, purchase_price, retail_price, wholesale_price, stock_qty, low_stock_alert, active)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
  
  // Stock Qty will be updated via purchases & sales below
  insProd.run(1, 'MS Rod 10mm', 'rod', 'BSRM', '10mm', 'kg', 87, 94, 91, 1000, 200, 1);
  insProd.run(2, 'MS Rod 12mm', 'rod', 'BSRM', '12mm', 'kg', 86, 93, 90, 1500, 300, 1);
  insProd.run(3, 'Cement OPC (50kg)', 'cement', 'Shah Cement', '50kg bag', 'bag', 480, 540, 520, 200, 50, 1);
  insProd.run(4, 'Cement PCC (50kg)', 'cement', 'Bashundhara', '50kg bag', 'bag', 460, 520, 500, 150, 50, 1);

  // 3. Seed Customers
  const insCust = db.prepare('INSERT INTO customers (id, name, phone, address, type, active) VALUES (?,?,?,?,?,?)');
  insCust.run(1, 'Rahim Builders', '01711-112233', 'Station Road, Bogura', 'wholesale', 1);
  insCust.run(2, 'Karim Store', '01811-223344', 'Main Market, Bogura', 'retail', 1);
  insCust.run(3, 'City Construction Ltd', '01911-334455', 'Matidali, Bogura', 'wholesale', 1);

  // 4. Seed Suppliers
  const insSupp = db.prepare('INSERT INTO suppliers (id, name, phone, address, active) VALUES (?,?,?,?,?)');
  insSupp.run(1, 'BSRM Steels Ltd', '01911-888999', 'Chattogram Depot, Bogura', 1);
  insSupp.run(2, 'Shah Cement Ltd', '01711-777888', 'Colony Bazar, Bogura', 1);
  insSupp.run(3, 'Bashundhara Group', '01811-666777', 'Jahangirabad, Bogura', 1);

  const today = new Date().toISOString().split('T')[0];

  // 5. Seed Purchases (2 sample records)
  // Purchase 1: BSRM Rod purchase (Paid ৳50,000 out of ৳87,000, ৳37,000 due)
  const insPu = db.prepare(`INSERT INTO purchases (id, ref_no, supplier_id, supplier_name, date, total, paid, account_id, note, created_by)
    VALUES (?,?,?,?,?,?,?,?,?,?)`);
  insPu.run(1, 'PUR-202601', 1, 'BSRM Steels Ltd', today, 87000, 50000, 2, 'Initial Stock Replenishment', 1);
  
  const insPuItem = db.prepare(`INSERT INTO purchase_items (purchase_id, product_id, product_name, unit, qty, unit_cost, line_total)
    VALUES (?,?,?,?,?,?,?)`);
  insPuItem.run(1, 1, 'MS Rod 10mm BSRM 10mm', 'kg', 1000, 87, 87000);

  // Trx for Purchase 1
  db.prepare(`INSERT INTO account_transactions (account_id, type, amount, ref_type, ref_id, date, note, created_by)
    VALUES (?,?,?,?,?,?,?,?)`).run(2, 'purchase_payment', 50000, 'purchase', 1, today, 'Purchase PUR-202601 payment', 1);

  // Purchase 2: Shah Cement purchase (Paid in full ৳48,000)
  insPu.run(2, 'PUR-202602', 2, 'Shah Cement Ltd', today, 48000, 48000, 1, 'Shah Cement Stock Order', 1);
  insPuItem.run(2, 3, 'Cement OPC (50kg) Shah Cement 50kg bag', 'bag', 100, 480, 48000);

  db.prepare(`INSERT INTO account_transactions (account_id, type, amount, ref_type, ref_id, date, note, created_by)
    VALUES (?,?,?,?,?,?,?,?)`).run(1, 'purchase_payment', 48000, 'purchase', 2, today, 'Purchase PUR-202602 payment', 1);

  // 6. Seed Sales (3 sample records)
  // Sale 1: Rahim Builders (Wholesale) - Total ৳45,500, Paid ৳30,000, Due ৳15,500
  const insSale = db.prepare(`INSERT INTO sales (id, invoice_no, customer_id, customer_name, sale_type, date, subtotal, discount, total, paid, account_id, note, created_by)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  insSale.run(1, 'INV-00001', 1, 'Rahim Builders', 'wholesale', today, 45500, 0, 45500, 30000, 1, 'Site Delivery Order #1', 1);

  const insSaleItem = db.prepare(`INSERT INTO sale_items (sale_id, product_id, product_name, unit, qty, unit_price, unit_cost, line_total)
    VALUES (?,?,?,?,?,?,?,?)`);
  insSaleItem.run(1, 1, 'MS Rod 10mm BSRM 10mm', 'kg', 500, 91, 87, 45500);

  db.prepare(`INSERT INTO account_transactions (account_id, type, amount, ref_type, ref_id, date, note, created_by)
    VALUES (?,?,?,?,?,?,?,?)`).run(1, 'sale_collection', 30000, 'sale', 1, today, 'Invoice INV-00001 payment', 1);

  // Sale 2: Karim Store (Retail) - Paid in full ৳27,000
  insSale.run(2, 'INV-00002', 2, 'Karim Store', 'retail', today, 27000, 0, 27000, 27000, 1, 'Shop Counter Sale', 1);
  insSaleItem.run(2, 3, 'Cement OPC (50kg) Shah Cement 50kg bag', 'bag', 50, 540, 480, 27000);

  db.prepare(`INSERT INTO account_transactions (account_id, type, amount, ref_type, ref_id, date, note, created_by)
    VALUES (?,?,?,?,?,?,?,?)`).run(1, 'sale_collection', 27000, 'sale', 2, today, 'Invoice INV-00002 payment', 1);

  // Sale 3: Walk-in Customer (Retail) - Paid ৳9,400
  insSale.run(3, 'INV-00003', null, 'Walk-in Customer', 'retail', today, 9400, 0, 9400, 9400, 1, 'Cash Walk-in Sale', 1);
  insSaleItem.run(3, 1, 'MS Rod 10mm BSRM 10mm', 'kg', 100, 94, 87, 9400);

  db.prepare(`INSERT INTO account_transactions (account_id, type, amount, ref_type, ref_id, date, note, created_by)
    VALUES (?,?,?,?,?,?,?,?)`).run(1, 'sale_collection', 9400, 'sale', 3, today, 'Invoice INV-00003 payment', 1);

  // 7. Seed Payments (1 collection from customer, 1 payment to supplier)
  const insPymt = db.prepare('INSERT INTO payments (id, party_type, party_id, date, amount, method, account_id, note, created_by) VALUES (?,?,?,?,?,?,?,?,?)');
  
  // Customer due collection (Rahim Builders paid ৳5,000 towards due)
  insPymt.run(1, 'customer', 1, today, 5000, 'cash', 1, 'Partial due collection', 1);
  db.prepare(`INSERT INTO account_transactions (account_id, type, amount, ref_type, ref_id, date, note, created_by)
    VALUES (?,?,?,?,?,?,?,?)`).run(1, 'due_payment', 5000, 'payment', 1, today, 'Payment for customer #1', 1);

  // Supplier due payment (Paid BSRM Steels Ltd ৳15,000 from Bank Account)
  insPymt.run(2, 'supplier', 1, today, 15000, 'bank', 2, 'Part payment for PUR-202601', 1);
  db.prepare(`INSERT INTO account_transactions (account_id, type, amount, ref_type, ref_id, date, note, created_by)
    VALUES (?,?,?,?,?,?,?,?)`).run(2, 'due_payment', 15000, 'payment', 2, today, 'Payment for supplier #1', 1);

  // 8. Seed Expenses (2 sample records)
  const insExp = db.prepare('INSERT INTO expenses (id, date, category, amount, account_id, note, created_by) VALUES (?,?,?,?,?,?,?)');
  insExp.run(1, today, 'rent', 8000, 1, 'Monthly shop rent payment', 1);
  db.prepare(`INSERT INTO account_transactions (account_id, type, amount, ref_type, ref_id, date, note, created_by)
    VALUES (?,?,?,?,?,?,?,?)`).run(1, 'expense', 8000, 'expense', 1, today, 'Expense (rent)', 1);

  insExp.run(2, today, 'transport', 1500, 1, 'Rod & Cement unloading labor & freight', 1);
  db.prepare(`INSERT INTO account_transactions (account_id, type, amount, ref_type, ref_id, date, note, created_by)
    VALUES (?,?,?,?,?,?,?,?)`).run(1, 'expense', 1500, 'expense', 2, today, 'Expense (transport)', 1);

  db.exec('COMMIT;');
  console.log('Database reset & sample data population completed successfully!');

} catch (err) {
  db.exec('ROLLBACK;');
  console.error('Failed to reset database:', err);
  process.exit(1);
}
