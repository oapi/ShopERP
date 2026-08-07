/**
 * CoreTrade ERP — Islam Enterprise
 * Quality Materials, Lasting Trust
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
    tableState: {
      products: { page: 1, limit: 10, search: '', category: '', sort_by: 'name', sort_dir: 'ASC', selected: [] },
      sales: { page: 1, limit: 10, search: '', from: '', to: '', sale_type: '', sort_by: 'date', sort_dir: 'DESC', selected: [] },
      purchases: { page: 1, limit: 10, search: '', from: '', to: '', sort_by: 'date', sort_dir: 'DESC', selected: [] },
      customers: { page: 1, limit: 10, search: '', type: '', sort_by: 'name', sort_dir: 'ASC', selected: [] },
      suppliers: { page: 1, limit: 10, search: '', sort_by: 'name', sort_dir: 'ASC', selected: [] },
      expenses: { page: 1, limit: 10, search: '', category: '', from: '', to: '', sort_by: 'date', sort_dir: 'DESC', selected: [] },
    },
    settings: {
      business_name: 'Islam Enterprise',
      business_address: 'Main Road, Shop #12',
      business_phone: '01700-000000',
      business_tagline: 'Quality Materials, Lasting Trust',
      currency_symbol: '৳',
      timezone_date_format: 'YYYY-MM-DD',
      low_stock_threshold: '100',
    },
  };

  const VALID_VIEWS = ['dashboard', 'pos', 'sales', 'purchases', 'products', 'customers', 'suppliers', 'expenses', 'accounts', 'reports', 'settings'];

  function savePOSState() {
    try {
      const data = {
        posCart: state.posCart,
        posCustomer: state.posCustomer,
        posSaleType: state.posSaleType,
        posDiscount: state.posDiscount,
        posPaid: state.posPaid,
        posAccount: state.posAccount,
        posNote: state.posNote,
      };
      localStorage.setItem('ie_pos_state', JSON.stringify(data));
    } catch (e) { }
  }

  function loadPOSState() {
    try {
      const saved = localStorage.getItem('ie_pos_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.posCart)) state.posCart = parsed.posCart;
        if (parsed.posCustomer) state.posCustomer = parsed.posCustomer;
        if (parsed.posSaleType) state.posSaleType = parsed.posSaleType;
        if (typeof parsed.posDiscount === 'number') state.posDiscount = parsed.posDiscount;
        if (typeof parsed.posPaid === 'number') state.posPaid = parsed.posPaid;
        if (parsed.posAccount) state.posAccount = parsed.posAccount;
        if (typeof parsed.posNote === 'string') state.posNote = parsed.posNote;
      }
    } catch (e) { }
  }

  function clearPOSState() {
    state.posCart = [];
    state.posCustomer = null;
    state.posSaleType = 'retail';
    state.posDiscount = 0;
    state.posPaid = 0;
    state.posAccount = null;
    state.posNote = '';
    try {
      localStorage.removeItem('ie_pos_state');
    } catch (e) { }
  }

  // Helper Utilities
  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => Array.from(parent.querySelectorAll(selector));

  const fmtTk = (amt) => {
    const val = Number(amt) || 0;
    const sym = (state.settings && state.settings.currency_symbol) || '৳';
    return sym + val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const escHtml = (str) => {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const ICON_EXPORT_CSV = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
  const ICON_IMPORT_CSV = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>';

  async function fetchSettings() {
    try {
      const res = await api('/api/settings');
      if (res && typeof res === 'object') {
        state.settings = { ...state.settings, ...res };
        applyBrandingDOM();
      }
    } catch (e) { }
  }

  function applyBrandingDOM() {
    const s = state.settings || {};
    const bName = s.business_name || 'Islam Enterprise';
    const bTagline = s.business_tagline || 'Quality Materials, Lasting Trust';
    const bLogo = s.business_logo || '/islamEnterprise_logo.png';

    const topbarTitleEl = $('.topbar-title') || $('#topbar-title');
    if (topbarTitleEl) topbarTitleEl.textContent = bName;

    const topbarLogoImg = $('.topbar-logo-img');
    if (topbarLogoImg) topbarLogoImg.src = bLogo;

    const brandLogoImg = $('.brand-logo-img');
    if (brandLogoImg) brandLogoImg.src = bLogo;

    const brandNameEl = $('.brand-name');
    if (brandNameEl) brandNameEl.textContent = bName;

    const brandSubEl = $('.brand-sub');
    if (brandSubEl) brandSubEl.textContent = bTagline;

    const loginLogoImg = $('.login-logo-img');
    if (loginLogoImg) loginLogoImg.src = bLogo;

    document.title = bName + ' — CoreTrade ERP';
  }

  // Table Helpers for Server-Side Pagination, Sorting & Filtering
  function buildTableQuery(viewName) {
    const ts = state.tableState[viewName];
    if (!ts) return '';
    const params = new URLSearchParams();
    if (ts.page) params.set('page', ts.page);
    if (ts.limit) params.set('limit', ts.limit);
    if (ts.search) params.set('search', ts.search);
    if (ts.sort_by) params.set('sort_by', ts.sort_by);
    if (ts.sort_dir) params.set('sort_dir', ts.sort_dir);

    if (ts.category) params.set('category', ts.category);
    if (ts.type) params.set('type', ts.type);
    if (ts.sale_type) params.set('sale_type', ts.sale_type);
    if (ts.from) params.set('from', ts.from);
    if (ts.to) params.set('to', ts.to);

    return '?' + params.toString();
  }

  function renderSortHeader(viewName, colKey, label, classNames = '') {
    const ts = state.tableState[viewName] || {};
    const isActive = ts.sort_by === colKey;
    const dir = ts.sort_dir || 'ASC';
    const icon = !isActive ? '↕' : (dir === 'ASC' ? '▲' : '▼');
    return '<th class="sortable ' + classNames + ' ' + (isActive ? 'active-sort' : '') + '" data-sort-col="' + colKey + '">' + label + ' <span class="sort-icon">' + icon + '</span></th>';
  }

  function bindTableSortHeaders(container, viewName, onRefresh) {
    const sortables = $$('th.sortable', container);
    sortables.forEach(th => {
      th.onclick = () => {
        const col = th.dataset.sortCol;
        if (!col) return;
        const ts = state.tableState[viewName];
        if (ts.sort_by === col) {
          ts.sort_dir = ts.sort_dir === 'ASC' ? 'DESC' : 'ASC';
        } else {
          ts.sort_by = col;
          ts.sort_dir = 'ASC';
        }
        ts.page = 1;
        onRefresh();
      };
    });
  }

  function renderBulkActionsBarHTML(viewName, entityLabel) {
    const ts = state.tableState[viewName];
    if (!ts || !Array.isArray(ts.selected) || ts.selected.length === 0) return '';
    const count = ts.selected.length;
    return '' +
      '<div class="bulk-actions-bar">' +
      '<div class="bulk-actions-info">✓ <strong>' + count + '</strong> ' + entityLabel + '(s) selected</div>' +
      '<div class="toolbar">' +
      (isAdmin() ? '<button class="btn sm danger" id="btn-bulk-delete">🗑️ Delete Selected (' + count + ')</button>' : '<span class="txt-muted" style="font-size:12px;">Admin rights required for bulk delete</span>') +
      '<button class="btn sm secondary" id="btn-bulk-clear">Cancel Selection</button>' +
      '</div>' +
      '</div>';
  }

  function bindTableSelectionEvents(container, viewName, currentList, onRefresh) {
    const ts = state.tableState[viewName];
    if (!ts) return;
    if (!Array.isArray(ts.selected)) ts.selected = [];

    const selectAll = $('.select-all-checkbox', container);
    if (selectAll) {
      const allIds = currentList.map(item => item.id);
      const isAllChecked = allIds.length > 0 && allIds.every(id => ts.selected.includes(id));
      selectAll.checked = isAllChecked;

      selectAll.onchange = (e) => {
        if (e.target.checked) {
          allIds.forEach(id => {
            if (!ts.selected.includes(id)) ts.selected.push(id);
          });
        } else {
          ts.selected = ts.selected.filter(id => !allIds.includes(id));
        }
        onRefresh();
      };
    }

    $$('.row-checkbox', container).forEach(chk => {
      chk.onchange = (e) => {
        const id = Number(e.target.dataset.id);
        if (!id) return;
        if (e.target.checked) {
          if (!ts.selected.includes(id)) ts.selected.push(id);
        } else {
          ts.selected = ts.selected.filter(i => i !== id);
        }
        onRefresh();
      };
    });

    const clearBtn = $('#btn-bulk-clear', container);
    if (clearBtn) {
      clearBtn.onclick = () => {
        ts.selected = [];
        onRefresh();
      };
    }

    const deleteBtn = $('#btn-bulk-delete', container);
    if (deleteBtn) {
      deleteBtn.onclick = async () => {
        const count = ts.selected.length;
        if (count === 0) return;
        if (confirm(`⚠️ Are you sure you want to delete ${count} selected item(s)? This action cannot be undone.`)) {
          try {
            const res = await api('/api/bulk-delete/' + viewName, {
              method: 'POST',
              body: JSON.stringify({ ids: ts.selected })
            });
            showToast(res.message || `Deleted ${count} items`, 'success');
            ts.selected = [];
            onRefresh();
          } catch (e) {
            // Error toast handled by api()
          }
        }
      };
    }
  }

  function renderPaginationFooterHTML(res) {
    if (!res || typeof res !== 'object' || Array.isArray(res)) {
      return '';
    }
    const { page, limit, total, total_pages } = res;
    if (total === undefined) return '';

    const start = total === 0 ? 0 : (page - 1) * limit + 1;
    const end = Math.min(page * limit, total);

    let pageBtns = '';
    const maxBtns = 5;
    let startPage = Math.max(1, page - Math.floor(maxBtns / 2));
    let endPage = Math.min(total_pages, startPage + maxBtns - 1);
    if (endPage - startPage + 1 < maxBtns) {
      startPage = Math.max(1, endPage - maxBtns + 1);
    }

    pageBtns += '<button class="page-btn btn-page-nav" data-page="1" ' + (page <= 1 ? 'disabled' : '') + ' title="First Page">⏮</button>';
    pageBtns += '<button class="page-btn btn-page-nav" data-page="' + (page - 1) + '" ' + (page <= 1 ? 'disabled' : '') + ' title="Previous Page">◀</button>';

    for (let i = startPage; i <= endPage; i++) {
      pageBtns += '<button class="page-btn btn-page-nav ' + (i === page ? 'active' : '') + '" data-page="' + i + '">' + i + '</button>';
    }

    pageBtns += '<button class="page-btn btn-page-nav" data-page="' + (page + 1) + '" ' + (page >= total_pages ? 'disabled' : '') + ' title="Next Page">▶</button>';
    pageBtns += '<button class="page-btn btn-page-nav" data-page="' + total_pages + '" ' + (page >= total_pages ? 'disabled' : '') + ' title="Last Page">⏭</button>';

    return '' +
      '<div class="pagination-bar">' +
      '<div class="pagination-info">Showing <strong>' + start + '-' + end + '</strong> of <strong>' + fmtNum(total) + '</strong> records</div>' +
      '<div class="pagination-controls">' +
      '<div>Rows per page: ' +
      '<select class="rows-per-page-select">' +
      [10, 25, 50, 100].map(opt => '<option value="' + opt + '" ' + (limit === opt ? 'selected' : '') + '>' + opt + '</option>').join('') +
      '</select>' +
      '</div>' +
      '<div class="pagination-btns">' + pageBtns + '</div>' +
      '</div>' +
      '</div>';
  }

  function bindPaginationEvents(container, viewName, onRefresh) {
    const ts = state.tableState[viewName];
    if (!ts) return;

    $$('.btn-page-nav', container).forEach(btn => {
      btn.onclick = () => {
        const p = parseInt(btn.dataset.page, 10);
        if (p && p !== ts.page) {
          ts.page = p;
          onRefresh();
        }
      };
    });

    const rowsSelect = $('.rows-per-page-select', container);
    if (rowsSelect) {
      rowsSelect.onchange = () => {
        const l = parseInt(rowsSelect.value, 10);
        if (l) {
          ts.limit = l;
          ts.page = 1;
          onRefresh();
        }
      };
    }
  }

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
            a.download = 'coretrade_erp_backup_' + todayStr() + '.db';
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

    const displayName = state.user.username || 'user';

    topbarUser.innerHTML =
      '<span>👤 <strong>' + displayName.charAt(0).toUpperCase() + displayName.slice(1) + '</strong></span>' +
      '<button class="btn sm secondary" id="btn-logout" style="margin-left: 8px;">Sign Out</button>';

    const logoutBtn = $('#btn-logout');
    if (logoutBtn) logoutBtn.onclick = logout;
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
      api('/api/auth/logout', { method: 'POST' }).catch(() => { });
    }
    state.token = '';
    state.user = null;
    localStorage.removeItem('ie_token');
    localStorage.removeItem('ie_current_view');
    clearPOSState();
    renderUserTopbar();
    showLoginScreen();
  }

  // Mobile Sidebar Drawer Controller
  function initMobileSidebar() {
    const menuToggle = $('#btn-menu-toggle');
    const sidebar = $('#sidebar');
    const backdrop = $('#sidebar-backdrop');
    const sidebarClose = $('#btn-sidebar-close');

    const openSidebar = () => {
      if (sidebar) sidebar.classList.add('active');
      if (backdrop) backdrop.classList.add('active');
    };

    const closeSidebar = () => {
      if (sidebar) sidebar.classList.remove('active');
      if (backdrop) backdrop.classList.remove('active');
    };

    if (menuToggle) menuToggle.onclick = openSidebar;
    if (sidebarClose) sidebarClose.onclick = closeSidebar;
    if (backdrop) backdrop.onclick = closeSidebar;

    $$('#nav .nav-btn').forEach((btn) => {
      btn.addEventListener('click', closeSidebar);
    });
  }

  // Router & Navigation
  function initRouter() {
    initMobileSidebar();
    const nav = $('#nav');
    if (!nav) return;
    nav.addEventListener('click', (e) => {
      const btn = e.target.closest('.nav-btn');
      if (!btn) return;
      const view = btn.dataset.view;
      if (view) switchView(view);
    });

    window.addEventListener('hashchange', () => {
      const hashView = window.location.hash.replace(/^#/, '');
      if (hashView && VALID_VIEWS.includes(hashView) && hashView !== state.currentView) {
        switchView(hashView, {}, true);
      }
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

          const hashView = window.location.hash.replace(/^#/, '');
          const initialView = (hashView && VALID_VIEWS.includes(hashView))
            ? hashView
            : (localStorage.getItem('ie_current_view') || 'dashboard');
          switchView(initialView);
        } catch (err) {
          // Toast handled by api()
        }
      };
    }
  }

  function switchView(viewName, params = {}, skipHashUpdate = false) {
    if (!state.user) {
      showLoginScreen();
      return;
    }
    const targetView = VALID_VIEWS.includes(viewName) ? viewName : 'dashboard';
    state.currentView = targetView;
    try {
      localStorage.setItem('ie_current_view', targetView);
    } catch (e) { }

    if (!skipHashUpdate) {
      if (window.location.hash !== '#' + targetView) {
        window.location.hash = '#' + targetView;
      }
    }

    $$('.nav-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.view === targetView);
    });
    renderView(targetView, params);
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
        case 'settings':
          await renderSettings(main);
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

      // Receivables & Payables Notification Center Widget
      '<div class="due-notifications-container">' +
      '<div class="due-alert-card receivables">' +
      '<div class="due-card-header">' +
      '<div class="due-card-title">💵 Overdue Receivables (Customer Dues)</div>' +
      '<div class="due-card-total txt-red">' + fmtTk(data.customer_due_total) + '</div>' +
      '</div>' +
      '<div class="due-list-body">' +
      ((!data.customer_dues_list || data.customer_dues_list.length === 0)
        ? '<div class="empty">No customer dues pending! 🎉</div>'
        : data.customer_dues_list.map(c =>
          '<div class="due-item-row">' +
          '<div>' +
          '<div class="due-item-name">' + c.name + '</div>' +
          '<div class="due-item-sub">📞 ' + (c.phone || 'No phone') + '</div>' +
          '</div>' +
          '<div class="due-item-right">' +
          '<div class="due-item-amount txt-red">' + fmtTk(c.due) + '</div>' +
          '<div class="due-actions">' +
          '<button class="btn sm secondary btn-cust-ledger" data-id="' + c.id + '" title="View Ledger">📖 Ledger</button>' +
          '<button class="btn sm green btn-collect-pay" data-id="' + c.id + '" data-name="' + (c.name || '').replace(/"/g, '&quot;') + '" title="Collect Payment">💵 Collect</button>' +
          '</div>' +
          '</div>' +
          '</div>'
        ).join('')
      ) +
      '</div>' +
      '</div>' +

      '<div class="due-alert-card payables">' +
      '<div class="due-card-header">' +
      '<div class="due-card-title">🚚 Outstanding Payables (Supplier Dues)</div>' +
      '<div class="due-card-total txt-amber">' + fmtTk(data.supplier_due_total) + '</div>' +
      '</div>' +
      '<div class="due-list-body">' +
      ((!data.supplier_dues_list || data.supplier_dues_list.length === 0)
        ? '<div class="empty">All supplier dues settled! 👍</div>'
        : data.supplier_dues_list.map(s =>
          '<div class="due-item-row">' +
          '<div>' +
          '<div class="due-item-name">' + s.name + '</div>' +
          '<div class="due-item-sub">📞 ' + (s.phone || 'No phone') + '</div>' +
          '</div>' +
          '<div class="due-item-right">' +
          '<div class="due-item-amount txt-amber">' + fmtTk(s.due) + '</div>' +
          '<div class="due-actions">' +
          '<button class="btn sm secondary btn-supp-ledger" data-id="' + s.id + '" title="View Ledger">📖 Ledger</button>' +
          '<button class="btn sm danger btn-make-pay" data-id="' + s.id + '" data-name="' + (s.name || '').replace(/"/g, '&quot;') + '" title="Make Payment">💸 Pay</button>' +
          '</div>' +
          '</div>' +
          '</div>'
        ).join('')
      ) +
      '</div>' +
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

    $$('.btn-cust-ledger').forEach(b => {
      b.onclick = () => openLedgerModal('customer', Number(b.dataset.id));
    });
    $$('.btn-collect-pay').forEach(b => {
      b.onclick = () => openPaymentModal('customer', Number(b.dataset.id), b.dataset.name, () => renderDashboard(container));
    });
    $$('.btn-supp-ledger').forEach(b => {
      b.onclick = () => openLedgerModal('supplier', Number(b.dataset.id));
    });
    $$('.btn-make-pay').forEach(b => {
      b.onclick = () => openPaymentModal('supplier', Number(b.dataset.id), b.dataset.name, () => renderDashboard(container));
    });
  }

  // ==========================================
  // 2. POS / NEW SALE VIEW
  // ==========================================
  async function renderPOS(container) {
    const [productsRes, customersRes, accounts] = await Promise.all([
      api('/api/products?limit=1000'),
      api('/api/customers?limit=1000'),
      api('/api/accounts'),
    ]);
    const products = Array.isArray(productsRes) ? productsRes : (productsRes.data || []);
    const customers = Array.isArray(customersRes) ? customersRes : (customersRes.data || []);
    state.products = products;
    state.customers = customers;
    state.accounts = accounts;

    const curSym = (state.settings && state.settings.currency_symbol) || '৳';

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
        escHtml(p.name) + ' ' + (p.brand ? '[' + escHtml(p.brand) + ']' : '') + ' ' + (p.size ? '(' + escHtml(p.size) + ')' : '') + ' — Stock: ' + p.stock_qty + ' ' + escHtml(p.unit) + ' | Retail: ' + fmtTk(p.retail_price) + ' | Wholesale: ' + fmtTk(p.wholesale_price) +
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
      '<th style="width: 120px;" class="num">Unit Price (' + curSym + ')</th>' +
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
        escHtml(c.name) + ' (' + escHtml(c.type) + ') ' + (c.phone ? '— ' + escHtml(c.phone) : '') + ' | Due: ' + fmtTk(c.balance) +
        '</option>'
      ).join('') +
      '</select>' +
      '</div>' +

      '<div class="field">' +
      '<label>Deposit Payment To Account</label>' +
      '<select id="pos-account-select">' +
      accounts.map(a => '<option value="' + a.id + '" ' + (state.posAccount === a.id ? 'selected' : '') + '>' + escHtml(a.name) + ' (' + escHtml(a.type) + ') — Bal: ' + fmtTk(a.current_balance) + '</option>').join('') +
      '</select>' +
      '</div>' +

      '<hr style="border:0; border-top:1px solid var(--border); margin:14px 0;">' +

      '<div class="pos-total-row"><span>Subtotal:</span><strong id="pos-subtotal-val">' + fmtTk(0) + '</strong></div>' +

      '<div class="field" style="margin-top: 8px;">' +
      '<label>Discount (' + curSym + ')</label>' +
      '<input type="number" id="pos-discount" min="0" step="any" value="' + state.posDiscount + '">' +
      '</div>' +

      '<div class="pos-total-row grand"><span>Grand Total:</span><span id="pos-total-val" class="txt-blue">' + fmtTk(0) + '</span></div>' +

      '<div class="field" style="margin-top: 10px;">' +
      '<label>Amount Paid (' + curSym + ')</label>' +
      '<input type="number" id="pos-paid" min="0" step="any" value="' + state.posPaid + '">' +
      '</div>' +

      '<div class="pos-total-row" style="margin-top: 6px;"><span>Due Balance:</span><span id="pos-due-val" class="pos-due">' + fmtTk(0) + '</span></div>' +

      '<div class="field" style="margin-top: 10px;">' +
      '<label>Note / Remarks</label>' +
      '<input type="text" id="pos-note" placeholder="Optional invoice note" value="' + escHtml(state.posNote) + '">' +
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
          savePOSState();
        };
      });
      $$('.pos-cart-price').forEach(inp => {
        inp.onchange = (e) => {
          const idx = Number(e.target.dataset.idx);
          const newPrice = Math.max(0, Number(e.target.value) || 0);
          state.posCart[idx].unit_price = newPrice;
          updatePOSCartUI();
          savePOSState();
        };
      });
      $$('.btn-pos-remove').forEach(btn => {
        btn.onclick = () => {
          const idx = Number(btn.dataset.idx);
          state.posCart.splice(idx, 1);
          updatePOSCartUI();
          savePOSState();
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
        savePOSState();
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
        savePOSState();
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
        savePOSState();
      };
    }

    const accSel = $('#pos-account-select');
    if (accSel) {
      accSel.onchange = (e) => {
        const id = Number(e.target.value);
        state.posAccount = id || null;
        savePOSState();
      };
    }

    const addCustBtn = $('#btn-pos-add-customer');
    if (addCustBtn) {
      addCustBtn.onclick = () => {
        openAddCustomerModal(async (newCust) => {
          const freshCustsRes = await api('/api/customers?limit=1000');
          const freshCusts = Array.isArray(freshCustsRes) ? freshCustsRes : (freshCustsRes.data || []);
          state.customers = freshCusts;
          state.posCustomer = newCust;
          savePOSState();
          renderPOS(container);
        });
      };
    }

    const discInp = $('#pos-discount');
    if (discInp) {
      discInp.oninput = (e) => {
        state.posDiscount = Math.max(0, Number(e.target.value) || 0);
        updatePOSCartUI();
        savePOSState();
      };
    }

    const paidInp = $('#pos-paid');
    if (paidInp) {
      paidInp.oninput = (e) => {
        state.posPaid = Math.max(0, Number(e.target.value) || 0);
        updatePOSCartUI();
        savePOSState();
      };
    }

    const noteInp = $('#pos-note');
    if (noteInp) {
      noteInp.oninput = (e) => {
        state.posNote = e.target.value;
        savePOSState();
      };
    }

    const resetBtn = $('#btn-pos-reset');
    if (resetBtn) {
      resetBtn.onclick = () => {
        clearPOSState();
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
          clearPOSState();

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
    const ts = state.tableState.sales;

    const loadSalesData = async () => {
      const qStr = buildTableQuery('sales');
      const res = await api('/api/sales' + qStr);
      const list = Array.isArray(res) ? res : (res.data || []);

      const renderTable = () =>
        '<div class="card">' +
        renderBulkActionsBarHTML('sales', 'Sales Invoice') +
        '<div class="card-body flush">' +
        (list.length === 0 ? '<div class="empty">No sales records found</div>' :
          '<div class="table-responsive"><table><thead><tr>' +
          '<th style="width:36px;"><input type="checkbox" class="select-all-checkbox tbl-checkbox"></th>' +
          renderSortHeader('sales', 'date', 'Date') +
          renderSortHeader('sales', 'invoice_no', 'Invoice No') +
          renderSortHeader('sales', 'customer_name', 'Customer') +
          renderSortHeader('sales', 'sale_type', 'Type') +
          renderSortHeader('sales', 'total', 'Total', 'num') +
          renderSortHeader('sales', 'paid', 'Paid', 'num') +
          renderSortHeader('sales', 'due', 'Due', 'num') +
          '<th>Status</th><th>Actions</th></tr></thead><tbody>' +
          list.map(s => {
            const statusPill = s.due <= 0
              ? '<span class="pill green">Paid</span>'
              : s.paid > 0
                ? '<span class="pill amber">Partial</span>'
                : '<span class="pill red">Due</span>';
            const isChecked = ts.selected && ts.selected.includes(s.id);
            return '<tr>' +
              '<td><input type="checkbox" class="row-checkbox tbl-checkbox" data-id="' + s.id + '" ' + (isChecked ? 'checked' : '') + '></td>' +
              '<td>' + escHtml(s.date) + '</td>' +
              '<td><strong>' + escHtml(s.invoice_no) + '</strong></td>' +
              '<td>' + escHtml(s.customer_name) + '</td>' +
              '<td><span class="pill gray">' + escHtml(s.sale_type) + '</span></td>' +
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
          '</tbody></table></div>'
        ) +
        '</div>' +
        renderPaginationFooterHTML(res) +
        '</div>';

      const listWrap = $('#sales-list-container');
      if (listWrap) listWrap.innerHTML = renderTable();
      bindSalesActions();
      bindTableSortHeaders(container, 'sales', loadSalesData);
      bindTableSelectionEvents(container, 'sales', list, loadSalesData);
      bindPaginationEvents(container, 'sales', loadSalesData);
    };

    container.innerHTML =
      '<div class="page-head">' +
      '<div><div class="page-title">Sales Invoices</div><div class="page-sub">View and print past sales invoices</div></div>' +
      '<div class="toolbar">' +
      '<button class="btn secondary icon-btn" id="btn-export-sales" title="Export CSV">' + ICON_EXPORT_CSV + '</button>' +
      (isAdmin() ? '<button class="btn secondary icon-btn" id="btn-import-sales" title="Import CSV">' + ICON_IMPORT_CSV + '</button>' : '') +
      '<button class="btn" id="btn-new-sale">+ New Sale</button>' +
      '</div>' +
      '</div>' +

      '<div class="table-filter-bar">' +
      '<div class="filter-search-wrap"><input type="search" id="sales-search" value="' + ts.search + '" placeholder="🔍 Search invoice no or customer..."></div>' +
      '<div class="filter-controls-wrap">' +
      '<select id="sales-type-filter"><option value="">All Sale Types</option><option value="retail" ' + (ts.sale_type === 'retail' ? 'selected' : '') + '>Retail</option><option value="wholesale" ' + (ts.sale_type === 'wholesale' ? 'selected' : '') + '>Wholesale</option></select>' +
      '<div class="filter-date-group"><input type="date" id="sales-from" value="' + ts.from + '"><span class="txt-muted">to</span><input type="date" id="sales-to" value="' + ts.to + '"></div>' +
      '<button class="btn sm secondary" id="btn-sales-clear-filter">Reset Filters</button>' +
      '</div>' +
      '</div>' +

      '<div id="sales-list-container"></div>';

    function bindSalesActions() {
      $$('.btn-view-sale', container).forEach(b => {
        b.onclick = () => viewSaleModal(b.dataset.id);
      });
      $$('.btn-delete-sale', container).forEach(b => {
        b.onclick = async () => {
          if (confirm('Are you sure you want to delete invoice ' + b.dataset.inv + '? Inventory will be restored.')) {
            await api('/api/sales/' + b.dataset.id, { method: 'DELETE' });
            showToast('Invoice deleted and stock restored.', 'success');
            loadSalesData();
          }
        };
      });
    }

    let searchTimer = null;
    const searchInp = $('#sales-search', container);
    if (searchInp) {
      searchInp.oninput = (e) => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
          ts.search = e.target.value.trim();
          ts.page = 1;
          loadSalesData();
        }, 300);
      };
    }

    const typeFilter = $('#sales-type-filter', container);
    if (typeFilter) {
      typeFilter.onchange = (e) => {
        ts.sale_type = e.target.value;
        ts.page = 1;
        loadSalesData();
      };
    }

    const fromInp = $('#sales-from', container);
    if (fromInp) {
      fromInp.onchange = (e) => {
        ts.from = e.target.value;
        ts.page = 1;
        loadSalesData();
      };
    }

    const toInp = $('#sales-to', container);
    if (toInp) {
      toInp.onchange = (e) => {
        ts.to = e.target.value;
        ts.page = 1;
        loadSalesData();
      };
    }

    const clearFilterBtn = $('#btn-sales-clear-filter', container);
    if (clearFilterBtn) {
      clearFilterBtn.onclick = () => {
        ts.search = '';
        ts.sale_type = '';
        ts.from = '';
        ts.to = '';
        ts.page = 1;
        if (searchInp) searchInp.value = '';
        if (typeFilter) typeFilter.value = '';
        if (fromInp) fromInp.value = '';
        if (toInp) toInp.value = '';
        loadSalesData();
      };
    }

    const expBtn = $('#btn-export-sales', container);
    if (expBtn) expBtn.onclick = () => exportCSV('sales');

    const impBtn = $('#btn-import-sales', container);
    if (impBtn) impBtn.onclick = () => openImportCSVModal('sales', 'Sales Invoices', loadSalesData);

    const newSaleBtn = $('#btn-new-sale', container);
    if (newSaleBtn) newSaleBtn.onclick = () => switchView('pos');

    await loadSalesData();
  }

  // View / Print Sale Modal
  async function viewSaleModal(saleId) {
    const sale = await api('/api/sales/' + saleId);
    const bName = (state.settings && state.settings.business_name) || 'ISLAM ENTERPRISE';
    const bTagline = (state.settings && state.settings.business_tagline) || 'Quality Materials, Lasting Trust';
    const bLogo = (state.settings && state.settings.business_logo) || '/islamEnterprise_logo.png';

    const bodyHtml =
      '<div style="font-size: 13px;">' +
      '<div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border); padding-bottom:12px; margin-bottom:14px;">' +
      '<div style="display:flex; align-items:center; gap:12px;">' +
      '<div style="background:#fff; padding:4px 8px; border-radius:6px; border:1px solid var(--border); shadow:var(--shadow-sm);">' +
      '<img src="' + bLogo + '" alt="Business Logo" style="height:36px; width:auto; object-fit:contain; display:block;">' +
      '</div>' +
      '<div>' +
      '<div style="font-size:15px; font-weight:700;">' + bName.toUpperCase() + '</div>' +
      '<div style="font-size:11px; color:var(--muted);">' + bTagline + '</div>' +
      '</div>' +
      '</div>' +
      '<div style="text-align:right;">' +
      '<div style="font-size:15px; font-weight:bold; color:var(--primary);">INVOICE</div>' +
      '<div><strong>Inv:</strong> ' + sale.invoice_no + '</div>' +
      '<div><strong>Date:</strong> ' + sale.date + '</div>' +
      '</div>' +
      '</div>' +

      '<div style="margin-bottom:12px; display:flex; justify-content:space-between; flex-wrap:wrap; gap:8px;">' +
      '<div><strong>Customer:</strong> ' + sale.customer_name + ' | <strong>Type:</strong> ' + sale.sale_type.toUpperCase() + '</div>' +
      '<div><strong>Status:</strong> ' + (sale.total - sale.paid <= 0 ? '<span class="pill green">Paid</span>' : '<span class="pill red">Due: ' + fmtTk(sale.total - sale.paid) + '</span>') + '</div>' +
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
    const bName = (state.settings && state.settings.business_name) || 'ISLAM ENTERPRISE';
    const bTagline = (state.settings && state.settings.business_tagline) || 'Quality Materials, Lasting Trust';
    const bPhone = (state.settings && state.settings.business_phone) || '01700-000000';
    const bAddress = (state.settings && state.settings.business_address) || 'Main Road, Shop #12';
    const bLogo = (state.settings && state.settings.business_logo) || '/islamEnterprise_logo.png';
    const curSym = (state.settings && state.settings.currency_symbol) || '৳';

    printArea.innerHTML =
      '<div class="invoice">' +
      '<div class="invoice-head">' +
      '<div style="display:flex; align-items:center; gap:14px;">' +
      '<div style="background:#fff; padding:4px 8px; border-radius:6px; border:1px solid #ccc; display:inline-block;">' +
      '<img src="' + bLogo + '" alt="Business Logo" style="height:48px; width:auto; object-fit:contain; display:block;">' +
      '</div>' +
      '<div>' +
      '<h1 style="margin:0; font-size:20px; color:#000;">' + escHtml(bName.toUpperCase()) + '</h1>' +
      '<div style="font-size:12px; color:#444; margin-top:2px;">' + escHtml(bTagline) + '</div>' +
      '<div style="font-size:11px; color:#666; margin-top:2px;">Phone: ' + escHtml(bPhone) + ' | Address: ' + escHtml(bAddress) + '</div>' +
      '</div>' +
      '</div>' +
      '<div style="text-align:right;">' +
      '<h2 style="margin:0; font-size:18px; color:#000;">INVOICE</h2>' +
      '<div><strong>Inv No:</strong> ' + escHtml(sale.invoice_no) + '</div>' +
      '<div><strong>Date:</strong> ' + escHtml(sale.date) + '</div>' +
      '</div>' +
      '</div>' +

      '<div style="margin-bottom: 14px;"><strong>Bill To:</strong> ' + escHtml(sale.customer_name) + '<br><strong>Type:</strong> ' + escHtml(sale.sale_type.toUpperCase()) + '</div>' +

      '<table><thead><tr><th>#</th><th>Description</th><th>Qty</th><th>Unit</th><th>Rate (' + curSym + ')</th><th>Amount (' + curSym + ')</th></tr></thead><tbody>' +
      sale.items.map((it, i) =>
        '<tr><td>' + (i + 1) + '</td><td>' + escHtml(it.product_name) + '</td><td style="text-align:right;">' + fmtNum(it.qty) + '</td><td>' + escHtml(it.unit) + '</td><td style="text-align:right;">' + fmtNum(it.unit_price) + '</td><td style="text-align:right;">' + fmtNum(it.line_total) + '</td></tr>'
      ).join('') +
      '</tbody></table>' +

      '<table class="totals">' +
      '<tr><td>Subtotal:</td><td style="text-align:right;">' + fmtTk(sale.subtotal) + '</td></tr>' +
      (sale.discount > 0 ? '<tr><td>Discount:</td><td style="text-align:right;">-' + fmtTk(sale.discount) + '</td></tr>' : '') +
      '<tr><td><strong>Grand Total:</strong></td><td style="text-align:right;"><strong>' + fmtTk(sale.total) + '</strong></td></tr>' +
      '<tr><td>Paid Amount:</td><td style="text-align:right;">' + fmtTk(sale.paid) + '</td></tr>' +
      '<tr><td><strong>Balance Due:</strong></td><td style="text-align:right;"><strong>' + fmtTk(sale.total - sale.paid) + '</strong></td></tr>' +
      '</table>' +

      (sale.note ? '<div style="margin-top:10px; font-style:italic;">Note: ' + escHtml(sale.note) + '</div>' : '') +

      '<div class="sign"><div>Customer Signature</div><div>Authorized Signature</div></div>' +
      '</div>';
    window.print();
  }

  // ==========================================
  // 4. PURCHASES VIEW
  // ==========================================
  async function renderPurchases(container) {
    const ts = state.tableState.purchases;

    const loadPurchasesData = async () => {
      const qStr = buildTableQuery('purchases');
      const res = await api('/api/purchases' + qStr);
      const list = Array.isArray(res) ? res : (res.data || []);

      const renderTable = () =>
        '<div class="card">' +
        renderBulkActionsBarHTML('purchases', 'Purchase Record') +
        '<div class="card-body flush">' +
        (list.length === 0 ? '<div class="empty">No purchase records found</div>' :
          '<div class="table-responsive"><table><thead><tr>' +
          '<th style="width:36px;"><input type="checkbox" class="select-all-checkbox tbl-checkbox"></th>' +
          renderSortHeader('purchases', 'date', 'Date') +
          renderSortHeader('purchases', 'ref_no', 'Ref No') +
          renderSortHeader('purchases', 'supplier_name', 'Supplier') +
          renderSortHeader('purchases', 'total', 'Total Cost', 'num') +
          renderSortHeader('purchases', 'paid', 'Paid', 'num') +
          renderSortHeader('purchases', 'due', 'Due', 'num') +
          '<th>Actions</th></tr></thead><tbody>' +
          list.map(pu => {
            const isChecked = ts.selected && ts.selected.includes(pu.id);
            return '<tr>' +
              '<td><input type="checkbox" class="row-checkbox tbl-checkbox" data-id="' + pu.id + '" ' + (isChecked ? 'checked' : '') + '></td>' +
              '<td>' + escHtml(pu.date) + '</td>' +
              '<td><strong>' + escHtml(pu.ref_no || ('PUR-' + pu.id)) + '</strong></td>' +
              '<td>' + escHtml(pu.supplier_name || 'N/A') + '</td>' +
              '<td class="num">' + fmtTk(pu.total) + '</td>' +
              '<td class="num">' + fmtTk(pu.paid) + '</td>' +
              '<td class="num ' + (pu.due > 0 ? 'txt-red' : 'txt-green') + '">' + fmtTk(pu.due) + '</td>' +
              '<td>' +
              '<button class="btn sm secondary btn-view-purchase" data-id="' + pu.id + '">Details</button> ' +
              (isAdmin() ? '<button class="btn sm danger btn-delete-purchase" data-id="' + pu.id + '">Delete</button>' : '') +
              '</td>' +
              '</tr>';
          }).join('') +
          '</tbody></table></div>'
        ) +
        '</div>' +
        renderPaginationFooterHTML(res) +
        '</div>';

      const wrap = $('#purchases-list-container');
      if (wrap) wrap.innerHTML = renderTable();
      bindPurchaseActions();
      bindTableSortHeaders(container, 'purchases', loadPurchasesData);
      bindTableSelectionEvents(container, 'purchases', list, loadPurchasesData);
      bindPaginationEvents(container, 'purchases', loadPurchasesData);
    };

    container.innerHTML =
      '<div class="page-head">' +
      '<div><div class="page-title">Purchases &amp; Stock In</div><div class="page-sub">Record incoming inventory from suppliers</div></div>' +
      '<div class="toolbar">' +
      '<button class="btn secondary icon-btn" id="btn-export-purchases" title="Export CSV">' + ICON_EXPORT_CSV + '</button>' +
      (isAdmin() ? '<button class="btn secondary icon-btn" id="btn-import-purchases" title="Import CSV">' + ICON_IMPORT_CSV + '</button>' : '') +
      '<button class="btn" id="btn-new-purchase">+ New Purchase</button>' +
      '</div>' +
      '</div>' +

      '<div class="table-filter-bar">' +
      '<div class="filter-search-wrap"><input type="search" id="purchases-search" value="' + ts.search + '" placeholder="🔍 Search ref no or supplier name..."></div>' +
      '<div class="filter-controls-wrap">' +
      '<div class="filter-date-group"><input type="date" id="purchases-from" value="' + ts.from + '"><span class="txt-muted">to</span><input type="date" id="purchases-to" value="' + ts.to + '"></div>' +
      '<button class="btn sm secondary" id="btn-purchases-clear-filter">Reset Filters</button>' +
      '</div>' +
      '</div>' +

      '<div id="purchases-list-container"></div>';

    function bindPurchaseActions() {
      $$('.btn-view-purchase', container).forEach(b => {
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

      $$('.btn-delete-purchase', container).forEach(b => {
        b.onclick = async () => {
          if (confirm('Delete this purchase? Stock quantity added by this purchase will be subtracted.')) {
            await api('/api/purchases/' + b.dataset.id, { method: 'DELETE' });
            showToast('Purchase deleted and stock updated.', 'success');
            loadPurchasesData();
          }
        };
      });
    }

    let searchTimer = null;
    const puSearch = $('#purchases-search', container);
    if (puSearch) {
      puSearch.oninput = (e) => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
          ts.search = e.target.value.trim();
          ts.page = 1;
          loadPurchasesData();
        }, 300);
      };
    }

    const puFrom = $('#purchases-from', container);
    if (puFrom) {
      puFrom.onchange = (e) => {
        ts.from = e.target.value;
        ts.page = 1;
        loadPurchasesData();
      };
    }

    const puTo = $('#purchases-to', container);
    if (puTo) {
      puTo.onchange = (e) => {
        ts.to = e.target.value;
        ts.page = 1;
        loadPurchasesData();
      };
    }

    const clearFilterBtn = $('#btn-purchases-clear-filter', container);
    if (clearFilterBtn) {
      clearFilterBtn.onclick = () => {
        ts.search = '';
        ts.from = '';
        ts.to = '';
        ts.page = 1;
        if (puSearch) puSearch.value = '';
        if (puFrom) puFrom.value = '';
        if (puTo) puTo.value = '';
        loadPurchasesData();
      };
    }

    const expPuBtn = $('#btn-export-purchases', container);
    if (expPuBtn) expPuBtn.onclick = () => exportCSV('purchases');

    const impPuBtn = $('#btn-import-purchases', container);
    if (impPuBtn) impPuBtn.onclick = () => openImportCSVModal('purchases', 'Purchases', loadPurchasesData);

    const newPuBtn = $('#btn-new-purchase', container);
    if (newPuBtn) newPuBtn.onclick = () => openNewPurchaseModal(loadPurchasesData);

    await loadPurchasesData();
  }

  async function openNewPurchaseModal(onSuccess) {
    const [productsRes, suppliersRes, accounts] = await Promise.all([
      api('/api/products?limit=1000'),
      api('/api/suppliers?limit=1000'),
      api('/api/accounts'),
    ]);
    const products = Array.isArray(productsRes) ? productsRes : (productsRes.data || []);
    const suppliers = Array.isArray(suppliersRes) ? suppliersRes : (suppliersRes.data || []);

    let purchaseItems = [];

    const curSym = (state.settings && state.settings.currency_symbol) || '৳';

    const bodyHtml =
      '<div style="display:flex; flex-direction:column; gap:12px;">' +
      '<div class="form-row">' +
      '<div class="field"><label>Supplier</label><select id="pu-supplier-id"><option value="">-- Cash Supplier / Unsaved --</option>' + suppliers.map(s => '<option value="' + s.id + '">' + escHtml(s.name) + '</option>').join('') + '</select></div>' +
      '<div class="field"><label>Ref / Voucher No</label><input type="text" id="pu-ref-no" placeholder="e.g. BSRM-9812"></div>' +
      '<div class="field"><label>Date</label><input type="date" id="pu-date" value="' + todayStr() + '"></div>' +
      '</div>' +

      '<div class="card card-body" style="background:#f8fafc;">' +
      '<div class="form-row" style="align-items:flex-end;">' +
      '<div class="field" style="flex:2;"><label>Product</label><select id="pu-prod-id"><option value="">-- Choose Product --</option>' + products.map(p => '<option value="' + p.id + '">' + escHtml(p.name) + ' (' + escHtml(p.brand || '') + ' ' + escHtml(p.size || '') + ') - Cost: ' + fmtTk(p.purchase_price) + '</option>').join('') + '</select></div>' +
      '<div class="field"><label>Qty</label><input type="number" id="pu-qty" min="0.01" step="any" value="10"></div>' +
      '<div class="field"><label>Unit Cost (' + curSym + ')</label><input type="number" id="pu-cost" min="0" step="any" value="0"></div>' +
      '<div class="field"><button class="btn" id="btn-pu-add-item">+ Add</button></div>' +
      '</div>' +
      '</div>' +

      '<table><thead><tr><th>Product</th><th class="num">Qty</th><th class="num">Unit Cost</th><th class="num">Line Total</th><th></th></tr></thead><tbody id="pu-items-tbody"><tr><td colspan="5" class="empty">No items added yet</td></tr></tbody></table>' +

      '<div class="form-row" style="margin-top:10px; align-items:center;">' +
      '<div class="field"><label>Pay From Account</label><select id="pu-account-id">' + accounts.map(a => '<option value="' + a.id + '">' + escHtml(a.name) + ' (' + escHtml(a.type) + ') — Bal: ' + fmtTk(a.current_balance) + '</option>').join('') + '</select></div>' +
      '<div class="field"><label>Amount Paid (' + curSym + ')</label><input type="number" id="pu-paid" min="0" step="any" value="0"></div>' +
      '<div class="field" style="text-align:right;"><div>Total Amount: <strong id="pu-total-label" style="font-size:18px;">' + fmtTk(0) + '</strong></div></div>' +
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
    const ts = state.tableState.products;

    const curSym = (state.settings && state.settings.currency_symbol) || '৳';

    const loadProductsData = async () => {
      const qStr = buildTableQuery('products');
      const res = await api('/api/products' + qStr);
      const list = Array.isArray(res) ? res : (res.data || []);

      const renderTable = () =>
        '<div class="card">' +
        renderBulkActionsBarHTML('products', 'Product') +
        '<div class="card-body flush">' +
        (list.length === 0 ? '<div class="empty">No products found</div>' :
          '<div class="table-responsive"><table><thead><tr>' +
          '<th style="width:36px;"><input type="checkbox" class="select-all-checkbox tbl-checkbox"></th>' +
          renderSortHeader('products', 'id', 'ID') +
          renderSortHeader('products', 'name', 'Product Name') +
          renderSortHeader('products', 'category', 'Category') +
          renderSortHeader('products', 'brand', 'Brand / Size') +
          renderSortHeader('products', 'unit', 'Unit') +
          renderSortHeader('products', 'purchase_price', 'Cost (' + curSym + ')', 'num') +
          renderSortHeader('products', 'retail_price', 'Retail (' + curSym + ')', 'num') +
          renderSortHeader('products', 'wholesale_price', 'Wholesale (' + curSym + ')', 'num') +
          renderSortHeader('products', 'stock_qty', 'Stock Qty', 'num') +
          renderSortHeader('products', 'low_stock_alert', 'Low Alert', 'num') +
          '<th>Actions</th></tr></thead><tbody>' +
          list.map(p => {
            const isChecked = ts.selected && ts.selected.includes(p.id);
            return '<tr>' +
              '<td><input type="checkbox" class="row-checkbox tbl-checkbox" data-id="' + p.id + '" ' + (isChecked ? 'checked' : '') + '></td>' +
              '<td>' + p.id + '</td>' +
              '<td><strong>' + escHtml(p.name) + '</strong></td>' +
              '<td><span class="pill gray">' + escHtml(p.category) + '</span></td>' +
              '<td>' + escHtml(p.brand || '') + ' ' + (p.size ? '(' + escHtml(p.size) + ')' : '') + '</td>' +
              '<td>' + escHtml(p.unit) + '</td>' +
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
              '</tr>';
          }).join('') +
          '</tbody></table></div>'
        ) +
        '</div>' +
        renderPaginationFooterHTML(res) +
        '</div>';

      const wrap = $('#prod-list-container');
      if (wrap) wrap.innerHTML = renderTable();
      bindProdActions();
      bindTableSortHeaders(container, 'products', loadProductsData);
      bindTableSelectionEvents(container, 'products', list, loadProductsData);
      bindPaginationEvents(container, 'products', loadProductsData);
    };

    container.innerHTML =
      '<div class="page-head">' +
      '<div><div class="page-title">Inventory &amp; Products</div><div class="page-sub">Manage product prices, stock, and alert limits</div></div>' +
      '<div class="toolbar">' +
      '<button class="btn secondary icon-btn" id="btn-export-prods" title="Export CSV">' + ICON_EXPORT_CSV + '</button>' +
      (isAdmin() ? '<button class="btn secondary icon-btn" id="btn-import-prods" title="Import CSV">' + ICON_IMPORT_CSV + '</button>' : '') +
      '<button class="btn" id="btn-add-product">+ Add Product</button>' +
      '</div>' +
      '</div>' +

      '<div class="table-filter-bar">' +
      '<div class="filter-search-wrap"><input type="search" id="prod-search" value="' + ts.search + '" placeholder="🔍 Search product name, brand, size..."></div>' +
      '<div class="filter-controls-wrap">' +
      '<select id="prod-cat-filter"><option value="">All Categories</option><option value="rod" ' + (ts.category === 'rod' ? 'selected' : '') + '>Rod</option><option value="cement" ' + (ts.category === 'cement' ? 'selected' : '') + '>Cement</option><option value="other" ' + (ts.category === 'other' ? 'selected' : '') + '>Other</option></select>' +
      '<button class="btn sm secondary" id="btn-prod-clear-filter">Reset Filters</button>' +
      '</div>' +
      '</div>' +

      '<div id="prod-list-container"></div>';

    function bindProdActions() {
      $$('.btn-edit-prod', container).forEach(b => {
        b.onclick = () => {
          const pid = Number(b.dataset.id);
          api('/api/products/' + pid).then(prod => {
            openProductModal(prod, loadProductsData);
          });
        };
      });
      $$('.btn-del-prod', container).forEach(b => {
        b.onclick = async () => {
          if (confirm('Delete this product?')) {
            await api('/api/products/' + b.dataset.id, { method: 'DELETE' });
            showToast('Product deleted', 'success');
            loadProductsData();
          }
        };
      });
    }

    let searchTimer = null;
    const prodSearch = $('#prod-search', container);
    if (prodSearch) {
      prodSearch.oninput = (e) => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
          ts.search = e.target.value.trim();
          ts.page = 1;
          loadProductsData();
        }, 300);
      };
    }

    const prodCat = $('#prod-cat-filter', container);
    if (prodCat) {
      prodCat.onchange = (e) => {
        ts.category = e.target.value;
        ts.page = 1;
        loadProductsData();
      };
    }

    const clearFilterBtn = $('#btn-prod-clear-filter', container);
    if (clearFilterBtn) {
      clearFilterBtn.onclick = () => {
        ts.search = '';
        ts.category = '';
        ts.page = 1;
        if (prodSearch) prodSearch.value = '';
        if (prodCat) prodCat.value = '';
        loadProductsData();
      };
    }

    const expProdsBtn = $('#btn-export-prods', container);
    if (expProdsBtn) expProdsBtn.onclick = () => exportCSV('products');

    const impProdsBtn = $('#btn-import-prods', container);
    if (impProdsBtn) impProdsBtn.onclick = () => openImportCSVModal('products', 'Products', loadProductsData);

    const addProdBtn = $('#btn-add-product', container);
    if (addProdBtn) addProdBtn.onclick = () => openProductModal(null, loadProductsData);

    await loadProductsData();
  }

  function openProductModal(prod, onSuccess) {
    const isEdit = !!prod;
    const curSym = (state.settings && state.settings.currency_symbol) || '৳';
    const bodyHtml =
      '<div style="display:flex; flex-direction:column; gap:10px;">' +
      '<div class="field"><label>Product Name *</label><input type="text" id="pm-name" value="' + (isEdit ? escHtml(prod.name) : '') + '" placeholder="e.g. MS Rod 12mm"></div>' +
      '<div class="form-row">' +
      '<div class="field"><label>Category</label><select id="pm-category"><option value="rod" ' + (isEdit && prod.category === 'rod' ? 'selected' : '') + '>Rod</option><option value="cement" ' + (isEdit && prod.category === 'cement' ? 'selected' : '') + '>Cement</option><option value="other" ' + (isEdit && prod.category === 'other' ? 'selected' : '') + '>Other</option></select></div>' +
      '<div class="field"><label>Brand</label><input type="text" id="pm-brand" value="' + (isEdit ? escHtml(prod.brand || '') : '') + '" placeholder="e.g. BSRM / Shah"></div>' +
      '<div class="field"><label>Size / Spec</label><input type="text" id="pm-size" value="' + (isEdit ? escHtml(prod.size || '') : '') + '" placeholder="e.g. 12mm / 50kg bag"></div>' +
      '</div>' +

      '<div class="form-row">' +
      '<div class="field"><label>Unit (kg/bag/pcs/ton)</label><input type="text" id="pm-unit" value="' + (isEdit ? escHtml(prod.unit) : 'kg') + '" placeholder="kg"></div>' +
      '<div class="field"><label>Purchase Price (' + curSym + ')</label><input type="number" id="pm-purchase-price" step="any" value="' + (isEdit ? prod.purchase_price : 0) + '"></div>' +
      '</div>' +

      '<div class="form-row">' +
      '<div class="field"><label>Retail Price (' + curSym + ')</label><input type="number" id="pm-retail-price" step="any" value="' + (isEdit ? prod.retail_price : 0) + '"></div>' +
      '<div class="field"><label>Wholesale Price (' + curSym + ')</label><input type="number" id="pm-wholesale-price" step="any" value="' + (isEdit ? prod.wholesale_price : 0) + '"></div>' +
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
    const ts = state.tableState.customers;

    const loadCustomersData = async () => {
      const qStr = buildTableQuery('customers');
      const res = await api('/api/customers' + qStr);
      const list = Array.isArray(res) ? res : (res.data || []);

      const renderTable = () =>
        '<div class="card">' +
        renderBulkActionsBarHTML('customers', 'Customer') +
        '<div class="card-body flush">' +
        (list.length === 0 ? '<div class="empty">No customers found</div>' :
          '<div class="table-responsive"><table><thead><tr>' +
          '<th style="width:36px;"><input type="checkbox" class="select-all-checkbox tbl-checkbox"></th>' +
          renderSortHeader('customers', 'id', 'ID') +
          renderSortHeader('customers', 'name', 'Customer Name') +
          renderSortHeader('customers', 'phone', 'Phone') +
          renderSortHeader('customers', 'address', 'Address') +
          renderSortHeader('customers', 'type', 'Type') +
          '<th class="num">Due Balance</th>' +
          '<th>Actions</th></tr></thead><tbody>' +
          list.map(c => {
            const isChecked = ts.selected && ts.selected.includes(c.id);
            return '<tr>' +
              '<td><input type="checkbox" class="row-checkbox tbl-checkbox" data-id="' + c.id + '" ' + (isChecked ? 'checked' : '') + '></td>' +
              '<td>' + c.id + '</td>' +
              '<td><strong>' + escHtml(c.name) + '</strong></td>' +
              '<td>' + escHtml(c.phone || 'N/A') + '</td>' +
              '<td>' + escHtml(c.address || 'N/A') + '</td>' +
              '<td><span class="pill ' + (c.type === 'wholesale' ? 'blue' : 'gray') + '">' + escHtml(c.type) + '</span></td>' +
              '<td class="num ' + (c.balance > 0 ? 'txt-red' : 'txt-green') + '"><strong>' + fmtTk(c.balance) + '</strong></td>' +
              '<td>' +
              '<button class="btn sm green btn-cust-pay" data-id="' + c.id + '" data-name="' + (escHtml(c.name) || '').replace(/"/g, '&quot;') + '">💵 Receive Due</button> ' +
              '<button class="btn sm secondary btn-cust-ledger" data-id="' + c.id + '">Ledger</button> ' +
              (isAdmin() ?
                '<button class="btn sm secondary btn-cust-edit" data-id="' + c.id + '">Edit</button> <button class="btn sm danger btn-cust-del" data-id="' + c.id + '">Delete</button>' : ''
              ) +
              '</td>' +
              '</tr>';
          }).join('') +
          '</tbody></table></div>'
        ) +
        '</div>' +
        renderPaginationFooterHTML(res) +
        '</div>';

      const wrap = $('#cust-list-container');
      if (wrap) wrap.innerHTML = renderTable();
      bindCustActions();
      bindTableSortHeaders(container, 'customers', loadCustomersData);
      bindTableSelectionEvents(container, 'customers', list, loadCustomersData);
      bindPaginationEvents(container, 'customers', loadCustomersData);
    };

    container.innerHTML =
      '<div class="page-head">' +
      '<div><div class="page-title">Customers &amp; Receivables</div><div class="page-sub">Customer balances, payment collection, and ledger statements</div></div>' +
      '<div class="toolbar">' +
      '<button class="btn secondary icon-btn" id="btn-export-custs" title="Export CSV">' + ICON_EXPORT_CSV + '</button>' +
      (isAdmin() ? '<button class="btn secondary icon-btn" id="btn-import-custs" title="Import CSV">' + ICON_IMPORT_CSV + '</button>' : '') +
      '<button class="btn" id="btn-add-customer">+ Add Customer</button>' +
      '</div>' +
      '</div>' +

      '<div class="table-filter-bar">' +
      '<div class="filter-search-wrap"><input type="search" id="cust-search" value="' + ts.search + '" placeholder="🔍 Search customer name, phone, address..."></div>' +
      '<div class="filter-controls-wrap">' +
      '<select id="cust-type-filter"><option value="">All Customer Types</option><option value="retail" ' + (ts.type === 'retail' ? 'selected' : '') + '>Retail</option><option value="wholesale" ' + (ts.type === 'wholesale' ? 'selected' : '') + '>Wholesale</option></select>' +
      '<button class="btn sm secondary" id="btn-cust-clear-filter">Reset Filters</button>' +
      '</div>' +
      '</div>' +

      '<div id="cust-list-container"></div>';

    function bindCustActions() {
      $$('.btn-cust-pay', container).forEach(b => {
        b.onclick = () => openPaymentModal('customer', Number(b.dataset.id), b.dataset.name, loadCustomersData);
      });
      $$('.btn-cust-ledger', container).forEach(b => {
        b.onclick = () => openLedgerModal('customer', Number(b.dataset.id));
      });
      $$('.btn-cust-edit', container).forEach(b => {
        b.onclick = async () => {
          try {
            const cust = await api('/api/customers/' + b.dataset.id);
            openAddCustomerModal(loadCustomersData, cust);
          } catch (e) { }
        };
      });
      $$('.btn-cust-del', container).forEach(b => {
        b.onclick = async () => {
          if (confirm('Delete customer?')) {
            await api('/api/customers/' + b.dataset.id, { method: 'DELETE' });
            showToast('Customer deleted', 'success');
            loadCustomersData();
          }
        };
      });
    }

    let searchTimer = null;
    const custSearch = $('#cust-search', container);
    if (custSearch) {
      custSearch.oninput = (e) => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
          ts.search = e.target.value.trim();
          ts.page = 1;
          loadCustomersData();
        }, 300);
      };
    }

    const typeFilter = $('#cust-type-filter', container);
    if (typeFilter) {
      typeFilter.onchange = (e) => {
        ts.type = e.target.value;
        ts.page = 1;
        loadCustomersData();
      };
    }

    const clearFilterBtn = $('#btn-cust-clear-filter', container);
    if (clearFilterBtn) {
      clearFilterBtn.onclick = () => {
        ts.search = '';
        ts.type = '';
        ts.page = 1;
        if (custSearch) custSearch.value = '';
        if (typeFilter) typeFilter.value = '';
        loadCustomersData();
      };
    }

    const expCustsBtn = $('#btn-export-custs', container);
    if (expCustsBtn) expCustsBtn.onclick = () => exportCSV('customers');

    const impCustsBtn = $('#btn-import-custs', container);
    if (impCustsBtn) impCustsBtn.onclick = () => openImportCSVModal('customers', 'Customers', loadCustomersData);

    const addCustBtn = $('#btn-add-customer', container);
    if (addCustBtn) addCustBtn.onclick = () => openAddCustomerModal(loadCustomersData);

    await loadCustomersData();
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
    const ts = state.tableState.suppliers;

    const loadSuppliersData = async () => {
      const qStr = buildTableQuery('suppliers');
      const res = await api('/api/suppliers' + qStr);
      const list = Array.isArray(res) ? res : (res.data || []);

      const renderTable = () =>
        '<div class="card">' +
        renderBulkActionsBarHTML('suppliers', 'Supplier') +
        '<div class="card-body flush">' +
        (list.length === 0 ? '<div class="empty">No suppliers found</div>' :
          '<div class="table-responsive"><table><thead><tr>' +
          '<th style="width:36px;"><input type="checkbox" class="select-all-checkbox tbl-checkbox"></th>' +
          renderSortHeader('suppliers', 'id', 'ID') +
          renderSortHeader('suppliers', 'name', 'Supplier Name') +
          renderSortHeader('suppliers', 'phone', 'Phone') +
          renderSortHeader('suppliers', 'address', 'Address') +
          '<th class="num">Payable Due</th>' +
          '<th>Actions</th></tr></thead><tbody>' +
          list.map(s => {
            const isChecked = ts.selected && ts.selected.includes(s.id);
            return '<tr>' +
              '<td><input type="checkbox" class="row-checkbox tbl-checkbox" data-id="' + s.id + '" ' + (isChecked ? 'checked' : '') + '></td>' +
              '<td>' + s.id + '</td>' +
              '<td><strong>' + escHtml(s.name) + '</strong></td>' +
              '<td>' + escHtml(s.phone || 'N/A') + '</td>' +
              '<td>' + escHtml(s.address || 'N/A') + '</td>' +
              '<td class="num ' + (s.balance > 0 ? 'txt-red' : 'txt-green') + '"><strong>' + fmtTk(s.balance) + '</strong></td>' +
              '<td>' +
              '<button class="btn sm danger btn-supp-pay" data-id="' + s.id + '" data-name="' + (escHtml(s.name) || '').replace(/"/g, '&quot;') + '">💸 Pay Supplier</button> ' +
              '<button class="btn sm secondary btn-supp-ledger" data-id="' + s.id + '">Ledger</button> ' +
              (isAdmin() ?
                '<button class="btn sm secondary btn-supp-edit" data-id="' + s.id + '">Edit</button> <button class="btn sm danger btn-supp-del" data-id="' + s.id + '">Delete</button>' : ''
              ) +
              '</td>' +
              '</tr>';
          }).join('') +
          '</tbody></table></div>'
        ) +
        '</div>' +
        renderPaginationFooterHTML(res) +
        '</div>';

      const wrap = $('#supp-list-container');
      if (wrap) wrap.innerHTML = renderTable();
      bindSuppActions();
      bindTableSortHeaders(container, 'suppliers', loadSuppliersData);
      bindTableSelectionEvents(container, 'suppliers', list, loadSuppliersData);
      bindPaginationEvents(container, 'suppliers', loadSuppliersData);
    };

    container.innerHTML =
      '<div class="page-head">' +
      '<div><div class="page-title">Suppliers &amp; Payables</div><div class="page-sub">Manage factory suppliers, purchase dues, and ledger history</div></div>' +
      '<div class="toolbar">' +
      '<button class="btn secondary icon-btn" id="btn-export-supps" title="Export CSV">' + ICON_EXPORT_CSV + '</button>' +
      (isAdmin() ? '<button class="btn secondary icon-btn" id="btn-import-supps" title="Import CSV">' + ICON_IMPORT_CSV + '</button>' : '') +
      '<button class="btn" id="btn-add-supplier">+ Add Supplier</button>' +
      '</div>' +
      '</div>' +

      '<div class="table-filter-bar">' +
      '<div class="filter-search-wrap"><input type="search" id="supp-search" value="' + ts.search + '" placeholder="🔍 Search supplier name, phone, address..."></div>' +
      '<div class="filter-controls-wrap">' +
      '<button class="btn sm secondary" id="btn-supp-clear-filter">Reset Filters</button>' +
      '</div>' +
      '</div>' +

      '<div id="supp-list-container"></div>';

    function bindSuppActions() {
      $$('.btn-supp-pay', container).forEach(b => {
        b.onclick = () => openPaymentModal('supplier', Number(b.dataset.id), b.dataset.name, loadSuppliersData);
      });
      $$('.btn-supp-ledger', container).forEach(b => {
        b.onclick = () => openLedgerModal('supplier', Number(b.dataset.id));
      });
      $$('.btn-supp-edit', container).forEach(b => {
        b.onclick = async () => {
          try {
            const supp = await api('/api/suppliers/' + b.dataset.id);
            openAddSupplierModal(loadSuppliersData, supp);
          } catch (e) { }
        };
      });
      $$('.btn-supp-del', container).forEach(b => {
        b.onclick = async () => {
          if (confirm('Delete supplier?')) {
            await api('/api/suppliers/' + b.dataset.id, { method: 'DELETE' });
            showToast('Supplier deleted', 'success');
            loadSuppliersData();
          }
        };
      });
    }

    let searchTimer = null;
    const suppSearch = $('#supp-search', container);
    if (suppSearch) {
      suppSearch.oninput = (e) => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
          ts.search = e.target.value.trim();
          ts.page = 1;
          loadSuppliersData();
        }, 300);
      };
    }

    const clearFilterBtn = $('#btn-supp-clear-filter', container);
    if (clearFilterBtn) {
      clearFilterBtn.onclick = () => {
        ts.search = '';
        ts.page = 1;
        if (suppSearch) suppSearch.value = '';
        loadSuppliersData();
      };
    }

    const expSuppsBtn = $('#btn-export-supps', container);
    if (expSuppsBtn) expSuppsBtn.onclick = () => exportCSV('suppliers');

    const impSuppsBtn = $('#btn-import-supps', container);
    if (impSuppsBtn) impSuppsBtn.onclick = () => openImportCSVModal('suppliers', 'Suppliers', loadSuppliersData);

    const addSuppBtn = $('#btn-add-supplier', container);
    if (addSuppBtn) addSuppBtn.onclick = () => openAddSupplierModal(loadSuppliersData);

    await loadSuppliersData();
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
    const curSym = (state.settings && state.settings.currency_symbol) || '৳';
    const bodyHtml =
      '<div style="display:flex; flex-direction:column; gap:10px;">' +
      '<div><strong>' + (isCust ? 'Customer' : 'Supplier') + ':</strong> ' + escHtml(partyName) + '</div>' +
      '<div class="field"><label>Date</label><input type="date" id="pay-date" value="' + todayStr() + '"></div>' +
      '<div class="field"><label>' + (isCust ? 'Deposit To Account' : 'Pay From Account') + '</label><select id="pay-account-id">' + accounts.map(a => '<option value="' + a.id + '">' + escHtml(a.name) + ' (' + escHtml(a.type) + ') — Bal: ' + fmtTk(a.current_balance) + '</option>').join('') + '</select></div>' +
      '<div class="field"><label>Payment Amount (' + curSym + ') *</label><input type="number" id="pay-amount" min="0.01" step="any" placeholder="0.00"></div>' +
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
    const [customersRes, suppliersRes, accounts] = await Promise.all([
      api('/api/customers?limit=1000'),
      api('/api/suppliers?limit=1000'),
      api('/api/accounts'),
    ]);
    const customers = Array.isArray(customersRes) ? customersRes : (customersRes.data || []);
    const suppliers = Array.isArray(suppliersRes) ? suppliersRes : (suppliersRes.data || []);
    const curSym = (state.settings && state.settings.currency_symbol) || '৳';

    const bodyHtml =
      '<div style="display:flex; flex-direction:column; gap:10px;">' +
      '<div class="field"><label>Party Type</label><select id="gpay-type"><option value="customer">Customer (Receive Money)</option><option value="supplier">Supplier (Pay Money)</option></select></div>' +
      '<div class="field" id="gpay-party-wrap"></div>' +
      '<div class="field"><label>Account</label><select id="gpay-account-id">' + accounts.map(a => '<option value="' + a.id + '">' + escHtml(a.name) + ' (' + escHtml(a.type) + ') — Bal: ' + fmtTk(a.current_balance) + '</option>').join('') + '</select></div>' +
      '<div class="field"><label>Date</label><input type="date" id="gpay-date" value="' + todayStr() + '"></div>' +
      '<div class="field"><label>Amount (' + curSym + ')</label><input type="number" id="gpay-amount" min="0.01" step="any" placeholder="0.00"></div>' +
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
        wrap.innerHTML = '<label>Select Customer</label><select id="gpay-party-id">' + customers.map(c => '<option value="' + c.id + '">' + escHtml(c.name) + ' (Due: ' + fmtTk(c.balance) + ')</option>').join('') + '</select>';
      } else {
        wrap.innerHTML = '<label>Select Supplier</label><select id="gpay-party-id">' + suppliers.map(s => '<option value="' + s.id + '">' + escHtml(s.name) + ' (Due: ' + fmtTk(s.balance) + ')</option>').join('') + '</select>';
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
    const ts = state.tableState.expenses;

    const loadExpensesData = async () => {
      const qStr = buildTableQuery('expenses');
      const res = await api('/api/expenses' + qStr);
      const list = Array.isArray(res) ? res : (res.data || []);

      let total = 0;
      list.forEach(e => total += e.amount);

      const renderContent = () =>
        '<div class="stat-grid" style="grid-template-columns: 1fr;">' +
        '<div class="stat red">' +
        '<div class="label">Total Expenses in View</div>' +
        '<div class="value">' + fmtTk(total) + '</div>' +
        '</div>' +
        '</div>' +

        '<div class="card">' +
        renderBulkActionsBarHTML('expenses', 'Expense') +
        '<div class="card-body flush">' +
        (list.length === 0 ? '<div class="empty">No expenses logged</div>' :
          '<div class="table-responsive"><table><thead><tr>' +
          '<th style="width:36px;"><input type="checkbox" class="select-all-checkbox tbl-checkbox"></th>' +
          renderSortHeader('expenses', 'date', 'Date') +
          renderSortHeader('expenses', 'category', 'Category') +
          renderSortHeader('expenses', 'note', 'Note / Description') +
          renderSortHeader('expenses', 'amount', 'Amount', 'num') +
          '<th>Action</th></tr></thead><tbody>' +
          list.map(ex => {
            const isChecked = ts.selected && ts.selected.includes(ex.id);
            return '<tr>' +
              '<td><input type="checkbox" class="row-checkbox tbl-checkbox" data-id="' + ex.id + '" ' + (isChecked ? 'checked' : '') + '></td>' +
              '<td>' + escHtml(ex.date) + '</td>' +
              '<td><span class="pill gray">' + escHtml(ex.category) + '</span></td>' +
              '<td>' + escHtml(ex.note || 'N/A') + '</td>' +
              '<td class="num txt-red"><strong>' + fmtTk(ex.amount) + '</strong></td>' +
              '<td>' + (isAdmin() ? '<button class="btn sm danger btn-del-exp" data-id="' + ex.id + '">Delete</button>' : '') + '</td>' +
              '</tr>';
          }).join('') +
          '</tbody></table></div>'
        ) +
        '</div>' +
        renderPaginationFooterHTML(res) +
        '</div>';

      const wrap = $('#exp-content');
      if (wrap) wrap.innerHTML = renderContent();
      bindExpActions();
      bindTableSortHeaders(container, 'expenses', loadExpensesData);
      bindTableSelectionEvents(container, 'expenses', list, loadExpensesData);
      bindPaginationEvents(container, 'expenses', loadExpensesData);
    };

    container.innerHTML =
      '<div class="page-head">' +
      '<div><div class="page-title">Expenses Log</div><div class="page-sub">Track daily operating and shop expenses</div></div>' +
      '<div class="toolbar">' +
      '<button class="btn secondary icon-btn" id="btn-export-expenses" title="Export CSV">' + ICON_EXPORT_CSV + '</button>' +
      (isAdmin() ? '<button class="btn secondary icon-btn" id="btn-import-expenses" title="Import CSV">' + ICON_IMPORT_CSV + '</button>' : '') +
      '<button class="btn" id="btn-add-expense">+ Add Expense</button>' +
      '</div>' +
      '</div>' +

      '<div class="table-filter-bar">' +
      '<div class="filter-search-wrap"><input type="search" id="exp-search" value="' + ts.search + '" placeholder="🔍 Search category or note..."></div>' +
      '<div class="filter-controls-wrap">' +
      '<select id="exp-cat-filter"><option value="">All Categories</option><option value="rent" ' + (ts.category === 'rent' ? 'selected' : '') + '>Rent</option><option value="salary" ' + (ts.category === 'salary' ? 'selected' : '') + '>Salary</option><option value="transport" ' + (ts.category === 'transport' ? 'selected' : '') + '>Transport</option><option value="utility" ' + (ts.category === 'utility' ? 'selected' : '') + '>Utility</option><option value="other" ' + (ts.category === 'other' ? 'selected' : '') + '>Other</option></select>' +
      '<div class="filter-date-group"><input type="date" id="exp-from" value="' + ts.from + '"><span class="txt-muted">to</span><input type="date" id="exp-to" value="' + ts.to + '"></div>' +
      '<button class="btn sm secondary" id="btn-exp-clear-filter">Reset Filters</button>' +
      '</div>' +
      '</div>' +

      '<div id="exp-content"></div>';

    function bindExpActions() {
      $$('.btn-del-exp', container).forEach(b => {
        b.onclick = async () => {
          if (confirm('Delete expense log?')) {
            await api('/api/expenses/' + b.dataset.id, { method: 'DELETE' });
            showToast('Expense deleted', 'success');
            loadExpensesData();
          }
        };
      });
    }

    let searchTimer = null;
    const expSearch = $('#exp-search', container);
    if (expSearch) {
      expSearch.oninput = (e) => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
          ts.search = e.target.value.trim();
          ts.page = 1;
          loadExpensesData();
        }, 300);
      };
    }

    const expCat = $('#exp-cat-filter', container);
    if (expCat) {
      expCat.onchange = (e) => {
        ts.category = e.target.value;
        ts.page = 1;
        loadExpensesData();
      };
    }

    const expFrom = $('#exp-from', container);
    if (expFrom) {
      expFrom.onchange = (e) => {
        ts.from = e.target.value;
        ts.page = 1;
        loadExpensesData();
      };
    }

    const expTo = $('#exp-to', container);
    if (expTo) {
      expTo.onchange = (e) => {
        ts.to = e.target.value;
        ts.page = 1;
        loadExpensesData();
      };
    }

    const clearFilterBtn = $('#btn-exp-clear-filter', container);
    if (clearFilterBtn) {
      clearFilterBtn.onclick = () => {
        ts.search = '';
        ts.category = '';
        ts.from = '';
        ts.to = '';
        ts.page = 1;
        if (expSearch) expSearch.value = '';
        if (expCat) expCat.value = '';
        if (expFrom) expFrom.value = '';
        if (expTo) expTo.value = '';
        loadExpensesData();
      };
    }

    const expExportBtn = $('#btn-export-expenses', container);
    if (expExportBtn) expExportBtn.onclick = () => exportCSV('expenses');

    const expImportBtn = $('#btn-import-expenses', container);
    if (expImportBtn) expImportBtn.onclick = () => openImportCSVModal('expenses', 'Expenses', loadExpensesData);

    const addExpBtn = $('#btn-add-expense', container);
    if (addExpBtn) addExpBtn.onclick = () => openAddExpenseModal(loadExpensesData);

    await loadExpensesData();
  }

  async function openAddExpenseModal(onSuccess) {
    const accounts = await api('/api/accounts');
    const curSym = (state.settings && state.settings.currency_symbol) || '৳';
    const bodyHtml =
      '<div style="display:flex; flex-direction:column; gap:10px;">' +
      '<div class="field"><label>Date</label><input type="date" id="ex-date" value="' + todayStr() + '"></div>' +
      '<div class="field"><label>Pay From Account</label><select id="ex-account-id">' + accounts.map(a => '<option value="' + a.id + '">' + escHtml(a.name) + ' (' + escHtml(a.type) + ') — Bal: ' + fmtTk(a.current_balance) + '</option>').join('') + '</select></div>' +
      '<div class="field"><label>Category</label><select id="ex-cat"><option value="rent">Rent</option><option value="salary">Salary / Wages</option><option value="transport">Transport / Freight</option><option value="utility">Utility (Electricity/Water)</option><option value="other" selected>Other / Misc</option></select></div>' +
      '<div class="field"><label>Amount (' + curSym + ') *</label><input type="number" id="ex-amount" min="0.01" step="any" placeholder="0.00"></div>' +
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
        '<div class="label">' + escHtml(a.name) + ' (' + escHtml(a.type.toUpperCase()) + ')</div>' +
        '<div class="value">' + fmtTk(a.current_balance) + '</div>' +
        '<div class="sub">' + (a.account_number ? 'Acct: ' + escHtml(a.account_number) : 'Cash Location') + ' | Opening: ' + fmtTk(a.opening_balance) + '</div>' +
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
        '<div class="table-responsive"><table><thead><tr><th>ID</th><th>Account Name</th><th>Type</th><th>Account / Ref No</th><th class="num">Opening Bal</th><th class="num">Current Balance</th><th>Actions</th></tr></thead><tbody>' +
        list.map(a =>
          '<tr>' +
          '<td>' + a.id + '</td>' +
          '<td><strong>' + escHtml(a.name) + '</strong></td>' +
          '<td><span class="pill ' + (a.type === 'bank' ? 'blue' : 'green') + '">' + escHtml(a.type) + '</span></td>' +
          '<td>' + (a.account_number ? escHtml(a.account_number) : 'N/A') + '</td>' +
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
        '</tbody></table></div>'
      ) +
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
    const curSym = (state.settings && state.settings.currency_symbol) || '৳';
    const bodyHtml =
      '<div style="display:flex; flex-direction:column; gap:10px;">' +
      '<div class="field"><label>Account Name *</label><input type="text" id="am-name" value="' + (isEdit ? escHtml(acct.name) : '') + '" placeholder="e.g. Cash at Shop / DBBL Bank"></div>' +
      '<div class="form-row">' +
      '<div class="field"><label>Type</label><select id="am-type"><option value="cash" ' + (isEdit && acct.type === 'cash' ? 'selected' : '') + '>Cash Location</option><option value="bank" ' + (isEdit && acct.type === 'bank' ? 'selected' : '') + '>Bank Account</option><option value="other" ' + (isEdit && acct.type === 'other' ? 'selected' : '') + '>Other</option></select></div>' +
      '<div class="field"><label>Account / Ref Number</label><input type="text" id="am-no" value="' + (isEdit ? escHtml(acct.account_number || '') : '') + '" placeholder="e.g. 110.120.9988"></div>' +
      '</div>' +
      '<div class="field"><label>Opening Balance (' + curSym + ')</label><input type="number" id="am-open-bal" step="any" value="' + (isEdit ? acct.opening_balance : 0) + '"></div>' +
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
    const curSym = (state.settings && state.settings.currency_symbol) || '৳';
    const bodyHtml =
      '<div style="display:flex; flex-direction:column; gap:10px;">' +
      '<div class="field"><label>Deposit To Account *</label><select id="dep-acct-id">' + accounts.map(a => '<option value="' + a.id + '">' + escHtml(a.name) + ' (' + escHtml(a.type) + ') — Bal: ' + fmtTk(a.current_balance) + '</option>').join('') + '</select></div>' +
      '<div class="field"><label>Date</label><input type="date" id="dep-date" value="' + todayStr() + '"></div>' +
      '<div class="field"><label>Deposit Amount (' + curSym + ') *</label><input type="number" id="dep-amount" min="0.01" step="any" placeholder="0.00"></div>' +
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
    const curSym = (state.settings && state.settings.currency_symbol) || '৳';
    const bodyHtml =
      '<div style="display:flex; flex-direction:column; gap:10px;">' +
      '<div class="field"><label>Withdraw From Account *</label><select id="with-acct-id">' + accounts.map(a => '<option value="' + a.id + '">' + escHtml(a.name) + ' (' + escHtml(a.type) + ') — Bal: ' + fmtTk(a.current_balance) + '</option>').join('') + '</select></div>' +
      '<div class="field"><label>Date</label><input type="date" id="with-date" value="' + todayStr() + '"></div>' +
      '<div class="field"><label>Withdrawal Amount (' + curSym + ') *</label><input type="number" id="with-amount" min="0.01" step="any" placeholder="0.00"></div>' +
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
    const curSym = (state.settings && state.settings.currency_symbol) || '৳';
    const bodyHtml =
      '<div style="display:flex; flex-direction:column; gap:10px;">' +
      '<div class="form-row">' +
      '<div class="field"><label>From Account (Debit) *</label><select id="xfer-from-id">' + accounts.map(a => '<option value="' + a.id + '">' + escHtml(a.name) + ' — Bal: ' + fmtTk(a.current_balance) + '</option>').join('') + '</select></div>' +
      '<div class="field"><label>To Account (Credit) *</label><select id="xfer-to-id">' + accounts.map(a => '<option value="' + a.id + '">' + escHtml(a.name) + ' — Bal: ' + fmtTk(a.current_balance) + '</option>').join('') + '</select></div>' +
      '</div>' +
      '<div class="field"><label>Date</label><input type="date" id="xfer-date" value="' + todayStr() + '"></div>' +
      '<div class="field"><label>Transfer Amount (' + curSym + ') *</label><input type="number" id="xfer-amount" min="0.01" step="any" placeholder="0.00"></div>' +
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
          '<div class="table-responsive"><table><thead><tr><th>Product</th><th class="num">Qty Sold</th><th class="num">Revenue</th><th class="num">Profit</th></tr></thead><tbody>' +
          r.top_products.map(tp =>
            '<tr><td><strong>' + escHtml(tp.product_name) + '</strong></td><td class="num">' + fmtNum(tp.qty) + ' ' + escHtml(tp.unit) + '</td><td class="num">' + fmtTk(tp.revenue) + '</td><td class="num txt-green"><strong>' + fmtTk(tp.profit) + '</strong></td></tr>'
          ).join('') +
          '</tbody></table></div>'
        ) +
        '</div>' +
        '</div>' +

        '<div class="card">' +
        '<div class="card-head">💸 Expense Breakdown</div>' +
        '<div class="card-body flush">' +
        (r.expenses_by_category.length === 0 ? '<div class="empty">No expenses logged in range</div>' :
          '<div class="table-responsive"><table><thead><tr><th>Category</th><th class="num">Amount</th></tr></thead><tbody>' +
          r.expenses_by_category.map(ec =>
            '<tr><td><span class="pill gray">' + escHtml(ec.category) + '</span></td><td class="num txt-red"><strong>' + fmtTk(ec.amount) + '</strong></td></tr>'
          ).join('') +
          '</tbody></table></div>'
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
      '<div class="filter-date-group"><input type="date" id="rpt-from" value="' + from + '"><span class="txt-muted">to</span><input type="date" id="rpt-to" value="' + to + '"></div>' +
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

  // ==========================================
  // 10. GLOBAL SETTINGS VIEW
  // ==========================================
  async function renderSettings(container) {
    await fetchSettings();
    const s = state.settings || {};
    let activeTab = 'profile';

    function renderContent() {
      container.innerHTML =
        '<div class="page-head">' +
        '<div>' +
        '<div class="page-title">Global Settings</div>' +
        '<div class="page-sub">Configure business profile, system preferences, and data management</div>' +
        '</div>' +
        '</div>' +

        '<div class="card">' +
        '<div class="card-head" style="border-bottom: none; padding-bottom: 0;">' +
        '<div class="settings-tabs">' +
        '<button class="btn sm ' + (activeTab === 'profile' ? '' : 'secondary') + '" id="tab-btn-profile">🏢 Business Profile</button>' +
        '<button class="btn sm ' + (activeTab === 'preferences' ? '' : 'secondary') + '" id="tab-btn-preferences">⚙️ System Preferences</button>' +
        '<button class="btn sm ' + (activeTab === 'data' ? '' : 'secondary') + '" id="tab-btn-data">💾 Data Management</button>' +
        '</div>' +
        '</div>' +

        '<div class="card-body">' +
        (activeTab === 'profile' ? renderProfileTab(s) : '') +
        (activeTab === 'preferences' ? renderPreferencesTab(s) : '') +
        (activeTab === 'data' ? renderDataTab() : '') +
        '</div>' +
        '</div>';

      const btnProf = $('#tab-btn-profile');
      if (btnProf) btnProf.onclick = () => { activeTab = 'profile'; renderContent(); };
      const btnPref = $('#tab-btn-preferences');
      if (btnPref) btnPref.onclick = () => { activeTab = 'preferences'; renderContent(); };

      const btnData = $('#tab-btn-data');
      if (btnData) btnData.onclick = () => { activeTab = 'data'; renderContent(); };

      if (activeTab === 'profile') bindProfileHandlers();
      if (activeTab === 'preferences') bindPreferencesHandlers();
      if (activeTab === 'data') bindDataHandlers();
    }

    function renderProfileTab(s) {
      const logoUrl = s.business_logo || '/islamEnterprise_logo.png';
      return '' +
        '<form id="form-settings-profile" style="max-width:650px;">' +
        '<div class="field">' +
        '<label>Business Logo</label>' +
        '<div style="display:flex; align-items:center; gap:16px; margin-top:4px;">' +
        '<div style="width:72px; height:72px; border-radius:8px; border:1px solid var(--border); background:#fff; display:flex; align-items:center; justify-content:center; overflow:hidden; flex-shrink:0;">' +
        '<img id="set-biz-logo-preview" src="' + logoUrl + '" alt="Logo Preview" style="max-width:100%; max-height:100%; object-fit:contain;">' +
        '</div>' +
        '<div>' +
        '<input type="file" id="set-biz-logo-file" accept="image/*" style="font-size:13px;">' +
        '<div class="txt-muted" style="font-size:11px; margin-top:4px;">Recommended: PNG, JPG, or SVG image (max 5MB).</div>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '<div class="field" style="margin-top:14px;">' +
        '<label>Business / Shop Name *</label>' +
        '<input type="text" id="set-biz-name" value="' + (s.business_name || '').replace(/"/g, '&quot;') + '" required placeholder="e.g. Islam Enterprise">' +
        '<div class="txt-muted" style="font-size:11px; margin-top:2px;">Appears on topbar, login card, sidebar, and customer invoices.</div>' +
        '</div>' +
        '<div class="field">' +
        '<label>Tagline / Motto</label>' +
        '<input type="text" id="set-biz-tagline" value="' + (s.business_tagline || '').replace(/"/g, '&quot;') + '" placeholder="e.g. Quality Materials, Lasting Trust">' +
        '</div>' +
        '<div class="form-row">' +
        '<div class="field">' +
        '<label>Phone Number(s)</label>' +
        '<input type="text" id="set-biz-phone" value="' + (s.business_phone || '').replace(/"/g, '&quot;') + '" placeholder="e.g. 01700-000000">' +
        '</div>' +
        '<div class="field" style="flex:2;">' +
        '<label>Shop Address</label>' +
        '<input type="text" id="set-biz-address" value="' + (s.business_address || '').replace(/"/g, '&quot;') + '" placeholder="e.g. Main Road, Shop #12">' +
        '</div>' +
        '</div>' +
        '<div style="margin-top:16px;">' +
        (isAdmin() ? '<button type="submit" class="btn">💾 Save Business Profile</button>' : '<div class="txt-red">⚠️ Admin privileges required to update global settings.</div>') +
        '</div>' +
        '</form>';
    }

    function renderPreferencesTab(s) {
      const cur = s.currency_symbol || '৳';
      const curOptions = ['৳', '$', '€', '£', '₹', 'AED', 'SAR', 'Tk'];
      return '' +
        '<form id="form-settings-pref" style="max-width:650px;">' +
        '<div class="form-row">' +
        '<div class="field">' +
        '<label>Currency Symbol</label>' +
        '<select id="set-currency-sym">' +
        curOptions.map(c => '<option value="' + c + '" ' + (cur === c ? 'selected' : '') + '>' + c + ' (' + (c === '৳' ? 'Bangladeshi Taka' : c) + ')</option>').join('') +
        '</select>' +
        '</div>' +
        '<div class="field">' +
        '<label>Date Format / Timezone</label>' +
        '<select id="set-date-fmt">' +
        '<option value="YYYY-MM-DD" ' + (s.timezone_date_format === 'YYYY-MM-DD' ? 'selected' : '') + '>YYYY-MM-DD (Standard ISO)</option>' +
        '<option value="DD/MM/YYYY" ' + (s.timezone_date_format === 'DD/MM/YYYY' ? 'selected' : '') + '>DD/MM/YYYY</option>' +
        '<option value="MM/DD/YYYY" ' + (s.timezone_date_format === 'MM/DD/YYYY' ? 'selected' : '') + '>MM/DD/YYYY</option>' +
        '</select>' +
        '</div>' +
        '</div>' +

        '<div class="field">' +
        '<label>Default System Low Stock Alert Threshold</label>' +
        '<input type="number" min="0" id="set-low-stock" value="' + (s.low_stock_threshold || '100') + '">' +
        '<div class="txt-muted" style="font-size:11px; margin-top:2px;">Default warning threshold for product inventory alerts.</div>' +
        '</div>' +

        '<div style="margin-top:16px;">' +
        (isAdmin() ? '<button type="submit" class="btn">💾 Save System Preferences</button>' : '<div class="txt-red">⚠️ Admin privileges required to update global settings.</div>') +
        '</div>' +
        '</form>';
    }

    function renderDataTab() {
      return '' +
        '<div style="display:flex; flex-direction:column; gap:16px; max-width:700px;">' +
        '<div class="card card-body" style="background:#f8fafc; border-left:4px solid var(--primary);">' +
        '<h4 style="margin:0 0 6px 0;">📥 Download Live Database Backup</h4>' +
        '<div style="font-size:13px; color:var(--muted); margin-bottom:12px;">' +
        'Export a complete copy of all database tables (sales, purchases, inventory, accounts, and ledgers) into a single SQLite backup file (.db).' +
        '</div>' +
        '<div>' +
        (isAdmin() ? '<button class="btn" id="btn-set-dl-backup">⬇️ Download shop.db Backup</button>' : '<div class="txt-red">⚠️ Admin privileges required.</div>') +
        '</div>' +
        '</div>' +

        '<div class="card card-body" style="background:#fff1f2; border-left:4px solid var(--red);">' +
        '<h4 style="margin:0 0 6px 0; color:var(--red);">📤 Restore Database from Backup File</h4>' +
        '<div style="font-size:13px; color:var(--muted); margin-bottom:12px;">' +
        '⚠️ <strong>Warning:</strong> Restoring a backup file will replace current database records. Confirmation warning prompt is enforced.' +
        '</div>' +

        '<div class="csv-dropzone" id="set-db-restore-dropzone">' +
        '<div style="font-size:28px; margin-bottom:4px;">💾</div>' +
        '<div><strong>Click to select .db file</strong> or drag &amp; drop file here</div>' +
        '<input type="file" id="set-db-restore-file" accept=".db" style="display:none;">' +
        '</div>' +
        '<div id="set-db-restore-status"></div>' +
        '</div>' +
        '</div>';
    }

    function bindProfileHandlers() {
      const form = $('#form-settings-profile');
      if (!form) return;

      const fileInp = $('#set-biz-logo-file');
      const previewImg = $('#set-biz-logo-preview');

      if (fileInp && previewImg) {
        fileInp.onchange = (e) => {
          const file = e.target.files && e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (evt) => {
              previewImg.src = evt.target.result;
            };
            reader.readAsDataURL(file);
          }
        };
      }

      form.onsubmit = async (e) => {
        e.preventDefault();
        const payload = {
          business_name: $('#set-biz-name').value.trim(),
          business_tagline: $('#set-biz-tagline').value.trim(),
          business_phone: $('#set-biz-phone').value.trim(),
          business_address: $('#set-biz-address').value.trim(),
        };

        const file = fileInp && fileInp.files && fileInp.files[0];
        if (file) {
          try {
            const base64 = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = (evt) => resolve(evt.target.result);
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });
            payload.business_logo = base64;
          } catch (err) {
            return showToast('Failed to process logo image file', 'error');
          }
        }

        try {
          const res = await api('/api/settings', { method: 'PUT', body: JSON.stringify(payload) });
          state.settings = { ...state.settings, ...res.settings };
          applyBrandingDOM();
          showToast('Business profile updated successfully!', 'success');
        } catch (err) { }
      };
    }

    function bindPreferencesHandlers() {
      const form = $('#form-settings-pref');
      if (!form) return;
      form.onsubmit = async (e) => {
        e.preventDefault();
        const payload = {
          currency_symbol: $('#set-currency-sym').value,
          timezone_date_format: $('#set-date-fmt').value,
          low_stock_threshold: $('#set-low-stock').value,
        };

        try {
          const res = await api('/api/settings', { method: 'PUT', body: JSON.stringify(payload) });
          state.settings = { ...state.settings, ...res.settings };
          applyBrandingDOM();
          showToast('System preferences saved successfully!', 'success');
        } catch (err) { }
      };
    }

    function bindDataHandlers() {
      const dlBtn = $('#btn-set-dl-backup');
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
              a.download = 'coretrade_erp_backup_' + todayStr() + '.db';
              a.click();
              showToast('Database backup downloaded', 'success');
            })
            .catch(e => showToast(e.message, 'error'));
        };
      }

      const dropzone = $('#set-db-restore-dropzone');
      const fileInp = $('#set-db-restore-file');
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

          const statusEl = $('#set-db-restore-status');
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

    renderContent();
  }

  // App Initialization Handler
  async function initApp() {
    initClock();
    initRouter();
    loadPOSState();
    const authenticated = await checkAuth();
    if (authenticated) {
      await fetchSettings();
      const hashView = window.location.hash.replace(/^#/, '');
      const storedView = localStorage.getItem('ie_current_view');
      let initialView = 'dashboard';
      if (hashView && VALID_VIEWS.includes(hashView)) {
        initialView = hashView;
      } else if (storedView && VALID_VIEWS.includes(storedView)) {
        initialView = storedView;
      }
      switchView(initialView);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();
