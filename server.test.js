const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { DatabaseSync } = require('node:sqlite');
const crypto = require('node:crypto');

// Setup environment before requiring server and db
const tempDir = os.tmpdir();
const testDbPath = path.join(tempDir, `test_db_${Date.now()}.db`);
process.env.TEST_DB_PATH = testDbPath;

const { server } = require('./server.js');
const { db } = require('./db.js');

let baseUrl;
const testSessionToken = crypto.randomBytes(32).toString('hex');

test.before(async () => {
  // Insert test admin user
  const adminId = db.prepare(`
    INSERT INTO users (username, password_hash, role, name, active)
    VALUES ('testadmin', 'dummy', 'admin', 'Test Admin', 1)
  `).run().lastInsertRowid;

  // Insert session for test admin
  db.prepare(`
    INSERT INTO sessions (token, user_id) VALUES (?, ?)
  `).run(testSessionToken, adminId);

  // Start server on a random port
  await new Promise((resolve) => {
    server.listen(0, () => {
      baseUrl = `http://localhost:${server.address().port}`;
      resolve();
    });
  });
});

test.after(async () => {
  await new Promise((resolve) => {
    server.close(() => {
      resolve();
    });
  });

  try {
    db.close();
  } catch (e) {
    // Ignore if already closed
  }

  // Clean up temporary database files
  try { if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath); } catch (e) {}
  try { if (fs.existsSync(testDbPath + '-wal')) fs.unlinkSync(testDbPath + '-wal'); } catch (e) {}
  try { if (fs.existsSync(testDbPath + '-shm')) fs.unlinkSync(testDbPath + '-shm'); } catch (e) {}
});

test('POST /api/system/restore rejects invalid database schema', async () => {
  // Create a dummy valid SQLite database lacking required tables
  const dummyDbPath = path.join(tempDir, `dummy_${Date.now()}.db`);
  const dummyDb = new DatabaseSync(dummyDbPath);
  dummyDb.exec('CREATE TABLE dummy (id INTEGER PRIMARY KEY)');
  dummyDb.close();

  const fileBuffer = fs.readFileSync(dummyDbPath);

  const response = await fetch(`${baseUrl}/api/system/restore`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${testSessionToken}`,
      'Content-Type': 'application/octet-stream',
    },
    body: fileBuffer,
  });

  const responseBody = await response.json();

  assert.strictEqual(response.status, 400);
  assert.ok(responseBody.error);
  assert.ok(responseBody.error.includes('Backup validation failed: Invalid database schema'));

  // Cleanup dummy DB
  try { fs.unlinkSync(dummyDbPath); } catch (e) {}
});
