/**
 * UIManager
 * Controls all DOM rendering: stats, entry list, reading rows,
 * note tabs, toast notifications, screen transitions and dot animations.
 */
class UIManager {
  #app;
  #rowCount    = 0;
  #toastTimer  = null;

  constructor(app) {
    this.#app = app;
  }

  /* ── SCREENS ── */

  showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
  }

  /* ── DOTS (PIN) ── */

  updateDots(id, input, state) {
    document.querySelectorAll(`#${id} .pin-dot`).forEach((dot, i) => {
      dot.classList.remove('filled', 'error', 'success');
      if      (state === 'error')   dot.classList.add('error');
      else if (state === 'success') dot.classList.add('success');
      else if (i < input.length)    dot.classList.add('filled');
    });
  }

  shakeDots(id, state) {
    this.updateDots(id, '1111', state);
    const el = document.getElementById(id);
    el.style.animation = 'none';
    el.offsetHeight; // force reflow
    el.style.animation = 'shake .4s ease';
  }

  /* ── TOAST ── */

  showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(this.#toastTimer);
    this.#toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
  }

  /* ── STATS DASHBOARD ── */

  renderStats(entries) {
    const total       = entries.length;
    const readCount   = entries.filter(e => e.read).length;
    const totalPrayer = entries.reduce((s, e) => s + e.prayer, 0);
    const avgPrayer   = total ? Math.round(totalPrayer / total) : 0;
    const topBook     = this.#app.store.topBooks(entries, 1)[0];
    const { ot, nt }  = this.#app.store.testamentSplit(entries);

    document.getElementById('s-read').textContent     = readCount;
    document.getElementById('s-read-sub').textContent = `de ${total}`;
    document.getElementById('s-streak').textContent   = this.#app.store.calcStreak(entries);
    document.getElementById('s-total').textContent    = totalPrayer;
    document.getElementById('s-avg').textContent      = avgPrayer;
    document.getElementById('s-fav-book').textContent = topBook ? topBook[0] : '—';
    document.getElementById('s-fav-sub').textContent  = topBook ? `${topBook[1]}×` : '';
    document.getElementById('s-testament').textContent = (ot + nt > 0) ? `${ot}/${nt}` : '—';
  }

  /* ── ENTRY LIST ── */

  renderEntries(entries) {
    const list = document.getElementById('entries-list');
    if (!entries.length) {
      list.innerHTML = '<div class="empty">agrega tu primer registro arriba</div>';
      return;
    }
    list.innerHTML = entries.map(e => this.#buildEntryHTML(e)).join('');
    // set textarea values safely (avoids HTML-injection via backticks)
    entries.forEach(e => {
      const ta = document.getElementById(`neditor-${e.date}`);
      if (ta) ta.value = e.note || '';
    });
  }

  #buildEntryHTML(e) {
    const readings = (e.readings || []).filter(r => r.book);
    const readingLines = readings.map(r => {
      const tag = BibleData.isOT(r.book) ? 'badge-ot' : 'badge-book';
      const tst = BibleData.isOT(r.book) ? 'AT' : 'NT';
      return `<span class="entry-reading-line">
        <span class="badge ${tag}" style="font-size:9px;padding:2px 6px">${tst}</span>
        ${r.book}${r.passage ? ' ' + r.passage : ''}
      </span>`;
    }).join('');

    const hasNote   = !!(e.note && e.note.trim());
    const preview   = hasNote ? MarkdownRenderer.plainPreview(e.note) : '';
    const rendered  = MarkdownRenderer.render(e.note || '');

    return `
    <div class="entry" id="entry-${e.date}">
      <div class="entry-top">
        <div class="entry-left">
          <span class="entry-date">${DataStore.formatDate(e.date)}</span>
          ${readingLines ? `<div class="entry-readings">${readingLines}</div>` : ''}
          ${hasNote ? `<div style="font-size:11px;color:var(--text3);margin-top:3px">📝 ${preview}</div>` : ''}
        </div>
        <div class="entry-right">
          <div class="entry-actions">
            <button class="btn-note-toggle ${hasNote ? 'has-note' : ''}" onclick="app.ui.toggleEntryNote('${e.date}')">${hasNote ? '📝 nota' : '📝'}</button>
            <button class="del" onclick="app.deleteEntry('${e.date}')">✕</button>
          </div>
          <div class="entry-badges">
            <span class="badge ${e.read ? 'badge-read' : 'badge-noread'}">${e.read ? '✓ leí' : '✗ no'}</span>
            ${e.prayer > 0 ? `<span class="badge badge-prayer">🙏${e.prayer}m</span>` : ''}
          </div>
        </div>
      </div>
      <div class="entry-note" id="note-${e.date}">
        <div class="entry-note-tabs">
          <button class="entry-note-tab" id="ntw-${e.date}" onclick="app.ui.switchEntryNoteTab('${e.date}','write')">editar</button>
          <button class="entry-note-tab active" id="ntp-${e.date}" onclick="app.ui.switchEntryNoteTab('${e.date}','preview')">ver</button>
        </div>
        <textarea class="entry-note-editor" id="neditor-${e.date}"
          oninput="document.getElementById('nrendered-${e.date}').innerHTML=MarkdownRenderer.render(this.value)"></textarea>
        <div class="entry-note-rendered md-rendered" id="nrendered-${e.date}">${rendered}</div>
        <button class="note-save-btn" onclick="app.saveNote('${e.date}', document.getElementById('neditor-${e.date}').value)">Guardar nota</button>
      </div>
    </div>`;
  }

  /* ── ENTRY NOTE ── */

  toggleEntryNote(date) {
    document.getElementById(`note-${date}`)?.classList.toggle('open');
  }

  switchEntryNoteTab(date, tab) {
    const editor   = document.getElementById(`neditor-${date}`);
    const rendered = document.getElementById(`nrendered-${date}`);
    const tw       = document.getElementById(`ntw-${date}`);
    const tp       = document.getElementById(`ntp-${date}`);
    tw.classList.toggle('active', tab === 'write');
    tp.classList.toggle('active', tab === 'preview');
    if (tab === 'preview') {
      rendered.style.display = 'block';
      editor.classList.remove('visible');
    } else {
      rendered.style.display = 'none';
      editor.classList.add('visible');
    }
  }

  /* ── READING ROWS (form) ── */

  addReadingRow(book = '', passage = '') {
    const id  = this.#rowCount++;
    const div = document.createElement('div');
    div.className = 'reading-row';
    div.id        = `rrow-${id}`;
    div.innerHTML = `
      <div class="field">
        ${id === 0 ? '<label>libro</label>' : '<label>&nbsp;</label>'}
        ${BibleData.buildSelect(book)}
      </div>
      <div class="field">
        ${id === 0 ? '<label>pasaje</label>' : '<label>&nbsp;</label>'}
        <input type="text" class="r-passage" value="${passage}" placeholder="ej: 1 · 1-3 · 3:16">
        ${id === 0 ? '<div class="passage-hint">cap · rango · versículo · texto libre</div>' : ''}
      </div>
      <div class="field">
        <label>&nbsp;</label>
        <button class="btn-icon" onclick="app.ui.removeReadingRow('rrow-${id}')">✕</button>
      </div>`;
    document.getElementById('readings-rows').appendChild(div);
  }

  removeReadingRow(id) {
    if (document.querySelectorAll('.reading-row').length <= 1) return;
    document.getElementById(id)?.remove();
  }

  getReadings() {
    return [...document.querySelectorAll('.reading-row')].map(r => ({
      book:    r.querySelector('.r-book').value,
      passage: r.querySelector('.r-passage').value.trim()
    })).filter(r => r.book);
  }

  clearReadingRows() {
    document.getElementById('readings-rows').innerHTML = '';
    this.#rowCount = 0;
    this.addReadingRow();
  }

  toggleReadFields() {
    const visible = document.getElementById('f-read').checked;
    document.getElementById('readings-section').classList.toggle('visible', visible);
  }

  /* ── NOTE FORM TABS ── */

  switchNoteTab(tab) {
    document.getElementById('tab-write').classList.toggle('active', tab === 'write');
    document.getElementById('tab-preview').classList.toggle('active', tab === 'preview');
    const ta = document.getElementById('f-note');
    const pv = document.getElementById('note-preview-box');
    if (tab === 'preview') {
      pv.innerHTML = MarkdownRenderer.render(ta.value) ||
        '<span style="color:var(--text3);font-size:13px">nada que mostrar aún</span>';
      pv.classList.add('visible');
      ta.style.display = 'none';
    } else {
      pv.classList.remove('visible');
      ta.style.display = '';
    }
  }

  /* ── FORM RESET ── */

  resetForm() {
    document.getElementById('f-date').value   = DataStore.todayString();
    document.getElementById('f-prayer').value = '0';
    document.getElementById('f-read').checked = true;
    document.getElementById('f-note').value   = DataStore.NOTE_TEMPLATE;
    document.getElementById('f-note').style.display = '';
    document.getElementById('note-preview-box').classList.remove('visible');
    document.getElementById('tab-write').classList.add('active');
    document.getElementById('tab-preview').classList.remove('active');
    document.getElementById('readings-section').classList.add('visible');
    this.clearReadingRows();
  }

  /* ── FULL RENDER ── */

  render(entries) {
    this.renderStats(entries);
    this.renderEntries(entries);
  }
}
