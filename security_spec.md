
# Security Specification for HUTECH Student Clubs

## Data Invariants
1. A Club member must belong to a Club that exists.
2. An Event must belong to an approved Club.
3. Attendance can only be recorded for a user who is registered for the event.
4. Only Admins can approve Clubs or Events.
5. Only Club Leaders can manage their own club members and events.
6. A user can only see their own PII (email, face_image).

## The Dirty Dozen Payloads (Targeting Rejection)
1. **Identity Spoofing**: Attempt to create a user profile with a different `uid`.
2. **Role Escalation**: Student attempting to set `role: 'ADMIN'` on creation.
3. **Shadow Field**: Adding `is_verified: true` to a club request.
4. **Orphaned Club**: Creating a club with a non-existent `founder_id`.
5. **Unauthorized Approval**: Leader attempting to set `status: 'APPROVED'` on their own club.
6. **Data Poisoning**: Creating an ID with 1MB of junk characters.
7. **PII Leak**: Non-admin/non-owner attempting to read another user's email.
8. **Bypass Master Gate**: Adding a member to a club without being a leader.
9. **History Manipulation**: Modifying `created_at` timestamp.
10. **Self-Assignment**: Student adding themselves to `admins` collection (if it existed).
11. **Negative Count**: Attempting to set `members: -1` (if using counters).
12. **Blanket Read**: Querying all users' face images without ID restriction.

## Test Runner Logic
The `firestore.rules` will be validated to ensure all the above fail.
