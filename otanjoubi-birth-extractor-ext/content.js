(() => {
  const BTN_ID = "otanjoubi-birth-extractor-copy-btn";
  const TOAST_ID = "otanjoubi-birth-extractor-toast";

  if (document.getElementById(BTN_ID)) return;

  function normalizeText(s) {
    return (s ?? "").replace(/\s+/g, " ").trim();
  }

  function sectionRootElements() {
    return Array.from(document.querySelectorAll(".ms-section .ms-tableCell")).filter(
      (cell) => cell.querySelector("h2")
    );
  }

  function extractByH2Title(wantedTitle) {
    const cells = sectionRootElements();
    const cell = cells.find(
      (c) => normalizeText(c.querySelector("h2")?.textContent) === wantedTitle
    );
    if (!cell) return null;

    const parts = [wantedTitle];

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

    const h3s = Array.from(cell.querySelectorAll("h3"));
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

  function ensureToast() {
    let el = document.getElementById(TOAST_ID);
    if (el) return el;
    el = document.createElement("div");
    el.id = TOAST_ID;
    el.style.position = "fixed";
    el.style.right = "16px";
    el.style.bottom = "68px";
    el.style.zIndex = "2147483647";
    el.style.maxWidth = "min(420px, calc(100vw - 32px))";
    el.style.padding = "10px 12px";
    el.style.borderRadius = "12px";
    el.style.background = "rgba(20,20,20,0.92)";
    el.style.color = "#fff";
    el.style.font = "13px/1.4 system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial";
    el.style.boxShadow = "0 10px 30px rgba(0,0,0,0.25)";
    el.style.whiteSpace = "pre-wrap";
    el.style.opacity = "0";
    el.style.transform = "translateY(6px)";
    el.style.transition = "opacity 160ms ease, transform 160ms ease";
    document.documentElement.appendChild(el);
    return el;
  }

  let toastTimer = null;
  function showToast(msg) {
    const el = ensureToast();
    el.textContent = msg;
    el.style.opacity = "1";
    el.style.transform = "translateY(0)";
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.style.opacity = "0";
      el.style.transform = "translateY(6px)";
    }, 2200);
  }

  async function fallbackCopy(text) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    ta.style.top = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return await fallbackCopy(text);
    }
  }

  const btn = document.createElement("button");
  btn.id = BTN_ID;
  btn.type = "button";
  btn.textContent = "誕生〇をコピー";
  btn.style.position = "fixed";
  btn.style.right = "16px";
  btn.style.bottom = "16px";
  btn.style.zIndex = "2147483647";
  btn.style.border = "0";
  btn.style.borderRadius = "999px";
  btn.style.padding = "12px 14px";
  btn.style.background = "#111";
  btn.style.color = "#fff";
  btn.style.cursor = "pointer";
  btn.style.font = "700 13px/1 system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial";
  btn.style.boxShadow = "0 10px 30px rgba(0,0,0,0.22)";
  btn.style.userSelect = "none";

  btn.addEventListener("mouseenter", () => {
    btn.style.transform = "translateY(-1px)";
  });
  btn.addEventListener("mouseleave", () => {
    btn.style.transform = "translateY(0)";
  });

  btn.addEventListener("click", async () => {
    btn.disabled = true;
    btn.style.opacity = "0.75";
    btn.style.cursor = "not-allowed";
    try {
      const text = extractAllWanted();
      if (!text) {
        showToast("抽出できませんでした（ページ構造が想定と違う可能性）。");
        return;
      }
      const ok = await copyText(text);
      showToast(ok ? "コピーしました。" : "コピーに失敗しました。");
    } catch (e) {
      showToast(String(e?.message || e));
    } finally {
      btn.disabled = false;
      btn.style.opacity = "1";
      btn.style.cursor = "pointer";
    }
  });

  document.documentElement.appendChild(btn);
})();

