(() => {
  const EXT_ROOT_ID = "daycode-whitelist-root";
  const STORAGE_PREFIX = "daycodeWhitelist";
  const STATUS_LABELS = ["全", "昼", "夜", "×", "－"];
  const USER_COL_OFFSET_NAMEROW = 5;
  const USER_COL_OFFSET_FILTERROW = 7;
  const USER_COL_OFFSET_DATAROW = 8;

  function isScheduleListPage() {
    return (
      location.pathname.includes("/schedule/list") &&
      document.querySelector("table.schedule_table") !== null
    );
  }

  function getSessionKey() {
    const fromInput = document.getElementById("key")?.value?.trim();
    if (fromInput) return fromInput;
    return new URLSearchParams(location.search).get("key") || "default";
  }

  function storageKey(sessionKey) {
    return `${STORAGE_PREFIX}:${sessionKey}`;
  }

  function isExtensionContextValid() {
    try {
      return Boolean(chrome?.runtime?.id);
    } catch {
      return false;
    }
  }

  function readLocalWhitelist(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  function writeLocalWhitelist(key, userIds) {
    try {
      localStorage.setItem(key, JSON.stringify(userIds));
      return true;
    } catch {
      return false;
    }
  }

  function loadWhitelist(sessionKey) {
    const key = storageKey(sessionKey);

    if (!isExtensionContextValid()) {
      return Promise.resolve(readLocalWhitelist(key));
    }

    return new Promise((resolve) => {
      try {
        chrome.storage.sync.get(key, (data) => {
          if (chrome.runtime.lastError) {
            resolve(readLocalWhitelist(key));
            return;
          }
          resolve(data[key] ?? readLocalWhitelist(key) ?? null);
        });
      } catch {
        resolve(readLocalWhitelist(key));
      }
    });
  }

  function saveWhitelist(sessionKey, userIds) {
    const key = storageKey(sessionKey);
    writeLocalWhitelist(key, userIds);

    if (!isExtensionContextValid()) {
      return Promise.resolve({ ok: false, invalidated: true });
    }

    return new Promise((resolve) => {
      try {
        chrome.storage.sync.set({ [key]: userIds }, () => {
          if (chrome.runtime.lastError) {
            const message = chrome.runtime.lastError.message || "";
            resolve({
              ok: false,
              invalidated: message.includes("Extension context invalidated"),
            });
            return;
          }
          resolve({ ok: true, invalidated: false });
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        resolve({
          ok: false,
          invalidated: message.includes("Extension context invalidated"),
        });
      }
    });
  }

  function showStorageNotice(root) {
    if (root.querySelector(".daycode-whitelist-notice")) return;

    const notice = document.createElement("p");
    notice.className = "daycode-whitelist-notice";
    notice.textContent =
      "拡張機能が更新されました。設定はこのページ内では保持されます。完全に反映するにはページを再読み込みしてください。";
    root.querySelector(".daycode-whitelist-body")?.prepend(notice);
  }

  function extractUserId(href) {
    if (!href) return null;
    try {
      const url = new URL(href, location.origin);
      return url.searchParams.get("userId");
    } catch {
      const match = href.match(/userId=([^&]+)/);
      return match ? match[1] : null;
    }
  }

  function startsWithDigit(name) {
    return /^[0-9０-９]/.test(name.normalize("NFKC"));
  }

  function sortUsersByDisplayOrder(users) {
    return [...users].sort((a, b) => {
      const aStartsWithDigit = startsWithDigit(a.name);
      const bStartsWithDigit = startsWithDigit(b.name);
      if (aStartsWithDigit !== bStartsWithDigit) {
        return aStartsWithDigit ? -1 : 1;
      }
      return a.name.localeCompare(b.name, "ja", { numeric: true, sensitivity: "base" });
    });
  }

  function normalizeSearchText(text) {
    return text.normalize("NFKC").toLowerCase();
  }

  function matchesSearch(name, query) {
    if (!query) return true;
    return normalizeSearchText(name).includes(normalizeSearchText(query));
  }

  function collectUsers() {
    const namerow = document.getElementById("namerow");
    if (!namerow) return [];

    const users = [];
    const headers = namerow.querySelectorAll("th");

    headers.forEach((th, index) => {
      if (index < USER_COL_OFFSET_NAMEROW) return;
      const link = th.querySelector("a.namelink");
      if (!link) return;
      const userId = extractUserId(link.getAttribute("href"));
      if (!userId) return;
      users.push({
        userId,
        name: link.textContent.trim(),
        userIndex: index - USER_COL_OFFSET_NAMEROW,
      });
    });

    return sortUsersByDisplayOrder(users);
  }

  function getColumnElements(userIndex) {
    const namerow = document.getElementById("namerow");
    const filterrow = document.getElementById("filterrow");
    const dataRows = document.querySelectorAll("table.schedule_table tbody tr[id^='row_']");

    const elements = [];
    const nameTh = namerow?.children[USER_COL_OFFSET_NAMEROW + userIndex];
    const filterTd = filterrow?.children[USER_COL_OFFSET_FILTERROW + userIndex];
    if (nameTh) elements.push(nameTh);
    if (filterTd) elements.push(filterTd);

    dataRows.forEach((row) => {
      const cell = row.children[USER_COL_OFFSET_DATAROW + userIndex];
      if (cell) elements.push(cell);
    });

    return elements;
  }

  function setColumnVisible(userIndex, visible) {
    getColumnElements(userIndex).forEach((el) => {
      el.classList.toggle("daycode-whitelist-hidden-col", !visible);
    });
  }

  function recalculateSummaryForRow(row, visibleUserIndices) {
    const counts = STATUS_LABELS.map(() => 0);

    visibleUserIndices.forEach((userIndex) => {
      const cell = row.children[USER_COL_OFFSET_DATAROW + userIndex];
      const tag = cell?.querySelector(".statustag");
      if (!tag) return;
      const text = tag.textContent.trim();
      const statusIndex = STATUS_LABELS.indexOf(text);
      if (statusIndex >= 0) counts[statusIndex] += 1;
    });

    for (let i = 0; i < STATUS_LABELS.length; i += 1) {
      const summaryCell = row.children[USER_COL_OFFSET_DATAROW - STATUS_LABELS.length + i];
      const choice = summaryCell?.querySelector(".choice");
      if (choice) choice.textContent = counts[i] > 0 ? String(counts[i]) : "";
    }

    const canDecide = counts.slice(1).every((count) => count === 0);
    const firstChoice = row.children[3]?.querySelector(".choice");
    if (firstChoice?.parentElement) {
      firstChoice.parentElement.classList.toggle("is-success", canDecide && counts[0] > 0);
    }
  }

  function recalculateSummaries(users, visibleUserIds) {
    const visibleUserIndices = users
      .filter((user) => visibleUserIds.has(user.userId))
      .map((user) => user.userIndex);

    document
      .querySelectorAll("table.schedule_table tbody tr[id^='row_']")
      .forEach((row) => recalculateSummaryForRow(row, visibleUserIndices));
  }

  function filterLinkDropdown(enabledUserIds) {
    const select = document.getElementById("linkdd");
    if (!select) return;

    select.querySelectorAll("option").forEach((option) => {
      if (!option.value) return;
      const userId = extractUserId(option.value);
      if (!userId) return;
      option.hidden = !enabledUserIds.has(userId);
      option.disabled = !enabledUserIds.has(userId);
    });
  }

  function applyWhitelist(users, enabledUserIds) {
    users.forEach((user) => {
      setColumnVisible(user.userIndex, enabledUserIds.has(user.userId));
    });
    recalculateSummaries(users, enabledUserIds);
    filterLinkDropdown(enabledUserIds);
  }

  function buildPanel(users, enabledUserIds, onApply) {
    const root = document.createElement("div");
    root.id = EXT_ROOT_ID;

    const checkedUserIds = new Set(enabledUserIds);

    const enabledCount = users.filter((user) => checkedUserIds.has(user.userId)).length;
    root.innerHTML = `
      <div class="daycode-whitelist-panel">
        <div class="daycode-whitelist-header">
          <span class="daycode-whitelist-title">参加者フィルター</span>
          <button type="button" class="daycode-whitelist-toggle" title="折りたたむ">−</button>
        </div>
        <div class="daycode-whitelist-body">
          <p class="daycode-whitelist-summary">表示中: ${enabledCount} / ${users.length} 人</p>
          <div class="daycode-whitelist-search-wrap">
            <input
              type="search"
              class="daycode-whitelist-search"
              placeholder="名前で検索..."
              autocomplete="off"
              spellcheck="false"
            />
          </div>
          <div class="daycode-whitelist-actions">
            <button type="button" data-action="select-all">表示中をすべて選択</button>
            <button type="button" data-action="clear-all">表示中をすべて解除</button>
          </div>
          <div class="daycode-whitelist-list-area">
            <div class="daycode-whitelist-list"></div>
            <p class="daycode-whitelist-empty" hidden>該当する参加者がいません</p>
          </div>
        </div>
      </div>
    `;

    const list = root.querySelector(".daycode-whitelist-list");
    const searchInput = root.querySelector(".daycode-whitelist-search");
    const emptyMessage = root.querySelector(".daycode-whitelist-empty");
    const summary = root.querySelector(".daycode-whitelist-summary");

    function getSearchQuery() {
      return searchInput.value.trim();
    }

    function getFilteredUsers() {
      const query = getSearchQuery();
      if (!query) return users;
      return users.filter((user) => matchesSearch(user.name, query));
    }

    function renderUserList() {
      const filteredUsers = getFilteredUsers();

      list.replaceChildren();

      filteredUsers.forEach((user) => {
        const label = document.createElement("label");
        label.className = "daycode-whitelist-item";
        label.dataset.userId = user.userId;

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = user.userId;
        checkbox.checked = checkedUserIds.has(user.userId);

        const nameSpan = document.createElement("span");
        nameSpan.className = "daycode-whitelist-item-label";
        nameSpan.textContent = user.name;

        label.appendChild(checkbox);
        label.appendChild(nameSpan);
        list.appendChild(label);
      });

      emptyMessage.hidden = filteredUsers.length > 0;
      updateSummary();
    }

    function updateSummary() {
      const query = getSearchQuery();
      const filteredCount = getFilteredUsers().length;
      const tableVisibleCount = users.filter((user) => checkedUserIds.has(user.userId)).length;

      if (query) {
        summary.textContent = `表: ${tableVisibleCount} 人 / リスト: ${filteredCount} 件（全体 ${users.length} 人）`;
        return;
      }
      summary.textContent = `表示中: ${tableVisibleCount} / ${users.length} 人`;
    }

    function syncTable() {
      applyWhitelist(users, checkedUserIds);
      updateSummary();
    }

    function persistSelection() {
      void onApply(new Set(checkedUserIds));
    }

    renderUserList();

    root.querySelector(".daycode-whitelist-toggle").addEventListener("click", () => {
      root.classList.toggle("daycode-whitelist-root--collapsed");
      root.querySelector(".daycode-whitelist-toggle").textContent = root.classList.contains(
        "daycode-whitelist-root--collapsed"
      )
        ? "▢"
        : "−";
    });

    searchInput.addEventListener("input", () => {
      renderUserList();
    });

    searchInput.addEventListener("search", () => {
      renderUserList();
    });

    root.querySelector("[data-action='select-all']").addEventListener("click", () => {
      getFilteredUsers().forEach((user) => checkedUserIds.add(user.userId));
      renderUserList();
      syncTable();
      persistSelection();
    });

    root.querySelector("[data-action='clear-all']").addEventListener("click", () => {
      getFilteredUsers().forEach((user) => checkedUserIds.delete(user.userId));
      renderUserList();
      syncTable();
      persistSelection();
    });

    list.addEventListener("change", (event) => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement) || input.type !== "checkbox") return;

      if (input.checked) {
        checkedUserIds.add(input.value);
      } else {
        checkedUserIds.delete(input.value);
      }
      syncTable();
      persistSelection();
    });

    return root;
  }

  async function init() {
    if (!isScheduleListPage()) return;
    if (document.getElementById(EXT_ROOT_ID)) return;

    const users = collectUsers();
    if (users.length === 0) return;

    const sessionKey = getSessionKey();
    const saved = await loadWhitelist(sessionKey);
    const validUserIds = new Set(users.map((user) => user.userId));
    const enabledUserIds =
      saved === null
        ? new Set(users.map((user) => user.userId))
        : new Set(saved.filter((id) => validUserIds.has(id)));

    applyWhitelist(users, enabledUserIds);

    const panel = buildPanel(users, enabledUserIds, async (nextEnabledUserIds) => {
      applyWhitelist(users, nextEnabledUserIds);
      const result = await saveWhitelist(sessionKey, [...nextEnabledUserIds]);
      if (!result.ok && result.invalidated) {
        showStorageNotice(panel);
      }
    });

    document.body.appendChild(panel);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
