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

// ===== Export everything to one Excel file (SheetJS is loaded from a CDN on the Assignments page) =====
function exportExcel() {
  if (typeof XLSX === 'undefined') return toast("The Excel library didn't load. Check your internet connection and try again.");
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], cw = currentWeek();
  const H = { a: ['Course', 'Topic', 'Type', 'Due week', 'Due label', 'Status', 'Priority', 'Overdue', 'Notes'], c: ['Code', 'Name', 'Tasks', 'Completed', 'Percent complete'], t: ['Day', 'Start', 'End', 'Course', 'Type', 'Room', 'Lecturer'] };
  const tasks = TASKS.map(t => ({ Course: t.course, Topic: t.topic, Type: t.type, 'Due week': t.week ?? 'TBA', 'Due label': t.label || '', Status: t.status, Priority: t.priority || 'Medium', Overdue: isLate(t, cw) ? 'Yes' : 'No', Notes: t.notes || '' }));
  const courses = COURSES.map(c => { const l = TASKS.filter(t => t.course === c.code), n = l.filter(t => t.status === 'Completed').length; return { Code: c.code, Name: c.name || '', Tasks: l.length, Completed: n, 'Percent complete': l.length ? Math.round(n / l.length * 100) : 0 }; });
  const classes = [...CLASSES].sort((x, y) => x.day - y.day || x.start.localeCompare(y.start)).map(c => ({ Day: DAYS[c.day], Start: c.start, End: c.end, Course: c.course, Type: c.kind, Room: c.room || '', Lecturer: c.lecturer || '' }));
  const wb = XLSX.utils.book_new();
  const add = (rows, name, head, widths) => { const ws = XLSX.utils.json_to_sheet(rows, { header: head }); ws['!cols'] = widths.map(w => ({ wch: w })); XLSX.utils.book_append_sheet(wb, ws, name); };
  add(tasks, 'Assignments', H.a, [10, 44, 11, 9, 20, 13, 9, 9, 34]);
  add(courses, 'Courses', H.c, [10, 28, 7, 10, 16]);
  add(classes, 'Timetable', H.t, [11, 7, 7, 10, 10, 16, 18]);
  XLSX.writeFile(wb, 'tracker-' + new Date().toISOString().slice(0, 10) + '.xlsx');
  toast('Excel file downloaded');
}

