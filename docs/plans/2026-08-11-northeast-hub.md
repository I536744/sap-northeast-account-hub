# Northeast Account Hub — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy a Northeast Account Hub to the `na-maxattention-innovation` BTP tenant — a splash page that lists all northeast accounts and links to each account's own standardized OneSAP dashboard.

**Architecture:** Each account runs as an independent CF app + PostgreSQL (same proven pattern as IBM). A new lightweight static splash app serves as the entry point, linking to each account's dashboard URL. The existing `ibm-dashboard` codebase is the template for each account deployment. The new BTP subaccount (`59d8daf9-4645-4f07-9614-e63e714725f7`) hosts all apps.

**Tech Stack:** Python/Flask + PostgreSQL + XSUAA approuter (per account), staticfile buildpack (splash), SAP BTP Cloud Foundry (AMER/us10)

---

## File Structure

```
/Users/I536744/claudefolder/
  northeast-splash/          ← NEW: static splash landing page
    index.html               ← account picker UI
    customers.json           ← list of all northeast account metadata
    manifest.yml             ← CF manifest (staticfile buildpack)
    Staticfile               ← tells CF to serve static files

  northeast-hub-ibm/         ← NEW: IBM account in new tenant (copy of ibm-dashboard)
    app.py                   ← unchanged from ibm-dashboard
    generate_dashboard.py    ← unchanged
    db.py                    ← unchanged
    customer.json            ← updated: dashboard_url for new tenant
    manifest.yml             ← updated: new app name, new tenant org/space, new services
    manifest-dev.yml         ← updated: new dev app name
    approuter/
      manifest.yml           ← updated: new approuter app name + destination URL
      xs-app.json            ← unchanged
    xs-security.json         ← updated: new xsappname
    CLAUDE.md                ← updated: new tenant CF target + app URLs
    requirements.txt         ← unchanged (copy)
    Procfile                 ← unchanged (copy)
    runtime.txt              ← unchanged (copy)
    seed.py                  ← unchanged (copy)
    seed_csm.py              ← unchanged (copy)
```

---

## Task 1: Get new tenant CF credentials

**Files:** none (discovery only)

- [ ] **Step 1: Open BTP cockpit and find the CF org/space**

  In the BTP cockpit, navigate to:
  `https://amer.cockpit.btp.cloud.sap/cockpit#/globalaccount/na-maxattention-innovation/subaccount/59d8daf9-4645-4f07-9614-e63e714725f7/subaccountoverview`

  Click "Cloud Foundry" in the left nav. Note the **API endpoint**, **Org name**, and **Space name**. These go into the manifests below.

  Common AMER endpoints: `https://api.cf.us10.hana.ondemand.com` or `https://api.cf.us10-001.hana.ondemand.com`

- [ ] **Step 2: Log in to new tenant CF**

  ```bash
  cf login -a <API_ENDPOINT> -o <ORG_NAME> -s <SPACE_NAME>
  ```

  Verify you're in the right org/space:
  ```bash
  cf target
  ```
  Expected output shows the new subaccount org + space, NOT `ibm-onesap-org`.

---

## Task 2: Create the northeast splash page

**Files:**
- Create: `/Users/I536744/claudefolder/northeast-splash/Staticfile`
- Create: `/Users/I536744/claudefolder/northeast-splash/customers.json`
- Create: `/Users/I536744/claudefolder/northeast-splash/index.html`
- Create: `/Users/I536744/claudefolder/northeast-splash/manifest.yml`

- [ ] **Step 1: Create the project directory**

  ```bash
  mkdir -p /Users/I536744/claudefolder/northeast-splash
  cd /Users/I536744/claudefolder/northeast-splash
  git init
  ```

- [ ] **Step 2: Create `Staticfile`**

  Create `/Users/I536744/claudefolder/northeast-splash/Staticfile` with content:
  ```
  root: .
  directory: false
  ```

