const fs = require('fs');
const path = require('path');

const files = [1, 2, 3, 4, 5].map(n => `Module${n}_Study_Notes_Enhanced.md`);
const esc = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const inline = value => esc(value)
  .replace(/`([^`]+)`/g, '<code>$1</code>')
  .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  .replace(/\*([^*]+)\*/g, '<em>$1</em>');

function tableRow(line) {
  return line.trim().replace(/^\||\|$/g, '').split('|').map(cell => cell.trim());
}

function render(markdown) {
  const lines = markdown.replace(/\r/g, '').split('\n');
  const out = [];
  let paragraph = [], list = null, inCode = false, code = [], table = null;
  const flushParagraph = () => { if (paragraph.length) { out.push(`<p>${inline(paragraph.join(' '))}</p>`); paragraph = []; } };
  const flushList = () => { if (list) { out.push(`</${list.type}>`); list = null; } };
  const flushCode = () => { if (inCode) { out.push(`<pre><code>${esc(code.join('\n'))}</code></pre>`); inCode = false; code = []; } };
  const flushTable = () => {
    if (!table) return;
    const [head, ...body] = table;
    out.push('<div class="table-wrap"><table><thead><tr>' + head.map(cell => `<th>${inline(cell)}</th>`).join('') + '</tr></thead><tbody>');
    body.forEach(row => out.push('<tr>' + row.map(cell => `<td>${inline(cell)}</td>`).join('') + '</tr>'));
    out.push('</tbody></table></div>'); table = null;
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i], next = lines[i + 1] || '';
    if (line.startsWith('```')) { flushParagraph(); flushList(); flushTable(); if (inCode) flushCode(); else inCode = true; continue; }
    if (inCode) { code.push(line); continue; }
    if (/^\|/.test(line) && /^\|?\s*:?-{3,}/.test(next)) { flushParagraph(); flushList(); flushTable(); table = [tableRow(line)]; i++; continue; }
    if (table && /^\|/.test(line)) { table.push(tableRow(line)); continue; }
    if (table) flushTable();
    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    if (heading) { flushParagraph(); flushList(); const level = heading[1].length; out.push(`<h${level}>${inline(heading[2])}</h${level}>`); continue; }
    if (/^\s*---+\s*$/.test(line)) { flushParagraph(); flushList(); out.push('<hr>'); continue; }
    const item = /^\s*([-*+]|\d+\.)\s+(.+)$/.exec(line);
    if (item) { flushParagraph(); const type = /\d+\./.test(item[1]) ? 'ol' : 'ul'; if (!list || list.type !== type) { flushList(); out.push(`<${type}>`); list = { type }; } out.push(`<li>${inline(item[2])}</li>`); continue; }
    if (!line.trim()) { flushParagraph(); flushList(); continue; }
    paragraph.push(line.trim());
  }
  flushParagraph(); flushList(); flushTable(); flushCode();
  return out.join('\n');
}

const style = `
  :root { color-scheme: dark; --bg:#1e1e1e; --ink:#d4d4d4; --muted:#a8a8a8; --rule:#444; --code:#151515; --accent:#80cfff; }
  * { box-sizing:border-box; } body { margin:0; background:var(--bg); color:var(--ink); font:18px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
  main { width:min(100% - 72px, 1120px); margin:0 auto; padding:28px 0 72px; } h1,h2,h3 { line-height:1.25; margin:1.6em 0 .65em; padding-bottom:.34em; border-bottom:1px solid var(--rule); } h1 { font-size:2.1rem; margin-top:0; } h2 { font-size:1.5rem; } h3 { font-size:1.16rem; border:0; padding:0; }
  p { margin:.7em 0 1.15em; } ul,ol { padding-left:1.5em; margin:.5em 0 1.1em; } li { margin:.28em 0; } hr { border:0; border-top:1px solid var(--rule); margin:1.45em 0; } strong { color:#f1f1f1; } code { background:var(--code); border-radius:4px; padding:.12em .32em; font: .88em Consolas,"Cascadia Code",monospace; } pre { overflow:auto; padding:16px; background:var(--code); border:1px solid var(--rule); border-radius:7px; } pre code { padding:0; background:transparent; } .table-wrap { overflow:auto; margin:1em 0 1.35em; } table { border-collapse:collapse; min-width:620px; width:fit-content; } th,td { text-align:left; padding:.45em .7em; border-bottom:1px solid var(--rule); vertical-align:top; } th { color:#f1f1f1; } .source { display:inline-block; color:var(--accent); text-decoration:none; margin-bottom:1.4em; } .source:hover { text-decoration:underline; }
  @media (max-width:600px) { body{font-size:16px;} main{width:min(100% - 32px,1120px); padding-top:20px;} h1{font-size:1.75rem;} }
`;

files.forEach(file => {
  const title = file.replace('_Study_Notes_Enhanced.md', '').replace(/Module(\d+)/, 'Module $1 Study Notes');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>${style}</style></head><body><main><a class="source" href="${encodeURI(file)}">View Markdown source</a>${render(fs.readFileSync(file, 'utf8'))}</main></body></html>`;
  fs.writeFileSync(file.replace(/\.md$/, '.html'), html, 'utf8');
});
