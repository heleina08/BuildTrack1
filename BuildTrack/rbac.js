const A = { v: "View", c: "Create", e: "Edit", d: "Delete" }, sleep = ms => new Promise(r => setTimeout(r, ms));
const ROLES = {
  admin: { name: "Administrator", icon: "★", desc: "Built-in system account.", tasks: ["Manage every module", "Review audit logs"] },
  manager: { name: "Project Manager", icon: "▦", desc: "Plans projects and keeps delivery on schedule and budget.", tasks: ["Create and manage projects", "Assign and track tasks", "Review progress, site and incident reports", "Maintain project documents"] },
  engineer: { name: "Site Engineer", icon: "⛑", desc: "Runs daily work on site and reports progress.", tasks: ["Update task status and work progress", "File daily site reports", "Request materials and equipment", "Raise purchase requests"] },
  safety: { name: "Safety Officer", icon: "⚠", desc: "Keeps the site safe and compliant.", tasks: ["Log and resolve incident reports", "Monitor site reports and progress", "Inspect equipment condition", "Upload safety documents"] },
  warehouse: { name: "Warehouse Officer", icon: "▤", desc: "Controls materials inventory and movement.", tasks: ["Maintain the materials inventory", "Record stock in, out and adjustments", "Request restocking", "Upload delivery receipts"] },
  equipmentOfficer: { name: "Equipment Officer", icon: "⚙", desc: "Tracks machinery, deployment and maintenance.", tasks: ["Maintain the equipment register", "Record deployments, returns and maintenance", "Request equipment purchases", "Upload equipment documents"] },
  accountant: { name: "Accountant", icon: "₱", desc: "Owns the money trail from purchase to payment.", tasks: ["Approve or reject purchase requests", "Record project expenses", "Prepare billings", "Record payments received"] },
  contractor: { name: "Contractor", icon: "🔧", desc: "External partner with a narrow, project-focused view.", tasks: ["See assigned projects and tasks", "Update task status", "Submit work progress", "View documents and payments"] }
};
const perm = {
  manager: { projects: "vced", employees: "v", tasks: "vced", materials: "v", equipment: "v", materialTransactions: "v", equipmentTransactions: "v", purchaseRequests: "v", expenses: "v", billing: "v", workProgress: "v", siteReports: "v", incidentReports: "v", documents: "vced" },
  engineer: { projects: "v", employees: "v", tasks: "vce", materials: "v", equipment: "v", materialTransactions: "vc", equipmentTransactions: "vc", purchaseRequests: "vc", workProgress: "vce", siteReports: "vce", incidentReports: "vc", documents: "vc" },
  safety: { projects: "v", employees: "v", tasks: "v", equipment: "v", workProgress: "v", siteReports: "v", incidentReports: "vced", documents: "vc" },
  warehouse: { projects: "v", materials: "vced", materialTransactions: "vced", purchaseRequests: "vc", documents: "vc" },
  equipmentOfficer: { projects: "v", equipment: "vced", equipmentTransactions: "vced", purchaseRequests: "vc", documents: "vc" },
  accountant: { projects: "v", purchaseRequests: "ve", expenses: "vced", billing: "vced", payments: "vced", documents: "v" },
  contractor: { projects: "v", tasks: "ve", workProgress: "vc", payments: "v", documents: "v" }
};
const RK = Object.keys(perm), MK = Object.keys(modules).filter(k => k !== "auditLogs");
const GROUPS = [["", ["dashboard"]], ["WORKSPACE", ["projects", "employees", "tasks"]], ["RESOURCES", ["materials", "equipment", "materialTransactions", "equipmentTransactions"]], ["FINANCE", ["purchaseRequests", "expenses", "billing", "payments"]], ["REPORTS", ["workProgress", "siteReports", "incidentReports", "documents"]], ["SYSTEM", ["auditLogs"]]];
const IC = { dashboard: "⌂", projects: "▦", employees: "♙", tasks: "☑", materials: "▤", equipment: "⚙", materialTransactions: "⇄", equipmentTransactions: "⇄", purchaseRequests: "🛒", expenses: "₱", billing: "▧", payments: "₱", workProgress: "◴", siteReports: "▤", incidentReports: "⚠", documents: "▧", auditLogs: "◷" };
modules.auditLogs.cols = ["Date & Time", "User", "Role", "Action", "Module", "Details"];
let U = null, token = 0;
const can = (k, a) => !!U && (U.role === "admin" || !!perm[U.role]?.[k]?.includes(a));
const labelOf = k => k === "dashboard" ? "Dashboard" : modules[k].label;
const allow = (k, a) => can(k, a) || (toast("Your role is not allowed to do that"), false);


