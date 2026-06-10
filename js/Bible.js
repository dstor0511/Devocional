/**
 * BibleData
 * Static class holding all 66 Bible books in Spanish,
 * OT/NT sets, and select-element builder.
 */
class BibleData {
  static OT = [
    'Génesis','Éxodo','Levítico','Números','Deuteronomio',
    'Josué','Jueces','Rut','1 Samuel','2 Samuel',
    '1 Reyes','2 Reyes','1 Crónicas','2 Crónicas',
    'Esdras','Nehemías','Ester','Job','Salmos','Proverbios',
    'Eclesiastés','Cantares','Isaías','Jeremías','Lamentaciones',
    'Ezequiel','Daniel','Oseas','Joel','Amós','Abdías',
    'Jonás','Miqueas','Nahúm','Habacuc','Sofonías','Hageo',
    'Zacarías','Malaquías'
  ];

  static NT = [
    'Mateo','Marcos','Lucas','Juan','Hechos','Romanos',
    '1 Corintios','2 Corintios','Gálatas','Efesios',
    'Filipenses','Colosenses','1 Tesalonicenses','2 Tesalonicenses',
    '1 Timoteo','2 Timoteo','Tito','Filemón','Hebreos',
    'Santiago','1 Pedro','2 Pedro','1 Juan','2 Juan','3 Juan',
    'Judas','Apocalipsis'
  ];

  static #OT_SET = new Set(BibleData.OT);

  static isOT(book) {
    return BibleData.#OT_SET.has(book);
  }

  /** Build an HTML <select> string with OT/NT optgroups */
  static buildSelect(selectedBook = '') {
    const opts = (list) =>
      list.map(b => `<option${b === selectedBook ? ' selected' : ''}>${b}</option>`).join('');

    return `<select class="r-book">
      <optgroup label="Antiguo Testamento">${opts(BibleData.OT)}</optgroup>
      <optgroup label="Nuevo Testamento">${opts(BibleData.NT)}</optgroup>
    </select>`;
  }
}
