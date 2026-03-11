# 🚀 LaunchPad

> Deploy your projects without the stress — no terminal knowledge required.

LaunchPad is a mobile-friendly web app that connects to your GitHub account and deploys your projects to GitHub Pages, Vercel, or Netlify in a few taps.

---

## 📁 File Structure

```
launchpad/
├── public/
│   ├── index.html     ← The app UI
│   ├── style.css      ← All styles
│   └── app.js         ← All logic + GitHub API calls
├── server.js          ← Simple Express server (for hosted deploys)
├── package.json       ← Node dependencies
└── README.md          ← This file
```

---

## 🚀 Option A — Open Locally (Easiest, Zero Setup)

Just open `public/index.html` directly in your browser. No server needed.

The app runs entirely in your browser and calls GitHub's API directly.

---

## 🌐 Option B — Deploy LaunchPad Itself (Free)

### Step 1 — Push to GitHub

1. Create a free account at [github.com](https://github.com)
2. Create a new repository (e.g. `launchpad`)
3. Upload all these files to the repo

### Step 2 — Deploy on Vercel (Free)

1. Go to [vercel.com](https://vercel.com) and sign up free with GitHub
2. Click **"Add New Project"**
3. Import your `launchpad` repository
4. Set **Framework Preset** → `Other`
5. Set **Output Directory** → `public`
6. Click **Deploy**

That's it — Vercel gives you a free `.vercel.app` URL.

### Alternative — Deploy on Netlify (Free)

1. Go to [netlify.com](https://netlify.com) and sign up free
2. Click **"Add new site" → "Import an existing project"**
3. Connect your GitHub and pick the `launchpad` repo
4. Set **Publish directory** → `public`
5. Click **Deploy site**

---

## 🔑 How Users Get Their GitHub Token

When a user opens LaunchPad, they need a GitHub Personal Access Token.

**Steps to get one:**
1. Go to [github.com/settings/tokens/new](https://github.com/settings/tokens/new?scopes=repo,workflow&description=LaunchPad)
2. Give it a name like "LaunchPad"
3. Under **Scopes**, check: `repo` and `workflow`
4. Click **Generate token**
5. Copy the token (starts with `ghp_`)
6. Paste it into LaunchPad

The token is only stored in the user's browser memory — never sent to any server.

---

## ✅ What LaunchPad Can Deploy

| Project Type | Supported | Notes |
|---|---|---|
| HTML/CSS/JS websites | ✅ | Works perfectly |
| React apps (Vite/CRA) | ✅ | Enable build toggle |
| Vue apps | ✅ | Enable build toggle |
| Next.js | ✅ Best on Vercel | |
| Node.js backends | ✅ Best on Railway/Render | |
| Python apps | ⚠️ | Use Railway/Render manually |

---

## 🆓 Is It Free?

Yes, 100% free:
- **GitHub** — free account, free API, free Pages hosting
- **Vercel** — free tier (100GB bandwidth/month)
- **Netlify** — free tier (100GB bandwidth/month)
- **This app** — free to run, no backend needed

---

## 🛠 Troubleshooting

**"GitHub Pages requires a public repository"**
→ Go to your repo on GitHub → Settings → General → scroll to "Danger Zone" → Change visibility to Public

**"Could not create workflow"**
→ Make sure your token has the `workflow` scope selected

**"Deployment not showing up"**
→ GitHub Pages can take 1–5 minutes on first deploy. Check the Actions tab in your repo.

**Token not working**
→ Make sure you selected `repo` AND `workflow` scopes when creating the token
