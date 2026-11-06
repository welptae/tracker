/* ===== Dashboard: summary card, charts, editable due table ===== */
if (THEME === 'dark') { Chart.defaults.color = '#adb5bd'; Chart.defaults.borderColor = '#343a40'; }
const startEl = $('semStart'), endEl = $('semEnd');
startEl.value = SEMESTER.start; endEl.value = SEMESTER.end;   // the current week is worked out from these dates and today's date

const count = s => TASKS.filter(t => t.status === s).length;
// Bootstrap 5.3 colours
const G = { primary: '#0d6efd', info: '#0dcaf0', secondary: '#6c757d', warning: '#ffc107', success: '#198754', danger: '#dc3545' };

// Chart click filters (one value per chart; click the same value again to clear)
const FILTER = { status: null, course: null, week: null };
const filterOn = () => Object.values(FILTER).some(v => v !== null);
const matches = t => (!FILTER.status || t.status === FILTER.status) && (!FILTER.course || t.course === FILTER.course) && (FILTER.week === null || t.week === FILTER.week);
function toggleFilter(key, val) {
  FILTER[key] = FILTER[key] === val ? null : val; draw();
  if (filterOn()) $('dueSection').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
// Chart.js options shared by the three charts: pointer cursor + click handler
const clickable = (key, valueOf) => ({
  onClick: (evt, els, chart) => { if (els.length) toggleFilter(key, valueOf(chart, els[0].index)); },
  onHover: (evt, els) => { evt.native.target.style.cursor = els.length ? 'pointer' : 'default'; }
});

const PREVIEW = 5; let showAll = false;   // the table shows the first 5 until "View all" is pressed

function drawWeek() {
  const w = weekInfo();
  $('weekBadge').textContent = w.state === 'during' ? `Week ${w.week} of ${w.total}` : w.state === 'before' ? `Starts in ${w.daysToStart} day${w.daysToStart === 1 ? '' : 's'}` : 'Semester ended';
}

// Two panels: tasks due this week (plus anything overdue) and today's classes
function drawThisWeek() {
  const cw = currentWeek(), open = TASKS.filter(t => t.status !== 'Completed');
  const late = open.filter(t => isLate(t, cw)).sort((a, b) => a.week - b.week), due = open.filter(t => t.week === cw);
  const row = (t, tag, cls) => `<li class="list-group-item bg-transparent px-0 d-flex justify-content-between align-items-start gap-3"><div><strong>${t.course}</strong> ${esc(t.topic)}</div><span class="badge ${cls} flex-shrink-0">${tag}</span></li>`;
  const items = [...late.map(t => row(t, 'Overdue \u00b7 Week ' + t.week, 'text-bg-danger')), ...due.map(t => row(t, t.status, t.status === 'In progress' ? 'text-bg-warning' : 'text-bg-secondary'))];
  $('dueWeek').innerHTML = `<div class="d-flex justify-content-between align-items-center mb-2"><h2 class="h6 mb-0"><i class="bi bi-calendar-check me-2"></i>Due this week</h2>${late.length ? `<span class="badge text-bg-danger">${late.length} overdue</span>` : ''}</div>
    ${items.length ? `<ul class="list-group list-group-flush">${items.join('')}</ul>` : '<p class="muted mb-0 py-2">Nothing due this week.</p>'}`;

  // Today's classes as colour-coded tiles (same colour per course as the timetable), with Done / Now / Up next
  const mins = t => { const [h, m] = t.split(':'); return +h * 60 + +m; };
  const d = new Date(), now = d.getHours() * 60 + d.getMinutes();
  const today = CLASSES.filter(c => c.day === d.getDay()).sort((a, b) => mins(a.start) - mins(b.start));
  const nextId = (today.find(c => mins(c.start) > now && !today.some(o => mins(o.start) <= now && now < mins(o.end))) || {}).id;
  const tile = c => {
    const done = now >= mins(c.end), live = !done && now >= mins(c.start), up = c.id === nextId;
    const color = 'tt-c' + (Math.max(0, COURSES.findIndex(x => x.code === c.course)) % 8);
    const pill = live ? '<span class="cls-pill live"><i class="dot-live"></i>Now</span>' : done ? '<span class="cls-pill"><i class="bi bi-check2"></i>Done</span>' : up ? '<span class="cls-pill up">Up next</span>' : '';
    return `<li class="cls-row ${color}${done ? ' is-done' : ''}${live ? ' is-live' : ''}">
      <div class="cls-time"><strong>${c.start}</strong><span>${c.end}</span></div>
      <div class="cls-main"><div class="cls-title"><strong>${esc(c.course)}</strong><span class="cls-kind">${c.kind}</span></div>
        <div class="cls-meta"><span><i class="bi bi-person"></i>${esc(c.lecturer)}</span><span><i class="bi bi-geo-alt"></i>${esc(c.room)}</span></div></div>${pill}</li>`;
  };
  $('todayClasses').innerHTML = `<div class="d-flex justify-content-between align-items-center mb-3"><h2 class="h6 mb-0"><i class="bi bi-clock me-2"></i>Today's classes${today.length ? ` <span class="badge rounded-pill text-bg-primary ms-1">${today.length}</span>` : ''}</h2><span class="small muted">${d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}</span></div>
    ${today.length ? `<ul class="cls-list">${today.map(tile).join('')}</ul>` : '<div class="text-center muted py-4"><i class="bi bi-cup-hot fs-1 d-block mb-2"></i>No classes today. Enjoy your day.</div>'}`;
}
setInterval(drawThisWeek, 60000);   // keeps Done / Now / Up next current

function draw() {
  drawWeek(); drawThisWeek();
  const cw = currentWeek(), open = TASKS.filter(t => t.status !== 'Completed');
  $('kTotal').textContent = TASKS.length;
  const items = [['Not started', count('Not started'), G.secondary], ['In progress', count('In progress'), G.warning], ['Completed', count('Completed'), G.success],
                 ['Overdue', open.filter(t => isLate(t, cw)).length, G.danger], ['Due in next 2 weeks', open.filter(t => t.week && t.week >= cw && t.week <= cw + 2).length, G.info]];
  $('sumList').innerHTML = items.map(([l, v, c]) => `<li><span><i class="dot" style="background:${c}"></i>${l}</span><strong>${v}</strong></li>`).join('');

  // Table of tasks, earliest due first (no date = last): first 5, or all with "View all".
  const sorted = TASKS.filter(matches).sort((a, b) => (a.week ?? 99) - (b.week ?? 99));
  const active = filterOn(), full = showAll || active;
  const chips = [FILTER.status && 'Status: ' + FILTER.status, FILTER.course && 'Course: ' + FILTER.course, FILTER.week !== null && 'Week ' + FILTER.week].filter(Boolean);
  $('filterBar').classList.toggle('d-none', !active);
  $('filterBar').innerHTML = active ? `<i class="bi bi-funnel me-1"></i>Showing ${sorted.length} of ${TASKS.length} tasks: ${chips.map(c => `<span class="badge text-bg-primary me-1">${esc(c)}</span>`).join('')}<button type="button" class="btn btn-link btn-sm p-0 ms-1" id="clearFilter">Clear filter</button>` : '';
  const bar = $('viewAllBar'), more = sorted.length > PREVIEW && !active;
  bar.classList.toggle('d-none', !more);
  $('viewAll').innerHTML = showAll ? 'Show less <i class="bi bi-chevron-up"></i>' : `View all ${sorted.length} assignments <i class="bi bi-chevron-down"></i>`;
  $('viewAll').setAttribute('aria-expanded', showAll);
  $('dueBody').innerHTML = sorted.length ? (full ? sorted : sorted.slice(0, PREVIEW)).map(t => {
    const done = t.status === 'Completed';
    const chip = done ? ['Completed', 'done'] : isLate(t, cw) ? ['Overdue', 'late'] : t.status === 'In progress' ? ['In progress', 'prog'] : ['Not started', 'new'];
    return `<tr><td style="width:110px"><input type="text" maxlength="3" autocomplete="off" class="form-control form-control-sm" value="${t.week ?? 'TBA'}" placeholder="TBA" title="Number 1-16 or TBA" data-week="${t.id}" aria-label="Due week for ${esc(t.topic)}"></td><td>${t.week ? t.week - cw : '-'}</td><td>${esc(t.topic)}</td><td class="fw-semibold">${t.course}</td>
      <td><span class="chip chip-${chip[1]}">${chip[0]}</span></td><td>${t.type}</td>
      <td><div class="d-flex gap-1 justify-content-end">
        <button class="btn btn-sm ${t.notes ? 'btn-subtle-info' : 'btn-subtle-secondary'}" data-notes="${t.id}" aria-label="View notes: ${esc(t.topic)}" title="${t.notes ? 'View notes' : 'No notes yet'}"><i class="bi bi-journal-text"></i></button>
        <button class="btn btn-sm ${done ? 'btn-subtle-success' : 'btn-subtle-secondary'}" data-done="${t.id}" aria-label="${done ? 'Mark not started' : 'Mark completed'}: ${esc(t.topic)}"><i class="bi bi-check-lg"></i></button>
        <a class="btn btn-sm btn-outline-secondary" href="assignments.html?edit=${t.id}" aria-label="Edit ${esc(t.topic)}"><i class="bi bi-pencil"></i></a>
        <button class="btn btn-sm btn-outline-danger" data-del="${t.id}" aria-label="Delete ${esc(t.topic)}"><i class="bi bi-trash"></i></button></div></td></tr>`;
  }).join('') : `<tr><td colspan="7" class="text-center muted py-4">${TASKS.length ? 'No tasks match this filter.' : 'No tasks yet. Add one on the Assignments page.'}</td></tr>`;
}

// Charts
const courseCounts = () => COURSES.map(c => [c.code, TASKS.filter(t => t.course === c.code).length]).sort((a, b) => b[1] - a[1]);
const weeksUsed = () => [...new Set(TASKS.filter(t => t.week).map(t => t.week))].sort((a, b) => a - b);
const perWeek = (type, weeks) => weeks.map(w => TASKS.filter(t => t.week === w && t.type === type).length);
const w0 = weeksUsed(), c0 = courseCounts();

const statusChart = new Chart($('statusChart'), {
  type: 'pie',
  data: { labels: STATUSES, datasets: [{ data: STATUSES.map(count), backgroundColor: [G.secondary, G.warning, G.success], borderColor: '#fff' }] },
  options: { ...clickable('status', (c, i) => STATUSES[i]), maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
});
const courseChart = new Chart($('courseChart'), {
  type: 'bar',
  data: { labels: c0.map(p => p[0]), datasets: [{ label: 'Tasks', data: c0.map(p => p[1]), backgroundColor: G.primary }] },
  options: { ...clickable('course', (c, i) => c.data.labels[i]), indexAxis: 'y', maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } } }
});
const weekChart = new Chart($('weekChart'), {
  type: 'bar',
  data: { labels: w0.map(w => 'Week ' + w), datasets: [
    { label: 'Individual', data: perWeek('Individual', w0), backgroundColor: G.primary },
    { label: 'Group', data: perWeek('Group', w0), backgroundColor: G.info }] },
  options: { ...clickable('week', (c, i) => +c.data.labels[i].replace('Week ', '')), maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } },
    scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true, ticks: { stepSize: 1 }, title: { display: true, text: 'Tasks' } } } }
});
function updateCharts() {
  const w = weeksUsed(), c = courseCounts();
  statusChart.data.datasets[0].data = STATUSES.map(count);
  courseChart.data.labels = c.map(p => p[0]); courseChart.data.datasets[0].data = c.map(p => p[1]);
  weekChart.data.labels = w.map(x => 'Week ' + x);
  weekChart.data.datasets[0].data = perWeek('Individual', w); weekChart.data.datasets[1].data = perWeek('Group', w);
  [statusChart, courseChart, weekChart].forEach(ch => ch.update());
}

