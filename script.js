// ─── DATA ───────────────────────────────────────────────
const CATEGORIES = {
  income: [
    { id: 'gaji',      label: 'Gaji',      icon: '💼', color: '#3dffa0' },
    { id: 'freelance', label: 'Freelance',  icon: '💻', color: '#5effe0' },
    { id: 'bisnis',    label: 'Bisnis',     icon: '🏪', color: '#7c6aff' },
    { id: 'investasi', label: 'Investasi',  icon: '📈', color: '#a78bff' },
    { id: 'lainnya_i', label: 'Lainnya',    icon: '💰', color: '#ffd666' },
  ],
  expense: [
    { id: 'makan',      label: 'Makan & Minum', icon: '🍜', color: '#ff5e7e' },
    { id: 'transport',  label: 'Transportasi',  icon: '🚗', color: '#ff9a3d' },
    { id: 'belanja',    label: 'Belanja',        icon: '🛍️', color: '#ffd666' },
    { id: 'tagihan',    label: 'Tagihan',        icon: '💡', color: '#5effe0' },
    { id: 'hiburan',    label: 'Hiburan',        icon: '🎮', color: '#a78bff' },
    { id: 'kesehatan',  label: 'Kesehatan',      icon: '🏥', color: '#3dffa0' },
    { id: 'pendidikan', label: 'Pendidikan',     icon: '📚', color: '#7c6aff' },
    { id: 'lainnya_e',  label: 'Lainnya',        icon: '📦', color: '#8888aa' },
  ]
};

let state = JSON.parse(localStorage.getItem('dompetku_state') || 'null') || {
  transactions: [],
  budget: { makan: 1500000, transport: 500000, belanja: 800000, tagihan: 400000, hiburan: 300000 },
  currentMonth: new Date().getMonth(),
  currentYear: new Date().getFullYear()
};

let modalType = 'income';
let quickType = 'income';
let trendChart = null;
let pieChart = null;

const MONTHS = [
  'Januari','Februari','Maret','April','Mei','Juni',
  'Juli','Agustus','September','Oktober','November','Desember'
];

// ─── HELPERS ────────────────────────────────────────────
function save() {
  localStorage.setItem('dompetku_state', JSON.stringify(state));
}

function fmt(n) {
  return 'Rp ' + Math.abs(n).toLocaleString('id-ID');
}

function fmtShort(n) {
  if (n >= 1e9) return 'Rp ' + (n / 1e9).toFixed(1) + 'M';
  if (n >= 1e6) return 'Rp ' + (n / 1e6).toFixed(1) + 'jt';
  if (n >= 1e3) return 'Rp ' + (n / 1e3).toFixed(0) + 'rb';
  return 'Rp ' + n;
}

function getMonthTx() {
  return state.transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === state.currentMonth && d.getFullYear() === state.currentYear;
  });
}

function getCat(type, id) {
  return CATEGORIES[type].find(c => c.id === id) || CATEGORIES[type].at(-1);
}

function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
}

// ─── MONTH NAV ──────────────────────────────────────────
function changeMonth(dir) {
  state.currentMonth += dir;
  if (state.currentMonth < 0)  { state.currentMonth = 11; state.currentYear--; }
  if (state.currentMonth > 11) { state.currentMonth = 0;  state.currentYear++; }
  save();
  render();
}

// ─── POPULATE SELECTS ───────────────────────────────────
function populateCatSelect(id, type) {
  const el = document.getElementById(id);
  el.innerHTML = CATEGORIES[type]
    .map(c => `<option value="${c.id}">${c.icon} ${c.label}</option>`)
    .join('');
}

// ─── QUICK ADD ──────────────────────────────────────────
function setQuickType(t) {
  quickType = t;
  document.getElementById('quickTypeIncome').className  = 'type-btn' + (t === 'income'  ? ' active-income'  : '');
  document.getElementById('quickTypeExpense').className = 'type-btn' + (t === 'expense' ? ' active-expense' : '');
  populateCatSelect('quickCat', t);
}

function quickAdd() {
  const amount = parseFloat(document.getElementById('quickAmount').value);
  const note   = document.getElementById('quickNote').value.trim();
  const cat    = document.getElementById('quickCat').value;

  if (!amount || amount <= 0) { toast('⚠️ Masukkan nominal yang valid'); return; }

  state.transactions.unshift({
    id: Date.now(),
    type: quickType,
    amount,
    note: note || (quickType === 'income' ? 'Pemasukan' : 'Pengeluaran'),
    category: cat,
    date: new Date().toISOString().split('T')[0]
  });

  document.getElementById('quickAmount').value = '';
  document.getElementById('quickNote').value   = '';
  save();
  render();
  toast('✅ Transaksi tersimpan!');
}

