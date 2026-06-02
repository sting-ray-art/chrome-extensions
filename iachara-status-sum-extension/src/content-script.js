/**
 * いあきゃら(iachara.com)の画面上の「ラベル文字」から近傍の数値を拾って合計する。
 * DOM構造に依存しすぎないよう、(1)ラベル検索→(2)同じブロック内の入力/数値を探索、の2段で回す。
 */

const EXT_ROOT_ID = "iachara-status-sum-root";

// 合計対象（指定の8能力値のみ）
const TARGET_LABELS = [
  "STR",
  "CON",
  "POW",
  "DEX",
  "APP",
  "SIZ",
  "INT",
  "EDU"
];

const API_HOST = "apiv3.iachara.com";
const API_PATH_RE = /\/v3\/charasheet\/(\d+)(\?|$)/;

function isIacharaPage() {
  const text = document.body?.innerText || "";
  if (text.includes("いあきゃら")) return true;
  // ローカル保存HTMLでもフッターに出ることが多い
  if (text.includes("いあぷろじぇくと")) return true;
  if (location.hostname === "iachara.com" || location.hostname === "www.iachara.com") return true;
  return false;
}

function getCharaIdFromUrl() {
  const m = (location.pathname || "").match(/\/(view|edit)\/(\d+)/);
  if (m) return m[2];
  // next export html（route announcerに出ている）
  const ann = document.querySelector('p[id="__next-route-announcer__"]')?.textContent || "";
  const m2 = ann.match(/\/(view|edit)\/(\d+)/);
  return m2 ? m2[2] : null;
}

function getPageMode() {
  const p = location.pathname || "";
  if (p.startsWith("/edit/")) return "edit";
  if (p.startsWith("/view/")) return "view";
  // next export HTMLなど
  if (document.querySelector('p[id="__next-route-announcer__"]')?.textContent?.includes("/edit/")) return "edit";
  if (document.querySelector('p[id="__next-route-announcer__"]')?.textContent?.includes("/view/")) return "view";
  return "unknown";
}

function normalizeNumberText(s) {
  const t = (s ?? "").toString().trim();
  if (!t) return null;
  // "12/14" のような表記は「現在値」を優先
  const slash = t.match(/^(-?\d+)\s*\/\s*(-?\d+)$/);
  if (slash) return Number(slash[1]);

  const n = t.match(/-?\d+/);
  if (!n) return null;
  const v = Number(n[0]);
  return Number.isFinite(v) ? v : null;
}

/** @type {{ id: string | null, abilities: any | null, updatedAt: number } | null} */
let cachedCharaSheet = null;

function extractAbilitiesFromCharasheetResponse(json) {
  // お手本（冒 皓月 - いあきゃら.html）の構造:
  // {
  //   success: true,
  //   data: {
  //     id: 13846086,
  //     name: "...",
  //     data: { abilities: { str:{value:..}, ... } }
  //   }
  // }
  const abilities = json?.data?.data?.abilities;
  if (abilities && typeof abilities === "object") return abilities;

  // 将来の互換用フォールバック（現時点のお手本では使われない想定）
  const alt = json?.data?.abilities ?? json?.abilities;
  if (alt && typeof alt === "object") return alt;

  return null;
}

function abilitiesFromApiToPairs(abilities) {
  if (!abilities || typeof abilities !== "object") return [];
  /** @type {{label: string, value: number}[]} */
  const pairs = [];

  const map = {
    STR: "str",
    CON: "con",
    POW: "pow",
    DEX: "dex",
    APP: "app",
    SIZ: "siz",
    INT: "int",
    EDU: "edu"
  };

  for (const label of TARGET_LABELS) {
    const k = map[label];
    const v = abilities?.[k]?.value;
    if (typeof v === "number" && Number.isFinite(v)) pairs.push({ label, value: v });
  }
  return pairs;
}

function maybeGetPairsFromCachedApi() {
  const id = getCharaIdFromUrl();
  if (!id) return null;
  if (!cachedCharaSheet?.abilities) return null;
  if (cachedCharaSheet.id && cachedCharaSheet.id !== id) return null;
  const pairs = abilitiesFromApiToPairs(cachedCharaSheet.abilities);
  if (pairs.length === 0) return null;
  return pairs;
}

