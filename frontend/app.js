/* ============================================================
   GYM PERFORMANCE TRACKING SYSTEM - FRONTEND APPLICATION
   ============================================================ */

// ===================== STATE & CONFIG =====================
const API = '';
let token = localStorage.getItem('gym_token');
let currentUser = null;
let exerciseChart = null;

// ===================== API HELPERS =====================
async function api(endpoint, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API}${endpoint}`, { ...options, headers });
  if (res.status === 401 || res.status === 403) {
    logout();
    throw new Error('Sesi telah berakhir');
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Permintaan gagal');
  return data;
}

function apiGet(url) { return api(url); }
function apiPost(url, body) { return api(url, { method: 'POST', body: JSON.stringify(body) }); }
function apiPut(url, body) { return api(url, { method: 'PUT', body: JSON.stringify(body) }); }
function apiDelete(url) { return api(url, { method: 'DELETE' }); }

// ===================== TOAST NOTIFICATIONS =====================
function toast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ===================== AUTH FLOW =====================
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  try {
    const data = await apiPost('/api/auth/login', { username, password });
    token = data.token;
    localStorage.setItem('gym_token', token);
    currentUser = data.user;
    showApp();
    toast('Selamat datang kembali, ' + (currentUser.name || currentUser.username) + '!');
  } catch (err) {
    toast(err.message, 'error');
  }
});

document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('reg-username').value.trim();
  const password = document.getElementById('reg-password').value;
  if (username.length < 3) return toast('Username minimal 3 karakter', 'error');
  if (password.length < 6) return toast('Kata sandi minimal 6 karakter', 'error');
  try {
    const data = await apiPost('/api/auth/register', { username, password });
    token = data.token;
    localStorage.setItem('gym_token', token);
    currentUser = data.user;
    showApp();
    toast('Akun berhasil dibuat! Selamat datang, ' + (currentUser.name || currentUser.username) + '!');
  } catch (err) {
    toast(err.message, 'error');
  }
});

// Auth form toggles
document.getElementById('to-register-btn').addEventListener('click', (e) => { e.preventDefault(); showAuthForm('register'); });
document.getElementById('to-login-btn').addEventListener('click', (e) => { e.preventDefault(); showAuthForm('login'); });
document.getElementById('back-to-login-btn')?.addEventListener('click', (e) => { e.preventDefault(); showAuthForm('login'); });

function showAuthForm(type) {
  document.getElementById('login-box').style.display = type === 'login' ? 'block' : 'none';
  document.getElementById('register-box').style.display = type === 'register' ? 'block' : 'none';
  const forgotBox = document.getElementById('forgot-box');
  if (forgotBox) forgotBox.style.display = type === 'forgot' ? 'block' : 'none';
}

function logout() {
  token = null;
  currentUser = null;
  localStorage.removeItem('gym_token');
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('app-screen').style.display = 'none';
}

document.getElementById('logout-btn').addEventListener('click', () => {
  logout();
  toast('Anda telah keluar');
});

// ===================== APP INIT =====================
async function showApp() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app-screen').style.display = 'flex';

  if (!currentUser) {
    try {
      currentUser = await apiGet('/api/users/me');
    } catch {
      return logout();
    }
  }

  document.getElementById('nav-username').textContent = currentUser.name || currentUser.username;
  document.getElementById('nav-useremail').textContent = '@' + (currentUser.username || currentUser.name);
  document.getElementById('nav-avatar').textContent = (currentUser.name || currentUser.username).charAt(0).toUpperCase();
  document.getElementById('settings-name').value = currentUser.name || currentUser.username;
  document.getElementById('settings-username').value = currentUser.username || currentUser.name;

  // Set date default
  document.getElementById('log-date').valueAsDate = new Date();

  navigateFromHash();
  loadDashboard();
}

// ===================== SPA NAVIGATION =====================
const navLinks = document.querySelectorAll('.nav-link[data-view]');
const viewMap = {
  'dashboard': 'Dasbor',
  'log-workout': 'Catat Latihan',
  'history': 'Riwayat Latihan',
  'progress': 'Perkembangan & PR',
  'splits': 'Program Latihan',
  'exercises': 'Daftar Latihan',
  'settings': 'Pengaturan Akun',
};

navLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const view = link.dataset.view;
    window.location.hash = view;
    navigateTo(view);
  });
});

function openWorkoutLog() {
  window.location.hash = 'log-workout';
  navigateTo('log-workout');
}

document.getElementById('quick-log-btn').addEventListener('click', openWorkoutLog);
document.getElementById('side-log-btn').addEventListener('click', openWorkoutLog);

// Dashboard card links
document.querySelectorAll('.card-action').forEach(a => {
  a.addEventListener('click', (e) => {
    e.preventDefault();
    const hash = a.getAttribute('href').replace('#', '');
    window.location.hash = hash;
    navigateTo(hash);
  });
});

window.addEventListener('hashchange', navigateFromHash);

function navigateFromHash() {
  const hash = window.location.hash.replace('#', '') || 'dashboard';
  navigateTo(hash);
}

function navigateTo(view) {
  // Activate nav
  navLinks.forEach(l => l.classList.toggle('active', l.dataset.view === view));

  // Activate view
  document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
  const target = document.getElementById('view-' + view);
  if (target) target.classList.add('active');

  // Page title
  document.getElementById('page-title').textContent = viewMap[view] || 'Dasbor';

  // Load data for view
  if (view === 'dashboard') loadDashboard();
  if (view === 'splits') loadSplits();
  if (view === 'exercises') loadExercises();
  if (view === 'history') loadHistory();
  if (view === 'progress') loadProgressExerciseList();
  if (view === 'log-workout') loadLogWorkoutForm();
}

// ===================== DASHBOARD =====================
async function loadDashboard() {
  try {
    const [stats, prs] = await Promise.all([apiGet('/api/stats'), apiGet('/api/prs')]);

    document.getElementById('dash-total-workouts').textContent = stats.totalWorkouts;
    document.getElementById('dash-total-splits').textContent = stats.totalSplits;
    document.getElementById('dash-total-exercises').textContent = stats.totalExercises;
    document.getElementById('dash-total-prs').textContent = prs.length;

    // Recent workouts
    const recentEl = document.getElementById('dash-recent-list');
    if (stats.recentWorkouts.length === 0) {
      recentEl.innerHTML = '<div class="empty-state">Belum ada latihan tercatat. Mulai catat latihan Anda!</div>';
    } else {
      recentEl.innerHTML = stats.recentWorkouts.map(w => `
        <div class="list-item-card">
          <div>
            <strong>${w.session_name}</strong>
            <span style="color:var(--text-subtle); margin-left:0.75rem; font-size:0.85rem">${formatDate(w.date)}</span>
          </div>
        </div>
      `).join('');
    }

    // PRs
    const prsEl = document.getElementById('dash-prs-list');
    if (prs.length === 0) {
      prsEl.innerHTML = '<div class="empty-state">Belum ada PR. Catat sesi latihan untuk memantau rekor Anda.</div>';
    } else {
      prsEl.innerHTML = prs.slice(0, 8).map(p => `
        <div class="list-item-card">
          <strong>${p.name}</strong>
          <span style="color:var(--accent-primary); font-weight:700; font-family:'Space Grotesk',sans-serif; font-variant-numeric:tabular-nums;">${p.pr} kg</span>
        </div>
      `).join('');
    }
  } catch (err) {
    console.error('Kesalahan memuat dasbor:', err);
  }
}

// ===================== SPLITS & SESSIONS =====================
async function loadSplits() {
  try {
    const splits = await apiGet('/api/splits');
    const container = document.getElementById('splits-list');

    if (splits.length === 0) {
      container.innerHTML = '<div class="empty-state">Belum ada program latihan. Klik "+ Program Baru" untuk memulai.</div>';
      return;
    }

    // Load sessions for each split
    const splitsWithSessions = await Promise.all(splits.map(async (s) => {
      const sessions = await apiGet(`/api/splits/${s.id}/sessions`);
      return { ...s, sessions };
    }));

    container.innerHTML = splitsWithSessions.map(s => `
      <div class="split-card">
        <div class="split-header">
          <div>
            <h4>${esc(s.name)}</h4>
            ${s.description ? `<p class="split-desc">${esc(s.description)}</p>` : ''}
          </div>
          <div style="display:flex;gap:0.5rem;">
            <button class="btn btn-secondary btn-sm" onclick="openEditSplit('${s.id}','${esc(s.name)}','${esc(s.description || '')}')">Ubah</button>
            <button class="btn btn-danger btn-sm" onclick="deleteSplit('${s.id}')">Hapus</button>
          </div>
        </div>
        <div class="sessions-list-box">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
            <span class="sessions-title">Sesi</span>
            <button class="btn btn-secondary btn-sm" onclick="openAddSession('${s.id}')">+ Tambah Sesi</button>
          </div>
          <div class="sessions-tag-list">
            ${s.sessions.length === 0 ? '<span style="color:var(--text-subtle); font-size:0.85rem;">Belum ada sesi</span>' : ''}
            ${s.sessions.map(ses => `
              <span class="session-tag">
                ${esc(ses.name)}
                <button onclick="deleteSession('${ses.id}')" title="Hapus">✕</button>
              </span>
            `).join('')}
          </div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Kesalahan memuat program latihan:', err);
  }
}

