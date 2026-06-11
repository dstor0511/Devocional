/**
 * ExportManager
 * Builds the PDF report and opens it in a new tab.
 *
 * Strategy (Android-Chrome-safe):
 * Chrome on Android renders blank when printing (a) content shown only via
 * @media print, (b) a dynamically-written iframe, or (c) an auto-triggered
 * window.print() that fires before the page has painted. The reliable flow
 * across every browser is to open the report as a fully-rendered standalone
 * document in a new tab with its own "Imprimir / Guardar PDF" button, and
 * let the USER trigger printing once the content is visible.
 */
class ExportManager {
  #app;

  constructor(app) {
    this.#app = app;
  }

  openModal() {
    const entries = this.#app.entries;
    if (!entries.length) { this.#app.ui.showToast('No hay registros'); return; }
    const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
    document.getElementById('exp-from').value = sorted[0].date;
    document.getElementById('exp-to').value   = sorted[sorted.length - 1].date;
    document.getElementById('export-modal').classList.add('open');
  }

  closeModal() {
    document.getElementById('export-modal').classList.remove('open');
  }

  generate() {
    const from         = document.getElementById('exp-from').value;
    const to           = document.getElementById('exp-to').value;
    const includeNotes = document.getElementById('exp-notes').checked;

    if (!from || !to || from > to) { this.#app.ui.showToast('Rango inválido'); return; }

    const data = this.#app.entries
      .filter(e => e.date >= from && e.date <= to)
      .sort((a, b) => a.date.localeCompare(b.date));

    if (!data.length) { this.#app.ui.showToast('Sin registros en ese período'); return; }

    this.closeModal();
    this.#openReportTab(this.#buildReportHTML(data, from, to, includeNotes));
  }

  /**
   * Open the report in a new tab/window as a fully-rendered document with
   * its own "Imprimir / Guardar PDF" button. The user triggers printing
   * manually once the content is visible — this is the only flow that works
   * reliably on Android Chrome, where auto window.print() fires before paint.
   */
  #openReportTab(reportHTML) {
    const doc = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Reporte Devocional</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @page { margin: 1.2cm 1.4cm; }
  body { font-family: "Ubuntu", Georgia, serif; color: #111; background: #f3f4f6; }
  .toolbar {
    position: sticky; top: 0; z-index: 10;
    background: #0d1117; padding: 12px 16px;
    display: flex; gap: 10px; align-items: center; justify-content: space-between;
  }
  .toolbar span { color: #e6edf3; font-size: 14px; font-family: -apple-system, sans-serif; }
  .toolbar button {
    background: #58a6ff; color: #0d1117; border: none; border-radius: 8px;
    padding: 10px 20px; font-size: 14px; font-weight: 600; cursor: pointer;
    font-family: -apple-system, sans-serif;
  }
  .toolbar button:active { opacity: .8; }
  .sheet { max-width: 800px; margin: 1.5rem auto; background: #fff; padding: 2rem 1.8rem; box-shadow: 0 1px 4px rgba(0,0,0,.15); }
  .ph { border-bottom: 2px solid #111; padding-bottom: .6rem; margin-bottom: 1.2rem; }
  .ph h1 { font-size: 1.5rem; font-weight: 700; }
  .ph p { font-size: .8rem; color: #555; margin-top: 3px; }
  .sec { font-size: 10px; text-transform: uppercase; letter-spacing: .07em; color: #888; margin: 1rem 0 6px; }
  .stats { display: grid; grid-template-columns: repeat(4,1fr); gap: 8px; margin-bottom: 1.2rem; }
  .stat { border: 1px solid #ccc; border-radius: 6px; padding: .65rem; text-align: center; }
  .stat-l { font-size: 9px; color: #666; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 3px; }
  .stat-v { font-size: 1.4rem; font-weight: 700; }
  .stat-s { font-size: 9px; color: #999; margin-top: 2px; }
  .ins { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; margin-bottom: .8rem; }
  .in { border: 1px solid #ddd; border-radius: 5px; padding: .6rem; }
  .in-l { font-size: 9px; color: #888; margin-bottom: 2px; }
  .in-v { font-size: 12px; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { background: #f0f0f0; color: #333; padding: 6px 10px; text-align: left; font-size: 10px; font-weight: 600; border-bottom: 1px solid #ccc; }
  td { padding: 6px 10px; border-bottom: 1px solid #eee; vertical-align: top; }
  tr.alt td { background: #f9f9f9; }
  .yes { color: #166534; font-weight: 500; } .no { color: #999; }
  .pray { color: #1e3a5f; font-weight: 500; } .book { color: #4c1d95; }
  .bar { height: 6px; background: #e0e7ff; border-radius: 3px; width: 60px; display: inline-block; }
  .bar-f { height: 6px; background: #4f46e5; border-radius: 3px; display: inline-block; }
  .books { display: grid; grid-template-columns: repeat(3,1fr); gap: 6px; }
  .book-i { border: 1px solid #eee; border-radius: 4px; padding: 5px 8px; display: flex; justify-content: space-between; }
  .book-n { font-size: 11px; font-weight: 500; } .book-c { font-size: 10px; color: #4f46e5; font-weight: 600; }
  .note { font-size: 10px; color: #444; border-left: 3px solid #ccc; padding-left: 8px; margin-top: 4px; line-height: 1.5; }
  .ft { margin-top: 1.5rem; font-size: 9px; color: #bbb; border-top: 1px solid #eee; padding-top: .4rem; }
  @media print {
    body { background: #fff; }
    .toolbar { display: none !important; }
    .sheet { max-width: none; margin: 0; padding: 0; box-shadow: none; }
  }
</style>
</head>
<body>
  <div class="toolbar">
    <span>📖 Reporte listo</span>
    <button onclick="window.print()">Imprimir / Guardar PDF</button>
  </div>
  <div class="sheet">${reportHTML}</div>
</body>
</html>`;

    const w = window.open('', '_blank');
    if (w) {
      w.document.open();
      w.document.write(doc);
      w.document.close();
      this.#app.ui.showToast('Reporte abierto en nueva pestaña');
    } else {
      // popup blocked — fall back to a data-URL navigation in same tab
      const blob = new Blob([doc], { type: 'text/html' });
      const url  = URL.createObjectURL(blob);
      window.location.href = url;
    }
  }
  #buildReportHTML(data, from, to, includeNotes) {
    const store = this.#app.store;

    const total       = data.length;
    const readCount   = data.filter(e => e.read).length;
    const readPct     = Math.round((readCount / total) * 100);
    const totalPrayer = data.reduce((s, e) => s + e.prayer, 0);
    const avgPrayer   = Math.round(totalPrayer / total);
    const maxPrayer   = Math.max(...data.map(e => e.prayer), 0);
    const bestDay     = maxPrayer > 0 ? data.find(e => e.prayer === maxPrayer) : null;
    const { ot, nt }  = store.testamentSplit(data);
    const topBooks    = store.topBooks(data, 9);
    const uniqueBooks = Object.keys(store.bookFrequency(data)).length;
    const withNotes   = data.filter(e => e.note && e.note.trim()).length;

    const rows = data.map((e, i) => {
      const readings = (e.readings || []).filter(r => r.book);
      const rc = readings.length
        ? readings.map(r => `<span>${BibleData.isOT(r.book) ? 'AT' : 'NT'} · ${r.book}${r.passage ? ' ' + r.passage : ''}</span>`).join('<br>')
        : '—';
      const bw = maxPrayer > 0 ? Math.round((e.prayer / maxPrayer) * 60) : 0;
      const noteRow = includeNotes && e.note
        ? `<tr class="${i % 2 === 1 ? 'alt' : ''}">
            <td colspan="2"></td>
            <td colspan="3" class="note">${
              e.note.replace(/</g, '&lt;')
                .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.+?)\*/g, '<em>$1</em>')
                .replace(/^#{1,3} (.+)$/gm, '<strong>$1</strong>')
                .replace(/\n/g, ' ')
            }</td>
           </tr>`
        : '';
      return `
        <tr class="${i % 2 === 1 ? 'alt' : ''}">
          <td>${DataStore.formatDateLong(e.date)}</td>
          <td class="${e.read ? 'yes' : 'no'}">${e.read ? '✓' : '✗'}</td>
          <td class="book">${rc}</td>
          <td class="${e.prayer > 0 ? 'pray' : 'no'}">${e.prayer > 0 ? e.prayer + ' min' : '—'}</td>
          <td><div class="bar"><div class="bar-f" style="width:${bw}px"></div></div></td>
        </tr>${noteRow}`;
    }).join('');

    const booksSection = topBooks.length ? `
      <div class="sec">libros más leídos</div>
      <div class="books">
        ${topBooks.map(([b, c]) => `<div class="book-i"><span class="book-n">${b}</span><span class="book-c">${c}×</span></div>`).join('')}
      </div>` : '';

    return `
      <div class="ph">
        <h1>📖 Reporte Devocional</h1>
        <p>Período: ${DataStore.formatDateLong(from)} — ${DataStore.formatDateLong(to)}</p>
      </div>
      <div class="sec">resumen del período</div>
      <div class="stats">
        <div class="stat"><div class="stat-l">Días registrados</div><div class="stat-v">${total}</div></div>
        <div class="stat"><div class="stat-l">Días leídos</div><div class="stat-v">${readCount}</div><div class="stat-s">${readPct}%</div></div>
        <div class="stat"><div class="stat-l">Total oración</div><div class="stat-v">${totalPrayer}</div><div class="stat-s">minutos</div></div>
        <div class="stat"><div class="stat-l">Promedio</div><div class="stat-v">${avgPrayer}</div><div class="stat-s">min/día</div></div>
      </div>
      <div class="sec">datos adicionales</div>
      <div class="ins">
        <div class="in"><div class="in-l">Racha más larga</div><div class="in-v">🔥 ${store.calcLongestStreak(data)} días</div></div>
        <div class="in"><div class="in-l">Días sin lectura</div><div class="in-v">📌 ${total - readCount}</div></div>
        <div class="in"><div class="in-l">Mayor oración</div><div class="in-v">🙏 ${maxPrayer} min${bestDay ? ' (' + DataStore.formatDateLong(bestDay.date) + ')' : ''}</div></div>
        <div class="in"><div class="in-l">Días con oración</div><div class="in-v">✅ ${data.filter(e => e.prayer > 0).length} de ${total}</div></div>
        <div class="in"><div class="in-l">AT vs NT</div><div class="in-v">📜 ${ot} AT · ${nt} NT</div></div>
        <div class="in"><div class="in-l">Libros distintos</div><div class="in-v">📚 ${uniqueBooks}${includeNotes ? ` · 📝 ${withNotes} notas` : ''}</div></div>
      </div>
      ${booksSection}
      <div class="sec" style="margin-top:1rem">registro diario${includeNotes ? ' (incluye notas)' : ''}</div>
      <table>
        <thead><tr><th>Fecha</th><th>Leyó</th><th>Pasajes</th><th>Oración</th><th>Relativo</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="ft">
        Generado el ${new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })} · Dashboard Devocional
      </div>`;
  }
}
