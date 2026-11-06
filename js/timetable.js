/* ===== Timetable: weekly grid, "next class in ..." countdown, add / edit / delete a class ===== */
const DAYS = [['Mon', 'Monday', 1], ['Tue', 'Tuesday', 2], ['Wed', 'Wednesday', 3], ['Thu', 'Thursday', 4], ['Fri', 'Friday', 5], ['Sat', 'Saturday', 6], ['Sun', 'Sunday', 0]]
  .map(([s, l, n]) => ({ s, l, n }));   // n matches Date.getDay()
const ROW_H = 56;   // px per hour in the grid
const save = () => DB.set('classes', CLASSES);
if (CLASSES.some(c => c.kind === 'Lab')) { CLASSES.forEach(c => { if (c.kind === 'Lab') c.kind = 'Tutorial'; }); save(); }   // Lab type was removed: older saved classes become Tutorials
const modal = new bootstrap.Modal($('classModal'));
let editId = null, drawnDay = -1;

const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const pad = n => String(n).padStart(2, '0');
const hhmm = min => pad(Math.floor(min / 60)) + ':' + pad(min % 60);
const dayName = n => DAYS.find(d => d.n === n).l;
const colorOf = code => 'tt-c' + (Math.max(0, COURSES.findIndex(c => c.code === code)) % 8);   // one colour per course
const describe = c => `${c.course} ${c.kind}, ${dayName(c.day)} ${c.start} to ${c.end}${c.room ? ', room ' + c.room : ''}${c.lecturer ? ', ' + c.lecturer : ''}`;