function installApiHookOnce() {
  if (installApiHookOnce._installed) return;
  installApiHookOnce._installed = true;

  function matchUrl(url) {
    try {
      const u = new URL(url, location.href);
      if (u.hostname !== API_HOST) return null;
      const m = u.pathname.match(API_PATH_RE);
      return m ? m[1] : null;
    } catch {
      return null;
    }
  }

  function tryParseAndCache(url, bodyText) {
    const id = matchUrl(url);
    if (!id) return;
    try {
      const json = JSON.parse(bodyText);
      const abilities = extractAbilitiesFromCharasheetResponse(json);
      if (!abilities) return;
      cachedCharaSheet = { id, abilities, updatedAt: Date.now() };
    } catch {
      // ignore
    }
  }

  // fetch hook
  const origFetch = window.fetch;
  if (typeof origFetch === "function") {
    window.fetch = function (input, init) {
      const url = typeof input === "string" ? input : input?.url ? input.url : "";
      return origFetch.apply(this, arguments).then((res) => {
        if (!matchUrl(url)) return res;
        try {
          const clone = res.clone();
          clone.text().then((t) => {
            tryParseAndCache(url, t);
            update();
          }).catch(() => {});
        } catch {}
        return res;
      });
    };
  }

  // XHR hook
  const XHR = window.XMLHttpRequest;
  if (XHR && XHR.prototype) {
    const origOpen = XHR.prototype.open;
    const origSend = XHR.prototype.send;
    XHR.prototype.open = function (method, url) {
      this.__iacharaUrl = url;
      return origOpen.apply(this, arguments);
    };
    XHR.prototype.send = function () {
      try {
        this.addEventListener("load", () => {
          const url = this.__iacharaUrl;
          if (!matchUrl(url)) return;
          if (typeof this.responseText === "string") {
            tryParseAndCache(url, this.responseText);
            update();
          }
        });
      } catch {}
      return origSend.apply(this, arguments);
    };
  }
}
installApiHookOnce._installed = false;

function uniqueByLabelKeepFirst(pairs) {
  const seen = new Set();
  const out = [];
  for (const p of pairs) {
    if (seen.has(p.label)) continue;
    seen.add(p.label);
    out.push(p);
  }
  return out;
}

function* iterTextElements(root = document.body) {
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  let n = walker.currentNode;
  while (n) {
    yield /** @type {Element} */ (n);
    n = walker.nextNode();
  }
}

function isVisibleElement(el) {
  if (!(el instanceof Element)) return false;
  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return false;
  const r = el.getBoundingClientRect();
  if (r.width <= 0 || r.height <= 0) return false;
  return true;
}

function elementCenter(el) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, rect: r };
}

function findLabelElements(label) {
  const want = label.trim();
  /** @type {Element[]} */
  const out = [];

  // いあきゃらのUIは span/div に分かれていることが多いので、候補タグを絞って探索
  const candidates = document.querySelectorAll("span, div, p, label, th, td");
  for (const el of candidates) {
    if (!isVisibleElement(el)) continue;
    const txt = (el.textContent || "").replace(/\s+/g, "").trim();
    if (!txt) continue;
    if (txt === want) out.push(el);
  }

  // 完全一致が少なすぎる時だけ緩める（例: "STR："のような表記）
  if (out.length === 0) {
    for (const el of candidates) {
      if (!isVisibleElement(el)) continue;
      const txt = (el.textContent || "").replace(/\s+/g, "").trim();
      if (!txt) continue;
      if (txt.startsWith(want)) out.push(el);
    }
  }

  return out.slice(0, 10);
}

function collectValueCandidates() {
  /** @type {{el: Element, kind: "input" | "text"}[]} */
  const out = [];

  // 入力欄（編集/閲覧どちらでも出る可能性が高い）
  const inputs = document.querySelectorAll("input");
  for (const el of inputs) {
    if (!isVisibleElement(el)) continue;
    const input = /** @type {HTMLInputElement} */ (el);
    const v = normalizeNumberText(input.value);
    if (v == null) continue;
    out.push({ el, kind: "input" });
  }

  // テキスト数値（閲覧表示など）
  const texts = document.querySelectorAll("span, div, p, td");
  for (const el of texts) {
    if (!isVisibleElement(el)) continue;
    const txt = (el.textContent || "").trim();
    if (!txt) continue;
    // 長文・技能表の数字列を避けるため短めだけ
    if (txt.length > 8) continue;
    const v = normalizeNumberText(txt);
    if (v == null) continue;
    out.push({ el, kind: "text" });
  }

  return out;
}