- [ ] **Step 3: Create `customers.json`**

  Create `/Users/I536744/claudefolder/northeast-splash/customers.json`:
  ```json
  [
    {
      "slug": "ibm",
      "name": "IBM",
      "subtitle": "OneSAP at IBM",
      "url": "https://ne-ibm-onesap.cfapps.us10.hana.ondemand.com",
      "accent": "#0057D2",
      "industry": "Technology",
      "region": "Northeast"
    }
  ]
  ```
  Add additional northeast accounts here as they are deployed. Each entry needs `slug`, `name`, `subtitle`, `url`, `accent`, `industry`, `region`.

- [ ] **Step 4: Create `index.html`**

  Create `/Users/I536744/claudefolder/northeast-splash/index.html`:
  ```html
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>SAP MaxAttention — Northeast Accounts</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: "72", "SAP72", Arial, sans-serif; background: #F5F6F7; color: #1D2D3E; min-height: 100vh; }
      header { background: #1D2D3E; color: #fff; padding: 0 32px; height: 56px; display: flex; align-items: center; justify-content: space-between; }
      header h1 { font-size: 1rem; font-weight: 600; letter-spacing: .02em; }
      header span { font-size: .8rem; opacity: .6; }
      .hero { background: #fff; border-bottom: 1px solid #D9DBDD; padding: 40px 32px 32px; }
      .hero h2 { font-size: 1.6rem; font-weight: 700; color: #0054A6; margin-bottom: 6px; }
      .hero p { color: #556B82; font-size: .95rem; }
      .search-wrap { padding: 24px 32px 0; }
      #search { width: 100%; max-width: 480px; padding: 10px 16px; border: 1px solid #C0C2C4; border-radius: 6px; font-size: 1rem; outline: none; }
      #search:focus { border-color: #0054A6; box-shadow: 0 0 0 2px rgba(0,84,166,.15); }
      .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; padding: 24px 32px 48px; }
      .card { background: #fff; border-radius: 8px; box-shadow: 0 1px 4px rgba(0,0,0,.08); border-top: 4px solid var(--accent); overflow: hidden; transition: box-shadow .15s; }
      .card:hover { box-shadow: 0 4px 16px rgba(0,0,0,.13); }
      .card-body { padding: 20px 20px 16px; }
      .card-name { font-size: 1.1rem; font-weight: 700; color: #1D2D3E; margin-bottom: 4px; }
      .card-sub { font-size: .82rem; color: #556B82; margin-bottom: 12px; }
      .card-meta { font-size: .78rem; color: #8A9BB0; margin-bottom: 16px; }
      .card-link { display: inline-block; background: var(--accent); color: #fff; padding: 7px 18px; border-radius: 4px; font-size: .85rem; font-weight: 600; text-decoration: none; transition: opacity .15s; }
      .card-link:hover { opacity: .85; }
      .no-results { padding: 40px 32px; color: #8A9BB0; font-size: .95rem; }
    </style>
  </head>
  <body>
    <header>
      <h1>SAP MaxAttention — Northeast</h1>
      <span>Account Hub</span>
    </header>
    <div class="hero">
      <h2>Northeast Accounts</h2>
      <p>Select an account to open its OneSAP dashboard.</p>
    </div>
    <div class="search-wrap">
      <input id="search" type="text" placeholder="Search accounts…" oninput="filter(this.value)">
    </div>
    <div id="grid" class="grid"></div>
    <div id="no-results" class="no-results" style="display:none">No accounts match your search.</div>

    <script>
      let customers = [];

      fetch('./customers.json')
        .then(r => r.json())
        .then(data => { customers = data; render(customers); });

      function render(list) {
        const grid = document.getElementById('grid');
        const none = document.getElementById('no-results');
        if (!list.length) { grid.innerHTML = ''; none.style.display = ''; return; }
        none.style.display = 'none';
        grid.innerHTML = list.map(c => `
          <div class="card" style="--accent:${c.accent}">
            <div class="card-body">
              <div class="card-name">${c.name}</div>
              <div class="card-sub">${c.subtitle}</div>
              <div class="card-meta">${c.industry} &middot; ${c.region}</div>
              <a class="card-link" href="${c.url}" target="_blank">Open Dashboard &rarr;</a>
            </div>
          </div>`).join('');
      }

      function filter(q) {
        const lower = q.toLowerCase();
        render(customers.filter(c =>
          c.name.toLowerCase().includes(lower) ||
          c.subtitle.toLowerCase().includes(lower) ||
          c.industry.toLowerCase().includes(lower)
        ));
      }
    </script>
  </body>
  </html>
  ```