// Split modal
document.getElementById('create-split-modal-btn').addEventListener('click', () => {
  document.getElementById('split-id').value = '';
  document.getElementById('split-name').value = '';
  document.getElementById('split-desc').value = '';
  document.getElementById('split-modal-title').textContent = 'Buat Program Latihan';
  openModal('split-modal');
});

document.getElementById('split-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('split-id').value;
  const name = document.getElementById('split-name').value;
  const description = document.getElementById('split-desc').value;
  try {
    if (id) {
      await apiPut(`/api/splits/${id}`, { name, description });
      toast('Program berhasil diperbarui');
    } else {
      await apiPost('/api/splits', { name, description });
      toast('Program berhasil dibuat');
    }
    closeModal('split-modal');
    loadSplits();
  } catch (err) { toast(err.message, 'error'); }
});

window.openEditSplit = function (id, name, desc) {
  document.getElementById('split-id').value = id;
  document.getElementById('split-name').value = name;
  document.getElementById('split-desc').value = desc;
  document.getElementById('split-modal-title').textContent = 'Ubah Program Latihan';
  openModal('split-modal');
};

window.deleteSplit = async function (id) {
  if (!confirm('Hapus program ini beserta semua sesinya? Tindakan ini tidak dapat dibatalkan.')) return;
  try {
    await apiDelete(`/api/splits/${id}`);
    toast('Program berhasil dihapus');
    loadSplits();
  } catch (err) { toast(err.message, 'error'); }
};

