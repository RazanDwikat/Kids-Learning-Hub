---
name: Answer recovery safety
description: Why rejected answers and uncertain submissions need different recovery paths.
---
Only definitively rejected, pre-write validation errors may unlock answer editing directly. A network failure, server failure or conflict is not proof that an answer was never saved.

**Why:** Treating every failure as retryable trapped children in an endless retry of invalid homework answers. Treating every failure as rejected would instead risk losing or duplicating saved attempts.

**How to apply:** Preserve exact payload and request ID across uncertain retries, including normalization changes in later releases. Normalize new answers before creating their pending record, not stored retries. Reconcile obsolete records with confirmed server progress; quarantine unreadable pending data separately, never clear child identity or unrelated storage.