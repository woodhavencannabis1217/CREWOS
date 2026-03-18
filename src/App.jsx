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

/* RESPONSIVE */
@media(max-width:640px){
  .topbar{padding:0 14px;height:50px}
  .body{padding:14px}
  .stat-grid{grid-template-columns:1fr 1fr}
  .user-info{display:none}
}
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
        <div className="login-logo"><span>Crew</span><em>OS</em></div>
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
function CashDrawerModal({ type, employee, lastDrawer, onSubmit, onCancel }) {
  const [amount, setAmount] = useState("");
  const [cashierNum, setCashierNum] = useState("");
  const isOpen = type === "open";

  const hasDiscrepancy = isOpen && lastDrawer && lastDrawer.closeAmount !== undefined;
  const discrepancyAmt = hasDiscrepancy ? (parseFloat(amount || 0) - lastDrawer.closeAmount) : 0;

  const submit = () => {
    const val = parseFloat(amount);
    if (isNaN(val) || val < 0) return;
    if (isOpen && !cashierNum.trim()) return;
    onSubmit({
      amount: val,
      cashierNum: isOpen ? cashierNum : lastDrawer?.cashierNum || "",
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
            ? "Count the cash drawer and enter the total before starting your shift."
            : "Count the cash drawer and enter the total to close your shift."}
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
          <label>Cash Amount ($)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0.00"
            className="drawer-amount"
            autoFocus
          />
        </div>
        {isOpen && hasDiscrepancy && amount && parseFloat(amount) > 0 && (
          Math.abs(discrepancyAmt) > 0.01 ? (
            <div className="drawer-discrepancy">
              <strong>Discrepancy detected:</strong> Previous shift closed at ${lastDrawer.closeAmount.toFixed(2)},
              but you counted ${parseFloat(amount).toFixed(2)}.
              Difference: <strong>${Math.abs(discrepancyAmt).toFixed(2)}</strong>
              {discrepancyAmt > 0 ? " over" : " short"}.
              Admin will be notified.
            </div>
          ) : (
            <div className="drawer-match">
              &#10003; Matches previous closing count of ${lastDrawer.closeAmount.toFixed(2)}
            </div>
          )
        )}
        <div className="modal-actions">
          {onCancel && <button className="btn" onClick={onCancel}>Cancel</button>}
          <button className="btn primary" onClick={submit} disabled={!amount || parseFloat(amount) < 0 || (isOpen && !cashierNum.trim())}>
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
    toast.show("Schedule submitted! " + scheduledEmps.size + " employee(s) notified.");
  };

  const unsubmitSchedule = () => {
    setSubmittedWeeks(prev => { const n = { ...prev }; delete n[weekStart]; return n; });
    toast.show("Schedule reopened for editing", "warning");
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
                  return (
                    <td key={di} style={{padding:"8px 5px",verticalAlign:"top",background:hasEmp?"rgba(22,163,74,.03)":"transparent"}}>
                      <div style={{display:"flex",flexDirection:"column",gap:4,minHeight:50}}>
                        <select
                          value={c.empId}
                          onChange={e => setCell(shift.id, di, { empId: e.target.value })}
                          disabled={isSubmitted}
                          style={{width:"100%",fontSize:11,padding:"5px 4px",fontWeight:600,borderRadius:6,
                            border:"1px solid "+(hasEmp?"rgba(22,163,74,.3)":"var(--border2)"),
                            background:hasEmp?"rgba(22,163,74,.06)":"var(--bg2)",
                            color:hasEmp?"var(--green)":"var(--muted)",
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
                              <span style={{fontSize:9,color:"var(--muted)",fontFamily:"var(--mono)"}}>{hrs}h</span>
                              {emp && <span style={{fontSize:8,color:"var(--muted2)",fontWeight:500}}>{emp.name.split(" ")[0]}</span>}
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
    </div>
  );
}

// ─── ADMIN: PAYROLL ──────────────────────────────────────────────────────────
function AdminPayroll({ employees, clockLogs, overrides, setOverrides, toast }) {
  const [period, setPeriod] = useState("weekly");
  const [overrideModal, setOverrideModal] = useState(null);
  const [overrideHours, setOverrideHours] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
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
      <div className="card" style={{padding:0,overflow:"hidden"}}>
        <table className="pay-tbl">
          <thead><tr><th>Employee</th><th>Role</th><th>Rate</th><th>Hours</th><th>Pay</th><th>Override</th><th></th></tr></thead>
          <tbody>
            {nonAdmin.map(emp => {
              const actual = getActualHours(emp.id); const ov = getOverride(emp.id);
              const finalHrs = ov ? ov.hours : actual; const pay = finalHrs * (emp.rate||0);
              return (
                <tr key={emp.id}>
                  <td style={{fontWeight:500}}>{emp.name}</td>
                  <td><span className={"task-badge badge-"+emp.role}>Role {emp.role}</span></td>
                  <td style={{fontFamily:"var(--mono)",fontSize:12}}>${emp.rate||0}/hr</td>
                  <td style={{fontFamily:"var(--mono)"}}>{finalHrs}h{ov && <span style={{fontSize:10,color:"var(--amber)",marginLeft:4}}>&#9998;</span>}</td>
                  <td style={{fontFamily:"var(--mono)",color:"var(--green)",fontWeight:500}}>${pay.toFixed(2)}</td>
                  <td>{ov && <span style={{fontSize:11,color:"var(--muted2)"}}>{ov.reason.slice(0,30)}{ov.reason.length>30?"...":""}</span>}</td>
                  <td><span className="override-link" onClick={() => { setOverrideModal(emp); setOverrideHours(String(finalHrs)); setOverrideReason(ov?.reason||""); }}>{ov?"Edit":"Override"}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
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
function AdminTasks({ tasks, setTasks, toast }) {
  const [activeTab, setActiveTab] = useState("daily");
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [form, setForm] = useState({ category:"daily", title:"", desc:"", duration:5, scheduledTime:"09:05", frequency:1, order:1, role:"A" });

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

  return (
    <div>
      <div className="period-tabs" style={{marginBottom:18}}>
        <div className={"period-tab"+(activeTab==="daily"?" on":"")} onClick={() => setActiveTab("daily")}>Daily Tasks ({dailyTasks.length})</div>
        <div className={"period-tab"+(activeTab==="delivery"?" on":"")} onClick={() => setActiveTab("delivery")}>Delivery Tasks ({deliveryTasks.length})</div>
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
  const [form, setForm] = useState({});
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
            <div className="login-logo" style={{marginBottom:4}}><span>Crew</span><em>OS</em></div>
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
          <div style={{textAlign:"center",marginTop:16,fontSize:11,color:"var(--muted)"}}>Powered by CrewOS</div>
        </div>
      </div>
    </>
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
      {notifications.map(n => <div key={n.id} className={"notif "+(typeMap[n.type]||"info")}><div><div className="notif-title">{n.title}</div><div className="notif-desc">{n.desc}</div><div className="notif-time">{n.time}</div></div></div>)}
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
          {settings.firebaseUrl && (
            <div style={{fontSize:11,color:"var(--green)",background:"rgba(22,163,74,.04)",padding:"8px 12px",borderRadius:8,border:"1px solid rgba(22,163,74,.15)"}}>
              &#10003; Firebase connected. Vendor QR code will include this URL so forms submitted from phones sync to this device.
            </div>
          )}
          {!settings.firebaseUrl && (
            <div style={{fontSize:11,color:"var(--amber)",background:"rgba(217,119,6,.04)",padding:"8px 12px",borderRadius:8,border:"1px solid rgba(217,119,6,.15)",lineHeight:1.6}}>
              <strong>Without Firebase:</strong> Vendor forms submitted from other devices (phones) won&apos;t trigger employee tasks. Only forms submitted on this same browser will work.
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
      {myShifts.length===0 ? <div style={{color:"var(--muted2)",fontSize:13,padding:"40px 0",textAlign:"center"}}>{isPublished ? "You have no shifts scheduled this week." : "Schedule not yet published."}</div>
        : myShifts.map((s,i) => (
          <div className="my-shift-card" key={i}>
            <div className="shift-day">{s.day} &middot; {s.date}</div>
            <div className="shift-time-big">{formatTimeLabel(s.start)} &ndash; {formatTimeLabel(s.end)}</div>
            <div className="shift-hours">{s.hours} hours</div>
          </div>
        ))
      }
    </div>
  );
}

// ─── EMPLOYEE: MY HOURS ──────────────────────────────────────────────────────
function EmpHours({ employee, clockLogs, onClockIn, onClockOut, handoffNotes, onDismissNote, isClockedIn, geoBlocked, geoBlockMsg, geoChecking, onDismissGeo }) {
  const myLogs = clockLogs.filter(l => l.employeeId === employee.id);
  const total = calcHours(myLogs);

  return (
    <div>
      <HandoffBanner notes={handoffNotes} onDismiss={onDismissNote} />
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
        </div>
      ))}
    </div>
  );
}

// ─── EMPLOYEE: MY TASKS ──────────────────────────────────────────────────────
function EmpTasks({ employee, tasks, schedule }) {
  const [activeSection, setActiveSection] = useState("daily");
  const [taskStates, setTaskStates] = useState({});
  const [completeModal, setCompleteModal] = useState(null);
  const [now, setNow] = useState(new Date());
  const [pendingDelivery, setPendingDelivery] = useState(() => {
    try { return JSON.parse(localStorage.getItem("crewos_pending_delivery")) || null; } catch { return null; }
  });
  const [deliveryTasksDone, setDeliveryTasksDone] = useState(false);
  const intervals = useRef({});

  // Poll for pending delivery and update time
  useEffect(() => {
    const iv = setInterval(() => {
      setNow(new Date());
      try {
        const pd = JSON.parse(localStorage.getItem("crewos_pending_delivery"));
        if (pd && !pendingDelivery) {
          setPendingDelivery(pd);
          setActiveSection("delivery"); // Auto-switch to delivery tab
        }
      } catch {}
    }, 2000);
    return () => clearInterval(iv);
  }, [pendingDelivery]);

  // Determine employee's delivery role from schedule
  const weekStart = getWeekStart();
  let myDeliveryRole = "";
  try {
    const roles = JSON.parse(localStorage.getItem("crewos_delivery_roles")) || {};
    const roleKey = weekStart + "_" + employee.id;
    if (roles[roleKey]) {
      myDeliveryRole = roles[roleKey];
    } else {
      // Fallback: if not explicitly assigned, check if other employees have roles
      const allKeys = Object.keys(roles).filter(k => k.startsWith(weekStart + "_") && !k.endsWith("_" + employee.id));
      const otherRoles = allKeys.map(k => roles[k]).filter(Boolean);
      if (otherRoles.includes("A") && !otherRoles.includes("B")) myDeliveryRole = "B";
      else if (otherRoles.includes("B") && !otherRoles.includes("A")) myDeliveryRole = "A";
    }
  } catch {}

  // Filter daily tasks: only tasks whose frequency matches today
  const dailyTasks = tasks.filter(t => {
    if (t.category !== "daily") return false;
    if (!t.frequency || t.frequency <= 1) return true;
    // Use day-of-year to determine if task runs today
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

  // Only show time slots that have arrived
  const currentTimeStr = String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");
  const activeSlots = dailyTimeSlots.filter(slot => slot <= currentTimeStr);
  const futureSlots = dailyTimeSlots.filter(slot => slot > currentTimeStr);

  // Delivery tasks for this employee
  const myDeliveryTasks = pendingDelivery && myDeliveryRole && !deliveryTasksDone
    ? tasks.filter(t => t.category === "delivery" && t.role === myDeliveryRole).sort((a, b) => (a.order || 0) - (b.order || 0))
    : [];

  // Flatten all visible tasks for counting
  const allActiveDailyTasks = activeSlots.flatMap(slot => dailyByTime[slot]);
  const allVisibleTasks = [...allActiveDailyTasks, ...myDeliveryTasks];

  const getState = (id) => taskStates[id] || { status:"pending", remaining:null, started:false };

  const startTask = (task) => {
    const secs = task.duration * 60;
    setTaskStates(s => ({...s, [task.id]: {status:"running", remaining:secs, started:true}}));
    intervals.current[task.id] = setInterval(() => {
      setTaskStates(s => {
        const cur = s[task.id]; if (!cur || cur.status !== "running") return s;
        const next = cur.remaining - 1;
        if (next <= 0) { clearInterval(intervals.current[task.id]); return {...s, [task.id]: {...cur, status:"prompt", remaining:0}}; }
        return {...s, [task.id]: {...cur, remaining:next}};
      });
    }, 1000);
  };

  useEffect(() => { return () => Object.values(intervals.current).forEach(clearInterval); }, []);
  useEffect(() => {
    const p = allVisibleTasks.find(t => getState(t.id).status === "prompt");
    if (p && !completeModal) setCompleteModal(p);
  }, [taskStates]);

  // Check if all delivery tasks are done
  useEffect(() => {
    if (myDeliveryTasks.length > 0 && myDeliveryTasks.every(t => getState(t.id).status === "done")) {
      setDeliveryTasksDone(true);
      localStorage.removeItem("crewos_pending_delivery");
      setPendingDelivery(null);
    }
  }, [taskStates, myDeliveryTasks.length]);

  const addTime = (taskId, mins) => {
    clearInterval(intervals.current[taskId]);
    const secs = mins * 60;
    setTaskStates(s => ({...s, [taskId]: {status:"running", remaining:secs, started:true}}));
    setCompleteModal(null);
    intervals.current[taskId] = setInterval(() => {
      setTaskStates(s => {
        const cur = s[taskId]; if (!cur || cur.status !== "running") return s;
        const next = cur.remaining - 1;
        if (next <= 0) { clearInterval(intervals.current[taskId]); return {...s, [taskId]: {...cur, status:"prompt", remaining:0}}; }
        return {...s, [taskId]: {...cur, remaining:next}};
      });
    }, 1000);
  };

  const markDone = (taskId) => { clearInterval(intervals.current[taskId]); setTaskStates(s => ({...s, [taskId]: {...s[taskId], status:"done"}})); setCompleteModal(null); };
  const formatTime = (secs) => Math.floor(secs / 60) + ":" + String(secs % 60).padStart(2, "0");

  const completedCount = allVisibleTasks.filter(t => getState(t.id).status === "done").length;

  const formatSlotTime = (t) => {
    const [hh, mm] = t.split(":").map(Number);
    const h = hh === 0 ? 12 : hh > 12 ? hh - 12 : hh;
    const ap = hh >= 12 ? "PM" : "AM";
    return h + ":" + String(mm).padStart(2, "0") + " " + ap;
  };

  const renderTaskCard = (t, idx, group) => {
    const st = getState(t.id);
    const locked = idx > 0 && getState(group[idx - 1].id).status !== "done";
    const pct = st.started && t.duration > 0 ? Math.max(0, Math.min(100, 100 - (st.remaining / (t.duration * 60)) * 100)) : 0;
    const isDelivery = t.category === "delivery";
    return (
      <div className={"task-card" + (st.status === "running" ? " active-task" : "") + (st.status === "done" ? " done-task" : "")} key={t.id} style={locked ? {opacity:.35} : {}}>
        <div className="task-hdr">
          <span style={{fontSize:11,color:"var(--muted)",fontFamily:"var(--mono)",marginRight:4}}>#{idx + 1}</span>
          <div className="task-name">{st.status === "done" && <span style={{color:"var(--green)",marginRight:6}}>&#10003;</span>}{t.title}</div>
          {isDelivery && <span className={"task-badge badge-"+(t.role==="A"?"A":"B")} style={{fontSize:9}}>Role {t.role}</span>}
          {st.status === "done" && <span className="task-badge" style={{background:"rgba(22,163,74,.08)",color:"var(--green)"}}>Done</span>}
          {st.status === "running" && <span className="timer-display">{formatTime(st.remaining)}</span>}
          {st.status === "prompt" && <span className="timer-display timer-alert">Time's up!</span>}
        </div>
        {t.desc && <div className="task-meta">{t.desc}</div>}
        {st.started && st.status !== "done" && <div className="progress-bar"><div className="progress-fill" style={{width:pct + "%"}} /></div>}
        <div className="task-footer" style={{marginTop:st.started ? 10 : 4}}>
          <span style={{fontSize:10,color:"var(--muted2)"}}>&#9201; {t.duration} min</span><div className="spacer" />
          {st.status === "pending" && !locked && <button className="btn primary small" onClick={() => startTask(t)}>Start Task</button>}
          {locked && <span style={{fontSize:11,color:"var(--muted2)"}}>Complete previous task first</span>}
        </div>
      </div>
    );
  };

  // Separate progress counts
  const dailyCompleted = allActiveDailyTasks.filter(t => getState(t.id).status === "done").length;
  const deliveryCompleted = myDeliveryTasks.filter(t => getState(t.id).status === "done").length;

  // Check if the completeModal task is a delivery task
  const isModalDelivery = completeModal && completeModal.category === "delivery";

  return (
    <div>
      {/* Section Tabs */}
      <div className="period-tabs" style={{marginBottom:16}}>
        <div className={"period-tab" + (activeSection === "daily" ? " on" : "")} onClick={() => setActiveSection("daily")}
          style={{position:"relative"}}>
          &#128197; Daily Tasks
          {allActiveDailyTasks.length > 0 && <span style={{marginLeft:6,fontSize:10,fontFamily:"var(--mono)"}}>{dailyCompleted}/{allActiveDailyTasks.length}</span>}
        </div>
        <div className={"period-tab" + (activeSection === "delivery" ? " on" : "")} onClick={() => setActiveSection("delivery")}
          style={{position:"relative"}}>
          &#128666; Delivery Tasks
          {pendingDelivery && !deliveryTasksDone && myDeliveryTasks.length > 0 && (
            <span style={{marginLeft:6,fontSize:10,fontFamily:"var(--mono)"}}>{deliveryCompleted}/{myDeliveryTasks.length}</span>
          )}
          {pendingDelivery && !deliveryTasksDone && (
            <span style={{position:"absolute",top:-4,right:-4,width:8,height:8,borderRadius:"50%",background:"var(--red)"}} />
          )}
        </div>
      </div>

      {/* ═══ DAILY TASKS SECTION ═══ */}
      {activeSection === "daily" && (
        <div>
          {/* Progress bar */}
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
                {slotTasks.map((t, idx) => renderTaskCard(t, idx, slotTasks))}
              </div>
            );
          })}

          {/* Future slots preview */}
          {futureSlots.length > 0 && activeSlots.length > 0 && (
            <div style={{marginTop:10,marginBottom:20}}>
              <div style={{fontSize:12,color:"var(--muted2)",fontStyle:"italic",textAlign:"center",padding:"10px 0",background:"var(--bg4)",borderRadius:10,border:"1px solid var(--border)"}}>
                Upcoming: {futureSlots.map(s => formatSlotTime(s)).join(", ")}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ DELIVERY TASKS SECTION ═══ */}
      {activeSection === "delivery" && (
        <div>
          {pendingDelivery && !deliveryTasksDone ? (
            <>
              <div style={{background:"rgba(124,58,237,.04)",border:"1px solid rgba(124,58,237,.2)",borderRadius:14,padding:16,marginBottom:14}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                  <span style={{fontSize:18}}>&#128666;</span>
                  <div style={{fontSize:14,fontWeight:600,color:"var(--purple)"}}>Vendor Delivery</div>
                  <div className="spacer" />
                  {myDeliveryRole && <span className={"task-badge badge-"+(myDeliveryRole==="A"?"A":"B")}>You: Role {myDeliveryRole}</span>}
                </div>
                <div style={{fontSize:12,color:"var(--muted2)"}}>
                  {pendingDelivery.company} &middot; {pendingDelivery.time}
                </div>
              </div>

              {myDeliveryRole && myDeliveryTasks.length > 0 && (
                <div style={{marginBottom:16}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                    <span style={{fontSize:13,fontWeight:500}}>{deliveryCompleted}/{myDeliveryTasks.length} completed</span>
                    <div style={{flex:1,height:4,background:"var(--bg5)",borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:(myDeliveryTasks.length > 0 ? (deliveryCompleted / myDeliveryTasks.length) * 100 : 0) + "%",background:"var(--purple)",borderRadius:2,transition:"width .3s"}} /></div>
                  </div>
                </div>
              )}

              {myDeliveryRole ? (
                myDeliveryTasks.map((t, idx) => renderTaskCard(t, idx, myDeliveryTasks))
              ) : (
                <div style={{color:"var(--muted2)",fontSize:12,textAlign:"center",padding:"20px 0"}}>
                  No delivery role assigned to you for today. Ask your admin to assign a delivery role in the schedule.
                </div>
              )}
            </>
          ) : deliveryTasksDone ? (
            <div style={{textAlign:"center",padding:"40px 0"}}>
              <div style={{fontSize:48,marginBottom:12}}>&#10003;</div>
              <div style={{fontSize:16,fontWeight:600,color:"var(--green)",marginBottom:6}}>All Delivery Tasks Complete!</div>
              <div style={{fontSize:13,color:"var(--muted2)"}}>Great job processing the delivery.</div>
            </div>
          ) : (
            <div style={{textAlign:"center",padding:"40px 0",color:"var(--muted2)",fontSize:13}}>
              <div style={{fontSize:36,marginBottom:12,opacity:.4}}>&#128666;</div>
              No pending deliveries right now.<br/>
              <span style={{fontSize:12}}>Tasks will appear here when a vendor checks in.</span>
            </div>
          )}
        </div>
      )}

      {/* Complete Modal — different time options for daily vs delivery */}
      {completeModal && (
        <div className="modal-overlay">
          <div className="modal" style={{textAlign:"center"}}>
            <div style={{fontSize:40,marginBottom:10}}>&#9200;</div>
            <div className="modal-title" style={{textAlign:"center"}}>&ldquo;{completeModal.title}&rdquo;<br/><span style={{fontSize:13,color:"var(--muted2)",fontWeight:400}}>Time is up!</span></div>
            <div style={{fontSize:14,color:"var(--muted3)",marginBottom:18}}>Did you complete this task?</div>
            <button className="btn primary" style={{width:"100%",padding:"14px",fontSize:14}} onClick={() => markDone(completeModal.id)}>&#10003; Yes, task complete</button>
            <div style={{fontSize:12,color:"var(--muted2)",margin:"14px 0 8px"}}>Need more time?</div>
            {isModalDelivery ? (
              <div className="complete-options">{[5,15,30].map(m => <div key={m} className="time-opt" onClick={() => addTime(completeModal.id, m)}>+{m} min</div>)}</div>
            ) : (
              <div className="complete-options">{[2,5,10].map(m => <div key={m} className="time-opt" onClick={() => addTime(completeModal.id, m)}>+{m} min</div>)}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN APP ────────────────────────────────────────────────────────────────
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
  const [settings, setSettings] = useState(() => { try { return JSON.parse(localStorage.getItem("crewos_settings")) || { lateThreshold:5, earlyThreshold:5, notifyMismatch:true, notifyLate:true, notifyVendor:true, geoEnabled:false, geoLat:null, geoLng:null, geoRadius:150, geoAddress:"", geoDisplay:"", firebaseUrl:"" }; } catch { return { lateThreshold:5, earlyThreshold:5, notifyMismatch:true, notifyLate:true, notifyVendor:true, geoEnabled:false, geoLat:null, geoLng:null, geoRadius:150, geoAddress:"", geoDisplay:"", firebaseUrl:"" }; } });
  const [drawerLogs, setDrawerLogs] = useState(() => { try { return JSON.parse(localStorage.getItem("crewos_drawer"))||[]; } catch { return []; } });
  const [shiftNotes, setShiftNotes] = useState(() => { try { return JSON.parse(localStorage.getItem("crewos_shiftnotes"))||[]; } catch { return []; } });

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

  // ─── FIREBASE POLLING: detect vendor deliveries from cloud ──────────────
  const [fbSeenIds] = useState(() => new Set());
  const [fbStartTime] = useState(() => Date.now());

  useEffect(() => {
    const fbUrl = settings.firebaseUrl;
    if (!fbUrl) return;

    const poll = async () => {
      // Poll for new deliveries
      const data = await firebaseGet(fbUrl, "deliveries");
      if (data && typeof data === "object") {
        Object.entries(data).forEach(([firebaseKey, delivery]) => {
          if (fbSeenIds.has(firebaseKey)) return;
          fbSeenIds.add(firebaseKey);
          if (delivery.timestamp && delivery.timestamp > fbStartTime) {
            const company = delivery.company || "Unknown Vendor";
            const timeStr = delivery.time || new Date().toLocaleString("en-US", {month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"});
            toast.show("\uD83D\uDCE6 Vendor delivery: " + company);
            setNotifications(prev => [{
              id: uid(), type: "vendor",
              title: "Vendor delivery: " + company,
              desc: "Delivery form submitted. Tasks triggered for all roles.",
              time: timeStr,
            }, ...prev]);
            // Also add to local delivery log
            try {
              const deliveries = JSON.parse(localStorage.getItem("crewos_deliveries")) || [];
              if (!deliveries.some(d => d.id === delivery.id)) {
                deliveries.unshift(delivery);
                localStorage.setItem("crewos_deliveries", JSON.stringify(deliveries));
              }
            } catch {}
            // Set pending delivery to trigger employee tasks
            localStorage.setItem("crewos_pending_delivery", JSON.stringify({ company, time: timeStr, id: delivery.id || uid() }));
          }
        });
      }

      // Also poll for pending_delivery flag (in case delivery was pushed directly)
      const pending = await firebaseGet(fbUrl, "pending_delivery");
      if (pending && typeof pending === "object") {
        // Get the most recent pending delivery
        const entries = Object.entries(pending);
        const recent = entries.filter(([, v]) => v.timestamp && v.timestamp > fbStartTime);
        if (recent.length > 0) {
          const [latestKey, latest] = recent.sort((a, b) => b[1].timestamp - a[1].timestamp)[0];
          if (!fbSeenIds.has("pd_" + latestKey)) {
            fbSeenIds.add("pd_" + latestKey);
            const existing = localStorage.getItem("crewos_pending_delivery");
            if (!existing || !JSON.parse(existing).id || JSON.parse(existing).id !== latest.id) {
              localStorage.setItem("crewos_pending_delivery", JSON.stringify({ company: latest.company, time: latest.time, id: latest.id || uid() }));
            }
          }
        }
      }
    };

    poll();
    const iv = setInterval(poll, 5000);
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

  // Hash routing: if #/vendor-form, show the vendor form page (must be after all hooks)
  if (hash.startsWith("#/vendor-form")) return <VendorFormPage />;

  const doClockIn = () => {
    // Clock in immediately
    setClockLogs(l => [...l, { employeeId: user.id, type: "in", time: new Date().toISOString() }]);
    // Claim any unclaimed handoff notes for this user (whoever clocks in next gets them)
    setShiftNotes(prev => prev.map(n => {
      if (!n.dismissed && !n.claimedBy && n.fromId !== user.id) {
        return { ...n, claimedBy: user.id };
      }
      return n;
    }));
    toast.show("Clocked in!");
    // Then show cash drawer opening screen
    setShowDrawerOpen(true);
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
    const lastClose = getLastDrawerClose();
    let discrepancy = false;
    let discrepancyAmount = 0;

    if (lastClose) {
      discrepancyAmount = drawerData.amount - lastClose.closeAmount;
      if (Math.abs(discrepancyAmount) > 0.01) {
        discrepancy = true;
        const timeStr = new Date().toLocaleString("en-US", {month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"});
        setNotifications(prev => [{
          id: uid(), type: "drawer",
          title: "Cash drawer discrepancy",
          desc: user.name + " opened " + drawerData.cashierNum + " at $" + drawerData.amount.toFixed(2) + " but previous close was $" + lastClose.closeAmount.toFixed(2) + ". Difference: $" + Math.abs(discrepancyAmount).toFixed(2) + (discrepancyAmount > 0 ? " over" : " short"),
          time: timeStr
        }, ...prev]);
      }
    }

    setDrawerLogs(prev => [...prev, { ...drawerData, openAmount: drawerData.amount, discrepancy, discrepancyAmount }]);
    setShowDrawerOpen(false);
    toast.show("Drawer counted!");
  };

  // CLOCK OUT FLOW: user clicks Clock Out -> show cash drawer close -> shift note -> clock out
  const handleClockOut = () => setShowDrawerClose(true);

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
    setClockLogs(l => [...l, { employeeId: user.id, type: "out", time: new Date().toISOString() }]);
    setPendingClockOut(false);
    toast.show("Clocked out! Shift complete.");
  };

  const dismissNote = (noteId) => {
    setShiftNotes(prev => prev.map(n => n.id === noteId ? { ...n, dismissed: true } : n));
  };

  const roleColor = { A:"var(--purple)", B:"var(--blue)", C:"var(--amber)", admin:"var(--green)" };
  const roleBg = { A:"rgba(124,58,237,.1)", B:"rgba(37,99,235,.08)", C:"rgba(217,119,6,.08)", admin:"rgba(22,163,74,.08)" };

  if (!user) return (<><style>{CSS}</style><PinLogin onLogin={setUser} employees={employees} />{toast.el}</>);

  const isAdmin = user.role === "admin";
  const adminTabs = [["schedule","Schedule"],["employees","Staff"],["payroll","Payroll"],["tasks","Tasks"],["vendor","Vendor"],["drawer","Drawer"],["alerts","Alerts"],["settings","Settings"]];
  const empTabs = [["schedule","My Schedule"],["hours","My Hours"],["tasks","My Tasks"]];

  return (
    <>
      <style>{CSS}</style>
      <div className="app">
        <div className="topbar">
          <div className="logo"><span>Crew</span><em>OS</em></div>
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

        <div className="body">
          {isAdmin && adminTab==="schedule" && <AdminSchedule employees={employees} schedule={schedule} setSchedule={setSchedule} toast={toast} notifications={notifications} setNotifications={setNotifications} />}
          {isAdmin && adminTab==="employees" && <AdminEmployees employees={employees} setEmployees={setEmployees} toast={toast} />}
          {isAdmin && adminTab==="payroll" && <AdminPayroll employees={employees} clockLogs={clockLogs} overrides={overrides} setOverrides={setOverrides} toast={toast} />}
          {isAdmin && adminTab==="tasks" && <AdminTasks tasks={tasks} setTasks={setTasks} toast={toast} />}
          {isAdmin && adminTab==="vendor" && <AdminVendor notifications={notifications} setNotifications={setNotifications} toast={toast} settings={settings} />}
          {isAdmin && adminTab==="drawer" && <AdminDrawer drawerLogs={drawerLogs} />}
          {isAdmin && adminTab==="alerts" && <AdminAlerts notifications={notifications} setNotifications={setNotifications} />}
          {isAdmin && adminTab==="settings" && <AdminSettings settings={settings} setSettings={setSettings} />}

          {!isAdmin && empTab==="schedule" && <EmpSchedule employee={user} schedule={schedule} />}
          {!isAdmin && empTab==="hours" && <EmpHours employee={user} clockLogs={clockLogs} onClockIn={handleClockIn} onClockOut={handleClockOut} handoffNotes={getHandoffNotes()} onDismissNote={dismissNote} isClockedIn={isClockedIn} geoBlocked={geoBlocked} geoBlockMsg={geoBlockMsg} geoChecking={geoChecking} onDismissGeo={() => setGeoBlocked(false)} />}
          {!isAdmin && empTab==="tasks" && <EmpTasks employee={user} tasks={tasks} schedule={schedule} />}
        </div>
      </div>

      {/* Cash Drawer - Opening */}
      {showDrawerOpen && <CashDrawerModal type="open" employee={user} lastDrawer={getLastDrawerClose()} onSubmit={handleDrawerOpenSubmit} />}

      {/* Cash Drawer - Closing */}
      {showDrawerClose && <CashDrawerModal type="close" employee={user} lastDrawer={drawerLogs.filter(l=>l.employeeId===user.id&&l.type==="open").slice(-1)[0]} onSubmit={handleDrawerCloseSubmit} onCancel={() => setShowDrawerClose(false)} />}

      {/* Shift Handoff Note */}
      {showShiftNote && <ShiftNoteModal employee={user} onSubmit={handleShiftNoteSubmit} onSkip={handleShiftNoteSkip} />}

      {toast.el}
    </>
  );
}