- [ ] **Step 5: Create `manifest.yml`**

  Create `/Users/I536744/claudefolder/northeast-splash/manifest.yml`:
  ```yaml
  ---
  applications:
    - name: ne-onesap-hub
      memory: 64M
      disk_quota: 128M
      instances: 1
      buildpacks:
        - staticfile_buildpack
      routes:
        - route: ne-onesap-hub.cfapps.us10.hana.ondemand.com
  ```
  > Adjust the route domain if the new tenant's CF endpoint is `us10-001` or another region.

- [ ] **Step 6: Deploy splash app**

  Make sure you're still logged in to the new tenant CF space (from Task 1).
  ```bash
  cd /Users/I536744/claudefolder/northeast-splash
  cf push
  ```
  Expected: app starts, route resolves, `https://ne-onesap-hub.cfapps.us10.hana.ondemand.com` shows the splash page.

- [ ] **Step 7: Smoke test the splash page**

  Open `https://ne-onesap-hub.cfapps.us10.hana.ondemand.com` in a browser.
  Expected: header shows "SAP MaxAttention — Northeast", account grid is empty (IBM card missing until Task 3 is done). Search box is visible.

- [ ] **Step 8: Commit**

  ```bash
  cd /Users/I536744/claudefolder/northeast-splash
  git add .
  git commit -m "feat: add northeast accounts splash page"
  ```

---

## Task 3: Scaffold the IBM account app for the new tenant

**Files:**
- Create: `/Users/I536744/claudefolder/northeast-hub-ibm/` (copy from ibm-dashboard)

- [ ] **Step 1: Copy ibm-dashboard to new directory**

  ```bash
  cp -r /Users/I536744/claudefolder/ibm-dashboard /Users/I536744/claudefolder/northeast-hub-ibm
  cd /Users/I536744/claudefolder/northeast-hub-ibm
  ```

- [ ] **Step 2: Remove IBM-specific data files (not needed in new deployment)**

  ```bash
  rm -f "IBM North Castle Logistics (2).pdf" "IBM Poughkeepsie Logistics.pdf" \
        "IBM Raleigh Logistics - IBM 502 (4).pdf" "IBM OneSAP Dashboard v2.html" \
        "IBM Program with RAID.xlsx" "CSM Contacts and Cadences.xlsx" \
        "Service_Plan_2026 (2).xlsx" "ibm_onesap_dashboard_deck.pptx" \
        OneDrive_2026-07-08.zip agent.log server.log
  ```

- [ ] **Step 3: Re-initialize git (fresh history for new project)**

  ```bash
  rm -rf .git
  git init
  git add .
  git commit -m "init: northeast-hub-ibm scaffold from ibm-dashboard"
  ```

---

## Task 4: Update manifests for new tenant

**Files:**
- Modify: `/Users/I536744/claudefolder/northeast-hub-ibm/manifest.yml`
- Modify: `/Users/I536744/claudefolder/northeast-hub-ibm/manifest-dev.yml`
- Modify: `/Users/I536744/claudefolder/northeast-hub-ibm/approuter/manifest.yml`
- Modify: `/Users/I536744/claudefolder/northeast-hub-ibm/xs-security.json`
- Modify: `/Users/I536744/claudefolder/northeast-hub-ibm/customer.json`
- Modify: `/Users/I536744/claudefolder/northeast-hub-ibm/CLAUDE.md`

