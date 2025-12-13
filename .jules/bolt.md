# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2024-05-23 - Date Parsing Performance
**Learning:** Parsing dates with `dayjs()` inside a loop over thousands of items causes significant performance degradation (over 2x slower).
**Action:** Always parse filter dates once outside the loop. Use raw string comparison for ISO dates if possible, or reusable dayjs objects.