const uKey = "buildtrack_users_v1";
const H = async s => { try { return [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode("bt:" + s)))].map(x => x.toString(16).padStart(2, "0")).join("") } catch { return "x" + btoa(s) } };
let users = JSON.parse(localStorage.getItem(uKey) || "null");
async function seed() {
  if (users) return;
  users = [{ username: "admin", name: "Administrator", role: "admin", pw: await H("admin123") }];
  for (const r of RK) users.push({ username: r, name: ROLES[r].name + " (Demo)", role: r, pw: await H("demo1234") });
  localStorage.setItem(uKey, JSON.stringify(users));
}
function log(action, module, details) { logs.unshift({ id: String(Date.now()), date: new Date().toLocaleString(), user: U?.name || "—", role: ROLES[U?.role]?.name || "—", action, module, details }); logs = logs.slice(0, 300); save() }
const _sf = showForm, _dr = deleteRecord;
showForm = (k, r) => allow(k, r ? "e" : "c") && _sf(k, r);
deleteRecord = (k, id) => allow(k, "d") && _dr(k, id);


const openM = id => { document.querySelectorAll(".modal.show").forEach(m => m.classList.remove("show")); $("#" + id).classList.add("show") };
const closeM = () => document.querySelectorAll(".modal.show").forEach(m => m.classList.remove("show"));
function openSignup(r) { if (r) $("#suRole").value = r; showInfo(); openM("signupModal") }
const chips = r => MK.filter(k => perm[r][k]).map(k => `<span class="chip">${modules[k].label} · ${perm[r][k].toUpperCase()}</span>`).join("");
const showInfo = () => { let r = $("#suRole").value; $("#suInfo").innerHTML = r ? ROLES[r].tasks.map(t => `<span class="chip">${t}</span>`).join("") : "" };
document.addEventListener("click", e => {
  let t = e.target.closest("[data-open],[data-close],[data-switch],.modal"), a = e.target.closest("a[href^='#']:not([href='#'])");
  if (a && !U) { e.preventDefault(); closeM(); $(a.getAttribute("href"))?.scrollIntoView({ behavior: "smooth" }); return }
  if (!t) return;
  if (t.dataset.open) { e.preventDefault(); t.dataset.open === "signupModal" ? openSignup() : openM(t.dataset.open) }
  else if (t.dataset.switch) { e.preventDefault(); openM(t.dataset.switch) }
  else if (t.hasAttribute("data-close") || e.target === t) closeM();
});
document.addEventListener("keydown", e => e.key === "Escape" && closeM());


function pick(r) {
  let R = ROLES[r], el = $("#rolePanel");
  el.innerHTML = `<span class="eyebrow gold">CORE TASKS</span><h3>${R.icon} ${R.name}</h3><p>${R.desc}</p><ul class="tasklist">${R.tasks.map(t => `<li>${t}</li>`).join("")}</ul>${r === "admin" ? "" : `<button class="btn primary" onclick="openSignup('${r}')">Sign up as ${R.name}</button>`}`;
  el.classList.remove("swap"); void el.offsetWidth; el.classList.add("swap");
}
function renderLanding() {
  const lr = $("#loginRole");
  lr.innerHTML = [...RK, "admin"].map(r => `<option value="${r}">${ROLES[r].name}</option>`).join("");
  lr.onchange = () => pick(lr.value);
  $("#demoFill").onclick = e => { e.preventDefault(); $("#username").value = lr.value; $("#password").value = lr.value === "admin" ? "admin123" : "demo1234" };
  $("#suRole").innerHTML = `<option value="">Select your role</option>` + RK.map(r => `<option value="${r}">${ROLES[r].name}</option>`).join("");
  $("#suRole").onchange = showInfo;
  pick(lr.value);
}


