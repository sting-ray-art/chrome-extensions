const copyBtn = document.getElementById("copy");
const statusEl = document.getElementById("status");
const previewEl = document.getElementById("preview");

function setStatus(msg) {
  statusEl.textContent = msg;
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error("アクティブタブが見つかりません。");
  return tab;
}

async function extractTextFromTab(tabId) {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    files: ["extract.js"]
  });
  const text = results?.[0]?.result;
  if (!text || typeof text !== "string") {
    throw new Error("抽出に失敗しました（ページ構造が想定と違う可能性）。");
  }
  return text;
}

async function copyToClipboard(text) {
  await navigator.clipboard.writeText(text);
}

copyBtn.addEventListener("click", async () => {
  copyBtn.disabled = true;
  setStatus("抽出中…");
  previewEl.value = "";

  try {
    const tab = await getActiveTab();
    if (!/^https:\/\/otanjoubi\.jp\//.test(tab.url || "")) {
      throw new Error("対象ページ（otanjoubi.jp）を開いたタブで実行してください。");
    }

    const text = await extractTextFromTab(tab.id);
    previewEl.value = text;

    try {
      await copyToClipboard(text);
      setStatus("コピーしました。");
    } catch (e) {
      setStatus(
        "抽出はできましたがコピーに失敗しました。テキストエリアから手動コピーしてください。\n" +
          String(e?.message || e)
      );
    }
  } catch (e) {
    setStatus(String(e?.message || e));
  } finally {
    copyBtn.disabled = false;
  }
});