// Session modal
window.openAddSession = function (splitId) {
  document.getElementById('session-split-id').value = splitId;
  document.getElementById('session-id').value = '';
  document.getElementById('session-name').value = '';
  document.getElementById('session-modal-title').textContent = 'Tambah Sesi';
  openModal('session-modal');
};

document.getElementById('session-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const splitId = document.getElementById('session-split-id').value;
  const name = document.getElementById('session-name').value;
  try {
    await apiPost(`/api/splits/${splitId}/sessions`, { name });
    toast('Sesi berhasil ditambahkan');
    closeModal('session-modal');
    loadSplits();
  } catch (err) { toast(err.message, 'error'); }
});

window.deleteSession = async function (id) {
  if (!confirm('Hapus sesi ini?')) return;
  try {
    await apiDelete(`/api/sessions/${id}`);
    toast('Sesi berhasil dihapus');
    loadSplits();
  } catch (err) { toast(err.message, 'error'); }
};

// ===================== EXERCISES =====================
async function loadExercises() {
  try {
    const exercises = await apiGet('/api/exercises');
    const container = document.getElementById('exercises-list');
    if (exercises.length === 0) {
      container.innerHTML = '<div class="empty-state">Belum ada latihan. Klik "+ Tambah Latihan" untuk membuat daftar latihan.</div>';
      return;
    }
    container.innerHTML = exercises.map(ex => `
      <div class="exercise-card">
        <strong>${esc(ex.name)}</strong>
        <div class="exercise-actions">
          <button class="btn btn-secondary btn-sm" onclick="openEditExercise('${ex.id}', '${esc(ex.name)}')">Ubah</button>
          <button class="btn btn-danger btn-sm" onclick="deleteExercise('${ex.id}')">Hapus</button>
        </div>
      </div>
    `).join('');
  } catch (err) { console.error('Kesalahan memuat daftar latihan:', err); }
}

