# GoAbroad Everything Tracker

Next.js 14 + Tailwind project tracker with a Gantt timeline. Google sign-in via Firebase Auth, data in Firestore.

- **Tracker** tab: sheet-like table grouped by section. Edit name, progress, start, due, release and notes inline.
- **Timeline** tab: Gantt chart (day / week / month zoom), progress fill, release markers, today line. Click a bar to edit.

## Run

Requires Node 18.17+ (Node 20 recommended).

```bash
npm install
npm run dev     # http://localhost:3100
```

With no Firebase env vars the app runs in **demo mode**: a one-click "sign-in" and sample data stored in the browser only.

## Connect Firebase

1. Firebase console → create a project → add a **Web app**; copy its config.
2. Authentication → Sign-in method → enable **Google**. Add your deploy domain under Authorized domains.
3. Firestore Database → create database, then publish `firestore.rules` (limits access to `@goabroad.com` accounts; edit as needed).
4. `cp .env.example .env.local` and fill in the values. `NEXT_PUBLIC_ALLOWED_DOMAIN` restricts sign-in to one Google Workspace domain (leave blank to allow any account).

Projects are stored in the `projects` collection.
