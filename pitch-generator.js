/* ═══════════════════════════════════════════
   Pitch Generator — generates .docx
   Uses window.docx (docx.js browser build)
═══════════════════════════════════════════ */

const PitchGenerator = (() => {

  // ── Page & font constants ─────────────────────────────────
  // A4: 210×297mm. Margins: 25mm. Content width ≈ 160mm = 9072 twips
  const MM = (mm) => Math.round(mm * 56.6929);
  const PAGE_W   = MM(210);
  const PAGE_H   = MM(297);
  const MARGIN   = MM(25);
  const CONTENT_W = MM(160);

  // Column widths (twips)
  const FIN_LBL = Math.round(CONTENT_W * 0.68);
  const FIN_VAL = CONTENT_W - FIN_LBL;

  // Colors (no #)
  const C_BRAND = '2E2060';
  const C_GREY  = '888888';
  const C_BLACK = '222222';
  const C_HRULE = 'C8C4DC';

  // Font sizes in half-points
  const SZ_BODY  = 22; // 11pt
  const SZ_SMALL = 18; // 9pt
  const SZ_HEAD  = 24; // 12pt
  const SZ_TITLE = 22; // 11pt bold

  // ── Shorthand builders ───────────────────────────────────
  let D; // docx namespace (set in generate())

  function tx(text, opts = {}) {
    return new D.TextRun({
      text: String(text || ''),
      bold: opts.bold || false,
      italics: opts.italic || false,
      color: opts.color || C_BLACK,
      size: opts.size || SZ_BODY,
      font: 'Calibri',
      strike: opts.strike || false,
      underline: opts.underline ? {} : undefined,
    });
  }

  function par(children, opts = {}) {
    return new D.Paragraph({
      children: Array.isArray(children) ? children : [children],
      alignment: opts.align || D.AlignmentType.LEFT,
      spacing: {
        before: opts.spaceBefore !== undefined ? opts.spaceBefore : 60,
        after:  opts.spaceAfter  !== undefined ? opts.spaceAfter  : 60,
      },
      indent: opts.indent ? { left: opts.indent } : undefined,
      bullet: opts.bullet ? { level: opts.bullet - 1 } : undefined,
      border: opts.borderTop ? {
        top: { style: D.BorderStyle.SINGLE, size: 4, color: C_HRULE }
      } : undefined,
    });
  }

  function sectionHead(text) {
    return par([tx(text, { bold: true, color: C_BRAND, size: SZ_HEAD })],
               { spaceBefore: 220, spaceAfter: 80 });
  }

  function bodyPar(text) {
    if (!text) return par([tx('')]);
    return par([tx(text)]);
  }

  const noBorder = () => ({
    top:    { style: D.BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    bottom: { style: D.BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    left:   { style: D.BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    right:  { style: D.BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  });

  function cell(children, opts = {}) {
    return new D.TableCell({
      children: Array.isArray(children) ? children : [children],
      borders: noBorder(),
      width: opts.width ? { size: opts.width, type: D.WidthType.DXA } : undefined,
      verticalAlign: D.VerticalAlign ? D.VerticalAlign.CENTER : undefined,
      margins: { top: 40, bottom: 40, left: 60, right: 60 },
    });
  }

  function table2col(rows, opts = {}) {
    return new D.Table({
      width: { size: opts.width || CONTENT_W, type: D.WidthType.DXA },
      borders: {
        top:              { style: D.BorderStyle.NONE },
        bottom:           { style: D.BorderStyle.NONE },
        left:             { style: D.BorderStyle.NONE },
        right:            { style: D.BorderStyle.NONE },
        insideHorizontal: { style: D.BorderStyle.NONE },
        insideVertical:   { style: D.BorderStyle.NONE },
      },
      rows,
      columnWidths: opts.colWidths,
    });
  }

  // ── Currency formatter ───────────────────────────────────
  function fmtEuro(n) {
    if (n === '' || n === null || n === undefined || isNaN(n)) return '';
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency', currency: 'EUR', maximumFractionDigits: 0
    }).format(Number(n));
  }

  // ── Main generate function ────────────────────────────────
  async function generate(data, settings) {
    D = window.docx; // bind namespace
    if (!D) throw new Error('docx library not loaded');

    const s = settings || {};
    const children = [];

    // ── HEADER ───────────────────────────────────────────────
    const header = new D.Header({
      children: [
        table2col([
          new D.TableRow({
            children: [
              cell(par([
                tx('Toelichting Lange Financieel Advies', { bold: true, size: SZ_TITLE, color: C_BLACK })
              ], { spaceBefore: 40, spaceAfter: 0 }), { width: Math.round(CONTENT_W * 0.55) }),
              cell(par([
                tx('LANGE & PARTNERS', { bold: true, color: C_BRAND, size: SZ_SMALL }),
                tx('  Financieel Advies', { color: C_GREY, size: SZ_SMALL }),
              ], { align: D.AlignmentType.RIGHT, spaceBefore: 40, spaceAfter: 0 }),
              { width: Math.round(CONTENT_W * 0.45) }),
            ],
          }),
        ], {
          width: CONTENT_W,
          colWidths: [Math.round(CONTENT_W * 0.55), Math.round(CONTENT_W * 0.45)],
        }),
        par([], { spaceBefore: 0, spaceAfter: 40, borderTop: true }),
      ],
    });

    // ── FOOTER ───────────────────────────────────────────────
    const borrowerNames = (data.borrowers || []).join(', ');
    const footer = new D.Footer({
      children: [
        par([
          tx('Geldnemers: ', { bold: true, color: C_GREY, size: SZ_SMALL }),
          tx(borrowerNames, { color: C_GREY, size: SZ_SMALL }),
        ], { spaceBefore: 40, borderTop: true }),
      ],
    });

    // ══ SECTION 1: Leendoel ══════════════════════════════════
    children.push(sectionHead('Leendoel'));
    const introLines = (data.introParagraph || '').split('\n').filter(l => l.trim());
    if (introLines.length) {
      introLines.forEach(line => children.push(bodyPar(line)));
    } else {
      children.push(par([tx('')]));
    }

    // ══ SECTION 2: Financieringsopzet ════════════════════════
    children.push(sectionHead('Financieringsopzet (afgerond)'));
    const finRows = data.financieringsopzet || [];
    if (finRows.length) {
      const tableRows = finRows.map((row, idx) => {
        const isBold = row.isTotal;
        const color  = isBold ? C_BRAND : C_BLACK;
        const amtTxt = row.amount ? fmtEuro(row.amount) : '';
        const showLine = isBold && idx > 0; // line above total rows
        const cellBorder = showLine ? {
          top: { style: D.BorderStyle.SINGLE, size: 4, color: C_HRULE }
        } : noBorder();

        const labelCell = new D.TableCell({
          children: [par([tx(row.label || '', { bold: isBold, color })], { spaceBefore: 30, spaceAfter: 30 })],
          borders: { ...noBorder(), ...(showLine ? { top: { style: D.BorderStyle.SINGLE, size: 4, color: C_HRULE } } : {}) },
          width: { size: FIN_LBL, type: D.WidthType.DXA },
          margins: { top: 30, bottom: 30, left: 60, right: 30 },
        });
        const valCell = new D.TableCell({
          children: [par([tx(amtTxt, { bold: isBold, color })], { align: D.AlignmentType.RIGHT, spaceBefore: 30, spaceAfter: 30 })],
          borders: { ...noBorder(), ...(showLine ? { top: { style: D.BorderStyle.SINGLE, size: 4, color: C_HRULE } } : {}) },
          width: { size: FIN_VAL, type: D.WidthType.DXA },
          margins: { top: 30, bottom: 30, left: 30, right: 60 },
        });

        return new D.TableRow({ children: [labelCell, valCell] });
      });

      children.push(new D.Table({
        width: { size: Math.round(CONTENT_W * 0.65), type: D.WidthType.DXA },
        borders: {
          top: { style: D.BorderStyle.NONE }, bottom: { style: D.BorderStyle.NONE },
          left: { style: D.BorderStyle.NONE }, right: { style: D.BorderStyle.NONE },
          insideHorizontal: { style: D.BorderStyle.NONE },
          insideVertical: { style: D.BorderStyle.NONE },
        },
        rows: tableRows,
        columnWidths: [FIN_LBL, FIN_VAL],
      }));
    }

    // ══ SECTION 3: LTV ═══════════════════════════════════════
    children.push(sectionHead('LTV'));
    const loanAmt = data.ltvLoan || 0;
    const colAmt  = data.ltvCollateral || 0;
    let ltvLine;
    if (colAmt > 0) {
      const pct = ((loanAmt / colAmt) * 100).toFixed(1);
      ltvLine = `De LTV bij aanvang bedraagt: (${fmtEuro(loanAmt)} / ${fmtEuro(colAmt)}) = ${pct}%`;
    } else {
      ltvLine = `De LTV bij aanvang bedraagt: —`;
    }
    children.push(bodyPar(ltvLine));

    // ══ SECTION 4: Zekerheden ════════════════════════════════
    children.push(sectionHead('Zekerheden'));
    children.push(par([tx('Zekerheden:', { bold: true, color: C_BRAND })], { spaceBefore: 60, spaceAfter: 20 }));
    const mortAmt = data.mortgageAmount || 0;
    children.push(par([
      tx(`een hypotheek voor `, { bold: true }),
      tx(fmtEuro(mortAmt), { bold: true }),
      tx(' op:', { bold: true }),
    ], { spaceBefore: 20, spaceAfter: 20 }));

    const objects = data.collateralObjects || [];
    objects.forEach(obj => {
      if (obj.description) {
        children.push(par([tx(obj.description)], { bullet: 1, spaceBefore: 30, spaceAfter: 30, indent: MM(6) }));
      }
    });

    // ══ SECTION 5: Uitgangspunten ════════════════════════════
    children.push(sectionHead('Uitgangspunten van de Lening'));

    // Leenvorm
    children.push(par([
      tx('Leenvorm: ', { bold: true, color: C_BRAND }),
      tx(data.leenvorm || 'Aflossingsvrij'),
    ]));

    // Loan parts / Lening
    const parts = data.loanParts || [];
    if (parts.length === 1) {
      children.push(par([
        tx('Lening: ', { bold: true, color: C_BRAND }),
        tx(fmtEuro(parts[0].amount)),
        parts[0].label ? tx(' (' + parts[0].label + ')') : tx(''),
      ]));
    } else if (parts.length > 1) {
      parts.forEach((lp, i) => {
        children.push(par([
          tx(`Lening deel ${i+1}: `, { bold: true, color: C_BRAND }),
          tx(fmtEuro(lp.amount)),
          lp.label ? tx(' (' + lp.label + ')') : tx(''),
        ]));
      });
    }

    // Looptijd
    children.push(par([
      tx('Looptijd: ', { bold: true, color: C_BRAND }),
      tx(`${data.loanDuration || '—'} maanden`),
    ]));

    // Rente
    const gross = parseFloat(data.grossRate || 0);
    const fee   = parseFloat(data.managementFee || 0);
    const net   = (gross + fee * 12).toFixed(2);
    children.push(par([tx('Rente:', { bold: true, color: C_BRAND })], { spaceAfter: 20 }));
    children.push(par([tx(`De bruto rente bedraagt ${gross}% per jaar.`)],
                      { bullet: 1, spaceBefore: 30, spaceAfter: 20, indent: MM(6) }));
    if (fee > 0) {
      children.push(par([tx(`De beheerfee bedraagt ${fee}% per maand.`)],
                        { bullet: 1, spaceBefore: 20, spaceAfter: 20, indent: MM(6) }));
      children.push(par([tx(`De netto rente bedraagt ${net}% per jaar (afgerond).`)],
                        { bullet: 1, spaceBefore: 20, spaceAfter: 30, indent: MM(6) }));
    }

    // Vervroegde aflossing
    children.push(par([tx('Vervroegde aflossing:', { bold: true, color: C_BRAND })], { spaceAfter: 20 }));
    children.push(par([
      tx('Minimum termijn: ', { bold: false }),
      tx(`${data.earlyRepaymentMinPeriod || '—'} maanden.`),
    ], { bullet: 1, spaceBefore: 30, spaceAfter: 20, indent: MM(6) }));
    children.push(par([
      tx('Minimum bedrag: ', { bold: false }),
      tx(`${data.earlyRepaymentMinAmount ? fmtEuro(data.earlyRepaymentMinAmount) : '—'}.`),
    ], { bullet: 1, spaceBefore: 20, spaceAfter: 20, indent: MM(6) }));
    children.push(par([
      tx('Administratiekosten: ', { bold: false }),
      tx(`${data.earlyRepaymentFee ? fmtEuro(data.earlyRepaymentFee) : '—'}.`),
    ], { bullet: 1, spaceBefore: 20, spaceAfter: 30, indent: MM(6) }));

    // ══ SECTION 6: Risico's ═══════════════════════════════════
    children.push(sectionHead("Enkele risico's"));
    const risks = data.risks || [];

    // Numbered list of risk titles
    risks.forEach((r, i) => {
      children.push(par([
        tx(`${i+1}. `, { bold: true }),
        tx(r.title || '', { bold: true }),
      ], { spaceBefore: 60, spaceAfter: 20 }));
    });

    // Ad paragraphs
    children.push(par([tx('')], { spaceBefore: 80, spaceAfter: 0 }));
    risks.forEach((r, i) => {
      children.push(par([
        tx(`Ad ${i+1}  `, { bold: true }),
        tx(r.ad || ''),
      ], { spaceBefore: 60, spaceAfter: 80 }));
    });

    // ══ SECTION 7: Slotparagraaf ══════════════════════════════
    const closingLines = (data.closingParagraph || '').split('\n').filter(l => l.trim());
    if (closingLines.length) {
      children.push(par([tx('')], { spaceBefore: 40 }));
      closingLines.forEach(line => children.push(bodyPar(line)));
    }

    // ── Build document ────────────────────────────────────────
    const doc = new D.Document({
      creator: 'Lange & Partners Document Generator',
      title: `Toelichting — ${borrowerNames}`,
      sections: [{
        properties: {
          page: {
            size: { width: PAGE_W, height: PAGE_H },
            margin: { top: MARGIN + MM(5), right: MARGIN, bottom: MARGIN + MM(5), left: MARGIN },
          },
        },
        headers: { default: header },
        footers: { default: footer },
        children,
      }],
    });

    return await D.Packer.toBlob(doc);
  }

  return { generate };
})();
