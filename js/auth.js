/* ===== Login (simulated, no backend) ===== */
if (SESSION) location.href = 'pages/dashboard.html';

// Password is checked against SHA-256("username:password") stored in data.js
const hashPw = async (u, p) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(u.toLowerCase() + ':' + p)))].map(x => x.toString(16).padStart(2, '0')).join('');
const showMsg = (text, type) => { const m = $('msg'); m.textContent = text; m.className = 'alert alert-' + type; };

$('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const u = $('username').value.trim(), p = $('password').value;
  const h = u && p ? await hashPw(u, p) : '', user = SEED_USERS.find(x => x.username === u && x.hash === h);
  if (user) { sessionStorage.setItem('tracker_user', JSON.stringify({ username: user.username, name: user.name })); location.href = 'pages/dashboard.html'; }
  else {
    showMsg(!u || !p ? 'Enter both username and password.' : 'Wrong username or password. Check your details and try again.', 'danger');
    $('password').value = ''; $('password').focus();
  }
});

// Show / hide password: eye = hidden (click to reveal), eye-slash = visible (click to hide)
$('pwToggle').addEventListener('click', () => {
  const show = $('password').type === 'password';
  $('password').type = show ? 'text' : 'password';
  $('pwToggle').setAttribute('aria-pressed', show); $('pwToggle').setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  $('pwToggle').firstElementChild.className = 'bi ' + (show ? 'bi-eye-slash' : 'bi-eye');
  $('password').focus();
});