- [ ] **Step 1: Update `manifest.yml`**

  Replace the entire content of `manifest.yml`:
  ```yaml
  ---
  # CF target: cf login -a <NEW_TENANT_CF_API> -o <NEW_ORG> -s <NEW_SPACE>
  applications:
    - name: ne-ibm-onesap-dashboard
      memory: 256M
      disk_quota: 1G
      instances: 1
      buildpacks:
        - python_buildpack
      command: gunicorn app:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120 --preload
      health-check-type: http
      health-check-http-endpoint: /api/ready
      timeout: 120
      routes:
        - route: ne-ibm-onesap-dashboard.cfapps.us10.hana.ondemand.com
      env:
        LOG_LEVEL: "INFO"
        FLASK_ENV: "production"
        APP_VERSION: "v1.0.0"
      services:
        - ne-ibm-postgres
        - ne-ibm-uaa
  ```

- [ ] **Step 2: Update `manifest-dev.yml`**

  Replace the entire content of `manifest-dev.yml`:
  ```yaml
  ---
  # CF target: cf login -a <NEW_TENANT_CF_API> -o <NEW_ORG> -s <NEW_SPACE>
  applications:
    - name: ne-ibm-onesap-dashboard-dev
      memory: 256M
      disk_quota: 1G
      instances: 1
      buildpacks:
        - python_buildpack
      command: gunicorn app:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120 --preload
      health-check-type: http
      health-check-http-endpoint: /api/ready
      timeout: 120
      routes:
        - route: ne-ibm-onesap-dashboard-dev.cfapps.us10.hana.ondemand.com
      env:
        LOG_LEVEL: "DEBUG"
        FLASK_ENV: "development"
        APP_VERSION: "v1.0.0-dev"
      services:
        - ne-ibm-postgres
        - ne-ibm-uaa
  ```

- [ ] **Step 3: Update `approuter/manifest.yml`**

  Replace the entire content of `approuter/manifest.yml`:
  ```yaml
  ---
  applications:
    - name: ne-ibm-onesap-app
      memory: 256M
      disk_quota: 512M
      instances: 1
      buildpacks:
        - nodejs_buildpack
      command: node node_modules/@sap/approuter/approuter.js
      health-check-type: http
      health-check-http-endpoint: /health
      routes:
        - route: ne-ibm-onesap.cfapps.us10.hana.ondemand.com
      services:
        - ne-ibm-uaa
      env:
        destinations: >
          [{"name":"ibm-onesap-backend",
            "url":"https://ne-ibm-onesap-dashboard.cfapps.us10.hana.ondemand.com",
            "forwardAuthToken":true}]
  ```

- [ ] **Step 4: Update `xs-security.json`**

  Replace the entire content of `xs-security.json`:
  ```json
  {
    "xsappname": "ne-ibm-onesap",
    "tenant-mode": "dedicated",
    "scopes": [
      { "name": "$XSAPPNAME.Viewer", "description": "View dashboard" },
      { "name": "$XSAPPNAME.Editor", "description": "Edit dashboard data" }
    ],
    "role-templates": [
      { "name": "Viewer",  "description": "Read-only access",  "scope-references": ["$XSAPPNAME.Viewer"] },
      { "name": "Editor",  "description": "Edit access",       "scope-references": ["$XSAPPNAME.Viewer", "$XSAPPNAME.Editor"] }
    ],
    "role-collections": [
      { "name": "ne-ibm-onesap-Viewer", "description": "View IBM OneSAP dashboard",
        "role-template-references": ["$XSAPPNAME.Viewer"] },
      { "name": "ne-ibm-onesap-Editor", "description": "Edit IBM OneSAP dashboard",
        "role-template-references": ["$XSAPPNAME.Editor"] }
    ]
  }
  ```

- [ ] **Step 5: Update `customer.json`**

  Replace the content of `customer.json`:
  ```json
  {
    "name": "IBM",
    "short_name": "ibm",
    "title": "OneSAP at IBM — Account Level Dashboard",
    "logo": "sap-ibm-logo.png",
    "admin_emails": ["alexandra.coyle@sap.com", "luke.joseph@sap.com"],
    "export_prefix": "IBM_OneSAP",
    "accent_color": "#0057D2",
    "dashboard_url": "https://ne-ibm-onesap.cfapps.us10.hana.ondemand.com"
  }
  ```