function collectValueCandidatesForMode(mode) {
  if (mode === "edit") {
    // 編集画面は input が正なので、input中心（誤爆しやすいテキスト数値は捨てる）
    /** @type {{el: Element, kind: "input" | "text"}[]} */
    const out = [];
    const inputs = document.querySelectorAll('input[type="number"], input[type="text"], input');
    for (const el of inputs) {
      if (!isVisibleElement(el)) continue;
      const input = /** @type {HTMLInputElement} */ (el);
      // 数値化できるものだけ
      const v = normalizeNumberText(input.value);
      if (v == null) continue;
      out.push({ el, kind: "input" });
    }
    return out;
  }

  if (mode === "view") {
    // 閲覧画面はテキスト表示が多い想定。inputも拾うが、優先度は row判定側で制御する。
    return collectValueCandidates();
  }

  return collectValueCandidates();
}

function extractValueFromCandidate(candidate) {
  if (candidate.kind === "input") {
    const input = /** @type {HTMLInputElement} */ (candidate.el);
    return normalizeNumberText(input.value);
  }
  return normalizeNumberText(candidate.el.textContent || "");
}

function rectsVerticallyOverlap(a, b, slackPx = 6) {
  const top = Math.max(a.top, b.top);
  const bottom = Math.min(a.bottom, b.bottom);
  return bottom - top >= -slackPx;
}

function findValueInSameRow(labelEl, valueCandidates) {
  const labelRect = labelEl.getBoundingClientRect();

  // まずは「同じ行の右側」を親コンテナ内から探す（誤って別ブロックの数字を拾うのを防ぐ）
  let cur = labelEl;
  for (let depth = 0; depth < 8 && cur; depth++) {
    const container = cur.parentElement;
    if (!container) break;

    /** @type {{dx: number, value: number} | null} */
    let best = null;

    for (const cand of valueCandidates) {
      if (!container.contains(cand.el)) continue;
      if (cand.el === labelEl) continue;
      if (labelEl.contains(cand.el)) continue;

      const v = extractValueFromCandidate(cand);
      if (v == null) continue;

      const r = cand.el.getBoundingClientRect();
      if (!rectsVerticallyOverlap(labelRect, r, 10)) continue;

      const dx = r.left - labelRect.right;
      // 右側の近傍だけに絞る（無制限にすると別の固定値を拾いがち）
      if (dx < -4) continue;
      if (dx > 320) continue;

      if (!best || dx < best.dx) best = { dx, value: v };
    }

    if (best) return best.value;
    cur = container;
  }

  return null;
}

function findNearestValueFromLabelEl(labelEl, valueCandidates) {
  const rowValue = findValueInSameRow(labelEl, valueCandidates);
  if (rowValue != null) return rowValue;

  const labelC = elementCenter(labelEl);

  /** @type {{dist: number, value: number, el: Element} | null} */
  let best = null;

  for (const cand of valueCandidates) {
    const candEl = cand.el;
    // label自身の数値誤検出を避ける
    if (candEl === labelEl) continue;
    if (labelEl.contains(candEl)) continue;

    const v = extractValueFromCandidate(cand);
    if (v == null) continue;

    const c = elementCenter(candEl);
    const dx = c.x - labelC.x;
    const dy = c.y - labelC.y;

    // まずは「右側＆ほぼ同じ高さ」を強く優先（いあきゃらは 左:ラベル / 右:値 が多い）
    const preferRight = dx >= -10;
    const preferSameRow = Math.abs(dy) <= 40;

    let dist = Math.hypot(dx, dy);
    if (!preferRight) dist += 500; // 左側にある数値は強くペナルティ
    if (!preferSameRow) dist += 150; // 別行っぽい数値もペナルティ
    // 遠すぎる候補は誤爆しがちなので避ける
    if (dist > 420) continue;

    if (!best || dist < best.dist) best = { dist, value: v, el: candEl };
  }

  return best ? best.value : null;
}

