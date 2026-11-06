/* ===== Seed data (stands in for a database; changes are kept in localStorage) ===== */

// Hardcoded account (password stored as a SHA-256 hash of "username:password").
const SEED_USERS = [{ username: 'student', hash: '41afa6e5a00cd2b95fe294114331b242c614b12c5844111bc20bfc53aa2bfe9b', name: 'Student User' }];

// Courses (from the CDIM262 tracker, semester 3)
const SEED_COURSES = ['IMS555', 'IMC501', 'IMS511', 'HGD344', 'LCC402', 'IML513', 'TAC451'].map(code => ({ code }));

// Tasks: week is numeric (end of a range) for charts; label is the original text shown in the notes viewer.
// "Submitted" in the sheet maps to Completed here.
const task = (id, course, topic, type, week, label, notes = '', status = 'Completed') => ({ id, course, topic, type, week, label, notes, status });
const SEED_TASKS = [
  task('T01', 'IMS555', 'Motion graphic (Creative Model)', 'Individual', 9, 'Week 9 (1/6/2026)', 'MOTION GRAPHIC <30MB', 'In progress'),
  task('T02', 'IMS555', 'Empowering decision-making about petrodollar today', 'Group', 13, 'Week 13 (29/6/2026)', 'US VS IRAN', 'Not started'),
  task('T03', 'IMC501', 'SLR (Healthcare)', 'Individual', 12, 'Week 12 (22/6/2026)', 'SLR PRISMA', 'In progress'),
  task('T04', 'IMC501', 'Drunkdriver (dataset)', 'Group', 15, 'Week 15 (15/7/2026)', 'EXCEL & PAPERWORK', 'Completed'),
  task('T05', 'IMS511', 'Concert Ticket Booking System (C++)', 'Group', 15, 'Week 15', 'CODING & PRESENTATION WEEK 14', 'In progress'),
  task('T06', 'HGD344', 'Video (rasuah)', 'Group', 8, 'Week 8 (19/5/2026)', 'RECORD & PRESENTATION', 'In progress'),
  task('T07', 'HGD344', 'Case paperwork', 'Group', 8, 'Week 8 (19/5/2026)', 'PAPERWORK', 'Not started'),
  task('T08', 'LCC402', 'Chart/ Graph Presentation Outline', 'Group', 5, 'Week 5 (2/5/2026)', 'OUTLINE', 'Completed'),
  task('T09', 'IMS511', 'Viva defence preparation', 'Individual', null, 'TBA', '', 'Not started'),
  task('T10', 'IML513', 'Final project (courseware proposal) & presentation', 'Group', 9, 'Week 9 (4/6/2026)', 'PROPOSAL & VIDEO', 'Not started')
];
// Ten samples chosen so every feature has something to show (with the default semester, the current week is 9):
// all 3 statuses, 2 overdue (T06, T07), 2 due this week (T01, T10), Individual + Group, a TBA week and a task with no notes (T09),
// High / Medium / Low priorities, courses at 0% / 50% / 100% progress, and TAC451 left empty to show the empty course card.
const HIGH = ['T03', 'T05', 'T07', 'T10'], LOW = ['T04', 'T08', 'T09'];   // sample priorities
SEED_TASKS.forEach(t => { t.priority = HIGH.includes(t.id) ? 'High' : LOW.includes(t.id) ? 'Low' : 'Medium'; });

// Sample weekly timetable (made up for the demo: the sheet has no class times). kind: Lecture or Tutorial. day: 1 = Mon ... 5 = Fri, 0 = Sun. Times are 24-hour.
const cls = (id, course, kind, day, start, end, room, lecturer) => ({ id, course, kind, day, start, end, room, lecturer });
const SEED_CLASSES = [
  cls('C01', 'IMS555', 'Lecture', 1, '09:00', '11:00', 'DK 3', 'Dr. Aisyah'),
  cls('C02', 'IMC501', 'Lecture', 1, '14:00', '16:00', 'DK 1', 'Dr. Hafiz'),
  cls('C03', 'IMS511', 'Lecture', 2, '09:00', '11:00', 'DK 2', 'Mr. Zul'),
  cls('C04', 'IMS511', 'Tutorial', 2, '11:00', '13:00', 'Computer Lab 2', 'Mr. Zul'),
  cls('C05', 'HGD344', 'Lecture', 2, '14:00', '16:00', 'DK 2', 'Dr. Farah'),
  cls('C06', 'LCC402', 'Lecture', 3, '09:00', '11:00', 'BK 1', 'Pn. Salmah'),
  cls('C07', 'IMS555', 'Tutorial', 3, '14:00', '15:00', 'BK 2', 'Dr. Aisyah'),
  cls('C08', 'IMC501', 'Tutorial', 4, '09:00', '10:00', 'BK 4', 'Dr. Hafiz'),
  cls('C09', 'IML513', 'Lecture', 4, '11:00', '13:00', 'DK 3', 'Dr. Nadia'),
  cls('C10', 'IML513', 'Tutorial', 4, '15:00', '16:00', 'BK 3', 'Dr. Nadia'),
  cls('C11', 'LCC402', 'Tutorial', 5, '10:00', '11:00', 'BK 1', 'Pn. Salmah'),
  cls('C12', 'TAC451', 'Lecture', 5, '14:00', '16:00', 'Studio A', 'En. Razif')
];