// ─── ADD MODAL ──────────────────────────────────────────
function openModal() {
  modalType = 'income';
  document.getElementById('modalTypeIncome').className  = 'type-btn active-income';
  document.getElementById('modalTypeExpense').className = 'type-btn';
  document.getElementById('modalNote').value   = '';
  document.getElementById('modalAmount').value = '';
  document.getElementById('modalDate').value   = new Date().toISOString().split('T')[0];
  populateCatSelect('modalCat', 'income');
  document.getElementById('addModal').classList.add('open');
}

function closeModal() {
  document.getElementById('addModal').classList.remove('open');
}

function setModalType(t) {
  modalType = t;
  document.getElementById('modalTypeIncome').className  = 'type-btn' + (t === 'income'  ? ' active-income'  : '');
  document.getElementById('modalTypeExpense').className = 'type-btn' + (t === 'expense' ? ' active-expense' : '');
  populateCatSelect('modalCat', t);
}

function saveModal() {
  const amount = parseFloat(document.getElementById('modalAmount').value);
  const note   = document.getElementById('modalNote').value.trim();
  const date   = document.getElementById('modalDate').value;
  const cat    = document.getElementById('modalCat').value;

  if (!amount || amount <= 0) { toast('⚠️ Masukkan nominal yang valid'); return; }
  if (!date) { toast('⚠️ Pilih tanggal'); return; }

  state.transactions.unshift({
    id: Date.now(),
    type: modalType,
    amount,
    note: note || (modalType === 'income' ? 'Pemasukan' : 'Pengeluaran'),
    category: cat,
    date
  });

  closeModal();
  save();
  render();
  toast('✅ Transaksi tersimpan!');
}

// ─── BUDGET MODAL ───────────────────────────────────────
function openBudgetModal() {
  const cats = CATEGORIES.expense.slice(0, 5);
  document.getElementById('budgetInputs').innerHTML = cats.map(c => `
    <div class="input-group">
      <div class="input-label">${c.icon} ${c.label}</div>
      <input class="inp" type="number" id="bud_${c.id}" value="${state.budget[c.id] || 0}" placeholder="0" />
    </div>
  `).join('');
  document.getElementById('budgetModal').classList.add('open');
}

function closeBudgetModal() {
  document.getElementById('budgetModal').classList.remove('open');
}

function saveBudget() {
  CATEGORIES.expense.slice(0, 5).forEach(c => {
    const v = parseFloat(document.getElementById('bud_' + c.id)?.value || 0);
    state.budget[c.id] = v || 0;
  });
  closeBudgetModal();
  save();
  render();
  toast('✅ Budget diperbarui!');
}

// ─── DELETE ─────────────────────────────────────────────
function deleteTx(id) {
  state.transactions = state.transactions.filter(t => t.id !== id);
  save();
  render();
  toast('🗑️ Transaksi dihapus');
}

// ─── RENDER ─────────────────────────────────────────────
function render() {
  document.getElementById('monthLabel').textContent =
    MONTHS[state.currentMonth] + ' ' + state.currentYear;

  const txs      = getMonthTx();
  const incomes  = txs.filter(t => t.type === 'income');
  const expenses = txs.filter(t => t.type === 'expense');
  const totalInc = incomes.reduce((s, t)  => s + t.amount, 0);
  const totalExp = expenses.reduce((s, t) => s + t.amount, 0);
  const bal      = totalInc - totalExp;
  const savRate  = totalInc > 0 ? Math.round((bal / totalInc) * 100) : 0;

  document.getElementById('totalIncome').textContent  = fmt(totalInc);
  document.getElementById('totalExpense').textContent = fmt(totalExp);
  document.getElementById('balance').textContent      = fmt(bal);
  document.getElementById('balance').style.color      = bal >= 0 ? 'var(--green)' : 'var(--red)';
  document.getElementById('incomeCount').textContent  = incomes.length  + ' transaksi';
  document.getElementById('expenseCount').textContent = expenses.length + ' transaksi';
  document.getElementById('savingRate').textContent   = 'Tingkat tabungan: ' + savRate + '%';

  renderBudget(expenses);
  renderTxList(txs);
  renderTrend();
  renderPie(expenses);
}

function renderBudget(expenses) {
  const budgetCats = CATEGORIES.expense.slice(0, 5);
  document.getElementById('budgetItems').innerHTML = budgetCats.map(c => {
    const spent  = expenses.filter(t => t.category === c.id).reduce((s, t) => s + t.amount, 0);
    const budget = state.budget[c.id] || 0;
    if (budget === 0 && spent === 0) return '';
    const pct   = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
    const color = pct > 90 ? 'var(--red)' : pct > 70 ? 'var(--yellow)' : 'var(--green)';
    return `
      <div>
        <div class="budget-item-label">
          <span>${c.icon} ${c.label}</span>
          <span>${fmt(spent)} / ${fmt(budget)}</span>
        </div>
        <div class="budget-bar-bg">
          <div class="budget-bar-fill" style="width:${pct}%;background:${color}"></div>
        </div>
      </div>
    `;
  }).join('');
}