- [ ] **Step 6: Update `CLAUDE.md`**

  Replace the CF target line and app URLs:
  ```markdown
  # IBM OneSAP Dashboard — Northeast Hub

  ## App overview
  Flask + PostgreSQL dashboard deployed on SAP BTP Cloud Foundry (na-maxattention-innovation tenant).
  - **Prod app:** `ne-ibm-onesap-dashboard` → `https://ne-ibm-onesap-dashboard.cfapps.us10.hana.ondemand.com`
  - **Approuter:** `ne-ibm-onesap-app` → `https://ne-ibm-onesap.cfapps.us10.hana.ondemand.com`
  - **Dev app:**  `ne-ibm-onesap-dashboard-dev` → `https://ne-ibm-onesap-dashboard-dev.cfapps.us10.hana.ondemand.com`
  - **CF target:** `cf login -a <NEW_CF_API> -o <NEW_ORG> -s <NEW_SPACE>`

  ## Key files
  - `app.py` — Flask app, all routes, XSUAA auth
  - `generate_dashboard.py` — all HTML/CSS/JS (2200+ lines)
  - `db.py` — PostgreSQL schema + CRUD
  - `seed.py` — one-time Excel → DB importer
  - `manifest.yml` — prod CF manifest
  - `approuter/` — XSUAA approuter
  ```

- [ ] **Step 7: Commit manifest changes**

  ```bash
  cd /Users/I536744/claudefolder/northeast-hub-ibm
  git add manifest.yml manifest-dev.yml approuter/manifest.yml xs-security.json customer.json CLAUDE.md
  git commit -m "feat: update manifests for ne-maxattention-innovation tenant"
  ```

---

## Task 5: Create BTP services in new tenant

- [ ] **Step 1: Verify CF target is the new tenant**

  ```bash
  cf target
  ```
  Must show the `na-maxattention-innovation` org, NOT `ibm-onesap-org`. If wrong, re-run the login from Task 1.

- [ ] **Step 2: Create PostgreSQL service**

  ```bash
  cf create-service postgresql-db trial ne-ibm-postgres
  ```
  > If `postgresql-db` is not the right service name in this subaccount, run `cf marketplace` and find the PostgreSQL offering. Common alternatives: `postgresql`, `hyperscaler-option`.

  Wait for the service to be ready:
  ```bash
  cf service ne-ibm-postgres
  ```
  Expected: `status: create succeeded`

- [ ] **Step 3: Create XSUAA service**

  ```bash
  cd /Users/I536744/claudefolder/northeast-hub-ibm
  cf create-service xsuaa application ne-ibm-uaa -c xs-security.json
  ```
  Expected: `Creating service instance ne-ibm-uaa... OK`

- [ ] **Step 4: Verify both services exist**

  ```bash
  cf services
  ```
  Expected output includes rows for `ne-ibm-postgres` and `ne-ibm-uaa`, both `create succeeded`.

---

## Task 6: Deploy the IBM account app

- [ ] **Step 1: Deploy the backend (Flask app)**

  ```bash
  cd /Users/I536744/claudefolder/northeast-hub-ibm
  cf push -f manifest.yml
  ```
  Expected: app starts, health check at `/api/ready` passes.

- [ ] **Step 2: Verify backend is healthy**

  ```bash
  cf app ne-ibm-onesap-dashboard
  ```
  Expected: `running` state, 1/1 instances up.

  Check the health endpoint:
  ```bash
  curl https://ne-ibm-onesap-dashboard.cfapps.us10.hana.ondemand.com/api/ready
  ```
  Expected: `{"status": "ok", ...}`

- [ ] **Step 3: Deploy the approuter**

  ```bash
  cd /Users/I536744/claudefolder/northeast-hub-ibm/approuter
  cf push -f manifest.yml
  ```
  Expected: `running` state, 1/1 instances up.

- [ ] **Step 4: Smoke test via approuter**

  Open `https://ne-ibm-onesap.cfapps.us10.hana.ondemand.com` in a browser.
  Expected: XSUAA login page → after login, dashboard loads (empty data until seeded).

