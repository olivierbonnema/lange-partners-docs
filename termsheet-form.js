/* ═══════════════════════════════════════════
   Termsheet Form — render & collect
═══════════════════════════════════════════ */

const TermsheetForm = (() => {

  // ── Default boilerplate ──────────────────────────────────
  const DEFAULT_CONDITIES =
    'De lening wordt uitsluitend verstrekt indien de kredietwaardigheid van de kredietnemer en de waarde van het onderpand voldoen aan de door de kredietgever gestelde eisen. De geldverstrekker behoudt zich het recht voor de lening op te eisen bij het niet nakomen van de gestelde voorwaarden.';

  const DEFAULT_TOEPASSELIJK_RECHT = 'Nederlands recht. Geschillen worden voorgelegd aan de bevoegde rechter in Nederland.';

  const DEFAULT_OVERDRACHT =
    'De rechten en verplichtingen van de kredietnemer uit hoofde van deze lening zijn niet overdraagbaar zonder voorafgaande schriftelijke toestemming van de kredietgever.';

  const DEFAULT_BETALINGSWIJZE =
    'De rente en eventuele aflossingen zijn per kwartaal achteraf verschuldigd en worden automatisch geïncasseerd van de door de kredietnemer opgegeven bankrekening.';

  const DEFAULT_VERZEKERING =
    'De kredietnemer is verplicht het onderpand adequaat te verzekeren en de geldverstrekker als begunstigde aan te melden bij de verzekeraar.';

  const DEFAULT_BESCHIKBAARHEID =
    'De lening is beschikbaar na ondertekening van de leningsovereenkomst en afgifte van alle gevraagde zekerheden, doch uiterlijk 3 maanden na dagtekening van deze termsheet.';

  const DEFAULT_VOORAF_CONDITIES = [
    { text: 'Getekende leningsovereenkomst', received: false },
    { text: 'Actueel taxatierapport van het onderpand', received: false },
    { text: 'Hypotheekakte gepasseerd bij notaris', received: false },
    { text: 'Bewijs van eigendom onderpand', received: false },
    { text: 'Geldig legitimatiebewijs van alle kredietnemers', received: false },
    { text: 'Bankafschriften afgelopen 3 maanden', received: false },
  ];

  // ── Render ───────────────────────────────────────────────
  function render(container, existingData, settings) {
    const d = existingData || {};
    const s = settings || {};
    const borrowers = d.borrowers || [{ name: '', address: '', postalCode: '', city: '' }];
    const objects   = d.objects || [{ description: '' }];
    const loanParts = d.loanParts || [{ amount: '', typeLabel: 'Termijnlening' }];
    const vooraf    = d.voorafgaandeCondities || DEFAULT_VOORAF_CONDITIES.map(c => ({...c}));
    const entree    = d.entreekosten || { afsluit: '', opstart: '', annulering: '' };

    const today = new Date().toISOString().slice(0,10);

    container.innerHTML = `
      <h2 style="font-size:18px;font-weight:700;margin-bottom:1.25rem">
        ${existingData ? 'Termsheet bewerken' : 'Nieuwe Termsheet'}
      </h2>

      <!-- 1. Geldnemers & adres -->
      ${section('Geldnemers & adres', `
        <div class="dynamic-rows" id="ts-borrower-rows">
          ${borrowers.map((b,i) => borrowerRow(b,i)).join('')}
        </div>
        <button class="btn-add" onclick="TermsheetForm.addBorrower()">+ Geldnemer toevoegen</button>
      `)}

      <!-- 2. Adviseur & referentie -->
      ${section('Adviseur & referentie', `
        <div class="form-row">
          <div class="form-group">
            <label>Adviseur naam</label>
            <input type="text" id="ts-advisor" value="${escHtml(d.advisorName || s.advisorName || '')}" placeholder="Naam adviseur">
          </div>
          <div class="form-group">
            <label>Referentie</label>
            <input type="text" id="ts-ref" value="${escHtml(d.reference || '')}" placeholder="Bijv. LA-2024-001">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Telefoon</label>
            <input type="tel" id="ts-phone" value="${escHtml(d.phone || s.advisorPhone || '')}" placeholder="+31 6 12345678">
          </div>
          <div class="form-group">
            <label>E-mail</label>
            <input type="email" id="ts-email" value="${escHtml(d.email || s.advisorEmail || '')}" placeholder="info@langepartners.nl">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Stad (van opstelling)</label>
            <input type="text" id="ts-city" value="${escHtml(d.city || 'Amsterdam')}" placeholder="Amsterdam">
          </div>
          <div class="form-group">
            <label>Datum</label>
            <input type="date" id="ts-date" value="${d.date || today}">
          </div>
        </div>
        <div class="form-group">
          <label>Aanhef geldnemer</label>
          <input type="text" id="ts-salutation" value="${escHtml(d.salutation || '')}" placeholder="Bijv. de heer Jansen">
        </div>
      `)}

      <!-- 3. Onderpanden -->
      ${section('Onderpanden (zekerheden)', `
        <div class="info-row">ℹ️ Voer de volledige kadastrale omschrijving in. Elk onderpand krijgt een nummer in de termsheet.</div>
        <div class="dynamic-rows" id="ts-obj-rows">
          ${objects.map((o,i) => objectRow(o,i)).join('')}
        </div>
        <button class="btn-add" onclick="TermsheetForm.addObject()">+ Onderpand toevoegen</button>
      `)}

      <!-- 4. Leningcondities -->
      ${section('Leningcondities', `
        <div class="form-row">
          <div class="form-group">
            <label>Kredietgever</label>
            <input type="text" id="ts-kredietgever" value="${escHtml(d.kredietgever || s.companyName || 'Lange & Partners Financieel Advies')}">
          </div>
          <div class="form-group">
            <label>Geldverstrekker</label>
            <input type="text" id="ts-geldverstrekker" value="${escHtml(d.geldverstrekker || '')}" placeholder="Naam geldverstrekker / SPV">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Type faciliteit</label>
            <input type="text" id="ts-type" value="${escHtml(d.typeFaciliteit || 'Termijnlening')}" placeholder="Termijnlening">
          </div>
          <div class="form-group">
            <label>Valuta</label>
            <input type="text" id="ts-valuta" value="${escHtml(d.valuta || 'Euro (€)')}">
          </div>
        </div>

        <div class="form-group">
          <label>Leningsdelen</label>
          <div class="dynamic-rows" id="ts-loanpart-rows">
            ${loanParts.map((lp,i) => loanPartRow(lp,i)).join('')}
          </div>
          <button class="btn-add" onclick="TermsheetForm.addLoanPart()">+ Leningsdeel toevoegen</button>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Looptijd</label>
            <input type="text" id="ts-looptijd" value="${escHtml(d.looptijd || '')}" placeholder="Bijv. 36 maanden">
          </div>
          <div class="form-group">
            <label>Rentegrondslag</label>
            <input type="text" id="ts-rentegrondslag" value="${escHtml(d.rentegrondslag || 'Actual/360')}" placeholder="Actual/360">
          </div>
        </div>
        <div class="form-group">
          <label>Aflossing</label>
          <input type="text" id="ts-aflossing" value="${escHtml(d.aflossing || 'Aflossingsvrij — ineens aan het einde van de looptijd')}" placeholder="Bijv. Aflossingsvrij">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Rente</label>
            <input type="text" id="ts-rente" value="${escHtml(d.rente || '')}" placeholder="Bijv. 8% per jaar, per kwartaal achteraf">
          </div>
          <div class="form-group">
            <label>Administratiekosten</label>
            <input type="text" id="ts-adminkosten" value="${escHtml(d.administratiekosten || '')}" placeholder="Bijv. 0,5% per kwartaal">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Termijnbedrag</label>
            <input type="text" id="ts-termijnbedrag" value="${escHtml(d.termijnbedrag || '')}" placeholder="Bijv. € 4.250 per kwartaal">
          </div>
        </div>

        <div style="margin-top:.75rem">
          <label style="font-size:12px;font-weight:700;color:var(--text-light);text-transform:uppercase;letter-spacing:.3px">Entreekosten</label>
          <div class="form-row-3" style="margin-top:.4rem">
            <div class="form-group">
              <label>Afsluitkosten</label>
              <input type="text" id="ts-afsluit" value="${escHtml(entree.afsluit || '')}" placeholder="Bijv. € 2.000 incl. BTW">
            </div>
            <div class="form-group">
              <label>Opstartkosten</label>
              <input type="text" id="ts-opstart" value="${escHtml(entree.opstart || '')}" placeholder="Bijv. € 500">
            </div>
            <div class="form-group">
              <label>Annuleringskosten</label>
              <input type="text" id="ts-annulering" value="${escHtml(entree.annulering || '')}" placeholder="Bijv. € 1.000">
            </div>
          </div>
        </div>

        <div class="form-group" style="margin-top:.75rem">
          <label>(Extra) Aflossen</label>
          <textarea id="ts-extra-aflossen" rows="3" placeholder="Bijv. Extra aflossingen zijn toegestaan met een minimum van...">${escHtml(d.extraAflossen || '')}</textarea>
        </div>
      `)}

      <!-- 5. Aanvullende bepalingen -->
      ${section('Aanvullende bepalingen', `
        <div class="form-group">
          <label>Betalingswijze</label>
          <textarea id="ts-betalingswijze" rows="3">${escHtml(d.betalingswijze || DEFAULT_BETALINGSWIJZE)}</textarea>
        </div>
        <div class="form-group">
          <label>Zekerheden (omschrijving)</label>
          <textarea id="ts-zekerheden" rows="4" placeholder="Omschrijf de hypothecaire zekerheden...">${escHtml(d.zekerheden || '')}</textarea>
        </div>
        <div class="form-group">
          <label>Verzekering</label>
          <textarea id="ts-verzekering" rows="3">${escHtml(d.verzekering || DEFAULT_VERZEKERING)}</textarea>
        </div>
        <div class="form-group">
          <label>Condities</label>
          <textarea id="ts-condities" rows="3">${escHtml(d.condities || DEFAULT_CONDITIES)}</textarea>
        </div>
        <div class="form-group">
          <label>Toepasselijk recht</label>
          <textarea id="ts-recht" rows="2">${escHtml(d.toepasselijkRecht || DEFAULT_TOEPASSELIJK_RECHT)}</textarea>
        </div>
        <div class="form-group">
          <label>Beschikbaarheid</label>
          <textarea id="ts-beschikbaarheid" rows="2">${escHtml(d.beschikbaarheid || DEFAULT_BESCHIKBAARHEID)}</textarea>
        </div>
        <div class="form-group">
          <label>Overdracht</label>
          <textarea id="ts-overdracht" rows="2">${escHtml(d.overdracht || DEFAULT_OVERDRACHT)}</textarea>
        </div>
      `)}

      <!-- 6. Voorafgaande condities -->
      ${section('Voorafgaande condities', `
        <div class="info-row">ℹ️ Markeer als "Ontvangen" om een doorgehaalde weergave te krijgen in het document.</div>
        <div id="ts-vooraf-rows">
          ${vooraf.map((c,i) => voorafRow(c,i)).join('')}
        </div>
        <button class="btn-add" onclick="TermsheetForm.addVooraf()">+ Conditie toevoegen</button>
      `)}

      <!-- 7. Afsluiting -->
      ${section('Afsluiting', `
        <div class="form-row">
          <div class="form-group">
            <label>Notaris</label>
            <input type="text" id="ts-notaris" value="${escHtml(d.notaris || s.notaris || '')}" placeholder="Bijv. Mr. A. Jansen">
          </div>
          <div class="form-group">
            <label>Tekenbevoegde adviseur</label>
            <input type="text" id="ts-signing-advisor" value="${escHtml(d.signingAdvisor || s.advisorName || '')}" placeholder="Naam">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Geldigheidsduur (datum)</label>
            <input type="date" id="ts-validity" value="${d.validityDate || ''}">
          </div>
          <div class="form-group">
            <label>Ondertekeningsdeadline</label>
            <input type="date" id="ts-signing-deadline" value="${d.signingDeadline || ''}">
          </div>
        </div>
      `)}
    `;
  }

  // ── Section wrapper ──────────────────────────────────────
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

  // ── Row templates ─────────────────────────────────────────
  function borrowerRow(b, i) {
    return `<div class="dyn-row" id="ts-br-${i}" style="flex-wrap:wrap">
      <input type="text" placeholder="Volledige naam" value="${escHtml(b.name||'')}" style="flex:1 0 45%;min-width:160px" class="ts-b-name">
      <input type="text" placeholder="Straat + huisnr." value="${escHtml(b.address||'')}" style="flex:1 0 45%;min-width:160px" class="ts-b-address">
      <input type="text" placeholder="Postcode" value="${escHtml(b.postalCode||'')}" style="flex:0 0 100px" class="ts-b-postal">
      <input type="text" placeholder="Woonplaats" value="${escHtml(b.city||'')}" style="flex:1 0 140px" class="ts-b-city">
      <button class="btn-rm" onclick="TermsheetForm.removeBorrower(${i})" title="Verwijderen">×</button>
    </div>`;
  }

  function objectRow(o, i) {
    return `<div class="dyn-row" id="ts-obj-${i}">
      <textarea placeholder="Volledige kadastrale omschrijving van het onderpand..." style="flex:1;min-height:70px" class="ts-obj-desc">${escHtml(o.description||'')}</textarea>
      <button class="btn-rm" onclick="TermsheetForm.removeObject(${i})" title="Verwijderen">×</button>
    </div>`;
  }

  function loanPartRow(lp, i) {
    return `<div class="dyn-row" id="ts-lp-${i}">
      <input type="number" placeholder="Bedrag (€)" value="${lp.amount||''}" style="flex:1" class="ts-lp-amount">
      <input type="text" placeholder="Omschrijving" value="${escHtml(lp.typeLabel||'Termijnlening')}" style="flex:1" class="ts-lp-label">
      <button class="btn-rm" onclick="TermsheetForm.removeLoanPart(${i})" title="Verwijderen">×</button>
    </div>`;
  }

  function voorafRow(c, i) {
    const cls = c.received ? 'received' : '';
    const txtCls = c.received ? 'struck' : '';
    return `<div class="cond-row" id="ts-cond-${i}">
      <input type="text" placeholder="Voorafgaande conditie..." value="${escHtml(c.text||'')}" class="ts-cond-text ${txtCls}">
      <button class="cond-toggle ${cls}" onclick="TermsheetForm.toggleVooraf(${i})" type="button">
        ${c.received ? '✓ Ontvangen' : 'Nog te ontvangen'}
      </button>
      <button class="btn-rm" onclick="TermsheetForm.removeVooraf(${i})" title="Verwijderen">×</button>
    </div>`;
  }

  // ── Dynamic management ────────────────────────────────────
  function addBorrower() {
    const rows = document.getElementById('ts-borrower-rows');
    const i = rows.children.length;
    rows.insertAdjacentHTML('beforeend', borrowerRow({ name:'',address:'',postalCode:'',city:'' }, i));
  }
  function removeBorrower(i) {
    const el = document.getElementById('ts-br-' + i);
    if (el) el.remove();
  }

  function addObject() {
    const rows = document.getElementById('ts-obj-rows');
    const i = rows.children.length;
    rows.insertAdjacentHTML('beforeend', objectRow({ description:'' }, i));
  }
  function removeObject(i) {
    const el = document.getElementById('ts-obj-' + i);
    if (el) el.remove();
  }

  function addLoanPart() {
    const rows = document.getElementById('ts-loanpart-rows');
    const i = rows.children.length;
    rows.insertAdjacentHTML('beforeend', loanPartRow({ amount:'', typeLabel:'Termijnlening' }, i));
  }
  function removeLoanPart(i) {
    const el = document.getElementById('ts-lp-' + i);
    if (el) el.remove();
  }

  function addVooraf() {
    const rows = document.getElementById('ts-vooraf-rows');
    const i = rows.children.length;
    rows.insertAdjacentHTML('beforeend', voorafRow({ text:'', received:false }, i));
  }
  function removeVooraf(i) {
    const el = document.getElementById('ts-cond-' + i);
    if (el) el.remove();
  }
  function toggleVooraf(i) {
    const row = document.getElementById('ts-cond-' + i);
    if (!row) return;
    const btn = row.querySelector('.cond-toggle');
    const txt = row.querySelector('.ts-cond-text');
    const isReceived = btn.classList.contains('received');
    if (isReceived) {
      btn.classList.remove('received');
      btn.textContent = 'Nog te ontvangen';
      txt.classList.remove('struck');
    } else {
      btn.classList.add('received');
      btn.textContent = '✓ Ontvangen';
      txt.classList.add('struck');
    }
  }

  // ── Collect data ──────────────────────────────────────────
  function getData() {
    // Borrowers
    const borrowerRows = document.querySelectorAll('#ts-borrower-rows .dyn-row');
    const borrowers = [...borrowerRows].map(row => ({
      name:       row.querySelector('.ts-b-name')?.value.trim() || '',
      address:    row.querySelector('.ts-b-address')?.value.trim() || '',
      postalCode: row.querySelector('.ts-b-postal')?.value.trim() || '',
      city:       row.querySelector('.ts-b-city')?.value.trim() || '',
    })).filter(b => b.name);

    // Objects
    const objects = [...document.querySelectorAll('.ts-obj-desc')].map(t => ({
      description: t.value.trim()
    })).filter(o => o.description);

    // Loan parts
    const loanParts = [...document.querySelectorAll('#ts-loanpart-rows .dyn-row')].map(row => ({
      amount:    parseFloat(row.querySelector('.ts-lp-amount')?.value) || 0,
      typeLabel: row.querySelector('.ts-lp-label')?.value.trim() || 'Termijnlening',
    })).filter(lp => lp.amount > 0);

    // Total loan amount
    const loanAmount = loanParts.reduce((s, lp) => s + lp.amount, 0);

    // Voorafgaande condities
    const voorafgaandeCondities = [...document.querySelectorAll('#ts-vooraf-rows .cond-row')].map(row => ({
      text:     row.querySelector('.ts-cond-text')?.value.trim() || '',
      received: row.querySelector('.cond-toggle')?.classList.contains('received') || false,
    })).filter(c => c.text);

    const entreekosten = {
      afsluit:    gv('ts-afsluit'),
      opstart:    gv('ts-opstart'),
      annulering: gv('ts-annulering'),
    };

    return {
      borrowers,
      borrowerName: borrowers[0]?.name || '',
      loanAmount,
      advisorName:       gv('ts-advisor'),
      reference:         gv('ts-ref'),
      phone:             gv('ts-phone'),
      email:             gv('ts-email'),
      city:              gv('ts-city'),
      date:              gv('ts-date'),
      salutation:        gv('ts-salutation'),
      objects,
      kredietgever:      gv('ts-kredietgever'),
      geldverstrekker:   gv('ts-geldverstrekker'),
      typeFaciliteit:    gv('ts-type'),
      valuta:            gv('ts-valuta'),
      loanParts,
      looptijd:          gv('ts-looptijd'),
      aflossing:         gv('ts-aflossing'),
      rente:             gv('ts-rente'),
      administratiekosten: gv('ts-adminkosten'),
      termijnbedrag:     gv('ts-termijnbedrag'),
      rentegrondslag:    gv('ts-rentegrondslag'),
      entreekosten,
      extraAflossen:     gv('ts-extra-aflossen'),
      betalingswijze:    gv('ts-betalingswijze'),
      zekerheden:        gv('ts-zekerheden'),
      verzekering:       gv('ts-verzekering'),
      condities:         gv('ts-condities'),
      toepasselijkRecht: gv('ts-recht'),
      beschikbaarheid:   gv('ts-beschikbaarheid'),
      overdracht:        gv('ts-overdracht'),
      voorafgaandeCondities,
      notaris:           gv('ts-notaris'),
      signingAdvisor:    gv('ts-signing-advisor'),
      validityDate:      gv('ts-validity'),
      signingDeadline:   gv('ts-signing-deadline'),
    };
  }

  // ── Helpers ──────────────────────────────────────────────
  function gv(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }
  function escHtml(s) {
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  return {
    render, getData,
    addBorrower, removeBorrower,
    addObject, removeObject,
    addLoanPart, removeLoanPart,
    addVooraf, removeVooraf, toggleVooraf,
  };
})();