function collectStatusPairsForMode(mode) {
  /** @type {{label: string, value: number}[]} */
  const pairs = [];

  // 詳細（閲覧）画面はAPIレスポンスが取れればそれを優先（DOMより安定）
  if (mode === "view") {
    const apiPairs = maybeGetPairsFromCachedApi();
    if (apiPairs) return uniqueByLabelKeepFirst(apiPairs);
  }

  const valueCandidates = collectValueCandidatesForMode(mode);

  for (const label of TARGET_LABELS) {
    const labelEls = findLabelElements(label);
    for (const el of labelEls) {
      const v = findNearestValueFromLabelEl(el, valueCandidates);
      if (v == null) continue;
      pairs.push({ label, value: v });
      break; // そのラベルは最初に取れた1件だけでOK
    }
  }

  return uniqueByLabelKeepFirst(pairs);
}

function renderPanel(pairs) {
  const total = pairs.reduce((a, b) => a + (Number.isFinite(b.value) ? b.value : 0), 0);

  let root = document.getElementById(EXT_ROOT_ID);
  if (!root) {
    root = document.createElement("div");
    root.id = EXT_ROOT_ID;
    root.className = "iachara-status-sum-root";
    root.innerHTML = `
      <div class="iachara-status-sum-card">
        <div class="iachara-status-sum-header">
          <div class="iachara-status-sum-title">ステータス合計</div>
          <div class="iachara-status-sum-actions">
            <button type="button" class="iachara-status-sum-btn" data-action="refresh">更新</button>
            <button type="button" class="iachara-status-sum-btn iachara-status-sum-btn-toggle" data-action="toggle" aria-expanded="true">詳細</button>
          </div>
        </div>
        <div class="iachara-status-sum-body">
          <div class="iachara-status-sum-total">
            <div class="iachara-status-sum-total-label">合計</div>
            <div class="iachara-status-sum-total-value" data-field="total">-</div>
          </div>
          <ul class="iachara-status-sum-list" data-field="list"></ul>
          <div class="iachara-status-sum-hint" data-field="hint"></div>
        </div>
      </div>
    `;
    document.documentElement.appendChild(root);

    root.addEventListener("click", (e) => {
      const btn = /** @type {HTMLElement | null} */ (e.target instanceof HTMLElement ? e.target.closest("button") : null);
      const action = btn?.getAttribute("data-action");
      if (!action) return;

      if (action === "refresh") {
        update();
        return;
      }
      if (action === "toggle") {
        const list = root.querySelector('[data-field="list"]');
        if (!(list instanceof HTMLElement)) return;
        const isHidden = list.style.display === "none";
        list.style.display = isHidden ? "grid" : "none";
        if (btn instanceof HTMLButtonElement) btn.setAttribute("aria-expanded", isHidden ? "true" : "false");
        return;
      }
    });
  }

  const totalEl = root.querySelector('[data-field="total"]');
  if (totalEl) totalEl.textContent = Number.isFinite(total) ? String(total) : "-";

  const listEl = root.querySelector('[data-field="list"]');
  if (listEl) {
    listEl.innerHTML = pairs
      .map((p) => `<li class="iachara-status-sum-item"><span>${escapeHtml(p.label)}</span><span>${escapeHtml(String(p.value))}</span></li>`)
      .join("");
  }

  const hintEl = root.querySelector('[data-field="hint"]');
  if (hintEl) {
    const missing = TARGET_LABELS.filter((l) => !pairs.find((p) => p.label === l));
    const msg =
      pairs.length === 0
        ? "このページでステータスが見つかりませんでした（閲覧/編集画面を開いてから更新してください）。"
        : missing.length > 0
          ? `未検出: ${missing.join(", ")}`
          : "";
    hintEl.textContent = msg;
    // “OK” 表示をやめたので、空なら非表示
    hintEl.style.display = msg ? "block" : "none";
  }
}

function escapeHtml(s) {
  return (s ?? "").toString().replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return c;
    }
  });
}

let lastPairsJson = "";
function update() {
  const mode = getPageMode();
  const pairs = collectStatusPairsForMode(mode);
  const json = JSON.stringify({ mode, pairs });
  if (json === lastPairsJson) return;
  lastPairsJson = json;
  renderPanel(pairs);
}

function start() {
  if (!isIacharaPage()) return;
  installApiHookOnce();

  update();

  // Reactで後からDOMが変わるので監視して追従
  const mo = new MutationObserver(() => {
    // 連続更新を抑える
    window.clearTimeout(start._t);
    start._t = window.setTimeout(update, 250);
  });
  mo.observe(document.documentElement, { subtree: true, childList: true, characterData: true });
}
start._t = 0;

start();

