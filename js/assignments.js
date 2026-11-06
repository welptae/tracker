/* ===== Assignments: filter, search, sort, tick off, change status, add / edit, delete ===== */
let course = new URLSearchParams(location.search).get('course'), status = '', editId = null;
if (!COURSES.some(c => c.code === course)) course = 'All';   // ?course=CODE comes from the Courses page
const cw = currentWeek();   // worked out from the semester dates set on the dashboard
const modalEl = $('addModal');

// Course pills + the course dropdown in the task form (which ends with "+ Add new subject")
function drawCourses() {
  $('pills').innerHTML = ['All', ...COURSES.map(c => c.code)].map(c => `<button class="btn btn-sm rounded-pill ${c === course ? 'btn-primary' : 'btn-outline-primary'}" data-c="${esc(c)}">${esc(c)}</button>`).join('');
  const cur = $('nCourse').value;
  $('nCourse').innerHTML = COURSES.map(c => `<option value="${esc(c.code)}">${esc(c.code)}${c.name ? ' - ' + esc(c.name) : ''}</option>`).join('') + '<option value="__new__">+ Add new subject...</option>';
  if ([...$('nCourse').options].some(o => o.value === cur)) $('nCourse').value = cur;
  else if (!COURSES.length) $('nCourse').value = '__new__';
  toggleNew();
}
function toggleNew() { $('newSubject').classList.toggle('d-none', $('nCourse').value !== '__new__'); }
$('nCourse').addEventListener('change', () => { toggleNew(); if ($('nCourse').value === '__new__') $('nNewCode').focus(); });

const soon = t => t.status !== 'Completed' && t.week && t.week - cw <= 1;   // overdue or due within a week
const inTab = (t, v) => !v || (v === '__soon' ? soon(t) : t.status === v);

function draw() {
  const term = $('search').value.toLowerCase();
  const base = TASKS.filter(t => (course === 'All' || t.course === course) && (t.course + ' ' + t.topic + ' ' + t.notes).toLowerCase().includes(term));
  $('statusTabs').innerHTML = [['', 'All tasks'], ...STATUSES.map(s => [s, s]), ['__soon', 'Due soon']].map(([v, l]) =>
    `<button class="seg ${status === v ? 'on' : ''}" data-s="${v}"><span class="n">${base.filter(t => inTab(t, v)).length}</span><small>${l}</small></button>`).join('');

  const rows = base.filter(t => inTab(t, status));
  const by = $('sort').value;   // newest = most recently added first
  if (by === 'new') rows.sort((a, b) => +b.id.slice(1) - +a.id.slice(1));
  if (by === 'week') rows.sort((a, b) => (a.week ?? 99) - (b.week ?? 99));
  if (by === 'priority') { const r = { High: 0, Medium: 1, Low: 2 }; rows.sort((a, b) => r[a.priority || 'Medium'] - r[b.priority || 'Medium']); }
  if (by === 'course') rows.sort((a, b) => a.course.localeCompare(b.course));

  $('taskList').innerHTML = rows.length ? rows.map(t => {
    const done = t.status === 'Completed', d = t.week ? t.week - cw : null;
    const due = done || d === null ? '' : d < 0 ? 'late' : d <= 1 ? 'soon' : '';
    return `<div class="task ${done ? 'done' : ''}">
      <span class="course-tag">${t.course}</span>
      <div class="t-main"><span class="t-title">${esc(t.topic)}</span>${t.priority === 'High' ? '<span class="badge text-bg-danger ms-2">High</span>' : t.priority === 'Low' ? '<span class="badge text-bg-secondary ms-2">Low</span>' : ''}</div>
      <span class="type">${t.type}</span>
      <div class="due ${due}"><input type="text" maxlength="3" autocomplete="off" class="form-control form-control-sm" value="${t.week ?? 'TBA'}" placeholder="TBA" title="Number 1-16 or TBA" data-week="${t.id}" aria-label="Due week for ${esc(t.topic)}"></div>
      <select class="form-select form-select-sm st-sel ${stCls(t.status)}" data-status="${t.id}" aria-label="Status for ${esc(t.topic)}">${STATUSES.map(s => `<option ${s === t.status ? 'selected' : ''}>${s}</option>`).join('')}</select>
      <div class="actions d-flex gap-1"><button class="btn btn-sm ${t.notes ? 'btn-info' : 'btn-outline-secondary'}" data-notes="${t.id}" aria-label="View notes: ${esc(t.topic)}" title="${t.notes ? 'View notes' : 'No notes yet'}"><i class="bi bi-journal-text"></i></button><button class="btn btn-sm btn-outline-secondary" data-edit="${t.id}" aria-label="Edit ${esc(t.topic)}"><i class="bi bi-pencil"></i></button><button class="btn btn-sm btn-outline-danger" data-del="${t.id}" aria-label="Delete ${esc(t.topic)}"><i class="bi bi-trash"></i></button></div>
    </div>`;
  }).join('') : (TASKS.length ? '<p class="text-center muted py-4 mb-0">No tasks match. Clear the search or filters.</p>' : '<div class="text-center py-5"><i class="bi bi-inbox fs-1 muted"></i><p class="muted">No tasks yet.</p><button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#addModal">Add your first task</button></div>');
  $('count').textContent = `${rows.length} of ${TASKS.length} tasks`;
}

