# Tracker - Assignment Tracker

Tracker is a small web app I built for my **IMS566 Advanced Web Design Development and Content Management** individual project. I kept forgetting which assignments were due and which week I was in, so I turned my CDIM262 tracker sheet into a website where I can see everything in one place: my assignments, my courses and my weekly class timetable.

There is no backend or database. The sample data is in `js/data.js`, and anything I add or change is saved in the browser's `localStorage`.

**Live website (GitHub Pages):** https://welptae.github.io/tracker/
**GitHub repository:** https://github.com/welptae/tracker

## How to test the login

Open the live website and log in with:

| Username | Password |
|---|---|
| student | student123 |

If you type a wrong username or password, an error message appears and the password box is cleared. If you try to open any other page without logging in, it sends you back to the login page.

## Features

**Login**
- Hardcoded account with clear error messages
- Show / hide password button (the eye icon)
- Session check on every other page, so you can't skip the login
- Passwords are stored as SHA-256 hashes instead of plain text

**Navigation and layout**
- One navigation bar on every page, with a hamburger menu on mobile
- Shared footer, a page title and a meta description on each page
- Responsive layout built with the Bootstrap grid, so it works on desktop and phone sizes
- Light and dark mode (it remembers your choice)

**Dashboard**
- Summary card with the total number of assignments and a count for each status, overdue and due in the next 2 weeks
- Three Chart.js charts: tasks by status, tasks by course, and tasks due per week (split into individual and group)
- The charts are clickable. Clicking a slice or bar filters the due-date table below, and clicking it again (or pressing Clear filter) resets it
- "Due this week" and "Today's classes" panels
- Due-date table that flags overdue tasks
- The current week is worked out automatically from the semester start and end dates

**Assignments** (data page 1)
- Search, filter by course and status, and sort by newest, course, earliest due or priority
- Edit the due week and status straight from each row
- Priority labels (Low, Medium, High) and a "Due soon" filter
- Notes viewer, add, edit and delete (with an Undo button after deleting)

**Courses** (data page 2)
- Card for each course with a progress bar, search and sorting
- Click a card to see all the tasks for that course

**Timetable** (data page 3)
- Weekly grid of lectures and tutorials with the room and lecturer
- "Next class" countdown and a red line showing the current time
- Warns you if a new class overlaps with another one
- Turns into a day-by-day list on phones

**Extra**
- Can be installed as an app and works offline (needs https, which GitHub Pages has)
- Skip-to-content link and labels for screen readers

## Frameworks and libraries

- Bootstrap 5.3.3 (layout, components, responsive design)
- Bootstrap Icons 1.11.3
- Chart.js 4.4.1 (charts)
- Google Fonts (Jost and Source Sans 3)

Everything else is plain HTML, CSS and JavaScript.

## Project structure

```
index.html                login page (kept in the root so GitHub Pages opens it first)
pages/                    dashboard.html, assignments.html, courses.html, timetable.html
css/                      style.css, assignments.css, timetable.css, dark.css
js/                       data.js (sample data), app.js (shared code), auth.js,
                          dashboard.js, assignments.js, courses.js, timetable.js
assets/                   icon.svg, manifest.webmanifest (app install details)
sw.js                     offline support (must stay in the root)
README.md
```

Each file has comments explaining what the code does.

## Things to know

- This is a front-end prototype. The login is only simulated in the browser, so it is **not real security**.
- Data is saved in the browser only, so it won't show up on another browser or device.
- The class times in the timetable are made up for the demo.
- The sample data is set up for Week 9 of the semester, so it shows overdue and due-this-week tasks. To get the sample data back, clear this site's data in Chrome (DevTools > Application > Local storage) and refresh.
- It is meant to be opened in Google Chrome, as the assignment guideline asked.

## Deployment

I pushed the project to GitHub and turned on GitHub Pages (Settings > Pages > Deploy from branch `main`, `/ (root)`).