// ===== Calendar export (.ics): open-task deadlines + weekly classes, importable into Google Calendar / Outlook / Apple Calendar =====
function exportCalendar() {
  const pad = n => String(n).padStart(2, '0'), ymd = d => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  const txt = s => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  const fold = line => { const c = Array.from(line), out = []; for (let i = 0; i < c.length; i += 58) out.push((i ? ' ' : '') + c.slice(i, i + 58).join('')); return out; };
  const start = parseDay(SEMESTER.start), end = parseDay(SEMESTER.end), stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Tracker//Assignment Tracker//EN', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:Tracker'];
  let nTasks = 0, nClasses = 0;
  TASKS.filter(t => t.week && t.status !== 'Completed').forEach(t => {
    const due = new Date(start); due.setDate(due.getDate() + t.week * 7 - 1);   // last day of the due week
    const next = new Date(due); next.setDate(next.getDate() + 1); nTasks++;
    L.push('BEGIN:VEVENT', `UID:${t.id}-task@tracker`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${ymd(due)}`, `DTEND;VALUE=DATE:${ymd(next)}`,
      `SUMMARY:${txt(t.course + ': ' + t.topic)}`,
      `DESCRIPTION:${txt(`Due in week ${t.week}. ${t.status}, ${t.priority || 'Medium'} priority. ${t.notes || ''}`)}`,
      'TRANSP:TRANSPARENT', 'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', `DESCRIPTION:${txt(t.topic + ' is due tomorrow')}`, 'END:VALARM', 'END:VEVENT');
  });
  CLASSES.forEach(c => {
    const first = new Date(start); while (first.getDay() !== c.day) first.setDate(first.getDate() + 1); nClasses++;
    const hm = s => s.replace(':', '') + '00';
    L.push('BEGIN:VEVENT', `UID:${c.id}-class@tracker`, `DTSTAMP:${stamp}`, `DTSTART:${ymd(first)}T${hm(c.start)}`, `DTEND:${ymd(first)}T${hm(c.end)}`,
      `RRULE:FREQ=WEEKLY;UNTIL=${ymd(end)}T235959`, `SUMMARY:${txt(c.course + ' ' + c.kind)}`, `LOCATION:${txt(c.room)}`, `DESCRIPTION:${txt(c.lecturer)}`, 'END:VEVENT');
  });
  L.push('END:VCALENDAR');
  if (!nTasks && !nClasses) return toast('Nothing to export yet.');
  const blob = new Blob([L.flatMap(fold).join('\r\n') + '\r\n'], { type: 'text/calendar;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'tracker-calendar.ics'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast(`Calendar downloaded: ${nTasks} deadline${nTasks === 1 ? '' : 's'} and ${nClasses} weekly class${nClasses === 1 ? '' : 'es'}`);
}

// ===== Guided tour: dims the page, highlights one element at a time and explains it =====
// Every page has its own tour (see TOURS below). Each one runs automatically on the first visit to that page,
// can be replayed with the (?) button, and ends with a "Next page" button so the user can be guided through the whole site.
function startTour(steps, opts = {}) {
  steps = steps.filter(s => { const el = document.querySelector(s.sel); return el && el.getBoundingClientRect().width > 0; });   // skips hidden items (e.g. a collapsed mobile menu)
  if (!steps.length || document.querySelector('.tour-box')) return;
  let i = 0;
  const hl = document.createElement('div'), box = document.createElement('div');
  hl.className = 'tour-hl'; box.className = 'tour-box'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Guided tour');
  document.body.append(hl, box);
  function place() {
    const r = document.querySelector(steps[i].sel).getBoundingClientRect(), pad = 6;
    hl.style.top = r.top - pad + 'px'; hl.style.left = r.left - pad + 'px'; hl.style.width = r.width + pad * 2 + 'px'; hl.style.height = r.height + pad * 2 + 'px';
    const h = box.offsetHeight, w = box.offsetWidth;
    let top = r.bottom + 14; if (top + h > innerHeight - 8) top = r.top - h - 14; if (top < 8) top = innerHeight - h - 8;   // below, else above, else docked at the bottom
    box.style.top = top + 'px'; box.style.left = Math.min(Math.max(12, r.left), innerWidth - w - 12) + 'px';
  }
  function show() {
    const s = steps[i], last = i === steps.length - 1; document.querySelector(s.sel).scrollIntoView({ block: 'center' });
    box.innerHTML = `<div class="small muted mb-1">${opts.name ? esc(opts.name) + ' &middot; ' : ''}Step ${i + 1} of ${steps.length}</div><h3 class="h6">${esc(s.title)}</h3><p class="small mb-3">${esc(s.text)}</p>
      <div class="d-flex flex-wrap align-items-center gap-2"><button type="button" class="btn btn-link btn-sm p-0 me-auto" data-t="skip">Skip tour</button>${i ? '<button type="button" class="btn btn-outline-secondary btn-sm" data-t="back">Back</button>' : ''}${last && opts.next ? '<button type="button" class="btn btn-outline-secondary btn-sm" data-t="done">Finish</button>' : ''}<button type="button" class="btn btn-primary btn-sm" data-t="next">${last ? (opts.next ? 'Next: ' + esc(opts.next.label) + ' <i class="bi bi-arrow-right"></i>' : 'Done') : 'Next'}</button></div>`;
    requestAnimationFrame(() => { place(); box.querySelector('[data-t=next]').focus({ preventScroll: true }); });
  }
  const end = () => { hl.remove(); box.remove(); removeEventListener('resize', place); removeEventListener('scroll', place); removeEventListener('keydown', key); markTourSeen(opts.key); };
  const go = d => {
    i += d;
    if (i >= steps.length) { end(); if (opts.next) location.href = opts.next.href + '?tour=1'; return; }   // last step: continue to the next page's tour
    if (i < 0) i = 0; show();
  };
  const key = e => { if (e.key === 'Escape') end(); else if (e.key === 'ArrowRight') go(1); else if (e.key === 'ArrowLeft') go(-1); };
  box.addEventListener('click', e => { const b = e.target.closest('[data-t]'); if (!b) return; if (b.dataset.t === 'skip' || b.dataset.t === 'done') end(); else go(b.dataset.t === 'next' ? 1 : -1); });
  addEventListener('resize', place); addEventListener('scroll', place, { passive: true }); addEventListener('keydown', key);
  show();
}
// "Seen" is remembered per page, so every page gets its own first-visit tour
const tourKey = page => 'tracker_tour_' + page.replace('.html', '');
const markTourSeen = k => { try { if (k) localStorage.setItem(k, '1'); } catch (e) {} };
const tourSeen = k => { try { return !!localStorage.getItem(k) || (k === 'tracker_tour_dashboard' && !!localStorage.getItem('tracker_tour_done')); } catch (e) { return false; } };   // old single flag counts for the dashboard

// Tour steps for every page. "next" links the pages together into one guided walk-through.
const NAV_STEP = { sel: '.top-nav .navbar-nav', title: 'Navigation', text: 'Use these links to move between Dashboard, Assignments, Courses and Timetable. Every page has its own short tour.' };
const THEME_STEP = { sel: '#themeBtn', title: 'Dark mode', text: 'Switch between light and dark here. Use the (?) button on any page to replay that page\'s tour.' };
const TOURS = {
  'index.html': { name: 'Login', steps: [
    { sel: '.split-brand h1', title: 'Welcome to Tracker', text: 'Tracker keeps your assignments, courses and weekly classes in one place. Let us show you how to get in.' },
    { sel: '#username', title: 'Username', text: 'Type your username here. For the demo, use student.' },
    { sel: '#password', title: 'Password', text: 'Type your password here. For the demo, use student123.' },
    { sel: '#pwToggle', title: 'Show or hide password', text: 'Click the eye icon to check what you typed before you log in.' },
    { sel: '.split-form .panel', title: 'Demo account', text: 'No account? These demo details are all you need to try everything in the app.' },
    { sel: '#loginForm button[type=submit]', title: 'Log in', text: 'Press Log in to open your dashboard. A short tour will start on each page.' }
  ] },
  'dashboard.html': { name: 'Dashboard', next: { href: 'assignments.html', label: 'Assignments' }, steps: [
    { sel: '#weekBadge', title: 'Your semester', text: 'Set the semester start and end dates and Tracker works out which week you are in.' },
    { sel: '#dueWeek', title: 'Due this week', text: 'Tasks due now, plus anything overdue, all in one place.' },
    { sel: '#todayClasses', title: "Today's classes", text: 'Your classes for today. The tag shows what is on now, what is done and what is next.' },
    { sel: '#heat', title: 'Semester at a glance', text: 'Each square is a week. Darker means more tasks due, and red means overdue. Click a week to filter the table.' },
    { sel: '#sumList', title: 'Summary', text: 'Totals for every status, plus how many tasks are overdue or due in the next 2 weeks.' },
    { sel: '#statusChart', title: 'Status chart', text: 'See how many tasks are not started, in progress or completed. Click a slice to filter the table.' },
    { sel: '#courseChart', title: 'Course chart', text: 'Tasks per course. Click a bar to filter the table.' },
    { sel: '#weekChart', title: 'Due per week', text: 'How many tasks fall in each week, split into individual and group. Click a bar to filter the table.' },
    { sel: '#dueSection', title: 'Due-date table', text: 'Edit the due week, mark tasks done, open notes or edit and delete from here.' },
    NAV_STEP, THEME_STEP
  ] },
  'assignments.html': { name: 'Assignments', next: { href: 'courses.html', label: 'Courses' }, steps: [
    { sel: '.page-head h1', title: 'Assignments', text: 'Every assignment, quiz and project lives here. The count below the title updates as you filter.' },
    { sel: '.page-head .btn-primary', title: 'Add task', text: 'Create a new task with a course, type, due week, status, priority and notes. You can even add a new subject from the Course dropdown.' },
    { sel: '.head-actions .dropdown', title: 'Export', text: 'Download everything as an Excel file, or get a calendar file (.ics) with your deadlines and weekly classes for Google Calendar or Outlook.' },
    { sel: '#statusTabs', title: 'Status tabs', text: 'Filter by All, Not started, In progress, Completed or Due soon.' },
    { sel: '#pills', title: 'Course filter', text: 'Show only the tasks of one course.' },
    { sel: '#search', title: 'Search', text: 'Search by course, topic or notes.' },
    { sel: '#sort', title: 'Sort', text: 'Order tasks by newest, course, earliest due or priority.' },
    { sel: '#vBoard', title: 'List and Board views', text: 'Switch to Board for a Kanban layout. Drag cards between Not started, In progress and Completed, or use the arrow buttons on a phone.' },
    { sel: '#taskList .task', title: 'A task', text: 'Change the due week or status right here, open the notes, edit or delete. After deleting, an Undo button appears.' },
    NAV_STEP
  ] },
  'courses.html': { name: 'Courses', next: { href: 'timetable.html', label: 'Timetable' }, steps: [
    { sel: '.page-head h1', title: 'Courses', text: 'Your progress for every course at a glance.' },
    { sel: '#cSearch', title: 'Search', text: 'Find a course by its code or name.' },
    { sel: '#cSort', title: 'Sort', text: 'Sort by course code, most tasks or progress.' },
    { sel: '#courseGrid .course-card', title: 'Course card', text: 'The bar shows how many tasks are completed. Click the card to see all tasks for that course, with a button to open them in Assignments.' },
    { sel: '#courseGrid [data-del]', title: 'Delete a course', text: 'The bin removes the course together with its tasks and classes, after asking you to confirm.' },
    NAV_STEP
  ] },
  'timetable.html': { name: 'Timetable', steps: [
    { sel: '.page-head h1', title: 'Timetable', text: 'Your weekly lectures and tutorials in one grid.' },
    { sel: '#nextClass', title: 'Next class', text: 'A live countdown to your next class, with the room and lecturer. It also shows when you are in class now.' },
    { sel: '#addClass', title: 'Add class', text: 'Add a lecture or tutorial with its day, time, room and lecturer. Tracker warns you if it overlaps another class.' },
    { sel: '#ttGrid', title: 'Weekly grid', text: 'Today is highlighted and a red line shows the current time. Click any class to edit or delete it.' },
    { sel: '#ttAgenda', title: 'Day-by-day list', text: 'On a phone the timetable becomes a list by day. Tap a class to edit it.' },
    NAV_STEP
  ] }
};
const PAGE_KEY = PAGE === '' || PAGE === 'index.html' ? 'index.html' : PAGE;
function runPageTour(force) {
  const t = TOURS[PAGE_KEY]; if (!t) return;
  startTour(t.steps, { name: t.name, next: t.next, key: tourKey(PAGE_KEY) });
}
// First visit to a page starts its tour automatically (or ?tour=1 when arriving from the previous page's tour)
addEventListener('load', () => {
  if (!TOURS[PAGE_KEY] || (NEED && !SESSION)) return;
  const asked = new URLSearchParams(location.search).has('tour');
  if (asked || (!tourSeen(tourKey(PAGE_KEY)) && !document.querySelector('.modal.show'))) setTimeout(() => runPageTour(), 700);
});

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
        <button class="btn btn-outline-secondary btn-sm" id="tourBtn" type="button" aria-label="Take a tour" title="Take a tour"><i class="bi bi-question-circle"></i></button>
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
  $('tourBtn').onclick = () => runPageTour();
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
