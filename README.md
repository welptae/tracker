# Tracker - Assignment Tracker

Tracker is a small web app I made for my **IMS566 Advanced Web Design Development and Content Management** individual project. I kept losing track of which assignments were due and which week of the semester I was in, so I took my CDIM262 tracker sheet and turned it into a website. Now I can see everything in one place: my assignments, my courses and my weekly class timetable.

There is no backend or database. The sample data lives in `js/data.js`, and anything I add or change gets saved in the browser's `localStorage`.

**Live website (GitHub Pages):** https://welptae.github.io/tracker/
**GitHub repository:** https://github.com/welptae/tracker

## How to test the login

Open the live website and log in with:

| Username | Password |
|---|---|
| student | student123 |

If you type the wrong username or password, an error message shows up and the password box is cleared. If you try to open any other page without logging in first, you get sent back to the login page.

## Features

**Login**
- A hardcoded account with clear error messages
- A show / hide password button (the eye icon)
- Every other page checks your session, so you can't skip the login
- Passwords are stored as SHA-256 hashes instead of plain text

**Navigation and layout**
- The same navigation bar on every page, with a hamburger menu on mobile
- A shared footer, plus a page title and meta description on each page
- A responsive layout built with the Bootstrap grid, so it works on both desktop and phone sizes
- Light and dark mode, and it remembers which one you picked

**Dashboard**
- A summary card showing the total number of assignments, a count for each status, and how many are overdue or due in the next 2 weeks
- Three Chart.js charts: tasks by status, tasks by course, and tasks due per week (split into individual and group)
- The charts are clickable. Click a slice or bar to filter the due-date table below, then click it again (or press Clear filter) to reset it
- "Due this week" and "Today's classes" panels
- A "Semester at a glance" heatmap with one square per week. Darker means more open tasks due, red means overdue, and clicking a week filters the table
- A due-date table that flags overdue tasks
- The current week is worked out automatically from the semester start and end dates

**Assignments** (data page 1)
- Search, filter by course and status, and sort by newest, course, earliest due or priority
- Edit the due week and status straight from each row
- Priority labels (Low, Medium, High) and a "Due soon" filter
- A notes viewer, plus add, edit and delete (with an Undo button after you delete something)
- **Board view**: switch from List to Board for a Kanban layout with Not started, In progress and Completed columns. Drag a card to change its status, or use the arrow buttons on a phone
- **Export**: the Export menu gives you an Excel file or a calendar file (`.ics`) with your open deadlines and weekly classes, which you can import into Google Calendar or Outlook
- **Export to Excel**: one button downloads an `.xlsx` file with three sheets (Assignments, Courses and Timetable)

**Courses** (data page 2)
- A card for each course with a progress bar, plus search and sorting
- Click a card to see all the tasks for that course

**Timetable** (data page 3)
- A weekly grid of lectures and tutorials with the room and lecturer
- A "Next class" countdown and a red line showing the current time
- A warning if a new class overlaps with another one
- It turns into a day-by-day list on phones

**Guided tour (every page)**
- Login, Dashboard, Assignments, Courses and Timetable each have their own step-by-step tour
- Each tour starts by itself the first time you open that page, and the ? button replays it (on the login page it is the "Take a tour" button)
- The last step of each tour has a "Next" button that takes you to the next page's tour (Dashboard, Assignments, Courses, Timetable)
- It works with the keyboard (arrow keys and Esc) and skips anything that is hidden on small screens

**Extra**
- It can be installed as an app and works offline (this needs https, which GitHub Pages has)
- A skip-to-content link and labels for screen readers

## Frameworks and libraries

- Bootstrap 5.3.3 (layout, components, responsive design)
- Bootstrap Icons 1.11.3
- Chart.js 4.4.1 (charts)
- SheetJS 0.18.5 (creates the Excel file in the browser)
- Google Fonts (Jost and Source Sans 3)

Everything else is plain HTML, CSS and JavaScript.

## Project structure

```
index.html                login page (kept in the root so GitHub Pages opens it first)
pages/                    dashboard.html, assignments.html, courses.html, timetable.html
css/                      style.css, assignments.css, timetable.css, dark.css
js/                       data.js (sample data), app.js (shared code and the guided tour), auth.js,
                          dashboard.js, assignments.js, courses.js, timetable.js
assets/                   icon.svg, manifest.webmanifest (app install details)
sw.js                     offline support (must stay in the root)
README.md
```

Each file has comments that explain what the code does.

## Things to know

- This is a front-end prototype. The login is only simulated in the browser, so it is **not real security**.
- Data is saved in the browser only, so it won't show up on another browser or device.
- The class times in the timetable are made up for the demo.
- The sample data is set up for Week 9 of the semester, so it shows overdue and due-this-week tasks. To get the sample data back, clear this site's data in Chrome (DevTools > Application > Local storage) and refresh.
- It is meant to be opened in Google Chrome, as the assignment guideline asked.

## Deployment

I pushed the project to GitHub and turned on GitHub Pages (Settings > Pages > Deploy from branch `main`, `/ (root)`).