// Filters
$('pills').onclick = e => { if (!e.target.dataset.c) return; course = e.target.dataset.c; [...$('pills').children].forEach(b => { const on = b.dataset.c === course; b.classList.toggle('btn-primary', on); b.classList.toggle('btn-outline-primary', !on); }); draw(); };
$('statusTabs').onclick = e => { const b = e.target.closest('[data-s]'); if (!b) return; status = b.dataset.s; draw(); };
['search', 'sort'].forEach(id => $(id).addEventListener('input', draw));

// Row actions
const find = id => TASKS.find(t => t.id === id);
$('taskList').addEventListener('change', e => {
  const sid = e.target.dataset.status, wid = e.target.dataset.week;
  if (sid) { find(sid).status = e.target.value; saveTasks(); draw(); toast('Status updated'); }
  if (wid) { setWeek(find(wid), e.target.value); draw(); }
});
$('taskList').addEventListener('click', e => {
  const edit = e.target.closest('[data-edit]'), notes = e.target.closest('[data-notes]'), del = e.target.closest('[data-del]');
  if (edit) openEdit(find(edit.dataset.edit));
  if (notes) showNotes(find(notes.dataset.notes), openEdit);
  if (del) deleteTask(del.dataset.del, draw);
});

// Add / edit (one Bootstrap modal for both)
modalEl.addEventListener('show.bs.modal', e => {
  if (!e.relatedTarget) return;   // opened by openEdit(), already filled in
  editId = null; $('addForm').reset(); drawCourses(); $('addTitle').textContent = 'Add task'; $('saveTask').textContent = 'Save task';
});
function openEdit(t) {
  editId = t.id; $('addTitle').textContent = 'Edit task'; $('saveTask').textContent = 'Save changes';
  $('nTopic').value = t.topic; drawCourses(); $('nCourse').value = t.course; toggleNew(); $('nType').value = t.type; $('nWeek').value = t.week ?? 'TBA'; $('nNotes').value = t.notes; $('nStatus').value = t.status; $('nPriority').value = t.priority || 'Medium';
  bootstrap.Modal.getOrCreateInstance(modalEl).show();
}
$('saveTask').onclick = () => {
  const topic = $('nTopic').value.trim(), w = parseWeek($('nWeek').value);
  if (!topic) return toast('Enter a topic for the task.');
  if (!w.ok) return toast(WEEK_MSG);
  const week = w.week;
  // New subject typed in the form: create it first, then use it for this task
  let courseCode = $('nCourse').value;
  if (courseCode === '__new__') {
    const code = $('nNewCode').value.trim().toUpperCase(), name = $('nNewName').value.trim();
    if (!code) return toast('Enter a course code for the new subject.');
    if (!COURSES.some(c => c.code === code)) { COURSES.push({ code, name }); DB.set('courses', COURSES); }
    courseCode = code; $('nNewCode').value = ''; $('nNewName').value = '';
  }
  const data = { course: courseCode, topic, type: $('nType').value, week, notes: $('nNotes').value.trim(), status: $('nStatus').value, priority: $('nPriority').value };
  const msg = editId ? 'Task updated' : 'Task added';
  if (editId) { const t = find(editId); data.label = week === t.week ? t.label : (week ? 'Week ' + week : 'TBA'); Object.assign(t, data); }
  else { const n = Math.max(0, ...TASKS.map(t => +t.id.slice(1))) + 1; TASKS.push({ id: 'T' + String(n).padStart(2, '0'), ...data, label: week ? 'Week ' + week : 'TBA' }); }
  saveTasks(); drawCourses(); bootstrap.Modal.getInstance(modalEl).hide(); draw(); toast(msg);
};
drawCourses(); draw();
// Opened from the dashboard pencil: assignments.html?edit=T05
const ed = new URLSearchParams(location.search).get('edit'); if (ed && find(ed)) openEdit(find(ed));
