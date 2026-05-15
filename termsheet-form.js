/* ═══════════════════════════════════════════
   Termsheet Form — render & collect
═══════════════════════════════════════════ */

const TermsheetForm = (() => {

  // ── Default boilerplate ──────────────────────────────────
  const DEFAULT_CONDITIES =
    'De Kredietnemer verstrekt aan de Bemiddelaar tijdig alle relevante informatie die volledig, juist en niet-misleidend is, voor zover deze informatie redelijkerwijs van belang kan zijn voor de beoordeling, structurering en totstandkoming van de financiering.';

  const DEFAULT_TOEPASSELIJK_RECHT = 'Nederlands recht. Geschillen worden voorgelegd aan de bevoegde rechter in Nederland.';

  const DEFAULT_OVERDRACHT =
    'De rechten en verplichtingen van de Kredietnemer uit hoofde van deze lening zijn overdraagbaar zonder voorafgaande schriftelijke toestemming van de Kredietnemer.';

  const DEFAULT_BETALINGSWIJZE =
    'De rente en eventuele aflossingen zijn per maand achteraf verschuldigd en worden automatisch geïncasseerd van de door de Kredietnemer opgegeven bankrekening.';

  const DEFAULT_BETALINGSWIJZE_PRIVE =
    'De rente en kosten zijn maandelijks achteraf verschuldigd en dienen door Kredietnemer te worden voldaan op een door Kredietgever aan te wijzen bankrekening.';

  const DEFAULT_VERZEKERING =
    'De Kredietnemer zorgt voor de gebruikelijke en voldoende dekking hebbende opstalverzekering.';

  const DEFAULT_BESCHIKBAARHEID =
    'De lening is beschikbaar na ondertekening van de leningsovereenkomst en afgifte van alle gevraagde zekerheden, doch uiterlijk 2 maanden na dagtekening van deze Termsheet.';

  const DEFAULT_RENTEGRONDSLAG =
    'Ten behoeve van de berekening van de rente wordt de maand op het werkelijke aantal dagen en het kalenderjaar op 360 dagen gesteld.';

  const DEFAULT_RENTE =
    '7,56% per jaar, per maand achteraf te voldoen.\nVanaf datum beschikbaar stellen gelden door investeerders wordt de lening rentedragend.';

  const DEFAULT_EXTRA_AFLOSSEN =
    'Indien u de lening geheel of gedeeltelijk aflost binnen 12 maanden na passeren bedragen de kosten 12 maanden het termijnbedrag verminderd met de reeds betaalde termijnbedragen. Na 12 maanden kan er volledig boetevrij worden afgelost met een aanzegtermijn van minimaal 1 maand. Minimale aflossing bedraagt € 50.000,- per transactie met een administratievergoeding van € 250,- per keer.';

  function buildDefaultVoorafCondities(objectCount) {
    const n = objectCount || 1;
    const condities = [
      { text: 'Geldig legitimatiebewijs van de kredietnemer', received: false },
    ];
    if (n === 1) {
      condities.push({ text: 'Bewijs van eigendom object 1', received: false });
    } else {
      for (let i = 1; i <= n; i++) {
        condities.push({ text: `Bewijs van eigendom object ${i}`, received: false });
      }
    }
    condities.push({ text: 'Aangifte inkomstenbelasting van de kredietnemer', received: false });
    condities.push({ text: 'Actueel taxatierapport van het onderpand', received: false });
    return condities;
  }

  const DEFAULT_ADVISEURS    = ['Marco Lange', 'Christian de Vries', 'Olivier Bonnema'];
  const DEFAULT_FACILITEITEN = [
    'Hypothecaire geldlening, aflossingsvrij',
    'Hypothecaire geldlening, annuïtair',
    'Hypothecaire geldlening, lineair',
  ];

  // ── localStorage helpers ─────────────────────────────────
  function getAdviseurs() {
    try {
      const stored = localStorage.getItem('ts_adviseurs');
      return stored ? JSON.parse(stored) : [...DEFAULT_ADVISEURS];
    } catch { return [...DEFAULT_ADVISEURS]; }
  }
  function saveAdviseurs(list) { localStorage.setItem('ts_adviseurs', JSON.stringify(list)); }

  function getFaciliteiten() {
    try {
      const stored = localStorage.getItem('ts_faciliteiten');
      return stored ? JSON.parse(stored) : [...DEFAULT_FACILITEITEN];
    } catch { return [...DEFAULT_FACILITEITEN]; }
  }
  function saveFaciliteiten(list) { localStorage.setItem('ts_faciliteiten', JSON.stringify(list)); }

  // ── Date helper ───────────────────────────────────────────
  function addDays(isoDate, days) {
    if (!isoDate) return '';
    const d = new Date(isoDate);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  function addMonths(isoDate, months) {
    if (!isoDate) return '';
    const d = new Date(isoDate);
    d.setMonth(d.getMonth() + months);
    return d.toISOString().slice(0, 10);
  }

  function onDateChange(value) {
    const deadline = document.getElementById('ts-signing-deadline');
    if (deadline && !deadline.dataset.userEdited) {
      deadline.value = addDays(value, 7);
      onDeadlineChange(deadline.value);
    }
  }

  function onDeadlineChange(value) {
    const validity = document.getElementById('ts-validity');
    if (validity && !validity.dataset.userEdited) {
      validity.value = addMonths(value, 1);
    }
  }

  // ── Index helpers for dynamic rows ───────────────────────
  function nextIdx(containerSelector, idPrefix) {
    const rows = document.querySelectorAll(`${containerSelector} [id^="${idPrefix}"]`);
    if (!rows.length) return 0;
    const indices = [...rows].map(r => parseInt(r.id.replace(idPrefix, ''), 10)).filter(n => !isNaN(n));
    return indices.length ? Math.max(...indices) + 1 : 0;
  }

  // ── Render ───────────────────────────────────────────────
  function render(container, existingData, settings) {
    const d = existingData || {};
    const s = settings || {};
    const borrowers = d.borrowers || [{ type: 'privepersoon', name: '', address: '', postalCode: '', city: '' }];
    const objects   = d.objects || [{ description: '', address: '', hypotheekRank: '1e', priorLienholders: [] }];
    const loanParts = d.loanParts || [{ amount: '', typeLabel: 'Lening bij aanvang' }];
    const vooraf    = d.voorafgaandeCondities || buildDefaultVoorafCondities(objects.length).map(c => ({...c}));
    const entree    = d.entreekosten || { afsluit: '', opstart: '', annulering: '' };

    const today      = new Date().toISOString().slice(0, 10);
    const baseDate   = d.date || today;
    const firstBorrowerType = (borrowers[0]?.type) || 'privepersoon';
    const defaultBetalingswijze = firstBorrowerType === 'bv' ? DEFAULT_BETALINGSWIJZE : DEFAULT_BETALINGSWIJZE_PRIVE;
    const adviseurs  = getAdviseurs();
    const faciliteiten = getFaciliteiten();

    container.innerHTML = `
      <h2 style="font-size:18px;font-weight:700;margin-bottom:1.25rem">
        ${existingData ? 'Termsheet bewerken' : 'Nieuwe Termsheet'}
      </h2>

      <!-- 1. Geldnemers & adres -->
      ${section('Geldnemers & adres', `
        <div class="dynamic-rows" id="ts-borrower-rows">
          ${borrowers.map((b, i) => borrowerRow(b, i)).join('')}
        </div>
        <button class="btn-add" onclick="TermsheetForm.addBorrower()">+ Geldnemer toevoegen</button>
      `)}

      <!-- 2. Adviseur & referentie -->
      ${section('Adviseur & referentie', `
        <div class="form-row">
          <div class="form-group">
            <label>Adviseur naam</label>
            <div style="display:flex;gap:.5rem;align-items:center">
              <select id="ts-advisor" style="flex:1">
                ${adviseurs.map(a => `<option value="${escHtml(a)}"${(d.advisorName || s.advisorName || '') === a ? ' selected' : ''}>${escHtml(a)}</option>`).join('')}
              </select>
              <button type="button" class="btn-manage" onclick="TermsheetForm.openAdvisorManager()">+ Beheer adviseurs</button>
            </div>
          </div>
          <div class="form-group">
            <label>Referentie</label>
            <input type="text" id="ts-ref" value="${escHtml(d.reference || 'LA-2026-')}" placeholder="LA-2026-001">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Telefoon</label>
            <input type="tel" id="ts-phone" value="${escHtml(d.phone || s.advisorPhone || '+31 23 517 31 00')}">
          </div>
          <div class="form-group">
            <label>E-mail</label>
            <input type="email" id="ts-email" value="${escHtml(d.email || s.advisorEmail || 'info@langefa.nl')}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Stad (van opstelling)</label>
            <input type="text" id="ts-city" value="${escHtml(d.city || 'Haarlem')}">
          </div>
          <div class="form-group">
            <label>Datum</label>
            <input type="date" id="ts-date" value="${baseDate}" onchange="TermsheetForm.onDateChange(this.value)">
          </div>
        </div>
        <div class="form-group">
          <label>Aanhef geldnemer</label>
          <input type="text" id="ts-salutation" value="${escHtml(d.salutation || '')}" placeholder="Bijv. de heer Jansen">
        </div>
      `)}

      <!-- 3. Onderpanden -->
      ${section('Onderpanden (zekerheden)', `
        <div class="info-row">ℹ️ Voer de volledige kadastrale omschrijving in. Kies het recht van hypotheek en vul het korte adres in voor de zekerheden-sectie.</div>
        <div class="dynamic-rows" id="ts-obj-rows">
          ${objects.map((o, i) => objectRow(o, i)).join('')}
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
            <input type="text" id="ts-geldverstrekker" value="${escHtml(d.geldverstrekker || 'Bemiddeling via Lange & Partners Financieel Advies')}">
          </div>
        </div>
        <div class="form-group">
          <label>Doel financiering</label>
          <select id="ts-doel">
            <option value="een herfinanciering"${(!d.doelFinanciering || d.doelFinanciering === 'een herfinanciering') ? ' selected' : ''}>Een herfinanciering</option>
            <option value="een verbouwing"${d.doelFinanciering === 'een verbouwing' ? ' selected' : ''}>Een verbouwing</option>
            <option value="de aankoop van een eigen woning"${d.doelFinanciering === 'de aankoop van een eigen woning' ? ' selected' : ''}>De aankoop van een eigen woning</option>
            <option value="de aankoop van een beleggingspand"${d.doelFinanciering === 'de aankoop van een beleggingspand' ? ' selected' : ''}>De aankoop van een beleggingspand</option>
            <option value="een overbrugging"${d.doelFinanciering === 'een overbrugging' ? ' selected' : ''}>Een overbrugging</option>
          </select>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Type faciliteit</label>
            <div style="display:flex;gap:.5rem;align-items:center">
              <select id="ts-type" style="flex:1">
                ${faciliteiten.map(f => `<option value="${escHtml(f)}"${(d.typeFaciliteit || faciliteiten[0]) === f ? ' selected' : ''}>${escHtml(f)}</option>`).join('')}
              </select>
              <button type="button" class="btn-manage" onclick="TermsheetForm.openFaciliteitManager()">+ Beheer</button>
            </div>
          </div>
          <div class="form-group">
            <label>Valuta</label>
            <input type="text" id="ts-valuta" value="${escHtml(d.valuta || 'Euro (€)')}">
          </div>
        </div>

        <div class="form-group">
          <label>Leningsdelen</label>
          <div class="dynamic-rows" id="ts-loanpart-rows">
            ${loanParts.map((lp, i) => loanPartRow(lp, i)).join('')}
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
            <textarea id="ts-rentegrondslag" rows="2">${escHtml(d.rentegrondslag || DEFAULT_RENTEGRONDSLAG)}</textarea>
          </div>
        </div>

        <div class="form-group">
          <label>Aflossing</label>
          <select id="ts-aflossing">
            <option value="Aflossingsvrij — ineens aan het einde van de looptijd."${(!d.aflossing || d.aflossing === 'Aflossingsvrij — ineens aan het einde van de looptijd.') ? ' selected' : ''}>Aflossingsvrij — ineens aan het einde van de looptijd.</option>
            <option value="Annuïtair — aflossing gedurende de looptijd van de lening."${d.aflossing === 'Annuïtair — aflossing gedurende de looptijd van de lening.' ? ' selected' : ''}>Annuïtair — aflossing gedurende de looptijd van de lening.</option>
          </select>
        </div>

        <div class="form-row">
          <div class="form-group" style="flex:0 0 160px">
            <label>Rentepercentage (%)</label>
            <input type="number" id="ts-rente-pct" step="0.01" min="0" max="100"
              value="${d.rentePct || ''}" placeholder="Bijv. 7.56">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Rente</label>
            <textarea id="ts-rente" rows="3">${escHtml(d.rente !== undefined ? d.rente : DEFAULT_RENTE)}</textarea>
          </div>
          <div class="form-group">
            <label>Administratiekosten</label>
            <textarea id="ts-adminkosten" rows="2">${escHtml(d.administratiekosten !== undefined ? d.administratiekosten : '0,07% per maand achteraf te voldoen over de hoofdsom.')}</textarea>
          </div>
        </div>

        <div class="form-row" style="align-items:flex-end">
          <div class="form-group" style="flex:1">
            <label>Termijnbedrag (maandelijks)</label>
            <input type="number" id="ts-termijnbedrag" value="${d.termijnbedrag || ''}" placeholder="Bijv. 4250" min="0" step="1"
              oninput="TermsheetForm.updateTermijnInfo()">
            <div id="ts-termijn-hint" style="font-size:11px;color:#888;margin-top:3px;display:${(d.aflossing||'').toLowerCase().includes('lineair') ? 'block' : 'none'}">
              Bij lineaire aflossing is dit het gemiddelde maandbedrag.
            </div>
          </div>
          <div class="form-group" style="flex:0 0 auto;padding-bottom:1px">
            <button type="button" class="btn btn-ghost"
              onclick="TermsheetForm.berekenTermijn()"
              title="Bereken op basis van leenbedrag, rente en looptijd">
              🧮 Bereken
            </button>
          </div>
        </div>
        <div class="form-row" style="margin-top:.25rem">
          <div class="form-group">
            <label style="color:#888">Administratiekosten p/m (berekend)</label>
            <input type="text" id="ts-admin-computed" readonly style="background:#f5f5f5;color:#666" value="">
          </div>
          <div class="form-group">
            <label style="color:#888">Totaal per maand (berekend)</label>
            <input type="text" id="ts-totaal-computed" readonly style="background:#f5f5f5;color:#666" value="">
          </div>
        </div>

        <div style="margin-top:.75rem">
          <label style="font-size:12px;font-weight:700;color:var(--text-light);text-transform:uppercase;letter-spacing:.3px">Entreekosten</label>
          <div class="form-row-3" style="margin-top:.4rem">
            <div class="form-group">
              <label>Afsluitkosten (€)</label>
              <input type="number" id="ts-afsluit" value="${entree.afsluit || ''}" placeholder="Bijv. 2000" min="0" step="1"
                oninput="this.dataset.userEdited='1';TermsheetForm.updateOpstartRestant()">
            </div>
            <div class="form-group">
              <label>Opstartkosten (€)</label>
              <input type="number" id="ts-opstart" value="${entree.opstart || ''}" placeholder="Bijv. 500" min="0" step="1"
                oninput="TermsheetForm.updateOpstartRestant()">
            </div>
            <div class="form-group">
              <label>Annuleringskosten (€)</label>
              <input type="number" id="ts-annulering" value="${entree.annulering || ''}" placeholder="Bijv. 1000" min="0" step="1"
                oninput="this.dataset.userEdited='1'">
            </div>
          </div>
          <div class="form-group" style="margin-top:.4rem">
            <label style="color:#888">Restant bij passering (berekend)</label>
            <input type="text" id="ts-opstart-restant" readonly style="background:#f5f5f5;color:#666" value="">
          </div>
        </div>

        <div class="form-group" style="margin-top:.75rem">
          <label>(Extra) Aflossen</label>
          <textarea id="ts-extra-aflossen" rows="5">${escHtml(d.extraAflossen !== undefined ? d.extraAflossen : DEFAULT_EXTRA_AFLOSSEN)}</textarea>
        </div>
      `)}

      <!-- 5. Aanvullende bepalingen -->
      ${section('Aanvullende bepalingen', `
        <div class="form-group">
          <label>Betalingswijze</label>
          <textarea id="ts-betalingswijze" rows="3" oninput="this.dataset.userEdited='1'">${escHtml(d.betalingswijze !== undefined ? d.betalingswijze : defaultBetalingswijze)}</textarea>
        </div>
        <div class="form-group">
          <label>Zekerheden <span style="font-weight:400;color:#888;font-size:11px">(preview — wordt automatisch gegenereerd)</span></label>
          <textarea id="ts-zekerheden-preview" rows="6" readonly style="background:#f8f7fa;color:#555;cursor:default"></textarea>
        </div>
        <div class="form-group">
          <label>Verzekering</label>
          <textarea id="ts-verzekering" rows="3">${escHtml(d.verzekering !== undefined ? d.verzekering : DEFAULT_VERZEKERING)}</textarea>
        </div>
        <div class="form-group">
          <label>Condities</label>
          <textarea id="ts-condities" rows="4">${escHtml(d.condities !== undefined ? d.condities : DEFAULT_CONDITIES)}</textarea>
        </div>
        <div class="form-group">
          <label>Toepasselijk recht</label>
          <textarea id="ts-recht" rows="2">${escHtml(d.toepasselijkRecht !== undefined ? d.toepasselijkRecht : DEFAULT_TOEPASSELIJK_RECHT)}</textarea>
        </div>
        <div class="form-group">
          <label>Beschikbaarheid</label>
          <textarea id="ts-beschikbaarheid" rows="2">${escHtml(d.beschikbaarheid !== undefined ? d.beschikbaarheid : DEFAULT_BESCHIKBAARHEID)}</textarea>
        </div>
        <div class="form-group">
          <label>Overdracht</label>
          <textarea id="ts-overdracht" rows="2">${escHtml(d.overdracht !== undefined ? d.overdracht : DEFAULT_OVERDRACHT)}</textarea>
        </div>
      `)}

      <!-- 6. Voorafgaande condities -->
      ${section('Voorafgaande condities', `
        <div class="info-row">ℹ️ Markeer als "Ontvangen" voor een doorgehaalde weergave. Sleep rijen om de volgorde aan te passen.</div>
        <div id="ts-vooraf-rows">
          ${vooraf.map((c, i) => voorafRow(c, i)).join('')}
        </div>
        <button class="btn-add" onclick="TermsheetForm.addVooraf()">+ Conditie toevoegen</button>
      `)}

      <!-- 7. Afsluiting -->
      ${section('Afsluiting', `
        <div class="form-row">
          <div class="form-group">
            <label>Notaris</label>
            <input type="text" id="ts-notaris" value="${escHtml(d.notaris || s.notaris || 'Smith Boeser van Grafhorst notarissen te Haarlem')}">
          </div>
          <div class="form-group">
            <label>Tekenbevoegde adviseur</label>
            <input type="text" id="ts-signing-advisor" value="${escHtml(d.signingAdvisor || s.advisorName || '')}" placeholder="Naam">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Ondertekeningsdeadline</label>
            <input type="date" id="ts-signing-deadline" value="${d.signingDeadline || addDays(baseDate, 7)}"
              oninput="this.dataset.userEdited='1';TermsheetForm.onDeadlineChange(this.value)">
          </div>
          <div class="form-group">
            <label>Geldigheidsduur (datum)</label>
            <input type="date" id="ts-validity" value="${d.validityDate || addMonths(d.signingDeadline || addDays(baseDate, 7), 1)}"
              oninput="this.dataset.userEdited='1'">
          </div>
        </div>
      `)}
    `;

    setTimeout(() => {
      updateTermijnInfo(); updateOpstartRestant(); updateZekerhedenPreview();
      document.getElementById('ts-obj-rows')?.addEventListener('input', updateZekerhedenPreview);
      document.getElementById('ts-loanpart-rows')?.addEventListener('input', updateZekerhedenPreview);
    }, 0);
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
    const isBV      = b.type === 'bv';
    const isHolding = b.holdingBV || false;
    return `
    <div class="dyn-row ts-borrower-card" id="ts-br-${i}" style="flex-direction:column;align-items:stretch;gap:.6rem;padding:.75rem">
      <div style="display:flex;align-items:center;gap:.75rem">
        <select class="ts-b-type" onchange="TermsheetForm.toggleBorrowerType(${i})" style="width:160px">
          <option value="privepersoon"${!isBV ? ' selected' : ''}>Privépersoon</option>
          <option value="bv"${isBV ? ' selected' : ''}>B.V.</option>
        </select>
        <button class="btn-rm" onclick="TermsheetForm.removeBorrower(${i})" title="Verwijderen" style="margin-left:auto">×</button>
      </div>

      <div class="ts-b-priv-fields" style="${isBV ? 'display:none' : ''}">
        <div style="display:flex;flex-wrap:wrap;gap:.5rem">
          <input type="text" placeholder="Volledige naam" value="${escHtml(b.name||'')}" style="flex:1 0 45%;min-width:160px" class="ts-b-name">
          <input type="text" placeholder="Straat + huisnr." value="${escHtml(b.address||'')}" style="flex:1 0 45%;min-width:160px" class="ts-b-address ts-b-address-priv">
          <input type="text" placeholder="Postcode" value="${escHtml(b.postalCode||'')}" style="flex:0 0 100px" class="ts-b-postal ts-b-postal-priv">
          <input type="text" placeholder="Woonplaats" value="${escHtml(b.city||'')}" style="flex:1 0 140px" class="ts-b-city ts-b-city-priv">
        </div>
      </div>

      <div class="ts-b-bv-fields" style="${!isBV ? 'display:none' : ''}">
        <div style="display:flex;flex-wrap:wrap;gap:.5rem">
          <input type="text" placeholder="Naam B.V." value="${escHtml(b.bvName||b.name||'')}" style="flex:1 0 45%;min-width:160px" class="ts-b-bv-name">
          <input type="text" placeholder="Straat + huisnr." value="${escHtml(b.address||'')}" style="flex:1 0 45%;min-width:160px" class="ts-b-address ts-b-address-bv">
          <input type="text" placeholder="Postcode" value="${escHtml(b.postalCode||'')}" style="flex:0 0 100px" class="ts-b-postal ts-b-postal-bv">
          <input type="text" placeholder="Woonplaats" value="${escHtml(b.city||'')}" style="flex:1 0 140px" class="ts-b-city ts-b-city-bv">
        </div>
        <div style="display:flex;gap:.5rem;align-items:center;margin-top:.5rem">
          <select class="ts-b-vert-salut" style="width:90px">
            <option value="Dhr."${(b.vertegenwoordigerSalut||'Dhr.') === 'Dhr.' ? ' selected' : ''}>Dhr.</option>
            <option value="Mevr."${(b.vertegenwoordigerSalut||'') === 'Mevr.' ? ' selected' : ''}>Mevr.</option>
          </select>
          <input type="text" placeholder="Vertegenwoordiger (naam)" value="${escHtml(b.vertegenwoordiger||'')}" style="flex:1" class="ts-b-vert-name">
        </div>
        <div style="margin-top:.5rem">
          <label style="display:flex;align-items:center;gap:.5rem;cursor:pointer;font-size:13px">
            <input type="checkbox" class="ts-b-holding-check"${isHolding ? ' checked' : ''} onchange="TermsheetForm.toggleHolding(${i})">
            Vertegenwoordiger is een Holding B.V.
          </label>
        </div>
        <div class="ts-b-holding-fields" style="${!isHolding ? 'display:none' : ''};margin-top:.5rem">
          <input type="text" placeholder="Naam Holding B.V." value="${escHtml(b.holdingName||'')}" style="width:100%" class="ts-b-holding-name">
        </div>
      </div>
    </div>`;
  }

  const HYPOTHEEK_RANKS = ['1e', '2e', '3e', '4e'];
  const RANK_LABELS = { '1e': 'eerste', '2e': 'tweede', '3e': 'derde', '4e': 'vierde' };

  function objectRow(o, i) {
    const rank = o.hypotheekRank || '1e';
    const priors = o.priorLienholders || [];
    const numPriors = HYPOTHEEK_RANKS.indexOf(rank);
    return `<div class="dyn-row" id="ts-obj-${i}" style="flex-direction:column;align-items:stretch;gap:.5rem;padding:.75rem">
      <div style="display:flex;gap:.5rem;align-items:center">
        <span style="font-weight:700;color:#2E2060;min-width:24px">Object ${i+1}</span>
        <button class="btn-rm" onclick="TermsheetForm.removeObject(${i})" title="Verwijderen" style="margin-left:auto">×</button>
      </div>
      <textarea placeholder="Volledige kadastrale omschrijving van het onderpand..." style="flex:1;min-height:70px" class="ts-obj-desc">${escHtml(o.description||'')}</textarea>
      <div style="display:flex;gap:.5rem;flex-wrap:wrap">
        <div class="form-group" style="flex:1;min-width:200px">
          <label>Kort adres (voor zekerheden)</label>
          <input type="text" placeholder="Bijv. Meije 45 te 2411 PJ Bodegraven" class="ts-obj-address" value="${escHtml(o.address||'')}">
        </div>
        <div class="form-group" style="flex:0 0 180px">
          <label>Recht van hypotheek</label>
          <select class="ts-obj-rank" onchange="TermsheetForm.toggleHypotheekRank(${i})">
            ${HYPOTHEEK_RANKS.map(r => `<option value="${r}"${rank === r ? ' selected' : ''}>${r} recht van hypotheek</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="ts-obj-priors" style="${numPriors < 1 ? 'display:none' : ''}">
        ${Array.from({length: Math.max(numPriors, 0)}, (_, pi) => priorLienholderRow(priors[pi] || {}, i, pi)).join('')}
      </div>
    </div>`;
  }

  function priorLienholderRow(pl, objIdx, priorIdx) {
    const rankLabel = RANK_LABELS[HYPOTHEEK_RANKS[priorIdx]] || `${priorIdx + 1}e`;
    return `<div class="ts-prior-row" style="border:1px solid #e0e0e0;border-radius:6px;padding:.5rem;margin-top:.4rem;background:#fafafa">
      <div style="font-size:11px;font-weight:600;color:#888;margin-bottom:.3rem;text-transform:uppercase">Bestaand ${rankLabel} recht van hypotheek</div>
      <div style="display:flex;gap:.5rem;flex-wrap:wrap">
        <div class="form-group" style="flex:1;min-width:160px">
          <label>Naam hypotheekhouder</label>
          <input type="text" placeholder="Bijv. ING Bank N.V." class="ts-prior-name" value="${escHtml(pl.name||'')}">
        </div>
        <div class="form-group" style="flex:0 0 160px">
          <label>Inschrijving (€)</label>
          <input type="number" placeholder="900000" class="ts-prior-inschrijving" value="${pl.inschrijving||''}" min="0" step="1">
        </div>
        <div class="form-group" style="flex:0 0 160px">
          <label>Actuele hoofdsom (€)</label>
          <input type="number" placeholder="660239" class="ts-prior-currentOwed" value="${pl.currentOwed||''}" min="0" step="1">
        </div>
      </div>
    </div>`;
  }

  function loanPartRow(lp, i) {
    const label = lp.typeLabel || 'Lening bij aanvang';
    return `<div class="dyn-row" id="ts-lp-${i}">
      <input type="number" placeholder="Bedrag" value="${lp.amount||''}" style="flex:1;min-width:120px" class="ts-lp-amount" min="0" step="1"
        oninput="TermsheetForm.updateTermijnInfo()">
      <select class="ts-lp-label" style="flex:1">
        <option value="Lening bij aanvang"${label === 'Lening bij aanvang' ? ' selected' : ''}>Lening bij aanvang</option>
        <option value="Rentedepot"${label === 'Rentedepot' ? ' selected' : ''}>Rentedepot</option>
        <option value="Bouwdepot"${label === 'Bouwdepot' ? ' selected' : ''}>Bouwdepot</option>
      </select>
      <button class="btn-rm" onclick="TermsheetForm.removeLoanPart(${i})" title="Verwijderen">×</button>
    </div>`;
  }

  function voorafRow(c, i) {
    const cls    = c.received ? 'received' : '';
    const txtCls = c.received ? 'struck' : '';
    return `<div class="cond-row" id="ts-cond-${i}" draggable="true"
      ondragstart="TermsheetForm._dragStart(event,${i})"
      ondragover="TermsheetForm._dragOver(event)"
      ondrop="TermsheetForm._dragDrop(event,${i})"
      ondragend="TermsheetForm._dragEnd(event)"
      style="cursor:default">
      <span class="drag-handle" title="Slepen om te sorteren" style="color:#bbb;padding:0 6px;cursor:grab;font-size:16px;line-height:1;user-select:none">⠿</span>
      <input type="text" placeholder="Voorafgaande conditie..." value="${escHtml(c.text||'')}" class="ts-cond-text ${txtCls}">
      <button class="cond-toggle ${cls}" onclick="TermsheetForm.toggleVooraf(${i})" type="button">
        ${c.received ? '✓ Ontvangen' : 'Nog te ontvangen'}
      </button>
      <button class="btn-rm" onclick="TermsheetForm.removeVooraf(${i})" title="Verwijderen">×</button>
    </div>`;
  }

  // ── Borrower field toggles ────────────────────────────────
  function toggleBorrowerType(i) {
    const row = document.getElementById('ts-br-' + i);
    if (!row) return;
    const type      = row.querySelector('.ts-b-type')?.value;
    const privFields = row.querySelector('.ts-b-priv-fields');
    const bvFields   = row.querySelector('.ts-b-bv-fields');
    if (privFields) privFields.style.display = type === 'bv' ? 'none' : '';
    if (bvFields)   bvFields.style.display   = type === 'bv' ? '' : 'none';
    if (i === 0) {
      const betalingswijzeEl = document.getElementById('ts-betalingswijze');
      if (betalingswijzeEl && !betalingswijzeEl.dataset.userEdited) {
        betalingswijzeEl.value = type === 'bv' ? DEFAULT_BETALINGSWIJZE : DEFAULT_BETALINGSWIJZE_PRIVE;
      }
    }
  }

  function toggleHolding(i) {
    const row = document.getElementById('ts-br-' + i);
    if (!row) return;
    const checked      = row.querySelector('.ts-b-holding-check')?.checked;
    const holdingFields = row.querySelector('.ts-b-holding-fields');
    if (holdingFields) holdingFields.style.display = checked ? '' : 'none';
  }

  // ── Dynamic row management ────────────────────────────────
  function addBorrower() {
    const rows = document.getElementById('ts-borrower-rows');
    const i = nextIdx('#ts-borrower-rows', 'ts-br-');
    rows.insertAdjacentHTML('beforeend', borrowerRow({ type: 'privepersoon', name:'', address:'', postalCode:'', city:'' }, i));
  }
  function removeBorrower(i) {
    const el = document.getElementById('ts-br-' + i);
    if (el) el.remove();
  }

  function toggleHypotheekRank(objIdx) {
    const row = document.getElementById('ts-obj-' + objIdx);
    if (!row) return;
    const rank = row.querySelector('.ts-obj-rank')?.value || '1e';
    const numPriors = HYPOTHEEK_RANKS.indexOf(rank);
    const priorsContainer = row.querySelector('.ts-obj-priors');
    if (!priorsContainer) return;

    if (numPriors < 1) {
      priorsContainer.style.display = 'none';
      while (priorsContainer.firstChild) priorsContainer.removeChild(priorsContainer.firstChild);
      updateZekerhedenPreview();
      return;
    }

    priorsContainer.style.display = '';
    const existingRows = priorsContainer.querySelectorAll('.ts-prior-row');
    const existingData = [...existingRows].map(r => ({
      name:          r.querySelector('.ts-prior-name')?.value || '',
      inschrijving:  r.querySelector('.ts-prior-inschrijving')?.value || '',
      currentOwed:   r.querySelector('.ts-prior-currentOwed')?.value || '',
    }));

    while (priorsContainer.firstChild) priorsContainer.removeChild(priorsContainer.firstChild);
    for (let pi = 0; pi < numPriors; pi++) {
      priorsContainer.insertAdjacentHTML('beforeend', priorLienholderRow(existingData[pi] || {}, objIdx, pi));
    }
    updateZekerhedenPreview();
  }

  function addObject() {
    const rows = document.getElementById('ts-obj-rows');
    const i = nextIdx('#ts-obj-rows', 'ts-obj-');
    rows.insertAdjacentHTML('beforeend', objectRow({ description:'', address:'', hypotheekRank:'1e', priorLienholders:[] }, i));
  }
  function removeObject(i) {
    const el = document.getElementById('ts-obj-' + i);
    if (el) el.remove();
  }

  function addLoanPart() {
    const rows = document.getElementById('ts-loanpart-rows');
    const i = nextIdx('#ts-loanpart-rows', 'ts-lp-');
    rows.insertAdjacentHTML('beforeend', loanPartRow({ amount:'', typeLabel:'Lening bij aanvang' }, i));
  }
  function removeLoanPart(i) {
    const el = document.getElementById('ts-lp-' + i);
    if (el) el.remove();
  }

  function addVooraf() {
    const rows = document.getElementById('ts-vooraf-rows');
    const i = nextIdx('#ts-vooraf-rows', 'ts-cond-');
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

  // ── Drag-and-drop for vooraf rows ─────────────────────────
  let _dragSrcEl = null;

  function _dragStart(event, i) {
    _dragSrcEl = event.currentTarget;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(i));
    setTimeout(() => { if (_dragSrcEl) _dragSrcEl.style.opacity = '0.4'; }, 0);
  }

  function _dragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const row = event.currentTarget;
    if (row !== _dragSrcEl) {
      row.style.borderTop = '2px solid #2E2060';
    }
    return false;
  }

  function _dragEnd(event) {
    if (_dragSrcEl) _dragSrcEl.style.opacity = '';
    document.querySelectorAll('#ts-vooraf-rows .cond-row').forEach(r => r.style.borderTop = '');
    _dragSrcEl = null;
  }

  function _dragDrop(event, targetIndex) {
    event.stopPropagation();
    event.preventDefault();
    if (!_dragSrcEl) return false;
    const container = document.getElementById('ts-vooraf-rows');
    const tgtRow = event.currentTarget;
    if (_dragSrcEl === tgtRow) return false;
    const rows = [...container.querySelectorAll('.cond-row')];
    const srcIdx = rows.indexOf(_dragSrcEl);
    const tgtIdx = rows.indexOf(tgtRow);
    if (srcIdx < tgtIdx) {
      container.insertBefore(_dragSrcEl, tgtRow.nextSibling);
    } else {
      container.insertBefore(_dragSrcEl, tgtRow);
    }
    return false;
  }

  // ── List manager modal ────────────────────────────────────
  function openAdvisorManager() {
    _openListManager('Adviseurs beheren', getAdviseurs(), saveAdviseurs, 'ts-advisor');
  }

  function openFaciliteitManager() {
    _openListManager('Type faciliteiten beheren', getFaciliteiten(), saveFaciliteiten, 'ts-type');
  }

  function _openListManager(title, list, saveFn, selectId) {
    const existing = document.getElementById('ts-list-mgr-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'ts-list-mgr-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center';

    const renderItems = (items) => items.map((item, idx) => `
      <div style="display:flex;align-items:center;gap:.5rem;padding:.3rem 0;border-bottom:1px solid #f0f0f0">
        <span style="flex:1;font-size:14px">${escHtml(item)}</span>
        <button type="button" onclick="TermsheetForm._mgrRemove(${idx},'${selectId}')"
          style="color:#c44;border:none;background:none;cursor:pointer;font-size:18px;line-height:1;padding:0 4px">×</button>
      </div>`).join('');

    modal.innerHTML = `
      <div style="background:#fff;border-radius:10px;padding:1.5rem;width:440px;max-width:92vw;box-shadow:0 8px 32px rgba(0,0,0,.25)">
        <h3 style="margin:0 0 1rem;font-size:16px;color:#2E2060">${title}</h3>
        <div id="ts-mgr-list" style="max-height:260px;overflow-y:auto;margin-bottom:1rem">${renderItems(list)}</div>
        <div style="display:flex;gap:.5rem;margin-bottom:1rem">
          <input type="text" id="ts-mgr-new" placeholder="Nieuwe optie toevoegen..."
            style="flex:1;padding:.4rem .6rem;border:1px solid #ccc;border-radius:6px;font-size:14px"
            onkeydown="if(event.key==='Enter'){event.preventDefault();TermsheetForm._mgrAdd('${selectId}');}">
          <button type="button" onclick="TermsheetForm._mgrAdd('${selectId}')"
            style="padding:.4rem .9rem;background:#2E2060;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:14px">
            Toevoegen
          </button>
        </div>
        <div style="display:flex;justify-content:flex-end">
          <button type="button" onclick="document.getElementById('ts-list-mgr-modal').remove()"
            style="padding:.4rem .9rem;border:1px solid #ccc;border-radius:6px;cursor:pointer;font-size:14px">
            Sluiten
          </button>
        </div>
      </div>`;

    modal._saveFn  = saveFn;
    modal._list    = [...list];
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  }

  function _mgrRemove(idx, selectId) {
    const modal = document.getElementById('ts-list-mgr-modal');
    if (!modal) return;
    modal._list.splice(idx, 1);
    modal._saveFn(modal._list);
    _mgrRefresh(modal, selectId);
  }

  function _mgrAdd(selectId) {
    const modal = document.getElementById('ts-list-mgr-modal');
    const input = document.getElementById('ts-mgr-new');
    if (!modal || !input) return;
    const val = input.value.trim();
    if (!val) return;
    modal._list.push(val);
    modal._saveFn(modal._list);
    input.value = '';
    _mgrRefresh(modal, selectId);
  }

  function _mgrRefresh(modal, selectId) {
    const list   = modal._list;
    const select = document.getElementById(selectId);
    const curVal = select ? select.value : '';

    if (select) {
      select.innerHTML = list.map(item =>
        `<option value="${escHtml(item)}"${curVal === item ? ' selected' : ''}>${escHtml(item)}</option>`
      ).join('');
      if (!list.includes(curVal) && list.length) select.value = list[0];
    }

    const listDiv = document.getElementById('ts-mgr-list');
    if (listDiv) {
      listDiv.innerHTML = list.map((item, idx) => `
        <div style="display:flex;align-items:center;gap:.5rem;padding:.3rem 0;border-bottom:1px solid #f0f0f0">
          <span style="flex:1;font-size:14px">${escHtml(item)}</span>
          <button type="button" onclick="TermsheetForm._mgrRemove(${idx},'${selectId}')"
            style="color:#c44;border:none;background:none;cursor:pointer;font-size:18px;line-height:1;padding:0 4px">×</button>
        </div>`).join('');
    }
  }

  // ── Collect data ──────────────────────────────────────────
  function getData() {
    // Borrowers
    const borrowerRows = document.querySelectorAll('#ts-borrower-rows .dyn-row');
    const borrowers = [...borrowerRows].map(row => {
      const type = row.querySelector('.ts-b-type')?.value || 'privepersoon';
      if (type === 'bv') {
        const isHolding = row.querySelector('.ts-b-holding-check')?.checked || false;
        return {
          type:                   'bv',
          name:                   row.querySelector('.ts-b-bv-name')?.value.trim() || '',
          bvName:                 row.querySelector('.ts-b-bv-name')?.value.trim() || '',
          address:                row.querySelector('.ts-b-address')?.value.trim() || '',
          postalCode:             row.querySelector('.ts-b-postal')?.value.trim() || '',
          city:                   row.querySelector('.ts-b-city')?.value.trim() || '',
          vertegenwoordigerSalut: row.querySelector('.ts-b-vert-salut')?.value || 'Dhr.',
          vertegenwoordiger:      row.querySelector('.ts-b-vert-name')?.value.trim() || '',
          holdingBV:              isHolding,
          holdingName:            isHolding ? (row.querySelector('.ts-b-holding-name')?.value.trim() || '') : '',
        };
      } else {
        return {
          type:       'privepersoon',
          name:       row.querySelector('.ts-b-name')?.value.trim() || '',
          address:    row.querySelector('.ts-b-address')?.value.trim() || '',
          postalCode: row.querySelector('.ts-b-postal')?.value.trim() || '',
          city:       row.querySelector('.ts-b-city')?.value.trim() || '',
        };
      }
    }).filter(b => b.name);

    // Objects
    const objRows = document.querySelectorAll('#ts-obj-rows .dyn-row');
    const objects = [...objRows].map(row => {
      const rank = row.querySelector('.ts-obj-rank')?.value || '1e';
      const priorRows = row.querySelectorAll('.ts-prior-row');
      const priorLienholders = [...priorRows].map(pr => ({
        name:         pr.querySelector('.ts-prior-name')?.value.trim() || '',
        inschrijving: parseFloat(pr.querySelector('.ts-prior-inschrijving')?.value) || 0,
        currentOwed:  parseFloat(pr.querySelector('.ts-prior-currentOwed')?.value) || 0,
      })).filter(pl => pl.name);
      return {
        description:      row.querySelector('.ts-obj-desc')?.value.trim() || '',
        address:          row.querySelector('.ts-obj-address')?.value.trim() || '',
        hypotheekRank:    rank,
        priorLienholders,
      };
    }).filter(o => o.description);

    // Loan parts
    const loanParts = [...document.querySelectorAll('#ts-loanpart-rows .dyn-row')].map(row => ({
      amount:    parseFloat(row.querySelector('.ts-lp-amount')?.value) || 0,
      typeLabel: row.querySelector('.ts-lp-label')?.value || 'Lening bij aanvang',
    })).filter(lp => lp.amount > 0);

    const loanAmount = loanParts.reduce((s, lp) => s + lp.amount, 0);

    // Voorafgaande condities (in current DOM order, respects drag-and-drop)
    const voorafgaandeCondities = [...document.querySelectorAll('#ts-vooraf-rows .cond-row')].map(row => ({
      text:     row.querySelector('.ts-cond-text')?.value.trim() || '',
      received: row.querySelector('.cond-toggle')?.classList.contains('received') || false,
    })).filter(c => c.text);

    const entreekosten = {
      afsluit:    parseFloat(document.getElementById('ts-afsluit')?.value)    || 0,
      opstart:    parseFloat(document.getElementById('ts-opstart')?.value)    || 0,
      annulering: parseFloat(document.getElementById('ts-annulering')?.value) || 0,
    };

    return {
      borrowers,
      borrowerName:        borrowers[0]?.name || '',
      loanAmount,
      advisorName:         gv('ts-advisor'),
      reference:           gv('ts-ref'),
      phone:               gv('ts-phone'),
      email:               gv('ts-email'),
      city:                gv('ts-city'),
      date:                gv('ts-date'),
      salutation:          gv('ts-salutation'),
      objects,
      kredietgever:        gv('ts-kredietgever'),
      geldverstrekker:     gv('ts-geldverstrekker'),
      doelFinanciering:    gv('ts-doel'),
      typeFaciliteit:      gv('ts-type'),
      valuta:              gv('ts-valuta'),
      loanParts,
      looptijd:            gv('ts-looptijd'),
      aflossing:           gv('ts-aflossing'),
      rentePct:            parseFloat(document.getElementById('ts-rente-pct')?.value) || 0,
      rente:               gv('ts-rente'),
      administratiekosten: gv('ts-adminkosten'),
      termijnbedrag:       parseFloat(document.getElementById('ts-termijnbedrag')?.value) || 0,
      rentegrondslag:      gv('ts-rentegrondslag'),
      entreekosten,
      extraAflossen:       gv('ts-extra-aflossen'),
      betalingswijze:      gv('ts-betalingswijze'),
      zekerheden:          '',
      verzekering:         gv('ts-verzekering'),
      condities:           gv('ts-condities'),
      toepasselijkRecht:   gv('ts-recht'),
      beschikbaarheid:     gv('ts-beschikbaarheid'),
      overdracht:          gv('ts-overdracht'),
      voorafgaandeCondities,
      notaris:             gv('ts-notaris'),
      signingAdvisor:      gv('ts-signing-advisor'),
      validityDate:        gv('ts-validity'),
      signingDeadline:     gv('ts-signing-deadline'),
    };
  }

  // ── Termijnbedrag berekening ──────────────────────────────
  function berekenTermijn() {
    const P = [...document.querySelectorAll('#ts-loanpart-rows .dyn-row')].reduce((sum, row) => {
      return sum + (parseFloat(row.querySelector('.ts-lp-amount')?.value) || 0);
    }, 0);

    const rJaar  = parseFloat(document.getElementById('ts-rente-pct')?.value) || 0;
    const rMaand = rJaar / 100 / 12;

    const looptijdRaw  = document.getElementById('ts-looptijd')?.value || '';
    const maandenMatch = looptijdRaw.match(/(\d+)\s*(mnd|maand|maanden)/i);
    const jarenMatch   = looptijdRaw.match(/(\d+)\s*(jr|jaar|jaren)/i);
    let n = 0;
    if (maandenMatch)    n = parseInt(maandenMatch[1]);
    else if (jarenMatch) n = parseInt(jarenMatch[1]) * 12;
    else                 n = parseInt(looptijdRaw) || 0;

    if (!P || !rMaand || !n) {
      alert('Vul het leenbedrag (bij leningsdelen), het rentepercentage en de looptijd in om te kunnen berekenen.');
      return;
    }

    const aflossing = document.getElementById('ts-aflossing')?.value || '';
    let maandbedrag = 0;

    if (aflossing.toLowerCase().includes('annuï')) {
      maandbedrag = P * rMaand / (1 - Math.pow(1 + rMaand, -n));
    } else if (aflossing.toLowerCase().includes('lineair')) {
      const aflDeel = P / n;
      const gemRente = rMaand * (P + (P - aflDeel)) / 2;
      maandbedrag = aflDeel + gemRente;
    } else {
      maandbedrag = P * rMaand;
    }

    document.getElementById('ts-termijnbedrag').value = maandbedrag.toFixed(2);

    // Toon/verberg lineair-hint
    const hint = document.getElementById('ts-termijn-hint');
    if (hint) hint.style.display = aflossing.toLowerCase().includes('lineair') ? 'block' : 'none';

    updateTermijnInfo();
  }

  // ── Computed field updaters ───────────────────────────────
  function updateTermijnInfo() {
    const totalLoan = [...document.querySelectorAll('#ts-loanpart-rows .dyn-row')].reduce((sum, row) => {
      return sum + (parseFloat(row.querySelector('.ts-lp-amount')?.value) || 0);
    }, 0);
    const termijn = parseFloat(document.getElementById('ts-termijnbedrag')?.value) || 0;
    const admin   = totalLoan * 0.0007;
    const totaal  = termijn + admin;
    const adminEl  = document.getElementById('ts-admin-computed');
    const totaalEl = document.getElementById('ts-totaal-computed');
    if (adminEl)  adminEl.value  = totalLoan > 0 ? `€ ${admin.toFixed(2).replace('.', ',')}` : '';
    if (totaalEl) totaalEl.value = (termijn > 0 || totalLoan > 0) ? `€ ${totaal.toFixed(2).replace('.', ',')}` : '';

    const afsluitEl = document.getElementById('ts-afsluit');
    if (afsluitEl && !afsluitEl.dataset.userEdited && totalLoan > 0) {
      afsluitEl.value = Math.max(Math.round(totalLoan * 0.01), 3000);
      updateOpstartRestant();
    }
    const annuleringEl = document.getElementById('ts-annulering');
    if (annuleringEl && !annuleringEl.dataset.userEdited && totalLoan > 0) {
      annuleringEl.value = Math.max(Math.round(totalLoan * 0.01), 3000);
    }
  }

  function updateOpstartRestant() {
    const afsluit = parseFloat(document.getElementById('ts-afsluit')?.value) || 0;
    const opstart = parseFloat(document.getElementById('ts-opstart')?.value) || 0;
    const restant = afsluit - opstart;
    const el = document.getElementById('ts-opstart-restant');
    if (el) {
      if (opstart > 0 && afsluit > 0) {
        el.value = `€ ${Math.round(restant > 0 ? restant : 0).toLocaleString('nl-NL')},-`;
      } else {
        el.value = '';
      }
    }
  }

  // ── Zekerheden preview ────────────────────────────────────
  const RANK_WORDS = { '1e': 'eerste', '2e': 'tweede', '3e': 'derde', '4e': 'vierde' };

  function _numToWords(n) {
    if (!n || n === 0) return 'nul';
    n = Math.round(n);
    const ones = ['','een','twee','drie','vier','vijf','zes','zeven','acht','negen','tien','elf','twaalf','dertien','veertien','vijftien','zestien','zeventien','achttien','negentien'];
    const tens = ['','','twintig','dertig','veertig','vijftig','zestig','zeventig','tachtig','negentig'];
    function d2(n) { if(n<20) return ones[n]; const t=Math.floor(n/10),u=n%10; if(!u) return tens[t]; const w=ones[u]; return w+(w.endsWith('e')?'ën':'en')+tens[t]; }
    function d3(n) { if(n<100) return d2(n); const h=Math.floor(n/100),r=n%100; return (h===1?'':ones[h])+'honderd'+(r>0?d2(r):''); }
    function b1m(n) { if(n<1000) return d3(n); const t=Math.floor(n/1000),r=n%1000; return (t===1?'':d3(t))+'duizend'+(r>0?' '+d3(r):''); }
    if(n>=1000000){const m=Math.floor(n/1000000),r=n%1000000; return (m===1?'een miljoen':b1m(m)+' miljoen')+(r>0?' '+b1m(r):'');}
    return b1m(n);
  }

  function _fmtE(n) {
    if (!n) return '—';
    return '€ ' + new Intl.NumberFormat('nl-NL',{minimumFractionDigits:0,maximumFractionDigits:0}).format(Math.round(n)) + ',-';
  }

  function updateZekerhedenPreview() {
    const el = document.getElementById('ts-zekerheden-preview');
    if (!el) return;

    const totalLoan = [...document.querySelectorAll('#ts-loanpart-rows .dyn-row')].reduce((s, r) => {
      return s + (parseFloat(r.querySelector('.ts-lp-amount')?.value) || 0);
    }, 0);

    const objRows = document.querySelectorAll('#ts-obj-rows .dyn-row');
    if (!objRows.length || !totalLoan) { el.value = ''; return; }

    const lines = [];
    [...objRows].forEach((row, idx) => {
      const rank = row.querySelector('.ts-obj-rank')?.value || '1e';
      const rankWord = RANK_WORDS[rank] || 'eerste';
      const addr = row.querySelector('.ts-obj-address')?.value.trim() || `object ${idx+1}`;

      let txt = `${idx+1}.) Een ${rankWord} recht van hypotheek ter hoogte van ${_numToWords(totalLoan)} euro (${_fmtE(totalLoan)}) wordt gevestigd op object ${idx+1} (${addr}) ten gunste van de Geldverstrekker`;

      if (rank === '1e') {
        txt += ' tot zekerheid van de verstrekte lening.';
      } else {
        txt += '.';
        const priorRows = row.querySelectorAll('.ts-prior-row');
        if (priorRows.length) {
          const parts = [...priorRows].map((pr, pi) => {
            const priorRank = RANK_WORDS[`${pi+1}e`] || `${pi+1}e`;
            const name = pr.querySelector('.ts-prior-name')?.value.trim() || '...';
            const inschrijving = parseFloat(pr.querySelector('.ts-prior-inschrijving')?.value) || 0;
            const owed = parseFloat(pr.querySelector('.ts-prior-currentOwed')?.value) || 0;
            return `een ${priorRank} recht van hypotheek ten gunste van de ${name} met een inschrijving van ${_numToWords(inschrijving)} euro (${_fmtE(inschrijving)}) en een actuele hoofdsom van ${_numToWords(owed)} euro (${_fmtE(owed)}), welke zonder uitdrukkelijke toestemming niet mag worden verhoogd`;
          });
          txt += ` Op dit object rust${priorRows.length > 1 ? 'en' : ''} reeds ${parts.join('; en ')}.`;
        }
      }
      lines.push(txt);
    });

    el.value = lines.join('\n\n');
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
    toggleBorrowerType, toggleHolding, toggleHypotheekRank,
    openAdvisorManager, openFaciliteitManager,
    onDateChange, onDeadlineChange,
    _dragStart, _dragOver, _dragEnd, _dragDrop,
    _mgrRemove, _mgrAdd,
    berekenTermijn,
    updateTermijnInfo, updateOpstartRestant,
  };
})();
