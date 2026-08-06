/**
 * Islam Enterprise — Rod & Cement Shop Management System
 * Vanilla JS Single-Page Application logic with Auth, Capital Accounts, Bulk CSV Import/Export & Database Backup/Restore
 */

(function () {
  'use strict';

  // State Management
  const state = {
    user: null,
    token: localStorage.getItem('ie_token') || '',
    currentView: 'dashboard',
    products: [],
    customers: [],
    suppliers: [],
    accounts: [],
    posCart: [],
    posCustomer: null,
    posSaleType: 'retail',
    posDiscount: 0,
    posPaid: 0,
    posAccount: null,
    posNote: '',
  };

  // Helper Utilities
  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => Array.from(parent.querySelectorAll(selector));

  const fmtTk = (amt) => {
    const val = Number(amt) || 0;
    return '৳' + val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const fmtNum = (num) => {
    const val = Number(num) || 0;
    return val.toLocaleString('en-IN');
  };

  const todayStr = () => {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };

  const isAdmin = () => state.user && state.user.role === 'admin';

  // API Client with Auth Header
  async function api(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (state.token) {
      headers['Authorization'] = 'Bearer ' + state.token;
    }

    try {
      const res = await fetch(path, { ...options, headers });
      const data = await res.json();
      if (res.status === 401 && path !== '/api/auth/login') {
        logout();
        throw new Error('Session expired. Please log in.');
      }
      if (!res.ok) throw new Error(data.error || 'API Error');
      return data;
    } catch (err) {
      showToast(err.message, 'error');
      throw err;
    }
  }

  // Database Backup & Restore Modal
  function openBackupRestoreModal() {
    const bodyHtml = '' +
      '<div style="display:flex; flex-direction:column; gap:16px;">' +
        '<div class="card card-body" style="background:#f8fafc; border-left:4px solid var(--primary);">' +
          '<h4 style="margin:0 0 6px 0;">📥 Download Live Database Backup</h4>' +
          '<div style="font-size:13px; color:var(--muted); margin-bottom:10px;">' +
            'Save a complete copy of all shop data, sales, purchases, inventory, ledgers, and accounts into a single backup file (.db).' +
          '</div>' +
          '<button class="btn" id="btn-dl-db-backup">⬇️ Download shop.db Backup</button>' +
        '</div>' +

        '<div class="card card-body" style="background:#fff1f2; border-left:4px solid var(--red);">' +
          '<h4 style="margin:0 0 6px 0; color:var(--red);">📤 Restore Database from Backup File</h4>' +
          '<div style="font-size:13px; color:var(--muted); margin-bottom:10px;">' +
            '⚠️ <strong>Warning:</strong> Restoring a backup file will replace current database records.' +
          '</div>' +

          '<div class="csv-dropzone" id="db-restore-dropzone">' +
            '<div style="font-size:28px; margin-bottom:4px;">💾</div>' +
            '<div><strong>Click to select .db file</strong> or drag &amp; drop file here</div>' +
            '<input type="file" id="db-restore-file" accept=".db" style="display:none;">' +
          '</div>' +
          '<div id="db-restore-status"></div>' +
        '</div>' +
      '</div>';

    const footerHtml = '<button class="btn secondary modal-cancel-btn">Close</button>';

    openModal('💾 Database Backup &amp; Restore', bodyHtml, footerHtml);

    const dlBtn = $('#btn-dl-db-backup');
    if (dlBtn) {
      dlBtn.onclick = () => {
        fetch('/api/system/backup', { headers: { 'Authorization': 'Bearer ' + state.token } })
          .then(res => {
            if (!res.ok) throw new Error('Backup download failed');
            return res.blob();
          })
          .then(blob => {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'islam_enterprise_backup_' + todayStr() + '.db';
            a.click();
            showToast('Database backup downloaded', 'success');
          })
          .catch(e => showToast(e.message, 'error'));
      };
    }

    const dropzone = $('#db-restore-dropzone');
    const fileInp = $('#db-restore-file');
    if (dropzone && fileInp) {
      dropzone.onclick = () => fileInp.click();
      fileInp.onchange = handleFile;
      dropzone.ondragover = (e) => { e.preventDefault(); dropzone.style.borderColor = 'var(--red)'; };
      dropzone.ondragleave = () => { dropzone.style.borderColor = '#cbd5e1'; };
      dropzone.ondrop = (e) => {
        e.preventDefault();
        dropzone.style.borderColor = '#cbd5e1';
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          fileInp.files = e.dataTransfer.files;
          handleFile();
        }
      };

      async function handleFile() {
        const file = fileInp.files[0];
        if (!file) return;

        if (!confirm('⚠️ RESTORE WARNING: This will overwrite all current system data with "' + file.name + '". Are you sure you want to proceed?')) {
          return;
        }

        const statusEl = $('#db-restore-status');
        if (statusEl) statusEl.innerHTML = '<div class="txt-blue">Uploading and restoring database...</div>';

        try {
          const buffer = await file.arrayBuffer();
          const res = await fetch('/api/system/restore', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-sqlite3',
              'Authorization': 'Bearer ' + state.token,
            },
            body: buffer,
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Restore failed');

          showToast('Database restored successfully! Reloading page...', 'success');
          setTimeout(() => window.location.reload(), 1500);
        } catch (e) {
          if (statusEl) statusEl.innerHTML = '<div class="txt-red" style="padding:10px; background:#fee2e2; border-radius:8px;">❌ ' + e.message + '</div>';
          showToast(e.message, 'error');
        }
      }
    }
  }

  // Bulk CSV Export Helper
  function exportCSV(entity) {
    if (!state.token) return showToast('Authentication required', 'error');
    const url = '/api/export/' + entity;
    fetch(url, { headers: { 'Authorization': 'Bearer ' + state.token } })
      .then(res => {
        if (!res.ok) throw new Error('Export failed');
        return res.blob();
      })
      .then(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = entity + '_export_' + todayStr() + '.csv';
        a.click();
        showToast('Exported ' + entity + ' CSV successfully', 'success');
      })
      .catch(e => showToast(e.message, 'error'));
  }

  // Bulk CSV Import Helper & Modal
  function openImportCSVModal(entity, label, onSuccess) {
    const samples = {
      products: 'name,category,brand,size,unit,purchase_price,retail_price,wholesale_price,stock_qty,low_stock_alert\nMS Rod 10mm,rod,BSRM,10mm,kg,87,94,91,500,100\nCement OPC,cement,Shah,50kg bag,bag,480,540,520,100,20',
      customers: 'name,phone,address,type\nRahim Builders,01711000000,Station Road,wholesale\nKarim Store,01811000000,Main Market,retail',
      suppliers: 'name,phone,address\nBSRM Steels Ltd,01900000000,Chattogram\nShah Cement Ltd,01911000000,Dhaka',
      expenses: 'date,category,amount,account_name,note\n2026-08-06,rent,5000,Cash at Shop,Monthly shop rent\n2026-08-06,transport,1200,Cash at Shop,Freight charge',
      sales: 'invoice_no,date,customer_name,customer_phone,sale_type,product_name,qty,unit_price,discount,paid,account_name,note\nINV-90001,2026-08-06,Rahim Builders,01711000000,wholesale,MS Rod 10mm,200,91,0,15000,Cash at Shop,Bulk import sale',
      purchases: 'ref_no,date,supplier_name,supplier_phone,product_name,qty,unit_cost,paid,account_name,note\nPUR-90001,2026-08-06,BSRM Steels Ltd,01900000000,MS Rod 10mm,1000,87,50000,Bank Account,Bulk import purchase',
    };

    const sampleCSV = samples[entity] || '';

    const bodyHtml = '' +
      '<div style="display:flex; flex-direction:column; gap:12px;">' +
        '<div style="font-size:13px; color:var(--muted);">' +
          'Upload a CSV file to bulk import <strong>' + label + '</strong>. All rows will be validated and imported inside a transaction.' +
        '</div>' +

        '<div class="csv-dropzone" id="csv-dropzone">' +
          '<div style="font-size:28px; margin-bottom:4px;">📄</div>' +
          '<div><strong>Click to browse CSV</strong> or drag &amp; drop file here</div>' +
          '<input type="file" id="csv-file-input" accept=".csv" style="display:none;">' +
        '</div>' +

        '<div class="field">' +
          '<label>Or Paste CSV Text Content:</label>' +
          '<textarea id="csv-text-area" rows="5" style="font-family:monospace; font-size:12px;" placeholder="' + sampleCSV.replace(/"/g, '&quot;') + '"></textarea>' +
        '</div>' +

        '<div>' +
          '<label>Sample CSV Header Format:</label>' +
          '<div class="csv-snippet">' + sampleCSV + '</div>' +
        '</div>' +
        '<div id="csv-status-msg"></div>' +
      '</div>';

    const footerHtml = '' +
      '<button class="btn secondary" id="btn-dl-sample">📥 Download Sample CSV</button>' +
      '<button class="btn" id="btn-submit-csv">🚀 Process Import</button>' +
      '<button class="btn secondary modal-cancel-btn">Cancel</button>';

    openModal('Bulk Import ' + label + ' (CSV)', bodyHtml, footerHtml, true);

    const dropzone = $('#csv-dropzone');
    const fileInput = $('#csv-file-input');
    const textArea = $('#csv-text-area');

    if (dropzone && fileInput) {
      dropzone.onclick = () => fileInput.click();
      dropzone.ondragover = (e) => { e.preventDefault(); dropzone.style.borderColor = 'var(--primary)'; };
      dropzone.ondragleave = () => { dropzone.style.borderColor = '#cbd5e1'; };
      dropzone.ondrop = (e) => {
        e.preventDefault();
        dropzone.style.borderColor = '#cbd5e1';
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          fileInput.files = e.dataTransfer.files;
          readFile();
        }
      };
      fileInput.onchange = readFile;

      function readFile() {
        if (!fileInput.files[0]) return;
        const reader = new FileReader();
        reader.onload = (e) => {
          if (textArea) textArea.value = e.target.result;
          showToast('Loaded file: ' + fileInput.files[0].name, 'success');
        };
        reader.readAsText(fileInput.files[0]);
      }
    }

    const dlSampleBtn = $('#btn-dl-sample');
    if (dlSampleBtn) {
      dlSampleBtn.onclick = () => {
        const blob = new Blob([sampleCSV], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = entity + '_sample_template.csv';
        a.click();
      };
    }

    const submitCsvBtn = $('#btn-submit-csv');
    if (submitCsvBtn) {
      submitCsvBtn.onclick = async () => {
        const text = textArea ? textArea.value.trim() : '';
        if (!text) return showToast('Please select a file or paste CSV content', 'error');

        const statusMsg = $('#csv-status-msg');
        if (statusMsg) statusMsg.innerHTML = '<div class="txt-blue">Processing transaction import...</div>';

        try {
          const res = await fetch('/api/import/' + entity, {
            method: 'POST',
            headers: {
              'Content-Type': 'text/csv',
              'Authorization': 'Bearer ' + state.token,
            },
            body: text,
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Import failed');

          showToast(data.message || 'Import successful', 'success');
          closeModal();
          if (onSuccess) onSuccess();
        } catch (err) {
          if (statusMsg) statusMsg.innerHTML = '<div class="txt-red" style="padding:10px; background:#fee2e2; border-radius:8px;">❌ <strong>Import Rolled Back:</strong> ' + err.message + '</div>';
          showToast('Import aborted: ' + err.message, 'error');
        }
      };
    }
  }

  // Toast Notification
  function showToast(msg, type = 'info') {
    const wrap = $('#toast-wrap') || document.body;
    const toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.textContent = msg;
    wrap.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // Modal Dialog System
  function openModal(title, bodyHtml, footerHtml = '', isWide = false) {
    const modalBackdrop = $('#modal-backdrop');
    const modal = $('#modal');
    if (!modalBackdrop || !modal) return;
    modal.className = 'modal ' + (isWide ? 'wide' : '');
    modal.innerHTML =
      '<div class="modal-head">' +
        '<div>' + title + '</div>' +
        '<button class="modal-close" id="btn-modal-close">&times;</button>' +
      '</div>' +
      '<div class="modal-body">' + bodyHtml + '</div>' +
      (footerHtml ? '<div class="modal-foot">' + footerHtml + '</div>' : '');

    modalBackdrop.hidden = false;
    modalBackdrop.removeAttribute('hidden');
    modalBackdrop.classList.add('active');

    $$('.modal-close, .modal-cancel-btn', modal).forEach(btn => {
      btn.onclick = closeModal;
    });
  }

  function closeModal() {
    const modalBackdrop = $('#modal-backdrop');
    if (modalBackdrop) {
      modalBackdrop.hidden = true;
      modalBackdrop.setAttribute('hidden', '');
      modalBackdrop.classList.remove('active');
    }
    const modal = $('#modal');
    if (modal) modal.innerHTML = '';
  }

  // Live Clock in Sidebar
  function initClock() {
    const clockEl = $('#clock');
    if (!clockEl) return;
    const update = () => {
      const now = new Date();
      clockEl.innerHTML = '<div>🕒 ' + now.toLocaleTimeString() + '</div><div style="font-size:10px;margin-top:2px;">' + now.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) + '</div>';
    };
    update();
    setInterval(update, 1000);
  }

  // Auth & Topbar User Handler
  function renderUserTopbar() {
    const topbarUser = $('#user-info-bar');
    if (!topbarUser) return;
    if (!state.user) {
      topbarUser.innerHTML = '';
      return;
    }
    const roleBadge = state.user.role === 'admin'
      ? '<span class="role-badge admin">Admin</span>'
      : '<span class="role-badge sales_manager">Sales Manager</span>';

    const backupBtn = isAdmin()
      ? '<button class="btn sm secondary" id="btn-topbar-backup" style="margin-left: 6px;">💾 Backup &amp; Restore</button>'
      : '';

    topbarUser.innerHTML =
      '<span>👤 <strong>' + state.user.name + '</strong> ' + roleBadge + '</span>' +
      backupBtn +
      '<button class="btn sm secondary" id="btn-logout" style="margin-left: 6px;">Sign Out</button>';

    const logoutBtn = $('#btn-logout');
    if (logoutBtn) logoutBtn.onclick = logout;

    const backupTopBtn = $('#btn-topbar-backup');
    if (backupTopBtn) backupTopBtn.onclick = openBackupRestoreModal;
  }

  function showLoginScreen() {
    const backdrop = $('#login-backdrop');
    if (backdrop) {
      backdrop.hidden = false;
      backdrop.removeAttribute('hidden');
    }
  }

  function hideLoginScreen() {
    const backdrop = $('#login-backdrop');
    if (backdrop) {
      backdrop.hidden = true;
      backdrop.setAttribute('hidden', '');
    }
  }

  async function checkAuth() {
    if (!state.token) {
      showLoginScreen();
      return false;
    }
    try {
      const data = await api('/api/auth/me');
      state.user = data.user;
      hideLoginScreen();
      renderUserTopbar();
      return true;
    } catch (e) {
      logout();
      return false;
    }
  }

  function logout() {
    if (state.token) {
      api('/api/auth/logout', { method: 'POST' }).catch(() => {});
    }
    state.token = '';
    state.user = null;
    localStorage.removeItem('ie_token');
    renderUserTopbar();
    showLoginScreen();
  }

  // Router & Navigation
  function initRouter() {
    const nav = $('#nav');
    if (!nav) return;
    nav.addEventListener('click', (e) => {
      const btn = e.target.closest('.nav-btn');
      if (!btn) return;
      const view = btn.dataset.view;
      if (view) switchView(view);
    });

    const loginForm = $('#login-form');
    if (loginForm) {
      loginForm.onsubmit = async (e) => {
        e.preventDefault();
        const username = $('#login-username').value.trim();
        const password = $('#login-password').value;
        try {
          const res = await api('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
          });
          state.token = res.token;
          state.user = res.user;
          localStorage.setItem('ie_token', res.token);
          hideLoginScreen();
          renderUserTopbar();
          showToast('Welcome back, ' + res.user.name + '!', 'success');
          switchView('dashboard');
        } catch (err) {
          // Toast handled by api()
        }
      };
    }
  }

  function switchView(viewName, params = {}) {
    if (!state.user) {
      showLoginScreen();
      return;
    }
    state.currentView = viewName;
    $$('.nav-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.view === viewName);
    });
    renderView(viewName, params);
  }

  async function renderView(viewName, params = {}) {
    const main = $('#main');
    if (!main) return;
    main.innerHTML = '<div class="empty">Loading...</div>';

    try {
      switch (viewName) {
        case 'dashboard':
          await renderDashboard(main);
          break;
        case 'pos':
          await renderPOS(main);
          break;
        case 'sales':
          await renderSales(main);
          break;
        case 'purchases':
          await renderPurchases(main);
          break;
        case 'products':
          await renderProducts(main);
          break;
        case 'customers':
          await renderCustomers(main);
          break;
        case 'suppliers':
          await renderSuppliers(main);
          break;
        case 'expenses':
          await renderExpenses(main);
          break;
        case 'accounts':
          await renderAccounts(main);
          break;
        case 'reports':
          await renderReports(main);
          break;
        default:
          main.innerHTML = '<div class="empty">View not found</div>';
      }
    } catch (err) {
      main.innerHTML = '<div class="card card-body txt-red">Error loading view: ' + err.message + '</div>';
    }
  }

  // ==========================================
  // 1. DASHBOARD VIEW
  // ==========================================
  async function renderDashboard(container) {
    const data = await api('/api/dashboard');

    container.innerHTML =
      '<div class="page-head">' +
        '<div>' +
          '<div class="page-title">Dashboard</div>' +
          '<div class="page-sub">Overview of Today (' + data.date + ')</div>' +
        '</div>' +
        '<div class="toolbar">' +
          '<button class="btn" id="btn-quick-sale">🧾 New Sale</button>' +
          '<button class="btn secondary" id="btn-quick-purchase">🚚 New Purchase</button>' +
          '<button class="btn secondary" id="btn-quick-payment">💳 Add Payment</button>' +
          '<button class="btn secondary" id="btn-quick-expense">💸 Add Expense</button>' +
        '</div>' +
      '</div>' +

      '<div class="stat-grid">' +
        '<div class="stat blue">' +
          '<div class="label">Today Sales</div>' +
          '<div class="value">' + fmtTk(data.today.sales_total) + '</div>' +
          '<div class="sub">' + data.today.sales_count + ' invoice(s) | Paid: ' + fmtTk(data.today.sales_paid) + '</div>' +
        '</div>' +
        '<div class="stat green">' +
          '<div class="label">Today Collections</div>' +
          '<div class="value">' + fmtTk(data.today.collections) + '</div>' +
          '<div class="sub">Due payments collected today</div>' +
        '</div>' +
        '<div class="stat red">' +
          '<div class="label">Today Expenses</div>' +
          '<div class="value">' + fmtTk(data.today.expenses) + '</div>' +
          '<div class="sub">Operating expenses</div>' +
        '</div>' +
        '<div class="stat blue">' +
          '<div class="label">Net Cash In / Out</div>' +
          '<div class="value" style="font-size:18px;">+' + fmtTk(data.today.cash_in) + ' / -' + fmtTk(data.today.cash_out) + '</div>' +
          '<div class="sub">Net Flow: ' + fmtTk(data.today.cash_in - data.today.cash_out) + '</div>' +
        '</div>' +
      '</div>' +

      '<div class="stat-grid">' +
        '<div class="stat amber">' +
          '<div class="label">Total Customer Due</div>' +
          '<div class="value">' + fmtTk(data.customer_due_total) + '</div>' +
          '<div class="sub">Receivables from customers</div>' +
        '</div>' +
        '<div class="stat red">' +
          '<div class="label">Total Supplier Due</div>' +
          '<div class="value">' + fmtTk(data.supplier_due_total) + '</div>' +
          '<div class="sub">Payables to suppliers</div>' +
        '</div>' +
        '<div class="stat green">' +
          '<div class="label">Total Capital Balance</div>' +
          '<div class="value">' + fmtTk(data.total_capital) + '</div>' +
          '<div class="sub">Across all cash & bank accounts</div>' +
        '</div>' +
        '<div class="stat blue">' +
          '<div class="label">Stock Valuation</div>' +
          '<div class="value">' + fmtTk(data.stock_value) + '</div>' +
          '<div class="sub">Inventory at purchase cost</div>' +
        '</div>' +
      '</div>' +

      '<div class="grid-2">' +
        '<div class="card">' +
          '<div class="card-head">' +
            '<span>⚠️ Low Stock Alerts (' + data.low_stock.length + ')</span>' +
            '<button class="btn sm secondary" id="btn-manage-stock">Manage Stock</button>' +
          '</div>' +
          '<div class="card-body flush">' +
            (data.low_stock.length === 0 ? '<div class="empty">All inventory levels healthy 👍</div>' :
              '<table><thead><tr><th>Product</th><th>Category</th><th class="num">Current Stock</th><th class="num">Alert Threshold</th></tr></thead><tbody>' +
                data.low_stock.map(p =>
                  '<tr>' +
                    '<td><strong>' + p.name + '</strong> ' + (p.brand ? '(' + p.brand + ')' : '') + ' ' + (p.size || '') + '</td>' +
                    '<td><span class="pill gray">' + p.category + '</span></td>' +
                    '<td class="num txt-red"><strong>' + fmtNum(p.stock_qty) + ' ' + p.unit + '</strong></td>' +
                    '<td class="num txt-muted">' + fmtNum(p.low_stock_alert) + ' ' + p.unit + '</td>' +
                  '</tr>'
                ).join('') +
              '</tbody></table>'
            ) +
          '</div>' +
        '</div>' +

        '<div class="card">' +
          '<div class="card-head">' +
            '<span>📑 Recent Sales</span>' +
            '<button class="btn sm secondary" id="btn-all-sales">View All Sales</button>' +
          '</div>' +
          '<div class="card-body flush">' +
            (data.recent_sales.length === 0 ? '<div class="empty">No sales recorded yet</div>' :
              '<table><thead><tr><th>Invoice</th><th>Customer</th><th class="num">Total</th><th class="num">Due</th><th>Action</th></tr></thead><tbody>' +
                data.recent_sales.map(s =>
                  '<tr>' +
                    '<td><strong>' + s.invoice_no + '</strong></td>' +
                    '<td>' + s.customer_name + '</td>' +
                    '<td class="num">' + fmtTk(s.total) + '</td>' +
                    '<td class="num ' + (s.due > 0 ? 'txt-red' : 'txt-green') + '">' + (s.due > 0 ? fmtTk(s.due) : 'Paid') + '</td>' +
                    '<td><button class="btn sm secondary btn-view-sale" data-id="' + s.id + '">View</button></td>' +
                  '</tr>'
                ).join('') +
              '</tbody></table>'
            ) +
          '</div>' +
        '</div>' +
      '</div>';

    const quickSale = $('#btn-quick-sale');
    if (quickSale) quickSale.onclick = () => switchView('pos');

    const quickPurchase = $('#btn-quick-purchase');
    if (quickPurchase) quickPurchase.onclick = () => switchView('purchases');

    const quickPayment = $('#btn-quick-payment');
    if (quickPayment) quickPayment.onclick = () => openGlobalPaymentModal();

    const quickExpense = $('#btn-quick-expense');
    if (quickExpense) quickExpense.onclick = () => openAddExpenseModal();

    const manageStock = $('#btn-manage-stock');
    if (manageStock) manageStock.onclick = () => switchView('products');

    const allSales = $('#btn-all-sales');
    if (allSales) allSales.onclick = () => switchView('sales');

    $$('.btn-view-sale').forEach(b => {
      b.onclick = () => viewSaleModal(b.dataset.id);
    });
  }

  // ==========================================
  // 2. POS / NEW SALE VIEW
  // ==========================================
  async function renderPOS(container) {
    const [products, customers, accounts] = await Promise.all([
      api('/api/products'),
      api('/api/customers'),
      api('/api/accounts'),
    ]);
    state.products = products;
    state.customers = customers;
    state.accounts = accounts;

    container.innerHTML =
      '<div class="page-head">' +
        '<div>' +
          '<div class="page-title">New Sale (POS)</div>' +
          '<div class="page-sub">Create retail or wholesale invoice</div>' +
        '</div>' +
        '<div class="toolbar">' +
          '<button class="btn secondary" id="btn-pos-reset">↺ Clear Form</button>' +
        '</div>' +
      '</div>' +

      '<div class="pos-grid">' +
        '<div>' +
          '<div class="card card-body">' +
            '<div class="form-row" style="align-items: flex-end;">' +
              '<div class="field" style="flex: 2;">' +
                '<label>Select Product to Add</label>' +
                '<select id="pos-product-select">' +
                  '<option value="">-- Choose Product --</option>' +
                  products.map(p =>
                    '<option value="' + p.id + '" ' + (p.stock_qty <= 0 ? 'disabled' : '') + '>' +
                      p.name + ' ' + (p.brand ? '[' + p.brand + ']' : '') + ' ' + (p.size ? '(' + p.size + ')' : '') + ' — Stock: ' + p.stock_qty + ' ' + p.unit + ' | Retail: ৳' + p.retail_price + ' | Wholesale: ৳' + p.wholesale_price +
                    '</option>'
                  ).join('') +
                '</select>' +
              '</div>' +
              '<div class="field" style="flex: 1;">' +
                '<label>Qty</label>' +
                '<input type="number" id="pos-add-qty" min="0.01" step="any" value="1">' +
              '</div>' +
              '<div class="field">' +
                '<button class="btn" id="btn-pos-add-item">+ Add Item</button>' +
              '</div>' +
            '</div>' +
          '</div>' +

          '<div class="card">' +
            '<div class="card-head">Sale Items</div>' +
            '<div class="card-body flush">' +
              '<table class="pos-items">' +
                '<thead>' +
                  '<tr>' +
                    '<th>Product</th>' +
                    '<th style="width: 100px;">Qty</th>' +
                    '<th style="width: 70px;">Unit</th>' +
                    '<th style="width: 120px;" class="num">Unit Price (৳)</th>' +
                    '<th style="width: 120px;" class="num">Line Total</th>' +
                    '<th style="width: 50px;"></th>' +
                  '</tr>' +
                '</thead>' +
                '<tbody id="pos-cart-tbody"></tbody>' +
              '</table>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div>' +
          '<div class="card card-body">' +
            '<div class="field">' +
              '<label>Sale Type</label>' +
              '<select id="pos-sale-type">' +
                '<option value="retail" ' + (state.posSaleType === 'retail' ? 'selected' : '') + '>Retail Sale</option>' +
                '<option value="wholesale" ' + (state.posSaleType === 'wholesale' ? 'selected' : '') + '>Wholesale</option>' +
              '</select>' +
            '</div>' +

            '<div class="field">' +
              '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">' +
                '<label style="margin:0;">Customer</label>' +
                '<button class="btn sm secondary" id="btn-pos-add-customer">+ New</button>' +
              '</div>' +
              '<select id="pos-customer-select">' +
                '<option value="">Walk-in Customer (Cash only)</option>' +
                customers.map(c =>
                  '<option value="' + c.id + '" ' + (state.posCustomer && state.posCustomer.id === c.id ? 'selected' : '') + '>' +
                    c.name + ' (' + c.type + ') ' + (c.phone ? '— ' + c.phone : '') + ' | Due: ৳' + c.balance +
                  '</option>'
                ).join('') +
              '</select>' +
            '</div>' +

            '<div class="field">' +
              '<label>Deposit Payment To Account</label>' +
              '<select id="pos-account-select">' +
                accounts.map(a => '<option value="' + a.id + '">' + a.name + ' (' + a.type + ') — Bal: ৳' + a.current_balance + '</option>').join('') +
              '</select>' +
            '</div>' +

            '<hr style="border:0; border-top:1px solid var(--border); margin:14px 0;">' +

            '<div class="pos-total-row"><span>Subtotal:</span><strong id="pos-subtotal-val">৳0.00</strong></div>' +

            '<div class="field" style="margin-top: 8px;">' +
              '<label>Discount (৳)</label>' +
              '<input type="number" id="pos-discount" min="0" step="any" value="' + state.posDiscount + '">' +
            '</div>' +

            '<div class="pos-total-row grand"><span>Grand Total:</span><span id="pos-total-val" class="txt-blue">৳0.00</span></div>' +

            '<div class="field" style="margin-top: 10px;">' +
              '<label>Amount Paid (৳)</label>' +
              '<input type="number" id="pos-paid" min="0" step="any" value="' + state.posPaid + '">' +
            '</div>' +

            '<div class="pos-total-row" style="margin-top: 6px;"><span>Due Balance:</span><span id="pos-due-val" class="pos-due">৳0.00</span></div>' +

            '<div class="field" style="margin-top: 10px;">' +
              '<label>Note / Remarks</label>' +
              '<input type="text" id="pos-note" placeholder="Optional invoice note" value="' + state.posNote + '">' +
            '</div>' +

            '<button class="btn lg" id="btn-pos-submit" style="width:100%; margin-top:14px;">✅ Complete &amp; Print Invoice</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    function updatePOSCartUI() {
      const tbody = $('#pos-cart-tbody');
      if (!tbody) return;

      if (state.posCart.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty">No items added to cart yet. Select a product above.</td></tr>';
      } else {
        tbody.innerHTML = state.posCart.map((item, idx) =>
          '<tr>' +
            '<td><strong>' + item.name + '</strong><div class="txt-muted" style="font-size:11px;">' + (item.brand ? item.brand + ' ' : '') + (item.size || '') + '</div></td>' +
            '<td><input type="number" min="0.01" step="any" class="pos-cart-qty" data-idx="' + idx + '" value="' + item.qty + '"></td>' +
            '<td><span class="txt-muted">' + item.unit + '</span></td>' +
            '<td class="num"><input type="number" min="0" step="any" class="pos-cart-price num" data-idx="' + idx + '" value="' + item.unit_price + '"></td>' +
            '<td class="num"><strong>' + fmtTk(item.qty * item.unit_price) + '</strong></td>' +
            '<td><button class="btn sm danger btn-pos-remove" data-idx="' + idx + '">&times;</button></td>' +
          '</tr>'
        ).join('');
      }

      let subtotal = 0;
      state.posCart.forEach(it => { subtotal += (it.qty * it.unit_price); });
      subtotal = Math.round(subtotal * 100) / 100;

      const discountInp = $('#pos-discount');
      const discount = Math.min(Number(discountInp ? discountInp.value : 0) || 0, subtotal);
      const total = Math.round((subtotal - discount) * 100) / 100;

      const paidInp = $('#pos-paid');
      let paid = Number(paidInp ? paidInp.value : 0) || 0;
      const due = Math.max(0, Math.round((total - paid) * 100) / 100);

      const subEl = $('#pos-subtotal-val');
      if (subEl) subEl.textContent = fmtTk(subtotal);

      const totEl = $('#pos-total-val');
      if (totEl) totEl.textContent = fmtTk(total);

      const dueEl = $('#pos-due-val');
      if (dueEl) {
        dueEl.textContent = fmtTk(due);
        dueEl.className = 'pos-due ' + (due > 0 ? 'txt-red' : 'txt-green');
      }

      $$('.pos-cart-qty').forEach(inp => {
        inp.onchange = (e) => {
          const idx = Number(e.target.dataset.idx);
          const newQty = Math.max(0.01, Number(e.target.value) || 1);
          state.posCart[idx].qty = newQty;
          updatePOSCartUI();
        };
      });
      $$('.pos-cart-price').forEach(inp => {
        inp.onchange = (e) => {
          const idx = Number(e.target.dataset.idx);
          const newPrice = Math.max(0, Number(e.target.value) || 0);
          state.posCart[idx].unit_price = newPrice;
          updatePOSCartUI();
        };
      });
      $$('.btn-pos-remove').forEach(btn => {
        btn.onclick = () => {
          const idx = Number(btn.dataset.idx);
          state.posCart.splice(idx, 1);
          updatePOSCartUI();
        };
      });
    }

    const addItemBtn = $('#btn-pos-add-item');
    if (addItemBtn) {
      addItemBtn.onclick = () => {
        const prodId = Number($('#pos-product-select').value);
        if (!prodId) return showToast('Please select a product', 'error');
        const prod = state.products.find(p => p.id === prodId);
        if (!prod) return;

        const qty = Number($('#pos-add-qty').value) || 1;
        if (qty <= 0) return showToast('Quantity must be greater than 0', 'error');

        const price = state.posSaleType === 'wholesale' ? prod.wholesale_price : prod.retail_price;
        const existing = state.posCart.find(it => it.product_id === prod.id);
        if (existing) {
          existing.qty += qty;
        } else {
          state.posCart.push({
            product_id: prod.id,
            name: prod.name,
            brand: prod.brand,
            size: prod.size,
            unit: prod.unit,
            qty,
            unit_price: price,
          });
        }
        updatePOSCartUI();
        $('#pos-product-select').value = '';
      };
    }

    const saleTypeSel = $('#pos-sale-type');
    if (saleTypeSel) {
      saleTypeSel.onchange = (e) => {
        state.posSaleType = e.target.value;
        state.posCart.forEach(it => {
          const prod = state.products.find(p => p.id === it.product_id);
          if (prod) {
            it.unit_price = state.posSaleType === 'wholesale' ? prod.wholesale_price : prod.retail_price;
          }
        });
        updatePOSCartUI();
      };
    }

    const custSel = $('#pos-customer-select');
    if (custSel) {
      custSel.onchange = (e) => {
        const id = Number(e.target.value);
        const cust = state.customers.find(c => c.id === id);
        state.posCustomer = cust || null;
        if (cust && cust.type === 'wholesale') {
          if ($('#pos-sale-type')) $('#pos-sale-type').value = 'wholesale';
          state.posSaleType = 'wholesale';
          state.posCart.forEach(it => {
            const prod = state.products.find(p => p.id === it.product_id);
            if (prod) it.unit_price = prod.wholesale_price;
          });
        }
        updatePOSCartUI();
      };
    }

    const addCustBtn = $('#btn-pos-add-customer');
    if (addCustBtn) {
      addCustBtn.onclick = () => {
        openAddCustomerModal(async (newCust) => {
          const freshCusts = await api('/api/customers');
          state.customers = freshCusts;
          state.posCustomer = newCust;
          renderPOS(container);
        });
      };
    }

    const discInp = $('#pos-discount');
    if (discInp) discInp.oninput = updatePOSCartUI;

    const paidInp = $('#pos-paid');
    if (paidInp) paidInp.oninput = updatePOSCartUI;

    const resetBtn = $('#btn-pos-reset');
    if (resetBtn) {
      resetBtn.onclick = () => {
        state.posCart = [];
        state.posCustomer = null;
        state.posDiscount = 0;
        state.posPaid = 0;
        state.posNote = '';
        renderPOS(container);
      };
    }

    const submitBtn = $('#btn-pos-submit');
    if (submitBtn) {
      submitBtn.onclick = async () => {
        if (state.posCart.length === 0) return showToast('Cart is empty. Add products to sell.', 'error');

        let subtotal = 0;
        state.posCart.forEach(it => { subtotal += (it.qty * it.unit_price); });
        subtotal = Math.round(subtotal * 100) / 100;
        const discount = Math.min(Number($('#pos-discount').value) || 0, subtotal);
        const total = Math.round((subtotal - discount) * 100) / 100;
        const paid = Number($('#pos-paid').value) || 0;
        const due = Math.max(0, Math.round((total - paid) * 100) / 100);

        const custId = $('#pos-customer-select').value ? Number($('#pos-customer-select').value) : null;
        const custObj = state.customers.find(c => c.id === custId);

        if (due > 0.009 && !custId) {
          return showToast('Due sales require selecting a registered customer.', 'error');
        }

        const account_id = $('#pos-account-select') ? Number($('#pos-account-select').value) : null;

        const payload = {
          customer_id: custId,
          customer_name: custObj ? custObj.name : 'Walk-in',
          sale_type: state.posSaleType,
          date: todayStr(),
          discount,
          paid,
          account_id,
          note: $('#pos-note').value,
          items: state.posCart.map(it => ({
            product_id: it.product_id,
            qty: it.qty,
            unit_price: it.unit_price,
          })),
        };

        try {
          const sale = await api('/api/sales', { method: 'POST', body: JSON.stringify(payload) });
          showToast('Invoice ' + sale.invoice_no + ' created successfully!', 'success');
          state.posCart = [];
          state.posCustomer = null;
          state.posDiscount = 0;
          state.posPaid = 0;
          state.posNote = '';

          printInvoice(sale);
          renderPOS(container);
        } catch (err) {
          // Error toast shown by api wrapper
        }
      };
    }

    updatePOSCartUI();
  }

  // ==========================================
  // 3. SALES HISTORY VIEW
  // ==========================================
  async function renderSales(container) {
    let sales = await api('/api/sales');

    const renderTable = (list) =>
      '<div class="card">' +
        '<div class="card-body flush">' +
          (list.length === 0 ? '<div class="empty">No sales records found</div>' :
            '<table><thead><tr><th>Date</th><th>Invoice No</th><th>Customer</th><th>Type</th><th class="num">Total</th><th class="num">Paid</th><th class="num">Due</th><th>Status</th><th>Actions</th></tr></thead><tbody>' +
              list.map(s => {
                const statusPill = s.due <= 0
                  ? '<span class="pill green">Paid</span>'
                  : s.paid > 0
                  ? '<span class="pill amber">Partial</span>'
                  : '<span class="pill red">Due</span>';
                return '<tr>' +
                  '<td>' + s.date + '</td>' +
                  '<td><strong>' + s.invoice_no + '</strong></td>' +
                  '<td>' + s.customer_name + '</td>' +
                  '<td><span class="pill gray">' + s.sale_type + '</span></td>' +
                  '<td class="num">' + fmtTk(s.total) + '</td>' +
                  '<td class="num">' + fmtTk(s.paid) + '</td>' +
                  '<td class="num ' + (s.due > 0 ? 'txt-red' : 'txt-green') + '">' + fmtTk(s.due) + '</td>' +
                  '<td>' + statusPill + '</td>' +
                  '<td>' +
                    '<button class="btn sm secondary btn-view-sale" data-id="' + s.id + '">View / Print</button> ' +
                    (isAdmin() ? '<button class="btn sm danger btn-delete-sale" data-id="' + s.id + '" data-inv="' + s.invoice_no + '">Delete</button>' : '') +
                  '</td>' +
                '</tr>';
              }).join('') +
            '</tbody></table>'
          ) +
        '</div>' +
      '</div>';

    container.innerHTML =
      '<div class="page-head">' +
        '<div><div class="page-title">Sales Invoices</div><div class="page-sub">View and print past sales invoices</div></div>' +
        '<div class="toolbar">' +
          '<input type="search" id="sales-search" placeholder="Search invoice or customer...">' +
          '<input type="date" id="sales-from"><span>to</span><input type="date" id="sales-to">' +
          '<button class="btn secondary" id="btn-sales-filter">Filter</button>' +
          '<button class="btn secondary" id="btn-export-sales">📥 Export CSV</button>' +
          (isAdmin() ? '<button class="btn secondary" id="btn-import-sales">📤 Import CSV</button>' : '') +
          '<button class="btn" id="btn-new-sale">+ New Sale</button>' +
        '</div>' +
      '</div>' +
      '<div id="sales-list-container">' + renderTable(sales) + '</div>';

    const filterSales = async () => {
      const search = $('#sales-search') ? $('#sales-search').value.toLowerCase().trim() : '';
      const from = $('#sales-from') ? $('#sales-from').value : '';
      const to = $('#sales-to') ? $('#sales-to').value : '';

      let query = [];
      if (from) query.push('from=' + from);
      if (to) query.push('to=' + to);
      if (search) query.push('search=' + encodeURIComponent(search));

      const url = '/api/sales' + (query.length ? '?' + query.join('&') : '');
      sales = await api(url);
      const listWrap = $('#sales-list-container');
      if (listWrap) listWrap.innerHTML = renderTable(sales);
      bindSalesActions();
    };

    function bindSalesActions() {
      $$('.btn-view-sale').forEach(b => {
        b.onclick = () => viewSaleModal(b.dataset.id);
      });
      $$('.btn-delete-sale').forEach(b => {
        b.onclick = async () => {
          if (confirm('Are you sure you want to delete invoice ' + b.dataset.inv + '? Inventory will be restored.')) {
            await api('/api/sales/' + b.dataset.id, { method: 'DELETE' });
            showToast('Invoice deleted and stock restored.', 'success');
            filterSales();
          }
        };
      });
    }

    const filterBtn = $('#btn-sales-filter');
    if (filterBtn) filterBtn.onclick = filterSales;

    const expBtn = $('#btn-export-sales');
    if (expBtn) expBtn.onclick = () => exportCSV('sales');

    const impBtn = $('#btn-import-sales');
    if (impBtn) impBtn.onclick = () => openImportCSVModal('sales', 'Sales Invoices', filterSales);

    const searchInp = $('#sales-search');
    if (searchInp) searchInp.onkeyup = (e) => { if (e.key === 'Enter') filterSales(); };

    const newSaleBtn = $('#btn-new-sale');
    if (newSaleBtn) newSaleBtn.onclick = () => switchView('pos');

    bindSalesActions();
  }

  // View / Print Sale Modal
  async function viewSaleModal(saleId) {
    const sale = await api('/api/sales/' + saleId);

    const bodyHtml =
      '<div style="font-size: 13px;">' +
        '<div style="display:flex; justify-content:space-between; margin-bottom:12px;">' +
          '<div><strong>Invoice:</strong> ' + sale.invoice_no + '<br><strong>Customer:</strong> ' + sale.customer_name + '<br><strong>Sale Type:</strong> ' + sale.sale_type + '</div>' +
          '<div style="text-align:right;"><strong>Date:</strong> ' + sale.date + '<br><strong>Status:</strong> ' + (sale.total - sale.paid <= 0 ? 'Paid' : 'Due: ' + fmtTk(sale.total - sale.paid)) + '</div>' +
        '</div>' +

        '<table><thead><tr><th>Item</th><th class="num">Qty</th><th>Unit</th><th class="num">Unit Price</th><th class="num">Line Total</th></tr></thead><tbody>' +
          sale.items.map(it =>
            '<tr><td>' + it.product_name + '</td><td class="num">' + fmtNum(it.qty) + '</td><td>' + it.unit + '</td><td class="num">' + fmtTk(it.unit_price) + '</td><td class="num"><strong>' + fmtTk(it.line_total) + '</strong></td></tr>'
          ).join('') +
        '</tbody></table>' +

        '<div style="margin-top: 14px; text-align: right; line-height: 1.6;">' +
          '<div>Subtotal: ' + fmtTk(sale.subtotal) + '</div>' +
          (sale.discount > 0 ? '<div>Discount: -' + fmtTk(sale.discount) + '</div>' : '') +
          '<div><strong>Grand Total: ' + fmtTk(sale.total) + '</strong></div>' +
          '<div>Paid: ' + fmtTk(sale.paid) + '</div>' +
          '<div style="font-size:15px; font-weight:bold; margin-top:4px;" class="' + (sale.total - sale.paid > 0 ? 'txt-red' : 'txt-green') + '">Balance Due: ' + fmtTk(sale.total - sale.paid) + '</div>' +
        '</div>' +
        (sale.note ? '<div style="margin-top:10px;" class="txt-muted">Note: ' + sale.note + '</div>' : '') +
      '</div>';

    const footerHtml =
      '<button class="btn secondary" id="btn-print-inv">🖨️ Print Invoice</button>' +
      '<button class="btn secondary modal-cancel-btn">Close</button>';

    openModal('Invoice ' + sale.invoice_no, bodyHtml, footerHtml, true);
    const printBtn = $('#btn-print-inv');
    if (printBtn) printBtn.onclick = () => printInvoice(sale);
  }

  function printInvoice(sale) {
    const printArea = $('#print-area');
    if (!printArea) return;
    printArea.innerHTML =
      '<div class="invoice">' +
        '<div class="invoice-head">' +
          '<div>' +
            '<h1>ISLAM ENTERPRISE</h1>' +
            '<div>A Trustable Rod &amp; Cement Supplier (Retail &amp; Wholesale)</div>' +
            '<div>Phone: 01700-000000 | Address: Main Road, Shop #12</div>' +
          '</div>' +
          '<div style="text-align:right;">' +
            '<h2>INVOICE</h2>' +
            '<div><strong>Inv No:</strong> ' + sale.invoice_no + '</div>' +
            '<div><strong>Date:</strong> ' + sale.date + '</div>' +
          '</div>' +
        '</div>' +

        '<div style="margin-bottom: 14px;"><strong>Bill To:</strong> ' + sale.customer_name + '<br><strong>Type:</strong> ' + sale.sale_type.toUpperCase() + '</div>' +

        '<table><thead><tr><th>#</th><th>Description</th><th>Qty</th><th>Unit</th><th>Rate (৳)</th><th>Amount (৳)</th></tr></thead><tbody>' +
          sale.items.map((it, i) =>
            '<tr><td>' + (i + 1) + '</td><td>' + it.product_name + '</td><td style="text-align:right;">' + fmtNum(it.qty) + '</td><td>' + it.unit + '</td><td style="text-align:right;">' + fmtNum(it.unit_price) + '</td><td style="text-align:right;">' + fmtNum(it.line_total) + '</td></tr>'
          ).join('') +
        '</tbody></table>' +

        '<table class="totals">' +
          '<tr><td>Subtotal:</td><td style="text-align:right;">' + fmtTk(sale.subtotal) + '</td></tr>' +
          (sale.discount > 0 ? '<tr><td>Discount:</td><td style="text-align:right;">-' + fmtTk(sale.discount) + '</td></tr>' : '') +
          '<tr><td><strong>Grand Total:</strong></td><td style="text-align:right;"><strong>' + fmtTk(sale.total) + '</strong></td></tr>' +
          '<tr><td>Paid Amount:</td><td style="text-align:right;">' + fmtTk(sale.paid) + '</td></tr>' +
          '<tr><td><strong>Balance Due:</strong></td><td style="text-align:right;"><strong>' + fmtTk(sale.total - sale.paid) + '</strong></td></tr>' +
        '</table>' +

        (sale.note ? '<div style="margin-top:10px; font-style:italic;">Note: ' + sale.note + '</div>' : '') +

        '<div class="sign"><div>Customer Signature</div><div>Authorized Signature</div></div>' +
      '</div>';
    window.print();
  }

  // ==========================================
  // 4. PURCHASES VIEW
  // ==========================================
  async function renderPurchases(container) {
    let purchases = await api('/api/purchases');

    const renderTable = (list) =>
      '<div class="card">' +
        '<div class="card-body flush">' +
          (list.length === 0 ? '<div class="empty">No purchase records found</div>' :
            '<table><thead><tr><th>Date</th><th>Ref No</th><th>Supplier</th><th class="num">Total Cost</th><th class="num">Paid</th><th class="num">Due</th><th>Actions</th></tr></thead><tbody>' +
              list.map(pu =>
                '<tr>' +
                  '<td>' + pu.date + '</td>' +
                  '<td><strong>' + (pu.ref_no || ('PUR-' + pu.id)) + '</strong></td>' +
                  '<td>' + (pu.supplier_name || 'N/A') + '</td>' +
                  '<td class="num">' + fmtTk(pu.total) + '</td>' +
                  '<td class="num">' + fmtTk(pu.paid) + '</td>' +
                  '<td class="num ' + (pu.due > 0 ? 'txt-red' : 'txt-green') + '">' + fmtTk(pu.due) + '</td>' +
                  '<td>' +
                    '<button class="btn sm secondary btn-view-purchase" data-id="' + pu.id + '">Details</button> ' +
                    (isAdmin() ? '<button class="btn sm danger btn-delete-purchase" data-id="' + pu.id + '">Delete</button>' : '') +
                  '</td>' +
                '</tr>'
              ).join('') +
            '</tbody></table>'
          ) +
        '</div>' +
      '</div>';

    container.innerHTML =
      '<div class="page-head">' +
        '<div><div class="page-title">Purchases &amp; Stock In</div><div class="page-sub">Record incoming inventory from suppliers</div></div>' +
        '<div class="toolbar">' +
          '<input type="date" id="purchases-from"><span>to</span><input type="date" id="purchases-to">' +
          '<button class="btn secondary" id="btn-purchases-filter">Filter</button>' +
          '<button class="btn secondary" id="btn-export-purchases">📥 Export CSV</button>' +
          (isAdmin() ? '<button class="btn secondary" id="btn-import-purchases">📤 Import CSV</button>' : '') +
          '<button class="btn" id="btn-new-purchase">+ New Purchase</button>' +
        '</div>' +
      '</div>' +
      '<div id="purchases-list-container">' + renderTable(purchases) + '</div>';

    const filterPurchases = async () => {
      const from = $('#purchases-from') ? $('#purchases-from').value : '';
      const to = $('#purchases-to') ? $('#purchases-to').value : '';
      let query = [];
      if (from) query.push('from=' + from);
      if (to) query.push('to=' + to);

      const url = '/api/purchases' + (query.length ? '?' + query.join('&') : '');
      purchases = await api(url);
      const wrap = $('#purchases-list-container');
      if (wrap) wrap.innerHTML = renderTable(purchases);
      bindPurchaseActions();
    };

    function bindPurchaseActions() {
      $$('.btn-view-purchase').forEach(b => {
        b.onclick = async () => {
          const pu = await api('/api/purchases/' + b.dataset.id);
          openModal('Purchase Details (' + (pu.ref_no || 'PUR-' + pu.id) + ')',
            '<div>' +
              '<div style="margin-bottom:10px;"><strong>Supplier:</strong> ' + (pu.supplier_name || 'N/A') + '<br><strong>Date:</strong> ' + pu.date + '</div>' +
              '<table><thead><tr><th>Product</th><th class="num">Qty</th><th>Unit</th><th class="num">Unit Cost</th><th class="num">Line Total</th></tr></thead><tbody>' +
                pu.items.map(it =>
                  '<tr><td>' + it.product_name + '</td><td class="num">' + fmtNum(it.qty) + '</td><td>' + it.unit + '</td><td class="num">' + fmtTk(it.unit_cost) + '</td><td class="num"><strong>' + fmtTk(it.line_total) + '</strong></td></tr>'
                ).join('') +
              '</tbody></table>' +
              '<div style="text-align:right; margin-top:12px;">' +
                '<div>Total: ' + fmtTk(pu.total) + '</div><div>Paid: ' + fmtTk(pu.paid) + '</div>' +
                '<div class="txt-red"><strong>Due: ' + fmtTk(pu.total - pu.paid) + '</strong></div>' +
              '</div>' +
            '</div>'
          );
        };
      });

      $$('.btn-delete-purchase').forEach(b => {
        b.onclick = async () => {
          if (confirm('Delete this purchase? Stock quantity added by this purchase will be subtracted.')) {
            await api('/api/purchases/' + b.dataset.id, { method: 'DELETE' });
            showToast('Purchase deleted and stock updated.', 'success');
            filterPurchases();
          }
        };
      });
    }

    const filterBtn = $('#btn-purchases-filter');
    if (filterBtn) filterBtn.onclick = filterPurchases;

    const expPuBtn = $('#btn-export-purchases');
    if (expPuBtn) expPuBtn.onclick = () => exportCSV('purchases');

    const impPuBtn = $('#btn-import-purchases');
    if (impPuBtn) impPuBtn.onclick = () => openImportCSVModal('purchases', 'Purchases', filterPurchases);

    const newPuBtn = $('#btn-new-purchase');
    if (newPuBtn) newPuBtn.onclick = () => openNewPurchaseModal(() => filterPurchases());

    bindPurchaseActions();
  }

  async function openNewPurchaseModal(onSuccess) {
    const [products, suppliers, accounts] = await Promise.all([
      api('/api/products'),
      api('/api/suppliers'),
      api('/api/accounts'),
    ]);

    let purchaseItems = [];

    const bodyHtml =
      '<div style="display:flex; flex-direction:column; gap:12px;">' +
        '<div class="form-row">' +
          '<div class="field"><label>Supplier</label><select id="pu-supplier-id"><option value="">-- Cash Supplier / Unsaved --</option>' + suppliers.map(s => '<option value="' + s.id + '">' + s.name + '</option>').join('') + '</select></div>' +
          '<div class="field"><label>Ref / Voucher No</label><input type="text" id="pu-ref-no" placeholder="e.g. BSRM-9812"></div>' +
          '<div class="field"><label>Date</label><input type="date" id="pu-date" value="' + todayStr() + '"></div>' +
        '</div>' +

        '<div class="card card-body" style="background:#f8fafc;">' +
          '<div class="form-row" style="align-items:flex-end;">' +
            '<div class="field" style="flex:2;"><label>Product</label><select id="pu-prod-id"><option value="">-- Choose Product --</option>' + products.map(p => '<option value="' + p.id + '">' + p.name + ' (' + (p.brand || '') + ' ' + (p.size || '') + ') - Cost: ৳' + p.purchase_price + '</option>').join('') + '</select></div>' +
            '<div class="field"><label>Qty</label><input type="number" id="pu-qty" min="0.01" step="any" value="10"></div>' +
            '<div class="field"><label>Unit Cost (৳)</label><input type="number" id="pu-cost" min="0" step="any" value="0"></div>' +
            '<div class="field"><button class="btn" id="btn-pu-add-item">+ Add</button></div>' +
          '</div>' +
        '</div>' +

        '<table><thead><tr><th>Product</th><th class="num">Qty</th><th class="num">Unit Cost</th><th class="num">Line Total</th><th></th></tr></thead><tbody id="pu-items-tbody"><tr><td colspan="5" class="empty">No items added yet</td></tr></tbody></table>' +

        '<div class="form-row" style="margin-top:10px; align-items:center;">' +
          '<div class="field"><label>Pay From Account</label><select id="pu-account-id">' + accounts.map(a => '<option value="' + a.id + '">' + a.name + ' (' + a.type + ') — Bal: ৳' + a.current_balance + '</option>').join('') + '</select></div>' +
          '<div class="field"><label>Amount Paid (৳)</label><input type="number" id="pu-paid" min="0" step="any" value="0"></div>' +
          '<div class="field" style="text-align:right;"><div>Total Amount: <strong id="pu-total-label" style="font-size:18px;">৳0.00</strong></div></div>' +
        '</div>' +

        '<div class="field"><label>Note</label><input type="text" id="pu-note" placeholder="Purchase note"></div>' +
      '</div>';

    const footerHtml =
      '<button class="btn" id="btn-pu-submit">Save Purchase</button>' +
      '<button class="btn secondary modal-cancel-btn">Cancel</button>';

    openModal('Record New Purchase', bodyHtml, footerHtml, true);

    const prodSelect = $('#pu-prod-id');
    if (prodSelect) {
      prodSelect.onchange = (e) => {
        const pid = Number(e.target.value);
        const prod = products.find(p => p.id === pid);
        if (prod && $('#pu-cost')) $('#pu-cost').value = prod.purchase_price;
      };
    }

    const updateTable = () => {
      const tbody = $('#pu-items-tbody');
      if (!tbody) return;
      let total = 0;
      if (purchaseItems.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty">No items added yet</td></tr>';
      } else {
        tbody.innerHTML = purchaseItems.map((it, idx) => {
          const lt = it.qty * it.unit_cost;
          total += lt;
          return '<tr>' +
            '<td>' + it.prod_name + '</td>' +
            '<td class="num">' + it.qty + ' ' + it.unit + '</td>' +
            '<td class="num">' + fmtTk(it.unit_cost) + '</td>' +
            '<td class="num"><strong>' + fmtTk(lt) + '</strong></td>' +
            '<td><button class="btn sm danger btn-pu-del" data-idx="' + idx + '">&times;</button></td>' +
          '</tr>';
        }).join('');
      }
      const totLbl = $('#pu-total-label');
      if (totLbl) totLbl.textContent = fmtTk(total);

      $$('.btn-pu-del').forEach(b => {
        b.onclick = () => {
          purchaseItems.splice(Number(b.dataset.idx), 1);
          updateTable();
        };
      });
    };

    const addPuItemBtn = $('#btn-pu-add-item');
    if (addPuItemBtn) {
      addPuItemBtn.onclick = () => {
        const pid = Number($('#pu-prod-id').value);
        if (!pid) return showToast('Select a product', 'error');
        const prod = products.find(p => p.id === pid);
        const qty = Number($('#pu-qty').value) || 0;
        const unit_cost = Number($('#pu-cost').value) || 0;
        if (qty <= 0) return showToast('Qty must be > 0', 'error');

        purchaseItems.push({
          product_id: prod.id,
          prod_name: prod.name + (prod.brand ? ' [' + prod.brand + ']' : ''),
          unit: prod.unit,
          qty,
          unit_cost,
        });
        updateTable();
        $('#pu-prod-id').value = '';
      };
    }

    const submitPuBtn = $('#btn-pu-submit');
    if (submitPuBtn) {
      submitPuBtn.onclick = async () => {
        if (purchaseItems.length === 0) return showToast('Add at least one product item', 'error');
        let total = 0;
        purchaseItems.forEach(it => total += it.qty * it.unit_cost);
        const paid = Number($('#pu-paid').value) || 0;
        const supplier_id = $('#pu-supplier-id').value ? Number($('#pu-supplier-id').value) : null;

        if (total - paid > 0.009 && !supplier_id) {
          return showToast('Purchases on credit require selecting a saved supplier.', 'error');
        }

        const account_id = $('#pu-account-id') ? Number($('#pu-account-id').value) : null;

        const payload = {
          supplier_id,
          ref_no: $('#pu-ref-no').value,
          date: $('#pu-date').value,
          paid,
          account_id,
          note: $('#pu-note').value,
          items: purchaseItems.map(it => ({
            product_id: it.product_id,
            qty: it.qty,
            unit_cost: it.unit_cost,
          })),
        };

        await api('/api/purchases', { method: 'POST', body: JSON.stringify(payload) });
        showToast('Purchase recorded successfully!', 'success');
        closeModal();
        if (onSuccess) onSuccess();
      };
    }
  }

  // ==========================================
  // 5. PRODUCTS / INVENTORY VIEW
  // ==========================================
  async function renderProducts(container) {
    let products = await api('/api/products');

    const renderTable = (list) =>
      '<div class="card">' +
        '<div class="card-body flush">' +
          (list.length === 0 ? '<div class="empty">No products found</div>' :
            '<table><thead><tr><th>ID</th><th>Product Name</th><th>Category</th><th>Brand / Size</th><th>Unit</th><th class="num">Cost (৳)</th><th class="num">Retail (৳)</th><th class="num">Wholesale (৳)</th><th class="num">Stock Qty</th><th class="num">Low Alert</th><th>Actions</th></tr></thead><tbody>' +
              list.map(p =>
                '<tr>' +
                  '<td>' + p.id + '</td>' +
                  '<td><strong>' + p.name + '</strong></td>' +
                  '<td><span class="pill gray">' + p.category + '</span></td>' +
                  '<td>' + (p.brand || '') + ' ' + (p.size ? '(' + p.size + ')' : '') + '</td>' +
                  '<td>' + p.unit + '</td>' +
                  '<td class="num">' + fmtTk(p.purchase_price) + '</td>' +
                  '<td class="num">' + fmtTk(p.retail_price) + '</td>' +
                  '<td class="num">' + fmtTk(p.wholesale_price) + '</td>' +
                  '<td class="num ' + (p.low_stock_alert > 0 && p.stock_qty <= p.low_stock_alert ? 'txt-red' : 'txt-green') + '"><strong>' + fmtNum(p.stock_qty) + '</strong></td>' +
                  '<td class="num txt-muted">' + fmtNum(p.low_stock_alert) + '</td>' +
                  '<td>' +
                    (isAdmin() ?
                      '<button class="btn sm secondary btn-edit-prod" data-id="' + p.id + '">Edit</button> <button class="btn sm danger btn-del-prod" data-id="' + p.id + '">Delete</button>' :
                      '<span class="txt-muted" style="font-size:12px;">View Only</span>'
                    ) +
                  '</td>' +
                '</tr>'
              ).join('') +
            '</tbody></table>'
          ) +
        '</div>' +
      '</div>';

    container.innerHTML =
      '<div class="page-head">' +
        '<div><div class="page-title">Inventory &amp; Products</div><div class="page-sub">Manage product prices, stock, and alert limits</div></div>' +
        '<div class="toolbar">' +
          '<input type="search" id="prod-search" placeholder="Search product, brand, size...">' +
          '<select id="prod-cat-filter" style="width: auto;"><option value="">All Categories</option><option value="rod">Rod</option><option value="cement">Cement</option><option value="other">Other</option></select>' +
          '<button class="btn secondary" id="btn-export-prods">📥 Export CSV</button>' +
          (isAdmin() ? '<button class="btn secondary" id="btn-import-prods">📤 Import CSV</button>' : '') +
          '<button class="btn" id="btn-add-product">+ Add Product</button>' +
        '</div>' +
      '</div>' +
      '<div id="prod-list-container">' + renderTable(products) + '</div>';

    const filterProducts = () => {
      const q = $('#prod-search') ? $('#prod-search').value.toLowerCase().trim() : '';
      const cat = $('#prod-cat-filter') ? $('#prod-cat-filter').value : '';
      const filtered = products.filter(p => {
        const matchQ = !q || p.name.toLowerCase().includes(q) || (p.brand && p.brand.toLowerCase().includes(q)) || (p.size && p.size.toLowerCase().includes(q));
        const matchCat = !cat || p.category === cat;
        return matchQ && matchCat;
      });
      const wrap = $('#prod-list-container');
      if (wrap) wrap.innerHTML = renderTable(filtered);
      bindProdActions();
    };

    function bindProdActions() {
      $$('.btn-edit-prod').forEach(b => {
        b.onclick = () => {
          const prod = products.find(p => p.id === Number(b.dataset.id));
          openProductModal(prod, async () => {
            products = await api('/api/products');
            filterProducts();
          });
        };
      });
      $$('.btn-del-prod').forEach(b => {
        b.onclick = async () => {
          if (confirm('Delete this product?')) {
            await api('/api/products/' + b.dataset.id, { method: 'DELETE' });
            showToast('Product deleted', 'success');
            products = await api('/api/products');
            filterProducts();
          }
        };
      });
    }

    const prodSearch = $('#prod-search');
    if (prodSearch) prodSearch.oninput = filterProducts;

    const prodCat = $('#prod-cat-filter');
    if (prodCat) prodCat.onchange = filterProducts;

    const expProdsBtn = $('#btn-export-prods');
    if (expProdsBtn) expProdsBtn.onclick = () => exportCSV('products');

    const impProdsBtn = $('#btn-import-prods');
    if (impProdsBtn) impProdsBtn.onclick = () => openImportCSVModal('products', 'Products', async () => {
      products = await api('/api/products');
      filterProducts();
    });

    const addProdBtn = $('#btn-add-product');
    if (addProdBtn) addProdBtn.onclick = () => openProductModal(null, async () => {
      products = await api('/api/products');
      filterProducts();
    });

    bindProdActions();
  }

  function openProductModal(prod, onSuccess) {
    const isEdit = !!prod;
    const bodyHtml =
      '<div style="display:flex; flex-direction:column; gap:10px;">' +
        '<div class="field"><label>Product Name *</label><input type="text" id="pm-name" value="' + (isEdit ? prod.name : '') + '" placeholder="e.g. MS Rod 12mm"></div>' +
        '<div class="form-row">' +
          '<div class="field"><label>Category</label><select id="pm-category"><option value="rod" ' + (isEdit && prod.category === 'rod' ? 'selected' : '') + '>Rod</option><option value="cement" ' + (isEdit && prod.category === 'cement' ? 'selected' : '') + '>Cement</option><option value="other" ' + (isEdit && prod.category === 'other' ? 'selected' : '') + '>Other</option></select></div>' +
          '<div class="field"><label>Brand</label><input type="text" id="pm-brand" value="' + (isEdit ? prod.brand || '' : '') + '" placeholder="e.g. BSRM / Shah"></div>' +
          '<div class="field"><label>Size / Spec</label><input type="text" id="pm-size" value="' + (isEdit ? prod.size || '' : '') + '" placeholder="e.g. 12mm / 50kg bag"></div>' +
        '</div>' +

        '<div class="form-row">' +
          '<div class="field"><label>Unit (kg/bag/pcs/ton)</label><input type="text" id="pm-unit" value="' + (isEdit ? prod.unit : 'kg') + '" placeholder="kg"></div>' +
          '<div class="field"><label>Purchase Price (৳)</label><input type="number" id="pm-purchase-price" step="any" value="' + (isEdit ? prod.purchase_price : 0) + '"></div>' +
        '</div>' +

        '<div class="form-row">' +
          '<div class="field"><label>Retail Price (৳)</label><input type="number" id="pm-retail-price" step="any" value="' + (isEdit ? prod.retail_price : 0) + '"></div>' +
          '<div class="field"><label>Wholesale Price (৳)</label><input type="number" id="pm-wholesale-price" step="any" value="' + (isEdit ? prod.wholesale_price : 0) + '"></div>' +
        '</div>' +

        '<div class="form-row">' +
          '<div class="field"><label>Current Stock Qty</label><input type="number" id="pm-stock-qty" step="any" value="' + (isEdit ? prod.stock_qty : 0) + '"></div>' +
          '<div class="field"><label>Low Stock Alert Qty</label><input type="number" id="pm-low-alert" step="any" value="' + (isEdit ? prod.low_stock_alert : 0) + '"></div>' +
        '</div>' +
      '</div>';

    const footerHtml =
      '<button class="btn" id="btn-pm-save">' + (isEdit ? 'Update Product' : 'Add Product') + '</button>' +
      '<button class="btn secondary modal-cancel-btn">Cancel</button>';

    openModal(isEdit ? 'Edit Product #' + prod.id : 'Add New Product', bodyHtml, footerHtml);

    const savePmBtn = $('#btn-pm-save');
    if (savePmBtn) {
      savePmBtn.onclick = async () => {
        const name = $('#pm-name').value.trim();
        if (!name) return showToast('Product name is required', 'error');

        const payload = {
          name,
          category: $('#pm-category').value,
          brand: $('#pm-brand').value,
          size: $('#pm-size').value,
          unit: $('#pm-unit').value || 'pcs',
          purchase_price: Number($('#pm-purchase-price').value) || 0,
          retail_price: Number($('#pm-retail-price').value) || 0,
          wholesale_price: Number($('#pm-wholesale-price').value) || 0,
          stock_qty: Number($('#pm-stock-qty').value) || 0,
          low_stock_alert: Number($('#pm-low-alert').value) || 0,
        };

        if (isEdit) {
          await api('/api/products/' + prod.id, { method: 'PUT', body: JSON.stringify(payload) });
          showToast('Product updated', 'success');
        } else {
          await api('/api/products', { method: 'POST', body: JSON.stringify(payload) });
          showToast('Product created', 'success');
        }
        closeModal();
        if (onSuccess) onSuccess();
      };
    }
  }

  // ==========================================
  // 6. CUSTOMERS & LEDGER VIEW
  // ==========================================
  async function renderCustomers(container) {
    let customers = await api('/api/customers');

    const renderTable = (list) =>
      '<div class="card">' +
        '<div class="card-body flush">' +
          (list.length === 0 ? '<div class="empty">No customers found</div>' :
            '<table><thead><tr><th>ID</th><th>Customer Name</th><th>Phone</th><th>Address</th><th>Type</th><th class="num">Due Balance</th><th>Actions</th></tr></thead><tbody>' +
              list.map(c =>
                '<tr>' +
                  '<td>' + c.id + '</td>' +
                  '<td><strong>' + c.name + '</strong></td>' +
                  '<td>' + (c.phone || 'N/A') + '</td>' +
                  '<td>' + (c.address || 'N/A') + '</td>' +
                  '<td><span class="pill ' + (c.type === 'wholesale' ? 'blue' : 'gray') + '">' + c.type + '</span></td>' +
                  '<td class="num ' + (c.balance > 0 ? 'txt-red' : 'txt-green') + '"><strong>' + fmtTk(c.balance) + '</strong></td>' +
                  '<td>' +
                    '<button class="btn sm green btn-cust-pay" data-id="' + c.id + '" data-name="' + c.name + '">💵 Receive Due</button> ' +
                    '<button class="btn sm secondary btn-cust-ledger" data-id="' + c.id + '">Ledger</button> ' +
                    (isAdmin() ?
                      '<button class="btn sm secondary btn-cust-edit" data-id="' + c.id + '">Edit</button> <button class="btn sm danger btn-cust-del" data-id="' + c.id + '">Delete</button>' : ''
                    ) +
                  '</td>' +
                '</tr>'
              ).join('') +
            '</tbody></table>'
          ) +
        '</div>' +
      '</div>';

    container.innerHTML =
      '<div class="page-head">' +
        '<div><div class="page-title">Customers &amp; Receivables</div><div class="page-sub">Customer balances, payment collection, and ledger statements</div></div>' +
        '<div class="toolbar">' +
          '<input type="search" id="cust-search" placeholder="Search customer name or phone...">' +
          '<button class="btn secondary" id="btn-export-custs">📥 Export CSV</button>' +
          (isAdmin() ? '<button class="btn secondary" id="btn-import-custs">📤 Import CSV</button>' : '') +
          '<button class="btn" id="btn-add-customer">+ Add Customer</button>' +
        '</div>' +
      '</div>' +
      '<div id="cust-list-container">' + renderTable(customers) + '</div>';

    const filterCustomers = () => {
      const q = $('#cust-search') ? $('#cust-search').value.toLowerCase().trim() : '';
      const filtered = customers.filter(c => !q || c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q)));
      const wrap = $('#cust-list-container');
      if (wrap) wrap.innerHTML = renderTable(filtered);
      bindCustActions();
    };

    function bindCustActions() {
      $$('.btn-cust-pay').forEach(b => {
        b.onclick = () => openPaymentModal('customer', Number(b.dataset.id), b.dataset.name, async () => {
          customers = await api('/api/customers');
          filterCustomers();
        });
      });
      $$('.btn-cust-ledger').forEach(b => {
        b.onclick = () => openLedgerModal('customer', Number(b.dataset.id));
      });
      $$('.btn-cust-edit').forEach(b => {
        b.onclick = () => {
          const cust = customers.find(c => c.id === Number(b.dataset.id));
          openAddCustomerModal(async () => {
            customers = await api('/api/customers');
            filterCustomers();
          }, cust);
        };
      });
      $$('.btn-cust-del').forEach(b => {
        b.onclick = async () => {
          if (confirm('Delete customer?')) {
            await api('/api/customers/' + b.dataset.id, { method: 'DELETE' });
            showToast('Customer deleted', 'success');
            customers = await api('/api/customers');
            filterCustomers();
          }
        };
      });
    }

    const custSearch = $('#cust-search');
    if (custSearch) custSearch.oninput = filterCustomers;

    const expCustsBtn = $('#btn-export-custs');
    if (expCustsBtn) expCustsBtn.onclick = () => exportCSV('customers');

    const impCustsBtn = $('#btn-import-custs');
    if (impCustsBtn) impCustsBtn.onclick = () => openImportCSVModal('customers', 'Customers', async () => {
      customers = await api('/api/customers');
      filterCustomers();
    });

    const addCustBtn = $('#btn-add-customer');
    if (addCustBtn) addCustBtn.onclick = () => openAddCustomerModal(async () => {
      customers = await api('/api/customers');
      filterCustomers();
    });

    bindCustActions();
  }

  function openAddCustomerModal(onSuccess, cust = null) {
    const isEdit = !!cust;
    const bodyHtml =
      '<div style="display:flex; flex-direction:column; gap:10px;">' +
        '<div class="field"><label>Customer Name *</label><input type="text" id="cm-name" value="' + (isEdit ? cust.name : '') + '" placeholder="e.g. Rahim Construction"></div>' +
        '<div class="field"><label>Phone Number</label><input type="text" id="cm-phone" value="' + (isEdit ? cust.phone || '' : '') + '" placeholder="e.g. 01711-123456"></div>' +
        '<div class="field"><label>Address</label><input type="text" id="cm-address" value="' + (isEdit ? cust.address || '' : '') + '" placeholder="e.g. Station Road, Bogura"></div>' +
        '<div class="field"><label>Customer Type</label><select id="cm-type"><option value="retail" ' + (isEdit && cust.type === 'retail' ? 'selected' : '') + '>Retail</option><option value="wholesale" ' + (isEdit && cust.type === 'wholesale' ? 'selected' : '') + '>Wholesale</option></select></div>' +
      '</div>';

    const footerHtml =
      '<button class="btn" id="btn-cm-save">' + (isEdit ? 'Update Customer' : 'Save Customer') + '</button>' +
      '<button class="btn secondary modal-cancel-btn">Cancel</button>';

    openModal(isEdit ? 'Edit Customer' : 'Add New Customer', bodyHtml, footerHtml);

    const saveCmBtn = $('#btn-cm-save');
    if (saveCmBtn) {
      saveCmBtn.onclick = async () => {
        const name = $('#cm-name').value.trim();
        if (!name) return showToast('Customer name is required', 'error');

        const payload = {
          name,
          phone: $('#cm-phone').value,
          address: $('#cm-address').value,
          type: $('#cm-type').value,
        };

        let res;
        if (isEdit) {
          res = await api('/api/customers/' + cust.id, { method: 'PUT', body: JSON.stringify(payload) });
          showToast('Customer updated', 'success');
        } else {
          res = await api('/api/customers', { method: 'POST', body: JSON.stringify(payload) });
          showToast('Customer registered', 'success');
        }
        closeModal();
        if (onSuccess) onSuccess(res);
      };
    }
  }

  // ==========================================
  // 7. SUPPLIERS & LEDGER VIEW
  // ==========================================
  async function renderSuppliers(container) {
    let suppliers = await api('/api/suppliers');

    const renderTable = (list) =>
      '<div class="card">' +
        '<div class="card-body flush">' +
          (list.length === 0 ? '<div class="empty">No suppliers found</div>' :
            '<table><thead><tr><th>ID</th><th>Supplier Name</th><th>Phone</th><th>Address</th><th class="num">Payable Due</th><th>Actions</th></tr></thead><tbody>' +
              list.map(s =>
                '<tr>' +
                  '<td>' + s.id + '</td>' +
                  '<td><strong>' + s.name + '</strong></td>' +
                  '<td>' + (s.phone || 'N/A') + '</td>' +
                  '<td>' + (s.address || 'N/A') + '</td>' +
                  '<td class="num ' + (s.balance > 0 ? 'txt-red' : 'txt-green') + '"><strong>' + fmtTk(s.balance) + '</strong></td>' +
                  '<td>' +
                    '<button class="btn sm danger btn-supp-pay" data-id="' + s.id + '" data-name="' + s.name + '">💸 Pay Supplier</button> ' +
                    '<button class="btn sm secondary btn-supp-ledger" data-id="' + s.id + '">Ledger</button> ' +
                    (isAdmin() ?
                      '<button class="btn sm secondary btn-supp-edit" data-id="' + s.id + '">Edit</button> <button class="btn sm danger btn-supp-del" data-id="' + s.id + '">Delete</button>' : ''
                    ) +
                  '</td>' +
                '</tr>'
              ).join('') +
            '</tbody></table>'
          ) +
        '</div>' +
      '</div>';

    container.innerHTML =
      '<div class="page-head">' +
        '<div><div class="page-title">Suppliers &amp; Payables</div><div class="page-sub">Manage factory suppliers, purchase dues, and ledger history</div></div>' +
        '<div class="toolbar">' +
          '<input type="search" id="supp-search" placeholder="Search supplier name...">' +
          '<button class="btn secondary" id="btn-export-supps">📥 Export CSV</button>' +
          (isAdmin() ? '<button class="btn secondary" id="btn-import-supps">📤 Import CSV</button>' : '') +
          '<button class="btn" id="btn-add-supplier">+ Add Supplier</button>' +
        '</div>' +
      '</div>' +
      '<div id="supp-list-container">' + renderTable(suppliers) + '</div>';

    const filterSuppliers = () => {
      const q = $('#supp-search') ? $('#supp-search').value.toLowerCase().trim() : '';
      const filtered = suppliers.filter(s => !q || s.name.toLowerCase().includes(q));
      const wrap = $('#supp-list-container');
      if (wrap) wrap.innerHTML = renderTable(filtered);
      bindSuppActions();
    };

    function bindSuppActions() {
      $$('.btn-supp-pay').forEach(b => {
        b.onclick = () => openPaymentModal('supplier', Number(b.dataset.id), b.dataset.name, async () => {
          suppliers = await api('/api/suppliers');
          filterSuppliers();
        });
      });
      $$('.btn-supp-ledger').forEach(b => {
        b.onclick = () => openLedgerModal('supplier', Number(b.dataset.id));
      });
      $$('.btn-supp-edit').forEach(b => {
        b.onclick = () => {
          const supp = suppliers.find(s => s.id === Number(b.dataset.id));
          openAddSupplierModal(async () => {
            suppliers = await api('/api/suppliers');
            filterSuppliers();
          }, supp);
        };
      });
      $$('.btn-supp-del').forEach(b => {
        b.onclick = async () => {
          if (confirm('Delete supplier?')) {
            await api('/api/suppliers/' + b.dataset.id, { method: 'DELETE' });
            showToast('Supplier deleted', 'success');
            suppliers = await api('/api/suppliers');
            filterSuppliers();
          }
        };
      });
    }

    const suppSearch = $('#supp-search');
    if (suppSearch) suppSearch.oninput = filterSuppliers;

    const expSuppsBtn = $('#btn-export-supps');
    if (expSuppsBtn) expSuppsBtn.onclick = () => exportCSV('suppliers');

    const impSuppsBtn = $('#btn-import-supps');
    if (impSuppsBtn) impSuppsBtn.onclick = () => openImportCSVModal('suppliers', 'Suppliers', async () => {
      suppliers = await api('/api/suppliers');
      filterSuppliers();
    });

    const addSuppBtn = $('#btn-add-supplier');
    if (addSuppBtn) addSuppBtn.onclick = () => openAddSupplierModal(async () => {
      suppliers = await api('/api/suppliers');
      filterSuppliers();
    });

    bindSuppActions();
  }

  function openAddSupplierModal(onSuccess, supp = null) {
    const isEdit = !!supp;
    const bodyHtml =
      '<div style="display:flex; flex-direction:column; gap:10px;">' +
        '<div class="field"><label>Supplier Name *</label><input type="text" id="sm-name" value="' + (isEdit ? supp.name : '') + '" placeholder="e.g. BSRM Steels Ltd"></div>' +
        '<div class="field"><label>Phone</label><input type="text" id="sm-phone" value="' + (isEdit ? supp.phone || '' : '') + '" placeholder="e.g. 01800-000000"></div>' +
        '<div class="field"><label>Address</label><input type="text" id="sm-address" value="' + (isEdit ? supp.address || '' : '') + '" placeholder="e.g. Chattogram"></div>' +
      '</div>';

    const footerHtml =
      '<button class="btn" id="btn-sm-save">' + (isEdit ? 'Update Supplier' : 'Save Supplier') + '</button>' +
      '<button class="btn secondary modal-cancel-btn">Cancel</button>';

    openModal(isEdit ? 'Edit Supplier' : 'Add New Supplier', bodyHtml, footerHtml);

    const saveSmBtn = $('#btn-sm-save');
    if (saveSmBtn) {
      saveSmBtn.onclick = async () => {
        const name = $('#sm-name').value.trim();
        if (!name) return showToast('Supplier name is required', 'error');

        const payload = {
          name,
          phone: $('#sm-phone').value,
          address: $('#sm-address').value,
        };

        if (isEdit) {
          await api('/api/suppliers/' + supp.id, { method: 'PUT', body: JSON.stringify(payload) });
          showToast('Supplier updated', 'success');
        } else {
          await api('/api/suppliers', { method: 'POST', body: JSON.stringify(payload) });
          showToast('Supplier created', 'success');
        }
        closeModal();
        if (onSuccess) onSuccess();
      };
    }
  }

  async function openPaymentModal(partyType, partyId, partyName, onSuccess) {
    const accounts = await api('/api/accounts');
    const isCust = partyType === 'customer';
    const bodyHtml =
      '<div style="display:flex; flex-direction:column; gap:10px;">' +
        '<div><strong>' + (isCust ? 'Customer' : 'Supplier') + ':</strong> ' + partyName + '</div>' +
        '<div class="field"><label>Date</label><input type="date" id="pay-date" value="' + todayStr() + '"></div>' +
        '<div class="field"><label>' + (isCust ? 'Deposit To Account' : 'Pay From Account') + '</label><select id="pay-account-id">' + accounts.map(a => '<option value="' + a.id + '">' + a.name + ' (' + a.type + ') — Bal: ৳' + a.current_balance + '</option>').join('') + '</select></div>' +
        '<div class="field"><label>Payment Amount (৳) *</label><input type="number" id="pay-amount" min="0.01" step="any" placeholder="0.00"></div>' +
        '<div class="field"><label>Payment Method</label><select id="pay-method"><option value="cash">Cash</option><option value="bank">Bank Transfer</option><option value="bkash">bKash</option><option value="nagad">Nagad</option><option value="other">Other</option></select></div>' +
        '<div class="field"><label>Note / Reference</label><input type="text" id="pay-note" placeholder="Receipt / Trx ID"></div>' +
      '</div>';

    const footerHtml =
      '<button class="btn" id="btn-pay-submit">' + (isCust ? 'Record Receipt' : 'Record Payment') + '</button>' +
      '<button class="btn secondary modal-cancel-btn">Cancel</button>';

    openModal(isCust ? 'Receive Customer Payment' : 'Pay Supplier', bodyHtml, footerHtml);

    const submitPayBtn = $('#btn-pay-submit');
    if (submitPayBtn) {
      submitPayBtn.onclick = async () => {
        const amount = Number($('#pay-amount').value) || 0;
        if (amount <= 0) return showToast('Amount must be greater than 0', 'error');

        const payload = {
          party_type: partyType,
          party_id: partyId,
          date: $('#pay-date').value,
          account_id: $('#pay-account-id') ? Number($('#pay-account-id').value) : null,
          amount,
          method: $('#pay-method').value,
          note: $('#pay-note').value,
        };

        await api('/api/payments', { method: 'POST', body: JSON.stringify(payload) });
        showToast('Payment recorded successfully', 'success');
        closeModal();
        if (onSuccess) onSuccess();
      };
    }
  }

  async function openGlobalPaymentModal() {
    const [customers, suppliers, accounts] = await Promise.all([
      api('/api/customers'),
      api('/api/suppliers'),
      api('/api/accounts'),
    ]);

    const bodyHtml =
      '<div style="display:flex; flex-direction:column; gap:10px;">' +
        '<div class="field"><label>Party Type</label><select id="gpay-type"><option value="customer">Customer (Receive Money)</option><option value="supplier">Supplier (Pay Money)</option></select></div>' +
        '<div class="field" id="gpay-party-wrap"></div>' +
        '<div class="field"><label>Account</label><select id="gpay-account-id">' + accounts.map(a => '<option value="' + a.id + '">' + a.name + ' (' + a.type + ') — Bal: ৳' + a.current_balance + '</option>').join('') + '</select></div>' +
        '<div class="field"><label>Date</label><input type="date" id="gpay-date" value="' + todayStr() + '"></div>' +
        '<div class="field"><label>Amount (৳)</label><input type="number" id="gpay-amount" min="0.01" step="any" placeholder="0.00"></div>' +
        '<div class="field"><label>Method</label><select id="gpay-method"><option value="cash">Cash</option><option value="bank">Bank</option><option value="bkash">bKash</option><option value="nagad">Nagad</option></select></div>' +
        '<div class="field"><label>Note</label><input type="text" id="gpay-note" placeholder="Note"></div>' +
      '</div>';

    const footerHtml =
      '<button class="btn" id="btn-gpay-save">Submit Payment</button>' +
      '<button class="btn secondary modal-cancel-btn">Cancel</button>';

    openModal('Record Payment / Collection', bodyHtml, footerHtml);

    const updatePartySelect = () => {
      const type = $('#gpay-type') ? $('#gpay-type').value : 'customer';
      const wrap = $('#gpay-party-wrap');
      if (!wrap) return;
      if (type === 'customer') {
        wrap.innerHTML = '<label>Select Customer</label><select id="gpay-party-id">' + customers.map(c => '<option value="' + c.id + '">' + c.name + ' (Due: ৳' + c.balance + ')</option>').join('') + '</select>';
      } else {
        wrap.innerHTML = '<label>Select Supplier</label><select id="gpay-party-id">' + suppliers.map(s => '<option value="' + s.id + '">' + s.name + ' (Due: ৳' + s.balance + ')</option>').join('') + '</select>';
      }
    };

    const gpayTypeSel = $('#gpay-type');
    if (gpayTypeSel) gpayTypeSel.onchange = updatePartySelect;
    updatePartySelect();

    const saveGpayBtn = $('#btn-gpay-save');
    if (saveGpayBtn) {
      saveGpayBtn.onclick = async () => {
        const party_type = $('#gpay-type').value;
        const party_id = Number($('#gpay-party-id').value);
        const amount = Number($('#gpay-amount').value) || 0;
        if (!party_id || amount <= 0) return showToast('Please select party and valid amount', 'error');

        await api('/api/payments', {
          method: 'POST',
          body: JSON.stringify({
            party_type,
            party_id,
            account_id: $('#gpay-account-id') ? Number($('#gpay-account-id').value) : null,
            date: $('#gpay-date').value,
            amount,
            method: $('#gpay-method').value,
            note: $('#gpay-note').value,
          }),
        });

        showToast('Payment recorded successfully', 'success');
        closeModal();
        if (state.currentView === 'dashboard') renderDashboard($('#main'));
      };
    }
  }

  async function openLedgerModal(partyType, partyId) {
    const data = await api('/api/' + partyType + 's/' + partyId + '/ledger');
    const entity = data[partyType];

    const bodyHtml =
      '<div>' +
        '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; background:#f8fafc; padding:10px 14px; border-radius:8px;">' +
          '<div><strong style="font-size:16px;">' + entity.name + '</strong> (' + partyType + ')<br><span class="txt-muted">' + (entity.phone || '') + ' ' + (entity.address || '') + '</span></div>' +
          '<div style="text-align:right;"><div class="txt-muted" style="font-size:12px;">Net Outstanding Balance</div><div class="value ' + (data.balance > 0 ? 'txt-red' : 'txt-green') + '" style="font-size:20px; font-weight:bold;">' + fmtTk(data.balance) + '</div></div>' +
        '</div>' +

        (data.entries.length === 0 ? '<div class="empty">No ledger entries found</div>' :
          '<table><thead><tr><th>Date</th><th>Type</th><th>Reference</th><th class="num">Debit (+)</th><th class="num">Credit (-)</th><th class="num">Balance</th></tr></thead><tbody>' +
            data.entries.map(e =>
              '<tr>' +
                '<td>' + e.date + '</td>' +
                '<td><span class="pill ' + (e.kind === 'sale' || e.kind === 'purchase' ? 'blue' : 'green') + '">' + e.kind + '</span></td>' +
                '<td>' + e.ref + '</td>' +
                '<td class="num">' + (e.debit > 0 ? fmtTk(e.debit) : '-') + '</td>' +
                '<td class="num">' + (e.credit > 0 ? fmtTk(e.credit) : '-') + '</td>' +
                '<td class="num"><strong>' + fmtTk(e.balance) + '</strong></td>' +
              '</tr>'
            ).join('') +
          '</tbody></table>'
        ) +
      '</div>';

    openModal((partyType === 'customer' ? 'Customer' : 'Supplier') + ' Statement / Ledger', bodyHtml, '', true);
  }

  // ==========================================
  // 8. EXPENSES VIEW
  // ==========================================
  async function renderExpenses(container) {
    let expenses = await api('/api/expenses');

    const renderContent = (list) => {
      let total = 0;
      list.forEach(e => total += e.amount);

      return '' +
        '<div class="stat-grid" style="grid-template-columns: 1fr;">' +
          '<div class="stat red">' +
            '<div class="label">Total Expenses in Period</div>' +
            '<div class="value">' + fmtTk(total) + '</div>' +
          '</div>' +
        '</div>' +

        '<div class="card">' +
          '<div class="card-body flush">' +
            (list.length === 0 ? '<div class="empty">No expenses logged</div>' :
              '<table><thead><tr><th>Date</th><th>Category</th><th>Note / Description</th><th class="num">Amount</th><th>Action</th></tr></thead><tbody>' +
                list.map(ex =>
                  '<tr>' +
                    '<td>' + ex.date + '</td>' +
                    '<td><span class="pill gray">' + ex.category + '</span></td>' +
                    '<td>' + (ex.note || 'N/A') + '</td>' +
                    '<td class="num txt-red"><strong>' + fmtTk(ex.amount) + '</strong></td>' +
                    '<td>' + (isAdmin() ? '<button class="btn sm danger btn-del-exp" data-id="' + ex.id + '">Delete</button>' : '') + '</td>' +
                  '</tr>'
                ).join('') +
              '</tbody></table>'
            ) +
          '</div>' +
        '</div>';
    };

    container.innerHTML =
      '<div class="page-head">' +
        '<div><div class="page-title">Expenses Log</div><div class="page-sub">Track daily operating and shop expenses</div></div>' +
        '<div class="toolbar">' +
          '<input type="date" id="exp-from"><span>to</span><input type="date" id="exp-to">' +
          '<button class="btn secondary" id="btn-exp-filter">Filter</button>' +
          '<button class="btn secondary" id="btn-export-expenses">📥 Export CSV</button>' +
          (isAdmin() ? '<button class="btn secondary" id="btn-import-expenses">📤 Import CSV</button>' : '') +
          '<button class="btn" id="btn-add-expense">+ Add Expense</button>' +
        '</div>' +
      '</div>' +
      '<div id="exp-content">' + renderContent(expenses) + '</div>';

    const filterExpenses = async () => {
      const from = $('#exp-from') ? $('#exp-from').value : '';
      const to = $('#exp-to') ? $('#exp-to').value : '';
      let query = [];
      if (from) query.push('from=' + from);
      if (to) query.push('to=' + to);

      expenses = await api('/api/expenses' + (query.length ? '?' + query.join('&') : ''));
      const wrap = $('#exp-content');
      if (wrap) wrap.innerHTML = renderContent(expenses);
      bindExpActions();
    };

    function bindExpActions() {
      $$('.btn-del-exp').forEach(b => {
        b.onclick = async () => {
          if (confirm('Delete expense log?')) {
            await api('/api/expenses/' + b.dataset.id, { method: 'DELETE' });
            showToast('Expense deleted', 'success');
            filterExpenses();
          }
        };
      });
    }

    const expFilterBtn = $('#btn-exp-filter');
    if (expFilterBtn) expFilterBtn.onclick = filterExpenses;

    const expExportBtn = $('#btn-export-expenses');
    if (expExportBtn) expExportBtn.onclick = () => exportCSV('expenses');

    const expImportBtn = $('#btn-import-expenses');
    if (expImportBtn) expImportBtn.onclick = () => openImportCSVModal('expenses', 'Expenses', filterExpenses);

    const addExpBtn = $('#btn-add-expense');
    if (addExpBtn) addExpBtn.onclick = () => openAddExpenseModal(() => filterExpenses());

    bindExpActions();
  }

  async function openAddExpenseModal(onSuccess) {
    const accounts = await api('/api/accounts');
    const bodyHtml =
      '<div style="display:flex; flex-direction:column; gap:10px;">' +
        '<div class="field"><label>Date</label><input type="date" id="ex-date" value="' + todayStr() + '"></div>' +
        '<div class="field"><label>Pay From Account</label><select id="ex-account-id">' + accounts.map(a => '<option value="' + a.id + '">' + a.name + ' (' + a.type + ') — Bal: ৳' + a.current_balance + '</option>').join('') + '</select></div>' +
        '<div class="field"><label>Category</label><select id="ex-cat"><option value="rent">Rent</option><option value="salary">Salary / Wages</option><option value="transport">Transport / Freight</option><option value="utility">Utility (Electricity/Water)</option><option value="other" selected>Other / Misc</option></select></div>' +
        '<div class="field"><label>Amount (৳) *</label><input type="number" id="ex-amount" min="0.01" step="any" placeholder="0.00"></div>' +
        '<div class="field"><label>Note / Description</label><input type="text" id="ex-note" placeholder="Expense description"></div>' +
      '</div>';

    const footerHtml =
      '<button class="btn" id="btn-ex-save">Save Expense</button>' +
      '<button class="btn secondary modal-cancel-btn">Cancel</button>';

    openModal('Record New Expense', bodyHtml, footerHtml);

    const saveExBtn = $('#btn-ex-save');
    if (saveExBtn) {
      saveExBtn.onclick = async () => {
        const amount = Number($('#ex-amount').value) || 0;
        if (amount <= 0) return showToast('Amount must be > 0', 'error');

        await api('/api/expenses', {
          method: 'POST',
          body: JSON.stringify({
            date: $('#ex-date').value,
            account_id: $('#ex-account-id') ? Number($('#ex-account-id').value) : null,
            category: $('#ex-cat').value,
            amount,
            note: $('#ex-note').value,
          }),
        });

        showToast('Expense logged', 'success');
        closeModal();
        if (onSuccess) onSuccess();
      };
    }
  }

  // ==========================================
  // 9. ACCOUNTS & CAPITAL MANAGEMENT VIEW
  // ==========================================
  async function renderAccounts(container) {
    let accounts = await api('/api/accounts');

    let totalValuation = 0;
    accounts.forEach(a => totalValuation += a.current_balance);

    const renderGrid = (list) => '' +
      '<div class="stat-grid" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));">' +
        list.map(a =>
          '<div class="stat ' + (a.type === 'bank' ? 'blue' : 'green') + '">' +
            '<div class="label">' + a.name + ' (' + a.type.toUpperCase() + ')</div>' +
            '<div class="value">' + fmtTk(a.current_balance) + '</div>' +
            '<div class="sub">' + (a.account_number ? 'Acct: ' + a.account_number : 'Cash Location') + ' | Opening: ' + fmtTk(a.opening_balance) + '</div>' +
          '</div>'
        ).join('') +
        '<div class="stat green" style="border: 2px solid var(--green);">' +
          '<div class="label">TOTAL CAPITAL BALANCE</div>' +
          '<div class="value" style="font-size:24px;">' + fmtTk(totalValuation) + '</div>' +
          '<div class="sub">Distributed across ' + list.length + ' accounts</div>' +
        '</div>' +
      '</div>' +

      '<div class="card">' +
        '<div class="card-head"><span>Capital &amp; Cash Accounts</span></div>' +
        '<div class="card-body flush">' +
          (list.length === 0 ? '<div class="empty">No accounts created yet</div>' :
            '<table><thead><tr><th>ID</th><th>Account Name</th><th>Type</th><th>Account / Ref No</th><th class="num">Opening Bal</th><th class="num">Current Balance</th><th>Actions</th></tr></thead><tbody>' +
              list.map(a =>
                '<tr>' +
                  '<td>' + a.id + '</td>' +
                  '<td><strong>' + a.name + '</strong></td>' +
                  '<td><span class="pill ' + (a.type === 'bank' ? 'blue' : 'green') + '">' + a.type + '</span></td>' +
                  '<td>' + (a.account_number || 'N/A') + '</td>' +
                  '<td class="num">' + fmtTk(a.opening_balance) + '</td>' +
                  '<td class="num ' + (a.current_balance >= 0 ? 'txt-green' : 'txt-red') + '"><strong>' + fmtTk(a.current_balance) + '</strong></td>' +
                  '<td>' +
                    '<button class="btn sm secondary btn-acct-stmt" data-id="' + a.id + '">Statement</button> ' +
                    (isAdmin() ?
                      '<button class="btn sm secondary btn-acct-edit" data-id="' + a.id + '">Edit</button> <button class="btn sm danger btn-acct-del" data-id="' + a.id + '">Delete</button>' : ''
                    ) +
                  '</td>' +
                '</tr>'
              ).join('') +
            '</tbody></table>'
          ) +
        '</div>' +
      '</div>';

    container.innerHTML =
      '<div class="page-head">' +
        '<div><div class="page-title">Accounts &amp; Capital Management</div><div class="page-sub">Track cash at shop, bank accounts, capital deposits, drawings, and transfers</div></div>' +
        '<div class="toolbar">' +
          (isAdmin() ? '<button class="btn" id="btn-add-acct">+ New Account</button>' : '') +
          '<button class="btn green" id="btn-deposit-capital">📥 Deposit Capital</button>' +
          '<button class="btn danger" id="btn-withdraw-capital">📤 Withdraw Funds</button>' +
          '<button class="btn secondary" id="btn-transfer-funds">🔀 Transfer Funds</button>' +
        '</div>' +
      '</div>' +
      '<div id="acct-grid-container">' + renderGrid(accounts) + '</div>';

    const refreshAccounts = async () => {
      accounts = await api('/api/accounts');
      totalValuation = 0;
      accounts.forEach(a => totalValuation += a.current_balance);
      const gridWrap = $('#acct-grid-container');
      if (gridWrap) gridWrap.innerHTML = renderGrid(accounts);
      bindAcctActions();
    };

    function bindAcctActions() {
      $$('.btn-acct-stmt').forEach(b => {
        b.onclick = () => openAccountStatementModal(Number(b.dataset.id));
      });
      $$('.btn-acct-edit').forEach(b => {
        b.onclick = () => {
          const acct = accounts.find(a => a.id === Number(b.dataset.id));
          openAddAccountModal(acct, refreshAccounts);
        };
      });
      $$('.btn-acct-del').forEach(b => {
        b.onclick = async () => {
          if (confirm('Delete this account?')) {
            await api('/api/accounts/' + b.dataset.id, { method: 'DELETE' });
            showToast('Account deleted', 'success');
            refreshAccounts();
          }
        };
      });
    }

    const addAcctBtn = $('#btn-add-acct');
    if (addAcctBtn) addAcctBtn.onclick = () => openAddAccountModal(null, refreshAccounts);

    const depBtn = $('#btn-deposit-capital');
    if (depBtn) depBtn.onclick = () => openDepositModal(accounts, refreshAccounts);

    const withBtn = $('#btn-withdraw-capital');
    if (withBtn) withBtn.onclick = () => openWithdrawModal(accounts, refreshAccounts);

    const xferBtn = $('#btn-transfer-funds');
    if (xferBtn) xferBtn.onclick = () => openTransferModal(accounts, refreshAccounts);

    bindAcctActions();
  }

  function openAddAccountModal(acct, onSuccess) {
    const isEdit = !!acct;
    const bodyHtml =
      '<div style="display:flex; flex-direction:column; gap:10px;">' +
        '<div class="field"><label>Account Name *</label><input type="text" id="am-name" value="' + (isEdit ? acct.name : '') + '" placeholder="e.g. Cash at Shop / DBBL Bank"></div>' +
        '<div class="form-row">' +
          '<div class="field"><label>Type</label><select id="am-type"><option value="cash" ' + (isEdit && acct.type === 'cash' ? 'selected' : '') + '>Cash Location</option><option value="bank" ' + (isEdit && acct.type === 'bank' ? 'selected' : '') + '>Bank Account</option><option value="other" ' + (isEdit && acct.type === 'other' ? 'selected' : '') + '>Other</option></select></div>' +
          '<div class="field"><label>Account / Ref Number</label><input type="text" id="am-no" value="' + (isEdit ? acct.account_number || '' : '') + '" placeholder="e.g. 110.120.9988"></div>' +
        '</div>' +
        '<div class="field"><label>Opening Balance (৳)</label><input type="number" id="am-open-bal" step="any" value="' + (isEdit ? acct.opening_balance : 0) + '"></div>' +
      '</div>';

    const footerHtml =
      '<button class="btn" id="btn-am-save">' + (isEdit ? 'Update Account' : 'Create Account') + '</button>' +
      '<button class="btn secondary modal-cancel-btn">Cancel</button>';

    openModal(isEdit ? 'Edit Account' : 'New Capital / Cash Account', bodyHtml, footerHtml);

    const saveAmBtn = $('#btn-am-save');
    if (saveAmBtn) {
      saveAmBtn.onclick = async () => {
        const name = $('#am-name').value.trim();
        if (!name) return showToast('Account name is required', 'error');

        const payload = {
          name,
          type: $('#am-type').value,
          account_number: $('#am-no').value,
          opening_balance: Number($('#am-open-bal').value) || 0,
        };

        if (isEdit) {
          await api('/api/accounts/' + acct.id, { method: 'PUT', body: JSON.stringify(payload) });
          showToast('Account updated', 'success');
        } else {
          await api('/api/accounts', { method: 'POST', body: JSON.stringify(payload) });
          showToast('Account created', 'success');
        }
        closeModal();
        if (onSuccess) onSuccess();
      };
    }
  }

  function openDepositModal(accounts, onSuccess) {
    const bodyHtml =
      '<div style="display:flex; flex-direction:column; gap:10px;">' +
        '<div class="field"><label>Deposit To Account *</label><select id="dep-acct-id">' + accounts.map(a => '<option value="' + a.id + '">' + a.name + ' (' + a.type + ') — Bal: ৳' + a.current_balance + '</option>').join('') + '</select></div>' +
        '<div class="field"><label>Date</label><input type="date" id="dep-date" value="' + todayStr() + '"></div>' +
        '<div class="field"><label>Deposit Amount (৳) *</label><input type="number" id="dep-amount" min="0.01" step="any" placeholder="0.00"></div>' +
        '<div class="field"><label>Note / Source</label><input type="text" id="dep-note" placeholder="e.g. Owner capital injection"></div>' +
      '</div>';

    const footerHtml =
      '<button class="btn green" id="btn-dep-save">Record Deposit</button>' +
      '<button class="btn secondary modal-cancel-btn">Cancel</button>';

    openModal('📥 Deposit Capital / Cash', bodyHtml, footerHtml);

    const saveDepBtn = $('#btn-dep-save');
    if (saveDepBtn) {
      saveDepBtn.onclick = async () => {
        const amount = Number($('#dep-amount').value) || 0;
        const account_id = Number($('#dep-acct-id').value);
        if (!account_id || amount <= 0) return showToast('Account and positive amount required', 'error');

        await api('/api/accounts/deposit', {
          method: 'POST',
          body: JSON.stringify({
            account_id,
            amount,
            date: $('#dep-date').value,
            note: $('#dep-note').value,
          }),
        });

        showToast('Capital deposited successfully', 'success');
        closeModal();
        if (onSuccess) onSuccess();
      };
    }
  }

  function openWithdrawModal(accounts, onSuccess) {
    const bodyHtml =
      '<div style="display:flex; flex-direction:column; gap:10px;">' +
        '<div class="field"><label>Withdraw From Account *</label><select id="with-acct-id">' + accounts.map(a => '<option value="' + a.id + '">' + a.name + ' (' + a.type + ') — Bal: ৳' + a.current_balance + '</option>').join('') + '</select></div>' +
        '<div class="field"><label>Date</label><input type="date" id="with-date" value="' + todayStr() + '"></div>' +
        '<div class="field"><label>Withdrawal Amount (৳) *</label><input type="number" id="with-amount" min="0.01" step="any" placeholder="0.00"></div>' +
        '<div class="field"><label>Note / Purpose</label><input type="text" id="with-note" placeholder="e.g. Owner drawing"></div>' +
      '</div>';

    const footerHtml =
      '<button class="btn danger" id="btn-with-save">Record Withdrawal</button>' +
      '<button class="btn secondary modal-cancel-btn">Cancel</button>';

    openModal('📤 Withdraw Capital / Funds', bodyHtml, footerHtml);

    const saveWithBtn = $('#btn-with-save');
    if (saveWithBtn) {
      saveWithBtn.onclick = async () => {
        const amount = Number($('#with-amount').value) || 0;
        const account_id = Number($('#with-acct-id').value);
        if (!account_id || amount <= 0) return showToast('Account and positive amount required', 'error');

        await api('/api/accounts/withdraw', {
          method: 'POST',
          body: JSON.stringify({
            account_id,
            amount,
            date: $('#with-date').value,
            note: $('#with-note').value,
          }),
        });

        showToast('Withdrawal recorded successfully', 'success');
        closeModal();
        if (onSuccess) onSuccess();
      };
    }
  }

  function openTransferModal(accounts, onSuccess) {
    const bodyHtml =
      '<div style="display:flex; flex-direction:column; gap:10px;">' +
        '<div class="form-row">' +
          '<div class="field"><label>From Account (Debit) *</label><select id="xfer-from-id">' + accounts.map(a => '<option value="' + a.id + '">' + a.name + ' — Bal: ৳' + a.current_balance + '</option>').join('') + '</select></div>' +
          '<div class="field"><label>To Account (Credit) *</label><select id="xfer-to-id">' + accounts.map(a => '<option value="' + a.id + '">' + a.name + ' — Bal: ৳' + a.current_balance + '</option>').join('') + '</select></div>' +
        '</div>' +
        '<div class="field"><label>Date</label><input type="date" id="xfer-date" value="' + todayStr() + '"></div>' +
        '<div class="field"><label>Transfer Amount (৳) *</label><input type="number" id="xfer-amount" min="0.01" step="any" placeholder="0.00"></div>' +
        '<div class="field"><label>Note / Reference</label><input type="text" id="xfer-note" placeholder="e.g. Deposited shop cash to bank"></div>' +
      '</div>';

    const footerHtml =
      '<button class="btn" id="btn-xfer-save">Transfer Funds</button>' +
      '<button class="btn secondary modal-cancel-btn">Cancel</button>';

    openModal('🔀 Internal Fund Transfer', bodyHtml, footerHtml);

    const saveXferBtn = $('#btn-xfer-save');
    if (saveXferBtn) {
      saveXferBtn.onclick = async () => {
        const from_account_id = Number($('#xfer-from-id').value);
        const to_account_id = Number($('#xfer-to-id').value);
        const amount = Number($('#xfer-amount').value) || 0;

        if (!from_account_id || !to_account_id || from_account_id === to_account_id || amount <= 0) {
          return showToast('Distinct source and target accounts with positive amount required', 'error');
        }

        await api('/api/accounts/transfer', {
          method: 'POST',
          body: JSON.stringify({
            from_account_id,
            to_account_id,
            amount,
            date: $('#xfer-date').value,
            note: $('#xfer-note').value,
          }),
        });

        showToast('Fund transfer completed successfully', 'success');
        closeModal();
        if (onSuccess) onSuccess();
      };
    }
  }

  async function openAccountStatementModal(acctId) {
    const data = await api('/api/accounts/' + acctId + '/statement');
    const acct = data.account;

    const bodyHtml =
      '<div>' +
        '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; background:#f8fafc; padding:10px 14px; border-radius:8px;">' +
          '<div><strong style="font-size:16px;">' + acct.name + '</strong> (' + acct.type + ')<br><span class="txt-muted">' + (acct.account_number ? 'Acct No: ' + acct.account_number : '') + ' | Opening Bal: ' + fmtTk(acct.opening_balance) + '</span></div>' +
          '<div style="text-align:right;"><div class="txt-muted" style="font-size:12px;">Current Balance</div><div class="value ' + (data.current_balance >= 0 ? 'txt-green' : 'txt-red') + '" style="font-size:20px; font-weight:bold;">' + fmtTk(data.current_balance) + '</div></div>' +
        '</div>' +

        (data.entries.length === 0 ? '<div class="empty">No transactions in this account yet</div>' :
          '<table><thead><tr><th>Date</th><th>Type</th><th>Note / Reference</th><th class="num">Inflow (+)</th><th class="num">Outflow (-)</th><th class="num">Balance</th></tr></thead><tbody>' +
            data.entries.map(e =>
              '<tr>' +
                '<td>' + e.date + '</td>' +
                '<td><span class="pill ' + (['deposit', 'transfer_in', 'sale_collection'].includes(e.type) ? 'green' : 'red') + '">' + e.type + '</span></td>' +
                '<td>' + (e.note || 'N/A') + '</td>' +
                '<td class="num">' + (e.debit > 0 ? fmtTk(e.debit) : '-') + '</td>' +
                '<td class="num">' + (e.credit > 0 ? fmtTk(e.credit) : '-') + '</td>' +
                '<td class="num"><strong>' + fmtTk(e.balance) + '</strong></td>' +
              '</tr>'
            ).join('') +
          '</tbody></table>'
        ) +
      '</div>';

    openModal('Account Statement — ' + acct.name, bodyHtml, '', true);
  }

  // ==========================================
  // 10. REPORTS & PROFIT LOSS VIEW
  // ==========================================
  async function renderReports(container) {
    let from = todayStr();
    let to = todayStr();

    const fetchAndRender = async () => {
      const r = await api('/api/reports?from=' + from + '&to=' + to);

      const reportBody = container.querySelector('#report-body');
      if (!reportBody) return;

      reportBody.innerHTML =
        '<div class="stat-grid">' +
          '<div class="stat blue"><div class="label">Total Sales Revenue</div><div class="value">' + fmtTk(r.sales.total) + '</div><div class="sub">' + r.sales.cnt + ' invoice(s) | Subtotal: ' + fmtTk(r.sales.subtotal) + ' | Disc: ' + fmtTk(r.sales.discount) + '</div></div>' +
          '<div class="stat amber"><div class="label">Cost of Goods Sold (COGS)</div><div class="value">' + fmtTk(r.cogs) + '</div><div class="sub">Cost basis of items sold</div></div>' +
          '<div class="stat green"><div class="label">Gross Profit</div><div class="value">' + fmtTk(r.gross_profit) + '</div><div class="sub">Revenue minus COGS</div></div>' +
          '<div class="stat red"><div class="label">Total Operating Expenses</div><div class="value">' + fmtTk(r.expenses_total) + '</div><div class="sub">Operating expenses in period</div></div>' +
          '<div class="stat ' + (r.net_profit >= 0 ? 'green' : 'red') + '" style="grid-column: span 2;"><div class="label">NET PROFIT / LOSS</div><div class="value" style="font-size:24px;">' + fmtTk(r.net_profit) + '</div><div class="sub">Gross Profit minus Total Expenses</div></div>' +
        '</div>' +

        '<div class="grid-2">' +
          '<div class="card">' +
            '<div class="card-head">🏆 Top Selling Products</div>' +
            '<div class="card-body flush">' +
              (r.top_products.length === 0 ? '<div class="empty">No sales data in range</div>' :
                '<table><thead><tr><th>Product</th><th class="num">Qty Sold</th><th class="num">Revenue</th><th class="num">Profit</th></tr></thead><tbody>' +
                  r.top_products.map(tp =>
                    '<tr><td><strong>' + tp.product_name + '</strong></td><td class="num">' + fmtNum(tp.qty) + ' ' + tp.unit + '</td><td class="num">' + fmtTk(tp.revenue) + '</td><td class="num txt-green"><strong>' + fmtTk(tp.profit) + '</strong></td></tr>'
                  ).join('') +
                '</tbody></table>'
              ) +
            '</div>' +
          '</div>' +

          '<div class="card">' +
            '<div class="card-head">💸 Expense Breakdown</div>' +
            '<div class="card-body flush">' +
              (r.expenses_by_category.length === 0 ? '<div class="empty">No expenses logged in range</div>' :
                '<table><thead><tr><th>Category</th><th class="num">Amount</th></tr></thead><tbody>' +
                  r.expenses_by_category.map(ec =>
                    '<tr><td><span class="pill gray">' + ec.category + '</span></td><td class="num txt-red"><strong>' + fmtTk(ec.amount) + '</strong></td></tr>'
                  ).join('') +
                '</tbody></table>'
              ) +
            '</div>' +
          '</div>' +
        '</div>';
    };

    container.innerHTML =
      '<div class="page-head">' +
        '<div><div class="page-title">Reports &amp; Profit / Loss</div><div class="page-sub">Financial metrics, profit calculation, and sales analytics</div></div>' +
        '<div class="toolbar">' +
          '<button class="btn sm secondary btn-rpt-preset" data-preset="today">Today</button>' +
          '<button class="btn sm secondary btn-rpt-preset" data-preset="month">This Month</button>' +
          '<input type="date" id="rpt-from" value="' + from + '"><span>to</span><input type="date" id="rpt-to" value="' + to + '">' +
          '<button class="btn secondary" id="btn-rpt-filter">Generate Report</button>' +
        '</div>' +
      '</div>' +
      '<div id="report-body"><div class="empty">Loading report...</div></div>';

    $$('.btn-rpt-preset').forEach(b => {
      b.onclick = () => {
        const preset = b.dataset.preset;
        const now = new Date();
        if (preset === 'today') {
          from = todayStr();
          to = todayStr();
        } else if (preset === 'month') {
          from = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-01';
          to = todayStr();
        }
        if ($('#rpt-from')) $('#rpt-from').value = from;
        if ($('#rpt-to')) $('#rpt-to').value = to;
        fetchAndRender();
      };
    });

    const rptFilterBtn = $('#btn-rpt-filter');
    if (rptFilterBtn) {
      rptFilterBtn.onclick = () => {
        from = ($('#rpt-from') && $('#rpt-from').value) || todayStr();
        to = ($('#rpt-to') && $('#rpt-to').value) || todayStr();
        fetchAndRender();
      };
    }

    fetchAndRender();
  }

  // App Initialization Handler
  async function initApp() {
    initClock();
    initRouter();
    const authenticated = await checkAuth();
    if (authenticated) {
      switchView('dashboard');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();