function buildNav() {
  $("#navigation").innerHTML = GROUPS.map(([g, ks]) => { ks = ks.filter(k => k === "dashboard" || can(k, "v")); return ks.length ? (g ? `<div class="nav-label">${g}</div>` : "") + ks.map(k => `<a class="nav-item" data-k="${k}" href="#/${k}" title="${labelOf(k)}"><span class="nav-icon">${IC[k]}</span><span class="nl">${labelOf(k)}</span></a>`).join("") : "" }).join("");
  $("#navigation").onclick = () => $("#sidebar").classList.remove("open");
}
function renderDashboard() {
  const n = k => rows(k).length, R = ROLES[U.role], cnt = (k, f) => rows(k).filter(f).length;
  const S = [["Projects", "projects", "▦", n("projects"), "Registered projects"], ["Active Tasks", "tasks", "☑", cnt("tasks", x => x.Status !== "Completed"), "Not yet completed"], ["Materials", "materials", "▤", n("materials"), "Inventory items"], ["Equipment", "equipment", "⚙", n("equipment"), "Registered equipment"], ["Pending Requests", "purchaseRequests", "🛒", cnt("purchaseRequests", x => x.Status === "Pending"), "Awaiting approval"], ["Open Incidents", "incidentReports", "⚠", cnt("incidentReports", x => x.Status !== "Resolved"), "Need attention"], ["Billings", "billing", "▧", n("billing"), "Invoices issued"], ["Payments", "payments", "₱", n("payments"), "Payments logged"], ["Employees", "employees", "♙", cnt("employees", x => x.Status !== "Inactive"), "Active workforce"]].filter(s => can(s[1], "v")).slice(0, 4);
  const Q = MK.filter(k => can(k, "c")).slice(0, 4), fin = can("expenses", "v") && can("projects", "v");
  const budget = rows("projects").reduce((s, x) => s + Number(x.Budget || 0), 0), spent = rows("expenses").reduce((s, x) => s + Number(x.Amount || 0), 0), pct = budget ? Math.min(100, Math.round(spent / budget * 100)) : 0;
  $("#content").innerHTML = `<div class="page-heading"><div><h3>Welcome back, ${esc(U.name.split(" ")[0])}</h3><p>Signed in as ${R.name}. You see only what your role needs.</p></div></div>
  ${S.length ? `<div class="stats-grid">${S.map(s => stat(s[0], s[3], s[2], s[4])).join("")}</div>` : ""}
  <div class="split"><div>${Q.length ? `<div class="panel"><div class="panel-head"><h4>Quick Actions</h4></div><div class="panel-body"><div class="quick-grid">${Q.map(k => `<a class="quick-action" href="#/${k}"><span>＋</span>${modules[k].label}</a>`).join("")}</div></div></div>` : ""}
  ${can("projects", "v") ? `<div class="panel"><div class="panel-head"><h4>Recent Projects</h4><a class="btn secondary small" href="#/projects">View all</a></div>${tableHTML("projects", rows("projects").slice(-5).reverse(), ["Project Name", "Location", "Start Date", "Status"])}</div>` : ""}</div>
  <div><div class="panel"><div class="panel-head"><h4>Your responsibilities</h4></div><div class="panel-body"><ul class="tasklist">${R.tasks.map(t => `<li>${t}</li>`).join("")}</ul></div></div>
  ${fin ? `<div class="panel"><div class="panel-head"><h4>Financial Summary</h4></div><div class="panel-body"><div class="report-kpis"><div class="report-kpi"><small>Total Budget</small><b>${money(budget)}</b></div><div class="report-kpi"><small>Total Expenses</small><b>${money(spent)}</b></div></div><div class="bar-row"><div class="bar-meta"><span>Budget utilization</span><b>${pct}%</b></div><div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div></div></div></div>` : ""}</div></div>`;
}
async function go(r) {
  if (!U) return;
  if (r !== "dashboard" && !modules[r]) r = "dashboard";
  const my = ++token, c = $("#content");
  c.classList.add("leave"); await sleep(150); if (my !== token) return;
  document.querySelectorAll(".nav-item").forEach(a => a.classList.toggle("active", a.dataset.k === r));
  $("#pageTitle").textContent = labelOf(r); document.title = labelOf(r) + " | BuildTrack";
  r === "dashboard" ? renderDashboard() : can(r, "v") ? renderModule(r) : c.innerHTML = `<div class="panel"><div class="empty">🔒 ${ROLES[U.role].name} does not have access to ${labelOf(r)}.</div></div>`;
  $(".main").scrollTo({ top: 0 });
  c.classList.remove("leave"); c.classList.remove("enter"); void c.offsetWidth; c.classList.add("enter");
}
const route = () => location.hash.startsWith("#/") ? location.hash.slice(2) : "dashboard";
addEventListener("hashchange", () => go(route()));
function enterApp(u) {
  U = u; sessionStorage.setItem("bt_user", u.username);
  $("#uName").textContent = u.name; $("#uRole").textContent = ROLES[u.role].name; $("#uAvatar").textContent = $("#tAvatar").textContent = u.name[0].toUpperCase();
  buildNav(); closeM(); $("#landing").classList.add("hidden"); document.body.classList.add("in-app");
  const app = $("#app"); app.classList.remove("hidden", "fade-in"); void app.offsetWidth; app.classList.add("fade-in");
  if (!location.hash.startsWith("#/")) history.replaceState(null, "", "#/dashboard");
  go(route());
}
function logout() { U = null; sessionStorage.removeItem("bt_user"); $("#app").classList.add("hidden"); $("#landing").classList.remove("hidden"); document.body.classList.remove("in-app"); history.replaceState(null, "", location.pathname); scrollTo(0, 0); document.title = "BuildTrack | Construction Management System" }


