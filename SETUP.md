# CrewOS — Setup Guide

## Live App
https://woodhavencannabis1217.github.io/CREWOS/

## Firebase (Cloud Sync)
https://crewos-og-default-rtdb.firebaseio.com/

## Setup on a New Computer

### Prerequisites
- **Node.js** (LTS) → https://nodejs.org
- **Git** → https://git-scm.com/downloads

### Clone & Install
```bash
git clone https://github.com/woodhavencannabis1217/CREWOS.git
cd CREWOS
npm install
```

### Run Locally
```bash
npm run dev
```
Open http://localhost:5173/CREWOS/

### Deploy to GitHub Pages
```bash
npm run build
npx gh-pages -d dist --no-history
```

## Version History
| Version | Commit   | Description |
|---------|----------|-------------|
| v5.0    | 8adfc93  | Calendar payroll, tax estimates, employee settings, individual alert dismiss |
| v4.0    | f4d6440  | Multi-vendor delivery tabs, photo uploads, task monitoring |
| v3      | 409d32d  | Task system overhaul, removed demo PINs |
| v2      | 44e8939  | Dropdown schedule, signature pad, vendor form |
| v1.0    | 751f34d  | Initial release |

### Roll back to a saved version
```bash
git checkout v5.0
```

## Notes
- App data (employees, schedules, clock logs) is stored in **localStorage** (per browser)
- To sync data across devices, go to **Settings → Cloud Sync** and paste the Firebase URL above
- On the computer with data: click **"Push Data to Cloud"**
- On a new device: click **"Pull Data from Cloud"**