- [ ] **Step 5: Initialize DB schema**

  The schema initializes automatically on first request. Confirm by checking logs:
  ```bash
  cf logs ne-ibm-onesap-dashboard --recent | grep "schema"
  ```
  Expected: `DB schema initialised`

---

## Task 7: Wire splash page to IBM account + assign roles

- [ ] **Step 1: Update splash `customers.json` with the live IBM URL**

  Edit `/Users/I536744/claudefolder/northeast-splash/customers.json` — update the IBM entry's `url`:
  ```json
  [
    {
      "slug": "ibm",
      "name": "IBM",
      "subtitle": "OneSAP at IBM",
      "url": "https://ne-ibm-onesap.cfapps.us10.hana.ondemand.com",
      "accent": "#0057D2",
      "industry": "Technology",
      "region": "Northeast"
    }
  ]
  ```

- [ ] **Step 2: Redeploy splash with updated customers.json**

  ```bash
  cd /Users/I536744/claudefolder/northeast-splash
  cf push
  git add customers.json
  git commit -m "feat: add IBM as first northeast account"
  ```

- [ ] **Step 3: Assign roles in BTP cockpit**

  In the BTP cockpit for subaccount `59d8daf9-4645-4f07-9614-e63e714725f7`:
  - Go to **Security → Role Collections**
  - Assign `ne-ibm-onesap-Editor` to `alexandra.coyle@sap.com`
  - Assign `ne-ibm-onesap-Viewer` to any other northeast team members

- [ ] **Step 4: End-to-end test**

  1. Open splash: `https://ne-onesap-hub.cfapps.us10.hana.ondemand.com`
  2. Verify IBM card appears with blue accent
  3. Click "Open Dashboard" → XSUAA login → IBM dashboard loads
  4. Verify dashboard is operational (empty data is expected until seeded from Excel)

---

## Task 8: Seed IBM data into new deployment (optional, post-launch)

- [ ] **Step 1: Set DATABASE_URL for the new deployment locally**

  Get the DB credentials from CF:
  ```bash
  cf env ne-ibm-onesap-dashboard | grep -A 5 postgresql
  ```
  Copy the `uri` value from the credentials.

  ```bash
  export DATABASE_URL="<uri from cf env>"
  ```

- [ ] **Step 2: Run seed from Excel (if IBM data needs to be migrated)**

  ```bash
  cd /Users/I536744/claudefolder/northeast-hub-ibm
  python seed.py
  python seed_csm.py
  ```
  Expected: rows inserted, no errors.

---

## Adding a New Northeast Account (Runbook)

For each new account (e.g., "Merck"), repeat this pattern:

```bash
# 1. Copy the IBM template
cp -r /Users/I536744/claudefolder/northeast-hub-ibm /Users/I536744/claudefolder/northeast-hub-merck
cd /Users/I536744/claudefolder/northeast-hub-merck
rm -rf .git && git init

# 2. Edit customer.json — update name, title, accent_color, dashboard_url
# 3. Edit manifest.yml — replace all "ne-ibm-" prefixes with "ne-merck-"
# 4. Edit manifest-dev.yml — same replacements
# 5. Edit approuter/manifest.yml — same replacements
# 6. Edit xs-security.json — update xsappname to "ne-merck-onesap"

# 7. Create CF services
cf create-service postgresql-db trial ne-merck-postgres
cf create-service xsuaa application ne-merck-uaa -c xs-security.json

# 8. Deploy
cf push -f manifest.yml
cd approuter && cf push -f manifest.yml

# 9. Add to splash customers.json
# Add new entry to /Users/I536744/claudefolder/northeast-splash/customers.json
# cd northeast-splash && cf push
```