// Events: week selector, editable due week, tick off, notes, delete
$('dueBody').addEventListener('change', e => { const id = e.target.dataset.week; if (!id) return; setWeek(TASKS.find(x => x.id === id), e.target.value); draw(); updateCharts(); });
function saveSem() {
  if (!startEl.value || !endEl.value || endEl.value <= startEl.value) {
    toast('Semester end must be after the start date.'); startEl.value = SEMESTER.start; endEl.value = SEMESTER.end; return;
  }
  SEMESTER.start = startEl.value; SEMESTER.end = endEl.value; DB.set('sem', SEMESTER); draw(); toast('Semester dates saved');
}
$('filterBar').addEventListener('click', e => { if (e.target.closest('#clearFilter')) { FILTER.status = FILTER.course = FILTER.week = null; draw(); } });
$('viewAll').addEventListener('click', () => { showAll = !showAll; draw(); });
startEl.addEventListener('change', saveSem); endEl.addEventListener('change', saveSem);
// Keep the week current if the page stays open past midnight
let shownWeek = currentWeek(); setInterval(() => { if (currentWeek() !== shownWeek) { shownWeek = currentWeek(); draw(); } }, 60000);
$('dueBody').addEventListener('click', e => {
  const done = e.target.closest('[data-done]'), notes = e.target.closest('[data-notes]'), del = e.target.closest('[data-del]');
  if (notes) showNotes(TASKS.find(x => x.id === notes.dataset.notes), t => { location.href = 'assignments.html?edit=' + t.id; });
  if (done) { const t = TASKS.find(x => x.id === done.dataset.done); t.status = t.status === 'Completed' ? 'Not started' : 'Completed'; saveTasks(); draw(); updateCharts(); toast(t.status === 'Completed' ? 'Marked completed' : 'Marked not started'); }
  if (del) deleteTask(del.dataset.del, () => { draw(); updateCharts(); });
});
draw();
