## 2026-10-10 - Conditional Aggregation for Multiple Sums
**Learning:** When calculating multiple distinct sums from the same table (like different transaction types in account_transactions), calculating them via separate queries introduces N+1 overhead in loops.
**Action:** Combine them into a single node:sqlite query using conditional aggregation (SUM(CASE WHEN condition THEN amount ELSE 0 END)) to drastically reduce database hits.
