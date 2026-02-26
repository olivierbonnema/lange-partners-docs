/* ═══════════════════════════════════════════
   Pitch Form — render & collect
═══════════════════════════════════════════ */

const PitchForm = (() => {

  // ── Default boilerplate texts ────────────────────────────
  const DEFAULT_RISKS = [
    {
      title: 'Betalingsproblemen',
      ad: 'Wanneer de geldnemer niet in staat is zijn rente- en/of aflossingsverplichtingen tijdig te voldoen, is de geldverstrekker gerechtigd over te gaan tot invordering van het uitstaande bedrag. De geldverstrekker heeft in dat geval het recht de verstrekte hypothecaire zekerheid uit te winnen en het onderpand te (doen) verkopen.'
    },
    {
      title: 'Vertraging herfinanciering / aflossing',
      ad: 'Het risico bestaat dat de geldnemer op de einddatum niet in staat is de lening volledig af te lossen of te herfinancieren. Dit kan het gevolg zijn van verslechterde marktomstandigheden, daling van de waarde van het onderpand of onvoldoende bancaire financieringsmogelijkheden op het moment van herfinanciering.'
    },
    {
      title: "Overige risico's",
      ad: "Overige risico's omvatten: waardedaling van het onderpand waardoor de LTV-ratio stijgt; wijzigingen in wet- en regelgeving die de exploitatie of waardeontwikkeling van het onderpand beïnvloeden; en persoonlijke omstandigheden van de geldnemer die zijn financiële draagkracht aantasten."
    }
  ];

  const DEFAULT_CLOSING =
    'Ons beleid is gericht op spreiding van risico. Wij financieren uitsluitend op basis van goed gesecureerde leningen met een gezonde LTV-ratio. Voorafgaand aan elke financiering voeren wij een uitgebreide due diligence uit op zowel het onderpand als de geldnemer.\n\nOnze cashplanning wordt jaarlijks geëvalueerd, waarbij de renteopbrengsten en aflossingen zorgvuldig worden gevolgd en gerapporteerd aan onze investeerders.';

  const DEFAULT_FIN_ROWS = [
    { label: 'Aankoop', amount: '', isTotal: false },
    { label: 'Bijkomende kosten', amount: '', isTotal: false },
    { label: 'Rentedepot', amount: '', isTotal: false },
    { label: 'Totaal', amount: '', isTotal: true },
    { label: 'Inbreng eigen middelen', amount: '', isTotal: false },
    { label: 'Financieringsbehoefte', amount: '', isTotal: true },
  ];

  // ── Render ───────────────────────────────────────────────
  function render(container, existingData, settings) {
    const d = existingData || {};
    const borrowers = d.borrowers || [''];
    const finRows = d.financieringsopzet || DEFAULT_FIN_ROWS.map(r => ({...r}));
    const objects = d.collateralObjects || [{ description: '' }];
    const loanParts = d.loanParts || [{ amount: '', duration: '' }];
    const risks = d.risks || DEFAULT_RISKS.map(r => ({...r}));

    container.innerHTML = `
      <h2 style="font-size:18px;font-weight:700;margin-bottom:1.25rem">
        ${existingData ? 'Pitch bewerken' : 'Nieuwe Pitch'}
      </h2>

      <!-- 1. Geldnemers -->
      ${section('Geldnemers', `
        <div class="dynamic-rows" id="borrower-rows">
          ${borrowers.map((b,i) => borrowerRow(b,i)).join('')}
        </div>
        <button class="btn-add" onclick="PitchForm.addBorrower()">+ Geldnemer toevoegen</button>
      `)}

      <!-- 2. Leendoel -->
      ${section('Leendoel / Introductie', `
        <div class="form-group">
          <label>Verhaaltekst (leendoel)</label>
          <div class="voice-area">
            <textarea id="p-intro" rows="8" placeholder="Beschrijf wie de geldnemer is, zijn achtergrond, waarom hij de lening nodig heeft en hoe hij bij Lange &amp; Partners terecht is gekomen...">${escHtml(d.introParagraph || '')}</textarea>
            <button class="btn-mic" id="mic-btn" title="Spraakherkenning" onclick="PitchForm.toggleVoice()" type="button">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
            </button>
          </div>
          <div class="voice-status" id="voice-status">🔴 Opname bezig — klik opnieuw om te stoppen</div>
        </div>
      `)}

      <!-- 3. Financieringsopzet -->
      ${section('Financieringsopzet (afgerond)', `
        <div class="info-row">ℹ️ Voer bedragen in zonder opmaak. Rijen gemarkeerd als "totaal" worden vetgedrukt weergegeven.</div>
        <div class="dynamic-rows" id="fin-rows">
          ${finRows.map((r,i) => finRow(r,i)).join('')}
        </div>
        <button class="btn-add" onclick="PitchForm.addFinRow()">+ Regel toevoegen</button>
      `)}

      <!-- 4. LTV -->
      ${section('LTV (Loan-to-Value)', `
        <div class="form-row">
          <div class="form-group">
            <label>Financieringsbehoefte (lening)</label>
            <input type="number" id="p-ltv-loan" value="${d.ltvLoan || ''}" placeholder="0" oninput="PitchForm.calcLTV()">
            <div class="form-hint">Auto-invullen vanuit Financieringsopzet of hier aanpassen</div>
          </div>
          <div class="form-group">
            <label>Executiewaarde / marktwaarde onderpand</label>
            <input type="number" id="p-ltv-collateral" value="${d.ltvCollateral || ''}" placeholder="0" oninput="PitchForm.calcLTV()">
          </div>
        </div>
        <div class="calc-display" id="ltv-result">LTV: —</div>
      `)}

      <!-- 5. Zekerheden -->
      ${section('Zekerheden', `
        <div class="form-group">
          <label>Hypotheek voor (bedrag)</label>
          <input type="number" id="p-mortgage-amount" value="${d.mortgageAmount || ''}" placeholder="0">
        </div>
        <div class="form-group">
          <label>Onderpand-omschrijvingen (kadastraal)</label>
          <div class="dynamic-rows" id="object-rows">
            ${objects.map((o,i) => objectRow(o.description || '', i)).join('')}
          </div>
          <button class="btn-add" onclick="PitchForm.addObject()">+ Onderpand toevoegen</button>
        </div>
      `)}

      <!-- 6. Uitgangspunten -->
      ${section('Uitgangspunten van de Lening', `
        <div class="form-row">
          <div class="form-group">
            <label>Leenvorm</label>
            <select id="p-leenvorm">
              <option value="Aflossingsvrij" ${selOpt(d.leenvorm,'Aflossingsvrij')}>Aflossingsvrij</option>
              <option value="Annuïteiten"   ${selOpt(d.leenvorm,'Annuïteiten')}>Annuïteiten</option>
              <option value="Lineair"        ${selOpt(d.leenvorm,'Lineair')}>Lineair</option>
              <option value="Combinatie"     ${selOpt(d.leenvorm,'Combinatie')}>Combinatie</option>
            </select>
          </div>
          <div class="form-group">
            <label>Looptijd (maanden)</label>
            <input type="number" id="p-duration" value="${d.loanDuration || ''}" placeholder="36">
          </div>
        </div>

        <div class="form-group">
          <label>Leningsdelen</label>
          <div class="dynamic-rows" id="loanpart-rows">
            ${loanParts.map((lp,i) => loanPartRow(lp,i)).join('')}
          </div>
          <button class="btn-add" onclick="PitchForm.addLoanPart()">+ Leningsdeel toevoegen</button>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Bruto rente (% per jaar)</label>
            <input type="number" step="0.01" id="p-gross-rate" value="${d.grossRate || ''}" placeholder="0.00" oninput="PitchForm.calcNetRate()">
          </div>
          <div class="form-group">
            <label>Beheerfee (% per maand)</label>
            <input type="number" step="0.01" id="p-mgmt-fee" value="${d.managementFee || ''}" placeholder="0.00" oninput="PitchForm.calcNetRate()">
          </div>
        </div>
        <div class="calc-display" id="net-rate-result">Netto rente: —</div>

        <div style="margin-top:1rem">
          <label style="font-size:12px;font-weight:700;color:var(--text-light);text-transform:uppercase;letter-spacing:.3px">Vervroegde aflossing</label>
          <div class="form-row-3" style="margin-top:.4rem">
            <div class="form-group">
              <label>Minimum termijn (maanden)</label>
              <input type="number" id="p-erp-period" value="${d.earlyRepaymentMinPeriod || ''}" placeholder="6">
            </div>
            <div class="form-group">
              <label>Minimum bedrag (€)</label>
              <input type="number" id="p-erp-amount" value="${d.earlyRepaymentMinAmount || ''}" placeholder="0">
            </div>
            <div class="form-group">
              <label>Administratiekosten (€)</label>
              <input type="number" id="p-erp-fee" value="${d.earlyRepaymentFee || ''}" placeholder="0">
            </div>
          </div>
        </div>
      `)}

      <!-- 7. Risico's -->
      ${section("Enkele risico's", `
        ${risks.map((r,i) => riskBlock(r,i)).join('')}
      `)}

      <!-- 8. Slotparagraaf -->
      ${section('Slotparagraaf', `
        <div class="form-group">
          <label>Standaard slottekst (aanpasbaar)</label>
          <textarea id="p-closing" rows="6">${escHtml(d.closingParagraph || DEFAULT_CLOSING)}</textarea>
        </div>
      `)}
    `;

    // Init voice
    initVoice();
    // Calc on load
    setTimeout(() => { calcLTV(); calcNetRate(); }, 50);
  }

  // ── Section wrapper ─────────────────────────────────────
  function section(title, body) {
    return `
      <div class="form-section">
        <div class="form-section-header open" onclick="toggleSection(this)">
          <h3>${title}</h3>
          <span class="toggle-icon">▾</span>
        </div>
        <div class="form-section-body">${body}</div>
      </div>`;
  }

  // ── Row templates ────────────────────────────────────────
  function borrowerRow(val, i) {
    return `<div class="dyn-row" id="borrower-row-${i}">
      <input type="text" placeholder="Naam geldnemer" value="${escHtml(val)}" style="flex:1" class="borrower-input">
      <button class="btn-rm" onclick="PitchForm.removeBorrower(${i})" title="Verwijderen">×</button>
    </div>`;
  }

  function finRow(r, i) {
    return `<div class="dyn-row fin-row" id="fin-row-${i}">
      <input type="text" placeholder="Omschrijving" value="${escHtml(r.label||'')}" style="flex:2" class="fin-label">
      <input type="number" placeholder="Bedrag" value="${r.amount||''}" style="flex:1" class="fin-amount" oninput="PitchForm.onFinChange()">
      <select class="fin-type" style="flex:0 0 auto;min-width:90px" title="Type rij">
        <option value="normal"   ${!r.isTotal?'selected':''}>Normaal</option>
        <option value="total"    ${r.isTotal?'selected':''}>Totaal</option>
      </select>
      <button class="btn-rm" onclick="PitchForm.removeFinRow(${i})" title="Verwijderen">×</button>
    </div>`;
  }

  function objectRow(val, i) {
    return `<div class="dyn-row" id="obj-row-${i}">
      <textarea placeholder="Kadastraal objectomschrijving..." style="flex:1;min-height:60px" class="obj-desc">${escHtml(val)}</textarea>
      <button class="btn-rm" onclick="PitchForm.removeObject(${i})" title="Verwijderen">×</button>
    </div>`;
  }

  function loanPartRow(lp, i) {
    return `<div class="dyn-row" id="loanpart-row-${i}">
      <input type="number" placeholder="Bedrag (€)" value="${lp.amount||''}" style="flex:1" class="lp-amount">
      <input type="text" placeholder="Omschrijving (optioneel)" value="${escHtml(lp.label||'')}" style="flex:1" class="lp-label">
      <button class="btn-rm" onclick="PitchForm.removeLoanPart(${i})" title="Verwijderen">×</button>
    </div>`;
  }

  function riskBlock(r, i) {
    return `<div style="margin-bottom:.85rem">
      <div class="form-group">
        <label>${i+1}. Risiconaam</label>
        <input type="text" class="risk-title" value="${escHtml(r.title||'')}" placeholder="Risiconaam">
      </div>
      <div class="form-group">
        <label>Ad ${i+1} — toelichting</label>
        <textarea class="risk-ad" rows="4">${escHtml(r.ad||'')}</textarea>
      </div>
    </div>`;
  }

  // ── Dynamic row management ────────────────────────────────
  function addBorrower() {
    const rows = document.getElementById('borrower-rows');
    const i = rows.children.length;
    rows.insertAdjacentHTML('beforeend', borrowerRow('', i));
  }
  function removeBorrower(i) {
    const el = document.getElementById('borrower-row-' + i);
    if (el) el.remove();
  }

  function addFinRow() {
    const rows = document.getElementById('fin-rows');
    const i = rows.children.length;
    rows.insertAdjacentHTML('beforeend', finRow({ label:'', amount:'', isTotal:false }, i));
  }
  function removeFinRow(i) {
    const el = document.getElementById('fin-row-' + i);
    if (el) el.remove();
  }
  function onFinChange() {
    // Auto-fill LTV loan from Financieringsbehoefte
    const rows = document.querySelectorAll('.fin-row');
    for (const row of rows) {
      const lbl = (row.querySelector('.fin-label')?.value || '').toLowerCase();
      if (lbl.includes('financieringsbehoefte') || lbl.includes('behoefte')) {
        const amt = row.querySelector('.fin-amount')?.value;
        if (amt) {
          const ltvLoan = document.getElementById('p-ltv-loan');
          if (ltvLoan && !ltvLoan._manuallySet) ltvLoan.value = amt;
        }
      }
    }
    calcLTV();
  }

  function addObject() {
    const rows = document.getElementById('object-rows');
    const i = rows.children.length;
    rows.insertAdjacentHTML('beforeend', objectRow('', i));
  }
  function removeObject(i) {
    const el = document.getElementById('obj-row-' + i);
    if (el) el.remove();
  }

  function addLoanPart() {
    const rows = document.getElementById('loanpart-rows');
    const i = rows.children.length;
    rows.insertAdjacentHTML('beforeend', loanPartRow({ amount:'', label:'' }, i));
  }
  function removeLoanPart(i) {
    const el = document.getElementById('loanpart-row-' + i);
    if (el) el.remove();
  }

  // ── Calculations ─────────────────────────────────────────
  function calcLTV() {
    const loan = parseFloat(document.getElementById('p-ltv-loan')?.value) || 0;
    const col  = parseFloat(document.getElementById('p-ltv-collateral')?.value) || 0;
    const el = document.getElementById('ltv-result');
    if (!el) return;
    if (col > 0) {
      const pct = ((loan / col) * 100).toFixed(1);
      el.textContent = `LTV bij aanvang: (${fmtE(loan)} / ${fmtE(col)}) = ${pct}%`;
    } else {
      el.textContent = 'LTV: —';
    }
  }

  function calcNetRate() {
    const gross = parseFloat(document.getElementById('p-gross-rate')?.value) || 0;
    const fee   = parseFloat(document.getElementById('p-mgmt-fee')?.value) || 0;
    const net   = (gross + fee * 12).toFixed(2);
    const el = document.getElementById('net-rate-result');
    if (el) {
      el.textContent = fee > 0
        ? `Netto rente: ${gross}% + (${fee}% × 12) = ${net}% per jaar`
        : `Netto rente: ${gross}% per jaar`;
    }
  }

  function fmtE(n) {
    return new Intl.NumberFormat('nl-NL',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(n);
  }

  // ── Voice input ──────────────────────────────────────────
  let recognition = null;
  let isRecording = false;

  function initVoice() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      const btn = document.getElementById('mic-btn');
      if (btn) { btn.title = 'Spraakherkenning niet beschikbaar in deze browser'; btn.style.opacity = '.4'; btn.disabled = true; }
      return;
    }
    recognition = new SpeechRecognition();
    recognition.lang = 'nl-NL';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      const ta = document.getElementById('p-intro');
      if (!ta) return;
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          ta.value += event.results[i][0].transcript + ' ';
        } else {
          interim = event.results[i][0].transcript;
        }
      }
    };
    recognition.onerror = () => { stopVoice(); };
    recognition.onend = () => { if (isRecording) stopVoice(); };
  }

  function toggleVoice() {
    if (isRecording) stopVoice(); else startVoice();
  }
  function startVoice() {
    if (!recognition) return;
    recognition.start();
    isRecording = true;
    document.getElementById('mic-btn')?.classList.add('recording');
    const s = document.getElementById('voice-status');
    if (s) s.classList.add('visible');
  }
  function stopVoice() {
    if (recognition) try { recognition.stop(); } catch {}
    isRecording = false;
    document.getElementById('mic-btn')?.classList.remove('recording');
    const s = document.getElementById('voice-status');
    if (s) s.classList.remove('visible');
  }

  // ── Collect form data ────────────────────────────────────
  function getData() {
    // Borrowers
    const borrowers = [...document.querySelectorAll('.borrower-input')].map(i => i.value.trim()).filter(Boolean);

    // Financieringsopzet
    const financieringsopzet = [...document.querySelectorAll('.fin-row')].map(row => ({
      label: row.querySelector('.fin-label')?.value.trim() || '',
      amount: parseFloat(row.querySelector('.fin-amount')?.value) || 0,
      isTotal: row.querySelector('.fin-type')?.value === 'total',
    }));

    // Auto-derive financieringsbehoefte for metadata
    let financieringsbehoefte = 0;
    financieringsopzet.forEach(r => {
      if (r.label.toLowerCase().includes('financieringsbehoefte') || r.label.toLowerCase().includes('behoefte')) {
        financieringsbehoefte = r.amount;
      }
    });

    // Collateral objects
    const collateralObjects = [...document.querySelectorAll('.obj-desc')].map(t => ({
      description: t.value.trim()
    })).filter(o => o.description);

    // Loan parts
    const loanParts = [...document.querySelectorAll('#loanpart-rows .dyn-row')].map(row => ({
      amount: parseFloat(row.querySelector('.lp-amount')?.value) || 0,
      label: row.querySelector('.lp-label')?.value.trim() || '',
    })).filter(lp => lp.amount > 0);

    // Risks
    const titleEls = document.querySelectorAll('.risk-title');
    const adEls    = document.querySelectorAll('.risk-ad');
    const risks = [];
    titleEls.forEach((el, i) => {
      risks.push({ title: el.value.trim(), ad: adEls[i]?.value.trim() || '' });
    });

    return {
      borrowers,
      introParagraph: document.getElementById('p-intro')?.value.trim() || '',
      financieringsopzet,
      financieringsbehoefte,
      ltvLoan: parseFloat(document.getElementById('p-ltv-loan')?.value) || 0,
      ltvCollateral: parseFloat(document.getElementById('p-ltv-collateral')?.value) || 0,
      mortgageAmount: parseFloat(document.getElementById('p-mortgage-amount')?.value) || 0,
      collateralObjects,
      leenvorm: document.getElementById('p-leenvorm')?.value || 'Aflossingsvrij',
      loanDuration: parseInt(document.getElementById('p-duration')?.value) || 0,
      loanParts,
      grossRate: parseFloat(document.getElementById('p-gross-rate')?.value) || 0,
      managementFee: parseFloat(document.getElementById('p-mgmt-fee')?.value) || 0,
      earlyRepaymentMinPeriod: parseInt(document.getElementById('p-erp-period')?.value) || 0,
      earlyRepaymentMinAmount: parseFloat(document.getElementById('p-erp-amount')?.value) || 0,
      earlyRepaymentFee: parseFloat(document.getElementById('p-erp-fee')?.value) || 0,
      risks,
      closingParagraph: document.getElementById('p-closing')?.value.trim() || DEFAULT_CLOSING,
    };
  }

  // ── Helpers ──────────────────────────────────────────────
  function escHtml(s) {
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function selOpt(current, val) { return current === val ? 'selected' : ''; }

  // Toggle section collapse
  window.toggleSection = function(header) {
    const body = header.nextElementSibling;
    const isOpen = header.classList.contains('open');
    if (isOpen) {
      header.classList.remove('open');
      body.style.display = 'none';
    } else {
      header.classList.add('open');
      body.style.display = '';
    }
  };

  return { render, getData, addBorrower, removeBorrower, addFinRow, removeFinRow, onFinChange,
           addObject, removeObject, addLoanPart, removeLoanPart,
           calcLTV, calcNetRate, toggleVoice };
})();