document.getElementById('add-exercise-modal-btn').addEventListener('click', () => {
  document.getElementById('exercise-id').value = '';
  document.getElementById('exercise-name').value = '';
  document.getElementById('exercise-modal-title').textContent = 'Tambah Latihan';
  openModal('exercise-modal');
});

document.getElementById('exercise-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('exercise-id').value;
  const name = document.getElementById('exercise-name').value;
  try {
    if (id) {
      await apiPut(`/api/exercises/${id}`, { name });
      toast('Latihan berhasil diperbarui');
    } else {
      await apiPost('/api/exercises', { name });
      toast('Latihan berhasil ditambahkan');
    }
    closeModal('exercise-modal');
    loadExercises();
  } catch (err) { toast(err.message, 'error'); }
});

window.openEditExercise = function (id, name) {
  document.getElementById('exercise-id').value = id;
  document.getElementById('exercise-name').value = name;
  document.getElementById('exercise-modal-title').textContent = 'Ubah Latihan';
  openModal('exercise-modal');
};

window.deleteExercise = async function (id) {
  if (!confirm('Hapus latihan ini?')) return;
  try {
    await apiDelete(`/api/exercises/${id}`);
    toast('Latihan berhasil dihapus');
    loadExercises();
  } catch (err) { toast(err.message, 'error'); }
};

// ===================== LOG WORKOUT =====================
let logExerciseCounter = 0;

async function loadLogWorkoutForm() {
  try {
    const sessions = await apiGet('/api/sessions');
    const sel = document.getElementById('log-session-select');
    sel.innerHTML = '<option value="">-- Pilih Sesi Latihan --</option>';
    sessions.forEach(s => {
      sel.innerHTML += `<option value="${s.id}">${esc(s.split_name)} → ${esc(s.name)}</option>`;
    });
  } catch (err) { console.error('Kesalahan memuat sesi:', err); }
}

document.getElementById('add-exercise-to-log-btn').addEventListener('click', async () => {
  logExerciseCounter++;
  try {
    const exercises = await apiGet('/api/exercises');
    const container = document.getElementById('logged-exercises-container');
    const div = document.createElement('div');
    div.className = 'logged-exercise-item';
    div.dataset.index = logExerciseCounter;
    div.innerHTML = `
      <div class="logged-exercise-header">
        <select class="log-exercise-select" required>
          <option value="">-- Pilih Latihan --</option>
          ${exercises.map(ex => `<option value="${ex.id}">${esc(ex.name)}</option>`).join('')}
        </select>
        <button type="button" class="btn-icon-danger" onclick="this.closest('.logged-exercise-item').remove()">🗑️ Hapus</button>
      </div>
      <div class="sets-container">
        ${createSetRow(1)}
      </div>
      <button type="button" class="btn btn-secondary btn-sm" style="margin-top:0.75rem"
        onclick="addSetRow(this.closest('.logged-exercise-item'))">+ Tambah Set</button>
    `;
    container.appendChild(div);
  } catch (err) { toast('Gagal memuat daftar latihan', 'error'); }
});

function createSetRow(num) {
  return `
    <div class="set-row">
      <span class="set-number-label">Set ${num}</span>
      <div class="set-inputs">
        <input type="number" step="0.5" min="0" placeholder="Beban (kg)" class="set-weight" required>
        <input type="number" min="0" placeholder="Reps" class="set-reps" required>
      </div>
      <button type="button" class="btn-icon-danger" onclick="removeSetRow(this)" title="Hapus set">✕</button>
    </div>
  `;
}

