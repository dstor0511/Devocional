/**
 * ExportManager
 * Builds and triggers the PDF report.
 * Android Chrome fix: uses requestAnimationFrame + setTimeout(400)
 * before window.print() to ensure DOM is fully painted.
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

    document.getElementById('print-view').innerHTML = this.#buildHTML(data, from, to, includeNotes);
    this.closeModal();

    // Android Chrome fix: defer print until browser has painted the new DOM
    this.#app.ui.showToast('Preparando reporte...');
    requestAnimationFrame(() => {
      setTimeout(() => window.print(), 400);
    });
  }

  #buildHTML(data, from, to, includeNotes) {
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
            <td colspan="3" class="print-note">${
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
          <td class="${e.read ? 'p-yes' : 'p-no'}">${e.read ? '✓' : '✗'}</td>
          <td class="p-book">${rc}</td>
          <td class="${e.prayer > 0 ? 'p-pray' : 'p-no'}">${e.prayer > 0 ? e.prayer + ' min' : '—'}</td>
          <td>
            <div class="p-bar-wrap">
              <div class="p-bar"><div class="p-bar-fill" style="width:${bw}px"></div></div>
            </div>
          </td>
        </tr>${noteRow}`;
    }).join('');

    const booksSection = topBooks.length ? `
      <div class="print-section">libros más leídos</div>
      <div class="print-books">
        ${topBooks.map(([b, c]) => `
          <div class="print-book-item">
            <span class="print-book-name">${b}</span>
            <span class="print-book-count">${c}×</span>
          </div>`).join('')}
      </div>` : '';

    return `
      <div class="print-header">
        <h1>📖 Reporte Devocional</h1>
        <p>Período: ${DataStore.formatDateLong(from)} — ${DataStore.formatDateLong(to)}</p>
      </div>

      <div class="print-section">resumen del período</div>
      <div class="print-stats">
        <div class="print-stat"><div class="print-stat-label">Días registrados</div><div class="print-stat-value">${total}</div></div>
        <div class="print-stat"><div class="print-stat-label">Días leídos</div><div class="print-stat-value">${readCount}</div><div class="print-stat-sub">${readPct}%</div></div>
        <div class="print-stat"><div class="print-stat-label">Total oración</div><div class="print-stat-value">${totalPrayer}</div><div class="print-stat-sub">minutos</div></div>
        <div class="print-stat"><div class="print-stat-label">Promedio</div><div class="print-stat-value">${avgPrayer}</div><div class="print-stat-sub">min/día</div></div>
      </div>

      <div class="print-section">datos adicionales</div>
      <div class="print-insights">
        <div class="print-insight"><div class="print-insight-label">Racha más larga</div><div class="print-insight-value">🔥 ${store.calcLongestStreak(data)} días</div></div>
        <div class="print-insight"><div class="print-insight-label">Días sin lectura</div><div class="print-insight-value">📌 ${total - readCount}</div></div>
        <div class="print-insight"><div class="print-insight-label">Mayor oración</div><div class="print-insight-value">🙏 ${maxPrayer} min${bestDay ? ' (' + DataStore.formatDateLong(bestDay.date) + ')' : ''}</div></div>
        <div class="print-insight"><div class="print-insight-label">Días con oración</div><div class="print-insight-value">✅ ${data.filter(e => e.prayer > 0).length} de ${total}</div></div>
        <div class="print-insight"><div class="print-insight-label">AT vs NT</div><div class="print-insight-value">📜 ${ot} AT · ${nt} NT</div></div>
        <div class="print-insight"><div class="print-insight-label">Libros distintos</div><div class="print-insight-value">📚 ${uniqueBooks}${includeNotes ? ` · 📝 ${withNotes} notas` : ''}</div></div>
      </div>

      ${booksSection}

      <div class="print-section" style="margin-top:1rem">
        registro diario${includeNotes ? ' (incluye notas)' : ''}
      </div>
      <table class="pt">
        <thead>
          <tr><th>Fecha</th><th>Leyó</th><th>Pasajes</th><th>Oración</th><th>Relativo</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <div class="print-footer">
        Generado el ${new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
        · Dashboard Devocional
      </div>`;
  }
}
