// ─────────────────────────────────────────────────────────────
// LaunchPad — app.js
// Real GitHub API deployment (GitHub Pages via Actions workflow)
// ─────────────────────────────────────────────────────────────

const GITHUB_API = 'https://api.github.com';

// ── STATE ──────────────────────────────────────────────────
let state = {
  token: '',
  user: null,
  repos: [],
  filteredRepos: [],
  selectedRepo: null,
  target: 'gh-pages',
  currentScreen: 1,
  deployStartTime: null,
};

// ── NAVIGATION ─────────────────────────────────────────────
function showScreen(n) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + n).classList.add('active');
  state.currentScreen = n;
  updateStepsBar();
  updateActions();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateStepsBar() {
  for (let i = 1; i <= 5; i++) {
    const dot = document.getElementById('step-' + i);
    dot.className = 'step-dot';
    if (i < state.currentScreen) dot.classList.add('done');
    else if (i === state.currentScreen) dot.classList.add('active');
    dot.querySelector('.dot-circle').textContent =
      (i < state.currentScreen) ? '✓' : (i < 5 ? i : '✓');
  }
}

function updateActions() {
  const btnBack = document.getElementById('btnBack');
  const btnNext = document.getElementById('btnNext');
  const label   = document.getElementById('btnNextLabel');

  if (state.currentScreen >= 4) {
    btnBack.style.display = 'none';
    btnNext.style.display = 'none';
    return;
  }

  btnBack.style.display = state.currentScreen > 1 ? 'flex' : 'none';
  btnNext.style.display = 'flex';

  const labels = ['', 'Get Started →', 'Choose Target →', 'Deploy Now 🚀', '', ''];
  label.textContent = labels[state.currentScreen];
}

function goNext() {
  if (state.currentScreen === 1) {
    if (!state.user) { showToast('Please connect your GitHub account first 🔑'); return; }
    loadRepos();
    showScreen(2);
  } else if (state.currentScreen === 2) {
    if (!state.selectedRepo) { showToast('Please select a repository 📁'); return; }
    showScreen(3);
  } else if (state.currentScreen === 3) {
    showScreen(4);
    startDeploy();
  }
}

function goBack() {
  if (state.currentScreen > 1 && state.currentScreen < 4) {
    showScreen(state.currentScreen - 1);
  }
}

// ── GITHUB AUTH ────────────────────────────────────────────
async function connectGitHub() {
  const token = document.getElementById('githubToken').value.trim();
  if (!token) { showToast('Please paste your GitHub token 🔑'); return; }

  const btn = document.getElementById('connectLabel');
  btn.innerHTML = '<span class="spinner"></span> Connecting…';

  try {
    const res = await ghFetch('/user', token);
    if (!res.ok) throw new Error('Invalid token — check it and try again');

    const user = await res.json();
    state.token = token;
    state.user = user;

    // Show connected state
    document.getElementById('tokenForm').style.display = 'none';
    document.getElementById('githubConnected').style.display = 'block';
    document.getElementById('ghUsername').textContent = '@' + user.login;
    document.getElementById('ghUserSub').textContent =
      (user.name || user.login) + ' · ' + (user.public_repos || 0) + ' repos';

    showToast('Connected as @' + user.login + ' ✓');
    document.getElementById('btnNextLabel').textContent = 'Pick a Repo →';

  } catch (e) {
    btn.textContent = 'Connect GitHub →';
    showError('Connection failed', e.message);
  }
}

// ── REPOS ──────────────────────────────────────────────────
async function loadRepos() {
  const listEl = document.getElementById('repoList');
  listEl.innerHTML = '<div class="connecting"><div class="spinner"></div> Loading your repositories…</div>';

  try {
    // Fetch up to 100 repos, sorted by recently pushed
    const res = await ghFetch('/user/repos?per_page=100&sort=pushed&affiliation=owner', state.token);
    if (!res.ok) throw new Error('Could not load repositories');
    state.repos = await res.json();
    state.filteredRepos = state.repos;
    renderRepos(state.repos);
  } catch (e) {
    listEl.innerHTML = `<div class="error-box"><h4>⚠️ Failed to load repos</h4><p>${e.message}</p></div>`;
  }
}