function renderTxList(txs) {
  const el = document.getElementById('txList');
  if (txs.length === 0) {
    el.innerHTML = `<div class="empty-state"><div class="big">💸</div><p>Belum ada transaksi bulan ini</p></div>`;
    return;
  }
  el.innerHTML = txs.slice(0, 30).map(t => {
    const cat     = getCat(t.type, t.category);
    const sign    = t.type === 'income' ? '+' : '−';
    const col     = t.type === 'income' ? 'var(--green)' : 'var(--red)';
    const d       = new Date(t.date);
    const dateStr = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    return `
      <div class="tx-item">
        <div class="tx-icon" style="background:${cat.color}22">${cat.icon}</div>
        <div class="tx-info">
          <div class="tx-name">${t.note}</div>
          <div class="tx-cat">${cat.label}</div>
        </div>
        <div class="tx-right">
          <div class="tx-amount" style="color:${col}">${sign} ${fmtShort(t.amount)}</div>
          <div class="tx-date">${dateStr}</div>
        </div>
        <button class="tx-del" onclick="deleteTx(${t.id})" title="Hapus">✕</button>
      </div>
    `;
  }).join('');
}

function renderTrend() {
  const today   = new Date();
  const labels  = [];
  const incData = [];
  const expData = [];

  for (let i = 6; i >= 0; i--) {
    const d   = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().split('T')[0];
    labels.push(d.toLocaleDateString('id-ID', { weekday: 'short' }));
    const dayTx = state.transactions.filter(t => t.date === key);
    incData.push(dayTx.filter(t => t.type === 'income').reduce((s, t)  => s + t.amount, 0));
    expData.push(dayTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0));
  }

  const ctx = document.getElementById('trendChart').getContext('2d');
  if (trendChart) trendChart.destroy();
  trendChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Pemasukan',   data: incData, backgroundColor: 'rgba(61,255,160,0.5)',  borderColor: '#3dffa0', borderWidth: 2, borderRadius: 6 },
        { label: 'Pengeluaran', data: expData, backgroundColor: 'rgba(255,94,126,0.5)',  borderColor: '#ff5e7e', borderWidth: 2, borderRadius: 6 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: 'rgba(42,42,66,0.5)' }, ticks: { color: '#6b6b8a', font: { family: 'JetBrains Mono', size: 11 } } },
        y: { grid: { color: 'rgba(42,42,66,0.5)' }, ticks: { color: '#6b6b8a', font: { family: 'JetBrains Mono', size: 10 }, callback: v => fmtShort(v) } }
      }
    }
  });
}

function renderPie(expenses) {
  const totals = {};
  expenses.forEach(t => { totals[t.category] = (totals[t.category] || 0) + t.amount; });
  const totalExp = Object.values(totals).reduce((s, v) => s + v, 0);

  document.getElementById('pieTotal').textContent = fmtShort(totalExp);

  const cats   = CATEGORIES.expense.filter(c => totals[c.id] > 0);
  const data   = cats.map(c => totals[c.id]);
  const colors = cats.map(c => c.color);

  const ctx = document.getElementById('pieChart').getContext('2d');
  if (pieChart) pieChart.destroy();

  if (cats.length === 0) {
    document.getElementById('catLegend').innerHTML =
      '<p style="font-size:.75rem;color:var(--muted);text-align:center">Belum ada pengeluaran</p>';
    return;
  }

  pieChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: cats.map(c => c.label),
      datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor: '#12121a', hoverOffset: 4 }]
    },
    options: {
      responsive: false,
      cutout: '68%',
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ' ' + fmtShort(ctx.raw) } }
      }
    }
  });

  document.getElementById('catLegend').innerHTML = cats.map(c => {
    const pct = Math.round((totals[c.id] / totalExp) * 100);
    return `
      <div class="cat-row">
        <div class="cat-dot" style="background:${c.color}"></div>
        <div class="cat-row-name">${c.icon} ${c.label}</div>
        <div class="cat-row-pct">${pct}%</div>
      </div>
    `;
  }).join('');
}

// ─── INIT ───────────────────────────────────────────────
function init() {
  setQuickType('income');
  populateCatSelect('modalCat', 'income');

  document.getElementById('addModal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });
  document.getElementById('budgetModal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeBudgetModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeModal(); closeBudgetModal(); }
  });

  render();
}

init();