// ----- countdown -----
// When a class next starts/ends: today if it has not finished yet, otherwise on its next weekday
function occurrence(c, now) {
  let add = (c.day - now.getDay() + 7) % 7;
  const at = (a, min) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + a, 0, min);
  if (add === 0 && at(0, toMin(c.end)) <= now) add = 7;
  return { c, s: at(add, toMin(c.start)), e: at(add, toMin(c.end)) };
}
function findClasses(now) {
  const occ = CLASSES.map(c => occurrence(c, now));
  return { current: occ.find(o => o.s <= now && now < o.e), next: occ.filter(o => o.s > now).sort((a, b) => a.s - b.s)[0] };
}
function span(ms) {   // 2h 15m, 1h, 3d 4h, 45m
  const m = Math.floor(ms / 60000), d = Math.floor(m / 1440), h = Math.floor(m % 1440 / 60), mm = m % 60;
  if (m < 1) return 'less than a minute';
  if (d) return `${d}d${h ? ' ' + h + 'h' : ''}`;
  if (h) return `${h}h${mm ? ' ' + mm + 'm' : ''}`;
  return `${mm}m`;
}
function whenLabel(date, now) {
  const dd = Math.round((new Date(date.getFullYear(), date.getMonth(), date.getDate()) - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 864e5);
  return (dd === 0 ? 'Today' : dd === 1 ? 'Tomorrow' : dayName(date.getDay())) + ' ' + hhmm(date.getHours() * 60 + date.getMinutes());
}
function drawNext(now = new Date()) {
  if (!CLASSES.length) { $('nextClass').innerHTML = '<div class="muted">No classes yet, so there is nothing to count down to.</div>'; return; }
  const { current, next } = findClasses(now);
  const live = current ? `<div class="tt-live"><span class="dot-live"></span>In class now: <strong>${esc(current.c.course)} ${current.c.kind}</strong> &middot; ends in ${span(current.e - now)}</div>` : '';
  const meta = c => [c.room && `<li><i class="bi bi-geo-alt"></i>${esc(c.room)}</li>`, c.lecturer && `<li><i class="bi bi-person"></i>${esc(c.lecturer)}</li>`].filter(Boolean).join('');
  $('nextClass').innerHTML = live + (next
    ? `<div class="tt-next-wrap">
        <div class="tt-next-row"><div class="tt-next-icon" aria-hidden="true"><i class="bi bi-alarm"></i></div>
          <div><div class="tt-next-label">Next class</div><div class="big">in ${span(next.s - now)}</div></div></div>
        <div class="tt-next-detail"><div class="tt-next-title"><strong>${esc(next.c.course)}</strong><span class="tt-kind">${next.c.kind}</span></div>
          <ul class="tt-next-meta"><li><i class="bi bi-calendar-event"></i>${whenLabel(next.s, now).replace(' ', ', ')}&ndash;${next.c.end}</li>${meta(next.c)}</ul></div></div>`
    : '<div class="muted">No upcoming classes.</div>');
}

// ----- grid -----
function layout(list) {   // classes that overlap in time sit side by side
  const items = list.map(c => ({ c, s: toMin(c.start), e: toMin(c.end) })).sort((a, b) => a.s - b.s || a.e - b.e), out = [];
  let group = [], groupEnd = 0;
  const flush = () => {
    const lanes = [];
    group.forEach(it => { let l = lanes.findIndex(end => end <= it.s); if (l < 0) { l = lanes.length; lanes.push(0); } lanes[l] = it.e; it.lane = l; });
    group.forEach(it => it.lanes = lanes.length); out.push(...group); group = [];
  };
  items.forEach(it => { if (group.length && it.s >= groupEnd) { flush(); groupEnd = 0; } group.push(it); groupEnd = Math.max(groupEnd, it.e); });
  if (group.length) flush();
  return out;
}

function draw() {
  const now = new Date(); drawnDay = now.getDate();
  $('ttEmpty').classList.toggle('d-none', !!CLASSES.length);
  $('ttGrid').innerHTML = $('ttAgenda').innerHTML = '';
  if (!CLASSES.length) return;
  const days = DAYS.filter(d => (d.n >= 1 && d.n <= 5) || CLASSES.some(c => c.day === d.n));   // Mon-Fri, plus the weekend only if used
  const mins = CLASSES.flatMap(c => [toMin(c.start), toMin(c.end)]);
  const minH = Math.min(8, Math.floor(Math.min(...mins) / 60)), maxH = Math.max(18, Math.ceil(Math.max(...mins) / 60)), hours = maxH - minH;

  const cols = days.map(d => {
    const blocks = layout(CLASSES.filter(c => c.day === d.n)).map(({ c, s, e, lane, lanes }) => `
      <button type="button" class="tt-block ${colorOf(c.course)}" data-class="${c.id}" title="${esc(describe(c))}" aria-label="${esc(describe(c))}. Edit class"
        style="top:${(s - minH * 60) / 60 * ROW_H}px;height:${(e - s) / 60 * ROW_H - 2}px;left:calc(${lane} * (100% / ${lanes}) + 2px);width:calc(100% / ${lanes} - 4px)">
        <span class="tt-code">${esc(c.course)}</span><span>${c.kind} &middot; ${c.start}&ndash;${c.end}</span>
        ${c.room ? `<span><i class="bi bi-geo-alt"></i> ${esc(c.room)}</span>` : ''}${c.lecturer ? `<span><i class="bi bi-person"></i> ${esc(c.lecturer)}</span>` : ''}</button>`).join('');
    return `<div class="tt-col${d.n === now.getDay() ? ' today' : ''}" data-day="${d.n}" style="height:${hours * ROW_H}px">${blocks}</div>`;
  }).join('');
  $('ttGrid').innerHTML = `<div class="tt" style="--cols:${days.length}">
    <div class="tt-corner"></div>${days.map(d => `<div class="tt-dayh${d.n === now.getDay() ? ' today' : ''}">${d.s}${d.n === now.getDay() ? ' <small>(today)</small>' : ''}</div>`).join('')}
    <div class="tt-times" style="height:${hours * ROW_H}px">${Array.from({ length: hours + 1 }, (_, i) => `<span class="tt-time${i === 0 ? ' first' : ''}" style="top:${i * ROW_H}px">${hhmm((minH + i) * 60)}</span>`).join('')}</div>${cols}</div>`;
  $('ttGrid').dataset.minh = minH;

  // Mobile: a simple list per day
  $('ttAgenda').innerHTML = days.map(d => {
    const list = CLASSES.filter(c => c.day === d.n).sort((a, b) => toMin(a.start) - toMin(b.start));
    return `<section class="mb-3" aria-label="${d.l}"><h2 class="h6 mb-2">${d.l}${d.n === now.getDay() ? ' <span class="badge text-bg-primary">Today</span>' : ''}</h2>` + (list.length
      ? `<div class="list-group">${list.map(c => `<button type="button" class="list-group-item list-group-item-action tt-ag ${colorOf(c.course)} d-flex gap-3" data-class="${c.id}" aria-label="${esc(describe(c))}. Edit class">
          <div class="small">${c.start}<br>${c.end}</div><div><strong>${esc(c.course)}</strong> ${c.kind}<div class="small">${[c.room && esc(c.room), c.lecturer && esc(c.lecturer)].filter(Boolean).join(' &middot; ')}</div></div></button>`).join('')}</div>`
      : '<div class="muted small">No classes</div>') + '</section>';
  }).join('');
  drawNow(); drawNext(now);
}

// Red "now" line in today's column
function drawNow() {
  document.querySelectorAll('.tt-now').forEach(n => n.remove());
  const now = new Date(), col = document.querySelector(`.tt-col[data-day="${now.getDay()}"]`), minH = +$('ttGrid').dataset.minh;
  if (!col) return;
  const top = ((now.getHours() * 60 + now.getMinutes()) - minH * 60) / 60 * ROW_H;
  if (top < 0 || top > col.offsetHeight) return;
  const line = document.createElement('div'); line.className = 'tt-now'; line.style.top = top + 'px'; col.appendChild(line);
}
// Keep the countdown live; redraw everything when the day changes
setInterval(() => { if (new Date().getDate() !== drawnDay) draw(); else { drawNow(); drawNext(); } }, 30000);

// ----- add / edit / delete -----
$('cDay').innerHTML = DAYS.map(d => `<option value="${d.n}">${d.l}</option>`).join('');
// The course dropdown ends with "+ Add new subject...", which reveals code and name fields
const toggleNew = () => $('newSubject').classList.toggle('d-none', $('cCourse').value !== '__new__');
$('cCourse').addEventListener('change', () => { toggleNew(); if ($('cCourse').value === '__new__') $('cNewCode').focus(); });
function openForm(id) {
  editId = id || null;
  const c = id ? CLASSES.find(x => x.id === id) : null;
  $('cCourse').innerHTML = COURSES.map(x => `<option value="${esc(x.code)}">${esc(x.code)}${x.name ? ' - ' + esc(x.name) : ''}</option>`).join('') + '<option value="__new__">+ Add new subject...</option>';
  $('cNewCode').value = $('cNewName').value = '';
  $('cTitle').textContent = c ? 'Edit class' : 'Add class'; $('cSave').textContent = c ? 'Save changes' : 'Save class';
  $('cDelete').classList.toggle('d-none', !c); $('cErr').textContent = '';
  $('cCourse').value = c ? c.course : (COURSES[0] || { code: '__new__' }).code; toggleNew();
  $('cKind').value = c ? c.kind : 'Lecture';
  $('cDay').value = c ? c.day : new Date().getDay();
  $('cStart').value = c ? c.start : '09:00'; $('cEnd').value = c ? c.end : '11:00';
  $('cRoom').value = c ? c.room : ''; $('cLect').value = c ? c.lecturer : '';
  modal.show();
}
$('addClass').addEventListener('click', () => openForm());
document.addEventListener('click', e => { const b = e.target.closest('[data-class]'); if (b) openForm(b.dataset.class); });

$('cSave').addEventListener('click', () => {
  const data = { course: $('cCourse').value, kind: $('cKind').value, day: +$('cDay').value, start: $('cStart').value, end: $('cEnd').value, room: $('cRoom').value.trim(), lecturer: $('cLect').value.trim() };
  const err = !data.start || !data.end ? 'Enter a start and end time.'
    : toMin(data.end) <= toMin(data.start) ? 'End time must be after the start time.' : '';
  if (err) { $('cErr').textContent = err; return; }
  const clash = CLASSES.find(x => x.id !== editId && x.day === data.day && toMin(x.start) < toMin(data.end) && toMin(data.start) < toMin(x.end));
  if (clash && !confirm(`This overlaps ${clash.course} ${clash.kind} (${clash.start}-${clash.end}). Save anyway?`)) return;
  if (data.course === '__new__') {   // create the new subject first, then use it for this class
    const code = $('cNewCode').value.trim().toUpperCase(), name = $('cNewName').value.trim();
    if (!code) { $('cErr').textContent = 'Enter a course code for the new subject.'; return; }
    if (!COURSES.some(x => x.code === code)) { COURSES.push({ code, name }); DB.set('courses', COURSES); }
    data.course = code;
  }
  if (editId) Object.assign(CLASSES.find(x => x.id === editId), data);
  else CLASSES.push({ id: 'C' + pad(Math.max(0, ...CLASSES.map(x => +x.id.slice(1) || 0)) + 1), ...data });
  save(); modal.hide(); draw(); toast(editId ? 'Class updated' : 'Class added');
});
$('cDelete').addEventListener('click', () => {
  const c = CLASSES.find(x => x.id === editId); if (!c || !confirm(`Delete ${c.course} ${c.kind} on ${dayName(c.day)}?`)) return;
  CLASSES.splice(CLASSES.indexOf(c), 1); save(); modal.hide(); draw(); toast('Class deleted');
});
draw();
