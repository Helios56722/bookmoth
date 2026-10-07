const WIDTH = 1600;
const HEIGHT = 1100;

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function wrapText(value, maxCharacters, maxLines) {
  const words = String(value).trim().split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length <= maxCharacters || !line) line = next;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  const visible = lines.slice(0, maxLines);
  if (lines.length > maxLines && visible.length) {
    const last = visible.length - 1;
    visible[last] = `${visible[last].slice(0, Math.max(1, maxCharacters - 1)).trimEnd()}…`;
  }
  return visible;
}

function textLines(lines, x, y, lineHeight, className, anchor = "start") {
  return lines.map((line, index) => `<text x="${x}" y="${y + index * lineHeight}" text-anchor="${anchor}" class="${className}">${escapeXml(line)}</text>`).join("");
}

function sourceCards(sources) {
  const visible = sources.slice(0, 4);
  const columns = visible.length === 1 ? 1 : 2;
  const rows = Math.ceil(visible.length / columns);
  const gap = 18;
  const x0 = 90;
  const y0 = 268;
  const availableWidth = 888;
  const availableHeight = 648;
  const cellWidth = (availableWidth - gap * (columns - 1)) / columns;
  const cellHeight = (availableHeight - gap * (rows - 1)) / rows;

  return visible.map((source, index) => {
    const x = x0 + (index % columns) * (cellWidth + gap);
    const y = y0 + Math.floor(index / columns) * (cellHeight + gap);
    const imageHeight = cellHeight - 48;
    return `<g>
      <rect x="${x}" y="${y}" width="${cellWidth}" height="${cellHeight}" rx="14" fill="#0f0b15" stroke="#3e3048" stroke-width="2"/>
      <image x="${x + 14}" y="${y + 14}" width="${cellWidth - 28}" height="${imageHeight - 22}" preserveAspectRatio="xMidYMid meet" href="${escapeXml(source.dataUrl)}"/>
      <rect x="${x + 1}" y="${y + cellHeight - 47}" width="${cellWidth - 2}" height="46" fill="#2b2037"/>
      <text x="${x + 16}" y="${y + cellHeight - 17}" class="micro">S${index + 1}</text>
      <text x="${x + 60}" y="${y + cellHeight - 17}" class="label">${escapeXml(source.name.slice(0, 46))}</text>
    </g>`;
  }).join("");
}

function calloutCards(callouts) {
  const visible = callouts.slice(0, 4);
  const count = Math.max(visible.length, 1);
  const gap = 14;
  const startY = 384;
  const availableHeight = 512;
  const height = (availableHeight - gap * (count - 1)) / count;
  return visible.map((item, index) => {
    const y = startY + index * (height + gap);
    const sourceLabel = item.sourceIds?.length ? item.sourceIds.join(" · ") : "CHECK SOURCE";
    const lines = wrapText(item.text, 38, Math.max(2, Math.floor((height - 62) / 29)));
    return `<g>
      <rect x="1062" y="${y}" width="448" height="${height}" rx="14" class="card"/>
      <text x="1084" y="${y + 34}" class="source">${escapeXml(sourceLabel)}</text>
      ${textLines(lines, 1084, y + 70, 29, "callout")}
    </g>`;
  }).join("");
}

export function buildCollageSvg(collage, sources) {
  const title = wrapText(collage.title, 36, 2);
  const caption = wrapText(collage.caption, 72, 2);
  const sourceCount = Math.min(sources.length, 4);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
    <defs>
      <radialGradient id="glow" cx="90%" cy="0%" r="58%"><stop offset="0" stop-color="#5e3b42" stop-opacity=".62"/><stop offset="1" stop-color="#130e1b" stop-opacity="0"/></radialGradient>
      <style>
        .title{font:600 58px Georgia,serif;fill:#f7efe5}.sub{font:25px Arial,sans-serif;fill:#c9bbcf}.micro{font:700 18px Arial,sans-serif;letter-spacing:1.5px;fill:#f0b976}.label{font:18px Arial,sans-serif;fill:#d8cedb}.panel-title{font:600 37px Georgia,serif;fill:#36243e}.panel-copy{font:21px Arial,sans-serif;fill:#705f78}.source{font:700 17px Arial,sans-serif;fill:#8a5f20}.callout{font:22px Arial,sans-serif;fill:#382d3d}.card{fill:#fffaf1;stroke:#dac7b0;stroke-width:2}.footer{font:600 24px Georgia,serif;fill:#f7efe5}.footer-small{font:20px Arial,sans-serif;fill:#baa9c9}
      </style>
    </defs>
    <rect width="1600" height="1100" fill="#130e1b"/><rect width="1600" height="1100" fill="url(#glow)"/>
    ${textLines(title, 64, 88, 64, "title")}
    ${textLines(caption, 64, 150, 34, "sub")}
    <text x="1536" y="82" text-anchor="end" class="micro">BOOKMOTH · VISUAL STUDY BOARD</text>
    <rect x="64" y="210" width="940" height="730" rx="24" fill="#201628" stroke="#4a3854" stroke-width="2"/>
    <text x="90" y="248" class="micro">SOURCE MATERIAL · ${sourceCount} ${sourceCount === 1 ? "ITEM" : "ITEMS"}</text>
    ${sourceCards(sources)}
    <rect x="1036" y="210" width="500" height="730" rx="24" fill="#f6efe4" stroke="#f0b976" stroke-width="2"/>
    <text x="1066" y="268" class="panel-title">Quick review</text>
    <text x="1066" y="306" class="panel-copy">Explain each point in your own words,</text><text x="1066" y="335" class="panel-copy">then check it against the source.</text>
    ${calloutCards(collage.callouts)}
    <rect y="1000" width="1600" height="100" fill="#2c2035"/>
    <text x="64" y="1058" class="footer">Built from your sources. Review Source check before you study.</text>
    <text x="1536" y="1058" text-anchor="end" class="footer-small">bookmoth · open learning studio</text>
  </svg>`;
}