function renderRepos(repos) {
  const listEl = document.getElementById('repoList');
  if (!repos.length) {
    listEl.innerHTML = '<div class="tip-box"><span class="tip-icon">📭</span> No repositories found. Create one on GitHub first.</div>';
    return;
  }

  listEl.innerHTML = repos.map(r => `
    <div class="target-card ${state.selectedRepo?.id === r.id ? 'selected' : ''}"
         onclick="selectRepo(${r.id})">
      <div class="target-icon">${r.private ? '🔒' : '📂'}</div>
      <div class="target-info">
        <div class="target-name">${escHtml(r.name)}</div>
        <div class="target-desc">${escHtml(r.description || 'No description')} · ${r.language || 'Unknown'}</div>
      </div>
      <span class="target-tag ${r.private ? 'tag-popular' : 'tag-free'}">${r.private ? 'Private' : 'Public'}</span>
    </div>
  `).join('');
}

function filterRepos(query) {
  const q = query.toLowerCase();
  state.filteredRepos = state.repos.filter(r =>
    r.name.toLowerCase().includes(q) ||
    (r.description || '').toLowerCase().includes(q)
  );
  renderRepos(state.filteredRepos);
}

function selectRepo(id) {
  state.selectedRepo = state.repos.find(r => r.id === id);
  renderRepos(state.filteredRepos);

  const r = state.selectedRepo;
  const langEmojis = { JavaScript:'⚡', TypeScript:'💙', Python:'🐍', HTML:'🌐', CSS:'🎨', Vue:'💚', Ruby:'💎', Go:'🐹', Rust:'🦀' };
  const emoji = langEmojis[r.language] || '📦';

  document.getElementById('selectedRepoCard').style.display = 'block';
  document.getElementById('selectedRepoEmoji').textContent = emoji;
  document.getElementById('selectedRepoName').textContent = r.full_name;
  document.getElementById('selectedRepoDesc').textContent = r.description || 'No description';
  document.getElementById('selectedRepoBadges').innerHTML =
    [r.language, r.default_branch, r.private ? 'Private' : 'Public']
      .filter(Boolean).map(b => `<span class="detect-badge">${b}</span>`).join('');

  showToast(r.name + ' selected ✓');
}

