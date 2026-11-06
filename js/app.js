/* ===== Theme (runs first so there is no flash) ===== */
const THEME = (() => { try { return localStorage.getItem('tracker_theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); } catch (e) { return 'light'; } })();
document.documentElement.setAttribute('data-bs-theme', THEME);
// Pages live in /pages, so paths back to the root need a prefix
const ROOT = location.pathname.includes('/pages/') ? '../' : '';
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register(ROOT + 'sw.js').catch(() => {});
/* ===== Shared logic: storage, session guard, navbar, footer, helpers ===== */

// localStorage wrapper (falls back to seed data if storage is empty or blocked)
const DB = {
  get(k, seed) { try { const v = localStorage.getItem('tracker_v2_' + k); return v ? JSON.parse(v) : JSON.parse(JSON.stringify(seed)); } catch (e) { return JSON.parse(JSON.stringify(seed)); } },
  set(k, v) { try { localStorage.setItem('tracker_v2_' + k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } }
};
const TASKS = DB.get('tasks', SEED_TASKS);
const COURSES = DB.get('courses', SEED_COURSES);
const CLASSES = DB.get('classes', SEED_CLASSES);   // weekly timetable
// Storage migration: tasks saved before priorities existed get a default
TASKS.forEach(t => { if (!t.priority) t.priority = 'Medium'; });
const SESSION = JSON.parse(sessionStorage.getItem('tracker_user') || 'null');
const PAGE = location.pathname.split('/').pop() || 'index.html';
// Semester dates (editable on the dashboard). The current week is worked out from today's date.
// Default semester: week 9 is the current week; the old hardcoded dates are replaced automatically.
const defaultSem = () => {
  const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7) - 56);
  const e = new Date(d); e.setDate(e.getDate() + 16 * 7 - 1);
  const f = x => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  return { start: f(d), end: f(e) };
};
const SEMESTER = DB.get('sem', defaultSem());
if (SEMESTER.start === '2026-04-06' && SEMESTER.end === '2026-07-26') Object.assign(SEMESTER, defaultSem());
const parseDay = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
function weekInfo() {
  const s = parseDay(SEMESTER.start), e = parseDay(SEMESTER.end), t = new Date(); t.setHours(0, 0, 0, 0);
  const days = Math.round((t - s) / 864e5), total = Math.ceil((Math.round((e - s) / 864e5) + 1) / 7);
  return { week: days < 0 ? 0 : Math.floor(days / 7) + 1, total, state: days < 0 ? 'before' : t > e ? 'after' : 'during', daysToStart: -days };
}
const currentWeek = () => weekInfo().week;
const STATUSES = ['Not started', 'In progress', 'Completed'];

// Session guard: <body data-auth="1"> marks a protected page
const NEED = document.body.dataset.auth;
if (NEED && !SESSION) location.replace(ROOT + 'index.html');

// Helpers
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const stCls = s => 'st-' + s.replace(' ', '-');

// Toast; pass {label, fn} for an action button such as Undo
function toast(msg, action) {
  let t = $('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast-lite'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.textContent = msg; t.style.pointerEvents = action ? 'auto' : 'none';
  if (action) { const b = document.createElement('button'); b.type = 'button'; b.className = 'toast-act'; b.textContent = action.label; b.onclick = () => { action.fn(); t.classList.remove('show'); }; t.appendChild(b); }
  t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), action ? 6000 : 1800);
}

// Shared task helpers (used by several pages)
const saveTasks = () => DB.set('tasks', TASKS);
const isLate = (t, cw = currentWeek()) => t.status !== 'Completed' && t.week && t.week < cw;
function deleteTask(id, refresh) {
  const idx = TASKS.findIndex(x => x.id === id); if (idx < 0) return;
  const [t] = TASKS.splice(idx, 1); saveTasks(); refresh();
  toast('Task deleted', { label: 'Undo', fn: () => { TASKS.splice(idx, 0, t); saveTasks(); refresh(); } });
}

// Navbar + footer, injected so every page stays consistent
function renderLayout() {
  const links = [['dashboard.html', 'Dashboard'], ['assignments.html', 'Assignments'], ['courses.html', 'Courses'], ['timetable.html', 'Timetable']];
  $('nav').innerHTML = `
  <nav class="top-nav navbar navbar-expand-lg" aria-label="Main navigation"><div class="container">
    <a class="wordmark" href="dashboard.html">tracker</a>
    <button class="navbar-toggler border-0" data-bs-toggle="collapse" data-bs-target="#menu" aria-label="Toggle menu"><i class="bi bi-list fs-2"></i></button>
    <div class="collapse navbar-collapse" id="menu">
      <ul class="navbar-nav me-auto ms-lg-4">
        ${links.map(l => `<li class="nav-item"><a class="nav-link ${PAGE === l[0] ? 'active' : ''}" href="${l[0]}">${l[1]}</a></li>`).join('')}
      </ul>
      <div class="d-flex align-items-center gap-2 ms-lg-auto mt-2 mt-lg-0">
        <span class="small muted me-1">Hi, ${esc((SESSION.name || '').split(' ')[0])}</span>
        <button class="btn btn-outline-secondary btn-sm" id="themeBtn" type="button" aria-label="Toggle dark mode"><i class="bi ${THEME === 'dark' ? 'bi-sun' : 'bi-moon-stars'}"></i></button>
        <button class="btn btn-outline-secondary btn-sm" id="logoutBtn">Log out</button></div>
    </div></div></nav>`;
  $('footer').innerHTML = `
  <footer class="site-footer"><div class="container d-md-flex justify-content-between gap-3">
    <div><span class="wordmark text-dark">tracker</span><br>Never miss a due date again.</div>
    <div class="mt-3 mt-md-0">${links.map(l => `<a href="${l[0]}">${l[1]}</a>`).join('')}<br>
      <span class="d-inline-block mt-2">&copy; 2026 Tracker &middot; IMS566 Individual Project by <strong>Nur Saadah</strong></span></div>
  </div></footer>`;
  $('logoutBtn').onclick = () => { sessionStorage.removeItem('tracker_user'); location.href = ROOT + 'index.html'; };
  document.body.insertAdjacentHTML('afterbegin', '<a class="visually-hidden-focusable skip-link" href="#main">Skip to content</a>');
  const m = document.querySelector('main'); if (m) m.id = 'main';
  $('themeBtn').onclick = () => { try { localStorage.setItem('tracker_theme', THEME === 'dark' ? 'light' : 'dark'); } catch (e) {} location.reload(); };
}
if (NEED && SESSION) renderLayout();

// Due week accepts a number from 1 to 16 or TBA (blank counts as TBA). Anything else is rejected.
const WEEK_MSG = 'Due week must be a number from 1 to 16, or TBA.';
function parseWeek(raw) {
  const s = String(raw ?? '').trim();
  if (s === '' || /^tba$/i.test(s)) return { ok: true, week: null };
  if (/^\d{1,2}$/.test(s) && +s >= 1 && +s <= 16) return { ok: true, week: +s };
  return { ok: false, week: null };
}
// Change a task's due week. Returns false (and changes nothing) if the value is not 1-16 or TBA.
function setWeek(t, v) {
  const r = parseWeek(v);
  if (!r.ok) { toast(WEEK_MSG); return false; }
  t.week = r.week; t.label = r.week ? 'Week ' + r.week : 'TBA'; DB.set('tasks', TASKS); toast('Due week updated'); return true;
}
// Select the whole value when a week box is focused, so typing replaces it
document.addEventListener('focusin', e => { if (e.target.matches && e.target.matches('[data-week], #nWeek')) e.target.select(); });

// Notes viewer (one shared modal, created on first use). onEdit(task) runs after it closes.
function showNotes(t, onEdit) {
  let m = $('notesModal');
  if (!m) {
    document.body.insertAdjacentHTML('beforeend', `<div class="modal fade" id="notesModal" tabindex="-1" aria-labelledby="notesTitle" aria-hidden="true"><div class="modal-dialog modal-dialog-centered"><div class="modal-content" style="border-radius:2px">
      <div class="modal-header"><h2 class="modal-title h5" id="notesTitle"></h2><button class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>
      <div class="modal-body"><p class="muted small mb-2" id="notesMeta"></p><p class="mb-0" id="notesText"></p></div>
      <div class="modal-footer"><button class="btn btn-outline-secondary" data-bs-dismiss="modal">Close</button><button class="btn btn-primary" id="notesEdit">Edit task</button></div>
    </div></div></div>`);
    m = $('notesModal');
  }
  $('notesTitle').textContent = t.topic;
  $('notesMeta').textContent = `${t.course} \u00b7 ${t.type} \u00b7 ${t.label}`;
  $('notesText').textContent = t.notes || 'No notes yet. Use Edit task to add some.';
  $('notesEdit').onclick = () => { m.addEventListener('hidden.bs.modal', () => onEdit(t), { once: true }); bootstrap.Modal.getInstance(m).hide(); };
  bootstrap.Modal.getOrCreateInstance(m).show();
}
