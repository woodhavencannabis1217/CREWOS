import { useState, useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";

// ─── INITIAL DATA ────────────────────────────────────────────────────────────
const INITIAL_EMPLOYEES = [
  { id: "admin", name: "Admin", pin: "0000", role: "admin", rate: 0 },
  { id: "e1", name: "Adam", pin: "1111", role: "A", rate: 18 },
  { id: "e2", name: "Eva", pin: "2222", role: "B", rate: 17 },
  { id: "e3", name: "Marco", pin: "3333", role: "C", rate: 16 },
  { id: "e4", name: "Sofia", pin: "4444", role: "B", rate: 17 },
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split("T")[0];
}

function formatDate(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function addDays(iso, n) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

function calcHours(logs) {
  let total = 0;
  const sorted = [...logs].sort((a, b) => new Date(a.time) - new Date(b.time));
  let lastIn = null;
  for (const l of sorted) {
    if (l.type === "in") lastIn = new Date(l.time);
    else if (l.type === "out" && lastIn) {
      total += (new Date(l.time) - lastIn) / 3600000;
      lastIn = null;
    }
  }
  return Math.round(total * 100) / 100;
}

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

// ─── FIREBASE HELPERS ───────────────────────────────────────────────────────
async function firebasePush(dbUrl, path, data) {
  if (!dbUrl) return null;
  const cleanUrl = dbUrl.replace(/\/+$/, "");
  try {
    const res = await fetch(cleanUrl + "/" + path + ".json", { method: "POST", body: JSON.stringify(data) });
    return await res.json();
  } catch { return null; }
}

async function firebaseGet(dbUrl, path) {
  if (!dbUrl) return null;
  const cleanUrl = dbUrl.replace(/\/+$/, "");
  try {
    const res = await fetch(cleanUrl + "/" + path + ".json");
    return await res.json();
  } catch { return null; }
}

async function firebaseSet(dbUrl, path, data) {
  if (!dbUrl) return null;
  const cleanUrl = dbUrl.replace(/\/+$/, "");
  try {
    const res = await fetch(cleanUrl + "/" + path + ".json", { method: "PUT", body: JSON.stringify(data) });
    return await res.json();
  } catch { return null; }
}

// ─── STYLES (LIGHT THEME) ───────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#f5f5f7;--bg2:#ffffff;--bg3:#ffffff;--bg4:#f0f0f2;--bg5:#e8e8ec;
  --border:rgba(0,0,0,0.08);--border2:rgba(0,0,0,0.12);--border3:rgba(0,0,0,0.18);
  --text:#1a1a1a;--muted:#999;--muted2:#666;--muted3:#444;
  --green:#16a34a;--green2:#15803d;--blue:#2563eb;--amber:#d97706;--red:#dc2626;--purple:#7c3aed;--cyan:#0891b2;
  --accent:#16a34a;
  --font:'DM Sans',system-ui,sans-serif;
  --mono:'DM Mono',ui-monospace,monospace;
  font-family:var(--font);
}
body{background:var(--bg);color:var(--text);overflow-x:hidden}

/* APP SHELL */
.app{max-width:1200px;margin:0 auto;min-height:100vh;display:flex;flex-direction:column}
.topbar{background:var(--bg2);border-bottom:1px solid var(--border);padding:0 24px;height:56px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;box-shadow:0 1px 3px rgba(0,0,0,.04)}
.logo{font-size:18px;font-weight:700;letter-spacing:0.04em}
.logo span{color:var(--green)}
.logo em{color:var(--muted2);font-style:normal;font-weight:400;font-size:14px}
.topbar-right{display:flex;align-items:center;gap:16px}
.live-time{font-size:13px;font-family:var(--mono);color:var(--muted2);background:var(--bg4);padding:4px 10px;border-radius:6px;border:1px solid var(--border)}
.user-chip{display:flex;align-items:center;gap:10px;cursor:pointer;padding:4px 12px 4px 4px;border-radius:24px;transition:background .15s}
.user-chip:hover{background:var(--bg4)}
.avatar{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700}
.user-info{display:flex;flex-direction:column}
.user-name{font-size:13px;font-weight:500}
.user-role{font-size:10px;color:var(--muted2);text-transform:uppercase;letter-spacing:.05em}

/* TABS */
.tabs{background:var(--bg2);border-bottom:1px solid var(--border);display:flex;padding:0 20px;gap:2px;overflow-x:auto;position:sticky;top:56px;z-index:99}
.tab{padding:12px 16px;font-size:12px;font-weight:500;color:var(--muted2);cursor:pointer;border-bottom:2px solid transparent;white-space:nowrap;transition:all .15s;letter-spacing:0.03em;text-transform:uppercase;position:relative}
.tab:hover{color:var(--muted3)}
.tab.on{color:var(--green);border-bottom-color:var(--green)}
.tab .badge{position:absolute;top:6px;right:4px;background:var(--red);color:#fff;font-size:9px;min-width:16px;height:16px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:700}

/* BODY */
.body{padding:24px;flex:1}

/* PIN LOGIN */
.login-wrap{display:flex;align-items:center;justify-content:center;min-height:100vh;background:var(--bg)}
.login-box{width:300px;text-align:center}
.login-logo{font-size:32px;font-weight:700;margin-bottom:4px}
.login-logo span{color:var(--green)}
.login-sub{font-size:13px;color:var(--muted2);margin-bottom:32px}
.pin-dots{display:flex;gap:12px;justify-content:center;margin-bottom:24px}
.pin-dot{width:14px;height:14px;border-radius:50%;border:2px solid var(--border2);transition:all .2s}
.pin-dot.on{background:var(--green);border-color:var(--green);box-shadow:0 0 8px rgba(22,163,74,.3)}
.pin-dot.err{border-color:var(--red);background:var(--red);box-shadow:0 0 8px rgba(220,38,38,.3)}
.pin-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.pkey{background:var(--bg2);border:1px solid var(--border2);border-radius:12px;height:56px;display:flex;align-items:center;justify-content:center;font-size:22px;cursor:pointer;transition:all .1s;color:var(--text);font-family:var(--font);font-weight:500;user-select:none;box-shadow:0 1px 2px rgba(0,0,0,.04)}
.pkey:hover{background:var(--bg4);border-color:var(--border3)}
.pkey:active{transform:scale(.95);background:var(--bg5)}
.pkey.del{font-size:12px;color:var(--muted2);font-weight:600;letter-spacing:.05em}
.pin-error{font-size:12px;color:var(--red);margin-top:14px;min-height:18px}
.demo-hint{margin-top:20px;font-size:11px;color:var(--muted2);background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:12px;text-align:left;line-height:1.8;box-shadow:0 1px 3px rgba(0,0,0,.04)}

/* COMMON */
.sec-head{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted2);margin-bottom:14px;font-weight:600}
.card{background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:18px;margin-bottom:14px;box-shadow:0 1px 3px rgba(0,0,0,.03)}
.row{display:flex;align-items:center;gap:10px}
.spacer{flex:1}
.btn{background:var(--bg2);border:1px solid var(--border2);border-radius:8px;padding:8px 16px;font-size:12px;font-weight:500;cursor:pointer;color:var(--text);font-family:var(--font);transition:all .15s;white-space:nowrap;display:inline-flex;align-items:center;gap:6px;box-shadow:0 1px 2px rgba(0,0,0,.04)}
.btn:hover{background:var(--bg4);border-color:var(--border3)}
.btn:active{transform:scale(.97)}
.btn.primary{background:var(--green);color:#fff;border-color:var(--green);font-weight:600;box-shadow:0 1px 3px rgba(22,163,74,.2)}
.btn.primary:hover{background:var(--green2)}
.btn.danger{background:rgba(220,38,38,0.06);color:var(--red);border-color:rgba(220,38,38,0.2)}
.btn.danger:hover{background:rgba(220,38,38,0.12)}
.btn.small{padding:5px 10px;font-size:11px;border-radius:6px}
.btn.amber{background:rgba(217,119,6,0.06);color:var(--amber);border-color:rgba(217,119,6,0.2)}
.btn.ghost{background:transparent;border-color:transparent;color:var(--muted2);box-shadow:none}
.btn.ghost:hover{color:var(--text);background:var(--bg4)}
.btn:disabled{opacity:.4;cursor:not-allowed;pointer-events:none}

/* INPUTS */
select,input[type=text],input[type=time],input[type=number],input[type=email],textarea{
  background:var(--bg2);border:1px solid var(--border2);border-radius:8px;
  padding:8px 12px;font-size:13px;color:var(--text);font-family:var(--font);
  outline:none;width:100%;transition:border .15s
}
select:focus,input:focus,textarea:focus{border-color:var(--green);box-shadow:0 0 0 3px rgba(22,163,74,.08)}
select{cursor:pointer;-webkit-appearance:none;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center;padding-right:30px}

/* SCHEDULE */
.sched-wrap{overflow-x:auto;border-radius:12px;border:1px solid var(--border);box-shadow:0 1px 3px rgba(0,0,0,.03)}
.sched-tbl{width:100%;border-collapse:collapse;font-size:12px;min-width:700px}
.sched-tbl th{padding:10px 8px;text-align:center;color:var(--muted2);font-weight:600;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid var(--border);font-size:10px;background:var(--bg4)}
.sched-tbl th:first-child{text-align:left;padding-left:16px;min-width:100px}
.sched-tbl td{padding:6px 4px;border-bottom:1px solid var(--border);vertical-align:top}
.sched-tbl td:first-child{padding-left:16px;font-weight:500;font-size:12px;white-space:nowrap;vertical-align:middle}
.sched-tbl tr:last-child td{border-bottom:none}
.sched-tbl tr:hover td{background:rgba(0,0,0,.015)}
.shift-cell{min-height:44px;display:flex;flex-direction:column;gap:3px;padding:2px}
.shift-toggle{display:flex;align-items:center;gap:4px}
input.cell-time{font-size:11px;padding:3px 6px;border-radius:5px;width:100%}
.week-nav{display:flex;align-items:center;gap:12px;margin-bottom:16px}
.week-label{font-size:14px;font-weight:500;flex:1;text-align:center}
.sched-rule{margin-top:14px;padding:12px 16px;background:rgba(217,119,6,.06);border-radius:10px;border:1px solid rgba(217,119,6,.15);font-size:12px;color:var(--amber);display:flex;align-items:center;gap:10px}

/* PAYROLL */
.stat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:18px}
.stat{background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:16px;box-shadow:0 1px 3px rgba(0,0,0,.03)}
.stat-lbl{font-size:10px;text-transform:uppercase;letter-spacing:.07em;color:var(--muted2);margin-bottom:8px;font-weight:600}
.stat-val{font-size:26px;font-weight:600;letter-spacing:-.5px;font-family:var(--mono)}
.stat-sub{font-size:11px;color:var(--muted);margin-top:4px}
.pay-tbl{width:100%;font-size:12px;border-collapse:collapse}
.pay-tbl th{padding:10px 12px;text-align:left;color:var(--muted2);font-weight:600;font-size:10px;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid var(--border)}
.pay-tbl td{padding:12px;border-bottom:1px solid var(--border)}
.pay-tbl tr:hover td{background:rgba(0,0,0,.015)}
.override-link{font-size:11px;color:var(--blue);cursor:pointer;text-decoration:underline;text-underline-offset:2px}
.period-tabs{display:flex;gap:6px;margin-bottom:16px}
.period-tab{padding:6px 16px;border-radius:20px;font-size:12px;font-weight:500;cursor:pointer;border:1px solid var(--border);color:var(--muted2);transition:all .15s}
.period-tab.on{background:rgba(22,163,74,.08);color:var(--green);border-color:rgba(22,163,74,.25)}

/* TASKS */
.task-card{background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:16px;margin-bottom:10px;transition:all .15s;box-shadow:0 1px 3px rgba(0,0,0,.03)}
.task-card:hover{border-color:var(--border2);box-shadow:0 2px 6px rgba(0,0,0,.06)}
.task-card.active-task{border-color:rgba(22,163,74,.3);background:rgba(22,163,74,.02)}
.task-card.done-task{opacity:.55}
.task-hdr{display:flex;align-items:center;gap:8px;margin-bottom:6px}
.task-name{font-size:14px;font-weight:500;flex:1}
.task-badge{font-size:10px;padding:3px 10px;border-radius:20px;font-weight:600;letter-spacing:.03em}
.badge-A{background:rgba(124,58,237,.08);color:var(--purple)}
.badge-B{background:rgba(37,99,235,.06);color:var(--blue)}
.badge-C{background:rgba(217,119,6,.06);color:var(--amber)}
.badge-all{background:rgba(22,163,74,.06);color:var(--green)}
.task-meta{font-size:12px;color:var(--muted2);margin-bottom:8px;line-height:1.5}
.task-footer{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.timer-display{font-family:var(--mono);font-size:13px;background:rgba(22,163,74,.06);color:var(--green);padding:4px 10px;border-radius:20px;font-weight:500}
.timer-alert{background:rgba(220,38,38,.06);color:var(--red)}
.progress-bar{height:4px;background:var(--bg5);border-radius:2px;margin-top:10px;overflow:hidden}
.progress-fill{height:100%;background:linear-gradient(90deg,var(--green),var(--cyan));border-radius:2px;transition:width .5s}

/* VENDOR */
.vendor-section{display:grid;grid-template-columns:1fr 1fr;gap:20px}
@media(max-width:768px){.vendor-section{grid-template-columns:1fr}}
.qr-box{text-align:center;padding:28px;background:var(--bg2);border:1px solid var(--border);border-radius:16px;box-shadow:0 1px 3px rgba(0,0,0,.03)}
.qr-frame{width:120px;height:120px;margin:0 auto 16px;background:#fff;border-radius:12px;padding:10px;display:grid;grid-template-columns:repeat(7,1fr);gap:2px;border:1px solid var(--border)}
.qr-b{background:#000;border-radius:1px}
.qr-w{background:#fff}
.form-item{background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.form-item-name{font-size:13px;font-weight:500}
.form-item-type{font-size:10px;color:var(--muted2)}
.vendor-entry{background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:14px;margin-bottom:8px}

/* INVOICE VERIFIER */
.iv-wrap{margin-top:24px;border-top:1px solid var(--border);padding-top:20px}
.iv-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}
.iv-title{font-size:16px;font-weight:700;letter-spacing:-.02em}
.iv-drop-zone{border:2px dashed var(--border2);border-radius:12px;padding:28px 20px;text-align:center;cursor:pointer;transition:all .2s;background:var(--bg3);position:relative;min-height:80px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px}
.iv-drop-zone:hover,.iv-drop-zone.dragover{border-color:var(--green);background:rgba(22,163,74,.04)}
.iv-drop-zone.has-file{border-color:var(--green);border-style:solid;background:rgba(22,163,74,.04)}
.iv-drop-icon{font-size:28px;opacity:.6}
.iv-drop-label{font-size:13px;font-weight:500;color:var(--muted2)}
.iv-drop-file{font-size:12px;font-weight:600;color:var(--green)}
.iv-uploads{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px}
@media(max-width:600px){.iv-uploads{grid-template-columns:1fr}}
.iv-btn{background:var(--green);color:#fff;border:none;padding:10px 24px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;font-family:var(--font);transition:all .15s;width:100%}
.iv-btn:hover{background:var(--green2)}
.iv-btn:disabled{opacity:.4;cursor:not-allowed}
.iv-progress{font-size:12px;color:var(--muted2);text-align:center;padding:12px 0}
.iv-results{margin-top:16px}
.iv-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px}
@media(max-width:600px){.iv-summary{grid-template-columns:1fr 1fr}}
.iv-stat{background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:12px;text-align:center}
.iv-stat-num{font-size:22px;font-weight:700;font-family:var(--mono)}
.iv-stat-label{font-size:10px;color:var(--muted2);text-transform:uppercase;letter-spacing:.04em;margin-top:2px}
.iv-stat.ok .iv-stat-num{color:var(--green)}
.iv-stat.warn .iv-stat-num{color:var(--amber)}
.iv-stat.err .iv-stat-num{color:var(--red)}
.iv-table{width:100%;border-collapse:collapse;font-size:12px}
.iv-table th{text-align:left;padding:8px 10px;background:var(--bg4);font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted2);font-weight:600;border-bottom:1px solid var(--border);position:sticky;top:0}
.iv-table td{padding:7px 10px;border-bottom:1px solid var(--border);vertical-align:middle}
.iv-table tr:hover td{background:var(--bg3)}
.iv-table tr.match td{color:var(--text)}
.iv-table tr.cheaper td{background:rgba(22,163,74,.04)}
.iv-table tr.overcharge td{background:rgba(239,68,68,.04)}
.iv-table tr.notfound td{background:rgba(217,119,6,.04)}
.iv-badge{display:inline-block;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:600;white-space:nowrap}
.iv-badge.ok{background:#e8f5ec;color:var(--green)}
.iv-badge.save{background:#e8f5ec;color:#166534}
.iv-badge.over{background:#fef2f2;color:var(--red)}
.iv-badge.miss{background:#fff7ed;color:var(--amber)}
.iv-table-wrap{max-height:400px;overflow-y:auto;border:1px solid var(--border);border-radius:10px}
.iv-reset{background:none;border:1px solid var(--border);color:var(--muted2);padding:6px 14px;border-radius:6px;font-size:12px;cursor:pointer;font-family:var(--font)}
.iv-reset:hover{border-color:var(--red);color:var(--red)}

/* NFC CLOCK PAGE */
.nfc-wrap{display:flex;align-items:center;justify-content:center;min-height:100vh;background:var(--bg);padding:20px}
.nfc-box{width:340px;text-align:center}
.nfc-logo{font-size:28px;font-weight:700;margin-bottom:2px}
.nfc-logo span{color:var(--green)}
.nfc-logo em{color:var(--muted2);font-style:normal;font-weight:400;font-size:16px}
.nfc-subtitle{font-size:13px;color:var(--muted2);margin-bottom:8px;display:flex;align-items:center;justify-content:center;gap:6px}
.nfc-badge{display:inline-block;background:rgba(8,145,178,.08);color:var(--cyan);font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;letter-spacing:.06em;text-transform:uppercase}
.nfc-welcome{font-size:22px;font-weight:700;margin-bottom:4px;letter-spacing:-.02em}
.nfc-status-text{font-size:13px;color:var(--muted2);margin-bottom:24px}
.nfc-actions{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px}
.nfc-clock-btn{padding:24px 16px;border-radius:16px;font-size:16px;font-weight:700;cursor:pointer;border:none;font-family:var(--font);transition:all .15s;display:flex;flex-direction:column;align-items:center;gap:6px}
.nfc-clock-btn:active{transform:scale(.96)}
.nfc-clock-btn:disabled{opacity:.25;cursor:not-allowed;transform:none}
.nfc-clock-btn.in{background:var(--green);color:#fff;box-shadow:0 4px 16px rgba(22,163,74,.25)}
.nfc-clock-btn.in:hover:not(:disabled){background:var(--green2)}
.nfc-clock-btn.out{background:rgba(220,38,38,.06);color:var(--red);border:2px solid rgba(220,38,38,.2)}
.nfc-clock-btn.out:hover:not(:disabled){background:rgba(220,38,38,.12)}
.nfc-clock-icon{font-size:28px}
.nfc-done-wrap{padding:20px 0}
.nfc-done-check{width:72px;height:72px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:36px;margin:0 auto 16px;animation:nfcPop .4s ease}
.nfc-done-check.in{background:rgba(22,163,74,.1);color:var(--green)}
.nfc-done-check.out{background:rgba(220,38,38,.08);color:var(--red)}
.nfc-done-msg{font-size:20px;font-weight:700;margin-bottom:6px}
.nfc-done-time{font-size:14px;color:var(--muted2);font-family:var(--mono);margin-bottom:20px}
.nfc-done-close{font-size:12px;color:var(--muted)}
@keyframes nfcPop{0%{transform:scale(0)}50%{transform:scale(1.15)}100%{transform:scale(1)}}
.nfc-error{background:rgba(220,38,38,.04);border:1px solid rgba(220,38,38,.15);border-radius:10px;padding:14px;color:var(--red);font-size:13px;margin-top:16px}
.nfc-loading{display:flex;flex-direction:column;align-items:center;gap:12px;padding:40px 0}
.nfc-spinner{width:32px;height:32px;border:3px solid var(--bg5);border-top-color:var(--green);border-radius:50%;animation:nfcSpin .6s linear infinite}
@keyframes nfcSpin{to{transform:rotate(360deg)}}
.nfc-source{display:inline-block;background:rgba(8,145,178,.08);color:var(--cyan);font-size:9px;font-weight:700;padding:1px 6px;border-radius:4px;letter-spacing:.04em;margin-left:4px;vertical-align:middle}

/* ALERTS */
.notif{background:var(--bg2);border-radius:14px;padding:16px;border-left:3px solid;margin-bottom:10px;transition:all .15s;box-shadow:0 1px 3px rgba(0,0,0,.03)}
.notif:hover{box-shadow:0 2px 8px rgba(0,0,0,.06)}
.notif.warn{border-color:var(--amber)}
.notif.danger{border-color:var(--red)}
.notif.info{border-color:var(--blue)}
.notif.ok{border-color:var(--green)}
.notif-title{font-size:13px;font-weight:500;margin-bottom:4px}
.notif-desc{font-size:12px;color:var(--muted2);line-height:1.6}
.notif-time{font-size:10px;color:var(--muted);margin-top:6px;font-family:var(--mono)}

/* MODAL */
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;z-index:999;padding:20px;backdrop-filter:blur(4px)}
.modal{background:var(--bg2);border:1px solid var(--border2);border-radius:18px;padding:24px;width:100%;max-width:440px;max-height:90vh;overflow-y:auto;animation:modalIn .2s ease;box-shadow:0 20px 60px rgba(0,0,0,.15)}
@keyframes modalIn{from{opacity:0;transform:scale(.96) translateY(8px)}to{opacity:1;transform:scale(1) translateY(0)}}
.modal-title{font-size:16px;font-weight:600;margin-bottom:18px}
.modal-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:20px}
.form-group{margin-bottom:14px}
.form-group label{display:block;font-size:12px;color:var(--muted3);margin-bottom:6px;font-weight:500}

/* EMPLOYEE VIEWS */
.log-row{display:flex;align-items:center;padding:10px 0;border-bottom:1px solid var(--border);font-size:12px;gap:12px}
.log-type{font-size:10px;padding:3px 10px;border-radius:20px;font-weight:700;letter-spacing:.03em}
.log-in{background:rgba(22,163,74,.08);color:var(--green)}
.log-out{background:rgba(220,38,38,.06);color:var(--red)}

.complete-options{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:14px}
.time-opt{background:var(--bg4);border:1px solid var(--border2);border-radius:12px;padding:14px;text-align:center;cursor:pointer;transition:all .15s;font-size:13px;font-weight:600}
.time-opt:hover{border-color:var(--amber);color:var(--amber);background:rgba(217,119,6,.04)}

/* SETTINGS */
.setting-row{display:flex;align-items:center;gap:14px;padding:14px 0;border-bottom:1px solid var(--border)}
.setting-label{flex:1;font-size:13px;font-weight:500}
.setting-sub{font-size:11px;color:var(--muted2);margin-top:3px;font-weight:400}
.toggle{width:42px;height:24px;background:var(--bg5);border-radius:12px;position:relative;cursor:pointer;transition:background .2s;flex-shrink:0;border:1px solid var(--border2)}
.toggle.on{background:var(--green);border-color:var(--green)}
.toggle-knob{position:absolute;top:3px;left:3px;width:16px;height:16px;background:#fff;border-radius:50%;transition:left .2s;box-shadow:0 1px 3px rgba(0,0,0,.15)}
.toggle.on .toggle-knob{left:21px}

.my-shift-card{background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:16px;margin-bottom:10px;box-shadow:0 1px 3px rgba(0,0,0,.03)}
.shift-day{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted2);margin-bottom:6px;font-weight:600}
.shift-time-big{font-size:22px;font-weight:600;letter-spacing:-.5px;font-family:var(--mono)}
.shift-hours{font-size:12px;color:var(--muted2);margin-top:3px}

/* EMPLOYEE MANAGEMENT */
.emp-card{background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:16px;display:flex;align-items:center;gap:14px;margin-bottom:10px;transition:all .15s;box-shadow:0 1px 3px rgba(0,0,0,.03)}
.emp-card:hover{border-color:var(--border2);box-shadow:0 2px 6px rgba(0,0,0,.06)}
.emp-avatar{width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;flex-shrink:0}
.emp-info{flex:1}
.emp-name{font-size:14px;font-weight:500}
.emp-detail{font-size:11px;color:var(--muted2);margin-top:2px}
.emp-actions{display:flex;gap:6px}

/* CLOCK BUTTONS */
.clock-btns{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:18px}
.clock-btn{padding:16px;border-radius:14px;font-size:14px;font-weight:600;cursor:pointer;border:none;font-family:var(--font);transition:all .15s}
.clock-btn:active{transform:scale(.97)}
.clock-btn:disabled{opacity:.3;cursor:not-allowed}
.clock-btn.in{background:var(--green);color:#fff;box-shadow:0 2px 8px rgba(22,163,74,.2)}
.clock-btn.in:hover:not(:disabled){background:var(--green2)}
.clock-btn.out{background:rgba(220,38,38,.06);color:var(--red);border:1px solid rgba(220,38,38,.2)}
.clock-btn.out:hover:not(:disabled){background:rgba(220,38,38,.12)}

/* CASH DRAWER */
.drawer-modal{text-align:center}
.drawer-modal .modal-title{text-align:center}
.drawer-amount{font-family:var(--mono);font-size:32px;font-weight:600;text-align:center;padding:16px;border-radius:12px;letter-spacing:1px}
.drawer-history{max-height:200px;overflow-y:auto}
.drawer-row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border);font-size:12px}
.drawer-discrepancy{background:rgba(220,38,38,.04);border:1px solid rgba(220,38,38,.15);border-radius:10px;padding:12px;margin-top:10px;font-size:12px;color:var(--red)}
.drawer-match{background:rgba(22,163,74,.04);border:1px solid rgba(22,163,74,.15);border-radius:10px;padding:12px;margin-top:10px;font-size:12px;color:var(--green)}

/* SHIFT NOTES */
.handoff-banner{background:rgba(37,99,235,.04);border:1px solid rgba(37,99,235,.15);border-radius:14px;padding:18px;margin-bottom:18px}
.handoff-banner .note-from{font-size:11px;color:var(--blue);font-weight:600;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px}
.handoff-banner .note-text{font-size:13px;line-height:1.6;color:var(--text)}
.handoff-banner .note-time{font-size:10px;color:var(--muted);margin-top:6px;font-family:var(--mono)}

/* TOAST */
.toast-container{position:fixed;bottom:24px;right:24px;z-index:1000;display:flex;flex-direction:column;gap:8px}
.toast{background:var(--bg2);border:1px solid var(--border2);border-radius:12px;padding:12px 18px;font-size:13px;box-shadow:0 8px 32px rgba(0,0,0,.12);animation:toastIn .3s ease;display:flex;align-items:center;gap:10px;max-width:360px}
.toast.success{border-left:3px solid var(--green)}
.toast.error{border-left:3px solid var(--red)}
.toast.warning{border-left:3px solid var(--amber)}
@keyframes toastIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.8)}}

/* RESPONSIVE */
@media(max-width:640px){
  .topbar{padding:0 14px;height:50px}
  .body{padding:14px}
  .stat-grid{grid-template-columns:1fr 1fr}
  .user-info{display:none}
}

/* ANNOUNCEMENTS PANEL */
.ann-panel{background:var(--bg2);border-bottom:1px solid var(--border);padding:12px 20px;max-height:320px;overflow-y:auto}
.ann-panel-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
.ann-panel-title{font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;color:var(--muted2)}
.ann-new-btn{background:var(--green);color:#fff;border:none;padding:4px 12px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;font-family:var(--font)}
.ann-new-btn:hover{background:var(--green2)}
.ann-empty{font-size:12px;color:var(--muted);text-align:center;padding:6px 0}
.ann-form{background:var(--bg4);border-radius:8px;padding:10px;margin-bottom:8px;display:flex;flex-direction:column;gap:8px}
.ann-form textarea,.ann-form input,.ann-form select{padding:8px 10px;border:1px solid var(--border2);border-radius:6px;font-size:13px;font-family:var(--font);background:var(--bg2);color:var(--text);outline:none;resize:none}
.ann-form textarea:focus,.ann-form input:focus,.ann-form select:focus{border-color:var(--green)}
.ann-form-row{display:flex;gap:8px;align-items:center}
.ann-post-btn{background:var(--green);color:#fff;border:none;padding:7px 16px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;font-family:var(--font)}
.ann-cancel-btn{background:var(--bg5);color:var(--muted3);border:none;padding:7px 16px;border-radius:6px;font-size:13px;font-weight:500;cursor:pointer;font-family:var(--font)}
.ann-photo-btn{display:flex;align-items:center;gap:6px;background:var(--bg3);border:1.5px dashed var(--border2);border-radius:6px;padding:8px 12px;cursor:pointer;color:var(--muted2);font-size:12px;font-family:var(--font);transition:all .15s;flex:1}
.ann-photo-btn:hover{border-color:var(--green);color:var(--green)}
.ann-photo-preview{position:relative;display:inline-block;margin-top:4px}
.ann-photo-preview img{width:80px;height:60px;object-fit:cover;border-radius:6px;border:1px solid var(--border2)}
.ann-photo-remove{position:absolute;top:-4px;right:-4px;width:18px;height:18px;border-radius:50%;background:var(--red);color:#fff;border:none;font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1}
.ann-photo-attached{margin-top:6px}
.ann-photo-thumb{max-width:180px;max-height:120px;border-radius:6px;border:1px solid var(--border);cursor:pointer;transition:opacity .15s}
.ann-photo-thumb:hover{opacity:.85}
.ann-lightbox{position:fixed;inset:0;background:rgba(0,0,0,.85);display:flex;align-items:center;justify-content:center;z-index:10000;cursor:pointer;padding:20px}
.ann-lightbox img{max-width:90%;max-height:90%;border-radius:10px}
.ann-item{background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:10px 12px;margin-bottom:6px}
.ann-item.pending{border-color:var(--amber)}
.ann-item.active{border-color:var(--green)}
.ann-item.done{opacity:.55;border-color:var(--border)}
.ann-item-top{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}
.ann-item-msg{font-size:13px;font-weight:500;line-height:1.4;flex:1}
.ann-del{background:none;border:none;color:var(--muted);font-size:18px;cursor:pointer;line-height:1;padding:0 2px}
.ann-del:hover{color:var(--red)}
.ann-item-meta{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px;align-items:center}
.ann-tag{display:inline-block;padding:1px 7px;border-radius:8px;font-size:10px;font-weight:600}
.ann-tag.from{background:#e8f5ec;color:var(--green)}
.ann-tag.assign{background:#fff3e0;color:var(--amber)}
.ann-tag.time{background:#e3f2fd;color:var(--blue)}
.ann-tag.accepted{background:#e8f5ec;color:var(--green)}
.ann-tag.completed{background:var(--bg5);color:var(--muted2)}
.ann-ago{font-size:10px;color:var(--muted);margin-left:2px}
.ann-accept-btn{margin-top:8px;background:var(--amber);color:#fff;border:none;padding:6px 14px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;font-family:var(--font)}
.ann-accept-btn:hover{opacity:.9}
.ann-waiting{margin-top:6px;font-size:11px;color:var(--muted)}
.ann-countdown-area{margin-top:8px}
.ann-countdown-row{display:flex;align-items:center;gap:10px;margin-bottom:6px}
.ann-countdown-num{font-size:18px;font-weight:700;font-family:var(--mono);color:var(--green)}
.ann-countdown-num.urgent{color:var(--red)}
.ann-countdown-bar{flex:1;height:5px;background:var(--bg5);border-radius:3px;overflow:hidden}
.ann-countdown-fill{height:100%;background:var(--green);border-radius:3px;transition:width 1s linear}
.ann-countdown-fill.urgent{background:var(--red)}
.ann-complete-btn{background:var(--green);color:#fff;border:none;padding:6px 14px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;font-family:var(--font)}
`;

// ─── TOAST SYSTEM ────────────────────────────────────────────────────────────
let toastId = 0;
function useToast() {
  const [toasts, setToasts] = useState([]);
  const show = (msg, type = "success") => {
    const id = ++toastId;
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000);
  };
  const el = toasts.length > 0 ? (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={"toast " + t.type}>
          {t.type === "success" && <span style={{color:"var(--green)"}}>&#10003;</span>}
          {t.type === "error" && <span style={{color:"var(--red)"}}>&#10007;</span>}
          {t.type === "warning" && <span style={{color:"var(--amber)"}}>&#9888;</span>}
          {t.msg}
        </div>
      ))}
    </div>
  ) : null;
  return { show, el };
}

// ─── PIN LOGIN ───────────────────────────────────────────────────────────────
function PinLogin({ onLogin, employees }) {
  const [pin, setPin] = useState([]);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);

  const add = (d) => {
    if (pin.length >= 4) return;
    const next = [...pin, d];
    setPin(next);
    setError("");
    if (next.length === 4) {
      setTimeout(() => {
        const code = next.join("");
        const emp = employees.find((e) => e.pin === code);
        if (emp) { onLogin(emp); setPin([]); }
        else {
          setError("Incorrect PIN");
          setShake(true);
          setTimeout(() => { setShake(false); setPin([]); }, 500);
        }
      }, 200);
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-box">
        <div className="login-logo"><span>Woodhaven</span><em>OS</em></div>
        <div className="login-sub">Enter your 4-digit PIN</div>
        <div className="pin-dots" style={shake ? {animation:"shake .3s"} : {}}>
          {[0,1,2,3].map(i => (
            <div key={i} className={"pin-dot" + (pin.length > i ? (error ? " err" : " on") : "")} />
          ))}
        </div>
        <style>{`@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-8px)}75%{transform:translateX(8px)}}`}</style>
        <div className="pin-grid">
          {[1,2,3,4,5,6,7,8,9].map(n => (
            <div key={n} className="pkey" onClick={() => add(n)}>{n}</div>
          ))}
          <div className="pkey del" onClick={() => { setPin([]); setError(""); }}>CLR</div>
          <div className="pkey" onClick={() => add(0)}>0</div>
          <div className="pkey del" style={{visibility:"hidden"}}></div>
        </div>
        <div className="pin-error">{error}</div>
        {/* PINs are private - each employee receives their PIN from admin */}
      </div>
    </div>
  );
}

// ─── CASH DRAWER MODAL ───────────────────────────────────────────────────────
function CashDrawerModal({ type, employee, lastDrawerForRegister, drawerLogs, onSubmit, onCancel }) {
  const [cashAmount, setCashAmount] = useState("");
  const [coinAmount, setCoinAmount] = useState("");
  const [cashierNum, setCashierNum] = useState("");
  const isOpen = type === "open";

  // Find last close for the selected register
  const lastClose = isOpen && cashierNum
    ? (() => {
        const closes = drawerLogs.filter(l => l.type === "close" && l.cashierNum === cashierNum);
        return closes.length > 0 ? closes[closes.length - 1] : null;
      })()
    : null;

  // Coin amount: if previous close exists, auto-fill from last shift (coins carry forward)
  const hasCarryOverCoins = isOpen && lastClose && lastClose.coinAmount > 0;
  const effectiveCoinAmount = hasCarryOverCoins ? lastClose.coinAmount : (parseFloat(coinAmount) || 0);
  const totalAmount = (parseFloat(cashAmount) || 0) + effectiveCoinAmount;

  const submit = () => {
    if (isNaN(totalAmount) || totalAmount < 0) return;
    if (isOpen && !cashierNum.trim()) return;
    onSubmit({
      amount: totalAmount,
      cashAmount: parseFloat(cashAmount) || 0,
      coinAmount: effectiveCoinAmount,
      cashierNum: isOpen ? cashierNum : (lastDrawerForRegister?.cashierNum || ""),
      type,
      employeeId: employee.id,
      employeeName: employee.name,
      time: new Date().toISOString(),
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal drawer-modal">
        <div style={{fontSize:36,marginBottom:8}}>{isOpen ? "\uD83D\uDCB0" : "\uD83D\uDD12"}</div>
        <div className="modal-title">
          {isOpen ? "Opening Cash Count" : "Closing Cash Count"}
        </div>
        <div style={{fontSize:12,color:"var(--muted2)",marginBottom:18}}>
          {isOpen
            ? "Count the bills in the drawer and enter the amount below."
            : "Count the cash drawer and enter the amounts to close your shift."}
        </div>
        {isOpen && (
          <div className="form-group">
            <label>Cash Register</label>
            <select
              value={cashierNum}
              onChange={e => setCashierNum(e.target.value)}
              style={{textAlign:"center",fontSize:15,fontWeight:500}}
            >
              <option value="">-- Select Register --</option>
              <option value="Cash Register 1">Cash Register 1</option>
              <option value="Cash Register 2">Cash Register 2</option>
              <option value="Cash Register 3">Cash Register 3</option>
            </select>
          </div>
        )}
        <div className="form-group">
          <label>Bills ($) &mdash; <span style={{fontSize:11,color:"var(--muted2)",fontWeight:400}}>count manually</span></label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={cashAmount}
            onChange={e => setCashAmount(e.target.value)}
            placeholder="0.00"
            className="drawer-amount"
            autoFocus
          />
        </div>
        {isOpen && hasCarryOverCoins ? (
          /* Coins carry forward from previous shift — shown, not editable */
          <div style={{background:"var(--bg4)",borderRadius:10,padding:"12px 16px",marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:12,color:"var(--muted2)",marginBottom:2}}>Coins (from previous shift)</div>
                <div style={{fontSize:18,fontWeight:600,fontFamily:"var(--mono)"}}>${effectiveCoinAmount.toFixed(2)}</div>
              </div>
              <span style={{fontSize:10,color:"var(--muted2)",background:"rgba(22,163,74,.08)",padding:"3px 8px",borderRadius:20,color:"var(--green)"}}>Auto-filled</span>
            </div>
          </div>
        ) : isOpen && cashierNum && !lastClose ? (
          /* No previous close — first person counts coins */
          <div className="form-group">
            <label>Coins ($) &mdash; <span style={{fontSize:11,color:"var(--amber)",fontWeight:400}}>no previous record, please count</span></label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={coinAmount}
              onChange={e => setCoinAmount(e.target.value)}
              placeholder="0.00"
              className="drawer-amount"
            />
          </div>
        ) : !isOpen ? (
          /* Closing — always count both bills and coins */
          <div className="form-group">
            <label>Coins ($) &mdash; <span style={{fontSize:11,color:"var(--muted2)",fontWeight:400}}>count manually</span></label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={coinAmount}
              onChange={e => setCoinAmount(e.target.value)}
              placeholder="0.00"
              className="drawer-amount"
            />
          </div>
        ) : null}
        {(cashAmount || effectiveCoinAmount > 0) && (
          <div style={{textAlign:"center",padding:"10px 0",fontSize:14,fontWeight:600,color:"var(--text)",background:"var(--bg4)",borderRadius:10,marginBottom:8}}>
            Total: ${totalAmount.toFixed(2)}
          </div>
        )}
        {isOpen && cashierNum && !lastClose && (
          <div style={{fontSize:11,color:"var(--muted2)",textAlign:"center",fontStyle:"italic",marginBottom:8}}>
            No previous closing record for {cashierNum}
          </div>
        )}
        <div className="modal-actions">
          {onCancel && <button className="btn" onClick={onCancel}>Cancel</button>}
          <button className="btn primary" onClick={submit} disabled={(!cashAmount && !coinAmount) || (isOpen && !cashierNum.trim())}>
            {isOpen ? "Start Shift" : "Close & Clock Out"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SHIFT NOTES MODAL ───────────────────────────────────────────────────────
function ShiftNoteModal({ employee, onSubmit, onSkip }) {
  const [note, setNote] = useState("");
  return (
    <div className="modal-overlay">
      <div className="modal">
        <div style={{fontSize:36,marginBottom:8,textAlign:"center"}}>&#128221;</div>
        <div className="modal-title" style={{textAlign:"center"}}>Shift Handoff Note</div>
        <div style={{fontSize:12,color:"var(--muted2)",marginBottom:18,textAlign:"center"}}>
          Leave a note for the next person coming in. This will be shown when they clock in.
        </div>
        <div className="form-group">
          <label>Your note (optional)</label>
          <textarea
            rows={4}
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder='e.g. "Customer returning at 3pm for exchange, vendor called about delayed shipment"'
            style={{resize:"vertical"}}
          />
        </div>
        <div className="modal-actions">
          <button className="btn" onClick={onSkip}>Skip</button>
          <button className="btn primary" onClick={() => onSubmit(note)} disabled={!note.trim()}>Save Note</button>
        </div>
      </div>
    </div>
  );
}

// ─── HANDOFF NOTE BANNER ─────────────────────────────────────────────────────
function HandoffBanner({ notes, onDismiss }) {
  if (!notes || notes.length === 0) return null;
  return (
    <div>
      {notes.map((n, i) => (
        <div className="handoff-banner" key={i}>
          <div className="note-from">&#128221; Note from {n.from}</div>
          <div className="note-text">{n.text}</div>
          <div className="note-time">{new Date(n.time).toLocaleString("en-US", {month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}</div>
          <div style={{marginTop:10,textAlign:"right"}}>
            <button className="btn small" onClick={() => onDismiss(n.id)}>Dismiss</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── ADMIN: EMPLOYEE MANAGEMENT ──────────────────────────────────────────────
function AdminEmployees({ employees, setEmployees, toast }) {
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: "", pin: "", role: "A", rate: 15 });
  const nonAdmin = employees.filter(e => e.role !== "admin");

  const openNew = () => {
    setForm({ name: "", pin: "", role: "A", rate: 15 });
    setEditId(null);
    setShowModal(true);
  };

  const openEdit = (emp) => {
    setForm({ name: emp.name, pin: emp.pin, role: emp.role, rate: emp.rate || 15 });
    setEditId(emp.id);
    setShowModal(true);
  };

  const save = () => {
    if (!form.name.trim() || !form.pin.trim()) return;
    if (form.pin.length !== 4 || !/^\d{4}$/.test(form.pin)) {
      toast.show("PIN must be exactly 4 digits", "error");
      return;
    }
    const dup = employees.find(e => e.pin === form.pin && e.id !== editId);
    if (dup) {
      toast.show("PIN already used by " + dup.name, "error");
      return;
    }
    if (editId) {
      setEmployees(es => es.map(e => e.id === editId ? { ...e, ...form } : e));
      toast.show("Updated " + form.name);
    } else {
      setEmployees(es => [...es, { id: uid(), ...form }]);
      toast.show("Added " + form.name);
    }
    setShowModal(false);
  };

  const del = (emp) => {
    setEmployees(es => es.filter(e => e.id !== emp.id));
    toast.show("Removed " + emp.name, "warning");
  };

  const roleBg = { A: "rgba(124,58,237,.1)", B: "rgba(37,99,235,.08)", C: "rgba(217,119,6,.08)" };
  const roleColor = { A: "var(--purple)", B: "var(--blue)", C: "var(--amber)" };

  return (
    <div>
      <div className="row" style={{marginBottom:18}}>
        <div className="sec-head" style={{marginBottom:0}}>Staff ({nonAdmin.length})</div>
        <div className="spacer" />
        <button className="btn primary small" onClick={openNew}>+ Add Employee</button>
      </div>
      {nonAdmin.map(emp => (
        <div className="emp-card" key={emp.id}>
          <div className="emp-avatar" style={{background:roleBg[emp.role]||"var(--bg4)",color:roleColor[emp.role]||"var(--text)"}}>
            {emp.name.charAt(0)}
          </div>
          <div className="emp-info">
            <div className="emp-name">{emp.name}</div>
            <div className="emp-detail">Role {emp.role} &nbsp;·&nbsp; PIN: {emp.pin} &nbsp;·&nbsp; ${emp.rate || 0}/hr</div>
          </div>
          <div className="emp-actions">
            <button className="btn small" onClick={() => openEdit(emp)}>Edit</button>
            <button className="btn small danger" onClick={() => del(emp)}>Remove</button>
          </div>
        </div>
      ))}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-title">{editId ? "Edit Employee" : "Add Employee"}</div>
            <div className="form-group">
              <label>Full Name</label>
              <input type="text" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="e.g. John Smith" />
            </div>
            <div className="form-group">
              <label>4-Digit PIN</label>
              <input type="text" maxLength={4} value={form.pin} onChange={e => setForm(f => ({...f, pin: e.target.value.replace(/\D/g,"").slice(0,4)}))} placeholder="e.g. 1234" style={{fontFamily:"var(--mono)",letterSpacing:"4px",fontSize:18,textAlign:"center"}} />
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div className="form-group">
                <label>Role</label>
                <select value={form.role} onChange={e => setForm(f => ({...f, role: e.target.value}))}>
                  <option value="A">Role A</option>
                  <option value="B">Role B</option>
                  <option value="C">Role C</option>
                </select>
              </div>
              <div className="form-group">
                <label>Hourly Rate ($)</label>
                <input type="number" min={0} step={0.5} value={form.rate} onChange={e => setForm(f => ({...f, rate: parseFloat(e.target.value)||0}))} />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn primary" onClick={save}>{editId ? "Save Changes" : "Add Employee"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── TIME OPTIONS FOR SCHEDULE DROPDOWNS ─────────────────────────────────────
const TIME_OPTIONS = [];
for (let h = 6; h <= 23; h++) {
  const label = h === 0 ? "12am" : h < 12 ? h + "am" : h === 12 ? "12pm" : (h - 12) + "pm";
  const val = String(h).padStart(2, "0") + ":00";
  TIME_OPTIONS.push({ label, val });
  // add :30 too
  const label30 = h === 0 ? "12:30am" : h < 12 ? h + ":30am" : h === 12 ? "12:30pm" : (h - 12) + ":30pm";
  const val30 = String(h).padStart(2, "0") + ":30";
  TIME_OPTIONS.push({ label: label30, val: val30 });
}

function formatTimeLabel(val) {
  if (!val) return "";
  const [hh, mm] = val.split(":").map(Number);
  const h = hh === 0 ? 12 : hh > 12 ? hh - 12 : hh;
  const ap = hh >= 12 ? "pm" : "am";
  return mm === 0 ? h + ap : h + ":" + String(mm).padStart(2, "0") + ap;
}

function calcShiftHours(start, end) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const diff = (eh * 60 + em) - (sh * 60 + sm);
  return diff > 0 ? Math.round(diff / 6) / 10 : 0;
}

// ─── ADMIN: SCHEDULE ─────────────────────────────────────────────────────────
// Flexible: each employee × each day has its own independent start/end time
function AdminSchedule({ employees, schedule, setSchedule, toast, notifications, setNotifications }) {
  const [weekStart, setWeekStart] = useState(getWeekStart());
  const nonAdmin = employees.filter(e => e.role !== "admin");

  // Schedule submission status per week
  const [submittedWeeks, setSubmittedWeeks] = useState(() => {
    try { return JSON.parse(localStorage.getItem("crewos_submitted_weeks")) || {}; } catch { return {}; }
  });
  useEffect(() => { localStorage.setItem("crewos_submitted_weeks", JSON.stringify(submittedWeeks)); }, [submittedWeeks]);
  const isSubmitted = !!submittedWeeks[weekStart];
  const submittedAt = submittedWeeks[weekStart] || null;

  const [showSchedTaxBreakdown, setShowSchedTaxBreakdown] = useState({});

  // Payroll history — snapshot saved each time a schedule is submitted
  const [payrollHistory, setPayrollHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem("crewos_payroll_history")) || []; } catch { return []; }
  });
  useEffect(() => { localStorage.setItem("crewos_payroll_history", JSON.stringify(payrollHistory)); }, [payrollHistory]);
  const [showHistory, setShowHistory] = useState(false);

  // Shift rows stored per week — no employee column, each cell is independent
  const loadShifts = (ws) => {
    try { return JSON.parse(localStorage.getItem("crewos_shifts_" + ws)) || []; } catch { return []; }
  };
  const [shifts, setShifts] = useState(() => loadShifts(weekStart));
  const saveShifts = (ws, s) => { localStorage.setItem("crewos_shifts_" + ws, JSON.stringify(s)); };

  const prevWeekRef = useRef(weekStart);
  useEffect(() => {
    if (prevWeekRef.current !== weekStart) {
      setShifts(loadShifts(weekStart));
      prevWeekRef.current = weekStart;
    }
  }, [weekStart]);
  useEffect(() => { saveShifts(weekStart, shifts); }, [shifts, weekStart]);

  // schedule keys: weekStart_shiftId_dayIdx = { empId, start, end }
  const getCell = (shiftId, dayIdx) => {
    const key = weekStart + "_" + shiftId + "_" + dayIdx;
    return schedule[key] || { empId: "", start: "09:00", end: "17:00" };
  };
  const setCell = (shiftId, dayIdx, updates) => {
    const key = weekStart + "_" + shiftId + "_" + dayIdx;
    const cur = getCell(shiftId, dayIdx);
    setSchedule(prev => ({ ...prev, [key]: { ...cur, ...updates } }));
  };

  const addShift = () => {
    setShifts(prev => [...prev, { id: uid() }]);
  };

  const removeShift = (shiftId) => {
    const ns = { ...schedule };
    for (let d = 0; d < 7; d++) { delete ns[weekStart + "_" + shiftId + "_" + d]; }
    setSchedule(ns);
    setShifts(prev => prev.filter(s => s.id !== shiftId));
  };

  const copyPrevWeek = () => {
    const prevStart = addDays(weekStart, -7);
    const prevShifts = loadShifts(prevStart);
    if (prevShifts.length === 0) { toast.show("No schedule found last week", "warning"); return; }
    const newShifts = prevShifts.map(s => ({ id: uid(), origId: s.id }));
    const ns = { ...schedule };
    newShifts.forEach((ns2, idx) => {
      const origId = prevShifts[idx].id;
      for (let d = 0; d < 7; d++) {
        const pk = prevStart + "_" + origId + "_" + d;
        const nk = weekStart + "_" + ns2.id + "_" + d;
        if (schedule[pk]) ns[nk] = { ...schedule[pk] };
      }
    });
    setShifts(newShifts.map(s => ({ id: s.id })));
    setSchedule(ns);
    toast.show("Copied last week's schedule");
  };

  const clearWeek = () => {
    const ns = { ...schedule };
    shifts.forEach(s => {
      for (let d = 0; d < 7; d++) { delete ns[weekStart + "_" + s.id + "_" + d]; }
    });
    setSchedule(ns);
    setShifts([]);
    setSubmittedWeeks(prev => { const n = { ...prev }; delete n[weekStart]; return n; });
    toast.show("Week cleared", "warning");
  };

  // Submit schedule — locks it and notifies employees
  const submitSchedule = () => {
    const scheduledEmps = new Map();
    shifts.forEach(shift => {
      for (let d = 0; d < 7; d++) {
        const c = getCell(shift.id, d);
        if (c.empId) {
          const emp = nonAdmin.find(e => e.id === c.empId);
          if (emp) {
            if (!scheduledEmps.has(c.empId)) scheduledEmps.set(c.empId, []);
            scheduledEmps.get(c.empId).push({
              day: DAY_FULL[d],
              date: formatDate(addDays(weekStart, d)),
              start: formatTimeLabel(c.start),
              end: formatTimeLabel(c.end),
            });
          }
        }
      }
    });
    if (scheduledEmps.size === 0) {
      toast.show("No employees scheduled this week", "warning");
      return;
    }
    const now = new Date();
    const timeStr = now.toLocaleString("en-US", { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" });
    scheduledEmps.forEach((shiftList, empId) => {
      const emp = nonAdmin.find(e => e.id === empId);
      const shiftSummary = shiftList.map(s => s.day + " " + s.start + "-" + s.end).join(", ");
      setNotifications(prev => [{
        id: uid(), type: "schedule",
        title: "Schedule published: " + formatDate(weekStart) + " week",
        desc: (emp ? emp.name : "Employee") + ": " + shiftSummary,
        time: timeStr,
        empId: empId,
      }, ...prev]);
    });
    setSubmittedWeeks(prev => ({ ...prev, [weekStart]: now.toISOString() }));

    // Save payroll snapshot to history
    const empPayData = [];
    const empHoursMap = {};
    const empDaysMap = {};
    shifts.forEach(shift => {
      for (let d = 0; d < 7; d++) {
        const c = getCell(shift.id, d);
        if (c.empId) {
          const hrs = calcShiftHours(c.start, c.end);
          empHoursMap[c.empId] = (empHoursMap[c.empId] || 0) + hrs;
          if (!empDaysMap[c.empId]) empDaysMap[c.empId] = new Set();
          empDaysMap[c.empId].add(d);
        }
      }
    });
    nonAdmin.forEach(emp => {
      if (empHoursMap[emp.id]) {
        empPayData.push({ name: emp.name, hours: empHoursMap[emp.id], days: empDaysMap[emp.id] ? empDaysMap[emp.id].size : 0, rate: emp.rate || 0, gross: empHoursMap[emp.id] * (emp.rate || 0) });
      }
    });
    const totalHrs = empPayData.reduce((s, d) => s + d.hours, 0);
    const totalGross = empPayData.reduce((s, d) => s + d.gross, 0);
    setPayrollHistory(prev => [{
      id: uid(),
      weekStart,
      weekLabel: formatDate(weekStart) + " – " + formatDate(addDays(weekStart, 6)),
      submittedAt: now.toISOString(),
      employees: empPayData,
      totalHours: totalHrs,
      totalGross,
      employeeCount: empPayData.length,
    }, ...prev]);

    toast.show("Schedule submitted! " + scheduledEmps.size + " employee(s) notified.");
  };

  const unsubmitSchedule = () => {
    setSubmittedWeeks(prev => { const n = { ...prev }; delete n[weekStart]; return n; });
    toast.show("Schedule reopened for editing", "warning");
  };

  // Employee colors for schedule cells (same as payroll)
  const empColors = [
    { bg:"rgba(124,58,237,.12)", border:"rgba(124,58,237,.5)", text:"#7c3aed" },
    { bg:"rgba(59,130,246,.12)", border:"rgba(59,130,246,.5)", text:"#3b82f6" },
    { bg:"rgba(234,88,12,.12)", border:"rgba(234,88,12,.5)", text:"#ea580c" },
    { bg:"rgba(22,163,74,.12)", border:"rgba(22,163,74,.5)", text:"#16a34a" },
    { bg:"rgba(220,38,38,.12)", border:"rgba(220,38,38,.5)", text:"#dc2626" },
    { bg:"rgba(245,158,11,.12)", border:"rgba(245,158,11,.5)", text:"#f59e0b" },
    { bg:"rgba(6,182,212,.12)", border:"rgba(6,182,212,.5)", text:"#06b6d4" },
    { bg:"rgba(236,72,153,.12)", border:"rgba(236,72,153,.5)", text:"#ec4899" },
  ];
  const getEmpColor = (empId) => {
    const idx = nonAdmin.findIndex(e => e.id === empId);
    return idx >= 0 ? empColors[idx % empColors.length] : null;
  };

  // Delivery roles per employee per week
  const [deliveryRoles, setDeliveryRoles] = useState(() => {
    try { return JSON.parse(localStorage.getItem("crewos_delivery_roles")) || {}; } catch { return {}; }
  });
  useEffect(() => { localStorage.setItem("crewos_delivery_roles", JSON.stringify(deliveryRoles)); }, [deliveryRoles]);

  const getDeliveryRole = (empId) => deliveryRoles[weekStart + "_" + empId] || "";
  const setDeliveryRole = (empId, role) => {
    setDeliveryRoles(prev => ({ ...prev, [weekStart + "_" + empId]: role }));
  };

  // Get unique scheduled employees this week
  const getScheduledEmps = () => {
    const emps = new Set();
    shifts.forEach(shift => {
      for (let d = 0; d < 7; d++) {
        const c = getCell(shift.id, d);
        if (c.empId) emps.add(c.empId);
      }
    });
    return emps;
  };

  const scheduledCount = () => getScheduledEmps().size;

  return (
    <div>
      <div className="week-nav">
        <button className="btn small" onClick={() => setWeekStart(addDays(weekStart, -7))}>&#8592; Prev</button>
        <div className="week-label">{formatDate(weekStart)} &ndash; {formatDate(addDays(weekStart, 6))}</div>
        <button className="btn small" onClick={() => setWeekStart(addDays(weekStart, 7))}>Next &#8594;</button>
        {!isSubmitted && <button className="btn small amber" onClick={copyPrevWeek}>Copy Last Week</button>}
        {!isSubmitted && <button className="btn small danger" onClick={clearWeek}>Clear</button>}
      </div>

      {isSubmitted && (
        <div style={{marginBottom:14,padding:"14px 18px",background:"rgba(22,163,74,.06)",borderRadius:12,border:"1px solid rgba(22,163,74,.15)",fontSize:12,color:"var(--green)",display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:18}}>&#10003;</span>
          <div style={{flex:1}}>
            <strong>Schedule Published</strong> &mdash; {scheduledCount()} employee(s) notified.
            <br/><span style={{fontSize:11,opacity:.7}}>Submitted {new Date(submittedAt).toLocaleString("en-US",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}. Click &ldquo;Edit Schedule&rdquo; to make changes.</span>
          </div>
          <button className="btn small" onClick={unsubmitSchedule}
            style={{padding:"8px 16px",fontSize:12,background:"var(--amber)",color:"#fff",fontWeight:600,borderRadius:8,border:"none",cursor:"pointer",whiteSpace:"nowrap"}}>
            &#9998; Edit Schedule
          </button>
        </div>
      )}

      <div className="sched-wrap">
        <table className="sched-tbl">
          <thead>
            <tr style={{background:"#2c3e7f"}}>
              {DAYS.map((d, i) => (
                <th key={d} style={{background:"#2c3e7f",color:"#fff",textAlign:"center",fontSize:11,minWidth:130}}>
                  {DAY_FULL[i]}<br/>
                  <span style={{fontWeight:400,fontSize:10,opacity:.8}}>({formatDate(addDays(weekStart, i))})</span>
                </th>
              ))}
              <th style={{background:"#2c3e7f",color:"#fff",width:40}}></th>
            </tr>
          </thead>
          <tbody>
            {shifts.length === 0 && (
              <tr><td colSpan={8} style={{textAlign:"center",padding:"30px 0",color:"var(--muted)",fontSize:13}}>
                No shifts yet. Click &ldquo;+ Add Shift&rdquo; below to build the schedule.
              </td></tr>
            )}
            {shifts.map(shift => (
              <tr key={shift.id} style={{borderBottom:"2px solid var(--border)"}}>
                {DAYS.map((_, di) => {
                  const c = getCell(shift.id, di);
                  const hasEmp = !!c.empId;
                  const hrs = hasEmp ? calcShiftHours(c.start, c.end) : 0;
                  const emp = nonAdmin.find(e => e.id === c.empId);
                  const ec = hasEmp ? getEmpColor(c.empId) : null;
                  return (
                    <td key={di} style={{padding:"8px 5px",verticalAlign:"top",background:ec?ec.bg:"transparent"}}>
                      <div style={{display:"flex",flexDirection:"column",gap:4,minHeight:50}}>
                        <select
                          value={c.empId}
                          onChange={e => setCell(shift.id, di, { empId: e.target.value })}
                          disabled={isSubmitted}
                          style={{width:"100%",fontSize:11,padding:"5px 4px",fontWeight:600,borderRadius:6,
                            border:"1px solid "+(ec?ec.border:"var(--border2)"),
                            background:ec?ec.bg:"var(--bg2)",
                            color:ec?ec.text:"var(--muted)",
                            opacity:isSubmitted?.7:1}}
                        >
                          <option value="">-- Off --</option>
                          {nonAdmin.map(e => (
                            <option key={e.id} value={e.id}>{e.name}</option>
                          ))}
                        </select>
                        {hasEmp && (
                          <>
                            <select value={c.start} disabled={isSubmitted} onChange={e => setCell(shift.id, di, {start: e.target.value})} style={{width:"100%",fontSize:10,padding:"3px 2px",opacity:isSubmitted?.7:1}}>
                              {TIME_OPTIONS.map(t => <option key={t.val} value={t.val}>{t.label}</option>)}
                            </select>
                            <select value={c.end} disabled={isSubmitted} onChange={e => setCell(shift.id, di, {end: e.target.value})} style={{width:"100%",fontSize:10,padding:"3px 2px",opacity:isSubmitted?.7:1}}>
                              {TIME_OPTIONS.map(t => <option key={t.val} value={t.val}>{t.label}</option>)}
                            </select>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                              <span style={{fontSize:9,color:ec?ec.text:"var(--muted)",fontFamily:"var(--mono)",fontWeight:600}}>{hrs}h</span>
                              {emp && <span style={{fontSize:8,color:ec?ec.text:"var(--muted2)",fontWeight:500}}>{emp.name.split(" ")[0]}</span>}
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  );
                })}
                <td style={{textAlign:"center",verticalAlign:"middle"}}>
                  {!isSubmitted && <button onClick={() => removeShift(shift.id)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--red)",fontSize:14,padding:4}} title="Remove shift">&#10005;</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ═══ VISUAL SCHEDULE CALENDAR ═══ */}
      {isSubmitted && (() => {
        const calDays = DAY_FULL.map((dayName, di) => {
          const dayDate = new Date(new Date(weekStart + "T00:00:00"));
          dayDate.setDate(dayDate.getDate() + di);
          const dateLabel = dayDate.toLocaleDateString("en-US", { month:"short", day:"numeric" }).toUpperCase();
          const blocks = [];
          shifts.forEach(shift => {
            const c = getCell(shift.id, di);
            if (c.empId) {
              const emp = nonAdmin.find(e => e.id === c.empId);
              const ec = getEmpColor(c.empId);
              const hrs = calcShiftHours(c.start, c.end);
              blocks.push({ emp, ec, start: c.start, end: c.end, hrs });
            }
          });
          blocks.sort((a, b) => a.start.localeCompare(b.start));
          return { dayName, dateLabel, blocks };
        });
        return (
          <div className="card" style={{padding:0,overflow:"hidden",marginTop:16,marginBottom:16}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)"}}>
              {calDays.map((day, i) => (
                <div key={i} style={{borderRight:i<6?"1px solid var(--border)":"none",minHeight:140}}>
                  <div style={{textAlign:"center",padding:"12px 6px 8px",borderBottom:"1px solid var(--border)",background:"var(--bg4)"}}>
                    <div style={{fontSize:13,fontWeight:700,color:"var(--text)"}}>{day.dayName}</div>
                    <div style={{fontSize:11,color:"var(--muted2)",marginTop:2}}>({day.dateLabel})</div>
                  </div>
                  <div style={{padding:"8px 6px"}}>
                    {day.blocks.length === 0 ? (
                      <div style={{fontSize:11,color:"var(--muted2)",textAlign:"center",padding:"20px 0",fontStyle:"italic"}}>No shifts</div>
                    ) : (
                      day.blocks.map((blk, bi) => (
                        <div key={bi} style={{
                          background: blk.ec ? blk.ec.bg : "var(--bg4)",
                          borderLeft: "3px solid " + (blk.ec ? blk.ec.border : "var(--border)"),
                          borderRadius: "0 8px 8px 0",
                          padding: "8px 8px",
                          marginBottom: 6,
                        }}>
                          <div style={{fontSize:12,fontWeight:700,color:blk.ec?blk.ec.text:"var(--text)",marginBottom:4}}>{blk.emp ? blk.emp.name : "?"}</div>
                          <div style={{fontSize:11,color:"var(--text)",fontWeight:500}}>
                            {formatTimeLabel(blk.start)} – {formatTimeLabel(blk.end)}
                          </div>
                          <div style={{fontSize:11,fontFamily:"var(--mono)",color:blk.ec?blk.ec.text:"var(--muted)",fontWeight:600,marginTop:3}}>
                            {blk.hrs}h
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Delivery Role Assignment */}
      {(() => {
        const empIds = [...getScheduledEmps()];
        if (empIds.length === 0) return null;
        return (
          <div style={{marginTop:16,padding:"14px 18px",background:"rgba(124,58,237,.04)",borderRadius:12,border:"1px solid rgba(124,58,237,.12)"}}>
            <div style={{fontSize:13,fontWeight:600,color:"var(--purple)",marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:15}}>&#128666;</span> Delivery Roles
              <span style={{fontSize:11,fontWeight:400,color:"var(--muted2)",marginLeft:4}}>— Assigned when a vendor checks in</span>
            </div>
            <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
              {empIds.map(empId => {
                const emp = nonAdmin.find(e => e.id === empId);
                if (!emp) return null;
                const role = getDeliveryRole(empId);
                return (
                  <div key={empId} style={{display:"flex",alignItems:"center",gap:8,background:"var(--bg2)",padding:"6px 12px",borderRadius:8,border:"1px solid var(--border)"}}>
                    <span style={{fontSize:12,fontWeight:500}}>{emp.name}</span>
                    <select value={role} onChange={e => setDeliveryRole(empId, e.target.value)} disabled={isSubmitted}
                      style={{fontSize:11,padding:"4px 6px",borderRadius:6,fontWeight:600,
                        color:role==="A"?"var(--purple)":role==="B"?"var(--blue)":"var(--muted)",
                        background:role==="A"?"rgba(124,58,237,.08)":role==="B"?"rgba(37,99,235,.08)":"var(--bg2)",
                        opacity:isSubmitted?.7:1}}>
                      <option value="">No role</option>
                      <option value="A">Role A</option>
                      <option value="B">Role B</option>
                    </select>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      <div style={{display:"flex",gap:10,marginTop:12,alignItems:"center",flexWrap:"wrap"}}>
        {!isSubmitted && (
          <>
            <button className="btn primary small" onClick={addShift} style={{padding:"10px 20px",fontSize:13}}>+ Add Shift</button>
            <button onClick={submitSchedule}
              style={{padding:"10px 24px",fontSize:13,background:"var(--green)",color:"#fff",fontWeight:600,borderRadius:10,border:"none",cursor:"pointer",boxShadow:"0 2px 8px rgba(22,163,74,.18)",transition:"all .15s"}}>
              &#10003; Submit Schedule
            </button>
          </>
        )}
        {shifts.length > 0 && <span style={{fontSize:12,color:"var(--muted2)"}}>{scheduledCount()} employee{scheduledCount()!==1?"s":""} scheduled</span>}
      </div>

      {!isSubmitted && (
        <div className="sched-rule">
          <span style={{fontSize:16}}>&#9888;</span>
          Schedule must be submitted by Saturday 11:59 PM &middot; Employees receive 24hr minimum notice
        </div>
      )}

      {/* ═══ SCHEDULED PAY SUMMARY ═══ */}
      {(() => {
        // Calculate scheduled hours per employee from the schedule grid
        const empHoursMap = {};
        const empDaysMap = {};
        shifts.forEach(shift => {
          for (let d = 0; d < 7; d++) {
            const c = getCell(shift.id, d);
            if (c.empId) {
              const hrs = calcShiftHours(c.start, c.end);
              empHoursMap[c.empId] = (empHoursMap[c.empId] || 0) + hrs;
              if (!empDaysMap[c.empId]) empDaysMap[c.empId] = new Set();
              empDaysMap[c.empId].add(d);
            }
          }
        });

        const scheduledEmps = nonAdmin.filter(e => empHoursMap[e.id] > 0);
        if (scheduledEmps.length === 0) return null;

        const payData = scheduledEmps.map(emp => {
          const hrs = empHoursMap[emp.id] || 0;
          const days = empDaysMap[emp.id] ? empDaysMap[emp.id].size : 0;
          const gross = hrs * (emp.rate || 0);
          const filing = emp.filingStatus || "Single/MFS";
          // Tax calculation (same as Payroll tab)
          const calcSchedTaxes = (g, f) => {
            const annual = g * 52;
            let fedTax = 0;
            if (f === "HoH") {
              if (annual <= 16550) fedTax = annual * 0.10;
              else if (annual <= 63100) fedTax = 1655 + (annual - 16550) * 0.12;
              else if (annual <= 100500) fedTax = 7240.60 + (annual - 63100) * 0.22;
              else if (annual <= 191950) fedTax = 15468.60 + (annual - 100500) * 0.24;
              else fedTax = 37416.60 + (annual - 191950) * 0.32;
            } else if (f === "MFJ") {
              if (annual <= 23200) fedTax = annual * 0.10;
              else if (annual <= 94300) fedTax = 2320 + (annual - 23200) * 0.12;
              else if (annual <= 201050) fedTax = 10852 + (annual - 94300) * 0.22;
              else fedTax = 34337 + (annual - 201050) * 0.24;
            } else {
              if (annual <= 11600) fedTax = annual * 0.10;
              else if (annual <= 47150) fedTax = 1160 + (annual - 11600) * 0.12;
              else if (annual <= 100525) fedTax = 5426 + (annual - 47150) * 0.22;
              else if (annual <= 191950) fedTax = 17168.50 + (annual - 100525) * 0.24;
              else fedTax = 39110.50 + (annual - 191950) * 0.32;
            }
            fedTax = fedTax / 52;
            let nyTax = 0;
            if (annual <= 8500) nyTax = annual * 0.04;
            else if (annual <= 11700) nyTax = 340 + (annual - 8500) * 0.045;
            else if (annual <= 13900) nyTax = 484 + (annual - 11700) * 0.0525;
            else if (annual <= 80650) nyTax = 600 + (annual - 13900) * 0.0585;
            else if (annual <= 215400) nyTax = 4504.89 + (annual - 80650) * 0.0625;
            else nyTax = 12921.78 + (annual - 215400) * 0.0685;
            nyTax = nyTax / 52;
            const ss = g * 0.062;
            const medicare = g * 0.0145;
            const nySdi = Math.min(g * 0.005, 0.60 * 7 / 52);
            const nyPfl = g * 0.00455;
            const empTaxes = fedTax + nyTax + ss + medicare + nySdi + nyPfl;
            const employerSs = g * 0.062;
            const employerMedicare = g * 0.0145;
            const employerTaxes = employerSs + employerMedicare;
            return { fedTax, nyTax, ss, medicare, nySdi, nyPfl, empTaxes, employerSs, employerMedicare, employerTaxes, net: g - empTaxes, totalCost: g + employerTaxes };
          };
          const taxes = calcSchedTaxes(gross, filing === "Single/MFS" ? "S" : filing === "HoH" ? "HoH" : "MFJ");
          return { emp, hrs, days, gross, filing, taxes };
        });

        const totHrs = payData.reduce((s, d) => s + d.hrs, 0);
        const totGross = payData.reduce((s, d) => s + d.gross, 0);
        const totEmpTax = payData.reduce((s, d) => s + d.taxes.empTaxes, 0);
        const totNet = payData.reduce((s, d) => s + d.taxes.net, 0);
        const totErTax = payData.reduce((s, d) => s + d.taxes.employerTaxes, 0);
        const totCost = payData.reduce((s, d) => s + d.taxes.totalCost, 0);

        return (
          <div style={{marginTop:24}}>
            <div style={{marginBottom:12,display:"flex",alignItems:"center",gap:10}}>
              <div style={{fontSize:18,fontWeight:700}}>Scheduled Pay Summary</div>
              <span style={{fontSize:11,padding:"3px 10px",border:"1px solid var(--border)",borderRadius:20,color:"var(--muted2)"}}>With Tax Estimates</span>
            </div>

            <div style={{background:"rgba(59,130,246,.06)",border:"1px solid rgba(59,130,246,.2)",borderRadius:10,padding:"10px 14px",marginBottom:16,fontSize:12,color:"#3b82f6"}}>
              &#x1F4CB; This is the <strong>projected</strong> payroll based on the schedule above. Actual payroll (under the Payroll tab) is based on employee clock-in/clock-out times and may differ.
            </div>

            <div style={{background:"rgba(245,158,11,.06)",border:"1px solid rgba(245,158,11,.3)",borderRadius:10,padding:"10px 14px",marginBottom:16,fontSize:12,color:"var(--amber)"}}>
              &#x26A0; Tax withholding amounts are <strong>estimates</strong> based on 2025 IRS/NYS brackets and weekly pay frequency. Actual payroll taxes through iSolved may differ slightly. Flat-rate taxes (SS, Medicare, SDI, PFL) are exact.
            </div>

            {/* Employee Pay Cards */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))",gap:14,marginBottom:20}}>
              {payData.map(({ emp, hrs, days, gross, filing, taxes }) => {
                const ec = getEmpColor(emp.id);
                const showTax = showSchedTaxBreakdown[emp.id];
                return (
                <div key={emp.id} className="card" style={{padding:0,overflow:"hidden",borderLeft:"4px solid "+(ec?ec.border:"rgba(59,130,246,.5)")}}>
                  <div style={{padding:"14px 16px"}}>
                    <div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:8}}>
                      <span style={{fontSize:16,fontWeight:700,color:ec?ec.text:"#3b82f6"}}>{emp.name}</span>
                      <span style={{fontSize:12,color:"var(--muted2)"}}>({filing})</span>
                    </div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:16,fontSize:13,marginBottom:8}}>
                      <div>Hours: <strong>{hrs}</strong></div>
                      <div>Days: <strong>{days}</strong></div>
                      <div>Rate: <strong>${(emp.rate||0).toFixed(2)}/hr</strong></div>
                      <div>Gross: <strong style={{color:"var(--text)"}}>${gross.toFixed(2)}</strong></div>
                    </div>
                    <div style={{cursor:"pointer",fontSize:12,color:"#3b82f6",marginBottom:showTax?8:0}} onClick={() => setShowSchedTaxBreakdown(p => ({...p, [emp.id]:!p[emp.id]}))}>
                      {showTax ? "\u25B2" : "\u25BC"} {showTax ? "Hide" : "Show"} tax breakdown
                    </div>
                    {showTax && (
                      <div style={{fontSize:12,color:"var(--muted2)",padding:"8px 0",lineHeight:1.8}}>
                        <div style={{display:"flex",justifyContent:"space-between"}}><span>Federal Income Tax</span><span style={{fontFamily:"var(--mono)"}}>${taxes.fedTax.toFixed(2)}</span></div>
                        <div style={{display:"flex",justifyContent:"space-between"}}><span>NY State Income Tax</span><span style={{fontFamily:"var(--mono)"}}>${taxes.nyTax.toFixed(2)}</span></div>
                        <div style={{display:"flex",justifyContent:"space-between"}}><span>Social Security (6.2%)</span><span style={{fontFamily:"var(--mono)"}}>${taxes.ss.toFixed(2)}</span></div>
                        <div style={{display:"flex",justifyContent:"space-between"}}><span>Medicare (1.45%)</span><span style={{fontFamily:"var(--mono)"}}>${taxes.medicare.toFixed(2)}</span></div>
                        <div style={{display:"flex",justifyContent:"space-between"}}><span>NY SDI</span><span style={{fontFamily:"var(--mono)"}}>${taxes.nySdi.toFixed(2)}</span></div>
                        <div style={{display:"flex",justifyContent:"space-between"}}><span>NY PFL (0.455%)</span><span style={{fontFamily:"var(--mono)"}}>${taxes.nyPfl.toFixed(2)}</span></div>
                      </div>
                    )}
                  </div>
                  <div style={{borderTop:"1px solid var(--border)",padding:"10px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",background:"var(--bg4)"}}>
                    <div><span style={{fontSize:13}}>Net Pay: </span><strong style={{fontSize:16,color:"var(--green)"}}>${taxes.net.toFixed(2)}</strong></div>
                    <div><span style={{fontSize:11,color:"var(--red)"}}>Total Cost: ${taxes.totalCost.toFixed(2)}</span></div>
                  </div>
                </div>
                );
              })}
            </div>

            {/* Totals Bar */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:8}}>
              {[
                { label:"Total Gross Wages", val:"$"+totGross.toFixed(2), bg:"#1e3a5f", color:"#fff" },
                { label:"Total Employee Taxes", val:"$"+totEmpTax.toFixed(2), bg:"#1e3a5f", color:"#fff" },
                { label:"Total Net Pay", val:"$"+totNet.toFixed(2), bg:"#1e3a5f", color:"#fff" },
                { label:"Total Employer Taxes", val:"$"+totErTax.toFixed(2), bg:"#1e3a5f", color:"#fff" },
                { label:"Total Payroll Cost", val:"$"+totCost.toFixed(2), bg:"#166534", color:"#fff" },
              ].map((t,i) => (
                <div key={i} style={{background:t.bg,color:t.color,borderRadius:10,padding:"12px 14px",textAlign:"center"}}>
                  <div style={{fontSize:11,opacity:.8,marginBottom:4}}>{t.label}</div>
                  <div style={{fontSize:18,fontWeight:700}}>{t.val}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ═══ PAYROLL HISTORY ═══ */}
      <div style={{marginTop:30}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
          <div style={{fontSize:18,fontWeight:700,display:"flex",alignItems:"center",gap:8}}>
            Payroll History
            {payrollHistory.length > 0 && <span style={{fontSize:12,fontWeight:400,color:"var(--muted2)",background:"var(--bg4)",padding:"2px 10px",borderRadius:20,border:"1px solid var(--border)"}}>{payrollHistory.length} record{payrollHistory.length!==1?"s":""}</span>}
          </div>
          {payrollHistory.length > 0 && (
            <button className="btn small" onClick={() => setShowHistory(!showHistory)}>{showHistory ? "Hide" : "Show"} History</button>
          )}
        </div>

        {payrollHistory.length === 0 && (
          <div style={{color:"var(--muted2)",fontSize:13,padding:"30px 0",textAlign:"center",background:"var(--bg4)",borderRadius:12,border:"1px solid var(--border)"}}>
            No payroll history yet. Submit a schedule to create the first record.
          </div>
        )}

        {showHistory && payrollHistory.length > 0 && (
          <div>
            {/* Summary Table */}
            <div className="card" style={{padding:0,overflow:"hidden",marginBottom:16}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead>
                  <tr style={{background:"#2c3e7f",color:"#fff"}}>
                    <th style={{padding:"10px 14px",textAlign:"left"}}>Week</th>
                    <th style={{padding:"10px 14px",textAlign:"center"}}>Submitted</th>
                    <th style={{padding:"10px 14px",textAlign:"center"}}>Employees</th>
                    <th style={{padding:"10px 14px",textAlign:"center"}}>Hours</th>
                    <th style={{padding:"10px 14px",textAlign:"right"}}>Projected Payroll</th>
                    <th style={{padding:"10px 14px",textAlign:"center",width:40}}></th>
                  </tr>
                </thead>
                <tbody>
                  {payrollHistory.map((rec, ri) => (
                    <React.Fragment key={rec.id}>
                      <tr style={{borderBottom:"1px solid var(--border)",cursor:"pointer",background:ri%2===0?"transparent":"var(--bg4)"}}
                        onClick={() => setPayrollHistory(prev => prev.map(r => r.id === rec.id ? {...r, _expanded: !r._expanded} : r))}>
                        <td style={{padding:"10px 14px",fontWeight:600}}>{rec.weekLabel}</td>
                        <td style={{padding:"10px 14px",textAlign:"center",fontSize:11,color:"var(--muted2)"}}>{new Date(rec.submittedAt).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</td>
                        <td style={{padding:"10px 14px",textAlign:"center"}}>{rec.employeeCount}</td>
                        <td style={{padding:"10px 14px",textAlign:"center"}}>{rec.totalHours}h</td>
                        <td style={{padding:"10px 14px",textAlign:"right",fontWeight:700,color:"var(--green)"}}>${rec.totalGross.toFixed(2)}</td>
                        <td style={{padding:"10px 14px",textAlign:"center",fontSize:16,color:"var(--muted2)"}}>{rec._expanded ? "\u25B2" : "\u25BC"}</td>
                      </tr>
                      {rec._expanded && (
                        <tr>
                          <td colSpan={6} style={{padding:"0 14px 14px",background:"var(--bg4)"}}>
                            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:10,paddingTop:10}}>
                              {rec.employees.map((emp, ei) => {
                                const ec = empColors[ei % empColors.length];
                                return (
                                  <div key={ei} style={{background:"var(--bg2)",borderRadius:10,padding:"10px 14px",borderLeft:"4px solid "+ec.border}}>
                                    <div style={{fontWeight:600,color:ec.text,marginBottom:4}}>{emp.name}</div>
                                    <div style={{display:"flex",gap:16,fontSize:12,color:"var(--muted)"}}>
                                      <span>{emp.hours}h</span>
                                      <span>{emp.days} day{emp.days!==1?"s":""}</span>
                                      <span>${emp.rate.toFixed(2)}/hr</span>
                                      <span style={{fontWeight:600,color:"var(--green)"}}>${emp.gross.toFixed(2)}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Running Totals */}
            {payrollHistory.length > 1 && (
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:8}}>
                {[
                  { label:"Total Weeks on Record", val: payrollHistory.length, bg:"#1e3a5f", color:"#fff" },
                  { label:"All-Time Scheduled Hours", val: payrollHistory.reduce((s,r) => s + r.totalHours, 0) + "h", bg:"#1e3a5f", color:"#fff" },
                  { label:"All-Time Projected Payroll", val: "$" + payrollHistory.reduce((s,r) => s + r.totalGross, 0).toFixed(2), bg:"#166534", color:"#fff" },
                ].map((t,i) => (
                  <div key={i} style={{background:t.bg,color:t.color,borderRadius:10,padding:"12px 14px",textAlign:"center"}}>
                    <div style={{fontSize:11,opacity:.8,marginBottom:4}}>{t.label}</div>
                    <div style={{fontSize:18,fontWeight:700}}>{t.val}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ADMIN: PAYROLL ──────────────────────────────────────────────────────────
function AdminPayroll({ employees, setEmployees, clockLogs, overrides, setOverrides, toast }) {
  const [period, setPeriod] = useState("weekly");
  const [overrideModal, setOverrideModal] = useState(null);
  const [overrideHours, setOverrideHours] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [showTaxBreakdown, setShowTaxBreakdown] = useState({});
  const nonAdmin = employees.filter(e => e.role !== "admin");
  const weekStart = getWeekStart();
  const getActualHours = (empId) => calcHours(clockLogs.filter(l => l.employeeId === empId));
  const getOverride = (empId) => overrides[weekStart + "_" + empId];

  const saveOverride = () => {
    if (!overrideReason.trim()) { toast.show("Reason is required", "error"); return; }
    setOverrides(prev => ({ ...prev, [weekStart + "_" + overrideModal.id]: { hours: parseFloat(overrideHours)||0, reason: overrideReason } }));
    toast.show("Hours overridden for " + overrideModal.name);
    setOverrideModal(null); setOverrideHours(""); setOverrideReason("");
  };

  const totalHours = nonAdmin.reduce((s,e) => { const ov = getOverride(e.id); return s + (ov ? ov.hours : getActualHours(e.id)); }, 0);
  const totalPay = nonAdmin.reduce((s,e) => { const ov = getOverride(e.id); return s + (ov ? ov.hours : getActualHours(e.id)) * (e.rate||0); }, 0);

  // Employee colors for calendar blocks
  const empColors = [
    { bg:"rgba(124,58,237,.12)", border:"rgba(124,58,237,.5)", text:"#7c3aed" },
    { bg:"rgba(59,130,246,.12)", border:"rgba(59,130,246,.5)", text:"#3b82f6" },
    { bg:"rgba(234,88,12,.12)", border:"rgba(234,88,12,.5)", text:"#ea580c" },
    { bg:"rgba(22,163,74,.12)", border:"rgba(22,163,74,.5)", text:"#16a34a" },
    { bg:"rgba(220,38,38,.12)", border:"rgba(220,38,38,.5)", text:"#dc2626" },
    { bg:"rgba(245,158,11,.12)", border:"rgba(245,158,11,.5)", text:"#f59e0b" },
    { bg:"rgba(6,182,212,.12)", border:"rgba(6,182,212,.5)", text:"#06b6d4" },
    { bg:"rgba(236,72,153,.12)", border:"rgba(236,72,153,.5)", text:"#ec4899" },
  ];

  // Build calendar data: for each day, collect all shifts from all employees
  const days = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
  const dayShort = ["MON","TUE","WED","THU","FRI","SAT","SUN"];
  const wsDate = new Date(weekStart + "T00:00:00");

  const calendarDays = days.map((dayName, i) => {
    const dayDate = new Date(wsDate); dayDate.setDate(wsDate.getDate() + i);
    const dayStr = dayDate.toDateString();
    const dateLabel = dayDate.toLocaleDateString("en-US", { month:"short", day:"numeric" }).toUpperCase();

    const blocks = [];
    nonAdmin.forEach((emp, empIdx) => {
      const empLogs = clockLogs.filter(l => l.employeeId === emp.id).sort((a,b) => new Date(a.time) - new Date(b.time));
      const dayLogs = empLogs.filter(l => new Date(l.time).toDateString() === dayStr);
      let curIn = null;
      for (const l of dayLogs) {
        if (l.type === "in") curIn = new Date(l.time);
        else if (l.type === "out" && curIn) {
          const hrs = (new Date(l.time) - curIn) / 3600000;
          blocks.push({ emp, empIdx, inTime: curIn, outTime: new Date(l.time), hours: hrs, active: false });
          curIn = null;
        }
      }
      if (curIn) blocks.push({ emp, empIdx, inTime: curIn, outTime: null, hours: (new Date() - curIn) / 3600000, active: true });
    });

    // Sort blocks by clock-in time
    blocks.sort((a,b) => a.inTime - b.inTime);
    return { dayName, dateLabel, dayShort: dayShort[i], blocks };
  });

  const fmtTime = (d) => d.toLocaleTimeString([], { hour:"numeric", minute:"2-digit" });
  const fmtHrs = (h) => Math.round(h * 1000) / 1000;

  return (
    <div>
      <div className="period-tabs">
        {["weekly","biweekly","monthly"].map(p => <div key={p} className={"period-tab" + (period===p?" on":"")} onClick={() => setPeriod(p)}>{p.charAt(0).toUpperCase()+p.slice(1)}</div>)}
      </div>
      <div className="stat-grid">
        <div className="stat"><div className="stat-lbl">Total Hours</div><div className="stat-val">{Math.round(totalHours*10)/10}h</div><div className="stat-sub">This {period==="weekly"?"week":period==="biweekly"?"2 weeks":"month"}</div></div>
        <div className="stat"><div className="stat-lbl">Total Pay</div><div className="stat-val" style={{color:"var(--green)"}}>${totalPay.toFixed(2)}</div><div className="stat-sub">Before taxes</div></div>
        <div className="stat"><div className="stat-lbl">Active Staff</div><div className="stat-val">{nonAdmin.length}</div><div className="stat-sub">Employees</div></div>
        <div className="stat"><div className="stat-lbl">Overrides</div><div className="stat-val" style={{color:"var(--amber)"}}>{Object.keys(overrides).length}</div><div className="stat-sub">On record</div></div>
      </div>

      {/* Employee Color Legend */}
      <div style={{display:"flex",flexWrap:"wrap",gap:12,marginBottom:16,padding:"10px 14px",background:"var(--bg4)",borderRadius:10,border:"1px solid var(--border)"}}>
        {nonAdmin.map((emp, idx) => {
          const c = empColors[idx % empColors.length];
          return (
            <div key={emp.id} style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer"}} onClick={() => { setOverrideModal(emp); setOverrideHours(String(getOverride(emp.id)?.hours || getActualHours(emp.id))); setOverrideReason(getOverride(emp.id)?.reason||""); }}>
              <div style={{width:12,height:12,borderRadius:3,background:c.bg,border:"2px solid "+c.border}} />
              <span style={{fontSize:12,fontWeight:500,color:c.text}}>{emp.name}</span>
            </div>
          );
        })}
      </div>

      {/* Calendar Weekly View */}
      <div className="card" style={{padding:0,overflow:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)"}}>
          {calendarDays.map((day, i) => (
            <div key={i} style={{borderRight:i<6?"1px solid var(--border)":"none",minHeight:160}}>
              {/* Day header */}
              <div style={{textAlign:"center",padding:"12px 6px 8px",borderBottom:"1px solid var(--border)",background:"var(--bg4)"}}>
                <div style={{fontSize:13,fontWeight:700,color:"var(--text)"}}>{day.dayName}</div>
                <div style={{fontSize:11,color:"var(--muted2)",marginTop:2}}>({day.dateLabel})</div>
              </div>

              {/* Shift blocks */}
              <div style={{padding:"8px 6px"}}>
                {day.blocks.length === 0 ? (
                  <div style={{fontSize:11,color:"var(--muted2)",textAlign:"center",padding:"20px 0",fontStyle:"italic"}}>No shifts</div>
                ) : (
                  day.blocks.map((blk, bi) => {
                    const c = empColors[blk.empIdx % empColors.length];
                    return (
                      <div key={bi} style={{
                        background: c.bg,
                        borderLeft: "3px solid " + c.border,
                        borderRadius: "0 8px 8px 0",
                        padding: "8px 8px",
                        marginBottom: 6,
                      }}>
                        <div style={{fontSize:12,fontWeight:700,color:c.text,marginBottom:4}}>{blk.emp.name}</div>
                        <div style={{fontSize:11,color:"var(--text)",fontWeight:500}}>
                          {fmtTime(blk.inTime)} - {blk.outTime ? fmtTime(blk.outTime) : <span style={{color:"var(--amber)"}}>Active</span>}
                        </div>
                        <div style={{fontSize:11,fontFamily:"var(--mono)",color:c.text,fontWeight:600,marginTop:3}}>
                          {fmtHrs(blk.hours)} hours
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ WEEKLY PAY SUMMARY ═══ */}
      {(() => {
        // Tax calculation helper (2025 IRS/NYS weekly estimates)
        const calcTaxes = (gross, filing) => {
          const annual = gross * 52;
          // Federal income tax (2025 brackets, simplified weekly)
          let fedTax = 0;
          if (filing === "HoH") {
            if (annual <= 16550) fedTax = annual * 0.10;
            else if (annual <= 63100) fedTax = 1655 + (annual - 16550) * 0.12;
            else if (annual <= 100500) fedTax = 7240.60 + (annual - 63100) * 0.22;
            else if (annual <= 191950) fedTax = 15468.60 + (annual - 100500) * 0.24;
            else fedTax = 37416.60 + (annual - 191950) * 0.32;
          } else if (filing === "MFJ") {
            if (annual <= 23200) fedTax = annual * 0.10;
            else if (annual <= 94300) fedTax = 2320 + (annual - 23200) * 0.12;
            else if (annual <= 201050) fedTax = 10852 + (annual - 94300) * 0.22;
            else fedTax = 34337 + (annual - 201050) * 0.24;
          } else {
            // Single / MFS
            if (annual <= 11600) fedTax = annual * 0.10;
            else if (annual <= 47150) fedTax = 1160 + (annual - 11600) * 0.12;
            else if (annual <= 100525) fedTax = 5426 + (annual - 47150) * 0.22;
            else if (annual <= 191950) fedTax = 17168.50 + (annual - 100525) * 0.24;
            else fedTax = 39110.50 + (annual - 191950) * 0.32;
          }
          fedTax = fedTax / 52;

          // NYS income tax (2025 brackets, simplified weekly)
          let nyTax = 0;
          if (annual <= 8500) nyTax = annual * 0.04;
          else if (annual <= 11700) nyTax = 340 + (annual - 8500) * 0.045;
          else if (annual <= 13900) nyTax = 484 + (annual - 11700) * 0.0525;
          else if (annual <= 80650) nyTax = 600 + (annual - 13900) * 0.0585;
          else if (annual <= 215400) nyTax = 4504.89 + (annual - 80650) * 0.0625;
          else nyTax = 12921.78 + (annual - 215400) * 0.0685;
          nyTax = nyTax / 52;

          const ss = gross * 0.062; // Social Security 6.2%
          const medicare = gross * 0.0145; // Medicare 1.45%
          const nySdi = Math.min(gross * 0.005, 0.60 * 7 / 52); // NY SDI ~0.5% capped
          const nyPfl = gross * 0.00455; // NY PFL 0.455%
          const empTaxes = fedTax + nyTax + ss + medicare + nySdi + nyPfl;
          const employerSs = gross * 0.062;
          const employerMedicare = gross * 0.0145;
          const employerTaxes = employerSs + employerMedicare;
          return { fedTax, nyTax, ss, medicare, nySdi, nyPfl, empTaxes, employerSs, employerMedicare, employerTaxes, net: gross - empTaxes, totalCost: gross + employerTaxes };
        };

        // Count days worked
        const countDays = (empId) => {
          const empLogs = clockLogs.filter(l => l.employeeId === empId);
          const daySet = new Set();
          empLogs.forEach(l => daySet.add(new Date(l.time).toDateString()));
          return daySet.size;
        };

        // Compute per-employee
        const payData = nonAdmin.map((emp, idx) => {
          const ov = getOverride(emp.id);
          const hrs = ov ? ov.hours : getActualHours(emp.id);
          const gross = hrs * (emp.rate || 0);
          const filing = emp.filingStatus || "Single/MFS";
          const taxes = calcTaxes(gross, filing === "Single/MFS" ? "S" : filing === "HoH" ? "HoH" : "MFJ");
          const days = countDays(emp.id);
          return { emp, idx, hrs, gross, filing, taxes, days };
        });

        const totGross = payData.reduce((s, d) => s + d.gross, 0);
        const totEmpTax = payData.reduce((s, d) => s + d.taxes.empTaxes, 0);
        const totNet = payData.reduce((s, d) => s + d.taxes.net, 0);
        const totErTax = payData.reduce((s, d) => s + d.taxes.employerTaxes, 0);
        const totCost = payData.reduce((s, d) => s + d.taxes.totalCost, 0);

        return (
          <>
            <div style={{marginTop:24,marginBottom:12,display:"flex",alignItems:"center",gap:10}}>
              <div style={{fontSize:18,fontWeight:700}}>Weekly Pay Summary</div>
              <span style={{fontSize:11,padding:"3px 10px",border:"1px solid var(--border)",borderRadius:20,color:"var(--muted2)"}}>With Tax Estimates</span>
            </div>

            <div style={{background:"rgba(245,158,11,.06)",border:"1px solid rgba(245,158,11,.3)",borderRadius:10,padding:"10px 14px",marginBottom:16,fontSize:12,color:"var(--amber)"}}>
              \u26A0 Tax withholding amounts are <strong>estimates</strong> based on 2025 IRS/NYS brackets and weekly pay frequency. Actual payroll taxes through iSolved may differ slightly. Flat-rate taxes (SS, Medicare, SDI, PFL) are exact.
            </div>

            {/* Employee Pay Cards */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))",gap:14,marginBottom:20}}>
              {payData.map(({ emp, idx, hrs, gross, filing, taxes, days }) => {
                const c = empColors[idx % empColors.length];
                const showTax = showTaxBreakdown[emp.id];
                return (
                  <div key={emp.id} className="card" style={{padding:0,overflow:"hidden",borderLeft:"4px solid "+c.border}}>
                    <div style={{padding:"14px 16px"}}>
                      <div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:8}}>
                        <span style={{fontSize:16,fontWeight:700,color:c.text}}>{emp.name}</span>
                        <span style={{fontSize:12,color:"var(--muted2)"}}>({filing})</span>
                      </div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:16,fontSize:13,marginBottom:8}}>
                        <div>Hours: <strong>{hrs}</strong></div>
                        <div>Days: <strong>{days}</strong></div>
                        <div>Rate: <strong>${(emp.rate||0).toFixed(2)}/hr</strong></div>
                        <div>Gross: <strong style={{color:"var(--text)"}}>${gross.toFixed(2)}</strong></div>
                      </div>
                      <div style={{cursor:"pointer",fontSize:12,color:"#3b82f6",marginBottom:showTax?8:0}} onClick={() => setShowTaxBreakdown(p => ({...p, [emp.id]:!p[emp.id]}))}>
                        {showTax ? "\u25B2" : "\u25BC"} {showTax ? "Hide" : "Show"} tax breakdown
                      </div>
                      {showTax && (
                        <div style={{fontSize:12,color:"var(--muted2)",padding:"8px 0",lineHeight:1.8}}>
                          <div style={{display:"flex",justifyContent:"space-between"}}><span>Federal Income Tax</span><span style={{fontFamily:"var(--mono)"}}>${taxes.fedTax.toFixed(2)}</span></div>
                          <div style={{display:"flex",justifyContent:"space-between"}}><span>NY State Income Tax</span><span style={{fontFamily:"var(--mono)"}}>${taxes.nyTax.toFixed(2)}</span></div>
                          <div style={{display:"flex",justifyContent:"space-between"}}><span>Social Security (6.2%)</span><span style={{fontFamily:"var(--mono)"}}>${taxes.ss.toFixed(2)}</span></div>
                          <div style={{display:"flex",justifyContent:"space-between"}}><span>Medicare (1.45%)</span><span style={{fontFamily:"var(--mono)"}}>${taxes.medicare.toFixed(2)}</span></div>
                          <div style={{display:"flex",justifyContent:"space-between"}}><span>NY SDI</span><span style={{fontFamily:"var(--mono)"}}>${taxes.nySdi.toFixed(2)}</span></div>
                          <div style={{display:"flex",justifyContent:"space-between"}}><span>NY PFL (0.455%)</span><span style={{fontFamily:"var(--mono)"}}>${taxes.nyPfl.toFixed(2)}</span></div>
                        </div>
                      )}
                    </div>
                    <div style={{borderTop:"1px solid var(--border)",padding:"10px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",background:"var(--bg4)"}}>
                      <div><span style={{fontSize:13}}>Net Pay: </span><strong style={{fontSize:16,color:"var(--green)"}}>${taxes.net.toFixed(2)}</strong></div>
                      <div><span style={{fontSize:11,color:"var(--red)"}}>Total Cost: ${taxes.totalCost.toFixed(2)}</span></div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Totals Bar */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:8,marginBottom:24}}>
              {[
                { label:"Total Gross Wages", val:"$"+totGross.toFixed(2), bg:"#1e3a5f", color:"#fff" },
                { label:"Total Employee Taxes", val:"$"+totEmpTax.toFixed(2), bg:"#1e3a5f", color:"#fff" },
                { label:"Total Net Pay", val:"$"+totNet.toFixed(2), bg:"#1e3a5f", color:"#fff" },
                { label:"Total Employer Taxes", val:"$"+totErTax.toFixed(2), bg:"#1e3a5f", color:"#fff" },
                { label:"Total Payroll Cost", val:"$"+totCost.toFixed(2), bg:"#166534", color:"#fff" },
              ].map((t,i) => (
                <div key={i} style={{background:t.bg,color:t.color,borderRadius:10,padding:"12px 14px",textAlign:"center"}}>
                  <div style={{fontSize:11,opacity:.8,marginBottom:4}}>{t.label}</div>
                  <div style={{fontSize:18,fontWeight:700}}>{t.val}</div>
                </div>
              ))}
            </div>

            {/* Employee Settings */}
            <div style={{marginBottom:12,display:"flex",alignItems:"center",gap:10}}>
              <div style={{fontSize:16,fontWeight:700}}>Employee Settings</div>
              <span style={{fontSize:11,padding:"3px 10px",border:"1px solid var(--border)",borderRadius:20,color:"var(--muted2)"}}>Pay Rate + Tax Profile</span>
            </div>
            <div className="card" style={{padding:0,overflow:"hidden"}}>
              <table className="pay-tbl">
                <thead style={{background:"#2d3a8c"}}><tr>
                  <th style={{color:"#fff"}}>Employee</th>
                  <th style={{color:"#fff"}}>Hourly Rate</th>
                  <th style={{color:"#fff"}}>Federal Filing Status</th>
                </tr></thead>
                <tbody>
                  {nonAdmin.map((emp, idx) => {
                    const c = empColors[idx % empColors.length];
                    return (
                      <tr key={emp.id}>
                        <td style={{fontWeight:600,color:c.text}}>{emp.name}</td>
                        <td>
                          <div style={{display:"flex",alignItems:"center",gap:4}}>
                            <span style={{color:"var(--muted2)"}}>$</span>
                            <input type="number" step="0.50" min="0" value={emp.rate||0} onChange={e => {
                              const newRate = parseFloat(e.target.value)||0;
                              setEmployees(prev => prev.map(x => x.id === emp.id ? {...x, rate: newRate} : x));
                            }} style={{width:70,padding:"6px 8px",border:"1px solid var(--border)",borderRadius:6,fontFamily:"var(--mono)",fontSize:13}} />
                          </div>
                        </td>
                        <td>
                          <select value={emp.filingStatus||"Single/MFS"} onChange={e => {
                            setEmployees(prev => prev.map(x => x.id === emp.id ? {...x, filingStatus: e.target.value} : x));
                          }} style={{padding:"6px 10px",border:"1px solid var(--border)",borderRadius:6,fontSize:12,background:"#fff",minWidth:200}}>
                            <option value="Single/MFS">Single / Married Filing Separately</option>
                            <option value="MFJ">Married Filing Jointly</option>
                            <option value="HoH">Head of Household</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        );
      })()}

      {overrideModal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setOverrideModal(null)}>
          <div className="modal">
            <div className="modal-title">Override Hours &mdash; {overrideModal.name}</div>
            <div className="form-group"><label>Adjusted Hours</label><input type="number" step="0.5" value={overrideHours} onChange={e => setOverrideHours(e.target.value)} /></div>
            <div className="form-group"><label>Reason (required)</label><textarea rows={3} value={overrideReason} onChange={e => setOverrideReason(e.target.value)} style={{resize:"vertical"}} placeholder="Must provide a reason..." /></div>
            <div className="modal-actions"><button className="btn" onClick={() => setOverrideModal(null)}>Cancel</button><button className="btn primary" onClick={saveOverride}>Save Override</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ADMIN: TASKS ────────────────────────────────────────────────────────────
function AdminTasks({ tasks, setTasks, taskTypes, setTaskTypes, toast }) {
  const [activeTab, setActiveTab] = useState("daily");
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [form, setForm] = useState({ category:"daily", title:"", desc:"", duration:5, scheduledTime:"09:05", frequency:1, order:1, role:"A", requirePhoto:false });

  // Custom Task Types state
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [typeForm, setTypeForm] = useState({ name: "", color: "#10b981" });
  const [showStepModal, setShowStepModal] = useState(false);
  const [editingStep, setEditingStep] = useState(null);
  const [stepForm, setStepForm] = useState({ title: "", duration: 5, requirePhoto: false });
  const [expandedType, setExpandedType] = useState(null);
  const [activeTypeId, setActiveTypeId] = useState(null);
  const presetColors = ["#10b981", "#8b5cf6", "#f59e0b", "#ef4444", "#3b82f6", "#ec4899", "#14b8a6", "#f97316"];

  const saveType = () => {
    if (!typeForm.name.trim()) return;
    if (editingType) {
      setTaskTypes(prev => prev.map(tt => tt.id === editingType ? { ...tt, name: typeForm.name, color: typeForm.color } : tt));
      toast.show("Task type updated");
    } else {
      setTaskTypes(prev => [...prev, { id: uid(), name: typeForm.name, color: typeForm.color, steps: [] }]);
      toast.show("Task type created");
    }
    setShowTypeModal(false); setEditingType(null);
  };

  const deleteType = (id) => { setTaskTypes(prev => prev.filter(tt => tt.id !== id)); toast.show("Task type deleted", "warning"); };

  const openEditType = (tt) => { setTypeForm({ name: tt.name, color: tt.color }); setEditingType(tt.id); setShowTypeModal(true); };

  const saveStep = () => {
    if (!stepForm.title.trim() || !activeTypeId) return;
    setTaskTypes(prev => prev.map(tt => {
      if (tt.id !== activeTypeId) return tt;
      if (editingStep) {
        return { ...tt, steps: tt.steps.map(s => s.id === editingStep ? { ...s, title: stepForm.title, duration: stepForm.duration, requirePhoto: stepForm.requirePhoto } : s) };
      } else {
        const maxOrder = tt.steps.length > 0 ? Math.max(...tt.steps.map(s => s.order || 0)) : 0;
        return { ...tt, steps: [...tt.steps, { id: uid(), title: stepForm.title, duration: stepForm.duration, requirePhoto: stepForm.requirePhoto, order: maxOrder + 1 }] };
      }
    }));
    toast.show(editingStep ? "Step updated" : "Step added");
    setShowStepModal(false); setEditingStep(null);
  };

  const deleteStep = (typeId, stepId) => {
    setTaskTypes(prev => prev.map(tt => tt.id === typeId ? { ...tt, steps: tt.steps.filter(s => s.id !== stepId) } : tt));
    toast.show("Step deleted", "warning");
  };

  const moveStep = (typeId, stepId, dir) => {
    setTaskTypes(prev => prev.map(tt => {
      if (tt.id !== typeId) return tt;
      const sorted = [...tt.steps].sort((a, b) => (a.order || 0) - (b.order || 0));
      const idx = sorted.findIndex(s => s.id === stepId);
      const ni = idx + dir;
      if (ni < 0 || ni >= sorted.length) return tt;
      const other = sorted[ni];
      const current = sorted[idx];
      return { ...tt, steps: tt.steps.map(s => {
        if (s.id === current.id) return { ...s, order: other.order };
        if (s.id === other.id) return { ...s, order: current.order };
        return s;
      })};
    }));
  };

  const dailyTasks = tasks.filter(t => t.category === "daily");
  const deliveryTasks = tasks.filter(t => t.category === "delivery");

  // Group daily tasks by scheduledTime
  const dailyByTime = {};
  dailyTasks.forEach(t => {
    const key = t.scheduledTime || "unscheduled";
    if (!dailyByTime[key]) dailyByTime[key] = [];
    dailyByTime[key].push(t);
  });
  Object.keys(dailyByTime).forEach(k => dailyByTime[k].sort((a, b) => (a.order || 0) - (b.order || 0)));
  const dailyTimeSlots = Object.keys(dailyByTime).sort();

  const deliveryA = deliveryTasks.filter(t => t.role === "A").sort((a, b) => (a.order || 0) - (b.order || 0));
  const deliveryB = deliveryTasks.filter(t => t.role === "B").sort((a, b) => (a.order || 0) - (b.order || 0));

  const formatSlotTime = (t) => {
    if (t === "unscheduled") return "Unscheduled";
    const [hh, mm] = t.split(":").map(Number);
    const h = hh === 0 ? 12 : hh > 12 ? hh - 12 : hh;
    const ap = hh >= 12 ? "PM" : "AM";
    return h + ":" + String(mm).padStart(2, "0") + " " + ap;
  };

  const openNewDaily = (timeSlot) => {
    const existing = dailyByTime[timeSlot] || [];
    const maxOrder = existing.length > 0 ? Math.max(...existing.map(t => t.order || 0)) : 0;
    setForm({ category:"daily", title:"", desc:"", duration:5, scheduledTime:timeSlot === "unscheduled" ? "" : timeSlot, frequency:1, order:maxOrder + 1, role:"A" });
    setEditTask(null); setShowModal(true);
  };
  const openNewDelivery = (role) => {
    const existing = role === "A" ? deliveryA : deliveryB;
    const maxOrder = existing.length > 0 ? Math.max(...existing.map(t => t.order || 0)) : 0;
    setForm({ category:"delivery", title:"", desc:"", duration:5, scheduledTime:"", frequency:1, order:maxOrder + 1, role });
    setEditTask(null); setShowModal(true);
  };
  const openNewDailySlot = () => {
    setForm({ category:"daily", title:"", desc:"", duration:5, scheduledTime:"", frequency:1, order:1, role:"A" });
    setEditTask(null); setShowModal(true);
  };
  const openEdit = (t) => { setForm({...t}); setEditTask(t.id); setShowModal(true); };

  const save = () => {
    if (!form.title.trim()) return;
    if (editTask) {
      setTasks(ts => ts.map(t => t.id === editTask ? { ...form, id: editTask } : t));
      toast.show("Task updated");
    } else {
      setTasks(ts => [...ts, { ...form, id: uid() }]);
      toast.show("Task created");
    }
    setShowModal(false);
  };
  const del = (id) => { setTasks(ts => ts.filter(t => t.id !== id)); toast.show("Task deleted", "warning"); };

  const moveTask = (task, dir, group) => {
    const idx = group.findIndex(t => t.id === task.id);
    const ni = idx + dir;
    if (ni < 0 || ni >= group.length) return;
    const otherTask = group[ni];
    setTasks(ts => ts.map(t => {
      if (t.id === task.id) return { ...t, order: otherTask.order };
      if (t.id === otherTask.id) return { ...t, order: task.order };
      return t;
    }));
  };

  const renderTaskCard = (t, idx, group) => (
    <div className="task-card" key={t.id}>
      <div style={{display:"flex",gap:8}}>
        <div style={{display:"flex",flexDirection:"column",gap:2,marginRight:6}}>
          <button className="btn ghost small" onClick={() => moveTask(t, -1, group)} disabled={idx===0} style={{padding:"2px 6px",fontSize:10,lineHeight:1}}>&#9650;</button>
          <button className="btn ghost small" onClick={() => moveTask(t, 1, group)} disabled={idx===group.length-1} style={{padding:"2px 6px",fontSize:10,lineHeight:1}}>&#9660;</button>
        </div>
        <div style={{flex:1}}>
          <div className="task-hdr">
            <span style={{fontSize:11,color:"var(--muted)",fontFamily:"var(--mono)",marginRight:6}}>#{t.order || idx+1}</span>
            <div className="task-name" style={{fontSize:13}}>{t.title}</div>
            {t.category === "delivery" && <span className={"task-badge badge-"+(t.role==="A"?"A":"B")}>Role {t.role}</span>}
            {t.category === "daily" && <span className="task-badge badge-all">All Staff</span>}
            {t.requirePhoto && <span style={{fontSize:12}} title="Requires photo">&#128247;</span>}
          </div>
          {t.desc && <div className="task-meta">{t.desc}</div>}
          <div className="task-footer">
            <span style={{fontSize:11,color:"var(--muted2)"}}>&#9201; {t.duration} min</span>
            {t.category === "daily" && t.frequency > 1 && <span style={{fontSize:11,color:"var(--amber)",fontWeight:500}}>Every {t.frequency} days</span>}
            <div className="spacer" />
            <button className="btn small" onClick={() => openEdit(t)}>Edit</button>
            <button className="btn small danger" onClick={() => del(t.id)}>Delete</button>
          </div>
        </div>
      </div>
    </div>
  );

  // Task status monitoring — read task logs from localStorage
  const [taskLogs, setTaskLogs] = useState(() => {
    try { return JSON.parse(localStorage.getItem("crewos_task_logs")) || []; } catch { return []; }
  });
  const [taskPhotos, setTaskPhotos] = useState(() => {
    try { return JSON.parse(localStorage.getItem("crewos_task_photos")) || {}; } catch { return {}; }
  });
  const [photoModal, setPhotoModal] = useState(null);

  // Poll for updates
  useEffect(() => {
    const iv = setInterval(() => {
      try {
        setTaskLogs(JSON.parse(localStorage.getItem("crewos_task_logs")) || []);
        setTaskPhotos(JSON.parse(localStorage.getItem("crewos_task_photos")) || {});
      } catch {}
    }, 3000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div>
      <div className="period-tabs" style={{marginBottom:18}}>
        <div className={"period-tab"+(activeTab==="daily"?" on":"")} onClick={() => setActiveTab("daily")}>Daily Tasks ({dailyTasks.length})</div>
        <div className={"period-tab"+(activeTab==="delivery"?" on":"")} onClick={() => setActiveTab("delivery")}>Delivery Tasks ({deliveryTasks.length})</div>
        <div className={"period-tab"+(activeTab==="status"?" on":"")} onClick={() => setActiveTab("status")}>&#128202; Task Status</div>
        <div className={"period-tab"+(activeTab==="custom"?" on":"")} onClick={() => setActiveTab("custom")}>&#127912; Custom Types ({taskTypes.length})</div>
      </div>

      {activeTab === "daily" && (
        <div>
          <div className="row" style={{marginBottom:14}}>
            <div style={{fontSize:12,color:"var(--muted2)"}}>Tasks grouped by scheduled time. All staff complete these in order.</div>
            <div className="spacer" />
            <button className="btn primary small" onClick={openNewDailySlot}>+ New Daily Task</button>
          </div>
          {dailyTimeSlots.length === 0 && <div style={{color:"var(--muted2)",fontSize:13,padding:"30px 0",textAlign:"center"}}>No daily tasks yet.</div>}
          {dailyTimeSlots.map(slot => {
            const slotTasks = dailyByTime[slot];
            return (
              <div key={slot} style={{marginBottom:20}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                  <div style={{fontSize:14,fontWeight:600,color:"var(--text)"}}>&#9200; {formatSlotTime(slot)}</div>
                  <div style={{flex:1,height:1,background:"var(--border)"}} />
                  <span style={{fontSize:11,color:"var(--muted2)"}}>{slotTasks.length} task{slotTasks.length!==1?"s":""}</span>
                  <button className="btn small" onClick={() => openNewDaily(slot)}>+ Add</button>
                </div>
                {slotTasks.map((t, idx) => renderTaskCard(t, idx, slotTasks))}
              </div>
            );
          })}
        </div>
      )}

      {activeTab === "delivery" && (
        <div>
          <div style={{fontSize:12,color:"var(--muted2)",marginBottom:14}}>These tasks only appear when a vendor submits a delivery. Role A and Role B are assigned in the Schedule tab.</div>
          <div style={{marginBottom:20}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
              <div style={{fontSize:14,fontWeight:600,color:"var(--purple)"}}>Role A Tasks</div>
              <div style={{flex:1,height:1,background:"var(--border)"}} />
              <span style={{fontSize:11,color:"var(--muted2)"}}>{deliveryA.length} task{deliveryA.length!==1?"s":""}</span>
              <button className="btn small" onClick={() => openNewDelivery("A")}>+ Add</button>
            </div>
            {deliveryA.length === 0 && <div style={{color:"var(--muted2)",fontSize:12,padding:"14px 0",textAlign:"center"}}>No Role A tasks.</div>}
            {deliveryA.map((t, idx) => renderTaskCard(t, idx, deliveryA))}
          </div>
          <div style={{marginBottom:20}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
              <div style={{fontSize:14,fontWeight:600,color:"var(--blue)"}}>Role B Tasks</div>
              <div style={{flex:1,height:1,background:"var(--border)"}} />
              <span style={{fontSize:11,color:"var(--muted2)"}}>{deliveryB.length} task{deliveryB.length!==1?"s":""}</span>
              <button className="btn small" onClick={() => openNewDelivery("B")}>+ Add</button>
            </div>
            {deliveryB.length === 0 && <div style={{color:"var(--muted2)",fontSize:12,padding:"14px 0",textAlign:"center"}}>No Role B tasks.</div>}
            {deliveryB.map((t, idx) => renderTaskCard(t, idx, deliveryB))}
          </div>
        </div>
      )}

      {/* ═══ TASK STATUS TAB ═══ */}
      {activeTab === "status" && (
        <div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
            <div style={{fontSize:12,color:"var(--muted2)"}}>View employee task completion status and uploaded photos.</div>
            {taskLogs.length > 0 && (
              <button className="btn small" style={{fontSize:11,color:"var(--red)",borderColor:"rgba(220,38,38,.2)"}} onClick={() => {
                if (confirm("Clear all completed task entries?")) {
                  setTaskLogs([]);
                  localStorage.setItem("crewos_task_logs", "[]");
                  setTaskPhotos({});
                  localStorage.setItem("crewos_task_photos", "{}");
                  toast.show("All task entries cleared", "warning");
                }
              }}>Clear All</button>
            )}
          </div>
          {taskLogs.length === 0 ? (
            <div style={{color:"var(--muted2)",fontSize:13,padding:"40px 0",textAlign:"center"}}>
              No task activity yet today. Logs appear when employees start and complete tasks.
            </div>
          ) : (
            <div>
              {(() => {
                const today = new Date().toLocaleDateString("en-US", {month:"short",day:"numeric",year:"numeric"});
                const todayLogs = taskLogs.filter(l => {
                  try { return new Date(l.timestamp).toLocaleDateString("en-US", {month:"short",day:"numeric",year:"numeric"}) === today; } catch { return false; }
                });
                const byEmployee = {};
                todayLogs.forEach(l => {
                  const key = l.employeeName || "Unknown";
                  if (!byEmployee[key]) byEmployee[key] = [];
                  byEmployee[key].push(l);
                });
                if (Object.keys(byEmployee).length === 0) {
                  return <div style={{color:"var(--muted2)",fontSize:13,padding:"30px 0",textAlign:"center"}}>No task activity today.</div>;
                }
                return Object.entries(byEmployee).map(([empName, logs]) => (
                  <div key={empName} style={{marginBottom:20}}>
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                      <div style={{width:30,height:30,borderRadius:"50%",background:"var(--primary)",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:600}}>{empName[0]}</div>
                      <div style={{fontSize:14,fontWeight:600}}>{empName}</div>
                      <div style={{flex:1,height:1,background:"var(--border)"}} />
                      <span style={{fontSize:11,color:"var(--muted2)"}}>{logs.filter(l=>l.status==="done").length} completed</span>
                    </div>
                    {logs.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)).map((log, i) => {
                      const photoKey = log.taskKey || log.taskId;
                      const photos = taskPhotos[photoKey] || [];
                      return (
                        <div key={i} className="task-card" style={{marginBottom:8}}>
                          <div className="task-hdr">
                            <span style={{fontSize:13}}>{log.status === "done" ? "\u2705" : log.status === "running" ? "\u23F1\uFE0F" : "\u23F3"}</span>
                            <div className="task-name" style={{fontSize:13}}>{log.taskTitle}</div>
                            {log.deliveryVendor && <span className="task-badge" style={{background:"rgba(124,58,237,.08)",color:"var(--purple)",fontSize:10}}>{log.deliveryVendor}</span>}
                            <span style={{fontSize:10,color:"var(--muted2)",marginLeft:"auto"}}>{new Date(log.timestamp).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</span>
                            <button onClick={() => {
                              const updated = taskLogs.filter((_, idx) => idx !== taskLogs.indexOf(log));
                              setTaskLogs(updated);
                              localStorage.setItem("crewos_task_logs", JSON.stringify(updated));
                              // Also remove associated photos
                              const photoKey = log.taskKey || log.taskId;
                              if (photoKey && taskPhotos[photoKey]) {
                                const updatedPhotos = { ...taskPhotos };
                                delete updatedPhotos[photoKey];
                                setTaskPhotos(updatedPhotos);
                                localStorage.setItem("crewos_task_photos", JSON.stringify(updatedPhotos));
                              }
                              toast.show("Task entry removed", "warning");
                            }} style={{
                              marginLeft:8,background:"none",border:"none",cursor:"pointer",
                              color:"var(--muted2)",fontSize:16,padding:"2px 6px",borderRadius:6,
                              lineHeight:1,transition:"color .15s"
                            }}
                            onMouseEnter={e => e.target.style.color="var(--red)"}
                            onMouseLeave={e => e.target.style.color="var(--muted2)"}
                            title="Remove this entry">&times;</button>
                          </div>
                          {photos.length > 0 && (
                            <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap"}}>
                              {photos.map((photo, pi) => (
                                <div key={pi} style={{width:60,height:60,borderRadius:8,overflow:"hidden",cursor:"pointer",border:"1px solid var(--border)"}}
                                  onClick={() => setPhotoModal(photo)}>
                                  <img src={photo} style={{width:"100%",height:"100%",objectFit:"cover"}} />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ));
              })()}
            </div>
          )}
        </div>
      )}

      {/* ═══ CUSTOM TYPES TAB ═══ */}
      {activeTab === "custom" && (
        <div>
          <div className="row" style={{marginBottom:14}}>
            <div style={{fontSize:12,color:"var(--muted2)"}}>Create custom task types with ordered steps. Attach them to announcements.</div>
            <div className="spacer" />
            <button className="btn primary small" onClick={() => { setTypeForm({ name: "", color: "#10b981" }); setEditingType(null); setShowTypeModal(true); }}>+ New Task Type</button>
          </div>
          {taskTypes.length === 0 && <div style={{color:"var(--muted2)",fontSize:13,padding:"30px 0",textAlign:"center"}}>No custom task types yet.</div>}
          {taskTypes.map(tt => {
            const isExpanded = expandedType === tt.id;
            const sortedSteps = [...tt.steps].sort((a, b) => (a.order || 0) - (b.order || 0));
            return (
              <div key={tt.id} className="task-card" style={{marginBottom:12,borderLeft:"4px solid " + tt.color}}>
                <div style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}} onClick={() => setExpandedType(isExpanded ? null : tt.id)}>
                  <div style={{width:12,height:12,borderRadius:"50%",background:tt.color,flexShrink:0}} />
                  <div style={{flex:1,fontWeight:600,fontSize:14}}>{tt.name}</div>
                  <span style={{fontSize:11,color:"var(--muted2)"}}>{tt.steps.length} step{tt.steps.length !== 1 ? "s" : ""}</span>
                  <span style={{fontSize:12,color:"var(--muted2)",transition:"transform .2s",transform:isExpanded?"rotate(180deg)":"rotate(0deg)"}}>&#9660;</span>
                </div>
                {isExpanded && (
                  <div style={{marginTop:12}}>
                    <div style={{display:"flex",gap:8,marginBottom:10}}>
                      <button className="btn small" onClick={() => openEditType(tt)}>Edit Type</button>
                      <button className="btn small danger" onClick={() => deleteType(tt.id)}>Delete Type</button>
                      <div className="spacer" />
                      <button className="btn small primary" onClick={() => { setActiveTypeId(tt.id); setStepForm({ title: "", duration: 5, requirePhoto: false }); setEditingStep(null); setShowStepModal(true); }}>+ Add Step</button>
                    </div>
                    {sortedSteps.length === 0 && <div style={{color:"var(--muted2)",fontSize:12,padding:"14px 0",textAlign:"center"}}>No steps yet. Add steps to this task type.</div>}
                    {sortedSteps.map((step, idx) => (
                      <div key={step.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:"var(--surface)",borderRadius:8,marginBottom:6,border:"1px solid var(--border)"}}>
                        <div style={{display:"flex",flexDirection:"column",gap:2}}>
                          <button className="btn ghost small" onClick={() => moveStep(tt.id, step.id, -1)} disabled={idx === 0} style={{padding:"2px 6px",fontSize:10,lineHeight:1}}>&#9650;</button>
                          <button className="btn ghost small" onClick={() => moveStep(tt.id, step.id, 1)} disabled={idx === sortedSteps.length - 1} style={{padding:"2px 6px",fontSize:10,lineHeight:1}}>&#9660;</button>
                        </div>
                        <span style={{fontSize:11,color:"var(--muted)",fontFamily:"var(--mono)",minWidth:24}}>#{idx + 1}</span>
                        <div style={{flex:1}}>
                          <div style={{fontSize:13,fontWeight:500}}>{step.title}</div>
                          <div style={{fontSize:11,color:"var(--muted2)"}}>&#9201; {step.duration} min{step.requirePhoto ? " | \uD83D\uDCF7 Photo required" : ""}</div>
                        </div>
                        <button className="btn small" onClick={() => { setActiveTypeId(tt.id); setStepForm({ title: step.title, duration: step.duration, requirePhoto: step.requirePhoto }); setEditingStep(step.id); setShowStepModal(true); }}>Edit</button>
                        <button className="btn small danger" onClick={() => deleteStep(tt.id, step.id)}>Delete</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Task Type Modal */}
      {showTypeModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowTypeModal(false)}>
          <div className="modal">
            <div className="modal-title">{editingType ? "Edit Task Type" : "New Task Type"}</div>
            <div className="form-group"><label>Type Name</label><input type="text" value={typeForm.name} onChange={e => setTypeForm(f => ({...f, name: e.target.value}))} placeholder="e.g. Promotion, Cleaning, Inventory Check" /></div>
            <div className="form-group"><label>Color</label>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:4}}>
                {presetColors.map(c => (
                  <div key={c} onClick={() => setTypeForm(f => ({...f, color: c}))} style={{width:32,height:32,borderRadius:"50%",background:c,cursor:"pointer",border:typeForm.color === c ? "3px solid var(--text)" : "3px solid transparent",transition:"border .15s"}} />
                ))}
              </div>
            </div>
            <div className="modal-actions"><button className="btn" onClick={() => setShowTypeModal(false)}>Cancel</button><button className="btn primary" onClick={saveType}>{editingType ? "Save Changes" : "Create Type"}</button></div>
          </div>
        </div>
      )}

      {/* Step Modal */}
      {showStepModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowStepModal(false)}>
          <div className="modal">
            <div className="modal-title">{editingStep ? "Edit Step" : "Add Step"}</div>
            <div className="form-group"><label>Step Title</label><input type="text" value={stepForm.title} onChange={e => setStepForm(f => ({...f, title: e.target.value}))} placeholder="e.g. Check expiration dates" /></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div className="form-group"><label>Duration (min)</label><input type="number" min={1} value={stepForm.duration} onChange={e => setStepForm(f => ({...f, duration: parseInt(e.target.value) || 1}))} /></div>
              <div className="form-group" style={{display:"flex",alignItems:"center"}}>
                <label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",marginTop:20}}>
                  <input type="checkbox" checked={!!stepForm.requirePhoto} onChange={e => setStepForm(f => ({...f, requirePhoto: e.target.checked}))} style={{width:18,height:18,accentColor:"var(--primary)"}} />
                  <span>&#128247; Require Photo</span>
                </label>
              </div>
            </div>
            <div className="modal-actions"><button className="btn" onClick={() => setShowStepModal(false)}>Cancel</button><button className="btn primary" onClick={saveStep}>{editingStep ? "Save Changes" : "Add Step"}</button></div>
          </div>
        </div>
      )}

      {/* Photo fullscreen modal */}
      {photoModal && (
        <div className="modal-overlay" onClick={() => setPhotoModal(null)} style={{background:"rgba(0,0,0,.85)"}}>
          <div style={{maxWidth:"90vw",maxHeight:"90vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <img src={photoModal} style={{maxWidth:"100%",maxHeight:"90vh",borderRadius:12}} />
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-title">{editTask ? "Edit Task" : "New Task"}</div>
            <div className="form-group"><label>Category</label>
              <select value={form.category} onChange={e => setForm(f=>({...f,category:e.target.value}))} disabled={!!editTask}>
                <option value="daily">Daily Task</option>
                <option value="delivery">Delivery Task</option>
              </select>
            </div>
            <div className="form-group"><label>Task Title</label><input type="text" value={form.title} onChange={e => setForm(f=>({...f,title:e.target.value}))} placeholder="e.g. Vacuum floor" /></div>
            <div className="form-group"><label>Description (optional)</label><textarea rows={2} value={form.desc} onChange={e => setForm(f=>({...f,desc:e.target.value}))} style={{resize:"vertical"}} placeholder="Instructions..." /></div>
            {form.category === "daily" && (
              <>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                  <div className="form-group"><label>Duration (min)</label><input type="number" min={1} value={form.duration} onChange={e => setForm(f=>({...f,duration:parseInt(e.target.value)||1}))} /></div>
                  <div className="form-group"><label>Scheduled Time</label><input type="time" value={form.scheduledTime||""} onChange={e => setForm(f=>({...f,scheduledTime:e.target.value}))} /></div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                  <div className="form-group"><label>Frequency</label>
                    <select value={form.frequency||1} onChange={e => setForm(f=>({...f,frequency:parseInt(e.target.value)||1}))}>
                      <option value={1}>Daily</option>
                      <option value={2}>Every 2 days</option>
                      <option value={3}>Every 3 days</option>
                      <option value={7}>Weekly</option>
                    </select>
                  </div>
                  <div className="form-group"><label>Order in slot</label><input type="number" min={1} value={form.order||1} onChange={e => setForm(f=>({...f,order:parseInt(e.target.value)||1}))} /></div>
                </div>
              </>
            )}
            {form.category === "delivery" && (
              <>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                  <div className="form-group"><label>Duration (min)</label><input type="number" min={1} value={form.duration} onChange={e => setForm(f=>({...f,duration:parseInt(e.target.value)||1}))} /></div>
                  <div className="form-group"><label>Delivery Role</label>
                    <select value={form.role||"A"} onChange={e => setForm(f=>({...f,role:e.target.value}))}>
                      <option value="A">Role A</option>
                      <option value="B">Role B</option>
                    </select>
                  </div>
                </div>
                <div className="form-group"><label>Order in role</label><input type="number" min={1} value={form.order||1} onChange={e => setForm(f=>({...f,order:parseInt(e.target.value)||1}))} /></div>
              </>
            )}
            <div className="form-group" style={{marginTop:8}}>
              <label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}>
                <input type="checkbox" checked={!!form.requirePhoto} onChange={e => setForm(f=>({...f,requirePhoto:e.target.checked}))} style={{width:18,height:18,accentColor:"var(--primary)"}} />
                <span>&#128247; Require Photo Upload</span>
              </label>
              <div style={{fontSize:11,color:"var(--muted2)",marginTop:4}}>Employee must upload a photo before completing this task</div>
            </div>
            <div className="modal-actions"><button className="btn" onClick={() => setShowModal(false)}>Cancel</button><button className="btn primary" onClick={save}>{editTask?"Save Changes":"Create Task"}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ADMIN: VENDOR ───────────────────────────────────────────────────────────
// ─── SIGNATURE PAD COMPONENT ─────────────────────────────────────────────────
function SignaturePad({ value, onChange }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(!!value);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = 150;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    // If there's an existing signature, redraw it
    if (value && value.startsWith("data:")) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0);
      img.src = value;
    }
  }, []);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
  };

  const startDraw = (e) => {
    e.preventDefault();
    setDrawing(true);
    const ctx = canvasRef.current.getContext("2d");
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e) => {
    if (!drawing) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const endDraw = (e) => {
    if (!drawing) return;
    e.preventDefault();
    setDrawing(false);
    // Save as data URL
    const dataUrl = canvasRef.current.toDataURL("image/png");
    onChange(dataUrl);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    onChange("");
  };

  return (
    <div>
      <div style={{position:"relative",border:"1px dashed var(--border2)",borderRadius:8,overflow:"hidden",background:"#fff",touchAction:"none"}}>
        <canvas
          ref={canvasRef}
          style={{display:"block",width:"100%",height:150,cursor:"crosshair"}}
          onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
          onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}
        />
        {!hasDrawn && (
          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none",color:"var(--muted)",fontSize:13}}>
            Sign here with your finger or mouse
          </div>
        )}
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",marginTop:6}}>
        <button type="button" className="btn small" onClick={clear} style={{fontSize:11}}>Clear Signature</button>
      </div>
    </div>
  );
}

// Default vendor form fields (admin can customize, saved in localStorage)
const DEFAULT_VENDOR_FIELDS = [
  { id:1, name:"Company / Brand name", type:"Required - Text" },
  { id:2, name:"Delivery date", type:"Required - Date" },
  { id:3, name:"Driver signature", type:"Required - Signature" },
];

// ─── NFC CLOCK PAGE (standalone page employees see after tapping NFC tag) ────
function NfcClockPage() {
  const hashParams = new URLSearchParams(window.location.hash.split("?")[1] || "");
  const fbUrl = decodeURIComponent(hashParams.get("fb") || "");
  const locId = hashParams.get("loc") || "";

  // Check if employee is remembered on this device
  const remembered = (() => { try { return JSON.parse(localStorage.getItem("crewos_nfc_employee")); } catch { return null; } })();

  const [phase, setPhase] = useState(remembered ? "loading" : "pin"); // pin | loading | action | processing | done | error
  const [pin, setPin] = useState([]);
  const [pinError, setPinError] = useState("");
  const [shake, setShake] = useState(false);
  const [employee, setEmployee] = useState(remembered || null);
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [clockType, setClockType] = useState(null); // "in" or "out" for done screen
  const [clockTime, setClockTime] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [employees, setEmployees] = useState([]);

  // Load clock status for remembered employee (skip PIN)
  const loadClockStatus = async (emp) => {
    setPhase("loading");
    try {
      const data = await firebaseGet(fbUrl, "crewos_data");
      if (!data || !data.employees) { setPhase("error"); setErrorMsg("Could not connect to server. Please try again."); return; }
      // Verify employee still exists
      const current = data.employees.find(e => e.id === emp.id);
      if (!current) {
        localStorage.removeItem("crewos_nfc_employee");
        setEmployee(null);
        setPhase("pin");
        setPinError("Employee not found. Please enter your PIN.");
        return;
      }
      setEmployee(current);
      setEmployees(data.employees);
      const logs = data.clockLogs || [];
      const myLogs = logs.filter(l => l.employeeId === current.id);
      const lastLog = myLogs[myLogs.length - 1];
      setIsClockedIn(lastLog && lastLog.type === "in");
      setPhase("action");
    } catch (err) {
      setPhase("error"); setErrorMsg("Connection failed: " + err.message);
    }
  };

  // Validate params & auto-load remembered employee
  useEffect(() => {
    if (!fbUrl) { setPhase("error"); setErrorMsg("Invalid NFC tag — no sync URL found. Please contact your admin."); return; }
    if (remembered) loadClockStatus(remembered);
  }, []);

  const addPin = (d) => {
    if (pin.length >= 4) return;
    const next = [...pin, d];
    setPin(next);
    setPinError("");
    if (next.length === 4) {
      setTimeout(async () => {
        const code = next.join("");
        setPhase("loading");
        try {
          const data = await firebaseGet(fbUrl, "crewos_data");
          if (!data || !data.employees) { setPhase("error"); setErrorMsg("Could not connect to server. Please try again."); return; }
          const emps = data.employees;
          setEmployees(emps);
          const emp = emps.find(e => e.pin === code);
          if (!emp) {
            setPhase("pin"); setPinError("Incorrect PIN"); setShake(true);
            setTimeout(() => { setShake(false); setPin([]); }, 500);
            return;
          }
          // Remember employee on this device
          localStorage.setItem("crewos_nfc_employee", JSON.stringify({ id: emp.id, name: emp.name }));
          setEmployee(emp);
          // Determine if currently clocked in
          const logs = data.clockLogs || [];
          const myLogs = logs.filter(l => l.employeeId === emp.id);
          const lastLog = myLogs[myLogs.length - 1];
          setIsClockedIn(lastLog && lastLog.type === "in");
          setPhase("action");
        } catch (err) {
          setPhase("error"); setErrorMsg("Connection failed: " + err.message);
        }
      }, 200);
    }
  };

  const doClock = async (type) => {
    setPhase("processing");
    try {
      const data = await firebaseGet(fbUrl, "crewos_data");
      const logs = data?.clockLogs || [];
      const now = new Date();
      const newLog = {
        employeeId: employee.id,
        type,
        time: now.toISOString(),
        source: "nfc",
        locationId: locId,
      };
      logs.push(newLog);
      await firebaseSet(fbUrl, "crewos_data/clockLogs", logs);
      setClockType(type);
      setClockTime(now);
      setPhase("done");
    } catch (err) {
      setPhase("error"); setErrorMsg("Failed to record clock event: " + err.message);
    }
  };

  if (phase === "error") {
    return (
      <div className="nfc-wrap">
        <div className="nfc-box">
          <div className="nfc-logo"><span>Woodhaven</span><em>OS</em></div>
          <div className="nfc-error">{errorMsg}</div>
          <button className="btn" style={{marginTop:16,width:"100%"}} onClick={() => { setPhase("pin"); setPin([]); setErrorMsg(""); }}>Try Again</button>
        </div>
      </div>
    );
  }

  if (phase === "loading" || phase === "processing") {
    return (
      <div className="nfc-wrap">
        <div className="nfc-box">
          <div className="nfc-logo"><span>Woodhaven</span><em>OS</em></div>
          <div className="nfc-loading">
            <div className="nfc-spinner" />
            <div style={{fontSize:13,color:"var(--muted2)"}}>{phase === "loading" ? "Verifying PIN..." : "Recording clock event..."}</div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="nfc-wrap">
        <div className="nfc-box">
          <div className="nfc-logo"><span>Woodhaven</span><em>OS</em></div>
          <div className="nfc-done-wrap">
            <div className={"nfc-done-check " + clockType}>{clockType === "in" ? "✓" : "⏹"}</div>
            <div className="nfc-done-msg">Clocked {clockType === "in" ? "In" : "Out"}!</div>
            <div style={{fontSize:14,fontWeight:500,marginBottom:4}}>{employee?.name}</div>
            <div className="nfc-done-time">
              {clockTime?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
            <div className="nfc-done-close">You can close this page now</div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "action") {
    return (
      <div className="nfc-wrap">
        <div className="nfc-box">
          <div className="nfc-logo"><span>Woodhaven</span><em>OS</em></div>
          <div className="nfc-subtitle"><span className="nfc-badge">NFC Clock</span></div>
          <div className="nfc-welcome">Hey, {employee?.name}!</div>
          <div className="nfc-status-text">
            {isClockedIn ? "You are currently clocked in" : "You are not clocked in"}
          </div>
          <div className="nfc-actions">
            <button className="nfc-clock-btn in" disabled={isClockedIn} onClick={() => doClock("in")}>
              <span className="nfc-clock-icon">▶</span>
              Clock In
            </button>
            <button className="nfc-clock-btn out" disabled={!isClockedIn} onClick={() => doClock("out")}>
              <span className="nfc-clock-icon">⏹</span>
              Clock Out
            </button>
          </div>
          <button className="btn ghost" style={{width:"100%"}} onClick={() => { localStorage.removeItem("crewos_nfc_employee"); setPhase("pin"); setPin([]); setEmployee(null); }}>Switch Employee</button>
        </div>
      </div>
    );
  }

  // PIN entry phase
  return (
    <div className="nfc-wrap">
      <div className="nfc-box">
        <div className="nfc-logo"><span>Woodhaven</span><em>OS</em></div>
        <div className="nfc-subtitle"><span className="nfc-badge">NFC Clock</span></div>
        <div style={{fontSize:13,color:"var(--muted2)",marginBottom:24}}>Enter your 4-digit PIN</div>
        <div className="pin-dots" style={shake ? {animation:"shake .3s"} : {}}>
          {[0,1,2,3].map(i => (
            <div key={i} className={"pin-dot" + (pin.length > i ? (pinError ? " err" : " on") : "")} />
          ))}
        </div>
        <style>{`@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-8px)}75%{transform:translateX(8px)}}`}</style>
        <div className="pin-grid">
          {[1,2,3,4,5,6,7,8,9].map(n => (
            <div key={n} className="pkey" onClick={() => addPin(n)}>{n}</div>
          ))}
          <div className="pkey del" onClick={() => { setPin([]); setPinError(""); }}>CLR</div>
          <div className="pkey" onClick={() => addPin(0)}>0</div>
          <div className="pkey del" style={{visibility:"hidden"}} />
        </div>
        <div className="pin-error">{pinError}</div>
      </div>
    </div>
  );
}

// ─── VENDOR FORM (standalone page vendors see after scanning QR) ─────────────
function VendorFormPage() {
  // Read Firebase URL from hash params (e.g., #/vendor-form?fb=<encoded-url>)
  const getFirebaseUrl = () => {
    try {
      const hash = window.location.hash;
      const qIdx = hash.indexOf("?");
      if (qIdx < 0) return "";
      const params = new URLSearchParams(hash.slice(qIdx));
      return decodeURIComponent(params.get("fb") || "");
    } catch { return ""; }
  };
  const fbUrl = getFirebaseUrl();

  // Try to load fields from Firebase first, fall back to localStorage
  const [fields, setFields] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("crewos_vendor_fields"));
      if (!saved) return DEFAULT_VENDOR_FIELDS;
      const hasInvoice = saved.some(f => f.name && f.name.toLowerCase().includes("invoice"));
      const hasBadSig = saved.some(f => f.name && f.name.toLowerCase().includes("signature") && !f.type.includes("Signature"));
      if (hasInvoice || hasBadSig) { localStorage.setItem("crewos_vendor_fields", JSON.stringify(DEFAULT_VENDOR_FIELDS)); return DEFAULT_VENDOR_FIELDS; }
      return saved;
    } catch { return DEFAULT_VENDOR_FIELDS; }
  });
  const [form, setForm] = useState(() => {
    const init = {};
    (JSON.parse(localStorage.getItem("crewos_vendor_fields")) || DEFAULT_VENDOR_FIELDS).forEach(f => {
      if (f.type.includes("Date")) init[f.name] = new Date().toISOString().split("T")[0];
    });
    return init;
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load fields from Firebase if available (for cross-device)
  useEffect(() => {
    if (!fbUrl) return;
    (async () => {
      const data = await firebaseGet(fbUrl, "vendor_fields");
      if (data && Array.isArray(data)) setFields(data);
    })();
  }, [fbUrl]);

  const submit = async () => {
    setSubmitting(true);
    const company = form["Company / Brand name"] || "Unknown Vendor";
    const timeStr = new Date().toLocaleString("en-US", {month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"});
    const deliveryData = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2,6),
      company, time: timeStr, timestamp: Date.now(), fields: {...form}
    };

    if (fbUrl) {
      // Push to Firebase so all devices can see it
      await firebasePush(fbUrl, "deliveries", deliveryData);
      await firebasePush(fbUrl, "pending_delivery", { company, time: timeStr, id: deliveryData.id, timestamp: Date.now() });
    }

    // Also save to localStorage (works when same browser)
    try {
      const deliveries = JSON.parse(localStorage.getItem("crewos_deliveries")) || [];
      deliveries.unshift(deliveryData);
      localStorage.setItem("crewos_deliveries", JSON.stringify(deliveries));
      const notifs = JSON.parse(localStorage.getItem("crewos_notifs")) || [];
      notifs.unshift({ id: uid(), type:"vendor", title:"Vendor delivery: "+company, desc:"Delivery form submitted. Tasks triggered for all roles.", time: timeStr });
      localStorage.setItem("crewos_notifs", JSON.stringify(notifs));
      // Add to pending deliveries array (supports multiple vendors)
      const pendArr = JSON.parse(localStorage.getItem("crewos_pending_deliveries")) || [];
      if (!pendArr.some(d => d.id === deliveryData.id)) {
        pendArr.push({ company, time: timeStr, id: deliveryData.id });
        localStorage.setItem("crewos_pending_deliveries", JSON.stringify(pendArr));
      }
      // Also set old key for backward compat
      localStorage.setItem("crewos_pending_delivery", JSON.stringify({ company, time: timeStr, id: deliveryData.id }));
    } catch {}
    setSubmitting(false);
    setSubmitted(true);
  };

  const requiredFields = fields.filter(f => f.type.startsWith("Required"));
  const allRequiredFilled = requiredFields.every(f => {
    const val = form[f.name];
    return val && val.trim && val.trim() !== "";
  });

  if (submitted) {
    return (
      <>
        <style>{CSS}</style>
        <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"var(--bg)",padding:20}}>
          <div style={{textAlign:"center",maxWidth:400}}>
            <div style={{fontSize:64,marginBottom:16}}>&#10003;</div>
            <div style={{fontSize:24,fontWeight:700,color:"var(--green)",marginBottom:8}}>Delivery Submitted!</div>
            <div style={{fontSize:14,color:"var(--muted2)",marginBottom:24}}>Thank you. The store team has been notified and will process your delivery.</div>
            <button className="btn primary" onClick={() => { setForm({}); setSubmitted(false); }}>Submit Another Delivery</button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{CSS}</style>
      <div style={{minHeight:"100vh",background:"var(--bg)",padding:20}}>
        <div style={{maxWidth:500,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:24}}>
            <div className="login-logo" style={{marginBottom:4}}><span>Woodhaven</span><em>OS</em></div>
            <div style={{fontSize:18,fontWeight:600,marginBottom:4}}>Vendor Delivery Check-In</div>
            <div style={{fontSize:13,color:"var(--muted2)"}}>Please fill out this form to log your delivery.</div>
          </div>
          <div className="card" style={{padding:24}}>
            {fields.map(f => (
              <div className="form-group" key={f.id}>
                <label>{f.name} {f.type.startsWith("Required") && <span style={{color:"var(--red)"}}>*</span>}</label>
                {f.type.includes("Date") ? (
                  <input type="date" value={form[f.name] || new Date().toISOString().split("T")[0]} onChange={e => setForm(v => ({...v, [f.name]: e.target.value}))} />
                ) : f.type.includes("Signature") ? (
                  <SignaturePad value={form[f.name] || ""} onChange={val => setForm(v => ({...v, [f.name]: val}))} />
                ) : (
                  <input type="text" value={form[f.name] || ""} onChange={e => setForm(v => ({...v, [f.name]: e.target.value}))} placeholder={"Enter " + f.name.toLowerCase()} />
                )}
              </div>
            ))}
            <button className="btn primary" style={{width:"100%",padding:14,fontSize:15,marginTop:8}} onClick={submit} disabled={!allRequiredFilled || submitting}>
              {submitting ? "Submitting..." : "Submit Delivery"}
            </button>
          </div>
          <div style={{textAlign:"center",marginTop:16,fontSize:11,color:"var(--muted)"}}>Powered by Woodhaven OS</div>
        </div>
      </div>
    </>
  );
}

// ─── INVOICE VERIFIER ────────────────────────────────────────────────────────
function InvoiceVerifier({ toast }) {
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [menuFile, setMenuFile] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const invoiceRef = useRef(null);
  const menuRef = useRef(null);

  // Parse PDF invoice text using pdf.js
  const parsePDF = async (file) => {
    const buf = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map(it => it.str).join(" ") + "\n";
    }
    return text;
  };

  // Extract invoice line items from raw PDF text
  const parseInvoiceItems = (text) => {
    const items = [];
    // Split into chunks by BATCH/SKU pattern
    const chunks = text.split(/(?=BATCH\/SKU:)/i);
    for (const chunk of chunks) {
      const batchMatch = chunk.match(/BATCH\/SKU:\s*([\w\-]+)/i);
      if (!batchMatch) continue;
      const batch = batchMatch[1];

      // Get price fields — look for patterns of numbers that represent unit/discount/case/qty/units/total
      // The invoice format shows: UNIT PRICE, DISCOUNT PRICE, CASE PRICE, QTY, UNITS, TOTAL
      const nums = [];
      const numRe = /\$?([\d,]+\.[\d]{2})/g;
      let m;
      while ((m = numRe.exec(chunk)) !== null) nums.push(parseFloat(m[1].replace(",", "")));

      // Also extract plain integers for qty/units
      const allNums = [];
      const allNumRe = /(?<!\w)([\d,]+\.?\d*)/g;
      while ((m = allNumRe.exec(chunk)) !== null) {
        const v = parseFloat(m[1].replace(",", ""));
        if (!isNaN(v) && v > 0) allNums.push(v);
      }

      // Find the product name — it's the text before BATCH/SKU in the original text
      // Look backwards from BATCH/SKU to find item name
      const fullIdx = text.indexOf("BATCH/SKU: " + batch);
      let itemName = "";
      if (fullIdx >= 0) {
        // Search backwards for the item name (appears before the batch line)
        const before = text.substring(Math.max(0, fullIdx - 400), fullIdx);
        // Look for known product patterns
        const namePatterns = [
          /(?:Anthem|Select|Grassroots|Find\.|Curaleaf)[^\n$]*?(?=\s*(?:\(|BATCH))/gi,
          /([\w.]+(?:\s+\w+){2,}(?:\s+[\d.]+g)?(?:\s*-\s*(?:Hybrid|Indica|Sativa)\s*(?::\s*[\w\s]+)?))/gi,
        ];
        for (const pat of namePatterns) {
          const matches = [...before.matchAll(pat)];
          if (matches.length > 0) {
            itemName = matches[matches.length - 1][0].trim();
            break;
          }
        }
        if (!itemName) {
          // Fallback: grab last meaningful line before BATCH
          const lines = before.split(/\n/).filter(l => l.trim().length > 5);
          if (lines.length) itemName = lines[lines.length - 1].trim();
        }
      }

      // Clean up item name
      itemName = itemName.replace(/\s+/g, " ").replace(/\(\d+\.?\d*g,\s*case of \d+\)/gi, "").trim();
      // Remove trailing size info like "(1g," etc
      itemName = itemName.replace(/\s*\(\d+.*$/, "").trim();

      // From the numbers array: discount price is what we're billed per unit, total is the last big number
      let unitPrice = null, discountPrice = null, casePrice = null, total = null, units = null;
      if (nums.length >= 4) {
        unitPrice = nums[0];
        discountPrice = nums[1];
        casePrice = nums[2];
        total = nums[nums.length - 1];
      } else if (nums.length >= 2) {
        discountPrice = nums[0];
        total = nums[nums.length - 1];
      }

      // Find units count
      const unitsMatch = chunk.match(/(\d+)\s*\$[\d,]+\.[\d]{2}\s*$/);
      if (!unitsMatch) {
        // Try to derive from case price and discount price
        if (casePrice && discountPrice && discountPrice > 0) {
          units = Math.round(casePrice / discountPrice);
        }
      }

      if (discountPrice !== null && itemName) {
        items.push({
          name: itemName,
          batch,
          unitPrice: unitPrice || discountPrice,
          discountPrice,
          casePrice,
          total,
          units: units || (total && discountPrice ? Math.round(total / discountPrice) : null),
        });
      }
    }
    return items;
  };

  // Parse Excel wholesale menu
  const parseMenu = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const wb = window.XLSX.read(e.target.result, { type: "array" });
        const menu = {};
        for (const sheetName of wb.SheetNames) {
          const ws = wb.Sheets[sheetName];
          const data = window.XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
          // Find header row with "PRODUCT NAME" or column patterns
          let nameCol = -1, priceCol = -1, msrpCol = -1, batchCol = -1, binCol = -1;
          for (let r = 0; r < Math.min(10, data.length); r++) {
            const row = data[r];
            if (!row) continue;
            for (let c = 0; c < row.length; c++) {
              const v = String(row[c] || "").toLowerCase().trim();
              if (v === "product name") nameCol = c;
              if (v.includes("gold") && v.includes("$")) priceCol = c;
              if (v === "msrp $" || v === "msrp") msrpCol = c;
              if (v === "batch #" || v === "batch") batchCol = c;
              if (v === "bin size") binCol = c;
            }
          }
          if (nameCol < 0) { nameCol = 1; } // Default: column B
          if (priceCol < 0) { priceCol = 11; } // Default: column L

          for (let r = 3; r < data.length; r++) {
            const row = data[r];
            if (!row) continue;
            const name = row[nameCol];
            const price = row[priceCol];
            const batch = batchCol >= 0 ? row[batchCol] : null;
            const msrp = msrpCol >= 0 ? row[msrpCol] : null;
            const bin = binCol >= 0 ? row[binCol] : null;
            if (name && typeof price === "number" && price > 0) {
              const key = String(name).trim();
              menu[key] = { price, batch: String(batch || ""), msrp, bin, name: key };
            }
            // Also check for volume discount notes
            if (name && typeof name === "string" && (name.includes("GET FOR $") || name.includes("BUY"))) {
              const promoMatch = name.match(/GET FOR \$([\d.]+)/i);
              if (promoMatch) {
                menu["__promo_" + r] = { note: name, promoPrice: parseFloat(promoMatch[1]) };
              }
            }
          }
        }
        resolve(menu);
      };
      reader.readAsArrayBuffer(file);
    });
  };

  // Match invoice items to menu items
  const matchItems = (invoiceItems, menu) => {
    const menuEntries = Object.entries(menu).filter(([k]) => !k.startsWith("__promo_"));
    const results = [];
    for (const inv of invoiceItems) {
      let matched = null;
      // 1. Try batch match
      for (const [, mdata] of menuEntries) {
        if (inv.batch && mdata.batch && mdata.batch.includes(inv.batch)) {
          matched = mdata; break;
        }
      }
      // 2. Try name matching (fuzzy)
      if (!matched) {
        const invLower = inv.name.toLowerCase();
        const invWords = invLower.split(/[\s\-:]+/).filter(w => w.length > 2);
        let bestScore = 0;
        for (const [, mdata] of menuEntries) {
          const menuLower = mdata.name.toLowerCase();
          // Count matching words
          const score = invWords.filter(w => menuLower.includes(w)).length;
          // Require at least 40% match and better than previous
          if (score > bestScore && score >= Math.max(2, invWords.length * 0.35)) {
            bestScore = score; matched = mdata;
          }
        }
      }

      const menuPrice = matched ? matched.price : null;
      const diff = menuPrice !== null ? +(inv.discountPrice - menuPrice).toFixed(2) : null;
      let status;
      if (!matched) status = "notfound";
      else if (Math.abs(diff) < 0.02) status = "match";
      else if (diff < 0) status = "cheaper"; // Invoice cheaper = good for you
      else status = "overcharge"; // Invoice higher = bad

      results.push({
        ...inv,
        menuName: matched ? matched.name : null,
        menuPrice,
        msrp: matched ? matched.msrp : null,
        diff,
        status,
      });
    }
    return results;
  };

  const runVerification = async () => {
    if (!invoiceFile || !menuFile) { toast.show("Please upload both files"); return; }
    setLoading(true); setResults(null);
    try {
      setStatus("Reading invoice PDF...");
      const pdfText = await parsePDF(invoiceFile);
      setStatus("Parsing invoice line items...");
      const invoiceItems = parseInvoiceItems(pdfText);
      if (invoiceItems.length === 0) { toast.show("Could not parse invoice items from PDF", "error"); setLoading(false); return; }
      setStatus("Reading wholesale menu (" + menuFile.name + ")...");
      const menu = await parseMenu(menuFile);
      const menuCount = Object.keys(menu).filter(k => !k.startsWith("__promo_")).length;
      if (menuCount === 0) { toast.show("No products found in menu file", "error"); setLoading(false); return; }
      setStatus("Comparing " + invoiceItems.length + " invoice items against " + menuCount + " menu products...");
      const compared = matchItems(invoiceItems, menu);
      setResults(compared);
      setStatus("");
      const overcharges = compared.filter(r => r.status === "overcharge").length;
      if (overcharges > 0) toast.show(overcharges + " overcharge(s) found!", "error");
      else toast.show("Invoice verified — no overcharges!");
    } catch (err) {
      console.error(err);
      toast.show("Error: " + err.message, "error");
    }
    setLoading(false);
  };

  const handleDrop = (setter, accept) => ({
    onDragOver: (e) => { e.preventDefault(); e.currentTarget.classList.add("dragover"); },
    onDragLeave: (e) => { e.currentTarget.classList.remove("dragover"); },
    onDrop: (e) => { e.preventDefault(); e.currentTarget.classList.remove("dragover"); const f = e.dataTransfer.files[0]; if (f) setter(f); },
  });

  const summary = results ? {
    total: results.length,
    match: results.filter(r => r.status === "match").length,
    cheaper: results.filter(r => r.status === "cheaper").length,
    overcharge: results.filter(r => r.status === "overcharge").length,
    notfound: results.filter(r => r.status === "notfound").length,
    totalSaved: results.filter(r => r.status === "cheaper").reduce((s, r) => s + Math.abs(r.diff) * (r.units || 1), 0),
    totalOver: results.filter(r => r.status === "overcharge").reduce((s, r) => s + r.diff * (r.units || 1), 0),
  } : null;

  return (
    <div className="iv-wrap">
      <div className="iv-header">
        <div className="iv-title">Invoice Verifier</div>
        {results && <button className="iv-reset" onClick={() => { setResults(null); setInvoiceFile(null); setMenuFile(null); }}>Reset</button>}
      </div>
      {!results && <>
        <div className="iv-uploads">
          <div className={"iv-drop-zone" + (invoiceFile ? " has-file" : "")} onClick={() => invoiceRef.current?.click()} {...handleDrop(setInvoiceFile, ".pdf")}>
            <input type="file" ref={invoiceRef} accept=".pdf" style={{display:"none"}} onChange={e => { if(e.target.files[0]) setInvoiceFile(e.target.files[0]); }} />
            {invoiceFile ? <>
              <div className="iv-drop-icon">&#10003;</div>
              <div className="iv-drop-file">{invoiceFile.name}</div>
              <div className="iv-drop-label">Invoice PDF loaded</div>
            </> : <>
              <div className="iv-drop-icon">&#128196;</div>
              <div className="iv-drop-label">Drop Invoice PDF here</div>
              <div style={{fontSize:11,color:"var(--muted)"}}>or click to browse</div>
            </>}
          </div>
          <div className={"iv-drop-zone" + (menuFile ? " has-file" : "")} onClick={() => menuRef.current?.click()} {...handleDrop(setMenuFile, ".xlsx")}>
            <input type="file" ref={menuRef} accept=".xlsx,.xls,.csv" style={{display:"none"}} onChange={e => { if(e.target.files[0]) setMenuFile(e.target.files[0]); }} />
            {menuFile ? <>
              <div className="iv-drop-icon">&#10003;</div>
              <div className="iv-drop-file">{menuFile.name}</div>
              <div className="iv-drop-label">Wholesale menu loaded</div>
            </> : <>
              <div className="iv-drop-icon">&#128202;</div>
              <div className="iv-drop-label">Drop Wholesale Menu here</div>
              <div style={{fontSize:11,color:"var(--muted)"}}>Excel (.xlsx) or CSV</div>
            </>}
          </div>
        </div>
        <button className="iv-btn" disabled={!invoiceFile || !menuFile || loading} onClick={runVerification}>
          {loading ? "Verifying..." : "Verify Invoice"}
        </button>
        {status && <div className="iv-progress">{status}</div>}
      </>}
      {results && summary && <>
        <div className="iv-summary">
          <div className="iv-stat ok"><div className="iv-stat-num">{summary.match}</div><div className="iv-stat-label">Price Match</div></div>
          <div className={"iv-stat" + (summary.cheaper > 0 ? " ok" : "")}><div className="iv-stat-num">{summary.cheaper}</div><div className="iv-stat-label">Discounted</div></div>
          <div className={"iv-stat" + (summary.overcharge > 0 ? " err" : " ok")}><div className="iv-stat-num">{summary.overcharge}</div><div className="iv-stat-label">Overcharged</div></div>
          <div className={"iv-stat" + (summary.notfound > 0 ? " warn" : "")}><div className="iv-stat-num">{summary.notfound}</div><div className="iv-stat-label">Not Found</div></div>
        </div>
        {(summary.totalSaved > 0 || summary.totalOver > 0) && (
          <div style={{display:"flex",gap:12,marginBottom:16,justifyContent:"center",flexWrap:"wrap"}}>
            {summary.totalSaved > 0 && <div style={{background:"#e8f5ec",color:"#166534",padding:"8px 16px",borderRadius:8,fontSize:13,fontWeight:600}}>You saved ${summary.totalSaved.toFixed(2)} vs menu prices</div>}
            {summary.totalOver > 0 && <div style={{background:"#fef2f2",color:"var(--red)",padding:"8px 16px",borderRadius:8,fontSize:13,fontWeight:600}}>Overcharged by ${summary.totalOver.toFixed(2)}</div>}
          </div>
        )}
        <div className="iv-table-wrap">
          <table className="iv-table">
            <thead><tr><th>Item</th><th>Invoice $/unit</th><th>Menu $/unit</th><th>Diff</th><th>Units</th><th>Total</th><th>Status</th></tr></thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i} className={r.status}>
                  <td style={{maxWidth:220,fontWeight:500}}><div style={{lineHeight:1.3}}>{r.name}</div>{r.batch && <div style={{fontSize:10,color:"var(--muted)",fontFamily:"var(--mono)"}}>{r.batch}</div>}</td>
                  <td style={{fontFamily:"var(--mono)"}}>${r.discountPrice?.toFixed(2)}</td>
                  <td style={{fontFamily:"var(--mono)"}}>{r.menuPrice !== null ? "$" + r.menuPrice.toFixed(2) : "—"}</td>
                  <td style={{fontFamily:"var(--mono)",fontWeight:600,color: r.diff > 0.01 ? "var(--red)" : r.diff < -0.01 ? "var(--green)" : "var(--text)"}}>
                    {r.diff !== null ? (r.diff > 0 ? "+" : "") + r.diff.toFixed(2) : "—"}
                  </td>
                  <td style={{fontFamily:"var(--mono)"}}>{r.units || "—"}</td>
                  <td style={{fontFamily:"var(--mono)"}}>{r.total ? "$" + r.total.toFixed(2) : "—"}</td>
                  <td>
                    {r.status === "match" && <span className="iv-badge ok">Match</span>}
                    {r.status === "cheaper" && <span className="iv-badge save">Savings</span>}
                    {r.status === "overcharge" && <span className="iv-badge over">Overcharge</span>}
                    {r.status === "notfound" && <span className="iv-badge miss">Not Found</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>}
    </div>
  );
}

// ─── ADMIN: VENDOR ───────────────────────────────────────────────────────────
function AdminVendor({ notifications, setNotifications, toast, settings }) {
  const [fields, setFields] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("crewos_vendor_fields"));
      if (!saved) return DEFAULT_VENDOR_FIELDS;
      const hasInvoice = saved.some(f => f.name && f.name.toLowerCase().includes("invoice"));
      const hasBadSig = saved.some(f => f.name && f.name.toLowerCase().includes("signature") && !f.type.includes("Signature"));
      if (hasInvoice || hasBadSig) { localStorage.setItem("crewos_vendor_fields", JSON.stringify(DEFAULT_VENDOR_FIELDS)); return DEFAULT_VENDOR_FIELDS; }
      return saved;
    } catch { return DEFAULT_VENDOR_FIELDS; }
  });
  const [newField, setNewField] = useState("");
  const [deliveryLog, setDeliveryLog] = useState(() => { try { return JSON.parse(localStorage.getItem("crewos_deliveries"))||[]; } catch { return []; } });

  // Save fields to localStorage so the vendor form page reads them
  useEffect(() => { localStorage.setItem("crewos_vendor_fields", JSON.stringify(fields)); }, [fields]);
  useEffect(() => { localStorage.setItem("crewos_deliveries", JSON.stringify(deliveryLog)); }, [deliveryLog]);

  // Poll for new deliveries from vendor form submissions
  useEffect(() => {
    const iv = setInterval(() => {
      try {
        const fresh = JSON.parse(localStorage.getItem("crewos_deliveries")) || [];
        if (fresh.length !== deliveryLog.length) setDeliveryLog(fresh);
        const freshNotifs = JSON.parse(localStorage.getItem("crewos_notifs")) || [];
        if (freshNotifs.length !== notifications.length) setNotifications(freshNotifs);
      } catch {}
    }, 2000);
    return () => clearInterval(iv);
  }, [deliveryLog.length, notifications.length]);

  // Build the QR code URL pointing to the vendor form (include Firebase URL if configured)
  const fbUrl = settings.firebaseUrl || "";
  const vendorFormBase = window.location.origin + window.location.pathname + "#/vendor-form";
  const vendorFormUrl = fbUrl ? vendorFormBase + "?fb=" + encodeURIComponent(fbUrl) : vendorFormBase;

  const openVendorForm = () => {
    const base = window.location.pathname + "#/vendor-form";
    window.open(fbUrl ? base + "?fb=" + encodeURIComponent(fbUrl) : base, "_blank");
  };

  // Save vendor form fields to Firebase so the phone can load them
  useEffect(() => {
    if (fbUrl && fields.length > 0) {
      const cleanUrl = fbUrl.replace(/\/+$/, "");
      fetch(cleanUrl + "/vendor_fields.json", { method: "PUT", body: JSON.stringify(fields) }).catch(() => {});
    }
  }, [fields, fbUrl]);

  return (
    <div>
      <div className="vendor-section">
        <div>
          <div className="qr-box">
            <div style={{background:"#fff",padding:16,borderRadius:12,display:"inline-block",marginBottom:16,border:"1px solid var(--border)"}}>
              <QRCodeSVG value={vendorFormUrl} size={160} level="M" />
            </div>
            <div style={{fontWeight:600,marginBottom:6,fontSize:15}}>Vendor Delivery Check-In</div>
            <div style={{fontSize:12,color:"var(--muted2)",marginBottom:8}}>Vendors scan this QR code with their phone camera to open the delivery form.</div>
            <div style={{fontSize:11,color:"var(--muted)",wordBreak:"break-all",background:"var(--bg4)",padding:"8px 12px",borderRadius:8,marginBottom:12,fontFamily:"var(--mono)",userSelect:"all",cursor:"text"}}>{vendorFormUrl}</div>
            <div style={{display:"flex",gap:8,justifyContent:"center"}}>
              <button className="btn small" onClick={() => { navigator.clipboard.writeText(vendorFormUrl); toast.show("Link copied!"); }}>Copy Link</button>
              <button className="btn small primary" onClick={openVendorForm}>Open Vendor Form</button>
            </div>
            <div style={{fontSize:10,color:"var(--amber)",marginTop:12,background:"rgba(217,119,6,.06)",padding:"8px 12px",borderRadius:8,border:"1px solid rgba(217,119,6,.15)",textAlign:"left",lineHeight:1.6}}>
              <strong>Note:</strong> The QR code currently points to localhost which only works on this computer.
              To let vendors scan with their phone, deploy this app to a public URL (e.g. GitHub Pages).
              For now, use the "Open Vendor Form" button to test it in a new tab.
            </div>
          </div>
          {/* ── Active Deliveries (removable) ── */}
          {(() => {
            const pdArr = JSON.parse(localStorage.getItem("crewos_pending_deliveries") || "[]");
            if (pdArr.length === 0) return null;
            return (
              <div style={{marginTop:16}}>
                <div className="sec-head">Active Deliveries ({pdArr.length})</div>
                <div style={{fontSize:11,color:"var(--muted2)",marginBottom:10}}>These deliveries are currently visible to staff. Remove completed or test deliveries here.</div>
                {pdArr.map(d => (
                  <div className="vendor-entry" key={d.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <div>
                      <div style={{fontWeight:500,fontSize:13}}>{d.company}</div>
                      <div style={{fontSize:11,color:"var(--muted2)",marginTop:2}}>{d.time}</div>
                    </div>
                    <button className="btn small danger" onClick={() => {
                      const updated = JSON.parse(localStorage.getItem("crewos_pending_deliveries") || "[]").filter(x => x.id !== d.id);
                      localStorage.setItem("crewos_pending_deliveries", JSON.stringify(updated));
                      // Also remove from Firebase pending_delivery AND deliveries
                      if (fbUrl) {
                        const base = fbUrl.replace(/\/+$/, "");
                        // Remove from pending_delivery
                        fetch(base + "/pending_delivery.json")
                          .then(r => r.json())
                          .then(data => {
                            if (data && typeof data === "object") {
                              Object.entries(data).forEach(([key, val]) => {
                                if (val && val.id === d.id) {
                                  fetch(base + "/pending_delivery/" + key + ".json", { method: "DELETE" }).catch(() => {});
                                }
                              });
                            }
                          }).catch(() => {});
                        // Remove from deliveries path too
                        fetch(base + "/deliveries.json")
                          .then(r => r.json())
                          .then(data => {
                            if (data && typeof data === "object") {
                              Object.entries(data).forEach(([key, val]) => {
                                if (val && val.id === d.id) {
                                  fetch(base + "/deliveries/" + key + ".json", { method: "DELETE" }).catch(() => {});
                                }
                              });
                            }
                          }).catch(() => {});
                      }
                      toast.show("Delivery removed: " + d.company, "warning");
                      // Force re-render
                      setDeliveryLog(prev => [...prev]);
                    }}>Remove</button>
                  </div>
                ))}
                <button className="btn small" style={{marginTop:8,width:"100%"}} onClick={() => {
                  localStorage.setItem("crewos_pending_deliveries", "[]");
                  // Clear all from Firebase (both paths)
                  if (fbUrl) {
                    const base = fbUrl.replace(/\/+$/, "");
                    fetch(base + "/pending_delivery.json", { method: "DELETE" }).catch(() => {});
                    fetch(base + "/deliveries.json", { method: "DELETE" }).catch(() => {});
                  }
                  toast.show("All active deliveries cleared", "warning");
                  setDeliveryLog(prev => [...prev]);
                }}>Clear All Deliveries</button>
              </div>
            );
          })()}
          {deliveryLog.length>0 && <div style={{marginTop:16}}>
            <div className="sec-head">Delivery Log ({deliveryLog.length})</div>
            {deliveryLog.slice(0,10).map(d => (
              <div className="vendor-entry" key={d.id}>
                <div style={{fontWeight:500,fontSize:13}}>{d.company}</div>
                <div style={{fontSize:11,color:"var(--muted2)",marginTop:4}}>{d.time}</div>
              </div>
            ))}
          </div>}
        </div>
        <div>
          <div className="sec-head">Delivery Form Fields</div>
          <div style={{fontSize:11,color:"var(--muted2)",marginBottom:12}}>Customize the questions vendors see when they scan the QR code.</div>
          {fields.map(f => (
            <div className="form-item" key={f.id}>
              <span className="form-item-name">{f.name}</span>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span className="form-item-type">{f.type}</span>
                <button className="btn small danger" onClick={() => setFields(fs => fs.filter(x => x.id !== f.id))}>&#10005;</button>
              </div>
            </div>
          ))}
          <div style={{display:"flex",gap:8,marginTop:10}}>
            <input type="text" placeholder="Add custom field..." value={newField} onChange={e => setNewField(e.target.value)} />
            <button className="btn primary" style={{whiteSpace:"nowrap"}} onClick={() => { if (!newField.trim()) return; setFields(fs => [...fs, {id:Date.now(), name:newField, type:"Custom - Text"}]); setNewField(""); toast.show("Field added"); }}>Add</button>
          </div>
        </div>
      </div>
      <InvoiceVerifier toast={toast} />
    </div>
  );
}

// ─── ADMIN: ALERTS ───────────────────────────────────────────────────────────
function AdminAlerts({ notifications, setNotifications }) {
  const typeMap = { mismatch:"danger", late:"warn", vendor:"info", schedule:"ok", drawer:"danger" };
  return (
    <div>
      {notifications.length>0 && <div style={{marginBottom:14,textAlign:"right"}}><button className="btn small danger" onClick={() => setNotifications([])}>Clear All</button></div>}
      {notifications.length===0 && <div style={{color:"var(--muted2)",fontSize:13,padding:"40px 0",textAlign:"center"}}>No alerts yet.</div>}
      {notifications.map(n => <div key={n.id} className={"notif "+(typeMap[n.type]||"info")} style={{display:"flex",alignItems:"flex-start",gap:10}}><div style={{flex:1}}><div className="notif-title">{n.title}</div><div className="notif-desc">{n.desc}</div><div className="notif-time">{n.time}</div></div><span onClick={() => setNotifications(prev => prev.filter(x => x.id !== n.id))} style={{cursor:"pointer",fontSize:18,lineHeight:1,color:"var(--muted2)",padding:"2px 6px",borderRadius:6,flexShrink:0}} onMouseOver={e => e.target.style.color="var(--red)"} onMouseOut={e => e.target.style.color="var(--muted2)"}>&times;</span></div>)}
    </div>
  );
}

// ─── ADMIN: CASH DRAWER AUDIT ────────────────────────────────────────────────
function AdminDrawer({ drawerLogs }) {
  const grouped = {};
  drawerLogs.forEach(log => {
    const date = new Date(log.time).toLocaleDateString();
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(log);
  });
  const dates = Object.keys(grouped).sort((a,b) => new Date(b) - new Date(a));

  return (
    <div>
      <div className="sec-head">Cash Drawer Audit Trail</div>
      {dates.length === 0 && <div style={{color:"var(--muted2)",fontSize:13,padding:"40px 0",textAlign:"center"}}>No drawer records yet.</div>}
      {dates.map(date => (
        <div className="card" key={date}>
          <div style={{fontSize:13,fontWeight:600,marginBottom:12}}>{date}</div>
          <div className="drawer-history">
            {grouped[date].map((log, i) => (
              <div className="drawer-row" key={i}>
                <div>
                  <span style={{fontWeight:500}}>{log.employeeName}</span>
                  <span style={{color:"var(--muted2)",marginLeft:8,fontSize:11}}>
                    {log.cashierNum} &middot; {log.type === "open" ? "Opening" : "Closing"}
                  </span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontFamily:"var(--mono)",fontWeight:600,color:log.discrepancy ? "var(--red)" : "var(--text)"}}>
                    ${log.amount.toFixed(2)}
                  </span>
                  <span style={{fontSize:10,color:"var(--muted)",fontFamily:"var(--mono)"}}>
                    {new Date(log.time).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}
                  </span>
                  {log.discrepancy && <span style={{fontSize:10,color:"var(--red)",fontWeight:600}}>&#9888; ${Math.abs(log.discrepancyAmount).toFixed(2)} {log.discrepancyAmount > 0 ? "over" : "short"}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── ADMIN: SETTINGS ─────────────────────────────────────────────────────────
// ─── GEOFENCE HELPERS ────────────────────────────────────────────────────────
function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function metersToFeet(m) { return Math.round(m * 3.28084); }
function feetToMeters(f) { return f / 3.28084; }

// Geocode address using free Nominatim API
async function geocodeAddress(address) {
  try {
    const res = await fetch("https://nominatim.openstreetmap.org/search?format=json&q=" + encodeURIComponent(address) + "&limit=1", {
      headers: { "Accept-Language": "en" }
    });
    const data = await res.json();
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), display: data[0].display_name };
    }
    return null;
  } catch { return null; }
}

function AdminSettings({ settings, setSettings }) {
  const [geoAddress, setGeoAddress] = useState(settings.geoAddress || "");
  const [geoStatus, setGeoStatus] = useState("");
  const [geoLoading, setGeoLoading] = useState(false);

  const lookupAddress = async () => {
    if (!geoAddress.trim()) return;
    setGeoLoading(true);
    setGeoStatus("Looking up address...");
    const result = await geocodeAddress(geoAddress);
    setGeoLoading(false);
    if (result) {
      setSettings(s => ({ ...s, geoLat: result.lat, geoLng: result.lng, geoAddress: geoAddress, geoDisplay: result.display }));
      setGeoStatus("Location set: " + result.display);
    } else {
      setGeoStatus("Address not found. Try a more specific address.");
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) { setGeoStatus("Geolocation not supported by this browser"); return; }
    setGeoLoading(true);
    setGeoStatus("Getting your current location...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setSettings(s => ({ ...s, geoLat: pos.coords.latitude, geoLng: pos.coords.longitude, geoAddress: geoAddress || "Current Location", geoDisplay: "Lat " + pos.coords.latitude.toFixed(6) + ", Lng " + pos.coords.longitude.toFixed(6) }));
        setGeoStatus("Location set from GPS: " + pos.coords.latitude.toFixed(6) + ", " + pos.coords.longitude.toFixed(6));
        setGeoLoading(false);
      },
      (err) => { setGeoStatus("Location error: " + err.message); setGeoLoading(false); }
    );
  };

  return (
    <div>
      <div className="sec-head">Geofence Lock</div>
      <div className="card">
        <div className="setting-row">
          <div><div className="setting-label">Enable geofence</div><div className="setting-sub">Employees can only clock in when they are at the store</div></div>
          <div className={"toggle"+(settings.geoEnabled?" on":"")} onClick={() => setSettings(s=>({...s,geoEnabled:!s.geoEnabled}))}><div className="toggle-knob" /></div>
        </div>
        {settings.geoEnabled && <>
          <div className="setting-row" style={{flexDirection:"column",alignItems:"stretch",gap:10}}>
            <div><div className="setting-label">Store address</div><div className="setting-sub">Enter your store address and click "Set Location" to save the GPS coordinates</div></div>
            <div style={{display:"flex",gap:8}}>
              <input type="text" value={geoAddress} onChange={e => setGeoAddress(e.target.value)} placeholder="e.g. 123 Main St, New York, NY 10001" style={{flex:1}} onKeyDown={e => e.key === "Enter" && lookupAddress()} />
              <button className="btn primary small" onClick={lookupAddress} disabled={geoLoading || !geoAddress.trim()}>Set Location</button>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button className="btn small" onClick={useCurrentLocation} disabled={geoLoading}>
                &#128205; Use My Current Location
              </button>
            </div>
            {geoStatus && (
              <div style={{fontSize:12,color:geoStatus.includes("not found") || geoStatus.includes("error") ? "var(--red)" : "var(--green)",background:geoStatus.includes("not found") || geoStatus.includes("error") ? "rgba(220,38,38,.04)" : "rgba(22,163,74,.04)",padding:"8px 12px",borderRadius:8,border:"1px solid " + (geoStatus.includes("not found") || geoStatus.includes("error") ? "rgba(220,38,38,.15)" : "rgba(22,163,74,.15)")}}>
                {geoStatus}
              </div>
            )}
            {settings.geoLat && settings.geoLng && (
              <div style={{fontSize:11,color:"var(--muted2)",fontFamily:"var(--mono)",background:"var(--bg4)",padding:"8px 12px",borderRadius:8}}>
                Saved: {settings.geoDisplay || (settings.geoLat.toFixed(6) + ", " + settings.geoLng.toFixed(6))}
              </div>
            )}
          </div>
          <div className="setting-row">
            <div><div className="setting-label">Radius (feet)</div><div className="setting-sub">How close employees must be to clock in</div></div>
            <input type="number" min={50} max={5000} step={50} value={settings.geoRadius || 150} onChange={e => setSettings(s=>({...s,geoRadius:parseInt(e.target.value)||150}))} style={{width:80}} />
          </div>
        </>}
      </div>

      <div className="sec-head">NFC Clock-In</div>
      <div className="card">
        <div className="setting-row" style={{borderBottom:"none"}}>
          <div><div className="setting-label">Enable NFC tap to clock in/out</div><div className="setting-sub">Employees tap their phone on an NFC sticker to clock in or out (requires Android + Chrome)</div></div>
          <div className={"toggle"+(settings.nfcEnabled?" on":"")} onClick={() => setSettings(s=>({...s,nfcEnabled:!s.nfcEnabled}))}><div className="toggle-knob" /></div>
        </div>
      </div>

      <div className="sec-head">Cash Drawer</div>
      <div className="card">
        <div className="setting-row" style={{borderBottom:"none"}}>
          <div><div className="setting-label">Enable cash drawer</div><div className="setting-sub">Require staff to count the cash drawer when clocking in and out</div></div>
          <div className={"toggle"+(settings.drawerEnabled !== false?" on":"")} onClick={() => setSettings(s=>({...s,drawerEnabled:s.drawerEnabled === false ? true : false}))}><div className="toggle-knob" /></div>
        </div>
      </div>

      <div className="sec-head">NFC Clock-In</div>
      <div className="card">
        <div className="setting-row">
          <div><div className="setting-label">Enable NFC clock-in</div><div className="setting-sub">Let employees clock in/out by tapping an NFC tag at the store</div></div>
          <div className={"toggle"+(settings.nfcEnabled?" on":"")} onClick={() => {
            const next = !settings.nfcEnabled;
            const updates = { nfcEnabled: next };
            if (next && !settings.nfcLocationId) updates.nfcLocationId = uid();
            setSettings(s => ({ ...s, ...updates }));
          }}><div className="toggle-knob" /></div>
        </div>
        {settings.nfcEnabled && <>
          {!settings.firebaseUrl && (
            <div style={{fontSize:12,color:"var(--amber)",background:"rgba(217,119,6,.04)",padding:"10px 14px",borderRadius:8,border:"1px solid rgba(217,119,6,.15)",marginTop:8}}>
              <strong>Firebase required:</strong> NFC clock-in needs Cloud Sync enabled. Set up your Firebase URL below first.
            </div>
          )}
          {settings.firebaseUrl && (() => {
            const nfcUrl = window.location.origin + window.location.pathname + "#/nfc-clock?fb=" + encodeURIComponent(settings.firebaseUrl) + "&loc=" + (settings.nfcLocationId || "");
            return (
              <div style={{marginTop:12}}>
                <div style={{fontSize:12,fontWeight:600,marginBottom:8,color:"var(--muted3)"}}>NFC Tag URL</div>
                <div style={{fontSize:11,color:"var(--muted)",wordBreak:"break-all",background:"var(--bg4)",padding:"10px 14px",borderRadius:8,fontFamily:"var(--mono)",userSelect:"all",cursor:"text",marginBottom:10,lineHeight:1.6}}>{nfcUrl}</div>
                <div style={{display:"flex",gap:8,marginBottom:12}}>
                  <button className="btn small primary" onClick={() => { navigator.clipboard.writeText(nfcUrl); }}>Copy URL</button>
                  <button className="btn small" onClick={() => window.open(nfcUrl, "_blank")}>Test It</button>
                </div>
                <div style={{background:"#fff",padding:16,borderRadius:12,display:"inline-block",border:"1px solid var(--border)",marginBottom:12}}>
                  <QRCodeSVG value={nfcUrl} size={140} level="M" />
                </div>
                <div style={{fontSize:11,color:"var(--muted2)",lineHeight:1.7}}>
                  <strong>Setup instructions:</strong><br/>
                  1. Buy NTAG215 NFC stickers (Amazon, ~$10 for 50)<br/>
                  2. Download "NFC Tools" app on your iPhone<br/>
                  3. Write this URL to the NFC tag using the app<br/>
                  4. Stick the tag at your store entrance<br/>
                  5. Employees tap their iPhone on the tag → enter PIN → clocked in!
                </div>
              </div>
            );
          })()}
        </>}
      </div>

      <div className="sec-head">Clock-In Rules</div>
      <div className="card">
        <div className="setting-row">
          <div><div className="setting-label">Late threshold (minutes)</div><div className="setting-sub">Alert when employee clocks in/out late</div></div>
          <input type="number" min={1} max={60} value={settings.lateThreshold} onChange={e => setSettings(s=>({...s,lateThreshold:parseInt(e.target.value)||5}))} style={{width:70}} />
        </div>
        <div className="setting-row" style={{borderBottom:"none"}}>
          <div><div className="setting-label">Early threshold (minutes)</div><div className="setting-sub">Alert when employee clocks in too early</div></div>
          <input type="number" min={1} max={60} value={settings.earlyThreshold} onChange={e => setSettings(s=>({...s,earlyThreshold:parseInt(e.target.value)||5}))} style={{width:70}} />
        </div>
      </div>
      <div className="sec-head">Notifications</div>
      <div className="card">
        {[["notifyMismatch","Wrong employee alert","Notify when wrong employee clocks in"],["notifyLate","Late/early alert","Notify when employee exceeds threshold"],["notifyVendor","Vendor delivery alert","Notify when vendor form is submitted"]].map(([key,label,sub]) => (
          <div key={key} className="setting-row">
            <div><div className="setting-label">{label}</div><div className="setting-sub">{sub}</div></div>
            <div className={"toggle"+(settings[key]?" on":"")} onClick={() => setSettings(s=>({...s,[key]:!s[key]}))}><div className="toggle-knob" /></div>
          </div>
        ))}
      </div>

      <div className="sec-head">Cloud Sync (Firebase)</div>
      <div className="card">
        <div className="setting-row" style={{flexDirection:"column",alignItems:"stretch",gap:10}}>
          <div>
            <div className="setting-label">Firebase Realtime Database URL</div>
            <div className="setting-sub">Required for vendor form to work from other devices (phones). Create a free Firebase project, enable Realtime Database, and paste the URL here.</div>
          </div>
          <input type="text" value={settings.firebaseUrl || ""} onChange={e => setSettings(s=>({...s,firebaseUrl:e.target.value.trim()}))} placeholder="https://your-project.firebaseio.com" />
          {settings.firebaseUrl && <button className="btn primary small" style={{marginTop:8}} onClick={async () => {
            const fbUrl = settings.firebaseUrl;
            const pushData = { employees, schedule, clockLogs, tasks, overrides, notifications, drawerLogs, shiftNotes, _lastUpdated: Date.now(), _updatedBy: "admin_push" };
            await firebaseSet(fbUrl, "crewos_data", pushData);
            toast.show("All data pushed to Firebase!");
          }}>Push All Data to Cloud Now</button>}
          {settings.firebaseUrl && <button className="btn small" style={{marginTop:6}} onClick={async () => {
            const fbUrl = settings.firebaseUrl;
            const data = await firebaseGet(fbUrl, "crewos_data");
            if (data && data.employees) {
              setEmployees(data.employees);
              if (data.schedule) setSchedule(data.schedule);
              if (data.clockLogs) setClockLogs(data.clockLogs);
              if (data.tasks) setTasks(data.tasks);
              if (data.overrides) setOverrides(data.overrides);
              if (data.drawerLogs) setDrawerLogs(data.drawerLogs);
              if (data.shiftNotes) setShiftNotes(data.shiftNotes);
              if (data.announcements) setAnnouncements(data.announcements);
              toast.show("Data pulled from cloud!");
            } else { toast.show("No data found in cloud", "error"); }
          }}>Pull Data from Cloud</button>}
          {settings.firebaseUrl && (
            <div style={{fontSize:11,color:"var(--green)",background:"rgba(22,163,74,.04)",padding:"8px 12px",borderRadius:8,border:"1px solid rgba(22,163,74,.15)"}}>
              \u2713 Firebase connected! All data syncs across devices: employees, schedules, clock logs, tasks, payroll, and vendor deliveries.
            </div>
          )}
          {!settings.firebaseUrl && (
            <div style={{fontSize:11,color:"var(--amber)",background:"rgba(217,119,6,.04)",padding:"8px 12px",borderRadius:8,border:"1px solid rgba(217,119,6,.15)",lineHeight:1.6}}>
              <strong>Without Firebase:</strong> Each device has its own data. Employees added on one device won&apos;t appear on another.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── EMPLOYEE: MY SCHEDULE ───────────────────────────────────────────────────
function EmpSchedule({ employee, schedule }) {
  const [weekStart, setWeekStart] = useState(getWeekStart());

  // Check if schedule is submitted for this week
  let isPublished = false;
  try { const sw = JSON.parse(localStorage.getItem("crewos_submitted_weeks")) || {}; isPublished = !!sw[weekStart]; } catch {}

  // Scan ALL schedule keys for this week to find shifts assigned to this employee
  const myShifts = [];
  const prefix = weekStart + "_";
  Object.keys(schedule).forEach(key => {
    if (!key.startsWith(prefix)) return;
    const c = schedule[key];
    if (c && c.empId === employee.id && c.start && c.end) {
      const parts = key.split("_");
      const dayIdx = parseInt(parts[parts.length - 1], 10);
      if (dayIdx >= 0 && dayIdx < 7) {
        myShifts.push({
          day: DAY_FULL[dayIdx],
          date: formatDate(addDays(weekStart, dayIdx)),
          start: c.start,
          end: c.end,
          hours: calcShiftHours(c.start, c.end),
          dayIdx,
        });
      }
    }
  });
  myShifts.sort((a, b) => a.dayIdx - b.dayIdx);

  const totalHrs = myShifts.reduce((s, x) => s + x.hours, 0);

  // Build calendar grid data — group shifts by day
  const calDays = DAY_FULL.map((dayName, di) => {
    const dayDate = new Date(new Date(weekStart + "T00:00:00"));
    dayDate.setDate(dayDate.getDate() + di);
    const dateLabel = dayDate.toLocaleDateString("en-US", { month:"short", day:"numeric" }).toUpperCase();
    const shift = myShifts.find(s => s.dayIdx === di);
    return { dayName, dateLabel, shift };
  });

  return (
    <div>
      <div className="week-nav">
        <button className="btn small" onClick={() => setWeekStart(addDays(weekStart,-7))}>&#8592; Prev</button>
        <div className="week-label">{formatDate(weekStart)} &ndash; {formatDate(addDays(weekStart,6))}</div>
        <button className="btn small" onClick={() => setWeekStart(addDays(weekStart,7))}>Next &#8594;</button>
      </div>
      {!isPublished && (
        <div style={{padding:"12px 16px",background:"rgba(217,119,6,.06)",borderRadius:10,border:"1px solid rgba(217,119,6,.15)",fontSize:12,color:"var(--amber)",marginBottom:14,display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:14}}>&#9888;</span> Schedule for this week has not been published yet. Check back later.
        </div>
      )}
      {myShifts.length > 0 && (
        <div style={{textAlign:"right",fontSize:12,color:"var(--muted2)",marginBottom:10}}>
          Total: <strong style={{color:"var(--green)"}}>{totalHrs}h</strong> this week &middot; {myShifts.length} shift{myShifts.length>1?"s":""}
        </div>
      )}
      {myShifts.length===0 ? (
        <div style={{color:"var(--muted2)",fontSize:13,padding:"40px 0",textAlign:"center"}}>{isPublished ? "You have no shifts scheduled this week." : "Schedule not yet published."}</div>
      ) : (
        <div className="card" style={{padding:0,overflow:"hidden"}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)"}}>
            {calDays.map((day, i) => (
              <div key={i} style={{borderRight:i<6?"1px solid var(--border)":"none",minHeight:140}}>
                <div style={{textAlign:"center",padding:"12px 6px 8px",borderBottom:"1px solid var(--border)",background:"var(--bg4)"}}>
                  <div style={{fontSize:13,fontWeight:700,color:"var(--text)"}}>{day.dayName}</div>
                  <div style={{fontSize:11,color:"var(--muted2)",marginTop:2}}>({day.dateLabel})</div>
                </div>
                <div style={{padding:"8px 6px"}}>
                  {!day.shift ? (
                    <div style={{fontSize:11,color:"var(--muted2)",textAlign:"center",padding:"20px 0",fontStyle:"italic"}}>Off</div>
                  ) : (
                    <div style={{
                      background:"rgba(22,163,74,.10)",
                      borderLeft:"3px solid rgba(22,163,74,.6)",
                      borderRadius:"0 8px 8px 0",
                      padding:"8px 8px",
                    }}>
                      <div style={{fontSize:11,color:"var(--text)",fontWeight:500}}>
                        {formatTimeLabel(day.shift.start)} – {formatTimeLabel(day.shift.end)}
                      </div>
                      <div style={{fontSize:11,fontFamily:"var(--mono)",color:"var(--green)",fontWeight:600,marginTop:3}}>
                        {day.shift.hours}h
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── EMPLOYEE: MY HOURS ──────────────────────────────────────────────────────
function EmpHours({ employee, clockLogs, onClockIn, onClockOut, handoffNotes, onDismissNote, isClockedIn, geoBlocked, geoBlockMsg, geoChecking, onDismissGeo, nfcEnabled }) {
  const myLogs = clockLogs.filter(l => l.employeeId === employee.id);
  const total = calcHours(myLogs);

  // NFC tap-to-clock
  const [nfcStatus, setNfcStatus] = useState("idle"); // idle | listening | unsupported | error
  const [nfcFlash, setNfcFlash] = useState(null); // "in" | "out" | null
  const nfcReaderRef = useRef(null);

  useEffect(() => {
    if (!nfcEnabled) return;
    if (!("NDEFReader" in window)) { setNfcStatus("unsupported"); return; }
    let aborted = false;
    const startNfc = async () => {
      try {
        const reader = new window.NDEFReader();
        nfcReaderRef.current = reader;
        await reader.scan();
        setNfcStatus("listening");
        reader.onreading = () => {
          if (aborted) return;
          // Toggle clock in/out on NFC tap
          if (!isClockedIn) {
            setNfcFlash("in");
            onClockIn();
          } else {
            setNfcFlash("out");
            onClockOut();
          }
          setTimeout(() => setNfcFlash(null), 2000);
        };
        reader.onreadingerror = () => { setNfcStatus("error"); };
      } catch (e) {
        if (!aborted) setNfcStatus("error");
      }
    };
    startNfc();
    return () => { aborted = true; };
  }, [nfcEnabled, isClockedIn]);

  return (
    <div>
      <HandoffBanner notes={handoffNotes} onDismiss={onDismissNote} />

      {/* NFC tap-to-clock banner */}
      {nfcEnabled && (
        <div style={{
          background: nfcFlash === "in" ? "rgba(22,163,74,.12)" : nfcFlash === "out" ? "rgba(220,38,38,.08)" : "rgba(37,99,235,.05)",
          border: "1px solid " + (nfcFlash === "in" ? "rgba(22,163,74,.3)" : nfcFlash === "out" ? "rgba(220,38,38,.2)" : "rgba(37,99,235,.15)"),
          borderRadius: 14, padding: "14px 18px", marginBottom: 16,
          display: "flex", alignItems: "center", gap: 14,
          transition: "all .3s ease"
        }}>
          <div style={{fontSize: 28, lineHeight: 1}}>📱</div>
          <div style={{flex:1}}>
            {nfcFlash === "in" && <div style={{fontSize:14,fontWeight:700,color:"var(--green)"}}>✓ Clocked In via NFC!</div>}
            {nfcFlash === "out" && <div style={{fontSize:14,fontWeight:700,color:"var(--red)"}}>✓ Clocked Out via NFC!</div>}
            {!nfcFlash && nfcStatus === "listening" && (
              <>
                <div style={{fontSize:13,fontWeight:600,color:"var(--text)"}}>NFC Clock-In Ready</div>
                <div style={{fontSize:11,color:"var(--muted2)",marginTop:2}}>Tap your phone on the NFC sticker to {isClockedIn ? "clock out" : "clock in"}</div>
              </>
            )}
            {!nfcFlash && nfcStatus === "unsupported" && (
              <>
                <div style={{fontSize:13,fontWeight:600,color:"var(--amber)"}}>NFC Not Supported</div>
                <div style={{fontSize:11,color:"var(--muted2)",marginTop:2}}>Your browser doesn't support NFC. Use Chrome on Android.</div>
              </>
            )}
            {!nfcFlash && nfcStatus === "error" && (
              <>
                <div style={{fontSize:13,fontWeight:600,color:"var(--red)"}}>NFC Error</div>
                <div style={{fontSize:11,color:"var(--muted2)",marginTop:2}}>Could not start NFC. Make sure NFC is enabled in your phone settings.</div>
              </>
            )}
            {!nfcFlash && nfcStatus === "idle" && (
              <>
                <div style={{fontSize:13,fontWeight:600,color:"var(--muted)"}}>NFC Initializing...</div>
              </>
            )}
          </div>
          {nfcStatus === "listening" && !nfcFlash && (
            <div style={{width:10,height:10,borderRadius:"50%",background:"var(--green)",boxShadow:"0 0 6px rgba(22,163,74,.5)",animation:"pulse 2s infinite"}} />
          )}
        </div>
      )}

      {geoBlocked && (
        <div style={{background:"rgba(220,38,38,.04)",border:"1px solid rgba(220,38,38,.2)",borderRadius:14,padding:18,marginBottom:18,textAlign:"center"}}>
          <div style={{fontSize:32,marginBottom:8}}>&#128205;</div>
          <div style={{fontSize:14,fontWeight:600,color:"var(--red)",marginBottom:6}}>Outside Store Range</div>
          <div style={{fontSize:12,color:"var(--muted3)",lineHeight:1.6,marginBottom:12}}>{geoBlockMsg}</div>
          <button className="btn small" onClick={onDismissGeo}>Dismiss</button>
        </div>
      )}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:18}}>
        <div className="stat"><div className="stat-lbl">Total Hours</div><div className="stat-val">{total}h</div><div className="stat-sub">This period</div></div>
        <div className="stat"><div className="stat-lbl">Status</div><div className="stat-val" style={{color:isClockedIn?"var(--green)":"var(--muted)",fontSize:16,marginTop:6}}>{isClockedIn?"Clocked In":"Clocked Out"}</div></div>
      </div>
      <div className="clock-btns">
        <button className="clock-btn in" onClick={onClockIn} disabled={isClockedIn || geoChecking}>
          {geoChecking ? "Checking location..." : "Clock In"}
        </button>
        <button className="clock-btn out" onClick={onClockOut} disabled={!isClockedIn}>Clock Out</button>
      </div>
      <div className="sec-head">My Log</div>
      {myLogs.length===0 && <div style={{color:"var(--muted2)",fontSize:13,padding:"20px 0",textAlign:"center"}}>No records yet.</div>}
      {[...myLogs].reverse().map((l,i) => (
        <div className="log-row" key={i}>
          <span className={"log-type log-"+l.type}>{l.type==="in"?"IN":"OUT"}</span>
          <span style={{color:"var(--muted3)",fontFamily:"var(--mono)",fontSize:13}}>{new Date(l.time).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</span>
          <span style={{color:"var(--muted2)",fontSize:11}}>{new Date(l.time).toLocaleDateString([],{weekday:"short",month:"short",day:"numeric"})}</span>
          {l.source === "nfc" && <span className="nfc-source">NFC</span>}
        </div>
      ))}
    </div>
  );
}

// ─── EMPLOYEE: MY TASKS ──────────────────────────────────────────────────────
function EmpTasks({ employee, tasks, schedule, firebaseUrl }) {
  const [activeSection, setActiveSection] = useState("daily");
  const [taskStates, setTaskStates] = useState({});
  const [completeModal, setCompleteModal] = useState(null);
  const [now, setNow] = useState(new Date());
  // Photo uploads per task key
  const [taskPhotos, setTaskPhotos] = useState(() => {
    try { return JSON.parse(localStorage.getItem("crewos_task_photos")) || {}; } catch { return {}; }
  });
  const fileInputRef = useRef(null);
  const [photoTarget, setPhotoTarget] = useState(null); // which task key is uploading
  // Multiple pending deliveries (array)
  const [pendingDeliveries, setPendingDeliveries] = useState(() => {
    try {
      // Migrate old single delivery format
      const old = localStorage.getItem("crewos_pending_delivery");
      const arr = JSON.parse(localStorage.getItem("crewos_pending_deliveries")) || [];
      if (old) {
        const parsed = JSON.parse(old);
        if (parsed && !arr.some(d => d.id === parsed.id)) arr.push(parsed);
        localStorage.removeItem("crewos_pending_delivery");
        localStorage.setItem("crewos_pending_deliveries", JSON.stringify(arr));
      }
      return arr;
    } catch { return []; }
  });
  const [completedDeliveryIds, setCompletedDeliveryIds] = useState(new Set());
  const intervals = useRef({});

  // Poll for pending deliveries and update time
  useEffect(() => {
    const checkDeliveries = () => {
      try {
        // Check old single key too (in case vendor form just wrote it)
        const oldSingle = localStorage.getItem("crewos_pending_delivery");
        if (oldSingle) {
          const parsed = JSON.parse(oldSingle);
          if (parsed) {
            setPendingDeliveries(prev => {
              if (prev.some(d => d.id === parsed.id)) return prev;
              const next = [...prev, parsed];
              localStorage.setItem("crewos_pending_deliveries", JSON.stringify(next));
              return next;
            });
            localStorage.removeItem("crewos_pending_delivery");
            setActiveSection("delivery_" + parsed.id);
          }
        }
        // Check array key
        const arr = JSON.parse(localStorage.getItem("crewos_pending_deliveries")) || [];
        if (arr.length > pendingDeliveries.length) {
          const newOnes = arr.filter(d => !pendingDeliveries.some(p => p.id === d.id));
          if (newOnes.length > 0) {
            setPendingDeliveries(arr);
            setActiveSection("delivery_" + newOnes[newOnes.length - 1].id);
          }
        }
      } catch {}
    };

    // Also poll Firebase directly for deliveries (cross-device)
    // Check both "deliveries" and "pending_delivery" paths since vendor form pushes to both
    const checkFirebase = async () => {
      if (!firebaseUrl) return;
      try {
        const [deliveryData, pendingData] = await Promise.all([
          firebaseGet(firebaseUrl, "deliveries"),
          firebaseGet(firebaseUrl, "pending_delivery")
        ]);
        // Merge deliveries from both paths
        const allDeliveries = [];
        if (deliveryData && typeof deliveryData === "object") {
          Object.values(deliveryData).forEach(d => { if (d && d.timestamp) allDeliveries.push(d); });
        }
        if (pendingData && typeof pendingData === "object") {
          Object.values(pendingData).forEach(d => {
            if (d && d.timestamp && !allDeliveries.some(e => e.id === d.id)) allDeliveries.push(d);
          });
        }
        const todayDeliveries = allDeliveries.filter(d =>
          (Date.now() - d.timestamp) < 24 * 60 * 60 * 1000
        );
        // Build set of valid delivery IDs from Firebase
        const fbDeliveryIds = new Set(todayDeliveries.map(d => d.id || d.company + "_" + d.timestamp));
        setPendingDeliveries(prev => {
          let updated = [...prev];
          let changed = false;
          // Add new deliveries from Firebase
          todayDeliveries.forEach(delivery => {
            const deliveryId = delivery.id || delivery.company + "_" + delivery.timestamp;
            if (!updated.some(d => d.id === deliveryId) && !completedDeliveryIds.has(deliveryId)) {
              const company = delivery.company || "Unknown Vendor";
              const timeStr = delivery.time || "";
              updated.push({ company, time: timeStr, id: deliveryId });
              changed = true;
            }
          });
          // Remove deliveries that are no longer on Firebase (admin cleared them)
          const before = updated.length;
          updated = updated.filter(d => fbDeliveryIds.has(d.id) || completedDeliveryIds.has(d.id));
          if (updated.length !== before) changed = true;
          if (changed) {
            localStorage.setItem("crewos_pending_deliveries", JSON.stringify(updated));
            if (updated.length > 0) setActiveSection("delivery_" + updated[updated.length - 1].id);
            else setActiveSection("daily");
          }
          return changed ? updated : prev;
        });
      } catch {}
    };

    const iv = setInterval(() => {
      setNow(new Date());
      checkDeliveries();
    }, 2000);
    // Poll Firebase every 5 seconds
    checkFirebase();
    const fbIv = setInterval(checkFirebase, 5000);
    return () => { clearInterval(iv); clearInterval(fbIv); };
  }, [pendingDeliveries, firebaseUrl, completedDeliveryIds]);

  // Determine employee's delivery role — fallback to staff role (A/B)
  const weekStart = getWeekStart();
  let myDeliveryRole = "";
  try {
    const roles = JSON.parse(localStorage.getItem("crewos_delivery_roles")) || {};
    const roleKey = weekStart + "_" + employee.id;
    if (roles[roleKey]) {
      myDeliveryRole = roles[roleKey];
    } else {
      // Fallback to employee's staff role
      if (employee.role) {
        const r = employee.role.toUpperCase();
        if (r === "A" || r.includes("ROLE A")) myDeliveryRole = "A";
        else if (r === "B" || r.includes("ROLE B")) myDeliveryRole = "B";
      }
      // If still empty, try inferring from other assigned roles
      if (!myDeliveryRole) {
        const allKeys = Object.keys(roles).filter(k => k.startsWith(weekStart + "_") && !k.endsWith("_" + employee.id));
        const otherRoles = allKeys.map(k => roles[k]).filter(Boolean);
        if (otherRoles.includes("A") && !otherRoles.includes("B")) myDeliveryRole = "B";
        else if (otherRoles.includes("B") && !otherRoles.includes("A")) myDeliveryRole = "A";
      }
    }
  } catch {}

  // Filter daily tasks
  const dailyTasks = tasks.filter(t => {
    if (t.category !== "daily") return false;
    if (!t.frequency || t.frequency <= 1) return true;
    const startOfYear = new Date(now.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((now - startOfYear) / 86400000);
    return dayOfYear % t.frequency === 0;
  });

  // Group daily tasks by scheduledTime
  const dailyByTime = {};
  dailyTasks.forEach(t => {
    const key = t.scheduledTime || "00:00";
    if (!dailyByTime[key]) dailyByTime[key] = [];
    dailyByTime[key].push(t);
  });
  Object.keys(dailyByTime).forEach(k => dailyByTime[k].sort((a, b) => (a.order || 0) - (b.order || 0)));
  const dailyTimeSlots = Object.keys(dailyByTime).sort();

  const currentTimeStr = String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");
  const activeSlots = dailyTimeSlots.filter(slot => slot <= currentTimeStr);
  const futureSlots = dailyTimeSlots.filter(slot => slot > currentTimeStr);

  // Delivery tasks template (from admin)
  const deliveryTaskTemplates = myDeliveryRole
    ? tasks.filter(t => t.category === "delivery" && t.role === myDeliveryRole).sort((a, b) => (a.order || 0) - (b.order || 0))
    : [];

  // Active (non-completed) deliveries
  const activeDeliveries = pendingDeliveries.filter(d => !completedDeliveryIds.has(d.id));

  // For each delivery, create unique task IDs: deliveryId__taskId
  const getDeliveryTaskKey = (deliveryId, taskId) => deliveryId + "__" + taskId;

  const allActiveDailyTasks = activeSlots.flatMap(slot => dailyByTime[slot]);

  // All delivery tasks across all active deliveries (for prompt detection)
  const allDeliveryTaskKeys = activeDeliveries.flatMap(d =>
    deliveryTaskTemplates.map(t => ({ ...t, _key: getDeliveryTaskKey(d.id, t.id), _deliveryId: d.id }))
  );

  const getState = (id) => taskStates[id] || { status:"pending", remaining:null, started:false };

  const startTask = (taskKey, duration) => {
    const secs = duration * 60;
    setTaskStates(s => ({...s, [taskKey]: {status:"running", remaining:secs, started:true}}));
    intervals.current[taskKey] = setInterval(() => {
      setTaskStates(s => {
        const cur = s[taskKey]; if (!cur || cur.status !== "running") return s;
        const next = cur.remaining - 1;
        if (next <= 0) { clearInterval(intervals.current[taskKey]); return {...s, [taskKey]: {...cur, status:"prompt", remaining:0}}; }
        return {...s, [taskKey]: {...cur, remaining:next}};
      });
    }, 1000);
  };

  useEffect(() => { return () => Object.values(intervals.current).forEach(clearInterval); }, []);

  // Detect prompts across all task types
  useEffect(() => {
    // Check daily tasks
    const dailyPrompt = allActiveDailyTasks.find(t => getState(t.id).status === "prompt");
    if (dailyPrompt && !completeModal) { setCompleteModal({ ...dailyPrompt, _key: dailyPrompt.id, _isDelivery: false, _vendor: null }); return; }
    // Check delivery tasks — find the vendor name for this delivery
    const delPrompt = allDeliveryTaskKeys.find(t => getState(t._key).status === "prompt");
    if (delPrompt && !completeModal) {
      const delivery = activeDeliveries.find(d => d.id === delPrompt._deliveryId);
      setCompleteModal({ ...delPrompt, _key: delPrompt._key, _isDelivery: true, _vendor: delivery ? delivery.company : null });
    }
  }, [taskStates]);

  // Check if all delivery tasks for a specific delivery are done
  useEffect(() => {
    activeDeliveries.forEach(d => {
      if (deliveryTaskTemplates.length > 0) {
        const allDone = deliveryTaskTemplates.every(t => getState(getDeliveryTaskKey(d.id, t.id)).status === "done");
        if (allDone) {
          setCompletedDeliveryIds(prev => {
            const next = new Set(prev);
            next.add(d.id);
            // Remove from localStorage
            const remaining = pendingDeliveries.filter(pd => pd.id !== d.id && !next.has(pd.id));
            localStorage.setItem("crewos_pending_deliveries", JSON.stringify(remaining));
            return next;
          });
        }
      }
    });
  }, [taskStates, activeDeliveries.length]);

  const addTime = (taskKey, mins) => {
    clearInterval(intervals.current[taskKey]);
    const secs = mins * 60;
    setTaskStates(s => ({...s, [taskKey]: {status:"running", remaining:secs, started:true}}));
    setCompleteModal(null);
    intervals.current[taskKey] = setInterval(() => {
      setTaskStates(s => {
        const cur = s[taskKey]; if (!cur || cur.status !== "running") return s;
        const next = cur.remaining - 1;
        if (next <= 0) { clearInterval(intervals.current[taskKey]); return {...s, [taskKey]: {...cur, status:"prompt", remaining:0}}; }
        return {...s, [taskKey]: {...cur, remaining:next}};
      });
    }, 1000);
  };

  const markDone = (taskKey, taskTitle, deliveryVendor) => {
    clearInterval(intervals.current[taskKey]);
    setTaskStates(s => ({...s, [taskKey]: {...s[taskKey], status:"done"}}));
    setCompleteModal(null);
    // Log to localStorage for admin monitoring
    try {
      const logs = JSON.parse(localStorage.getItem("crewos_task_logs")) || [];
      logs.push({ taskKey, taskId: taskKey.split("__").pop(), taskTitle: taskTitle || "Task", employeeName: employee.name, employeeId: employee.id, status: "done", deliveryVendor: deliveryVendor || null, timestamp: new Date().toISOString() });
      localStorage.setItem("crewos_task_logs", JSON.stringify(logs));
    } catch {}
  };

  // Photo upload handler
  const handlePhotoUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file || !photoTarget) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setTaskPhotos(prev => {
        const next = { ...prev, [photoTarget]: [...(prev[photoTarget] || []), ev.target.result] };
        localStorage.setItem("crewos_task_photos", JSON.stringify(next));
        return next;
      });
      setPhotoTarget(null);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };
  const formatTime = (secs) => Math.floor(secs / 60) + ":" + String(secs % 60).padStart(2, "0");

  const formatSlotTime = (t) => {
    const [hh, mm] = t.split(":").map(Number);
    const h = hh === 0 ? 12 : hh > 12 ? hh - 12 : hh;
    const ap = hh >= 12 ? "PM" : "AM";
    return h + ":" + String(mm).padStart(2, "0") + " " + ap;
  };

  // Render a task card — works for both daily and delivery
  const renderTaskCard = (t, idx, group, keyPrefix, deliveryVendor) => {
    const taskKey = keyPrefix ? keyPrefix + "__" + t.id : t.id;
    const prevKey = idx > 0 ? (keyPrefix ? keyPrefix + "__" + group[idx - 1].id : group[idx - 1].id) : null;
    const st = getState(taskKey);
    const locked = idx > 0 && getState(prevKey).status !== "done";
    const pct = st.started && t.duration > 0 ? Math.max(0, Math.min(100, 100 - (st.remaining / (t.duration * 60)) * 100)) : 0;
    const photos = taskPhotos[taskKey] || [];
    const needsPhoto = t.requirePhoto && photos.length === 0;
    return (
      <div className={"task-card" + (st.status === "running" ? " active-task" : "") + (st.status === "done" ? " done-task" : "")} key={taskKey} style={locked ? {opacity:.35} : {}}>
        <div className="task-hdr">
          <span style={{fontSize:11,color:"var(--muted)",fontFamily:"var(--mono)",marginRight:4}}>#{idx + 1}</span>
          <div className="task-name">{st.status === "done" && <span style={{color:"var(--green)",marginRight:6}}>&#10003;</span>}{t.title}</div>
          {t.requirePhoto && <span style={{fontSize:12}} title="Photo required">&#128247;</span>}
          {st.status === "done" && <span className="task-badge" style={{background:"rgba(22,163,74,.08)",color:"var(--green)"}}>Done</span>}
          {st.status === "running" && <span className="timer-display">{formatTime(st.remaining)}</span>}
          {st.status === "prompt" && <span className="timer-display timer-alert">Time's up!</span>}
        </div>
        {t.desc && <div className="task-meta">{t.desc}</div>}
        {st.started && st.status !== "done" && <div className="progress-bar"><div className="progress-fill" style={{width:pct + "%"}} /></div>}

        {/* Photo upload area — visible when task is started and requires photo */}
        {t.requirePhoto && st.started && st.status !== "done" && (
          <div style={{marginTop:10,padding:12,background:"var(--bg4)",borderRadius:10,border:"1px dashed var(--border)"}}>
            <div style={{fontSize:12,fontWeight:500,marginBottom:8,color:"var(--text)"}}>&#128247; Upload Photo {needsPhoto && <span style={{color:"var(--red)",fontSize:11}}>(required)</span>}</div>
            {photos.length > 0 && (
              <div style={{display:"flex",gap:8,marginBottom:8,flexWrap:"wrap"}}>
                {photos.map((photo, pi) => (
                  <div key={pi} style={{position:"relative",width:56,height:56,borderRadius:8,overflow:"hidden",border:"1px solid var(--border)"}}>
                    <img src={photo} style={{width:"100%",height:"100%",objectFit:"cover"}} />
                    <button onClick={() => {
                      setTaskPhotos(prev => {
                        const next = {...prev, [taskKey]: prev[taskKey].filter((_,i) => i !== pi)};
                        localStorage.setItem("crewos_task_photos", JSON.stringify(next));
                        return next;
                      });
                    }} style={{position:"absolute",top:1,right:1,width:18,height:18,borderRadius:"50%",background:"rgba(0,0,0,.6)",color:"#fff",border:"none",fontSize:10,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>&times;</button>
                  </div>
                ))}
              </div>
            )}
            <button className="btn small" style={{fontSize:12}} onClick={() => { setPhotoTarget(taskKey); fileInputRef.current && fileInputRef.current.click(); }}>
              &#128247; {photos.length > 0 ? "Add Another Photo" : "Take / Upload Photo"}
            </button>
          </div>
        )}

        {/* Show uploaded photos on completed tasks */}
        {st.status === "done" && photos.length > 0 && (
          <div style={{display:"flex",gap:6,marginTop:8,flexWrap:"wrap"}}>
            {photos.map((photo, pi) => (
              <div key={pi} style={{width:40,height:40,borderRadius:6,overflow:"hidden",border:"1px solid var(--border)"}}>
                <img src={photo} style={{width:"100%",height:"100%",objectFit:"cover"}} />
              </div>
            ))}
          </div>
        )}

        <div className="task-footer" style={{marginTop:st.started ? 10 : 4}}>
          <span style={{fontSize:10,color:"var(--muted2)"}}>&#9201; {t.duration} min</span><div className="spacer" />
          {st.status === "pending" && !locked && <button className="btn primary small" onClick={() => startTask(taskKey, t.duration)}>Start Task</button>}
          {locked && <span style={{fontSize:11,color:"var(--muted2)"}}>Complete previous task first</span>}
        </div>
      </div>
    );
  };

  // Progress counts
  const dailyCompleted = allActiveDailyTasks.filter(t => getState(t.id).status === "done").length;

  return (
    <div>
      {/* Hidden file input for photo uploads */}
      <input type="file" ref={fileInputRef} accept="image/*" capture="environment" style={{display:"none"}} onChange={handlePhotoUpload} />

      {/* Section Tabs — scrollable if many deliveries */}
      <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:8,marginBottom:16,WebkitOverflowScrolling:"touch"}}>
        <div className={"period-tab" + (activeSection === "daily" ? " on" : "")}
          onClick={() => setActiveSection("daily")} style={{whiteSpace:"nowrap",flexShrink:0}}>
          &#128197; Daily Tasks
          {allActiveDailyTasks.length > 0 && <span style={{marginLeft:6,fontSize:10,fontFamily:"var(--mono)"}}>{dailyCompleted}/{allActiveDailyTasks.length}</span>}
        </div>
        {activeDeliveries.map(d => {
          const dKey = "delivery_" + d.id;
          const dCompleted = deliveryTaskTemplates.filter(t => getState(getDeliveryTaskKey(d.id, t.id)).status === "done").length;
          return (
            <div key={dKey} className={"period-tab" + (activeSection === dKey ? " on" : "")}
              onClick={() => setActiveSection(dKey)} style={{whiteSpace:"nowrap",flexShrink:0,position:"relative"}}>
              &#128666; {d.company || "Delivery"}
              {deliveryTaskTemplates.length > 0 && <span style={{marginLeft:6,fontSize:10,fontFamily:"var(--mono)"}}>{dCompleted}/{deliveryTaskTemplates.length}</span>}
              {dCompleted < deliveryTaskTemplates.length && (
                <span style={{position:"absolute",top:-4,right:-4,width:8,height:8,borderRadius:"50%",background:"var(--red)"}} />
              )}
            </div>
          );
        })}
      </div>

      {/* ═══ DAILY TASKS SECTION ═══ */}
      {activeSection === "daily" && (
        <div>
          {allActiveDailyTasks.length > 0 && (
            <div style={{marginBottom:16}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                <span style={{fontSize:13,fontWeight:500}}>{dailyCompleted}/{allActiveDailyTasks.length} completed</span>
                <div style={{flex:1,height:4,background:"var(--bg5)",borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:(allActiveDailyTasks.length > 0 ? (dailyCompleted / allActiveDailyTasks.length) * 100 : 0) + "%",background:"var(--green)",borderRadius:2,transition:"width .3s"}} /></div>
              </div>
            </div>
          )}

          {activeSlots.length === 0 && (
            <div style={{color:"var(--muted2)",fontSize:13,padding:"40px 0",textAlign:"center"}}>
              No daily tasks active right now.
              {futureSlots.length > 0 && <div style={{marginTop:8,fontSize:12}}>Next tasks at {formatSlotTime(futureSlots[0])}</div>}
            </div>
          )}

          {activeSlots.map(slot => {
            const slotTasks = dailyByTime[slot];
            const slotDone = slotTasks.every(t => getState(t.id).status === "done");
            return (
              <div key={slot} style={{marginBottom:20}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                  <div style={{fontSize:14,fontWeight:600,color:slotDone ? "var(--green)" : "var(--text)"}}>
                    {slotDone ? "\u2713 " : ""}&#9200; {formatSlotTime(slot)}
                  </div>
                  <div style={{flex:1,height:1,background:"var(--border)"}} />
                  <span style={{fontSize:11,color:"var(--muted2)"}}>
                    {slotTasks.filter(t => getState(t.id).status === "done").length}/{slotTasks.length} done
                  </span>
                </div>
                {slotTasks.map((t, idx) => renderTaskCard(t, idx, slotTasks, null))}
              </div>
            );
          })}

          {futureSlots.length > 0 && activeSlots.length > 0 && (
            <div style={{marginTop:10,marginBottom:20}}>
              <div style={{fontSize:12,color:"var(--muted2)",fontStyle:"italic",textAlign:"center",padding:"10px 0",background:"var(--bg4)",borderRadius:10,border:"1px solid var(--border)"}}>
                Upcoming: {futureSlots.map(s => formatSlotTime(s)).join(", ")}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ PER-VENDOR DELIVERY SECTIONS ═══ */}
      {activeDeliveries.map(d => {
        const dKey = "delivery_" + d.id;
        if (activeSection !== dKey) return null;
        const dCompleted = deliveryTaskTemplates.filter(t => getState(getDeliveryTaskKey(d.id, t.id)).status === "done").length;
        const allDone = deliveryTaskTemplates.length > 0 && dCompleted === deliveryTaskTemplates.length;
        return (
          <div key={dKey}>
            <div style={{background:"rgba(124,58,237,.04)",border:"1px solid rgba(124,58,237,.2)",borderRadius:14,padding:16,marginBottom:14}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                <span style={{fontSize:18}}>&#128666;</span>
                <div style={{fontSize:14,fontWeight:600,color:"var(--purple)"}}>Delivery - {d.company}</div>
                <div className="spacer" />
                {myDeliveryRole && <span className={"task-badge badge-"+(myDeliveryRole==="A"?"A":"B")}>You: Role {myDeliveryRole}</span>}
              </div>
              <div style={{fontSize:12,color:"var(--muted2)"}}>{d.time}</div>
            </div>

            {allDone ? (
              <div style={{textAlign:"center",padding:"40px 0"}}>
                <div style={{fontSize:48,marginBottom:12}}>&#10003;</div>
                <div style={{fontSize:16,fontWeight:600,color:"var(--green)",marginBottom:6}}>All Tasks Complete for {d.company}!</div>
                <div style={{fontSize:13,color:"var(--muted2)"}}>Great job processing this delivery.</div>
              </div>
            ) : myDeliveryRole && deliveryTaskTemplates.length > 0 ? (
              <>
                <div style={{marginBottom:16}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                    <span style={{fontSize:13,fontWeight:500}}>{dCompleted}/{deliveryTaskTemplates.length} completed</span>
                    <div style={{flex:1,height:4,background:"var(--bg5)",borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:(deliveryTaskTemplates.length > 0 ? (dCompleted / deliveryTaskTemplates.length) * 100 : 0) + "%",background:"var(--purple)",borderRadius:2,transition:"width .3s"}} /></div>
                  </div>
                </div>
                {deliveryTaskTemplates.map((t, idx) => renderTaskCard(t, idx, deliveryTaskTemplates, d.id, d.company))}
              </>
            ) : !myDeliveryRole ? (
              <div style={{color:"var(--muted2)",fontSize:12,textAlign:"center",padding:"20px 0"}}>
                No delivery role assigned. Ask your admin to assign a delivery role in the schedule.
              </div>
            ) : (
              <div style={{color:"var(--muted2)",fontSize:12,textAlign:"center",padding:"20px 0"}}>
                No delivery tasks configured. Ask your admin to add delivery tasks in the Tasks tab.
              </div>
            )}
          </div>
        );
      })}

      {/* Show empty state if on a delivery tab but no deliveries */}
      {activeSection !== "daily" && activeDeliveries.length === 0 && (
        <div style={{textAlign:"center",padding:"40px 0",color:"var(--muted2)",fontSize:13}}>
          <div style={{fontSize:36,marginBottom:12,opacity:.4}}>&#128666;</div>
          No pending deliveries right now.<br/>
          <span style={{fontSize:12}}>Delivery tabs will appear when vendors check in.</span>
        </div>
      )}

      {/* Complete Modal — different time options for daily vs delivery */}
      {completeModal && (() => {
        const modalPhotos = taskPhotos[completeModal._key] || [];
        const modalNeedsPhoto = completeModal.requirePhoto && modalPhotos.length === 0;
        return (
          <div className="modal-overlay">
            <div className="modal" style={{textAlign:"center"}}>
              <div style={{fontSize:40,marginBottom:10}}>&#9200;</div>
              <div className="modal-title" style={{textAlign:"center"}}>&ldquo;{completeModal.title}&rdquo;<br/><span style={{fontSize:13,color:"var(--muted2)",fontWeight:400}}>Time is up!</span></div>
              <div style={{fontSize:14,color:"var(--muted3)",marginBottom:18}}>Did you complete this task?</div>

              {/* Photo required warning */}
              {completeModal.requirePhoto && (
                <div style={{marginBottom:14,padding:12,background:modalNeedsPhoto ? "rgba(239,68,68,.06)" : "rgba(22,163,74,.06)",borderRadius:10,border:"1px solid " + (modalNeedsPhoto ? "rgba(239,68,68,.2)" : "rgba(22,163,74,.2)")}}>
                  <div style={{fontSize:13,fontWeight:500,color:modalNeedsPhoto ? "var(--red)" : "var(--green)",marginBottom:6}}>
                    &#128247; {modalNeedsPhoto ? "Photo Required" : "Photo Uploaded (" + modalPhotos.length + ")"}
                  </div>
                  {modalPhotos.length > 0 && (
                    <div style={{display:"flex",gap:6,justifyContent:"center",marginBottom:8,flexWrap:"wrap"}}>
                      {modalPhotos.map((p,i) => <div key={i} style={{width:48,height:48,borderRadius:6,overflow:"hidden",border:"1px solid var(--border)"}}><img src={p} style={{width:"100%",height:"100%",objectFit:"cover"}} /></div>)}
                    </div>
                  )}
                  <button className="btn small" style={{fontSize:12}} onClick={() => { setPhotoTarget(completeModal._key); fileInputRef.current && fileInputRef.current.click(); }}>
                    &#128247; {modalPhotos.length > 0 ? "Add Another" : "Take / Upload Photo"}
                  </button>
                </div>
              )}

              <button className="btn primary" style={{width:"100%",padding:"14px",fontSize:14,opacity:modalNeedsPhoto?.5:1}} disabled={modalNeedsPhoto} onClick={() => markDone(completeModal._key, completeModal.title, completeModal._vendor)}>
                {modalNeedsPhoto ? "\uD83D\uDCF7 Upload photo first" : "\u2713 Yes, task complete"}
              </button>
              <div style={{fontSize:12,color:"var(--muted2)",margin:"14px 0 8px"}}>Need more time?</div>
              {completeModal._isDelivery ? (
                <div className="complete-options">{[5,15,30].map(m => <div key={m} className="time-opt" onClick={() => addTime(completeModal._key, m)}>+{m} min</div>)}</div>
              ) : (
                <div className="complete-options">{[2,5,10].map(m => <div key={m} className="time-opt" onClick={() => addTime(completeModal._key, m)}>+{m} min</div>)}</div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ─── MAIN APP ────────────────────────────────────────────────────────────────
// ─── ANNOUNCEMENTS PANEL (always visible) ─────────────────────────────────
function AnnouncementsPanel({ announcements, setAnnouncements, user, employees, toast, taskTypes, tasks }) {
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState("");
  const [assignTo, setAssignTo] = useState("");
  const [duration, setDuration] = useState("");
  const [photoData, setPhotoData] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [taskTypeId, setTaskTypeId] = useState("");
  const [vendor, setVendor] = useState("");
  const [customVendor, setCustomVendor] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const photoRef = useRef(null);
  const [, setTick] = useState(0);

  // Tick every second for countdown timers
  useEffect(() => {
    const hasActive = announcements.some(a => a.accepted && !a.completed && a.durationMinutes);
    if (!hasActive) return;
    const iv = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(iv);
  }, [announcements]);

  const now = Date.now();
  const visible = announcements.filter(a => {
    if (!a.completed) return true;
    return (now - new Date(a.completedAt).getTime()) < 3600000;
  });

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoData(ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const postAnn = () => {
    if (!msg.trim()) { toast.show("Enter a message"); return; }
    const finalVendor = vendor === "__custom__" ? customVendor.trim() : vendor;
    const ann = {
      id: uid(), author: user.name, message: msg.trim(),
      assignedTo: assignTo || null, durationMinutes: duration ? Number(duration) : null,
      photo: photoData || null,
      taskTypeId: taskTypeId || null, completedSteps: [],
      vendor: finalVendor || null,
      startDate: startDate || null, endDate: endDate || null,
      createdAt: new Date().toISOString(), accepted: false, acceptedAt: null,
      completed: false, completedAt: null,
    };
    setAnnouncements(prev => [ann, ...prev]);
    setMsg(""); setAssignTo(""); setDuration(""); setPhotoData(null); setTaskTypeId("");
    setVendor(""); setCustomVendor(""); setStartDate(""); setEndDate("");
    setShowForm(false);
    toast.show("Announcement posted!");
  };

  const acceptAnn = (id) => {
    setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, accepted: true, acceptedAt: new Date().toISOString() } : a));
    toast.show("Task accepted! Timer started.");
  };

  const completeAnn = (id) => {
    setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, completed: true, completedAt: new Date().toISOString() } : a));
    toast.show("Task completed!");
  };

  const deleteAnn = (id) => {
    setAnnouncements(prev => prev.filter(a => a.id !== id));
  };

  const getRemaining = (a) => {
    if (!a.accepted || !a.acceptedAt || !a.durationMinutes) return 0;
    const elapsed = (Date.now() - new Date(a.acceptedAt).getTime()) / 1000;
    return Math.max(0, Math.floor(a.durationMinutes * 60 - elapsed));
  };

  const fmtTime = (sec) => { const m = Math.floor(sec / 60), s = sec % 60; return m + ":" + String(s).padStart(2, "0"); };
  const timeAgo = (iso) => { const d = (Date.now() - new Date(iso).getTime()) / 1000; if (d < 60) return "just now"; if (d < 3600) return Math.floor(d/60) + "m ago"; if (d < 86400) return Math.floor(d/3600) + "h ago"; return Math.floor(d/86400) + "d ago"; };

  const staffList = employees.filter(e => e.role !== "admin");

  // Build vendor list from past announcements + pending deliveries
  const knownVendors = [
    "1906","1937","5boro","Alchemy Pure","Alpine Agronomy","American Hash Maker","Anthem","Ayrloom",
    "BIC","Binske","Bloom","Blotter","Bob Marley","Bonanza","Boukét","Breakfast Connections","BTQ",
    "Cache","CAM","Camino","Canna Cantina","Canna Clinicals","Cannabals","Cheeba","Constellation","Crumbles",
    "Dank","DIME","Doobies","Doobies Labs","EATON","Eaton Botanicals","ECS Therapeutics","Eddie Parker",
    "Electraleaf","Elements","Fernway","FINCA","Find.","Flav","Florist Farms","Ghost","Good Green",
    "Grassroots","Green Revolution","Grocery","Happy Hounds","Hashtag Honey","Heavy Hitters","Hepworth",
    "Her Highness","Herb","HiCOLOR","High Ambitions","Honest Pharm Co","Hudson Cannabis","Hurley Grown",
    "Jaunty","Jetty","JIVE","Kings & Queens","Kingsroad","KIVA","LayUp","Level","LivWell","Lost Farm",
    "Lowell","Luci","matter.","MFNY","Mindbender","MINI MART","Moonlit","Munch Kins","Nanticoke",
    "Naturel Xotics","NYCE","OCB","Offhours","Old Pal","ONGROK","Packs","PAX","PICC","Platinum Reserve",
    "presidential moon Rock","Puff","Puffco","Raw","Rolling Green","Rove","Ruby Farm","Runtz","Rythm",
    "Select","Skyworld","Sluggers","Smack","Smart Buds","SmartBud","Snoop Dogg","State of Mind",
    "Stone Road","Strain Gang","Sushi Hash","The Botanist","To The Moon","Toast","Torrwood","Tune",
    "Tyson 2.0","Umamii","WaaHoo","Wana","WormHole","WYLD","ZigZag"
  ];

  const selectedTaskType = taskTypeId ? (taskTypes || []).find(t => t.id === taskTypeId) : null;

  const fmtDate = (d) => {
    if (!d) return "";
    const [y, m, day] = d.split("-");
    return `${Number(m)}/${Number(day)}/${y}`;
  };

  const toggleStep = (annId, stepId) => {
    setAnnouncements(prev => prev.map(a => {
      if (a.id !== annId) return a;
      const completed = a.completedSteps || [];
      const newCompleted = completed.includes(stepId) ? completed.filter(s => s !== stepId) : [...completed, stepId];
      const taskType = taskTypes.find(tt => tt.id === a.taskTypeId);
      const allDone = taskType && newCompleted.length >= taskType.steps.length;
      return { ...a, completedSteps: newCompleted, completed: allDone, completedAt: allDone ? new Date().toISOString() : a.completedAt };
    }));
  };

  return (
    <div className="ann-panel">
      <div className="ann-panel-header">
        <span className="ann-panel-title">Announcements & Tasks</span>
        <button className="ann-new-btn" onClick={() => setShowForm(!showForm)}>+ New</button>
      </div>
      {showForm && (
        <div className="ann-form">
          <textarea placeholder="e.g. Clean the window today" value={msg} onChange={e => setMsg(e.target.value)} rows={2} />
          <div className="ann-form-row">
            <select value={assignTo} onChange={e => setAssignTo(e.target.value)}>
              <option value="">Assign to (optional)</option>
              {staffList.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
            </select>
            <input type="number" placeholder="Minutes" min="1" max="480" value={duration} onChange={e => setDuration(e.target.value)} style={{width:90}} />
          </div>
          {taskTypes && taskTypes.length > 0 && (
            <div className="ann-form-row">
              <select value={taskTypeId} onChange={e => { setTaskTypeId(e.target.value); if (!e.target.value) { setVendor(""); setCustomVendor(""); setStartDate(""); setEndDate(""); } }} style={{flex:1}}>
                <option value="">Attach Task Type (optional)</option>
                {taskTypes.map(tt => <option key={tt.id} value={tt.id}>{tt.name} ({tt.steps.length} steps)</option>)}
              </select>
            </div>
          )}
          {selectedTaskType && (
            <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:10,padding:12,marginTop:2}}>
              <div style={{fontSize:12,fontWeight:600,color:selectedTaskType.color,marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
                <span style={{width:10,height:10,borderRadius:"50%",background:selectedTaskType.color,display:"inline-block"}} />
                {selectedTaskType.name} Details
              </div>
              <div className="ann-form-row" style={{marginBottom:8}}>
                <select value={vendor} onChange={e => setVendor(e.target.value)} style={{flex:1}}>
                  <option value="">Select Vendor / Brand</option>
                  {knownVendors.map(v => <option key={v} value={v}>{v}</option>)}
                  <option value="__custom__">+ Add New Vendor</option>
                </select>
              </div>
              {vendor === "__custom__" && (
                <div className="ann-form-row" style={{marginBottom:8}}>
                  <input type="text" placeholder="Enter vendor / brand name" value={customVendor} onChange={e => setCustomVendor(e.target.value)} style={{flex:1}} />
                </div>
              )}
              <div style={{fontSize:12,fontWeight:600,color:"var(--text)",marginBottom:6}}>Sale Period</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 12px 1fr",gap:8,alignItems:"center"}}>
                <div>
                  <div style={{fontSize:10,color:"var(--muted2)",marginBottom:3}}>Start Date</div>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{width:"100%",fontSize:12,padding:"6px 8px"}} />
                </div>
                <div style={{textAlign:"center",color:"var(--muted2)",fontSize:14,paddingTop:14}}>-</div>
                <div>
                  <div style={{fontSize:10,color:"var(--muted2)",marginBottom:3}}>End Date</div>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{width:"100%",fontSize:12,padding:"6px 8px"}} />
                </div>
              </div>
            </div>
          )}
          <div className="ann-form-row">
            <input type="file" accept="image/*" ref={photoRef} style={{display:"none"}} onChange={handlePhoto} />
            <button type="button" className="ann-photo-btn" onClick={() => photoRef.current?.click()}>
              📷 {photoData ? "Change Photo" : "Attach Photo"}
            </button>
          </div>
          {photoData && (
            <div className="ann-photo-preview">
              <img src={photoData} alt="Preview" />
              <button className="ann-photo-remove" onClick={() => { setPhotoData(null); if(photoRef.current) photoRef.current.value=""; }}>&times;</button>
            </div>
          )}
          <div className="ann-form-row">
            <button className="ann-post-btn" onClick={postAnn}>Post</button>
            <button className="ann-cancel-btn" onClick={() => { setShowForm(false); setPhotoData(null); }}>Cancel</button>
          </div>
        </div>
      )}
      {visible.length === 0 && !showForm && <div className="ann-empty">No announcements</div>}
      {visible.map(a => {
        const isMyAnn = a.author === user.name;
        const isAssignedToMe = a.assignedTo && a.assignedTo === user.name;
        const isTask = !!a.durationMinutes;
        const remaining = isTask && a.accepted ? getRemaining(a) : 0;
        const urgent = remaining > 0 && remaining < 120;
        const pct = isTask && a.accepted ? Math.max(0, (remaining / (a.durationMinutes * 60)) * 100) : 0;

        return (
          <div key={a.id} className={"ann-item" + (a.completed ? " done" : "") + (a.accepted && isTask && !a.completed ? " active" : "") + (isTask && !a.accepted && !a.completed ? " pending" : "")}>
            <div className="ann-item-top">
              <div className="ann-item-msg">{a.message}</div>
              {isMyAnn && !a.completed && <button className="ann-del" onClick={() => deleteAnn(a.id)}>&times;</button>}
            </div>
            {a.photo && (
              <div className="ann-photo-attached">
                <img src={a.photo} alt="Attached" className="ann-photo-thumb" onClick={() => setLightbox(a.photo)} />
              </div>
            )}
            <div className="ann-item-meta">
              <span className="ann-tag from">{a.author}</span>
              {a.assignedTo && <span className="ann-tag assign">{a.assignedTo}</span>}
              {a.durationMinutes && <span className="ann-tag time">{a.durationMinutes}m</span>}
              {a.completed && <span className="ann-tag completed">Done</span>}
              {a.accepted && !a.completed && <span className="ann-tag accepted">Accepted</span>}
              {(() => { const tt = a.taskTypeId && taskTypes ? taskTypes.find(t => t.id === a.taskTypeId) : null; return tt ? <span className="ann-tag" style={{background: tt.color + "18", color: tt.color, fontWeight: 600}}>{tt.name}</span> : null; })()}
              {a.vendor && <span className="ann-tag" style={{background:"rgba(124,58,237,.08)",color:"var(--purple)",fontWeight:500}}>{a.vendor}</span>}
              <span className="ann-ago">{timeAgo(a.createdAt)}</span>
            </div>
            {(a.startDate || a.endDate) && (
              <div style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:"var(--muted2)",marginTop:4,flexWrap:"wrap"}}>
                <span style={{fontSize:12}}>&#128197;</span>
                {a.startDate && <span>{fmtDate(a.startDate)}</span>}
                {a.startDate && a.endDate && <span>&#8594;</span>}
                {a.endDate && <span>{fmtDate(a.endDate)}</span>}
              </div>
            )}
            {(() => {
              if (!a.taskTypeId || !taskTypes) return null;
              const tt = taskTypes.find(t => t.id === a.taskTypeId);
              if (!tt || !tt.steps || tt.steps.length === 0) return null;
              const completedSteps = a.completedSteps || [];
              const sortedSteps = [...tt.steps].sort((x, y) => (x.order || 0) - (y.order || 0));
              const canInteract = !a.assignedTo || a.assignedTo === user.name || a.author === user.name;
              return (
                <div style={{marginTop:8,padding:"8px 10px",background:"var(--surface)",borderRadius:8,border:"1px solid var(--border)"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                    <span style={{fontSize:12,fontWeight:600,color:tt.color}}>{tt.name} Steps</span>
                    <span style={{fontSize:11,color:"var(--muted2)"}}>{completedSteps.length}/{sortedSteps.length} completed</span>
                  </div>
                  <div style={{height:4,background:"var(--border)",borderRadius:2,marginBottom:8}}>
                    <div style={{height:4,background:tt.color,borderRadius:2,width:(sortedSteps.length > 0 ? (completedSteps.length / sortedSteps.length) * 100 : 0) + "%",transition:"width .3s"}} />
                  </div>
                  {sortedSteps.map((step, idx) => {
                    const isDone = completedSteps.includes(step.id);
                    return (
                      <div key={step.id} style={{display:"flex",alignItems:"center",gap:8,padding:"4px 0",opacity: isDone ? 0.6 : 1}}>
                        <input type="checkbox" checked={isDone} onChange={() => canInteract && !a.completed && toggleStep(a.id, step.id)} disabled={!canInteract || a.completed} style={{width:16,height:16,accentColor:tt.color,cursor:canInteract && !a.completed ? "pointer" : "default"}} />
                        <span style={{fontSize:12,textDecoration:isDone ? "line-through" : "none",flex:1}}>{idx + 1}. {step.title}</span>
                        <span style={{fontSize:10,color:"var(--muted2)"}}>&#9201; {step.duration}m</span>
                        {step.requirePhoto && <span style={{fontSize:10}}>&#128247;</span>}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
            {isTask && !a.completed && !a.accepted && (
              (!a.assignedTo || isAssignedToMe) ?
                <button className="ann-accept-btn" onClick={() => acceptAnn(a.id)}>Accept Task</button> :
                <div className="ann-waiting">Waiting for {a.assignedTo}</div>
            )}
            {isTask && a.accepted && !a.completed && (
              <div className="ann-countdown-area">
                <div className="ann-countdown-row">
                  <span className={"ann-countdown-num" + (urgent ? " urgent" : "")}>{remaining > 0 ? fmtTime(remaining) : "0:00"}</span>
                  <div className="ann-countdown-bar"><div className={"ann-countdown-fill" + (urgent ? " urgent" : "")} style={{width: pct + "%"}} /></div>
                </div>
                {(isAssignedToMe || isMyAnn || !a.assignedTo) && <button className="ann-complete-btn" onClick={() => completeAnn(a.id)}>Mark Complete</button>}
              </div>
            )}
          </div>
        );
      })}
      {lightbox && <div className="ann-lightbox" onClick={() => setLightbox(null)}><img src={lightbox} alt="Full" /></div>}
    </div>
  );
}

export default function App() {
  // Hash routing: if #/vendor-form, show the vendor form page
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const onHash = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const [user, setUser] = useState(null);
  const [adminTab, setAdminTab] = useState("schedule");
  const [empTab, setEmpTab] = useState("hours");
  const toast = useToast();

  // Clock flow states
  const [showDrawerOpen, setShowDrawerOpen] = useState(false);
  const [showDrawerClose, setShowDrawerClose] = useState(false);
  const [showShiftNote, setShowShiftNote] = useState(false);
  const [pendingClockOut, setPendingClockOut] = useState(false);

  const [employees, setEmployees] = useState(() => { try { return JSON.parse(localStorage.getItem("crewos_employees"))||INITIAL_EMPLOYEES; } catch { return INITIAL_EMPLOYEES; } });
  const [schedule, setSchedule] = useState(() => { try { return JSON.parse(localStorage.getItem("crewos_schedule"))||{}; } catch { return {}; } });
  const [clockLogs, setClockLogs] = useState(() => { try { return JSON.parse(localStorage.getItem("crewos_clocks"))||[]; } catch { return []; } });
  const [tasks, setTasks] = useState(() => {
    try { return JSON.parse(localStorage.getItem("crewos_tasks")) || [
      // Daily Tasks - 9:05 AM slot
      { id:"d1", category:"daily", title:"Turn on all lights, put the open sign out, turn on POS and log into Alleaves terminal1", desc:"", duration:3, scheduledTime:"09:05", frequency:1, order:1 },
      { id:"d2", category:"daily", title:"Turn on both TVs and put on the menu", desc:"", duration:2, scheduledTime:"09:05", frequency:1, order:2 },
      { id:"d3", category:"daily", title:"Turn on Kiosks and put the display on 'never' mode", desc:"", duration:2, scheduledTime:"09:05", frequency:1, order:3 },
      { id:"d4", category:"daily", title:"Open the curtain", desc:"", duration:2, scheduledTime:"09:05", frequency:1, order:4 },
      // Daily Tasks - 12:00 PM slot
      { id:"d5", category:"daily", title:"Check all open orders and close them", desc:"", duration:30, scheduledTime:"12:00", frequency:1, order:1 },
      { id:"d6", category:"daily", title:"Check inventory room and restock", desc:"", duration:30, scheduledTime:"12:00", frequency:1, order:2 },
      { id:"d7", category:"daily", title:"Walk around the store and see if there are any items missing price tag", desc:"", duration:15, scheduledTime:"12:00", frequency:1, order:3 },
      { id:"d8", category:"daily", title:"Go to our website woodhavencannabis.com and check menu", desc:"", duration:15, scheduledTime:"12:00", frequency:2, order:4 },
      // Daily Tasks - 9:00 PM slot
      { id:"d9", category:"daily", title:"Vacuum the floor", desc:"", duration:10, scheduledTime:"21:00", frequency:1, order:1 },
      { id:"d10", category:"daily", title:"Mop the floor", desc:"", duration:15, scheduledTime:"21:00", frequency:2, order:2 },
      { id:"d11", category:"daily", title:"Go to Carrot and close all transactions except for the pickup that has not been picked up", desc:"", duration:5, scheduledTime:"21:00", frequency:1, order:3 },
      { id:"d12", category:"daily", title:"Refill the fridge", desc:"", duration:2, scheduledTime:"21:00", frequency:1, order:4 },
      { id:"d13", category:"daily", title:"Take the sign in", desc:"", duration:2, scheduledTime:"21:00", frequency:1, order:5 },
      { id:"d14", category:"daily", title:"Turn off TVs, terminals, AC and lights", desc:"", duration:1, scheduledTime:"21:00", frequency:1, order:6 },
      // Delivery Tasks - Role A
      { id:"v1", category:"delivery", title:"Upload invoice and manifest (take photo and upload it)", desc:"", duration:2, role:"A", order:1 },
      { id:"v2", category:"delivery", title:"Log into Metrc, locate incoming transfer from vendor, verify quantity and accept transfer", desc:"", duration:5, role:"A", order:2 },
      { id:"v3", category:"delivery", title:"Log into Alleaves POS, accept packages in POS, set price for each product", desc:"", duration:120, role:"A", order:3 },
      // Delivery Tasks - Role B
      { id:"v4", category:"delivery", title:"Create container label for new SKU", desc:"", duration:20, role:"B", order:1 },
      { id:"v5", category:"delivery", title:"Write product description", desc:"", duration:90, role:"B", order:2 },
      { id:"v6", category:"delivery", title:"Display sample on sale floor", desc:"", duration:30, role:"B", order:3 },
      { id:"v7", category:"delivery", title:"Put THC % on the new inventory", desc:"", duration:45, role:"B", order:4 },
      { id:"v8", category:"delivery", title:"Go to our website woodhavencannabis.com and check if all inventory on website, verify THC%, verify price, verify name and photos", desc:"", duration:15, role:"B", order:5 },
    ]; } catch { return []; }
  });
  const [overrides, setOverrides] = useState(() => { try { return JSON.parse(localStorage.getItem("crewos_overrides"))||{}; } catch { return {}; } });
  const [notifications, setNotifications] = useState(() => {
    try { return JSON.parse(localStorage.getItem("crewos_notifs")) || [
      { id:"n1", type:"mismatch", title:"Wrong employee clocked in", desc:"Eva signed in at 9:04 AM - Adam was scheduled.", time:"Today 9:04 AM" },
      { id:"n2", type:"late", title:"Late clock-in: Marco", desc:"Marco clocked in 13 min late. Threshold: 5 min.", time:"Today 9:18 AM" },
    ]; } catch { return []; }
  });
  const [settings, setSettings] = useState(() => {
    try {
      const defaults = { lateThreshold:5, earlyThreshold:5, notifyMismatch:true, notifyLate:true, notifyVendor:true, geoEnabled:false, geoLat:null, geoLng:null, geoRadius:150, geoAddress:"", geoDisplay:"", nfcEnabled:false, firebaseUrl:"https://crewos-og-default-rtdb.firebaseio.com" };
      const saved = JSON.parse(localStorage.getItem("crewos_settings")) || defaults;
      // Allow Firebase URL to be set via URL parameter for easy setup on new devices
      try {
        const hashParams = new URLSearchParams(window.location.hash.split("?")[1] || "");
        const fbParam = hashParams.get("fb");
        if (fbParam && !saved.firebaseUrl) {
          saved.firebaseUrl = fbParam;
          localStorage.setItem("crewos_settings", JSON.stringify(saved));
        }
      } catch {}
      return saved;
    } catch { return { lateThreshold:5, earlyThreshold:5, notifyMismatch:true, notifyLate:true, notifyVendor:true, geoEnabled:false, geoLat:null, geoLng:null, geoRadius:150, geoAddress:"", geoDisplay:"", nfcEnabled:false, firebaseUrl:"https://crewos-og-default-rtdb.firebaseio.com" }; }
  });
  const [drawerLogs, setDrawerLogs] = useState(() => { try { return JSON.parse(localStorage.getItem("crewos_drawer"))||[]; } catch { return []; } });
  const [shiftNotes, setShiftNotes] = useState(() => { try { return JSON.parse(localStorage.getItem("crewos_shiftnotes"))||[]; } catch { return []; } });
  const [announcements, setAnnouncements] = useState(() => { try { return JSON.parse(localStorage.getItem("crewos_announcements"))||[]; } catch { return []; } });
  const [taskTypes, setTaskTypes] = useState(() => { try { return JSON.parse(localStorage.getItem("crewos_task_types"))||[]; } catch { return []; } });

  // Persist
  useEffect(() => { localStorage.setItem("crewos_employees", JSON.stringify(employees)); }, [employees]);
  useEffect(() => { localStorage.setItem("crewos_schedule", JSON.stringify(schedule)); }, [schedule]);
  useEffect(() => { localStorage.setItem("crewos_clocks", JSON.stringify(clockLogs)); }, [clockLogs]);
  useEffect(() => { localStorage.setItem("crewos_tasks", JSON.stringify(tasks)); }, [tasks]);
  useEffect(() => { localStorage.setItem("crewos_overrides", JSON.stringify(overrides)); }, [overrides]);
  useEffect(() => { localStorage.setItem("crewos_notifs", JSON.stringify(notifications)); }, [notifications]);
  useEffect(() => { localStorage.setItem("crewos_settings", JSON.stringify(settings)); }, [settings]);
  useEffect(() => { localStorage.setItem("crewos_drawer", JSON.stringify(drawerLogs)); }, [drawerLogs]);
  useEffect(() => { localStorage.setItem("crewos_shiftnotes", JSON.stringify(shiftNotes)); }, [shiftNotes]);
  useEffect(() => { localStorage.setItem("crewos_announcements", JSON.stringify(announcements)); }, [announcements]);
  useEffect(() => { localStorage.setItem("crewos_task_types", JSON.stringify(taskTypes)); }, [taskTypes]);

  // ─── FIREBASE FULL SYNC ──────────────────────────────────────────────────
  const [fbSeenIds] = useState(() => new Set());
  const [fbStartTime] = useState(() => Date.now());
  const fbSyncRef = useRef({ pushing: false, lastPush: 0, firstPullDone: false });

  // Push all data to Firebase whenever it changes
  const syncDataKeys = [
    ["employees", employees],
    ["schedule", schedule],
    ["clockLogs", clockLogs],
    ["tasks", tasks],
    ["overrides", overrides],
    ["notifications", notifications],
    ["settings_data", { ...settings, firebaseUrl: undefined }],
    ["drawerLogs", drawerLogs],
    ["shiftNotes", shiftNotes],
    ["announcements", announcements],
    ["taskTypes", taskTypes],
  ];

  useEffect(() => {
    const fbUrl = settings.firebaseUrl;
    if (!fbUrl) return;
    // CRITICAL: Don't push until the first pull has completed, otherwise old local data overwrites Firebase
    if (!fbSyncRef.current.firstPullDone) return;
    const pushData = {
      employees, schedule, clockLogs, tasks, overrides,
      notifications, drawerLogs, shiftNotes, announcements, taskTypes,
      settings_data: { ...settings, firebaseUrl: undefined },
      _lastUpdated: Date.now(), _updatedBy: user?.id || "unknown"
    };
    // If already pushing, queue this push so it runs after the current one finishes
    if (fbSyncRef.current.pushing) {
      fbSyncRef.current.pendingPush = pushData;
      return;
    }
    // Debounce: don't push more than once per second, but schedule a delayed push so data isn't lost
    const now = Date.now();
    const timeSinceLast = now - fbSyncRef.current.lastPush;
    if (timeSinceLast < 1000) {
      if (fbSyncRef.current.debounceTimer) clearTimeout(fbSyncRef.current.debounceTimer);
      fbSyncRef.current.debounceTimer = setTimeout(() => {
        fbSyncRef.current.pendingPush = null;
        fbSyncRef.current.lastPush = Date.now();
        fbSyncRef.current.pushing = true;
        firebaseSet(fbUrl, "crewos_data", pushData).then(() => {
          fbSyncRef.current.pushing = false;
          // If another push queued while we were pushing, fire it now
          if (fbSyncRef.current.pendingPush) {
            const queued = fbSyncRef.current.pendingPush;
            fbSyncRef.current.pendingPush = null;
            fbSyncRef.current.pushing = true;
            fbSyncRef.current.lastPush = Date.now();
            firebaseSet(fbUrl, "crewos_data", queued).then(() => { fbSyncRef.current.pushing = false; });
          }
        });
      }, 1000 - timeSinceLast);
      return;
    }
    fbSyncRef.current.lastPush = now;
    fbSyncRef.current.pushing = true;
    firebaseSet(fbUrl, "crewos_data", pushData).then(() => {
      fbSyncRef.current.pushing = false;
      // If another push queued while we were pushing, fire it now
      if (fbSyncRef.current.pendingPush) {
        const queued = fbSyncRef.current.pendingPush;
        fbSyncRef.current.pendingPush = null;
        fbSyncRef.current.pushing = true;
        fbSyncRef.current.lastPush = Date.now();
        firebaseSet(fbUrl, "crewos_data", queued).then(() => { fbSyncRef.current.pushing = false; });
      }
    });
  }, [employees, schedule, clockLogs, tasks, overrides, notifications, drawerLogs, shiftNotes, announcements, settings]);

  // Pull data from Firebase on load + poll for changes
  useEffect(() => {
    const fbUrl = settings.firebaseUrl;
    if (!fbUrl) return;
    let lastPulled = 0;
    let isFirstPull = true;

    const pull = async () => {
      // Pull main data
      const data = await firebaseGet(fbUrl, "crewos_data");
      if (data && typeof data === "object" && data._lastUpdated) {
        // On first pull, always apply data (to bootstrap new devices)
        // On subsequent pulls, only apply if newer and not from us
        const shouldApply = isFirstPull || (data._lastUpdated > lastPulled && data._updatedBy !== (user?.id || "unknown"));
        if (isFirstPull) {
          isFirstPull = false;
          // Mark first pull done so pushes can start (after a short delay to let state settle)
          setTimeout(() => { fbSyncRef.current.firstPullDone = true; }, 2000);
        }
        if (shouldApply) {
          lastPulled = data._lastUpdated;
          // Sync settings (except firebaseUrl which is already set locally)
          if (data.settings_data) {
            const merged = { ...data.settings_data, firebaseUrl: fbUrl };
            if (JSON.stringify(merged) !== JSON.stringify(settings)) setSettings(merged);
          }
          if (data.employees && JSON.stringify(data.employees) !== JSON.stringify(employees)) setEmployees(data.employees);
          if (data.schedule && JSON.stringify(data.schedule) !== JSON.stringify(schedule)) setSchedule(data.schedule);
          if (data.clockLogs && JSON.stringify(data.clockLogs) !== JSON.stringify(clockLogs)) setClockLogs(data.clockLogs);
          if (data.tasks && JSON.stringify(data.tasks) !== JSON.stringify(tasks)) setTasks(data.tasks);
          if (data.overrides && JSON.stringify(data.overrides) !== JSON.stringify(overrides)) setOverrides(data.overrides);
          if (data.notifications && JSON.stringify(data.notifications) !== JSON.stringify(notifications)) setNotifications(data.notifications);
          if (data.drawerLogs && JSON.stringify(data.drawerLogs) !== JSON.stringify(drawerLogs)) setDrawerLogs(data.drawerLogs);
          if (data.shiftNotes && JSON.stringify(data.shiftNotes) !== JSON.stringify(shiftNotes)) setShiftNotes(data.shiftNotes);
          if (data.announcements && JSON.stringify(data.announcements) !== JSON.stringify(announcements)) setAnnouncements(data.announcements);
          if (data.taskTypes && JSON.stringify(data.taskTypes) !== JSON.stringify(taskTypes)) setTaskTypes(data.taskTypes);
        }
      } else if (isFirstPull) {
        // No data on Firebase yet — allow pushes to start
        isFirstPull = false;
        fbSyncRef.current.firstPullDone = true;
      }

      // Also poll for vendor deliveries - check both "deliveries" and "pending_delivery" paths
      const [deliveryData, pendingDeliveryData] = await Promise.all([
        firebaseGet(fbUrl, "deliveries"),
        firebaseGet(fbUrl, "pending_delivery")
      ]);
      // Merge entries from both paths
      const allEntries = [];
      if (deliveryData && typeof deliveryData === "object") {
        Object.entries(deliveryData).forEach(([k, v]) => allEntries.push([k, v]));
      }
      if (pendingDeliveryData && typeof pendingDeliveryData === "object") {
        Object.entries(pendingDeliveryData).forEach(([k, v]) => {
          if (!allEntries.some(([, e]) => e.id === v.id)) allEntries.push([k, v]);
        });
      }
      if (allEntries.length > 0) {
        const existingPdArr = JSON.parse(localStorage.getItem("crewos_pending_deliveries") || "[]");
        const existingDeliveries = JSON.parse(localStorage.getItem("crewos_deliveries") || "[]");
        allEntries.forEach(([firebaseKey, delivery]) => {
          if (!delivery || fbSeenIds.has(firebaseKey)) return;
          fbSeenIds.add(firebaseKey);
          const deliveryId = delivery.id || firebaseKey;
          const isToday = delivery.timestamp && (Date.now() - delivery.timestamp) < 24 * 60 * 60 * 1000;
          const alreadyTracked = existingPdArr.some(d => d.id === deliveryId) || existingDeliveries.some(d => d.id === deliveryId);
          if (isToday && !alreadyTracked) {
            const company = delivery.company || "Unknown Vendor";
            const timeStr = delivery.time || new Date().toLocaleString("en-US", {month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"});
            toast.show("\uD83D\uDCE6 Vendor delivery: " + company);
            setNotifications(prev => [{
              id: uid(), type: "vendor",
              title: "Vendor delivery: " + company,
              desc: "Delivery form submitted. Tasks triggered for all roles.",
              time: timeStr,
            }, ...prev]);
            try {
              const deliveries = JSON.parse(localStorage.getItem("crewos_deliveries") || "[]");
              if (!deliveries.some(d => d.id === deliveryId)) {
                delivery.id = deliveryId;
                deliveries.unshift(delivery);
                localStorage.setItem("crewos_deliveries", JSON.stringify(deliveries));
              }
            } catch {}
            const pdItem = { company, time: timeStr, id: deliveryId };
            localStorage.setItem("crewos_pending_delivery", JSON.stringify(pdItem));
            const pdArr = JSON.parse(localStorage.getItem("crewos_pending_deliveries") || "[]");
            if (!pdArr.some(d => d.id === deliveryId)) { pdArr.push(pdItem); localStorage.setItem("crewos_pending_deliveries", JSON.stringify(pdArr)); }
          }
        });
      }
    };

    // Initial pull (with small delay to let local state settle)
    setTimeout(pull, 500);
    const iv = setInterval(pull, 3000);
    return () => clearInterval(iv);
  }, [settings.firebaseUrl]);

  // Live clock
  const [liveTime, setLiveTime] = useState("");
  useEffect(() => {
    const tick = () => { const d=new Date(); let h=d.getHours(),m=d.getMinutes(); const ap=h>=12?"PM":"AM"; h=h%12||12; setLiveTime(h+":"+String(m).padStart(2,"0")+" "+ap); };
    tick(); const iv=setInterval(tick,1000); return () => clearInterval(iv);
  }, []);

  // Check if current user is clocked in
  const isClockedIn = user && user.role !== "admin" && clockLogs.filter(l => l.employeeId === user.id).length > 0 && clockLogs.filter(l => l.employeeId === user.id).slice(-1)[0]?.type === "in";

  // Get last drawer close log (most recent closing)
  const getLastDrawerClose = () => {
    const closes = drawerLogs.filter(l => l.type === "close");
    return closes.length > 0 ? closes[closes.length - 1] : null;
  };

  // Get pending handoff notes for current user (only unclaimed notes from other employees)
  const getHandoffNotes = () => {
    if (!user || user.role === "admin") return [];
    return shiftNotes.filter(n => !n.dismissed && n.claimedBy === user.id);
  };

  // CLOCK IN FLOW: clock in first -> then show cash drawer screen -> then show any handoff notes
  const [geoBlocked, setGeoBlocked] = useState(false);
  const [geoBlockMsg, setGeoBlockMsg] = useState("");
  const [geoChecking, setGeoChecking] = useState(false);

  // Hash routing: standalone pages (must be after all hooks)
  if (hash.startsWith("#/nfc-clock")) return <><style>{CSS}</style><NfcClockPage /></>;
  if (hash.startsWith("#/vendor-form")) return <VendorFormPage />;

  // Helper: find employee's scheduled start/end for today
  const getScheduledTimes = (empId) => {
    const ws = getWeekStart();
    const dayIdx = new Date().getDay(); // 0=Sun, adjust: Mon=0...Sun=6
    const adjDay = dayIdx === 0 ? 6 : dayIdx - 1; // Mon=0, Tue=1...Sun=6
    // Search all schedule entries for this week + day that match this employee
    for (const [key, val] of Object.entries(schedule)) {
      if (key.startsWith(ws + "_") && key.endsWith("_" + adjDay) && val.empId === empId) {
        return { start: val.start, end: val.end };
      }
    }
    return null;
  };

  const doClockIn = () => {
    const now = new Date();
    // Clock in immediately
    setClockLogs(l => [...l, { employeeId: user.id, type: "in", time: now.toISOString() }]);
    // Claim any unclaimed handoff notes for this user (whoever clocks in next gets them)
    setShiftNotes(prev => prev.map(n => {
      if (!n.dismissed && !n.claimedBy && n.fromId !== user.id) {
        return { ...n, claimedBy: user.id };
      }
      return n;
    }));

    // Check if late compared to schedule
    if (settings.notifyLate) {
      const sched = getScheduledTimes(user.id);
      if (sched && sched.start) {
        const [sh, sm] = sched.start.split(":").map(Number);
        const scheduledStart = new Date(now); scheduledStart.setHours(sh, sm, 0, 0);
        const diffMin = Math.round((now - scheduledStart) / 60000);
        const threshold = settings.lateThreshold || 5;
        if (diffMin > threshold) {
          const timeStr = now.toLocaleString("en-US", {month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"});
          setNotifications(prev => [{
            id: uid(), type: "late",
            title: user.name + " clocked in late",
            desc: "Scheduled: " + sched.start + " | Clocked in: " + now.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}) + " (" + diffMin + " min late)",
            time: timeStr
          }, ...prev]);
        } else if (diffMin < -(settings.earlyThreshold || 5)) {
          const timeStr = now.toLocaleString("en-US", {month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"});
          setNotifications(prev => [{
            id: uid(), type: "early",
            title: user.name + " clocked in early",
            desc: "Scheduled: " + sched.start + " | Clocked in: " + now.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}) + " (" + Math.abs(diffMin) + " min early)",
            time: timeStr
          }, ...prev]);
        }
      }
    }

    toast.show("Clocked in!");
    // Then show cash drawer opening screen (if enabled)
    if (settings.drawerEnabled !== false) {
      setShowDrawerOpen(true);
    }
  };

  const handleClockIn = () => {
    // If geofence is enabled, check location first
    if (settings.geoEnabled && settings.geoLat && settings.geoLng) {
      if (!navigator.geolocation) {
        toast.show("Geolocation not supported", "error");
        return;
      }
      setGeoChecking(true);
      setGeoBlocked(false);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const dist = getDistanceMeters(pos.coords.latitude, pos.coords.longitude, settings.geoLat, settings.geoLng);
          const distFeet = metersToFeet(dist);
          const maxFeet = settings.geoRadius || 150;
          setGeoChecking(false);
          if (distFeet <= maxFeet) {
            // Within range — allow clock in
            doClockIn();
          } else {
            // Too far — block
            setGeoBlocked(true);
            setGeoBlockMsg("You are " + distFeet.toLocaleString() + " feet away from the store. You must be within " + maxFeet + " feet to clock in.");
            toast.show("Too far from store to clock in", "error");
          }
        },
        (err) => {
          setGeoChecking(false);
          if (err.code === 1) {
            setGeoBlocked(true);
            setGeoBlockMsg("Location access denied. Please allow location access in your browser/phone settings to clock in.");
            toast.show("Location access denied", "error");
          } else {
            setGeoBlocked(true);
            setGeoBlockMsg("Could not get your location: " + err.message);
            toast.show("Location error", "error");
          }
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      // No geofence — clock in directly
      doClockIn();
    }
  };

  const handleDrawerOpenSubmit = (drawerData) => {
    // Find last close for THIS specific register
    const registerCloses = drawerLogs.filter(l => l.type === "close" && l.cashierNum === drawerData.cashierNum);
    const lastClose = registerCloses.length > 0 ? registerCloses[registerCloses.length - 1] : null;
    let discrepancy = false;
    let discrepancyAmount = 0;

    if (lastClose) {
      discrepancyAmount = drawerData.amount - lastClose.closeAmount;
      if (Math.abs(discrepancyAmount) > 0.01) {
        discrepancy = true;
        const timeStr = new Date().toLocaleString("en-US", {month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"});
        setNotifications(prev => [{
          id: uid(), type: "drawer",
          title: "Cash drawer discrepancy — " + drawerData.cashierNum,
          desc: user.name + " counted $" + drawerData.amount.toFixed(2) + " but " + lastClose.employeeName + " closed at $" + lastClose.closeAmount.toFixed(2) + ". Difference: $" + Math.abs(discrepancyAmount).toFixed(2) + (discrepancyAmount > 0 ? " over" : " short"),
          time: timeStr
        }, ...prev]);
      }
    }

    setDrawerLogs(prev => [...prev, { ...drawerData, openAmount: drawerData.amount, discrepancy, discrepancyAmount }]);
    setShowDrawerOpen(false);
    toast.show("Drawer counted!");
  };

  // CLOCK OUT FLOW: user clicks Clock Out -> show cash drawer close (if enabled) -> shift note -> clock out
  const handleClockOut = () => {
    if (settings.drawerEnabled !== false) {
      setShowDrawerClose(true);
    } else {
      // Skip drawer, go straight to shift note
      setPendingClockOut(true);
      setShowShiftNote(true);
    }
  };

  const handleDrawerCloseSubmit = (drawerData) => {
    setDrawerLogs(prev => [...prev, { ...drawerData, closeAmount: drawerData.amount }]);
    setShowDrawerClose(false);
    setPendingClockOut(true);
    setShowShiftNote(true);
  };

  const handleShiftNoteSubmit = (noteText) => {
    if (noteText.trim()) {
      setShiftNotes(prev => [...prev, { id: uid(), fromId: user.id, from: user.name, text: noteText, time: new Date().toISOString(), dismissed: false }]);
    }
    setShowShiftNote(false);
    finishClockOut();
  };

  const handleShiftNoteSkip = () => {
    setShowShiftNote(false);
    finishClockOut();
  };

  const finishClockOut = () => {
    const now = new Date();
    setClockLogs(l => [...l, { employeeId: user.id, type: "out", time: now.toISOString() }]);
    setPendingClockOut(false);

    // Check if clocking out early compared to schedule
    if (settings.notifyLate) {
      const sched = getScheduledTimes(user.id);
      if (sched && sched.end) {
        const [eh, em] = sched.end.split(":").map(Number);
        const scheduledEnd = new Date(now); scheduledEnd.setHours(eh, em, 0, 0);
        const diffMin = Math.round((scheduledEnd - now) / 60000);
        const threshold = settings.earlyThreshold || 5;
        if (diffMin > threshold) {
          const timeStr = now.toLocaleString("en-US", {month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"});
          setNotifications(prev => [{
            id: uid(), type: "early",
            title: user.name + " clocked out early",
            desc: "Scheduled end: " + sched.end + " | Clocked out: " + now.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}) + " (" + diffMin + " min early)",
            time: timeStr
          }, ...prev]);
        } else if (diffMin < -(settings.lateThreshold || 5)) {
          const timeStr = now.toLocaleString("en-US", {month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"});
          setNotifications(prev => [{
            id: uid(), type: "late",
            title: user.name + " clocked out late",
            desc: "Scheduled end: " + sched.end + " | Clocked out: " + now.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}) + " (" + Math.abs(diffMin) + " min late)",
            time: timeStr
          }, ...prev]);
        }
      }
    }

    toast.show("Clocked out! Shift complete.");
  };

  const dismissNote = (noteId) => {
    setShiftNotes(prev => prev.map(n => n.id === noteId ? { ...n, dismissed: true } : n));
  };

  const roleColor = { A:"var(--purple)", B:"var(--blue)", C:"var(--amber)", admin:"var(--green)" };
  const roleBg = { A:"rgba(124,58,237,.1)", B:"rgba(37,99,235,.08)", C:"rgba(217,119,6,.08)", admin:"rgba(22,163,74,.08)" };

  if (!user) return (<><style>{CSS}</style><PinLogin onLogin={setUser} employees={employees} />{toast.el}</>);

  const isAdmin = user.role === "admin";
  const adminTabs = [["schedule","Schedule"],["employees","Staff"],["payroll","Payroll"],["tasks","Tasks"],["vendor","Vendor"],["alerts","Alerts"],["settings","Settings"]].concat(settings.drawerEnabled !== false ? [["drawer","Drawer"]] : []);
  const empTabs = [["schedule","My Schedule"],["hours","My Hours"],["tasks","My Tasks"]];

  return (
    <>
      <style>{CSS}</style>
      <div className="app">
        <div className="topbar">
          <div className="logo"><span>Woodhaven</span><em>OS</em></div>
          <div className="topbar-right">
            <div className="live-time">{liveTime}</div>
            <div className="user-chip" onClick={() => setUser(null)}>
              <div className="avatar" style={{background:roleBg[user.role],color:roleColor[user.role]}}>{user.name.charAt(0)}</div>
              <div className="user-info"><div className="user-name">{user.name}</div><div className="user-role">{isAdmin?"Administrator":"Role "+user.role}</div></div>
            </div>
          </div>
        </div>

        <div className="tabs">
          {(isAdmin?adminTabs:empTabs).map(([k,l]) => (
            <div key={k} className={"tab"+((isAdmin?adminTab:empTab)===k?" on":"")} onClick={() => isAdmin?setAdminTab(k):setEmpTab(k)}>
              {l}
              {k==="alerts" && notifications.length>0 && <span className="badge">{notifications.length}</span>}
            </div>
          ))}
        </div>

        <AnnouncementsPanel announcements={announcements} setAnnouncements={setAnnouncements} user={user} employees={employees} toast={toast} taskTypes={taskTypes} tasks={tasks} />

        <div className="body">
          {isAdmin && adminTab==="schedule" && <AdminSchedule employees={employees} schedule={schedule} setSchedule={setSchedule} toast={toast} notifications={notifications} setNotifications={setNotifications} />}
          {isAdmin && adminTab==="employees" && <AdminEmployees employees={employees} setEmployees={setEmployees} toast={toast} />}
          {isAdmin && adminTab==="payroll" && <AdminPayroll employees={employees} setEmployees={setEmployees} clockLogs={clockLogs} overrides={overrides} setOverrides={setOverrides} toast={toast} />}
          {isAdmin && adminTab==="tasks" && <AdminTasks tasks={tasks} setTasks={setTasks} taskTypes={taskTypes} setTaskTypes={setTaskTypes} toast={toast} />}
          {isAdmin && adminTab==="vendor" && <AdminVendor notifications={notifications} setNotifications={setNotifications} toast={toast} settings={settings} />}
          {isAdmin && adminTab==="drawer" && <AdminDrawer drawerLogs={drawerLogs} />}
          {isAdmin && adminTab==="alerts" && <AdminAlerts notifications={notifications} setNotifications={setNotifications} />}
          {isAdmin && adminTab==="settings" && <AdminSettings settings={settings} setSettings={setSettings} />}

          {!isAdmin && empTab==="schedule" && <EmpSchedule employee={user} schedule={schedule} />}
          {!isAdmin && empTab==="hours" && <EmpHours employee={user} clockLogs={clockLogs} onClockIn={handleClockIn} onClockOut={handleClockOut} handoffNotes={getHandoffNotes()} onDismissNote={dismissNote} isClockedIn={isClockedIn} geoBlocked={geoBlocked} geoBlockMsg={geoBlockMsg} geoChecking={geoChecking} onDismissGeo={() => setGeoBlocked(false)} nfcEnabled={settings.nfcEnabled || false} />}
          {!isAdmin && empTab==="tasks" && <EmpTasks employee={user} tasks={tasks} schedule={schedule} firebaseUrl={settings.firebaseUrl} />}
        </div>
      </div>

      {/* Cash Drawer - Opening */}
      {showDrawerOpen && <CashDrawerModal type="open" employee={user} drawerLogs={drawerLogs} onSubmit={handleDrawerOpenSubmit} />}

      {/* Cash Drawer - Closing */}
      {showDrawerClose && <CashDrawerModal type="close" employee={user} lastDrawerForRegister={drawerLogs.filter(l=>l.employeeId===user.id&&l.type==="open").slice(-1)[0]} drawerLogs={drawerLogs} onSubmit={handleDrawerCloseSubmit} onCancel={() => setShowDrawerClose(false)} />}

      {/* Shift Handoff Note */}
      {showShiftNote && <ShiftNoteModal employee={user} onSubmit={handleShiftNoteSubmit} onSkip={handleShiftNoteSkip} />}

      {toast.el}
    </>
  );
}
