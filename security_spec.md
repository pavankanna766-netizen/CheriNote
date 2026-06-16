# Firebase Firestore Security Specification

This security specification implements attribute-based access control (ABAC) and zero-trust policies to safeguard user profiles, custom proposals, private notification lists, and global system update change logs.

## 1. Data Invariants

- **Users (`/users/{userId}`)**: A user profile must only be created or modified by the authenticated user whose `request.auth.uid` matches the document path `{userId}`.
- **Proposals (`/proposals/{proposalId}`)**:
  - Public Proposals (`isPrivate == false`) can be read by anyone.
  - Private Proposals (`isPrivate == true`) can only be read by their creator (`authorId == auth.uid`), or any anonymous recipient viewing the specific targeted link (using direct `get` operations, but list queries are blocked).
  - Writing/Creating a proposal requires the user to be signed in, and `incoming().authorId` must strictly equal `request.auth.uid`.
- **User Notifications (`/users/{userId}/notifications/{notificationId}`)**: Only the recipient user can read or modify notifications targets for them.
- **Update Logs (`/update_logs/{logId}`)**: Read access is public; write access is strictly reserved for authenticated admin accounts.

## 2. The "Dirty Dozen" Payloads

Here are 12 specific payloads representing spoofing, privilege escalation, state bypassing, and boundary-violation vectors that are designed to fail authentication constraints:

1. **User Identity Hijacking**: Unauthenticated profile creation on `/users/attacker_uid`.
2. **User Identity Spoofing**: Signed-in user writing a UserProfile with mismatching `uid`.
3. **Draft Author Takeover**: Creating a CustomProposal with `authorId` mismatching `request.auth.uid`.
4. **Draft Hijack on Update**: Malicious user trying to update another user's CustomProposal by spoofing ownership.
5. **Like Counter Poisoning**: Malicious batch incrementing of `likesCount` without list validation.
6. **Recipient Spoofing (Yes-Click Skipping)**: Bypassing recipient action and clicking 'yesClicked' on another user's behalf without proper permission scope.
7. **Bypassing Character Limits**: Proposal message length exceeding 2000 characters.
8. **Poisoning Views Count**: Overwriting views count to `999999` directly via update.
9. **No-Attempt Spoofing**: Client directly incrementing `noAttempts` to high values.
10. **Notification Read Status Hijack**: User attempting to read or write notifications belonging to `/users/another_uid/notifications/*`.
11. **System Log Defacement**: Authenticated non-admin attempting to write to `/update_logs/{logId}`.
12. **Zombie Field Creation**: Submitting an update with extra undocumented parameters (e.g. `isAdmin: true` or `shadowField`).

## 3. Test Runner Design

All "Dirty Dozen" payloads will return `PERMISSION_DENIED` under the rules defined in `firestore.rules`. Validation helpers enforce strict schema matching, size validation, and matching of path variable IDs to prevent resource-exhaustion attacks.
