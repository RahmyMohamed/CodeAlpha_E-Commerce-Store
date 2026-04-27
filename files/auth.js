let currentUser = null;

function initAuth() {
  const token = localStorage.getItem('token');
  const userData = localStorage.getItem('user');
  if (token && userData) {
    currentUser = JSON.parse(userData);
    updateAuthUI();
  }
}

function updateAuthUI() {
  const authBtn = document.getElementById('authBtn');
  const userMenu = document.getElementById('userMenu');
  const ordersLink = document.getElementById('ordersNavLink');
  if (currentUser) {
    authBtn.style.display = 'none';
    userMenu.style.display = 'block';
    ordersLink.style.display = 'inline-flex';
    document.getElementById('userAvatar').textContent = currentUser.name.charAt(0).toUpperCase();
    document.getElementById('dropdownName').textContent = currentUser.name;
  } else {
    authBtn.style.display = 'block';
    userMenu.style.display = 'none';
    ordersLink.style.display = 'none';
  }
}

function toggleAuthModal() {
  document.getElementById('authModal').style.display = 'flex';
}
function closeAuthModal() {
  document.getElementById('authModal').style.display = 'none';
}
function closeAuthOnClick(e) {
  if (e.target === document.getElementById('authModal')) closeAuthModal();
}
function switchAuthTab(tab) {
  document.getElementById('loginTab').classList.toggle('active', tab === 'login');
  document.getElementById('registerTab').classList.toggle('active', tab === 'register');
  document.getElementById('loginForm').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('registerForm').style.display = tab === 'register' ? 'block' : 'none';
}
function toggleUserDropdown() {
  document.getElementById('userDropdown').classList.toggle('open');
}

async function handleLogin() {
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const errEl = document.getElementById('loginError');
  errEl.textContent = '';
  try {
    const { token, user } = await API.login(email, password);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    currentUser = user;
    updateAuthUI();
    closeAuthModal();
    showToast('Welcome back, ' + user.name + '!', 'success');
    loadCart();
  } catch (e) {
    errEl.textContent = e.message;
  }
}

async function handleRegister() {
  const name = document.getElementById('regName').value;
  const email = document.getElementById('regEmail').value;
  const password = document.getElementById('regPassword').value;
  const errEl = document.getElementById('registerError');
  errEl.textContent = '';
  try {
    const { token, user } = await API.register(name, email, password);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    currentUser = user;
    updateAuthUI();
    closeAuthModal();
    showToast('Account created! Welcome, ' + user.name + '!', 'success');
  } catch (e) {
    errEl.textContent = e.message;
  }
}

function handleLogout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  currentUser = null;
  updateAuthUI();
  navigate('home');
  showToast('Signed out successfully');
  document.getElementById('userDropdown').classList.remove('open');
}
