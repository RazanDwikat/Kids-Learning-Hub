---
name: Answer recovery safety
description: Why rejected answers and uncertain submissions need different recovery paths.
---
Only definitively rejected, pre-write validation errors may unlock answer editing directly. A network failure, server failure or conflict is not proof that an answer was never saved.

**Why:** Treating every failure as retryable trapped children in an endless retry of invalid homework answers. Treating every failure as rejected would instead risk losing or duplicating saved attempts.

**How to apply:** Preserve exact payload and request ID across uncertain retries, including normalization changes in later releases. Normalize new answers before creating their pending record, not stored retries. Reconcile obsolete records with confirmed server progress; quarantine unreadable pending data separately, never clear child identity or unrelated storage.

Recovery must fail closed when talking to older servers or receiving unknown error codes; do not add a fallback that matches human-readable messages.

**Why:** Copy changes must not determine whether a pending answer is safe to discard, and older responses cannot supply the stable guarantee.

**How to apply:** Keep pending answers protected when a code is missing or unrecognized, using the existing retry/check-progress options.