window.addSetRow = function (exerciseItem) {
  const setsContainer = exerciseItem.querySelector('.sets-container');
  const count = setsContainer.querySelectorAll('.set-row').length + 1;
  setsContainer.insertAdjacentHTML('beforeend', createSetRow(count));
};

window.removeSetRow = function (btn) {
  const row = btn.closest('.set-row');
  const container = row.parentElement;
  row.remove();
  // Renumber
  container.querySelectorAll('.set-row').forEach((r, i) => {
    r.querySelector('.set-number-label').textContent = `Set ${i + 1}`;
  });
};

document.getElementById('workout-log-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const date = document.getElementById('log-date').value;
  const session_id = document.getElementById('log-session-select').value;
  if (!session_id) return toast('Pilih sesi latihan terlebih dahulu', 'error');

  const exerciseItems = document.querySelectorAll('.logged-exercise-item');
  if (exerciseItems.length === 0) return toast('Tambahkan minimal satu latihan', 'error');

  const exercises = [];
  for (const item of exerciseItems) {
    const exercise_id = item.querySelector('.log-exercise-select').value;
    if (!exercise_id) return toast('Pilih gerakan untuk setiap entri latihan', 'error');

    const setRows = item.querySelectorAll('.set-row');
    const sets = [];
    let setNum = 1;
    for (const row of setRows) {
      const weight = parseFloat(row.querySelector('.set-weight').value);
      const reps = parseInt(row.querySelector('.set-reps').value);
      if (isNaN(weight) || isNaN(reps)) return toast('Lengkapi data beban dan reps di semua set', 'error');
      sets.push({ set_number: setNum++, weight, reps });
    }
    exercises.push({ exercise_id, sets });
  }

  try {
    await apiPost('/api/workouts', { date, session_id, exercises });
    toast('Latihan berhasil disimpan!');
    // Reset form
    document.getElementById('logged-exercises-container').innerHTML = '';
    document.getElementById('log-session-select').value = '';
    document.getElementById('log-date').valueAsDate = new Date();
    logExerciseCounter = 0;
  } catch (err) { toast(err.message, 'error'); }
});

// ===================== WORKOUT HISTORY =====================
async function loadHistory() {
  try {
    const workouts = await apiGet('/api/workouts');
    const container = document.getElementById('history-list');
    if (workouts.length === 0) {
      container.innerHTML = '<div class="empty-state" style="grid-column:1/-1;">Belum ada latihan tercatat.</div>';
      return;
    }
    container.innerHTML = workouts.map(w => `
      <div class="history-card" onclick="viewWorkoutDetail('${w.id}')">
        <div class="history-date">${formatDate(w.date)}</div>
        <div class="history-session">${esc(w.session_name)}</div>
        <div class="history-split">${esc(w.split_name)}</div>
      </div>
    `).join('');
  } catch (err) { console.error('Kesalahan memuat riwayat latihan:', err); }
}