async function init() {
  await seed(); renderLanding();
  $("#todayLabel").textContent = new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  $("#logoutBtn").onclick = logout; $("#menuToggle").onclick = () => $("#sidebar").classList.toggle("open");
  const col = v => { document.body.classList.toggle("collapsed", v); $("#collapseBtn").textContent = v ? "›" : "‹"; try { localStorage.setItem("bt_collapsed", v ? "1" : "") } catch { } };
  try { col(!!localStorage.getItem("bt_collapsed")) } catch { }
  $("#collapseBtn").onclick = () => col(!document.body.classList.contains("collapsed"));
  $("#loginForm").onsubmit = async e => {
    e.preventDefault(); let u = users.find(x => x.username.toLowerCase() === $("#username").value.trim().toLowerCase());
    if (!u || u.pw !== await H($("#password").value)) return $("#loginError").textContent = "Incorrect username or password.";
    if (u.role !== $("#loginRole").value) return $("#loginError").textContent = `This account is not registered as ${ROLES[$("#loginRole").value].name}.`;
    $("#loginError").textContent = ""; $("#password").value = ""; enterApp(u);
  };
  $("#signupForm").onsubmit = async e => {
    e.preventDefault(); const er = $("#signupError"), un = $("#suUser").value.trim(), role = $("#suRole").value;
    if (!perm[role]) return er.textContent = "Please select a role.";
    if (users.some(x => x.username.toLowerCase() === un.toLowerCase())) return er.textContent = "That username is already taken.";
    if ($("#suPass").value !== $("#suPass2").value) return er.textContent = "Passwords do not match.";
    let u = { username: un, name: $("#suName").value.trim(), role, pw: await H($("#suPass").value) };
    users.push(u); localStorage.setItem(uKey, JSON.stringify(users)); er.textContent = ""; e.target.reset(); showInfo(); enterApp(u); log("Signed up", "Account", ROLES[role].name); toast("Welcome to BuildTrack, " + u.name.split(" ")[0]);
  };
  let s = users.find(x => x.username === sessionStorage.getItem("bt_user")); if (s) enterApp(s);
}
document.addEventListener("DOMContentLoaded", init);
