/**
 * MarkdownRenderer
 * Lightweight markdown-to-HTML renderer for devotional notes.
 * Supports: headings, bold, italic, code, blockquotes, lists, hr, links.
 */
class MarkdownRenderer {
  static render(raw) {
    if (!raw || !raw.trim()) return '';

    let t = raw
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // code blocks (before inline code)
      .replace(/```([\s\S]*?)```/g, (_, c) => `<pre><code>${c.trim()}</code></pre>`)
      // headings
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm,  '<h2>$1</h2>')
      .replace(/^# (.+)$/gm,   '<h1>$1</h1>')
      // bold / italic
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g,     '<em>$1</em>')
      // inline code
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // blockquotes
      .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
      // horizontal rule
      .replace(/^---$/gm, '<hr>')
      // links
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank">$1</a>');

    // unordered lists
    t = t.replace(/((?:^[-*] .+$\n?)+)/gm, m =>
      '<ul>' + m.replace(/^[-*] (.+)$/gm, '<li>$1</li>') + '</ul>'
    );
    // ordered lists
    t = t.replace(/((?:^\d+\. .+$\n?)+)/gm, m =>
      '<ol>' + m.replace(/^\d+\. (.+)$/gm, '<li>$1</li>') + '</ol>'
    );
    // paragraphs
    t = t.split('\n\n').map(p => {
      p = p.trim();
      if (!p || p.startsWith('<')) return p;
      return `<p>${p.replace(/\n/g, '<br>')}</p>`;
    }).join('\n');

    return t;
  }

  /** Strip markdown syntax for plain-text preview (e.g. entry list snippet) */
  static plainPreview(raw, maxLength = 80) {
    if (!raw) return '';
    const stripped = raw
      .replace(/#{1,6} /g, '')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/^> /gm, '')
      .replace(/^[-*\d+.] /gm, '')
      .replace(/\[(.+?)\]\(.+?\)/g, '$1')
      .replace(/\n/g, ' ')
      .trim();
    return stripped.length > maxLength
      ? stripped.slice(0, maxLength) + '…'
      : stripped;
  }
}