window.viewWorkoutDetail = async function (id) {
  try {
    const w = await apiGet(`/api/workouts/${id}`);
    document.getElementById('modal-workout-title').textContent = `${w.session_name} — ${formatDate(w.date)}`;
    const content = document.getElementById('modal-workout-content');
    content.innerHTML = w.exercises.map(ex => `
      <div style="margin-bottom:1.25rem;">
        <h4 style="margin-bottom:0.5rem; color:var(--accent-secondary);">${esc(ex.exercise_name)}</h4>
        <table class="data-table">
          <thead><tr><th>Set</th><th>Beban (kg)</th><th>Reps</th></tr></thead>
          <tbody>
            ${ex.sets.map(s => `<tr><td>${s.set_number}</td><td>${s.weight}</td><td>${s.reps}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
    `).join('');

    document.getElementById('modal-delete-workout-btn').onclick = async () => {
      if (!confirm('Hapus latihan ini? Tindakan ini tidak dapat dibatalkan.')) return;
      try {
        await apiDelete(`/api/workouts/${id}`);
        toast('Latihan berhasil dihapus');
        closeModal('workout-detail-modal');
        loadHistory();
        loadDashboard();
      } catch (err) { toast(err.message, 'error'); }
    };

    openModal('workout-detail-modal');
  } catch (err) { toast('Gagal memuat detail latihan', 'error'); }
};

// ===================== PROGRESS & PR =====================
async function loadProgressExerciseList() {
  try {
    const exercises = await apiGet('/api/exercises');
    const sel = document.getElementById('progress-exercise-select');
    sel.innerHTML = '<option value="">-- Pilih Latihan untuk Dipantau --</option>';
    exercises.forEach(ex => {
      sel.innerHTML += `<option value="${ex.id}">${esc(ex.name)}</option>`;
    });
  } catch (err) { console.error('Kesalahan memuat data perkembangan:', err); }
}

document.getElementById('progress-exercise-select').addEventListener('change', async (e) => {
  const exId = e.target.value;
  if (!exId) {
    document.getElementById('progress-empty').style.display = 'block';
    document.getElementById('progress-content').style.display = 'none';
    return;
  }

  try {
    const data = await apiGet(`/api/exercises/${exId}/progress`);
    document.getElementById('progress-empty').style.display = 'none';
    document.getElementById('progress-content').style.display = 'block';
    document.getElementById('progress-pr-val').textContent = data.pr + ' kg';

    // Build table
    const tbody = document.querySelector('#progress-table tbody');
    tbody.innerHTML = data.history.map(h => `
      <tr>
        <td>${formatDate(h.date)}</td>
        <td>${h.weight}</td>
        <td>${h.reps}</td>
      </tr>
    `).join('');

    // Build chart
    renderProgressChart(data.history);
  } catch (err) { toast('Gagal memuat perkembangan', 'error'); }
});

function renderProgressChart(history) {
  if (exerciseChart) exerciseChart.destroy();

  // Group by date, take max weight per date
  const dateMap = {};
  history.forEach(h => {
    const d = h.date.substring(0, 10);
    const w = parseFloat(h.weight);
    if (!dateMap[d] || w > dateMap[d]) dateMap[d] = w;
  });

  const labels = Object.keys(dateMap);
  const values = Object.values(dateMap);

  const ctx = document.getElementById('exerciseChart').getContext('2d');
  exerciseChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Beban Maksimum (kg)',
        data: values,
        borderColor: '#ccff00',
        backgroundColor: 'rgba(204, 255, 0, 0.08)',
        fill: true,
        tension: 0.3,
        pointBackgroundColor: '#ccff00',
        pointBorderWidth: 2,
        pointRadius: 5,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#94a3b8', font: { family: 'Inter', size: 11, weight: '600' }, boxWidth: 12, boxHeight: 2 } }
      },
      scales: {
        x: {
          ticks: { color: '#64748b', font: { family: 'Inter', size: 10 } },
          grid: { color: '#1b202c' },
          border: { color: '#262c3a' }
        },
        y: {
          ticks: { color: '#64748b', font: { family: 'Inter', size: 10 } },
          grid: { color: '#1b202c' },
          border: { color: '#262c3a' },
          beginAtZero: false
        }
      }
    }
  });
}

// ===================== SETTINGS (CHANGE PASSWORD) =====================
document.getElementById('change-password-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const currentPassword = document.getElementById('current-password').value;
  const newPassword = document.getElementById('new-password').value;
  if (newPassword.length < 6) return toast('Kata sandi baru minimal 6 karakter', 'error');
  try {
    await apiPut('/api/users/password', { currentPassword, newPassword });
    toast('Kata sandi berhasil diperbarui');
    document.getElementById('current-password').value = '';
    document.getElementById('new-password').value = '';
  } catch (err) { toast(err.message, 'error'); }
});

// ===================== MODAL HELPERS =====================
function openModal(id) {
  document.getElementById(id).style.display = 'flex';
}

window.closeModal = function (id) {
  document.getElementById(id).style.display = 'none';
};

// Close modal on backdrop click
document.querySelectorAll('.modal-backdrop').forEach(modal => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.style.display = 'none';
  });
});

// ===================== UTILITY =====================
function esc(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ===================== BOOT =====================
(async () => {
  if (token) {
    try {
      currentUser = await apiGet('/api/users/me');
      showApp();
    } catch {
      logout();
    }
  }
})();
