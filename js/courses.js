/* ===== Courses: search + sort, click a card to see its tasks, delete ===== */
const grid = $('courseGrid'), cw = currentWeek(), modal = new bootstrap.Modal($('courseModal'));
const save = () => DB.set('courses', COURSES);
let q = '', sort = 'code';

const stats = c => {
  const list = TASKS.filter(t => t.course === c.code), done = list.filter(t => t.status === 'Completed').length;
  return { list, done, pct: list.length ? Math.round(done / list.length * 100) : 0 };
};
const byCode = (a, b) => a.code.localeCompare(b.code);
const SORTS = {
  code: byCode,
  tasks: (a, b) => stats(b).list.length - stats(a).list.length || byCode(a, b),
  high: (a, b) => stats(b).pct - stats(a).pct || byCode(a, b),
  low: (a, b) => stats(a).pct - stats(b).pct || byCode(a, b)
};

function card(c) {
  const { list, done, pct } = stats(c);
  return `<div class="col-md-6 col-lg-4"><article class="panel h-100 course-card" role="button" tabindex="0" data-open="${esc(c.code)}" aria-label="View tasks for ${esc(c.code)}">
    <div class="d-flex justify-content-between align-items-start">
      <div><h3 class="h5 mb-0">${esc(c.code)}</h3>${c.name ? `<div class="muted small">${esc(c.name)}</div>` : ''}</div>
      <button class="btn btn-sm btn-outline-danger" data-del="${esc(c.code)}" aria-label="Delete ${esc(c.code)}"><i class="bi bi-trash"></i></button>
    </div>
    <p class="muted my-2">${list.length} task(s)${list.length ? ' &middot; ' + done + ' completed' : ''}</p>
    <div class="bar"><span style="width:${pct}%"></span></div>
    <div class="d-flex justify-content-between mt-2"><span>${pct}% complete</span><span class="muted small">View tasks <i class="bi bi-chevron-right"></i></span></div>
  </article></div>`;
}

function draw() {
  const term = q.trim().toLowerCase();
  const rows = COURSES.filter(c => !term || (c.code + ' ' + (c.name || '')).toLowerCase().includes(term)).sort(SORTS[sort]);
  if (!COURSES.length) { grid.innerHTML = '<p class="muted">No subjects yet. Add one from the Add task form on the Assignments page.</p>'; return; }
  grid.innerHTML = rows.length ? `<div class="row g-3">${rows.map(card).join('')}</div>` : '<p class="muted">No courses match your search.</p>';
}

// Task list popup
function openCourse(code) {
  const c = COURSES.find(x => x.code === code); if (!c) return;
  const { list, done, pct } = stats(c);
  $('cmTitle').textContent = c.code; $('cmName').textContent = c.name || ''; $('cmName').classList.toggle('d-none', !c.name);
  $('cmBar').style.width = pct + '%'; $('cmPct').textContent = `${pct}% complete (${done} of ${list.length} task${list.length === 1 ? '' : 's'})`;
  $('cmOpen').href = 'assignments.html?course=' + encodeURIComponent(c.code);
  $('cmList').innerHTML = list.length ? [...list].sort((a, b) => (a.week ?? 99) - (b.week ?? 99)).map(t => {
    const chip = t.status === 'Completed' ? ['Completed', 'done'] : isLate(t) ? ['Overdue', 'late'] : t.status === 'In progress' ? ['In progress', 'prog'] : ['Not started', 'new'];
    return `<li class="list-group-item px-0 d-flex justify-content-between align-items-start gap-3">
      <div><div class="fw-medium${t.status === 'Completed' ? ' text-decoration-line-through muted' : ''}">${esc(t.topic)}</div>
        <div class="small muted">${t.type} &middot; Due ${t.week ? esc(t.label || 'Week ' + t.week) : 'TBA'}</div>${t.notes ? `<div class="small muted">${esc(t.notes)}</div>` : ''}</div>
      <span class="chip chip-${chip[1]}">${chip[0]}</span></li>`;
  }).join('') : '<li class="list-group-item px-0 muted">No tasks for this course yet.</li>';
  modal.show();
}

// Search and sort
$('cSearch').addEventListener('input', e => { q = e.target.value; draw(); });
$('cSort').addEventListener('change', e => { sort = e.target.value; draw(); });

// Card click / keyboard opens the popup; the trash button deletes (also removes its tasks, after confirming)
grid.addEventListener('click', e => {
  const del = e.target.closest('[data-del]');
  if (del) {
    const code = del.dataset.del, n = TASKS.filter(t => t.course === code).length, k = CLASSES.filter(c => c.course === code).length;
    if (!confirm(`Delete ${code}${n ? ' and its ' + n + ' task(s)' : ''}${k ? (n ? ' and ' : ' and its ') + k + ' class(es)' : ''}?`)) return;
    for (let i = TASKS.length - 1; i >= 0; i--) if (TASKS[i].course === code) TASKS.splice(i, 1);
    COURSES.splice(COURSES.findIndex(c => c.code === code), 1);
    for (let i = CLASSES.length - 1; i >= 0; i--) if (CLASSES[i].course === code) CLASSES.splice(i, 1);
    DB.set('tasks', TASKS); DB.set('classes', CLASSES); save(); draw(); toast('Subject deleted'); return;
  }
  const open = e.target.closest('[data-open]'); if (open) openCourse(open.dataset.open);
});
grid.addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-open]')) { e.preventDefault(); openCourse(e.target.dataset.open); }
});
draw();
