/* ═══════════════════════════════════════════
   Termsheet Generator — generates .docx
   Uses window.docx (docx.js browser build)
═══════════════════════════════════════════ */

const TermsheetGenerator = (() => {

  // ── Page & font constants ─────────────────────────────────
  const MM = (mm) => Math.round(mm * 56.6929);
  const PAGE_W         = MM(210);
  const PAGE_H         = MM(297);
  const MARGIN_SIDE    = MM(25);
  const MARGIN_TOP     = MM(32);   // extra room for header
  const MARGIN_BOTTOM  = MM(32);   // extra room for footer
  const MARGIN_HEADER  = MM(7);    // distance page edge → header
  const MARGIN_FOOTER  = MM(8);    // distance page edge → footer
  const CONTENT        = PAGE_W - 2 * MARGIN_SIDE;

  // Condition table column widths
  const COL_LBL = Math.round(CONTENT * 0.35);
  const COL_VAL = CONTENT - COL_LBL;

  // Signing label column (fixed width so underscores line up)
  const SIGN_LBL = MM(40);
  const SIGN_VAL = CONTENT - SIGN_LBL;

  // Colors
  const C_BRAND = '2E2060';
  const C_GREY  = '888888';
  const C_BLACK = '222222';
  const C_HRULE = 'C8C4DC';

  // Font sizes (half-points)
  const SZ_BODY     = 22; // 11pt
  const SZ_SMALL    = 20; // 10pt
  const SZ_TINY     = 18; // 9pt
  const SZ_HEAD     = 24; // 12pt
  const SZ_TITLE    = 56; // 28pt — cover page title
  const SZ_SUBTITLE = 28; // 14pt — cover page subtitle

  let D; // docx namespace

  // ── Helpers ──────────────────────────────────────────────
  function tx(text, opts = {}) {
    return new D.TextRun({
      text:    String(text || ''),
      bold:    opts.bold    || false,
      italics: opts.italic  || false,
      color:   opts.color   || C_BLACK,
      size:    opts.size    || SZ_BODY,
      font:    'Calibri',
      strike:  opts.strike  || false,
    });
  }

  function par(children, opts = {}) {
    return new D.Paragraph({
      children:  Array.isArray(children) ? children : [children],
      alignment: opts.align  || D.AlignmentType.LEFT,
      spacing: {
        before: opts.before !== undefined ? opts.before : 60,
        after:  opts.after  !== undefined ? opts.after  : 60,
      },
      indent: opts.indent ? { left: opts.indent } : undefined,
      bullet: opts.bullet ? { level: opts.bullet - 1 } : undefined,
      border: opts.hrule  ? {
        top: { style: D.BorderStyle.SINGLE, size: 4, color: C_HRULE }
      } : undefined,
    });
  }

  function empty(sz = 80) { return par([tx('')], { before: 0, after: sz }); }

  const noBorder = () => ({
    top:    { style: D.BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    bottom: { style: D.BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    left:   { style: D.BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    right:  { style: D.BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  });

  const noTableBorder = () => ({
    top:              { style: D.BorderStyle.NONE },
    bottom:           { style: D.BorderStyle.NONE },
    left:             { style: D.BorderStyle.NONE },
    right:            { style: D.BorderStyle.NONE },
    insideHorizontal: { style: D.BorderStyle.NONE },
    insideVertical:   { style: D.BorderStyle.NONE },
  });

  function cell(paragraphs, width, opts = {}) {
    return new D.TableCell({
      children: Array.isArray(paragraphs) ? paragraphs : [paragraphs],
      borders:  noBorder(),
      width:    { size: width, type: D.WidthType.DXA },
      margins:  opts.margins || { top: 50, bottom: 50, left: 80, right: 80 },
    });
  }

  function condRow(label, valueChildren, opts = {}) {
    const labelPar = par([
      tx(label, { bold: opts.boldLabel !== false, color: C_BRAND, size: SZ_SMALL })
    ], { before: 50, after: 50 });
    const valuePar = Array.isArray(valueChildren) && valueChildren[0] instanceof D.Paragraph
      ? valueChildren
      : [par(Array.isArray(valueChildren) ? valueChildren : [valueChildren], { before: 50, after: 50 })];

    return new D.TableRow({
      children: [
        cell(labelPar, COL_LBL),
        cell(valuePar, COL_VAL),
      ],
    });
  }

  function condTable(rows) {
    return new D.Table({
      width:        { size: CONTENT, type: D.WidthType.DXA },
      borders:      noTableBorder(),
      columnWidths: [COL_LBL, COL_VAL],
      rows,
    });
  }

  function sectionHead(text) {
    return par([tx(text, { bold: true, color: C_BRAND, size: SZ_HEAD })],
               { before: 240, after: 100 });
  }

  // Split multi-line text into separate Paragraphs
  function multilinePars(text, size) {
    const sz = size || SZ_SMALL;
    if (!text) return [par([tx('—', { size: sz })], { before: 50, after: 50 })];
    const lines = text.split('\n');
    return lines.map((line, i) =>
      par([tx(line.trim() || '', { size: sz })], {
        before: i === 0 ? 50 : 10,
        after:  i === lines.length - 1 ? 50 : 10,
      })
    );
  }

  function fmtEuro(n) {
    if (!n && n !== 0) return '—';
    const num = Number(n);
    if (!num) return '—';
    const formatted = new Intl.NumberFormat('nl-NL', {
      minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(num);
    return `€ ${formatted},-`;
  }

  function fmtNlDate(iso) {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch { return iso; }
  }

  // Full signing name for a borrower (only used on signing page)
  function signingName(b) {
    if (!b) return '—';
    if (b.type !== 'bv') return b.name || '—';
    const bvName = b.bvName || b.name || '—';
    const salut  = b.vertegenwoordigerSalut || 'Dhr.';
    const vert   = b.vertegenwoordiger || '';
    if (b.holdingBV && b.holdingName) {
      return `${bvName}, rechtsgeldig vertegenwoordigd door ${b.holdingName}, op haar beurt rechtsgeldig vertegenwoordigd door ${salut} ${vert}`;
    }
    return `${bvName}, rechtsgeldig vertegenwoordigd door ${salut} ${vert}`;
  }

  // ── Generate ──────────────────────────────────────────────
  async function generate(data, settings) {
    D = window.docx;
    if (!D) throw new Error('docx library not loaded');

    const s           = settings || {};
    const borrowers   = data.borrowers  || [];
    const objects     = data.objects    || [];
    const loanParts   = data.loanParts  || [];
    const vooraf      = data.voorafgaandeCondities || [];
    const entree      = data.entreekosten || {};
    const dateStr     = fmtNlDate(data.date);
    const validityStr = fmtNlDate(data.validityDate);
    const deadlineStr = fmtNlDate(data.signingDeadline);
    const totalLoan   = loanParts.reduce((s, lp) => s + (Number(lp.amount)||0), 0);
    const companyName = s.companyName || 'Lange & Partners Financieel Advies';
    const loanTotalTxt = totalLoan > 0 ? fmtEuro(totalLoan) : '—';

    // ── Logo helpers ──────────────────────────────────────
    const logoDataUrl = s.logoDataUrl || '';
    function logoType(url) {
      const m = url.match(/data:image\/(png|jpeg|jpg|gif|webp);base64,/i);
      const t = m ? m[1].toLowerCase() : 'png';
      return t === 'jpg' ? 'jpeg' : t;
    }
    function logoBase64(url) { return url.split(',')[1] || ''; }
    function getImageSize(url) {
      return new Promise(resolve => {
        const img = new Image();
        img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = () => resolve({ w: 1, h: 1 });
        img.src = url;
      });
    }
    function makeLogoRun(width, height) {
      return new D.ImageRun({
        data:           logoBase64(logoDataUrl),
        transformation: { width, height },
        type:           logoType(logoDataUrl),
      });
    }

    // ── Compute proportional logo dimensions ──────────────
    let coverLogoW = 360, coverLogoH = 120;
    let headerLogoW = 240, headerLogoH = 80;
    if (logoDataUrl) {
      const dims = await getImageSize(logoDataUrl);
      const ratio = dims.h / dims.w;
      coverLogoH  = Math.round(ratio * coverLogoW);
      headerLogoH = Math.round(ratio * headerLogoW);
    }

    // ── Header (letter pages only) & Footer ───────────────
    let letterHeader;
    if (logoDataUrl) {
      letterHeader = new D.Header({
        children: [
          new D.Paragraph({
            children:  [makeLogoRun(headerLogoW, headerLogoH)],
            alignment: D.AlignmentType.RIGHT,
            spacing:   { before: 0, after: 0 },
          }),
        ],
      });
    }

    const pageFooter = new D.Footer({
      children: [
        par([tx(
          'Lange & Partners Financieel Advies  |  Wilhelminastraat 50  |  2011 VN Haarlem  |  +31 23 517 31 00  |  info@langefa.nl  |  www.langefa.nl  |  KvK 34269870',
          { size: SZ_TINY, color: C_GREY }
        )], { align: D.AlignmentType.CENTER, before: 0, after: 0 }),
      ],
    });

    const coverPageProps = {
      size: { width: PAGE_W, height: PAGE_H },
      margin: {
        top:    MARGIN_TOP,
        bottom: MARGIN_BOTTOM,
        left:   MARGIN_SIDE,
        right:  MARGIN_SIDE,
        header: MARGIN_HEADER,
        footer: MARGIN_FOOTER,
      },
    };

    const letterPageProps = {
      size: { width: PAGE_W, height: PAGE_H },
      margin: {
        top:    MM(35),
        bottom: MARGIN_BOTTOM,
        left:   MARGIN_SIDE,
        right:  MARGIN_SIDE,
        header: MARGIN_HEADER,
        footer: MARGIN_FOOTER,
      },
    };

    // ══ COVER PAGE ════════════════════════════════════════════
    const coverChildren = [];

    coverChildren.push(empty(MM(35)));

    if (logoDataUrl) {
      coverChildren.push(new D.Paragraph({
        children:  [makeLogoRun(coverLogoW, coverLogoH)],
        alignment: D.AlignmentType.CENTER,
        spacing:   { before: 0, after: MM(15) },
      }));
    } else {
      coverChildren.push(par([
        tx('LANGE & PARTNERS', { bold: true, color: C_BRAND, size: 36 }),
      ], { align: D.AlignmentType.CENTER, before: 0, after: 20 }));
      coverChildren.push(par([
        tx('Financieel Advies', { color: C_GREY, size: 28 }),
      ], { align: D.AlignmentType.CENTER, before: 0, after: MM(15) }));
    }

    coverChildren.push(par([], {
      align: D.AlignmentType.CENTER, before: 0, after: MM(12), hrule: true,
    }));

    coverChildren.push(par([
      tx('Termsheet', { bold: true, color: C_BRAND, size: SZ_TITLE }),
    ], { align: D.AlignmentType.CENTER, before: 0, after: 120 }));

    coverChildren.push(par([
      tx('Condities voor een termijnlening', { color: C_BLACK, size: SZ_SUBTITLE }),
    ], { align: D.AlignmentType.CENTER, before: 0, after: MM(30) }));

    coverChildren.push(par([
      tx(dateStr, { color: C_GREY, size: SZ_SMALL }),
    ], { align: D.AlignmentType.CENTER, before: MM(25), after: 0 }));

    // ══ LETTER PAGE ═══════════════════════════════════════════
    const letterChildren = [];

    // Borrower address block
    borrowers.forEach(b => {
      letterChildren.push(par([tx(b.name || '', { bold: true, size: SZ_SMALL })], { before: 0, after: 20 }));
      if (b.address) letterChildren.push(par([tx(b.address, { size: SZ_SMALL })], { before: 0, after: 20 }));
      if (b.postalCode || b.city) {
        letterChildren.push(par([tx(`${b.postalCode || ''}  ${b.city || ''}`.trim(), { size: SZ_SMALL })], { before: 0, after: 20 }));
      }
    });

    letterChildren.push(empty(60));

    // City + date
    letterChildren.push(par([
      tx(`${data.city || ''}, `, { size: SZ_SMALL }),
      tx(dateStr, { size: SZ_SMALL }),
    ], { before: 0, after: 80 }));

    // Horizontal rule
    letterChildren.push(par([], { hrule: true, before: 0, after: 80 }));

    // Reference row (3-col table)
    const refColW = Math.round(CONTENT / 3);
    letterChildren.push(new D.Table({
      width:        { size: CONTENT, type: D.WidthType.DXA },
      borders:      noTableBorder(),
      columnWidths: [refColW, refColW, CONTENT - 2 * refColW],
      rows: [new D.TableRow({ children: [
        cell(par([
          tx('Referentie', { bold: true, color: C_BRAND, size: SZ_TINY }),
          tx(': ',         { size: SZ_TINY }),
          tx(data.reference || '—', { size: SZ_TINY }),
        ], { before: 0, after: 0 }), refColW),
        cell(par([
          tx('Telefoon', { bold: true, color: C_BRAND, size: SZ_TINY }),
          tx(': ',       { size: SZ_TINY }),
          tx(data.phone || '—', { size: SZ_TINY }),
        ], { before: 0, after: 0 }), refColW),
        cell(par([
          tx('E-mail', { bold: true, color: C_BRAND, size: SZ_TINY }),
          tx(': ',     { size: SZ_TINY }),
          tx(data.email || '—', { size: SZ_TINY }),
        ], { before: 0, after: 0 }), CONTENT - 2 * refColW),
      ]})],
    }));

    letterChildren.push(empty(60));

    // Betreft
    letterChildren.push(par([
      tx('Betreft: ', { bold: true, size: SZ_SMALL }),
      tx('Termsheet', { size: SZ_SMALL }),
    ], { before: 0, after: 80 }));

    // Empty spacer between "Betreft" and salutation
    letterChildren.push(empty(60));

    // Salutation
    const salut = data.salutation || (borrowers[0]?.name || '');
    letterChildren.push(par([
      tx(`Geachte ${salut || 'heer/mevrouw'},`, { size: SZ_SMALL }),
    ], { before: 0, after: 100 }));

    // ── Intro paragraph ─────────────────────────────────────
    const objectDescriptions = objects.map((o, i) => {
      const desc = o.description || '';
      return `- ${desc}${desc && !desc.endsWith('.') ? '.' : ''} Hierna te noemen 'object ${i+1}'.`;
    });

    letterChildren.push(par([
      tx('Op uw verzoek doen wij u hierbij een overzicht van de belangrijkste voorwaarden en bepalingen toekomen waarop ', { size: SZ_SMALL }),
      tx('Lange & Partners Financieel Advies', { bold: true, size: SZ_SMALL }),
      tx(', hierna te noemen "de Bemiddelaar", u een aanbieding wil doen voor een financiering van ', { size: SZ_SMALL }),
      tx(loanTotalTxt, { bold: true, size: SZ_SMALL }),
      tx(` met als doel ${data.doelFinanciering || 'een herfinanciering'}, waarbij het volgende object als zekerheid dient:`, { size: SZ_SMALL }),
    ], { before: 0, after: 80 }));

    objectDescriptions.forEach(desc => {
      letterChildren.push(par([tx(desc, { size: SZ_SMALL })], { before: 0, after: 40, indent: MM(6) }));
    });

    if (deadlineStr && deadlineStr !== '—') {
      letterChildren.push(empty(60));
      letterChildren.push(par([
        tx('Wij verzoeken u deze Termsheet vóór ', { size: SZ_SMALL }),
        tx(deadlineStr, { bold: true, size: SZ_SMALL }),
        tx(' voor akkoord te ondertekenen en aan ons te retourneren.', { size: SZ_SMALL }),
      ], { before: 0, after: 100 }));
    }

    // ══ FIRST CONDITIONS TABLE ════════════════════════════════
    letterChildren.push(sectionHead('De belangrijkste condities en voorwaarden zijn:'));

    const kredietnemersTxt = borrowers.map(b => b.name).filter(Boolean).join(', ') || '—';

    // Lening rows: multiple parts show amount + type label; single part shows amount only
    const leningRows = loanParts.length > 1
      ? loanParts.map((lp, i) =>
          condRow(`Lening deel ${i+1}`, [tx(`${fmtEuro(lp.amount)}  ${lp.typeLabel || ''}`.trim(), { size: SZ_SMALL })]))
      : [condRow('Lening', [tx(loanParts[0] ? fmtEuro(loanParts[0].amount) : loanTotalTxt, { bold: true, size: SZ_SMALL })],
                 { boldLabel: true })];

    // Entreekosten
    const entreeLines = [];
    if (entree.afsluit)    entreeLines.push(`Afsluitkosten: ${fmtEuro(entree.afsluit)}`);
    if (entree.opstart)    entreeLines.push(`Opstartkosten: ${fmtEuro(entree.opstart)}`);
    if (entree.annulering) entreeLines.push(`Annuleringskosten: ${fmtEuro(entree.annulering)}`);
    const entreePars = entreeLines.length
      ? entreeLines.map(l => par([tx(l, { size: SZ_SMALL })], { before: 30, after: 30 }))
      : [par([tx('—', { size: SZ_SMALL })], { before: 30, after: 30 })];

    const table1Rows = [
      condRow('Kredietgever',    [tx(data.kredietgever || companyName, { size: SZ_SMALL })]),
      condRow('Kredietnemers',   [tx(kredietnemersTxt, { size: SZ_SMALL })]),
      condRow('Geldverstrekker', [tx(data.geldverstrekker || '—', { size: SZ_SMALL })]),
      condRow('Type faciliteit', [tx(data.typeFaciliteit || '—', { size: SZ_SMALL })]),
      condRow('Valuta',          [tx(data.valuta || 'Euro (€)', { size: SZ_SMALL })]),
      ...leningRows,
      condRow('Looptijd',        [tx(data.looptijd || '—', { size: SZ_SMALL })]),
      condRow('Aflossing',       [tx(data.aflossing || '—', { size: SZ_SMALL })]),
      condRow('Rente',           multilinePars(data.rente)),
      condRow('Administratiekosten', [tx(data.administratiekosten || '—', { size: SZ_SMALL })]),
      condRow('Termijnbedrag',   [tx(data.termijnbedrag ? fmtEuro(data.termijnbedrag) : '—', { size: SZ_SMALL })]),
      condRow('Rentegrondslag',  [tx(data.rentegrondslag || '—', { size: SZ_SMALL })]),
      condRow('Entreekosten',    entreePars),
      condRow('(Extra) Aflossen', [tx(data.extraAflossen || '—', { size: SZ_SMALL })]),
    ];

    letterChildren.push(condTable(table1Rows));

    // ══ SPACERS before second table (no page break) ═══════════
    letterChildren.push(empty(80));
    letterChildren.push(empty(80));

    // ══ SECOND CONDITIONS TABLE ═══════════════════════════════
    letterChildren.push(sectionHead('Voor de bovenvermelde lening zijn de volgende bepalingen van kracht:'));

    // Zekerheden
    const zekerhedenPars = [];
    if (data.zekerheden) {
      zekerhedenPars.push(par([tx(data.zekerheden, { size: SZ_SMALL })], { before: 50, after: 30 }));
    }
    objects.forEach((o, i) => {
      if (o.description) {
        zekerhedenPars.push(par([
          tx(`Object ${i+1}: ${o.description}`, { size: SZ_SMALL }),
        ], { before: 20, after: 20, indent: MM(4) }));
      }
    });
    if (!zekerhedenPars.length) zekerhedenPars.push(par([tx('—', { size: SZ_SMALL })], { before: 50, after: 50 }));

    // Voorafgaande condities
    const voorafPars = vooraf.length
      ? vooraf.map(c => par([
          tx(c.text || '', { size: SZ_SMALL, strike: c.received }),
        ], { before: 20, after: 20, indent: MM(4), bullet: 1 }))
      : [par([tx('—', { size: SZ_SMALL })], { before: 50, after: 50 })];

    const table2Rows = [
      condRow('Betalingswijze',        [par([tx(data.betalingswijze || '—', { size: SZ_SMALL })], { before: 50, after: 50 })]),
      condRow('Zekerheden',            zekerhedenPars),
      condRow('Verzekering',           [par([tx(data.verzekering || '—', { size: SZ_SMALL })], { before: 50, after: 50 })]),
      condRow('Condities',             [par([tx(data.condities || '—', { size: SZ_SMALL })], { before: 50, after: 50 })]),
      condRow('Voorafgaande condities', voorafPars),
      condRow('Toepasselijk recht',    [par([tx(data.toepasselijkRecht || '—', { size: SZ_SMALL })], { before: 50, after: 50 })]),
      condRow('Beschikbaarheid',       [par([tx(data.beschikbaarheid || '—', { size: SZ_SMALL })], { before: 50, after: 50 })]),
      condRow('Overdracht',            [par([tx(data.overdracht || '—', { size: SZ_SMALL })], { before: 50, after: 50 })]),
      condRow('Notaris',               [par([tx(data.notaris || '—', { size: SZ_SMALL })], { before: 50, after: 50 })]),
      condRow('Geldigheidsduur',       [par([tx(validityStr, { size: SZ_SMALL })], { before: 50, after: 50 })]),
    ];

    letterChildren.push(condTable(table2Rows));

    // ── Closing ──────────────────────────────────────────────
    letterChildren.push(empty(120));
    letterChildren.push(par([tx('Hoogachtend,', { size: SZ_SMALL })], { before: 0, after: 40 }));
    letterChildren.push(empty(60));
    letterChildren.push(par([
      tx(data.signingAdvisor || data.advisorName || s.advisorName || '—', { bold: true, size: SZ_SMALL }),
    ], { before: 0, after: 20 }));
    letterChildren.push(par([
      tx(companyName, { size: SZ_SMALL, color: C_GREY }),
    ], { before: 0, after: 100 }));

    // ── Signature blocks ─────────────────────────────────────
    const UNDERSCORES = '___________________________';

    letterChildren.push(par([], { hrule: true, before: 0, after: 80 }));
    letterChildren.push(par([
      tx('Ondergetekenden verklaren akkoord te gaan met de bovenstaande condities:',
         { size: SZ_SMALL, color: C_GREY }),
    ], { before: 0, after: 120 }));

    borrowers.forEach(b => {
      // Borrower label line (full legal representation for B.V., just name for private)
      letterChildren.push(par([
        tx('Kredietnemer: ', { bold: true, size: SZ_SMALL }),
        tx(signingName(b), { bold: true, size: SZ_SMALL }),
      ], { before: 0, after: 480 }));

      // Datum
      letterChildren.push(new D.Table({
        width:        { size: CONTENT, type: D.WidthType.DXA },
        borders:      noTableBorder(),
        columnWidths: [SIGN_LBL, SIGN_VAL],
        rows: [
          new D.TableRow({
            height: { value: MM(12), rule: D.HeightRule.ATLEAST },
            children: [
              cell(par([tx('Datum:', { size: SZ_SMALL, color: C_GREY })], { before: 0, after: 0 }), SIGN_LBL, { margins: { top: 60, bottom: 200, left: 0, right: 40 } }),
              cell(par([tx(UNDERSCORES, { size: SZ_SMALL, color: C_GREY })], { before: 0, after: 0 }), SIGN_VAL, { margins: { top: 60, bottom: 200, left: 0, right: 0 } }),
            ],
          }),
        ],
      }));

      letterChildren.push(empty(160));

      // Ondertekening
      letterChildren.push(new D.Table({
        width:        { size: CONTENT, type: D.WidthType.DXA },
        borders:      noTableBorder(),
        columnWidths: [SIGN_LBL, SIGN_VAL],
        rows: [
          new D.TableRow({
            height: { value: MM(12), rule: D.HeightRule.ATLEAST },
            children: [
              cell(par([tx('Ondertekening:', { size: SZ_SMALL, color: C_GREY })], { before: 0, after: 0 }), SIGN_LBL, { margins: { top: 60, bottom: 200, left: 0, right: 40 } }),
              cell(par([tx(UNDERSCORES,      { size: SZ_SMALL, color: C_GREY })], { before: 0, after: 0 }), SIGN_VAL, { margins: { top: 60, bottom: 200, left: 0, right: 0 } }),
            ],
          }),
        ],
      }));

      letterChildren.push(empty(120));
    });

    // ── Build document ────────────────────────────────────────
    const doc = new D.Document({
      creator: 'Lange & Partners Document Generator',
      title:   `Termsheet — ${borrowers[0]?.name || 'Geldnemer'}`,
      sections: [
        // ── Section 1: Cover page — geen header, geen footer ─
        {
          properties: { page: coverPageProps },
          children: coverChildren,
        },
        // ── Section 2: Letter — logo header ───────────────
        {
          properties: { page: letterPageProps },
          ...(letterHeader ? { headers: { default: letterHeader } } : {}),
          footers: { default: pageFooter },
          children: letterChildren,
        },
      ],
    });

    return await D.Packer.toBlob(doc);
  }

  return { generate };
})();
