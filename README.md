# Business Sales and Inventory App

Your personal daily sales, inventory, and reporting tool — powered by React + Firebase.

---

## STEP 1 — Set Up Firebase (Free)

1. Go to https://console.firebase.google.com
2. Click **"Add project"** → name it (e.g. "biz-sales-app") → Continue
3. Disable Google Analytics (not needed) → **Create project**
4. Once created, click the **</>** (Web) icon to register your app
5. Give it a nickname (e.g. "My App") → click **Register app**
6. You will see a `firebaseConfig` block like this — **copy it**:

```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

7. Open the file **src/firebase.js** in this folder and paste your values
8. Back in Firebase console → go to **Firestore Database** (left sidebar)
9. Click **Create database** → choose **Start in test mode** → Next → Enable
10. Done — your database is ready!

---

## STEP 2 — Upload to GitHub

1. Go to https://github.com and sign in (or create a free account)
2. Click **+** (top right) → **New repository**
3. Name it `business-sales-inventory-app` → **Create repository**
4. Click **"uploading an existing file"**
5. Unzip this folder, then drag ALL files into the GitHub page:
   - `package.json`, `vite.config.js`, `index.html`, `netlify.toml`, `.gitignore`
   - The entire `src/` folder (drag the folder itself)
6. Click **Commit changes**

---

## STEP 3 — Deploy on Netlify (Free)

1. Go to https://netlify.com → **Sign up with GitHub**
2. Click **"Add new site"** → **"Import an existing project"**
3. Choose **GitHub** → select `business-sales-inventory-app`
4. Build settings are auto-detected — just click **Deploy site**
5. Wait ~2 minutes → you get a live URL like `https://biz-sales-xyz.netlify.app`
6. Optional: go to **Site settings → Domain** to rename it (e.g. `mystore.netlify.app`)

---

## Your App is Now Live!

- Open it from any phone or computer — your data saves permanently to Firebase
- Sales, inventory changes, and settings all sync in real time
- Works across multiple devices simultaneously

---

## Files in This Project

```
dailyops/
├── src/
│   ├── App.jsx        ← Main app (all features)
│   ├── firebase.js    ← ⚠️ Edit this with your Firebase config
│   └── main.jsx       ← Entry point
├── index.html
├── package.json
├── vite.config.js
├── netlify.toml
└── .gitignore
```
