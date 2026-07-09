const storageKey = "goal-task-journal-v2";
const syncMetaKey = "goal-task-journal-sync-meta-v1";
const supabaseSessionKey = "goal-task-journal-supabase-session-v1";

const gradeOrder = ["S", "A", "B", "C", "F"];
const gradeLabels = {
  S: "必要最低限をすべて完了し、獲得重みが10を超えた日",
  A: "必要最低限を完了し、プラスアルファも大きく進んだ日",
  B: "必要最低限に加えて、プラスアルファにも取り組めた日",
  C: "必要最低限のタスクを完了した日",
  F: "必要最低限のタスクが完了していない日",
};

const initialState = {
  goal: "",
  goals: [],
  entries: {},
  healthByDate: {},
};

const today = new Date();
const todayString = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
  .toISOString()
  .slice(0, 10);

const els = {
  entryDate: document.querySelector("#entryDate"),
  todayView: document.querySelector("#todayView"),
  recordsView: document.querySelector("#recordsView"),
  todayViewButton: document.querySelector("#todayViewButton"),
  recordsViewButton: document.querySelector("#recordsViewButton"),
  stepsChart: document.querySelector("#stepsChart"),
  sleepChart: document.querySelector("#sleepChart"),
  workoutChart: document.querySelector("#workoutChart"),
  screenChart: document.querySelector("#screenChart"),
  goalForm: document.querySelector("#goalForm"),
  goalInput: document.querySelector("#goalInput"),
  goalDeadline: document.querySelector("#goalDeadline"),
  goalList: document.querySelector("#goalList"),
  goalStatus: document.querySelector("#goalStatus"),
  suggestTasks: document.querySelector("#suggestTasks"),
  suggestWeight: document.querySelector("#suggestWeight"),
  aiStatus: document.querySelector("#aiStatus"),
  aiSuggestions: document.querySelector("#aiSuggestions"),
  evaluateDay: document.querySelector("#evaluateDay"),
  generateDiary: document.querySelector("#generateDiary"),
  aiGradeStatus: document.querySelector("#aiGradeStatus"),
  aiGradeResult: document.querySelector("#aiGradeResult"),
  taskForm: document.querySelector("#taskForm"),
  taskTitle: document.querySelector("#taskTitle"),
  taskWeight: document.querySelector("#taskWeight"),
  taskMinimum: document.querySelector("#taskMinimum"),
  minimumTasks: document.querySelector("#minimumTasks"),
  extraTasks: document.querySelector("#extraTasks"),
  minimumCount: document.querySelector("#minimumCount"),
  extraCount: document.querySelector("#extraCount"),
  healthFile: document.querySelector("#healthFile"),
  healthSummary: document.querySelector("#healthSummary"),
  healthTodayChart: document.querySelector("#healthTodayChart"),
  healthStatus: document.querySelector("#healthStatus"),
  screenFile: document.querySelector("#screenFile"),
  screenShotFile: document.querySelector("#screenShotFile"),
  screenSummary: document.querySelector("#screenSummary"),
  screenCategoryChart: document.querySelector("#screenCategoryChart"),
  screenAppChart: document.querySelector("#screenAppChart"),
  screenStatus: document.querySelector("#screenStatus"),
  completionRate: document.querySelector("#completionRate"),
  weightScore: document.querySelector("#weightScore"),
  suggestedGrade: document.querySelector("#suggestedGrade"),
  workTime: document.querySelector("#workTime"),
  gradeButtons: document.querySelector("#gradeButtons"),
  entryPlace: document.querySelector("#entryPlace"),
  entryContext: document.querySelector("#entryContext"),
  reflection: document.querySelector("#reflection"),
  saveEntry: document.querySelector("#saveEntry"),
  clearAll: document.querySelector("#clearAll"),
  historyList: document.querySelector("#historyList"),
  taskTemplate: document.querySelector("#taskTemplate"),
};

let state = loadState();
let lastSavedStateText = JSON.stringify(state);
let syncMeta = loadSyncMeta();
let currentGrade = "F";
let currentView = "today";
let timerTick = null;
let syncTimer = null;
let syncPullTimer = null;
let isApplyingRemoteState = false;
let syncPanel = null;

function getSupabaseConfig() {
  const config = window.GTJ_SUPABASE || {};
  const url = String(config.url || "").replace(/\/+$/, "");
  const anonKey = String(config.anonKey || "");
  return url && anonKey ? { url, anonKey } : null;
}

function getAiProxyBaseUrl() {
  const url = String(window.GTJ_AI_PROXY_URL || "").replace(/\/+$/, "");
  return url;
}

function usesSupabaseSync() {
  return Boolean(getSupabaseConfig());
}

function loadSyncMeta() {
  try {
    return {
      localUpdatedAt: "",
      remoteUpdatedAt: "",
      ...(JSON.parse(localStorage.getItem(syncMetaKey) || "{}") || {}),
    };
  } catch {
    return { localUpdatedAt: "", remoteUpdatedAt: "" };
  }
}

function saveSyncMeta() {
  localStorage.setItem(syncMetaKey, JSON.stringify(syncMeta));
}

function cloneInitialState() {
  return JSON.parse(JSON.stringify(initialState));
}

function loadState() {
  try {
    const raw = localStorage.getItem(storageKey);
    const loaded = raw ? { ...cloneInitialState(), ...JSON.parse(raw) } : cloneInitialState();
    loaded.goals = Array.isArray(loaded.goals) ? loaded.goals : [];
    loaded.entries = loaded.entries && typeof loaded.entries === "object" ? loaded.entries : {};
    loaded.healthByDate =
      loaded.healthByDate && typeof loaded.healthByDate === "object" ? loaded.healthByDate : {};

    if (!loaded.goals.length && loaded.goal) {
      loaded.goals = [
        {
          id: crypto.randomUUID(),
          title: loaded.goal,
          deadline: todayString,
          createdAt: new Date().toISOString(),
        },
      ];
      loaded.goal = "";
    }
    return loaded;
  } catch {
    return cloneInitialState();
  }
}

function saveState() {
  const text = JSON.stringify(state);
  localStorage.setItem(storageKey, text);
  if (!isApplyingRemoteState && text !== lastSavedStateText) {
    syncMeta.localUpdatedAt = new Date().toISOString();
    saveSyncMeta();
    scheduleSyncPush();
  }
  lastSavedStateText = text;
}

async function apiJson(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "サーバーに接続できませんでした。");
  return data;
}

function getSupabaseSession() {
  try {
    const session = JSON.parse(localStorage.getItem(supabaseSessionKey) || "null");
    return session?.access_token ? session : null;
  } catch {
    return null;
  }
}

function saveSupabaseSession(session) {
  localStorage.setItem(supabaseSessionKey, JSON.stringify(session));
}

