function normalizeText(s) {
  return (s ?? "").replace(/\s+/g, " ").trim();
}

function sectionRootElements() {
  // On otanjoubi.jp, content is split between ms-left/ms-right.
  // Each meaningful section contains a .ms-tableCell with an <h2>.
  return Array.from(document.querySelectorAll(".ms-section .ms-tableCell")).filter(
    (cell) => cell.querySelector("h2")
  );
}

function extractByH2Title(wantedTitle) {
  const cells = sectionRootElements();
  const cell = cells.find((c) => normalizeText(c.querySelector("h2")?.textContent) === wantedTitle);
  if (!cell) return null;

  const title = wantedTitle;
  const parts = [title];

  if (wantedTitle === "誕生色") {
    const name = normalizeText(cell.querySelector("h3")?.textContent);
    const hex = normalizeText(cell.querySelector("h4")?.textContent);
    const ps = Array.from(cell.querySelectorAll("p"))
      .map((p) => normalizeText(p.textContent))
      .filter((t) => t && !/^\d+月\d+日$/.test(t) && !/^\d+月共通$/.test(t));

    if (name) parts.push(name);
    if (hex) parts.push(hex);
    for (const t of ps) parts.push(t);
    return parts.join("\n");
  }

  // Generic: h3 items, optional immediate h4 after each h3.
  const h3s = Array.from(cell.querySelectorAll("h3"));
  if (h3s.length === 0) {
    return parts.join("\n");
  }

  for (const h3 of h3s) {
    const name = normalizeText(h3.textContent);
    if (!name) continue;

    const next = h3.nextElementSibling;
    const desc = next && next.tagName === "H4" ? normalizeText(next.textContent) : "";

    parts.push(desc ? `${name}：${desc}` : `${name}`);
  }

  return parts.join("\n");
}

function extractAllWanted() {
  const order = [
    "誕生花",
    "誕生石",
    "誕生色",
    "誕生酒",
    "誕生果",
    "誕生魚",
    "誕生鳥",
    "誕生木",
    "誕生竜",
    "誕生星"
  ];

  const blocks = [];
  for (const title of order) {
    const block = extractByH2Title(title);
    if (block) blocks.push(block);
  }
  return blocks.join("\n\n").trim();
}

// This file is injected by popup.js; return value is captured.
extractAllWanted();