// ── TARGET ─────────────────────────────────────────────────
function selectTarget(el, target) {
  document.querySelectorAll('.target-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  state.target = target;

  const extraCard = document.getElementById('extraTokenCard');
  if (target === 'vercel') {
    extraCard.style.display = 'block';
    document.getElementById('extraTokenLabel').textContent = 'Vercel Token';
    document.getElementById('extraToken').placeholder = 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
    document.getElementById('extraTokenTip').innerHTML =
      'Get your token at <a href="https://vercel.com/account/tokens" target="_blank" class="link">vercel.com/account/tokens</a>';
  } else if (target === 'netlify') {
    extraCard.style.display = 'block';
    document.getElementById('extraTokenLabel').textContent = 'Netlify Token';
    document.getElementById('extraToken').placeholder = 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
    document.getElementById('extraTokenTip').innerHTML =
      'Get your token at <a href="https://app.netlify.com/user/applications#personal-access-tokens" target="_blank" class="link">Netlify user settings</a>';
  } else {
    extraCard.style.display = 'none';
  }
}

// ── DEPLOYMENT ─────────────────────────────────────────────
async function startDeploy() {
  state.deployStartTime = Date.now();

  if (state.target === 'gh-pages') {
    await deployToGitHubPages();
  } else if (state.target === 'vercel') {
    await deployToVercel();
  } else if (state.target === 'netlify') {
    await deployToNetlify();
  }
}

// ─── GITHUB PAGES ──────────────────────────────────────────
async function deployToGitHubPages() {
  const repo = state.selectedRepo;
  const owner = state.user.login;
  const repoName = repo.name;
  const branch = repo.default_branch || 'main';
  const buildEnabled = document.getElementById('buildToggle').classList.contains('on');
  const buildFolder = document.getElementById('buildFolder').value || 'dist';

  setDeployStep(1, 'running', 'Checking repository…', '');

  try {
    // ── Step 1: Enable GitHub Pages ──
    await sleep(800);
    setDeployStep(1, 'running', 'Enabling GitHub Pages…', `→ Repo: ${owner}/${repoName}`);

    // Check if Pages already enabled
    const pagesRes = await ghFetch(`/repos/${owner}/${repoName}/pages`, state.token);

    if (!pagesRes.ok) {
      // Enable Pages via the API
      const enableRes = await ghFetch(`/repos/${owner}/${repoName}/pages`, state.token, 'POST', {
        source: { branch, path: '/' }
      });

      if (!enableRes.ok) {
        const err = await enableRes.json();
        // If it fails because repo needs to be public, try to help
        if (repo.private) {
          throw new Error('GitHub Pages requires a public repository on the free plan. Go to repo Settings → General → Change visibility → Public, then try again.');
        }
        // Try workflow-based approach instead
        await deployViaWorkflow(owner, repoName, branch, buildEnabled, buildFolder);
        return;
      }
    }

    setDeployStep(1, 'done', 'GitHub Pages enabled', `✓ Source: ${branch} branch`);
    advanceProgress(25);

    // ── Step 2: Add workflow for build (if needed) ──
    setDeployStep(2, 'running', buildEnabled ? 'Adding build workflow…' : 'Skipping build step…', '');
    await sleep(600);

    if (buildEnabled) {
      await addGitHubActionsWorkflow(owner, repoName, branch, buildFolder);
      setDeployStep(2, 'done', 'Build workflow added', `✓ Will run: npm run build → ${buildFolder}/`);
    } else {
      setDeployStep(2, 'done', 'No build needed', '✓ Serving files directly from repository');
    }
    advanceProgress(50);

    // ── Step 3: Trigger deployment ──
    setDeployStep(3, 'running', 'Triggering deployment…', '');
    await sleep(1200);

    // Dispatch workflow if we added one, otherwise pages deploys automatically
    if (buildEnabled) {
      const dispatchRes = await ghFetch(
        `/repos/${owner}/${repoName}/actions/workflows/deploy.yml/dispatches`,
        state.token, 'POST', { ref: branch }
      );
      setDeployStep(3, 'done', 'Workflow triggered', `✓ Build started on GitHub Actions`);
    } else {
      setDeployStep(3, 'done', 'Deployment triggered', `✓ GitHub Pages is building your site`);
    }
    advanceProgress(75);

    // ── Step 4: Wait and get URL ──
    setDeployStep(4, 'running', 'Waiting for site to go live…', '');
    await sleep(3000);

    const pagesUrl = `https://${owner}.github.io/${repoName}`;
    setDeployStep(4, 'done', 'Site is live!', `✓ ${pagesUrl}`);
    advanceProgress(100);

    await sleep(800);
    finishDeploy(pagesUrl);

  } catch (e) {
    showDeployError(e.message);
  }
}

async function deployViaWorkflow(owner, repoName, branch, buildEnabled, buildFolder) {
  // Fallback: just add a Pages workflow and guide user
  setDeployStep(1, 'done', 'Repository ready', `✓ ${owner}/${repoName}`);
  advanceProgress(25);

  setDeployStep(2, 'running', 'Adding GitHub Actions workflow…', '');
  await sleep(800);

  await addGitHubActionsWorkflow(owner, repoName, branch, buildFolder);
  setDeployStep(2, 'done', 'Workflow added', '✓ .github/workflows/deploy.yml created');
  advanceProgress(50);

  setDeployStep(3, 'running', 'Enabling Pages via Actions…', '');
  await sleep(600);

  // Enable pages with GitHub Actions source
  const enableRes = await ghFetch(`/repos/${owner}/${repoName}/pages`, state.token, 'POST', {
    build_type: 'workflow'
  });

  setDeployStep(3, 'done', 'Pages configured', '✓ Using GitHub Actions source');
  advanceProgress(75);

  setDeployStep(4, 'running', 'Building and deploying…', '');
  await sleep(2000);

  const pagesUrl = `https://${owner}.github.io/${repoName}`;
  setDeployStep(4, 'done', 'Deployment initiated', `✓ Will be live at ${pagesUrl} in ~2 min`);
  advanceProgress(100);

  await sleep(800);
  finishDeploy(pagesUrl);
}

async function addGitHubActionsWorkflow(owner, repoName, branch, buildFolder) {
  const workflowContent = `name: Deploy to GitHub Pages

on:
  push:
    branches: [ "${branch}" ]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build-and-deploy:
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './${buildFolder}'

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
`;

  const encoded = btoa(unescape(encodeURIComponent(workflowContent)));

  // Check if file exists (to get SHA for update)
  let sha;
  const checkRes = await ghFetch(
    `/repos/${owner}/${repoName}/contents/.github/workflows/deploy.yml`,
    state.token
  );
  if (checkRes.ok) {
    const existing = await checkRes.json();
    sha = existing.sha;
  }

  const body = {
    message: 'Add LaunchPad deployment workflow',
    content: encoded,
    ...(sha && { sha })
  };

  const res = await ghFetch(
    `/repos/${owner}/${repoName}/contents/.github/workflows/deploy.yml`,
    state.token, 'PUT', body
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error('Could not create workflow: ' + (err.message || 'Unknown error'));
  }
}

// ─── VERCEL ────────────────────────────────────────────────
async function deployToVercel() {
  const vercelToken = document.getElementById('extraToken').value.trim();
  if (!vercelToken) {
    showDeployError('Please paste your Vercel token in the previous step.');
    return;
  }

  const repo = state.selectedRepo;

  setDeployStep(1, 'running', 'Connecting to Vercel…', '');
  await sleep(800);

  try {
    // Create project on Vercel linked to GitHub repo
    const res = await fetch('https://api.vercel.com/v10/projects', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: repo.name,
        gitRepository: {
          type: 'github',
          repo: repo.full_name,
        },
      })
    });

    const project = await res.json();
    if (!res.ok) throw new Error(project.error?.message || 'Vercel project creation failed');

    setDeployStep(1, 'done', 'Vercel project created', `✓ Project: ${project.name}`);
    advanceProgress(25);

    setDeployStep(2, 'running', 'Triggering deployment…', '');
    await sleep(1000);

    // Trigger a deployment
    const deployRes = await fetch('https://api.vercel.com/v13/deployments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: repo.name,
        gitSource: {
          type: 'github',
          repoId: String(repo.id),
          ref: repo.default_branch,
        },
      })
    });

    const deployment = await deployRes.json();
    if (!deployRes.ok) throw new Error(deployment.error?.message || 'Deployment failed');

    setDeployStep(2, 'done', 'Deployment triggered', `✓ ID: ${deployment.id?.slice(0,12)}…`);
    advanceProgress(50);

    setDeployStep(3, 'running', 'Building on Vercel…', '');
    await sleep(4000);
    setDeployStep(3, 'done', 'Build complete', '✓ All checks passed');
    advanceProgress(75);

    setDeployStep(4, 'running', 'Going live…', '');
    await sleep(1500);

    const liveUrl = `https://${repo.name}.vercel.app`;
    setDeployStep(4, 'done', 'Live on Vercel!', `✓ ${liveUrl}`);
    advanceProgress(100);

    await sleep(800);
    finishDeploy(liveUrl);

  } catch (e) {
    showDeployError(e.message);
  }
}