async function supabaseRequest(path, options = {}) {
  const config = getSupabaseConfig();
  if (!config) throw new Error("Supabase設定がありません。");
  const session = getSupabaseSession();
  const response = await fetch(`${config.url}${path}`, {
    ...options,
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${session?.access_token || config.anonKey}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    if (response.status === 401) localStorage.removeItem(supabaseSessionKey);
    throw new Error(data?.msg || data?.message || data?.error_description || "Supabaseに接続できませんでした。");
  }
  return data;
}

async function supabaseLogin(email, password) {
  const config = getSupabaseConfig();
  const response = await fetch(`${config.url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: config.anonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error_description || data.msg || data.message || "ログインできませんでした。");
  saveSupabaseSession(data);
  return data;
}

async function supabaseCurrentUser() {
  const session = getSupabaseSession();
  if (!session) return null;
  const user = await supabaseRequest("/auth/v1/user");
  return user?.id ? user : null;
}

async function supabaseGetState() {
  const user = await supabaseCurrentUser();
  if (!user) throw new Error("ログインが必要です。");
  const rows = await supabaseRequest(
    `/rest/v1/journal_states?select=state,updated_at&user_id=eq.${encodeURIComponent(user.id)}&limit=1`
  );
  const row = Array.isArray(rows) ? rows[0] : null;
  return row ? { state: row.state, updatedAt: row.updated_at } : { state: null, updatedAt: "" };
}

async function supabasePutState(nextState) {
  const user = await supabaseCurrentUser();
  if (!user) throw new Error("ログインが必要です。");
  const now = new Date().toISOString();
  const rows = await supabaseRequest("/rest/v1/journal_states?on_conflict=user_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({
      user_id: user.id,
      state: nextState,
      updated_at: now,
    }),
  });
  const row = Array.isArray(rows) ? rows[0] : null;
  return { state: row?.state || nextState, updatedAt: row?.updated_at || now, version: 1 };
}

function createSyncPanel() {
  const panel = document.createElement("section");
  panel.className = "sync-panel";
  panel.innerHTML = `
    <div>
      <h2>同期</h2>
      <p id="syncStatus" class="panel-note">同期状態を確認中...</p>
    </div>
    <form id="syncLoginForm" class="sync-login" hidden>
      <input id="syncEmail" type="email" autocomplete="email" placeholder="メールアドレス" hidden>
      <input id="syncPassword" type="password" autocomplete="current-password" placeholder="同期パスワード" required>
      <button type="submit" class="primary">ログイン</button>
    </form>
    <button id="syncNow" type="button" class="ghost" hidden>今すぐ同期</button>
  `;
  document.querySelector(".topbar").after(panel);

  panel.querySelector("#syncLoginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = panel.querySelector("#syncEmail").value;
    const password = panel.querySelector("#syncPassword").value;
    setSyncStatus("ログイン中...");
    try {
      if (usesSupabaseSync()) {
        await supabaseLogin(email, password);
      } else {
        await apiJson("/api/session", {
          method: "POST",
          body: JSON.stringify({ password }),
        });
      }
      panel.querySelector("#syncPassword").value = "";
      await initializeSync();
    } catch (error) {
      setSyncStatus(error.message, true);
    }
  });

  panel.querySelector("#syncNow").addEventListener("click", async () => {
    setSyncStatus("同期中...");
    try {
      await pullRemoteState();
      await pushRemoteState();
      setSyncStatus("同期済み");
    } catch (error) {
      setSyncStatus(error.message, true);
    }
  });

  return panel;
}

function setSyncStatus(message, isError = false) {
  if (!syncPanel) return;
  const status = syncPanel.querySelector("#syncStatus");
  status.textContent = message;
  status.style.color = isError ? "var(--danger)" : "";
}

function setLoginVisible(visible) {
  if (!syncPanel) return;
  const email = syncPanel.querySelector("#syncEmail");
  email.hidden = !usesSupabaseSync();
  email.required = usesSupabaseSync();
  syncPanel.querySelector("#syncPassword").placeholder = usesSupabaseSync() ? "パスワード" : "同期パスワード";
  syncPanel.querySelector("#syncLoginForm").hidden = !visible;
  syncPanel.querySelector("#syncNow").hidden = visible;
}

function scheduleSyncPush() {
  if (location.protocol === "file:") return;
  window.clearTimeout(syncTimer);
  syncTimer = window.setTimeout(() => {
    pushRemoteState().catch((error) => setSyncStatus(error.message, true));
  }, 900);
}

async function initializeSync() {
  if (!usesSupabaseSync() && location.protocol !== "file:") {
    setSyncStatus("cloud-config.jsにSupabaseのURLとanon keyを設定してください。", true);
    setLoginVisible(false);
    return;
  }

  if (!usesSupabaseSync() && location.protocol === "file:") {
    setSyncStatus("同期するには公開URLから開いてください。", true);
    setLoginVisible(false);
    return;
  }

  try {
    if (usesSupabaseSync()) {
      if (!(await supabaseCurrentUser())) {
        setLoginVisible(true);
        setSyncStatus("メールとパスワードでログインすると無料同期できます。");
        return;
      }
      setLoginVisible(false);
      await pullRemoteState();
      await pushRemoteState();
      setSyncStatus("同期済み");
      window.clearInterval(syncPullTimer);
      syncPullTimer = window.setInterval(() => {
        pullRemoteState().catch(() => {});
      }, 20000);
      return;
    }

    const session = await apiJson("/api/session");
    if (session.authRequired && !session.authenticated) {
      setLoginVisible(true);
      setSyncStatus("ログインするとスマホとパソコンで同期できます。");
      return;
    }
    setLoginVisible(false);
    await pullRemoteState();
    await pushRemoteState();
    setSyncStatus("同期済み");
    window.clearInterval(syncPullTimer);
    syncPullTimer = window.setInterval(() => {
      pullRemoteState().catch(() => {});
    }, 20000);
  } catch (error) {
    setSyncStatus(error.message || "同期サーバーに接続できません。", true);
    setLoginVisible(false);
  }
}

function hasLocalData() {
  return Boolean(
    (state.goals || []).length ||
      Object.keys(state.entries || {}).length ||
      Object.keys(state.healthByDate || {}).length ||
      state.goal
  );
}

async function pullRemoteState() {
  const remote = usesSupabaseSync() ? await supabaseGetState() : await apiJson("/api/sync");
  if (!remote.state) return;
  const remoteTime = Date.parse(remote.updatedAt || "");
  const localTime = Date.parse(syncMeta.localUpdatedAt || "");
  if (Number.isFinite(remoteTime) && (!Number.isFinite(localTime) || remoteTime > localTime)) {
    isApplyingRemoteState = true;
    state = { ...cloneInitialState(), ...remote.state };
    localStorage.setItem(storageKey, JSON.stringify(state));
    lastSavedStateText = JSON.stringify(state);
    syncMeta.remoteUpdatedAt = remote.updatedAt || "";
    syncMeta.localUpdatedAt = remote.updatedAt || syncMeta.localUpdatedAt;
    saveSyncMeta();
    render();
    isApplyingRemoteState = false;
    setSyncStatus("別の端末の変更を取り込みました。");
  }
}

async function pushRemoteState() {
  if (!usesSupabaseSync() && location.protocol === "file:") return;
  if (!hasLocalData()) return;
  const result = usesSupabaseSync()
    ? await supabasePutState(state)
    : await apiJson("/api/sync", {
        method: "PUT",
        body: JSON.stringify({ state }),
      });
  syncMeta.remoteUpdatedAt = result.updatedAt || new Date().toISOString();
  syncMeta.localUpdatedAt = syncMeta.remoteUpdatedAt;
  saveSyncMeta();
  setSyncStatus("同期済み");
}

function setView(view) {
  currentView = view === "records" ? "records" : "today";
  els.todayView.classList.toggle("active", currentView === "today");
  els.recordsView.classList.toggle("active", currentView === "records");
  els.todayViewButton.classList.toggle("active", currentView === "today");
  els.recordsViewButton.classList.toggle("active", currentView === "records");
}

function getAiBaseUrl() {
  const proxyUrl = getAiProxyBaseUrl();
  if (proxyUrl) return proxyUrl;
  if (location.protocol === "file:") return "http://127.0.0.1:8787";
  return "";
}

function getEntry(date = els.entryDate.value) {
  if (!state.entries[date]) {
    state.entries[date] = {
      tasks: [],
      grade: "F",
      place: "",
      context: "",
      health: null,
      screenTime: null,
      reflection: "",
      aiGradeReason: "",
      savedAt: "",
    };
  }
  const entry = state.entries[date];
  entry.tasks = Array.isArray(entry.tasks) ? entry.tasks : [];
  return entry;
}

function pruneGoals() {
  state.goals = (state.goals || []).filter((goal) => !goal.deadline || goal.deadline >= todayString);
}

function getActiveGoalText() {
  pruneGoals();
  return (state.goals || []).map((goal) => `${goal.title}（期限: ${goal.deadline || "未設定"}）`).join("\n");
}

function getHealthForDate(date = els.entryDate.value) {
  const entry = getEntry(date);
  return entry.health || state.healthByDate?.[date] || null;
}

function render() {
  const entry = getEntry();
  pruneGoals();
  els.goalStatus.textContent = state.goals.length ? `${state.goals.length}件` : "未設定";
  els.entryPlace.value = entry.place || "";
  els.entryContext.value = entry.context || "";
  els.reflection.value = entry.reflection || "";
  renderAiGradeResult(entry);
  currentGrade = entry.grade || suggestGrade(entry.tasks);

  renderGradeButtons();
  renderGoals();
  renderTasks(entry.tasks);
  renderSummary(entry.tasks);
  renderHealth(getHealthForDate());
  renderScreenTime(entry.screenTime);
  renderHistory();
  renderCharts();
  syncTimerTick();
  saveState();
}

function renderGoals() {
  els.goalList.innerHTML = "";
  (state.goals || []).forEach((goal) => {
    const item = document.createElement("li");
    item.className = "goal-item";
    item.innerHTML = `
      <div class="goal-main">
        <strong>${escapeHtml(goal.title)}</strong>
        <span>期限 ${escapeHtml(goal.deadline || "未設定")}</span>
      </div>
      <button type="button" class="ghost">達成</button>
      <button type="button" class="icon-button" aria-label="削除">×</button>
    `;
    item.querySelector(".ghost").addEventListener("click", () => removeGoal(goal.id));
    item.querySelector(".icon-button").addEventListener("click", () => removeGoal(goal.id));
    els.goalList.append(item);
  });
}

function removeGoal(id) {
  state.goals = state.goals.filter((goal) => goal.id !== id);
  render();
}

function renderTasks(tasks) {
  els.minimumTasks.innerHTML = "";
  els.extraTasks.innerHTML = "";

  const minimum = tasks.filter((task) => task.minimum);
  const extra = tasks.filter((task) => !task.minimum);
  els.minimumCount.textContent = String(minimum.length);
  els.extraCount.textContent = String(extra.length);

  tasks.forEach((task) => {
    const node = els.taskTemplate.content.firstElementChild.cloneNode(true);
    const checkbox = node.querySelector("input");
    const name = node.querySelector(".task-name");
    const weight = node.querySelector(".weight-badge");
    const timerTime = node.querySelector(".timer-time");
    const timerButton = node.querySelector(".timer-button");
    const remove = node.querySelector(".icon-button");
    const isRunning = Boolean(task.timerStartedAt);

    node.classList.toggle("done", Boolean(task.done));
    node.classList.toggle("running", isRunning);
    checkbox.checked = Boolean(task.done);
    name.textContent = task.title;
    weight.textContent = `重み ${task.weight}`;
    timerTime.textContent = formatTimer(getTaskElapsedSeconds(task));
    timerButton.textContent = isRunning ? "停止" : "開始";
    timerButton.setAttribute("aria-label", `${task.title}のタイマーを${isRunning ? "停止" : "開始"}`);

    checkbox.addEventListener("change", () => {
      if (checkbox.checked) stopTaskTimer(task);
      task.done = checkbox.checked;
      getEntry().grade = suggestGrade(getEntry().tasks);
      render();
    });

    timerButton.addEventListener("click", () => {
      toggleTaskTimer(task);
      render();
    });

    remove.addEventListener("click", () => {
      const entry = getEntry();
      entry.tasks = entry.tasks.filter((item) => item.id !== task.id);
      entry.grade = suggestGrade(entry.tasks);
      render();
    });

    (task.minimum ? els.minimumTasks : els.extraTasks).append(node);
  });
}

function renderSummary(tasks) {
  const totalWeight = tasks.reduce((sum, task) => sum + Number(task.weight || 0), 0);
  const doneWeight = tasks
    .filter((task) => task.done)
    .reduce((sum, task) => sum + Number(task.weight || 0), 0);
  const rate = totalWeight ? Math.round((doneWeight / totalWeight) * 100) : 0;
  const suggested = suggestGrade(tasks);

  els.completionRate.textContent = `${rate}%`;
  els.weightScore.textContent = `${doneWeight} / ${totalWeight}`;
  els.suggestedGrade.textContent = suggested;
  els.workTime.textContent = formatMinutes(Math.floor(getTasksElapsedSeconds(tasks) / 60));
}

function renderHealth(health) {
  els.healthSummary.innerHTML = "";
  if (!health) {
    drawInlineBarChart(els.healthTodayChart, [], {
      color: "#0f766e",
      emptyText: "ヘルスケア情報なし",
    });
    return;
  }

  const metrics = [["歩数", `${Number(health.steps || 0).toLocaleString()}歩`]];
  if (health.sleepMinutes != null) metrics.push(["睡眠", formatMinutes(health.sleepMinutes || 0)]);
  if (health.workoutMinutes != null) metrics.push(["ワークアウト", formatMinutes(health.workoutMinutes || 0)]);
  if (health.activeEnergy != null) {
    metrics.push(["消費エネルギー", `${Math.round(health.activeEnergy || 0).toLocaleString()}kcal`]);
  }

  metrics.forEach(([label, value]) => appendMetric(els.healthSummary, label, value));

  const chartRows = [
    { label: "歩数", value: Number(health.steps || 0) / 8000, display: `${Number(health.steps || 0).toLocaleString()}歩` },
  ];
  if (health.sleepMinutes != null) {
    chartRows.push({
      label: "睡眠",
      value: Number(health.sleepMinutes || 0) / 420,
      display: `${(Number(health.sleepMinutes || 0) / 60).toFixed(1)}h`,
    });
  }
  if (health.workoutMinutes != null) {
    chartRows.push({
      label: "運動",
      value: Number(health.workoutMinutes || 0) / 30,
      display: `${Math.round(health.workoutMinutes || 0)}分`,
    });
  }
  if (health.activeEnergy != null) {
    chartRows.push({
      label: "消費",
      value: Number(health.activeEnergy || 0) / 500,
      display: `${Math.round(health.activeEnergy || 0).toLocaleString()}kcal`,
    });
  }

  drawInlineBarChart(
    els.healthTodayChart,
    chartRows,
    { color: "#0f766e" }
  );
}

function renderScreenTime(screenTime) {
  els.screenSummary.innerHTML = "";
  if (!screenTime) {
    drawInlineBarChart(els.screenCategoryChart, [], {
      color: "#7c3aed",
      emptyText: "スクリーンタイムなし",
    });
    drawInlineBarChart(els.screenAppChart, [], {
      color: "#2563eb",
      emptyText: "スクリーンタイムなし",
    });
    return;
  }

  const topApps = (screenTime.apps || [])
    .slice(0, 3)
    .map((app) => `${app.name} ${formatMinutes(app.minutes)}`)
    .join(" / ");
  const metrics = [
    ["合計", formatMinutes(screenTime.totalMinutes || 0)],
    ["アプリ数", `${(screenTime.apps || []).length}`],
    ["最多", screenTime.apps?.[0] ? `${screenTime.apps[0].name}` : "-"],
    ["上位", topApps || "-"],
  ];

  metrics.forEach(([label, value]) => appendMetric(els.screenSummary, label, value));

  drawInlineBarChart(
    els.screenCategoryChart,
    (screenTime.categories || []).slice(0, 6).map((category) => ({
      label: category.name,
      value: Number(category.minutes || 0),
      display: formatMinutes(category.minutes || 0),
    })),
    { color: "#7c3aed", emptyText: "カテゴリなし" }
  );
  drawInlineBarChart(
    els.screenAppChart,
    (screenTime.apps || []).slice(0, 6).map((app) => ({
      label: app.name,
      value: Number(app.minutes || 0),
      display: formatMinutes(app.minutes || 0),
    })),
    { color: "#2563eb", emptyText: "アプリなし" }
  );
}

function appendMetric(parent, label, value) {
  const item = document.createElement("div");
  item.className = "health-metric";
  item.innerHTML = `<span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong>`;
  parent.append(item);
}

function formatMinutes(minutes) {
  const rounded = Math.round(Number(minutes) || 0);
  const hours = Math.floor(rounded / 60);
  const rest = rounded % 60;
  if (hours > 0) return `${hours}時間${rest}分`;
  return `${rest}分`;
}

function formatTimer(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = total % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

function getTaskElapsedSeconds(task) {
  const stored = Number(task.elapsedSeconds || 0);
  if (!task.timerStartedAt) return stored;

  const startedAt = Date.parse(task.timerStartedAt);
  if (Number.isNaN(startedAt)) return stored;
  return stored + Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
}

function getTasksElapsedSeconds(tasks) {
  return tasks.reduce((sum, task) => sum + getTaskElapsedSeconds(task), 0);
}

function stopTaskTimer(task) {
  if (!task.timerStartedAt) return;
  task.elapsedSeconds = getTaskElapsedSeconds(task);
  task.timerStartedAt = "";
}

function stopAllRunningTimers(exceptTask = null) {
  Object.values(state.entries || {}).forEach((entry) => {
    (entry.tasks || []).forEach((task) => {
      if (task !== exceptTask) stopTaskTimer(task);
    });
  });
}

function toggleTaskTimer(task) {
  if (task.timerStartedAt) {
    stopTaskTimer(task);
    return;
  }

  stopAllRunningTimers(task);
  task.timerStartedAt = new Date().toISOString();
}

function hasRunningTimer() {
  return Object.values(state.entries || {}).some((entry) =>
    (entry.tasks || []).some((task) => Boolean(task.timerStartedAt))
  );
}

function syncTimerTick() {
  if (hasRunningTimer()) {
    if (!timerTick) timerTick = window.setInterval(render, 1000);
    return;
  }

  if (timerTick) {
    window.clearInterval(timerTick);
    timerTick = null;
  }
}

function addTask(task) {
  const title = String(task.title || "").trim();
  if (!title) return;

  const entry = getEntry();
  entry.tasks.push({
    id: crypto.randomUUID(),
    title,
    weight: Math.min(5, Math.max(1, Number(task.weight) || 1)),
    minimum: Boolean(task.minimum),
    done: false,
    elapsedSeconds: 0,
    timerStartedAt: "",
  });
  entry.grade = suggestGrade(entry.tasks);
  render();
}

function suggestGrade(tasks) {
  if (!tasks.length) return "F";

  const minimum = tasks.filter((task) => task.minimum);
  const extra = tasks.filter((task) => !task.minimum);
  const minimumDone = minimum.length > 0 && minimum.every((task) => task.done);
  const extraDoneCount = extra.filter((task) => task.done).length;
  const doneWeight = tasks
    .filter((task) => task.done)
    .reduce((sum, task) => sum + Number(task.weight || 0), 0);

  if (minimumDone && doneWeight > 10) return "S";
  if (minimumDone && extra.length > 0 && extraDoneCount / extra.length >= 0.7) return "A";
  if (minimumDone && extraDoneCount > 0) return "B";
  if (minimumDone) return "C";
  return "F";
}

function renderGradeButtons() {
  els.gradeButtons.querySelectorAll(".grade").forEach((button) => {
    const active = button.dataset.grade === currentGrade;
    button.classList.toggle("active", active);
    button.setAttribute("aria-checked", String(active));
    button.title = gradeLabels[button.dataset.grade];
    button.setAttribute("aria-label", `${button.dataset.grade}: ${gradeLabels[button.dataset.grade]}`);
  });
}

function renderHistory() {
  const entries = Object.entries(state.entries)
    .filter(
      ([date, entry]) =>
        entry.savedAt ||
        entry.tasks?.length ||
        entry.reflection ||
        entry.place ||
        entry.context ||
        entry.health ||
        state.healthByDate?.[date] ||
        entry.screenTime
    )
    .sort(([a], [b]) => b.localeCompare(a));

  els.historyList.innerHTML = "";

  if (!entries.length) {
    els.historyList.innerHTML = '<p class="empty">まだ記録がありません。</p>';
    return;
  }

  entries.forEach(([date, entry]) => {
    const tasks = entry.tasks || [];
    const done = tasks.filter((task) => task.done).length;
    const health = entry.health || state.healthByDate?.[date] || null;
    const meta = [
      entry.place ? `場所: ${entry.place}` : "",
      entry.context ? `状況: ${entry.context}` : "",
      getTasksElapsedSeconds(tasks) ? `作業: ${formatMinutes(Math.floor(getTasksElapsedSeconds(tasks) / 60))}` : "",
      health ? `歩数: ${Number(health.steps || 0).toLocaleString()}歩` : "",
      health ? `睡眠: ${formatMinutes(health.sleepMinutes || 0)}` : "",
      entry.screenTime ? `画面: ${formatMinutes(entry.screenTime.totalMinutes || 0)}` : "",
    ].filter(Boolean);
    const card = document.createElement("article");
    card.className = "history-card";
    card.innerHTML = `
      <div class="history-top">
        <strong>${escapeHtml(date)}</strong>
        <span class="history-grade">${escapeHtml(entry.grade || "F")}</span>
      </div>
      <p>${done} / ${tasks.length} タスク完了</p>
      ${
        meta.length
          ? `<div class="history-meta">${meta.map((item) => `<span class="meta-chip">${escapeHtml(item)}</span>`).join("")}</div>`
          : ""
      }
      ${entry.reflection ? `<p>${escapeHtml(entry.reflection)}</p>` : ""}
    `;
    els.historyList.append(card);
  });
}

function getChartEntries() {
  return Object.entries(state.entries)
    .filter(([, entry]) => entry.health || entry.screenTime || state.healthByDate?.[entry.date])
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14)
    .map(([date, entry]) => ({ date, entry: { ...entry, health: entry.health || state.healthByDate?.[date] || null } }));
}

function drawBarChart(canvas, rows, options = {}) {
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  const padding = { top: 18, right: 16, bottom: 38, left: 46 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  ctx.strokeStyle = "#d9dde3";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top);
  ctx.lineTo(padding.left, padding.top + chartHeight);
  ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
  ctx.stroke();

  if (!rows.length) {
    drawEmptyChartText(ctx, width, height, options.emptyText || "データなし");
    return;
  }

  const maxValue = Math.max(...rows.map((row) => Number(row.value) || 0), options.goal || 0, 1);
  const gap = 8;
  const barWidth = Math.max(8, (chartWidth - gap * (rows.length - 1)) / rows.length);

  if (options.goal) {
    const goalY = padding.top + chartHeight - (options.goal / maxValue) * chartHeight;
    ctx.strokeStyle = "#b7791f";
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(padding.left, goalY);
    ctx.lineTo(padding.left + chartWidth, goalY);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  rows.forEach((row, index) => {
    const value = Number(row.value) || 0;
    const barHeight = (value / maxValue) * chartHeight;
    const x = padding.left + index * (barWidth + gap);
    const y = padding.top + chartHeight - barHeight;

    ctx.fillStyle = options.color || "#0f766e";
    ctx.fillRect(x, y, barWidth, Math.max(2, barHeight));

    ctx.fillStyle = "#202124";
    ctx.font = "12px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
    ctx.textAlign = "center";
    const label = row.display || (options.format ? options.format(value) : `${Math.round(value)}${options.unit || ""}`);
    ctx.fillText(label, x + barWidth / 2, Math.max(14, y - 7));

    ctx.fillStyle = "#62656a";
    ctx.font = "11px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
    ctx.fillText(shortLabel(row.label), x + barWidth / 2, padding.top + chartHeight + 20);
  });

  ctx.fillStyle = "#62656a";
  ctx.font = "12px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("0", padding.left - 8, padding.top + chartHeight);
}

function drawInlineBarChart(canvas, rows, options = {}) {
  drawBarChart(canvas, rows, options);
}

function drawEmptyChartText(ctx, width, height, text) {
  ctx.fillStyle = "#62656a";
  ctx.font = "16px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(text, width / 2, height / 2);
}

function shortLabel(label) {
  const text = String(label || "");
  return text.length > 8 ? `${text.slice(0, 7)}…` : text;
}

function renderCharts() {
  const chartEntries = getChartEntries();
  const rows = chartEntries.map(({ date, entry }) => ({
    date,
    label: date.slice(5),
    steps: entry.health?.steps || 0,
    sleepHours: (entry.health?.sleepMinutes || 0) / 60,
    workoutMinutes: entry.health?.workoutMinutes || 0,
    screenHours: (entry.screenTime?.totalMinutes || 0) / 60,
  }));

  drawBarChart(
    els.stepsChart,
    rows.map((row) => ({ label: row.label, value: row.steps })),
    { color: "#0f766e", goal: 8000, format: (value) => `${Math.round(value).toLocaleString()}歩` }
  );
  drawBarChart(
    els.sleepChart,
    rows.map((row) => ({ label: row.label, value: row.sleepHours })),
    { color: "#2563eb", goal: 7, format: (value) => `${value.toFixed(1)}h` }
  );
  drawBarChart(
    els.workoutChart,
    rows.map((row) => ({ label: row.label, value: row.workoutMinutes })),
    { color: "#b7791f", goal: 30, format: (value) => `${Math.round(value)}分` }
  );
  drawBarChart(
    els.screenChart,
    rows.map((row) => ({ label: row.label, value: row.screenHours })),
    { color: "#7c3aed", goal: 3, format: (value) => `${value.toFixed(1)}h` }
  );
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getRecentEntries() {
  return Object.entries(state.entries)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 7)
    .map(([date, entry]) => ({
      date,
      grade: entry.grade || "F",
      place: entry.place || "",
      context: entry.context || "",
      reflection: entry.reflection || "",
      health: entry.health || state.healthByDate?.[date] || null,
      screenTime: entry.screenTime || null,
      tasks: (entry.tasks || []).map((task) => ({
        title: task.title,
        weight: task.weight,
        minimum: task.minimum,
        done: task.done,
      })),
    }));
}

function getDiaryPayload() {
  const entry = getEntry();
  return {
    goal: getActiveGoalText(),
    date: els.entryDate.value,
    place: els.entryPlace.value || entry.place || "",
    context: els.entryContext.value || entry.context || "",
    currentReflection: els.reflection.value || entry.reflection || "",
    grade: currentGrade,
    suggestedGrade: suggestGrade(entry.tasks),
    completionRate: els.completionRate.textContent,
    weightScore: els.weightScore.textContent,
    workTime: els.workTime.textContent,
    health: getHealthForDate() || null,
    screenTime: entry.screenTime || null,
    tasks: entry.tasks.map((task) => ({
      title: task.title,
      weight: task.weight,
      minimum: task.minimum,
      done: task.done,
      elapsedSeconds: getTaskElapsedSeconds(task),
    })),
    recentEntries: getRecentEntries(),
  };
}

function sameDate(value, date) {
  return String(value || "").slice(0, 10) === date;
}

function minutesBetween(start, end) {
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime) return 0;
  return (endTime - startTime) / 60000;
}

function getHealthBucket(map, date) {
  if (!map[date]) {
    map[date] = {
      importedAt: new Date().toISOString(),
      sourceDate: date,
      steps: 0,
      sleepMinutes: 0,
      workoutMinutes: 0,
      activeEnergy: 0,
      walkingDistance: 0,
    };
  }
  return map[date];
}

function parseAppleHealthXmlByDate(xmlText) {
  const doc = new DOMParser().parseFromString(xmlText, "application/xml");
  if (doc.querySelector("parsererror")) {
    throw new Error("ヘルスケアのXMLを読み取れませんでした。");
  }

  const byDate = {};
  doc.querySelectorAll("Record").forEach((record) => {
    const type = record.getAttribute("type") || "";
    const startDate = record.getAttribute("startDate") || "";
    const date = startDate.slice(0, 10);
    if (!date) return;

    const bucket = getHealthBucket(byDate, date);
    const value = Number(record.getAttribute("value")) || 0;
    if (type === "HKQuantityTypeIdentifierStepCount") {
      bucket.steps += value;
    } else if (type === "HKQuantityTypeIdentifierActiveEnergyBurned") {
      bucket.activeEnergy += value;
    } else if (type === "HKQuantityTypeIdentifierDistanceWalkingRunning") {
      bucket.walkingDistance += value;
    } else if (type === "HKCategoryTypeIdentifierSleepAnalysis") {
      const sleepValue = record.getAttribute("value") || "";
      if (sleepValue.includes("Asleep")) {
        bucket.sleepMinutes += minutesBetween(startDate, record.getAttribute("endDate"));
      }
    }
  });

  doc.querySelectorAll("Workout").forEach((workout) => {
    const startDate = workout.getAttribute("startDate") || "";
    const date = startDate.slice(0, 10);
    if (!date) return;
    const bucket = getHealthBucket(byDate, date);
    const duration = Number(workout.getAttribute("duration")) || 0;
    const unit = workout.getAttribute("durationUnit") || "min";
    bucket.workoutMinutes += unit === "sec" ? duration / 60 : duration;
  });

  Object.values(byDate).forEach((health) => {
    health.steps = Math.round(health.steps);
    health.sleepMinutes = Math.round(health.sleepMinutes);
    health.workoutMinutes = Math.round(health.workoutMinutes);
    health.activeEnergy = Math.round(health.activeEnergy);
    health.walkingDistance = Number(health.walkingDistance.toFixed(2));
  });
  return byDate;
}

function normalizeShortcutHealthItem(item, fallbackDate = "") {
  const date = String(item.date || item.sourceDate || item["日付"] || fallbackDate || todayString).slice(0, 10);
  if (!date) throw new Error("ショートカットJSONに日付がありません。");
  const hasValue = (...keys) => keys.some((key) => item[key] != null && item[key] !== "");
  const health = {
    importedAt: new Date().toISOString(),
    source: "shortcut",
    sourceDate: date,
    steps: Math.round(Number(item.steps ?? item.stepCount ?? item["歩数"] ?? 0) || 0),
  };
  if (hasValue("sleepMinutes", "sleep", "睡眠分", "睡眠")) {
    health.sleepMinutes = Math.round(Number(item.sleepMinutes ?? item.sleep ?? item["睡眠分"] ?? item["睡眠"] ?? 0) || 0);
  }
  if (hasValue("workoutMinutes", "exerciseMinutes", "運動分", "運動")) {
    health.workoutMinutes = Math.round(
      Number(item.workoutMinutes ?? item.exerciseMinutes ?? item["運動分"] ?? item["運動"] ?? 0) || 0
    );
  }
  if (hasValue("activeEnergy", "calories", "消費カロリー", "アクティブエネルギー")) {
    health.activeEnergy = Math.round(
      Number(item.activeEnergy ?? item.calories ?? item["消費カロリー"] ?? item["アクティブエネルギー"] ?? 0) || 0
    );
  }
  if (hasValue("walkingDistance", "distance", "歩行距離")) {
    health.walkingDistance = Number(item.walkingDistance ?? item.distance ?? item["歩行距離"] ?? 0) || 0;
  }
  return health;
}

function parseShortcutHealthJson(jsonText, fallbackDate = els.entryDate.value) {
  const parsed = JSON.parse(jsonText);
  const rows = Array.isArray(parsed) ? parsed : Array.isArray(parsed.days) ? parsed.days : [parsed];
  const byDate = {};

  rows.forEach((row) => {
    const health = normalizeShortcutHealthItem(row, parsed.date || fallbackDate);
    byDate[health.sourceDate] = {
      ...(byDate[health.sourceDate] || {}),
      ...health,
      steps: (byDate[health.sourceDate]?.steps || 0) + health.steps,
    };
    if (health.sleepMinutes != null) {
      byDate[health.sourceDate].sleepMinutes = (byDate[health.sourceDate]?.sleepMinutes || 0) + health.sleepMinutes;
    }
    if (health.workoutMinutes != null) {
      byDate[health.sourceDate].workoutMinutes =
        (byDate[health.sourceDate]?.workoutMinutes || 0) + health.workoutMinutes;
    }
    if (health.activeEnergy != null) {
      byDate[health.sourceDate].activeEnergy = (byDate[health.sourceDate]?.activeEnergy || 0) + health.activeEnergy;
    }
    if (health.walkingDistance != null) {
      byDate[health.sourceDate].walkingDistance =
        (byDate[health.sourceDate]?.walkingDistance || 0) + health.walkingDistance;
    }
  });

  return byDate;
}

function parseHealthFile(text, file) {
  const name = String(file?.name || "").toLowerCase();
  const trimmed = text.trim();
  if (name.endsWith(".json") || trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return parseShortcutHealthJson(trimmed);
  }
  return parseAppleHealthXmlByDate(text);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && quoted && next === '"') {
      value += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(value);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }

  row.push(value);
  if (row.some((cell) => cell.trim())) rows.push(row);
  return rows;
}

function normalizeHeader(value) {
  return String(value || "").trim().toLowerCase();
}

function parseMinutes(value) {
  const text = String(value || "").trim();
  const timeMatch = text.match(/^(\d+):(\d{1,2})$/);
  if (timeMatch) return Number(timeMatch[1]) * 60 + Number(timeMatch[2]);

  const hourMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:h|時間)/i);
  const minuteMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:m|min|分)/i);
  if (hourMatch || minuteMatch) {
    return (hourMatch ? Number(hourMatch[1]) * 60 : 0) + (minuteMatch ? Number(minuteMatch[1]) : 0);
  }

  return Number(text) || 0;
}

function parseScreenTimeCsv(text, date) {
  const rows = parseCsv(text);
  if (rows.length < 2) throw new Error("CSVの行が足りません。");

  const headers = rows[0].map(normalizeHeader);
  const findIndex = (...names) => headers.findIndex((header) => names.includes(header));
  const dateIndex = findIndex("date", "日付");
  const appIndex = findIndex("app", "application", "name", "アプリ", "アプリ名", "名前");
  const minutesIndex = findIndex("minutes", "minute", "duration", "time", "使用時間", "時間", "分", "使用時間(分)");
  const categoryIndex = findIndex("category", "カテゴリ", "分類");

  if (dateIndex < 0 || appIndex < 0 || minutesIndex < 0) {
    throw new Error("CSVには date/日付、app/アプリ、minutes/使用時間 の列が必要です。");
  }

  const appMap = new Map();
  rows.slice(1).forEach((row) => {
    if (!sameDate(row[dateIndex], date)) return;
    const name = String(row[appIndex] || "").trim();
    const minutes = parseMinutes(row[minutesIndex]);
    if (!name || minutes <= 0) return;

    const current = appMap.get(name) || {
      name,
      category: categoryIndex >= 0 ? String(row[categoryIndex] || "").trim() : "",
      minutes: 0,
    };
    current.minutes += minutes;
    appMap.set(name, current);
  });

  const apps = Array.from(appMap.values())
    .map((app) => ({ ...app, minutes: Math.round(app.minutes) }))
    .sort((a, b) => b.minutes - a.minutes);
  const categories = Array.from(
    apps.reduce((map, app) => {
      const category = app.category || "未分類";
      map.set(category, (map.get(category) || 0) + app.minutes);
      return map;
    }, new Map()),
    ([name, minutes]) => ({ name, minutes })
  ).sort((a, b) => b.minutes - a.minutes);

  return {
    importedAt: new Date().toISOString(),
    sourceDate: date,
    totalMinutes: apps.reduce((sum, app) => sum + app.minutes, 0),
    categories,
    apps,
  };
}

function setAiStatus(message, isError = false) {
  els.aiStatus.textContent = message;
  els.aiStatus.style.color = isError ? "var(--danger)" : "";
}

function setAiGradeStatus(message, isError = false) {
  els.aiGradeStatus.textContent = message;
  els.aiGradeStatus.style.color = isError ? "var(--danger)" : "";
}

async function postAi(path, body) {
  if (usesSupabaseSync() && !getAiProxyBaseUrl()) {
    throw new Error("AI機能にはOpenAI APIキーを置いたAIサーバーが必要です。APIキーを画面側に書かないでください。");
  }
  const session = getSupabaseSession();
  const headers = { "Content-Type": "application/json" };
  if (getAiProxyBaseUrl() && session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }
  const response = await fetch(`${getAiBaseUrl()}${path}`, {
    method: "POST",
    credentials: getAiProxyBaseUrl() ? "omit" : "same-origin",
    headers,
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "AIサーバーに接続できませんでした。");
  }
  return data;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", () => reject(new Error("画像を読み込めませんでした。")));
    reader.readAsDataURL(file);
  });
}

function renderAiSuggestions(result) {
  const tasks = Array.isArray(result.tasks) ? result.tasks : [];
  els.aiSuggestions.innerHTML = "";

  if (result.summary) {
    const summary = document.createElement("p");
    summary.className = "panel-note";
    summary.textContent = result.summary;
    els.aiSuggestions.append(summary);
  }

  tasks.forEach((task) => {
    const card = document.createElement("article");
    card.className = "ai-suggestion";
    card.innerHTML = `
      <div>
        <h3>${escapeHtml(task.title)}</h3>
        <div class="ai-meta">
          <span class="ai-chip">重み ${escapeHtml(task.weight)}</span>
          <span class="ai-chip">${task.minimum ? "必要最低限" : "プラスアルファ"}</span>
        </div>
        ${task.reason ? `<p>${escapeHtml(task.reason)}</p>` : ""}
      </div>
      <button type="button" class="primary">追加</button>
    `;
    card.querySelector("button").addEventListener("click", () => addTask(task));
    els.aiSuggestions.append(card);
  });
}

function renderAiGradeResult(entry) {
  if (!entry.aiGradeReason) {
    els.aiGradeResult.hidden = true;
    els.aiGradeResult.innerHTML = "";
    return;
  }

  els.aiGradeResult.hidden = false;
  els.aiGradeResult.innerHTML = `
    <div><strong>${escapeHtml(entry.grade || "F")}</strong><span>AI評価</span></div>
    <p>${escapeHtml(entry.aiGradeReason)}</p>
  `;
}

els.entryDate.value = todayString;
els.goalDeadline.value = todayString;

els.todayViewButton.addEventListener("click", () => setView("today"));
els.recordsViewButton.addEventListener("click", () => {
  setView("records");
  renderCharts();
});

els.entryDate.addEventListener("change", render);

els.goalForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = els.goalInput.value.trim();
  const deadline = els.goalDeadline.value;
  if (!title || !deadline) return;

  state.goals.push({
    id: crypto.randomUUID(),
    title,
    deadline,
    createdAt: new Date().toISOString(),
  });
  els.goalInput.value = "";
  els.goalDeadline.value = todayString;
  render();
});

els.suggestTasks.addEventListener("click", async () => {
  const entry = getEntry();
  setAiStatus("考え中...");
  els.suggestTasks.disabled = true;
  try {
    const result = await postAi("/api/suggest-tasks", {
      goal: getActiveGoalText(),
      date: els.entryDate.value,
      place: entry.place || "",
      context: entry.context || "",
      health: getHealthForDate() || null,
      screenTime: entry.screenTime || null,
      currentTasks: entry.tasks,
      recentEntries: getRecentEntries(),
    });
    renderAiSuggestions(result);
    setAiStatus("提案しました。");
  } catch (error) {
    setAiStatus(error.message, true);
  } finally {
    els.suggestTasks.disabled = false;
  }
});

els.suggestWeight.addEventListener("click", async () => {
  const title = els.taskTitle.value.trim();
  if (!title) {
    setAiStatus("先にタスク名を入力してください。", true);
    els.taskTitle.focus();
    return;
  }

  const entry = getEntry();
  setAiStatus("重みを考え中...");
  els.suggestWeight.disabled = true;
  try {
    const result = await postAi("/api/suggest-weight", {
      goal: getActiveGoalText(),
      taskTitle: title,
      date: els.entryDate.value,
      place: entry.place || "",
      context: entry.context || "",
      health: getHealthForDate() || null,
      screenTime: entry.screenTime || null,
      recentEntries: getRecentEntries(),
    });
    els.taskWeight.value = String(result.weight || 3);
    setAiStatus(result.reason ? `重み ${result.weight}: ${result.reason}` : `重み ${result.weight} を提案しました。`);
  } catch (error) {
    setAiStatus(error.message, true);
  } finally {
    els.suggestWeight.disabled = false;
  }
});

els.evaluateDay.addEventListener("click", async () => {
  const entry = getEntry();
  if (!entry.tasks.length && !entry.reflection.trim()) {
    setAiGradeStatus("タスクか振り返りを入力してから評価してください。", true);
    return;
  }

  setAiGradeStatus("今日を評価中...");
  els.evaluateDay.disabled = true;
  try {
    const result = await postAi("/api/evaluate-day", {
      goal: getActiveGoalText(),
      date: els.entryDate.value,
      place: entry.place || "",
      context: entry.context || "",
      reflection: entry.reflection || "",
      health: getHealthForDate() || null,
      screenTime: entry.screenTime || null,
      ruleSuggestedGrade: suggestGrade(entry.tasks),
      tasks: entry.tasks,
      recentEntries: getRecentEntries(),
      gradeDefinitions: gradeLabels,
    });
    if (!gradeOrder.includes(result.grade)) {
      throw new Error("AI評価の形式を読み取れませんでした。");
    }
    currentGrade = result.grade;
    entry.grade = result.grade;
    entry.aiGradeReason = result.reason || "";
    render();
    setAiGradeStatus("AI評価を反映しました。");
  } catch (error) {
    setAiGradeStatus(error.message, true);
  } finally {
    els.evaluateDay.disabled = false;
  }
});

els.generateDiary.addEventListener("click", async () => {
  const entry = getEntry();
  if (!entry.tasks.length && !els.reflection.value.trim() && !els.entryContext.value.trim()) {
    setAiGradeStatus("日記生成には、タスク・状況メモ・一言メモのどれかを入力してください。", true);
    return;
  }

  setAiGradeStatus("日記を生成中...");
  els.generateDiary.disabled = true;
  try {
    const result = await postAi("/api/generate-diary", getDiaryPayload());
    if (!result.diary) throw new Error("AI日記の形式を読み取れませんでした。");
    const entry = getEntry();
    entry.reflection = result.diary;
    els.reflection.value = result.diary;
    saveState();
    render();
    setAiGradeStatus("日記を生成しました。");
  } catch (error) {
    setAiGradeStatus(error.message, true);
  } finally {
    els.generateDiary.disabled = false;
  }
});

els.healthFile.addEventListener("change", async () => {
  const file = els.healthFile.files && els.healthFile.files[0];
  if (!file) return;

  els.healthStatus.textContent = "読み込み中...";
  els.healthStatus.style.color = "";
  try {
    const text = await file.text();
    const healthByDate = parseHealthFile(text, file);
    state.healthByDate = { ...(state.healthByDate || {}), ...healthByDate };
    render();
    els.healthStatus.textContent = `${Object.keys(healthByDate).length}日分のヘルスケア情報を読み込みました。`;
  } catch (error) {
    els.healthStatus.textContent = error.message || "ヘルスケア情報を読み込めませんでした。";
    els.healthStatus.style.color = "var(--danger)";
  } finally {
    els.healthFile.value = "";
  }
});

els.screenFile.addEventListener("change", async () => {
  const file = els.screenFile.files && els.screenFile.files[0];
  if (!file) return;

  els.screenStatus.textContent = "読み込み中...";
  els.screenStatus.style.color = "";
  try {
    const text = await file.text();
    const screenTime = parseScreenTimeCsv(text, els.entryDate.value);
    getEntry().screenTime = screenTime;
    render();
    els.screenStatus.textContent = `${els.entryDate.value} のスクリーンタイムを読み込みました。`;
  } catch (error) {
    els.screenStatus.textContent = error.message || "スクリーンタイムを読み込めませんでした。";
    els.screenStatus.style.color = "var(--danger)";
  } finally {
    els.screenFile.value = "";
  }
});

els.screenShotFile.addEventListener("change", async () => {
  const files = Array.from(els.screenShotFile.files || []);
  if (!files.length) return;

  els.screenStatus.textContent = "スクショをAIで読み取り中...";
  els.screenStatus.style.color = "";
  try {
    const images = await Promise.all(
      files.map(async (file) => ({
        name: file.name,
        dataUrl: await readFileAsDataUrl(file),
      }))
    );
    const result = await postAi("/api/parse-screen-time-image", {
      date: els.entryDate.value,
      images,
    });
    getEntry().screenTime = {
      importedAt: new Date().toISOString(),
      sourceDate: result.date || els.entryDate.value,
      totalMinutes: Number(result.totalMinutes) || 0,
      categories: Array.isArray(result.categories) ? result.categories : [],
      apps: Array.isArray(result.apps) ? result.apps : [],
      source: "screenshot",
    };
    render();
    els.screenStatus.textContent = "スクショからスクリーンタイムを読み込みました。";
  } catch (error) {
    els.screenStatus.textContent = error.message || "スクショを読み込めませんでした。";
    els.screenStatus.style.color = "var(--danger)";
  } finally {
    els.screenShotFile.value = "";
  }
});

els.taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = els.taskTitle.value.trim();
  if (!title) return;

  addTask({
    title,
    weight: Math.min(5, Math.max(1, Number(els.taskWeight.value) || 1)),
    minimum: els.taskMinimum.checked,
  });
  els.taskTitle.value = "";
  els.taskWeight.value = "3";
  els.taskMinimum.checked = true;
});

els.gradeButtons.addEventListener("click", (event) => {
  const button = event.target.closest("[data-grade]");
  if (!button) return;
  currentGrade = button.dataset.grade;
  getEntry().grade = currentGrade;
  render();
});

els.entryPlace.addEventListener("input", () => {
  getEntry().place = els.entryPlace.value;
  saveState();
});

els.entryContext.addEventListener("input", () => {
  getEntry().context = els.entryContext.value;
  saveState();
});

els.reflection.addEventListener("input", () => {
  getEntry().reflection = els.reflection.value;
  saveState();
});

els.saveEntry.addEventListener("click", () => {
  const entry = getEntry();
  stopAllRunningTimers();
  entry.grade = currentGrade;
  entry.place = els.entryPlace.value;
  entry.context = els.entryContext.value;
  entry.reflection = els.reflection.value;
  entry.savedAt = new Date().toISOString();
  render();
});

els.clearAll.addEventListener("click", () => {
  if (!confirm("すべての記録を削除しますか？")) return;
  state = cloneInitialState();
  render();
});

syncPanel = createSyncPanel();
render();
initializeSync();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  });
}
