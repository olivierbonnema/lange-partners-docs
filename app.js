/* ═══════════════════════════════════════════
   Lange & Partners — Document Generator
   app.js — Core application logic
═══════════════════════════════════════════ */

const App = (() => {
  // ── State ──────────────────────────────────────────────
  let state = {
    currentView: 'home',
    wizardStep: 1,
    docType: null,       // 'pitch' | 'termsheet'
    editingId: null,     // id of document being edited
    currentData: null,   // form data snapshot
    lastBlob: null,      // last generated blob
    lastFilename: '',
    filterType: 'all',
  };

  const LS_DOCS = 'lp_documents';
  const LS_SETTINGS = 'lp_settings';

  // ── LocalStorage helpers ────────────────────────────────
  function getDocs() {
    try { return JSON.parse(localStorage.getItem(LS_DOCS) || '[]'); }
    catch { return []; }
  }
  function saveDocs(docs) {
    localStorage.setItem(LS_DOCS, JSON.stringify(docs));
  }
  function getSettings() {
    try { return JSON.parse(localStorage.getItem(LS_SETTINGS) || '{}'); }
    catch { return {}; }
  }
  function persistSettings(s) {
    localStorage.setItem(LS_SETTINGS, JSON.stringify(s));
  }

  // ── Utility ─────────────────────────────────────────────
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }
  function fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  function fmtAmount(n) {
    if (!n && n !== 0) return '';
    return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
  }

  function toast(msg, duration = 2500) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.style.display = 'block';
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.style.display = 'none'; }, duration);
  }

  // ── Navigation ──────────────────────────────────────────
  function navigate(view) {
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    const el = document.getElementById('view-' + view);
    if (el) el.style.display = 'block';

    document.querySelectorAll('.nav-link').forEach(l => {
      l.classList.toggle('active', l.dataset.view === view);
    });

    state.currentView = view;

    if (view === 'home') renderDocList();
    if (view === 'settings') loadSettingsForm();
    if (view === 'document') {
      // already set up by showNewDocument / editDocument
    }
  }

  // ── Home – Document list ────────────────────────────────
  function renderDocList() {
    const docs = getDocs();
    const list = document.getElementById('document-list');
    const empty = document.getElementById('empty-state');
    const filter = state.filterType;

    let filtered = filter === 'all' ? docs : docs.filter(d => d.type === filter);
    filtered = filtered.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    if (!filtered.length) {
      list.innerHTML = '';
      empty.style.display = docs.length && filter !== 'all' ? 'block' : 'block';
      if (docs.length && filter !== 'all') {
        empty.querySelector('h3').textContent = 'Geen ' + filter + ' documenten';
        empty.querySelector('p').textContent = 'Er zijn geen documenten van dit type.';
      } else {
        empty.querySelector('h3').textContent = 'Geen documenten';
        empty.querySelector('p').textContent = 'Maak uw eerste document aan door op "Nieuw document" te klikken.';
      }
      return;
    }
    empty.style.display = 'none';

    list.innerHTML = filtered.map(doc => {
      const amount = doc.data && doc.data.financieringsbehoefte
        ? fmtAmount(doc.data.financieringsbehoefte)
        : (doc.data && doc.data.loanAmount ? fmtAmount(doc.data.loanAmount) : '');
      return `
        <div class="doc-card" onclick="App.editDocument('${doc.id}')">
          <span class="doc-badge ${doc.type}">${doc.type === 'pitch' ? 'Pitch' : 'Termsheet'}</span>
          <div class="doc-info">
            <div class="doc-name">${escHtml(doc.name || 'Naamloos')}</div>
            <div class="doc-meta">${fmtDate(doc.updatedAt)}${amount ? ' · ' + amount : ''}</div>
          </div>
          <div class="doc-actions" onclick="event.stopPropagation()">
            <button class="btn btn-ghost" onclick="App.downloadExisting('${doc.id}')">📥</button>
            <button class="btn btn-ghost danger" onclick="App.confirmDelete('${doc.id}')">🗑</button>
          </div>
        </div>`;
    }).join('');
  }

  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── New document ────────────────────────────────────────
  function showNewDocument() {
    state.editingId = null;
    state.docType = null;
    state.currentData = null;
    state.lastBlob = null;
    document.getElementById('wizard-doc-title').textContent = 'Nieuw document';
    navigate('document');
    showWizardStep(1);
  }

  function selectType(type) {
    state.docType = type;
    showWizardStep(2);
    renderForm();
  }

  function renderForm() {
    const container = document.getElementById('form-container');
    const settings = getSettings();
    if (state.docType === 'pitch') {
      PitchForm.render(container, state.currentData, settings);
    } else {
      TermsheetForm.render(container, state.currentData, settings);
    }
  }

  function showWizardStep(n) {
    state.wizardStep = n;
    [1,2,3].forEach(i => {
      const el = document.getElementById('ws-' + i);
      if (el) el.style.display = i === n ? '' : 'none';
      const si = document.getElementById('si-' + i);
      if (si) si.classList.toggle('active', i === n || i < n);
    });
  }

  function wizardBack() {
    if (state.wizardStep === 2) showWizardStep(1);
    else if (state.wizardStep === 3) showWizardStep(2);
  }

  // ── Edit existing document ──────────────────────────────
  function editDocument(id) {
    const docs = getDocs();
    const doc = docs.find(d => d.id === id);
    if (!doc) return;
    state.editingId = id;
    state.docType = doc.type;
    state.currentData = doc.data || {};
    document.getElementById('wizard-doc-title').textContent = doc.name || 'Document';
    navigate('document');
    showWizardStep(2);
    renderForm();
  }

  // ── Save ────────────────────────────────────────────────
  function saveCurrentDoc() {
    const data = collectFormData();
    if (!data) return;
    const docs = getDocs();
    const name = deriveDocName(data);
    const now = new Date().toISOString();

    if (state.editingId) {
      const idx = docs.findIndex(d => d.id === state.editingId);
      if (idx >= 0) {
        docs[idx] = { ...docs[idx], name, updatedAt: now, data };
        saveDocs(docs);
        toast('Document opgeslagen.');
      }
    } else {
      const id = uid();
      state.editingId = id;
      docs.push({ id, type: state.docType, name, createdAt: now, updatedAt: now, data });
      saveDocs(docs);
      toast('Document opgeslagen.');
    }
    state.currentData = data;
  }

  function collectFormData() {
    if (state.docType === 'pitch') return PitchForm.getData();
    if (state.docType === 'termsheet') return TermsheetForm.getData();
    return null;
  }

  function deriveDocName(data) {
    if (data.borrowers && data.borrowers.length) {
      const first = data.borrowers[0];
      return typeof first === 'string' ? first : (first.name || 'Naamloos');
    }
    if (data.borrowerName) return data.borrowerName;
    return 'Naamloos';
  }

  // ── Generate & download ─────────────────────────────────
  async function generateAndDownload() {
    const data = collectFormData();
    if (!data) { toast('Fout bij ophalen formuliergegevens.'); return; }

    // Auto-save first
    const docs = getDocs();
    const name = deriveDocName(data);
    const now = new Date().toISOString();
    if (state.editingId) {
      const idx = docs.findIndex(d => d.id === state.editingId);
      if (idx >= 0) { docs[idx] = { ...docs[idx], name, updatedAt: now, data }; }
      else { docs.push({ id: state.editingId, type: state.docType, name, createdAt: now, updatedAt: now, data }); }
    } else {
      const id = uid();
      state.editingId = id;
      docs.push({ id, type: state.docType, name, createdAt: now, updatedAt: now, data });
    }
    saveDocs(docs);
    state.currentData = data;

    const settings = getSettings();
    try {
      let blob, filename;
      if (state.docType === 'pitch') {
        blob = await PitchGenerator.generate(data, settings);
        filename = `Pitch_${name.replace(/\s+/g,'_')}_${todayStr()}.docx`;
      } else {
        blob = await TermsheetGenerator.generate(data, settings);
        filename = `Termsheet_${name.replace(/\s+/g,'_')}_${todayStr()}.docx`;
      }
      state.lastBlob = blob;
      state.lastFilename = filename;
      downloadBlob(blob, filename);
      showWizardStep(3);
    } catch (err) {
      console.error('Generatiefout:', err);
      toast('Fout bij genereren: ' + err.message, 5000);
    }
  }

  function downloadAgain() {
    if (state.lastBlob) downloadBlob(state.lastBlob, state.lastFilename);
  }

  async function downloadExisting(id) {
    const docs = getDocs();
    const doc = docs.find(d => d.id === id);
    if (!doc) return;
    const settings = getSettings();
    try {
      let blob, filename;
      const name = doc.name || 'document';
      if (doc.type === 'pitch') {
        blob = await PitchGenerator.generate(doc.data, settings);
        filename = `Pitch_${name.replace(/\s+/g,'_')}_${todayStr()}.docx`;
      } else {
        blob = await TermsheetGenerator.generate(doc.data, settings);
        filename = `Termsheet_${name.replace(/\s+/g,'_')}_${todayStr()}.docx`;
      }
      downloadBlob(blob, filename);
      toast('Document gedownload.');
    } catch (err) {
      console.error(err);
      toast('Fout bij downloaden: ' + err.message, 4000);
    }
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  function todayStr() {
    return new Date().toISOString().slice(0,10);
  }

  // ── Delete ──────────────────────────────────────────────
  let pendingDeleteId = null;
  function confirmDelete(id) {
    pendingDeleteId = id;
    const docs = getDocs();
    const doc = docs.find(d => d.id === id);
    document.getElementById('modal-title').textContent = 'Document verwijderen';
    document.getElementById('modal-msg').textContent =
      `Weet u zeker dat u "${doc ? doc.name : 'dit document'}" wilt verwijderen? Dit kan niet ongedaan worden gemaakt.`;
    document.getElementById('modal-ok').onclick = () => { deleteDocument(id); closeModal(); };
    document.getElementById('modal-overlay').style.display = 'flex';
  }
  function deleteDocument(id) {
    let docs = getDocs();
    docs = docs.filter(d => d.id !== id);
    saveDocs(docs);
    renderDocList();
    toast('Document verwijderd.');
  }
  function closeModal(e) {
    if (e && e.target !== document.getElementById('modal-overlay')) return;
    document.getElementById('modal-overlay').style.display = 'none';
    pendingDeleteId = null;
  }

  // ── Settings ────────────────────────────────────────────
  function loadSettingsForm() {
    const s = getSettings();
    setVal('s-advisor-name', s.advisorName || '');
    setVal('s-advisor-phone', s.advisorPhone || '');
    setVal('s-advisor-email', s.advisorEmail || '');
    setVal('s-company', s.companyName || 'Lange & Partners Financieel Advies');
    setVal('s-notaris', s.notaris || '');

    const zone = document.getElementById('logo-preview-area');
    const delBtn = document.getElementById('btn-del-logo');
    if (s.logoDataUrl) {
      zone.innerHTML = `<img src="${s.logoDataUrl}" alt="Logo">`;
      delBtn.style.display = '';
    } else {
      zone.innerHTML = `<img src="${DEFAULT_LOGO_DATA_URL}" alt="Lange & Partners logo" style="max-height:60px;max-width:280px;object-fit:contain;">
        <p class="hint" style="margin-top:0.5rem;">Standaard logo — klik om eigen logo te uploaden</p>`;
      delBtn.style.display = 'none';
    }
  }

  function saveSettings() {
    const s = getSettings();
    s.advisorName  = getVal('s-advisor-name');
    s.advisorPhone = getVal('s-advisor-phone');
    s.advisorEmail = getVal('s-advisor-email');
    s.companyName  = getVal('s-company');
    s.notaris      = getVal('s-notaris');
    persistSettings(s);
    toast('Instellingen opgeslagen.');
  }

  function handleLogoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const s = getSettings();
      s.logoDataUrl = e.target.result;
      persistSettings(s);
      loadSettingsForm();
      toast('Logo opgeslagen.');
    };
    reader.readAsDataURL(file);
  }

  function removeLogo() {
    const s = getSettings();
    delete s.logoDataUrl;
    persistSettings(s);
    loadSettingsForm();
    toast('Logo verwijderd.');
  }

  // ── DOM helpers ──────────────────────────────────────────
  function setVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
  }
  function getVal(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  // ── Init ─────────────────────────────────────────────────
  function init() {
    // Nav links
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        navigate(link.dataset.view);
      });
    });

    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.filterType = btn.dataset.filter;
        renderDocList();
      });
    });

    // Modal close on overlay click
    document.getElementById('modal-overlay').addEventListener('click', function(e) {
      if (e.target === this) closeModal(e);
    });

    navigate('home');
  }

  // Public API
  return {
    init,
    navigate,
    showNewDocument,
    selectType,
    wizardBack,
    saveCurrentDoc,
    generateAndDownload,
    downloadAgain,
    downloadExisting,
    confirmDelete,
    deleteDocument,
    closeModal,
    editDocument,
    saveSettings,
    handleLogoUpload,
    removeLogo,
  };
})();

document.addEventListener('DOMContentLoaded', () => App.init());
