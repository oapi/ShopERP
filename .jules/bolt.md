## 2024-05-24 - N+1 overhead in accountBalance calculation
**Learning:** Calculating balances by executing 5 separate db.prepare().get() queries per account call results in substantial overhead (e.g. 1.9s vs 0.19s for 10000 calls).
**Action:** Consolidate multiple synchronous read queries from the same table into a single parameterized SQLite statement using SUM with CASE WHEN blocks. Also hoist the db.prepare statement to module level.
