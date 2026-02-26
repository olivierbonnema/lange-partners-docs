/* ═══════════════════════════════════════════
   Termsheet Generator — generates .docx
   Uses window.docx (docx.js browser build)
═══════════════════════════════════════════ */

const TermsheetGenerator = (() => {

  // ── Page & font constants ─────────────────────────────────
  const MM = (mm) => Math.round(mm * 56.6929);
  const PAGE_W  = MM(210);
  const PAGE_H  = MM(297);
  const MARGIN  = MM(25);
  const CONTENT = MM(160);

  // Condition table column widths
  const COL_LBL = Math.round(CONTENT * 0.35);
  const COL_VAL = CONTENT - COL_LBL;

  // Colors
  const C_BRAND = '2E2060';
  const C_GREY  = '888888';
  const C_BLACK = '222222';
  const C_HRULE = 'C8C4DC';

  // Font sizes (half-points)
  const SZ_BODY    = 22; // 11pt
  const SZ_SMALL   = 20; // 10pt
  const SZ_TINY    = 18; // 9pt
  const SZ_HEAD    = 24; // 12pt
  const SZ_TITLE   = 56; // 28pt — cover page title
  const SZ_SUBTITLE= 28; // 14pt — cover page subtitle

  let D; // docx namespace

  // ── Helpers ──────────────────────────────────────────────
  function tx(text, opts = {}) {
    return new D.TextRun({
      text: String(text || ''),
      bold: opts.bold || false,
      italics: opts.italic || false,
      color: opts.color || C_BLACK,
      size: opts.size || SZ_BODY,
      font: 'Calibri',
      strike: opts.strike || false,
    });
  }

  function par(children, opts = {}) {
    return new D.Paragraph({
      children: Array.isArray(children) ? children : [children],
      alignment: opts.align || D.AlignmentType.LEFT,
      spacing: {
        before: opts.before !== undefined ? opts.before : 60,
        after:  opts.after  !== undefined ? opts.after  : 60,
      },
      indent:  opts.indent  ? { left: opts.indent }  : undefined,
      bullet:  opts.bullet  ? { level: opts.bullet - 1 } : undefined,
      border:  opts.hrule   ? {
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

  function cell(paragraphs, width, opts = {}) {
    return new D.TableCell({
      children: Array.isArray(paragraphs) ? paragraphs : [paragraphs],
      borders: noBorder(),
      width: { size: width, type: D.WidthType.DXA },
      margins: opts.margins || { top: 50, bottom: 50, left: 80, right: 80 },
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
      width: { size: CONTENT, type: D.WidthType.DXA },
      borders: {
        top:              { style: D.BorderStyle.NONE },
        bottom:           { style: D.BorderStyle.NONE },
        left:             { style: D.BorderStyle.NONE },
        right:            { style: D.BorderStyle.NONE },
        insideHorizontal: { style: D.BorderStyle.NONE },
        insideVertical:   { style: D.BorderStyle.NONE },
      },
      columnWidths: [COL_LBL, COL_VAL],
      rows,
    });
  }

  function sectionHead(text) {
    return par([tx(text, { bold: true, color: C_BRAND, size: SZ_HEAD })],
               { before: 240, after: 100 });
  }

  function fmtEuro(n) {
    if (!n && n !== 0) return '—';
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency', currency: 'EUR', maximumFractionDigits: 0
    }).format(Number(n));
  }

  function fmtNlDate(iso) {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch { return iso; }
  }

  // ── Generate ──────────────────────────────────────────────
  async function generate(data, settings) {
    D = window.docx;
    if (!D) throw new Error('docx library not loaded');

    const s = settings || {};
    const borrowers   = data.borrowers || [];
    const objects     = data.objects   || [];
    const loanParts   = data.loanParts || [];
    const vooraf      = data.voorafgaandeCondities || [];
    const entree      = data.entreekosten || {};
    const dateStr     = fmtNlDate(data.date);
    const validityStr = fmtNlDate(data.validityDate);
    const deadlineStr = fmtNlDate(data.signingDeadline);
    const totalLoan   = loanParts.reduce((s, lp) => s + (Number(lp.amount)||0), 0);
    const companyName = s.companyName || 'Lange & Partners Financieel Advies';

    // ══ COVER PAGE ════════════════════════════════════════════
    const coverChildren = [];

    // Lots of space before logo/title to center vertically
    coverChildren.push(empty(MM(35)));

    // Logo (text-based) centered
    coverChildren.push(par([
      tx('LANGE & PARTNERS', { bold: true, color: C_BRAND, size: 36 }),
    ], { align: D.AlignmentType.CENTER, before: 0, after: 20 }));
    coverChildren.push(par([
      tx('Financieel Advies', { color: C_GREY, size: 28 }),
    ], { align: D.AlignmentType.CENTER, before: 0, after: MM(15) }));

    // Horizontal rule
    coverChildren.push(par([], {
      align: D.AlignmentType.CENTER, before: 0, after: MM(12),
      hrule: true,
    }));

    // Title
    coverChildren.push(par([
      tx('Termsheet', { bold: true, color: C_BRAND, size: SZ_TITLE }),
    ], { align: D.AlignmentType.CENTER, before: 0, after: 120 }));

    // Subtitle
    coverChildren.push(par([
      tx('Condities voor een termijnlening', { color: C_BLACK, size: SZ_SUBTITLE }),
    ], { align: D.AlignmentType.CENTER, before: 0, after: MM(30) }));

    // Date at bottom of cover
    coverChildren.push(par([
      tx(dateStr, { color: C_GREY, size: SZ_SMALL }),
    ], { align: D.AlignmentType.CENTER, before: MM(25), after: 0 }));

    // ══ LETTER PAGE ═══════════════════════════════════════════
    const letterChildren = [];

    // Borrower address block (top left)
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
    letterChildren.push(new D.Table({
      width: { size: CONTENT, type: D.WidthType.DXA },
      borders: {
        top: { style: D.BorderStyle.NONE }, bottom: { style: D.BorderStyle.NONE },
        left: { style: D.BorderStyle.NONE }, right: { style: D.BorderStyle.NONE },
        insideHorizontal: { style: D.BorderStyle.NONE }, insideVertical: { style: D.BorderStyle.NONE },
      },
      columnWidths: [Math.round(CONTENT/3), Math.round(CONTENT/3), CONTENT - 2*Math.round(CONTENT/3)],
      rows: [new D.TableRow({ children: [
        cell(par([tx('Referentie', { bold: true, color: C_BRAND, size: SZ_TINY }),
                  tx(': ', { size: SZ_TINY }),
                  tx(data.reference || '—', { size: SZ_TINY })],
                 { before: 0, after: 0 }), Math.round(CONTENT/3)),
        cell(par([tx('Telefoon', { bold: true, color: C_BRAND, size: SZ_TINY }),
                  tx(': ', { size: SZ_TINY }),
                  tx(data.phone || '—', { size: SZ_TINY })],
                 { before: 0, after: 0 }), Math.round(CONTENT/3)),
        cell(par([tx('E-mail', { bold: true, color: C_BRAND, size: SZ_TINY }),
                  tx(': ', { size: SZ_TINY }),
                  tx(data.email || '—', { size: SZ_TINY })],
                 { before: 0, after: 0 }),
             CONTENT - 2*Math.round(CONTENT/3)),
      ]})],
    }));

    letterChildren.push(empty(60));

    // Betreft
    letterChildren.push(par([
      tx('Betreft: ', { bold: true, size: SZ_SMALL }),
      tx('termsheet', { size: SZ_SMALL }),
    ], { before: 0, after: 80 }));

    // Salutation
    const salut = data.salutation || (borrowers[0]?.name || '');
    letterChildren.push(par([
      tx(`Geachte ${salut || 'heer/mevrouw'},`, { size: SZ_SMALL }),
    ], { before: 0, after: 100 }));

    // ── Intro paragraph ─────────────────────────────────────
    // Build objects list with full descriptions
    const objectDescriptions = objects.map((o, i) => {
      const desc = o.description || '';
      return `${i+1}. ${desc}${desc ? (desc.endsWith('.') ? '' : '.') : ''} Hierna te noemen 'object ${i+1}'.`;
    });

    const loanTotalTxt = totalLoan > 0 ? fmtEuro(totalLoan) : '—';
    const introParts = [
      tx(`Naar aanleiding van uw verzoek bieden wij u hierbij een financiering aan van `, { size: SZ_SMALL }),
      tx(loanTotalTxt, { bold: true, size: SZ_SMALL }),
      tx(` te verstrekken door ${data.geldverstrekker || '—'}. De financiering wordt verstrekt op basis van de navolgende onderpanden:`, { size: SZ_SMALL }),
    ];
    letterChildren.push(par(introParts, { before: 0, after: 80 }));

    objectDescriptions.forEach(desc => {
      letterChildren.push(par([tx(desc, { size: SZ_SMALL })], { before: 0, after: 40, indent: MM(6) }));
    });

    if (deadlineStr && deadlineStr !== '—') {
      letterChildren.push(empty(60));
      letterChildren.push(par([
        tx(`Wij verzoeken u deze termsheet vóór `, { size: SZ_SMALL }),
        tx(deadlineStr, { bold: true, size: SZ_SMALL }),
        tx(' voor akkoord te ondertekenen en aan ons te retourneren.', { size: SZ_SMALL }),
      ], { before: 0, after: 100 }));
    }

    // ══ FIRST CONDITIONS TABLE ════════════════════════════════
    letterChildren.push(sectionHead('De belangrijkste condities en voorwaarden zijn:'));

    // Build kredietnemers string
    const kredietnemersTxt = borrowers.map(b => b.name).filter(Boolean).join(', ') || '—';

    // Lening rows
    const leningRows = loanParts.length > 1
      ? loanParts.map((lp, i) =>
          condRow(`Lening deel ${i+1}`, [tx(`${fmtEuro(lp.amount)}  ${lp.typeLabel || ''}`.trim(), { size: SZ_SMALL })]))
      : [condRow('Lening', [tx(loanParts[0] ? fmtEuro(loanParts[0].amount) : loanTotalTxt, { bold: true, size: SZ_SMALL })],
                 { boldLabel: true })];

    // Entreekosten value
    const entreeLines = [];
    if (entree.afsluit)    entreeLines.push(`Afsluitkosten: ${entree.afsluit}`);
    if (entree.opstart)    entreeLines.push(`Opstartkosten: ${entree.opstart}`);
    if (entree.annulering) entreeLines.push(`Annuleringskosten: ${entree.annulering}`);
    const entreePars = entreeLines.length
      ? entreeLines.map(l => par([tx(l, { size: SZ_SMALL })], { before: 30, after: 30 }))
      : [par([tx('—', { size: SZ_SMALL })], { before: 30, after: 30 })];

    const table1Rows = [
      condRow('Kredietgever',   [tx(data.kredietgever || companyName, { size: SZ_SMALL })]),
      condRow('Kredietnemers',  [tx(kredietnemersTxt, { size: SZ_SMALL })]),
      condRow('Geldverstrekker',[tx(data.geldverstrekker || '—', { size: SZ_SMALL })]),
      condRow('Type faciliteit',[tx(data.typeFaciliteit || '—', { size: SZ_SMALL })]),
      condRow('Valuta',         [tx(data.valuta || 'Euro (€)', { size: SZ_SMALL })]),
      ...leningRows,
      condRow('Looptijd',       [tx(data.looptijd || '—', { size: SZ_SMALL })]),
      condRow('Aflossing',      [tx(data.aflossing || '—', { size: SZ_SMALL })]),
      condRow('Rente',          [tx(data.rente || '—', { size: SZ_SMALL })]),
      condRow('Administratiekosten', [tx(data.administratiekosten || '—', { size: SZ_SMALL })]),
      condRow('Termijnbedrag',  [tx(data.termijnbedrag || '—', { size: SZ_SMALL })]),
      condRow('Rentegrondslag', [tx(data.rentegrondslag || '—', { size: SZ_SMALL })]),
      condRow('Entreekosten',   entreePars),
      condRow('(Extra) Aflossen', [tx(data.extraAflossen || '—', { size: SZ_SMALL })]),
    ];

    letterChildren.push(condTable(table1Rows));

    // ══ PAGE BREAK ════════════════════════════════════════════
    letterChildren.push(new D.Paragraph({
      children: [],
      pageBreakBefore: true,
      spacing: { before: 0, after: 0 },
    }));

    // ══ SECOND CONDITIONS TABLE ═══════════════════════════════
    letterChildren.push(sectionHead('Voor de bovenvermelde lening zijn de volgende bepalingen van kracht:'));

    // Zekerheden cell (with object list)
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

    // Voorafgaande condities cell
    const voorafPars = vooraf.length
      ? vooraf.map(c => par([
          tx(c.text || '', { size: SZ_SMALL, strike: c.received }),
        ], { before: 20, after: 20, indent: MM(4), bullet: 1 }))
      : [par([tx('—', { size: SZ_SMALL })], { before: 50, after: 50 })];

    const table2Rows = [
      condRow('Betalingswijze',   [par([tx(data.betalingswijze || '—', { size: SZ_SMALL })], { before: 50, after: 50 })]),
      condRow('Zekerheden',       zekerhedenPars),
      condRow('Verzekering',      [par([tx(data.verzekering || '—', { size: SZ_SMALL })], { before: 50, after: 50 })]),
      condRow('Condities',        [par([tx(data.condities || '—', { size: SZ_SMALL })], { before: 50, after: 50 })]),
      condRow('Voorafgaande condities', voorafPars),
      condRow('Toepasselijk recht',    [par([tx(data.toepasselijkRecht || '—', { size: SZ_SMALL })], { before: 50, after: 50 })]),
      condRow('Beschikbaarheid',  [par([tx(data.beschikbaarheid || '—', { size: SZ_SMALL })], { before: 50, after: 50 })]),
      condRow('Overdracht',       [par([tx(data.overdracht || '—', { size: SZ_SMALL })], { before: 50, after: 50 })]),
      condRow('Notaris',          [par([tx(data.notaris || '—', { size: SZ_SMALL })], { before: 50, after: 50 })]),
    ];

    letterChildren.push(condTable(table2Rows));

    // Geldigheidsduur
    letterChildren.push(empty(80));
    letterChildren.push(par([
      tx('Geldigheidsduur (na ondertekening): ', { bold: true, color: C_BRAND, size: SZ_SMALL }),
      tx(validityStr, { size: SZ_SMALL }),
    ], { before: 0, after: 0 }));

    // ── Closing ──────────────────────────────────────────────
    letterChildren.push(empty(120));
    letterChildren.push(par([tx('Hoogachtend,', { size: SZ_SMALL })], { before: 0, after: 40 }));
    letterChildren.push(empty(60));
    letterChildren.push(par([
      tx(data.signingAdvisor || s.advisorName || '—', { bold: true, size: SZ_SMALL }),
    ], { before: 0, after: 20 }));
    letterChildren.push(par([
      tx(companyName, { size: SZ_SMALL, color: C_GREY }),
    ], { before: 0, after: 100 }));

    // ── Signature blocks ─────────────────────────────────────
    letterChildren.push(par([], { hrule: true, before: 0, after: 80 }));
    letterChildren.push(par([tx('Ondergetekenden verklaren akkoord te gaan met de bovenstaande condities:',
                                { size: SZ_SMALL, color: C_GREY })], { before: 0, after: 120 }));

    borrowers.forEach(b => {
      letterChildren.push(par([
        tx('Kredietnemer: ', { bold: true, size: SZ_SMALL }),
        tx(b.name || '—', { bold: true, size: SZ_SMALL }),
      ], { before: 0, after: 60 }));
      letterChildren.push(par([
        tx('Datum: ', { size: SZ_SMALL, color: C_GREY }),
        tx('_________________________', { size: SZ_SMALL, color: C_GREY }),
      ], { before: 0, after: 40 }));
      letterChildren.push(par([
        tx('Handtekening: ', { size: SZ_SMALL, color: C_GREY }),
        tx('_________________________', { size: SZ_SMALL, color: C_GREY }),
      ], { before: 0, after: 40 }));
      letterChildren.push(par([
        tx('Naam: ', { size: SZ_SMALL, color: C_GREY }),
        tx('_________________________', { size: SZ_SMALL, color: C_GREY }),
      ], { before: 0, after: 100 }));
    });

    // ── Build document ────────────────────────────────────────
    const pageProps = {
      size: { width: PAGE_W, height: PAGE_H },
      margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
    };

    const doc = new D.Document({
      creator: 'Lange & Partners Document Generator',
      title:   `Termsheet — ${borrowers[0]?.name || 'Geldnemer'}`,
      sections: [
        // ── Section 1: Cover page ──────────────────────────
        {
          properties: {
            page: pageProps,
          },
          children: coverChildren,
        },
        // ── Section 2: Letter ──────────────────────────────
        {
          properties: {
            page: pageProps,
          },
          children: letterChildren,
        },
      ],
    });

    return await D.Packer.toBlob(doc);
  }

  return { generate };
})();
