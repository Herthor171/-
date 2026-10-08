# LK Smile Dental Clinic Security Specification

## 1. Data Invariants
1. **Identity Ownership**: Every document in `/patients`, `/appointments`, `/ehr_records`, `/inventory`, `/transactions`, `/staff`, and `/backups` must have `ownerId == request.auth.uid` on creation and `ownerId` must remain immutable during updates.
2. **Email Verification**: Every write operation requires `request.auth.token.email_verified == true`.
3. **Strict Schema & Size Boundaries**: Every string field has an explicit `.size() <= MAX` constraint matching `firebase-blueprint.json`, and every document creation uses `.keys().hasAll(...)` and `.keys().hasOnly(...)`.
4. **Temporal Integrity**: `createdAt == request.time` on creation, `createdAt == existing().createdAt` and `updatedAt == request.time` on update.
5. **Query Enforcer**: All `allow list` rules strictly verify `resource.data.ownerId == request.auth.uid || isAdmin()`.
6. **Admin RBAC**: `isAdmin()` checks verified email (`herthor12@gmail.com`) or existence in `/admins/$(request.auth.uid)`.

## 2. The "Dirty Dozen" Payloads
1. **Shadow Field Injection**: Creating a `patients` doc with an extra field `"isSuperAdmin": true`. Rejected by `hasOnly()`.
2. **Identity Spoofing**: Creating an `appointments` doc where `ownerId` is set to another user's UID. Rejected by `data.ownerId == request.auth.uid`.
3. **Unverified Email Write**: Attempting to create a `transactions` doc with `email_verified: false`. Rejected by `isVerifiedUser()`.
4. **Denial of Wallet ID Poisoning**: Creating `/inventory/{itemId}` with a 500-character ID or invalid characters (`../`). Rejected by `isValidId(itemId)`.
5. **Oversized String Payload**: Updating `ehr_records` `clinicalNotes` with a 5,000-character string (limit 1,000). Rejected by `isValidEhrRecord(incoming())`.
6. **Immutable Field Tampering**: Updating a `patients` doc and modifying `createdAt` or `ownerId`. Rejected by immutability gate.
7. **Forged Client Timestamp**: Creating a `backups` doc with a past or future `createdAt` timestamp instead of `request.time`. Rejected by `incoming().createdAt == request.time`.
8. **Invalid Enum State**: Creating a `transactions` doc with `txType: "Crypto"`. Rejected by `data.txType in ['Income', 'Expense']`.
9. **Negative Inventory Quantity**: Updating an `inventory` doc with `quantity: -5`. Rejected by `data.quantity >= 0`.
10. **Unauthorized PII Read**: Authenticated user reading another user's `/patients/{patientId}` or `/staff/{staffId}` record. Rejected by `isOwner(existing().ownerId) || isAdmin()`.
11. **Unfiltered Collection Scraping**: Listing `/patients` without `where('ownerId', '==', uid)`. Rejected by `allow list` `resource.data.ownerId == request.auth.uid`.
12. **Privilege Escalation on Staff**: Non-admin user attempting to delete or modify another clinic's `/staff/{staffId}` record. Rejected by ownership and admin checks.