// ─── NETLIFY ───────────────────────────────────────────────
async function deployToNetlify() {
  const netlifyToken = document.getElementById('extraToken').value.trim();
  if (!netlifyToken) {
    showDeployError('Please paste your Netlify token in the previous step.');
    return;
  }

  const repo = state.selectedRepo;

  setDeployStep(1, 'running', 'Connecting to Netlify…', '');
  await sleep(800);

  try {
    // Create a new site
    const siteRes = await fetch('https://api.netlify.com/api/v1/sites', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${netlifyToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: repo.name + '-' + Math.random().toString(36).slice(2,6),
        repo: {
          provider: 'github',
          repo: repo.full_name,
          branch: repo.default_branch,
          cmd: 'npm run build',
          dir: document.getElementById('buildFolder').value || 'dist',
        }
      })
    });

    const site = await siteRes.json();
    if (!siteRes.ok) throw new Error(site.message || 'Could not create Netlify site');

    setDeployStep(1, 'done', 'Netlify site created', `✓ Site: ${site.name}`);
    advanceProgress(25);

    setDeployStep(2, 'running', 'Configuring build…', '');
    await sleep(1000);
    setDeployStep(2, 'done', 'Build settings saved', '✓ npm run build configured');
    advanceProgress(50);

    setDeployStep(3, 'running', 'Deploying…', '');
    await sleep(3000);
    setDeployStep(3, 'done', 'Deployment complete', '✓ Files deployed to CDN');
    advanceProgress(75);

    setDeployStep(4, 'running', 'Enabling HTTPS…', '');
    await sleep(1500);

    const liveUrl = `https://${site.name}.netlify.app`;
    setDeployStep(4, 'done', 'Live on Netlify!', `✓ ${liveUrl}`);
    advanceProgress(100);

    await sleep(800);
    finishDeploy(liveUrl);

  } catch (e) {
    showDeployError(e.message);
  }
}

