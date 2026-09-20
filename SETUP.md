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
  and mirrored to Firebase. Sync is **automatic**: every device pulls on load, polls for
  changes, and pushes whenever anything changes. There is nothing to click.
- **Firebase must be readable or nothing syncs.** The app sends no auth token, so the
  Realtime Database rules have to allow open read/write:
  ```json
  { "rules": { ".read": true, ".write": true } }
  ```
  Firebase test-mode rules expire after 30 days and start returning
  `401 Permission denied` — when that happens every device silently falls back to its own
  local copy, new phones boot the demo staff list, and the NFC clock stops working.
- Check the connection under **Settings → Cloud Sync → Test Connection**. If a device
  cannot reach the database, a red banner appears on the login screen and above the tabs.
- Employee PINs are stored in the database, so open rules mean the PIN list is publicly
  readable by anyone who knows the URL.

## Staff: clock in/out and schedule
1. Admin → **Staff** → Add Employee (name, 4-digit PIN, phone, role, hourly rate)
2. Admin → **Schedule** → add shifts → **✓ Submit Schedule** to publish the week
3. The employee opens the app, enters their own PIN, and gets
   **My Schedule** (their week) and **My Hours** (Clock In / Clock Out)
