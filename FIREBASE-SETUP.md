# Private song library: setup

This branch is a preview and does not change the current public GitHub Pages app.

1. Create/select Firebase project, register a **Web app**, copy its config to `firebase-config.js`.
2. Authentication -> Sign-in method -> enable **Email/Password**.
3. Authentication -> Settings -> Authorized domains: add `51sth.github.io`.
4. Firestore Database -> create database, then paste and **publish** `firestore.rules` using the Rules tab. Do not use test mode in production.
5. Test signup, login, logout, cross-device sync, backups and importing older local songs on the branch preview before merging into main.
6. Merge PR only after security rules and Firebase setup are active.

The site is public; user song content is not shipped in this repository.
Existing local browser data are kept in place and are never silently copied into a new account. Use the import button after logging in. Export a JSON backup first.
Firestore currently stores one library document per user (suitable for modest libraries; Firestore document limit is 1 MiB). Concurrent changes from different devices may cause last-write-wins; avoid editing simultaneously until a future version supports per-song concurrency.