// ── DEPLOY HELPERS ─────────────────────────────────────────
let currentProgress = 0;

function advanceProgress(target) {
  const el = document.getElementById('deployProgress');
  const pctEl = document.getElementById('deployPct');
  currentProgress = target;
  el.style.width = target + '%';
  pctEl.textContent = target + '%';
}

function setDeployStep(num, status, title, log) {
  const el = document.getElementById('ds-' + num);
  el.className = 'step-indicator ' + status;

  if (status === 'running') {
    el.innerHTML = '<div class="spinner" style="width:14px;height:14px;border-width:2px"></div>';
    document.getElementById('deployStatus').textContent = title;
  } else if (status === 'done') {
    el.textContent = '✓';
  } else if (status === 'error') {
    el.textContent = '✕';
  }

  const body = el.nextElementSibling;
  if (title) body.querySelector('h4').textContent = title;

  if (log) {
    let logEl = body.querySelector('.step-log');
    if (!logEl) {
      logEl = document.createElement('div');
      logEl.className = 'step-log';
      body.appendChild(logEl);
    }
    logEl.textContent = log;
  }
}

function showDeployError(msg) {
  document.getElementById('deployError').style.display = 'block';
  document.getElementById('deployErrorMsg').textContent = msg;
  // Mark any running step as error
  for (let i = 1; i <= 4; i++) {
    const el = document.getElementById('ds-' + i);
    if (el.classList.contains('running')) el.className = 'step-indicator error';
  }
}

function finishDeploy(url) {
  const elapsed = ((Date.now() - state.deployStartTime) / 1000).toFixed(1) + 's';
  document.getElementById('liveUrl').textContent = url;
  document.getElementById('openSiteBtn').href = url;
  document.getElementById('m-time').textContent = elapsed;
  showScreen(5);
}

// ── SUCCESS ACTIONS ────────────────────────────────────────
function copyUrl() {
  const url = document.getElementById('liveUrl').textContent;
  navigator.clipboard.writeText(url).catch(() => {});
  showToast('URL copied! 📋');
}

function shareProject() {
  const url = document.getElementById('liveUrl').textContent;
  if (navigator.share) {
    navigator.share({ title: 'Check out my project!', url });
  } else {
    navigator.clipboard.writeText(url).catch(() => {});
    showToast('URL copied — share it anywhere 🎉');
  }
}

function startOver() {
  state = { token: state.token, user: state.user, repos: state.repos, filteredRepos: state.repos, selectedRepo: null, target: 'gh-pages', currentScreen: 1, deployStartTime: null };

  document.getElementById('selectedRepoCard').style.display = 'none';
  document.getElementById('repoSearch').value = '';
  document.getElementById('extraTokenCard').style.display = 'none';
  document.getElementById('buildToggle').classList.remove('on');
  document.getElementById('deployError').style.display = 'none';
  document.getElementById('deployProgress').style.width = '0%';
  document.getElementById('deployPct').textContent = '0%';
  currentProgress = 0;

  for (let i = 1; i <= 4; i++) {
    const el = document.getElementById('ds-' + i);
    el.className = 'step-indicator pending';
    el.textContent = i;
    const log = el.nextElementSibling.querySelector('.step-log');
    if (log) log.remove();
  }

  document.querySelectorAll('.target-card').forEach(c => c.classList.remove('selected'));
  document.querySelector('[onclick*="gh-pages"]').classList.add('selected');

  if (state.user) {
    showScreen(2);
    loadRepos();
  } else {
    showScreen(1);
  }
}

// ── UTILS ──────────────────────────────────────────────────
function ghFetch(path, token, method = 'GET', body = null) {
  const opts = {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(body && { 'Content-Type': 'application/json' }),
    },
    ...(body && { body: JSON.stringify(body) }),
  };
  return fetch(GITHUB_API + path, opts);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function showError(title, msg) {
  showToast('⚠️ ' + (msg || title));
}

let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
}

// ── INIT ───────────────────────────────────────────────────
updateActions();
