const { db } = require('../db');

const saleItems = db.prepare('SELECT COUNT(*) AS c FROM sale_items WHERE sale_id = 1002').get().c;
const purItems = db.prepare('SELECT COUNT(*) AS c FROM purchase_items WHERE purchase_id = 1002').get().c;
console.log('Orphan sale items:', saleItems);
console.log('Orphan purchase items:', purItems);

const sTxs = db.prepare("SELECT COUNT(*) AS c FROM account_transactions WHERE ref_type = 'sale' AND ref_id = 1002").get().c;
const pTxs = db.prepare("SELECT COUNT(*) AS c FROM account_transactions WHERE ref_type = 'purchase' AND ref_id = 1002").get().c;
console.log('Orphan sale txs:', sTxs);
console.log('Orphan purchase txs:', pTxs);
