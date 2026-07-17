const storageKey = "goal-task-journal-v2";
const authStorageKey = "goal-task-journal-auth-v1";

const gradeOrder = ["S", "A", "B", "C", "F"];
const gradeLabels = {
  S: "必要最低限をこなし、獲得重みが15以上",
  A: "必要最低限をこなし、獲得重みが12以上",
  B: "必要最低限のタスクに加えて何かプラスアルファに取り組む",
  C: "必要最低限のタスクをこなす",
  F: "するべきことができていない",
};

const initialState = {
  goal: "",
  goals: [],
  entries: {},
  healthByDate: {},
  calendarByDate: {},
  cleCalendarUrl: "",
};

const today = new Date();
const todayString = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
  .toISOString()
  .slice(0, 10);

const els = {
  entryDate: document.querySelector("#entryDate"),
  todayView: document.querySelector("#todayView"),
  todoView: document.querySelector("#todoView"),
  healthView: document.querySelector("#healthView"),
  reviewView: document.querySelector("#reviewView"),
  recordsView: document.querySelector("#recordsView"),
  todayViewButton: document.querySelector("#todayViewButton"),
  todoViewButton: document.querySelector("#todoViewButton"),
  healthViewButton: document.querySelector("#healthViewButton"),
  reviewViewButton: document.querySelector("#reviewViewButton"),
  recordsViewButton: document.querySelector("#recordsViewButton"),
  planningGoalsButton: document.querySelector("#planningGoalsButton"),
  planningCalendarButton: document.querySelector("#planningCalendarButton"),
  planningGoalsPane: document.querySelector("#planningGoalsPane"),
  planningCalendarPane: document.querySelector("#planningCalendarPane"),
  calendarAllButton: document.querySelector("#calendarAllButton"),
  calendarGoalsButton: document.querySelector("#calendarGoalsButton"),
  calendarEventsButton: document.querySelector("#calendarEventsButton"),
  stepsChart: document.querySelector("#stepsChart"),
  stepsAverageWeek: document.querySelector("#stepsAverageWeek"),
  stepsAverageMonth: document.querySelector("#stepsAverageMonth"),
  screenChart: document.querySelector("#screenChart"),
  screenAverageWeek: document.querySelector("#screenAverageWeek"),
  screenAverageMonth: document.querySelector("#screenAverageMonth"),
  goalForm: document.querySelector("#goalForm"),
  goalInput: document.querySelector("#goalInput"),
  goalDeadline: document.querySelector("#goalDeadline"),
  goalList: document.querySelector("#goalList"),
  goalStatus: document.querySelector("#goalStatus"),
  urgentDeadlineList: document.querySelector("#urgentDeadlineList"),
  urgentStatus: document.querySelector("#urgentStatus"),
  cleCalendarUrl: document.querySelector("#cleCalendarUrl"),
  clePasteLink: document.querySelector("#clePasteLink"),
  cleFetch: document.querySelector("#cleFetch"),
  cleFile: document.querySelector("#cleFile"),
  clePaste: document.querySelector("#clePaste"),
  cleStatus: document.querySelector("#cleStatus"),
  prevMonth: document.querySelector("#prevMonth"),
  nextMonth: document.querySelector("#nextMonth"),
  monthLabel: document.querySelector("#monthLabel"),
  monthGrid: document.querySelector("#monthGrid"),
  dayAgenda: document.querySelector("#dayAgenda"),
  suggestTasks: document.querySelector("#suggestTasks"),
  suggestWeight: document.querySelector("#suggestWeight"),
  aiStatus: document.querySelector("#aiStatus"),
  aiSuggestions: document.querySelector("#aiSuggestions"),
  calendarFile: document.querySelector("#calendarFile"),
  clearCalendar: document.querySelector("#clearCalendar"),
  calendarSummary: document.querySelector("#calendarSummary"),
  calendarStatus: document.querySelector("#calendarStatus"),
  evaluateDay: document.querySelector("#evaluateDay"),
  generateDiary: document.querySelector("#generateDiary"),
  aiGradeStatus: document.querySelector("#aiGradeStatus"),
  aiGradeResult: document.querySelector("#aiGradeResult"),
  aiDiaryStatus: document.querySelector("#aiDiaryStatus"),
  aiDiaryResult: document.querySelector("#aiDiaryResult"),
  taskForm: document.querySelector("#taskForm"),
  taskTitle: document.querySelector("#taskTitle"),
  taskWeight: document.querySelector("#taskWeight"),
  taskMinimum: document.querySelector("#taskMinimum"),
  minimumTasks: document.querySelector("#minimumTasks"),
  extraTasks: document.querySelector("#extraTasks"),
  minimumCount: document.querySelector("#minimumCount"),
  extraCount: document.querySelector("#extraCount"),
  healthFile: document.querySelector("#healthFile"),
  healthShortcutSync: document.querySelector("#healthShortcutSync"),
  healthSummary: document.querySelector("#healthSummary"),
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
  exportSyncFile: document.querySelector("#exportSyncFile"),
  importSyncFile: document.querySelector("#importSyncFile"),
  syncEmail: document.querySelector("#syncEmail"),
  syncPassword: document.querySelector("#syncPassword"),
  syncLogin: document.querySelector("#syncLogin"),
  syncRegister: document.querySelector("#syncRegister"),
  syncLogout: document.querySelector("#syncLogout"),
  syncAccount: document.querySelector("#syncAccount"),
  cloudSyncSave: document.querySelector("#cloudSyncSave"),
  cloudSyncLoad: document.querySelector("#cloudSyncLoad"),
  syncStatus: document.querySelector("#syncStatus"),
  historyList: document.querySelector("#historyList"),
  taskTemplate: document.querySelector("#taskTemplate"),
};

let state = loadState();
let currentGrade = "F";
let currentView = "today";
let currentPlanningPane = "goals";
let currentCalendarFilter = "all";
let timerTick = null;
let calendarCursor = new Date(today.getFullYear(), today.getMonth(), 1);
let authSession = loadAuthSession();

function loadState() {
  try {
    const raw = localStorage.getItem(storageKey);
    const loaded = raw ? { ...initialState, ...JSON.parse(raw) } : structuredClone(initialState);
    if ((!loaded.goals || !loaded.goals.length) && loaded.goal) {
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
    return structuredClone(initialState);
  }
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function loadAuthSession() {
  try {
    const loaded = JSON.parse(localStorage.getItem(authStorageKey) || "null");
    if (loaded?.syncId && loaded?.passphrase) return loaded;
    const session = normalizeAuthSession(loaded);
    if (!session) localStorage.removeItem(authStorageKey);
    return session;
  } catch {
    return null;
  }
}

function saveAuthSession(session) {
  authSession = session;
  if (session) {
    localStorage.setItem(authStorageKey, JSON.stringify(session));
  } else {
    localStorage.removeItem(authStorageKey);
  }
  renderSyncAccount();
}

function renderSyncAccount() {
  if (!els.syncAccount) return;
  const syncId = authSession?.syncId || "";
  els.syncAccount.textContent = syncId ? `同期設定中: ${syncId}` : "未設定";
  if (els.syncEmail && syncId && document.activeElement !== els.syncEmail) {
    els.syncEmail.value = syncId;
  }
}

function normalizeAuthSession(result) {
  if (!result || typeof result !== "object") return null;
  const accessToken = result?.access_token || result?.session?.access_token || "";
  const refreshToken = result?.refresh_token || result?.session?.refresh_token || "";
  const user = result?.user || result?.session?.user || null;
  if (!accessToken) return null;
  return {
    ...result,
    access_token: accessToken,
    refresh_token: refreshToken,
    user,
  };
}

function getStoredSyncToken() {
  return authSession?.access_token || authSession?.session?.access_token || "";
}

function setSyncStatus(message, isError = false) {
  if (!els.syncStatus) return;
  els.syncStatus.textContent = message;
  els.syncStatus.style.color = isError ? "var(--danger)" : "";
}

async function postCloudApi(path, body, token = "") {
  const baseUrl = getProxyBaseUrl();
  if (!baseUrl) throw new Error("同期サーバーのURLが設定されていません");
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body || {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "同期サーバーに接続できませんでした");
  }
  return data;
}

async function loginForSync(register = false) {
  const syncId = els.syncEmail.value.trim();
  const passphrase = els.syncPassword.value;
  if (!syncId || !passphrase) throw new Error("同期IDと合言葉を入力してください");
  if (syncId.length < 3) throw new Error("同期IDは3文字以上にしてください");
  if (passphrase.length < 4) throw new Error("合言葉は4文字以上にしてください");
  saveAuthSession({ syncId, passphrase });
  els.syncPassword.value = "";
  setSyncStatus(register ? "入力内容を確認しました。同じ同期IDと合言葉をスマホでも使ってください。" : "同期設定を保存しました");
}

function getSyncCredentials() {
  const syncId = authSession?.syncId || els.syncEmail?.value.trim() || "";
  const passphrase = authSession?.passphrase || els.syncPassword?.value || "";
  if (!syncId || !passphrase) throw new Error("先に同期IDと合言葉を設定してください");
  return { syncId, passphrase };
}

async function saveCloudState() {
  try {
    const result = await postCloudApi("/api/passcode-sync-save", { ...getSyncCredentials(), state });
    setSyncStatus(`クラウドへ保存しました${result.updatedAt ? `（${new Date(result.updatedAt).toLocaleString("ja-JP")}）` : ""}`);
  } catch (error) {
    throw error;
  }
}

async function loadCloudState() {
  try {
    const result = await postCloudApi("/api/passcode-sync-load", getSyncCredentials());
    if (!result.state) throw new Error("クラウドに保存されたデータがまだありません");
    state = normalizeImportedState(result.state);
    saveState();
    render();
    setSyncStatus(`クラウドから読み込みました${result.updatedAt ? `（${new Date(result.updatedAt).toLocaleString("ja-JP")}）` : ""}`);
  } catch (error) {
    throw error;
  }
}

function createSyncPayload() {
  return {
    app: "Goal Task Journal",
    format: "goal-task-journal-sync",
    version: 1,
    exportedAt: new Date().toISOString(),
    data: state,
  };
}

function normalizeImportedState(payload) {
  const data = payload?.data && typeof payload.data === "object" ? payload.data : payload;
  if (!data || typeof data !== "object") {
    throw new Error("同期ファイルの形式を読み取れませんでした");
  }
  const imported = { ...structuredClone(initialState), ...data };
  imported.entries = imported.entries && typeof imported.entries === "object" ? imported.entries : {};
  imported.goals = Array.isArray(imported.goals) ? imported.goals : [];
  imported.healthByDate =
    imported.healthByDate && typeof imported.healthByDate === "object" ? imported.healthByDate : {};
  imported.calendarByDate =
    imported.calendarByDate && typeof imported.calendarByDate === "object" ? imported.calendarByDate : {};
  imported.cleCalendarUrl = String(imported.cleCalendarUrl || "");
  return imported;
}

function exportSyncFile() {
  const payload = createSyncPayload();
  const text = JSON.stringify(payload, null, 2);
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const date = els.entryDate?.value || todayString;
  anchor.href = url;
  anchor.download = `goal-task-journal-sync-${date}.json`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  setSyncStatus("同期ファイルを書き出しました。iPhone側でこのJSONを読み込んでください。");
}

async function importSyncFile(file) {
  const text = await file.text();
  const payload = JSON.parse(text);
  state = normalizeImportedState(payload);
  saveState();
  render();
  setSyncStatus("同期ファイルを読み込みました。Mac版の内容を更新しました。");
}

function setView(view) {
  const validViews = ["today", "todo", "health", "review", "records"];
  currentView = validViews.includes(view) ? view : "today";
  validViews.forEach((name) => {
    els[`${name}View`]?.classList.toggle("active", currentView === name);
    els[`${name}ViewButton`]?.classList.toggle("active", currentView === name);
  });
  if (currentView === "records") renderCharts();
}

function setPlanningPane(pane) {
  currentPlanningPane = pane === "calendar" ? "calendar" : "goals";
  els.planningGoalsPane?.classList.toggle("active", currentPlanningPane === "goals");
  els.planningCalendarPane?.classList.toggle("active", currentPlanningPane === "calendar");
  els.planningGoalsButton?.classList.toggle("active", currentPlanningPane === "goals");
  els.planningCalendarButton?.classList.toggle("active", currentPlanningPane === "calendar");
  if (currentPlanningPane === "calendar") renderMonthlyCalendar();
}

function setCalendarFilter(filter) {
  currentCalendarFilter = ["goals", "events"].includes(filter) ? filter : "all";
  els.calendarAllButton?.classList.toggle("active", currentCalendarFilter === "all");
  els.calendarGoalsButton?.classList.toggle("active", currentCalendarFilter === "goals");
  els.calendarEventsButton?.classList.toggle("active", currentCalendarFilter === "events");
  renderMonthlyCalendar();
}

function getProxyBaseUrl() {
  const proxyUrl = String(window.GTJ_AI_PROXY_URL || "").replace(/\/+$/, "");
  return proxyUrl;
}

function getAiBaseUrl() {
  const proxyUrl = getProxyBaseUrl();
  if (proxyUrl) return proxyUrl;
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
      aiDiary: "",
      savedAt: "",
    };
  }

  return state.entries[date];
}

function pruneGoals() {
  (state.goals || []).forEach(normalizeCleGoalCourse);
  state.goals = (state.goals || []).filter((goal) => !goal.deadline || goal.deadline >= todayString);
}

function getActiveGoalText() {
  pruneGoals();
  return (state.goals || [])
    .map((goal) => `${goal.course ? `[${goal.course}] ` : ""}${goal.title}（期限: ${goal.deadline || "未設定"}）`)
    .join("\n");
}

function summarizeGoalForAi(goal, baseDateText = getSelectedDate()) {
  return {
    id: goal.id || "",
    title: goal.title || "",
    course: goal.course || "",
    deadline: goal.deadline || "",
    daysLeft: getDeadlineDaysLeft(goal.deadline, baseDateText),
    status: goal.completedAt ? "completed" : getDeadlineStatusClass(goal, baseDateText).replace("deadline-", ""),
    completedAt: goal.completedAt || "",
    url: goal.url || "",
  };
}

function getGoalContextForAi(date = getSelectedDate()) {
  pruneGoals();
  const goals = (state.goals || []).map((goal) => summarizeGoalForAi(goal, date));
  const incomplete = goals
    .filter((goal) => goal.status !== "completed")
    .sort((a, b) => {
      const leftA = a.daysLeft === null ? 9999 : a.daysLeft;
      const leftB = b.daysLeft === null ? 9999 : b.daysLeft;
      return leftA - leftB || a.deadline.localeCompare(b.deadline) || a.title.localeCompare(b.title);
    });
  return {
    all: goals,
    incomplete,
    urgent: incomplete.filter((goal) => goal.daysLeft !== null && goal.daysLeft <= 7),
    dueToday: incomplete.filter((goal) => goal.daysLeft === 0),
    completed: goals
      .filter((goal) => goal.status === "completed")
      .sort((a, b) => String(b.completedAt).localeCompare(String(a.completedAt)))
      .slice(0, 20),
  };
}

function getTaskContextForAi(date = getSelectedDate()) {
  const entry = getEntry(date);
  const tasks = (entry.tasks || []).map((task) => ({
    title: task.title,
    weight: task.weight,
    minimum: task.minimum,
    done: task.done,
    elapsedMinutes: Math.round((Number(task.elapsedSeconds) || 0) / 60),
  }));
  return {
    all: tasks,
    completed: tasks.filter((task) => task.done),
    incomplete: tasks.filter((task) => !task.done),
    minimumIncomplete: tasks.filter((task) => task.minimum && !task.done),
  };
}

function getScheduleContextForAi(date = getSelectedDate()) {
  return {
    date,
    events: getCalendarEventsForDate(date).map((event) => ({
      title: event.title || "予定",
      start: event.start || "",
      end: event.end || "",
      allDay: Boolean(event.allDay),
      location: event.location || "",
      color: event.color || "",
    })),
    agenda: getAgendaItemsForDate(date),
  };
}

function getAiPlanningPayload() {
  const date = els.entryDate.value;
  const entry = getEntry(date);
  return {
    goal: getActiveGoalText(),
    goals: getGoalContextForAi(date),
    date,
    place: entry.place || "",
    context: entry.context || "",
    schedule: getScheduleContextForAi(date),
    calendarEvents: getCalendarEventsForDate(date),
    health: getHealthForDate(date) || null,
    screenTime: entry.screenTime || null,
    currentTasks: entry.tasks,
    taskContext: getTaskContextForAi(date),
    recentEntries: getRecentEntries(),
  };
}

function getHealthForDate(date = els.entryDate.value) {
  const entry = getEntry(date);
  return entry.health || state.healthByDate?.[date] || null;
}

function getCalendarEventsForDate(date = els.entryDate.value) {
  return state.calendarByDate?.[date] || [];
}

function getGoalDeadlinesForDate(date) {
  return (state.goals || []).filter((goal) => goal.deadline === date);
}

function getSelectedDate() {
  return els.entryDate?.value || todayString;
}

function getDeadlineStatusClass(goal, baseDateText = getSelectedDate()) {
  if (goal?.completedAt) return "deadline-completed";
  const deadline = dateFromIsoDate(goal?.deadline);
  const baseDate = dateFromIsoDate(baseDateText);
  if (!deadline || !baseDate) return "deadline-normal";
  const daysLeft = Math.round((deadline.getTime() - baseDate.getTime()) / 86400000);
  if (daysLeft < 0) return "deadline-overdue";
  if (daysLeft <= 1) return "deadline-urgent";
  if (daysLeft <= 7) return "deadline-week";
  return "deadline-normal";
}

function getDeadlineDaysLeft(deadlineText, baseDateText = getSelectedDate()) {
  const deadline = dateFromIsoDate(deadlineText);
  const baseDate = dateFromIsoDate(baseDateText);
  if (!deadline || !baseDate) return null;
  return Math.round((deadline.getTime() - baseDate.getTime()) / 86400000);
}

function formatDeadlineNotice(goal, baseDateText = getSelectedDate()) {
  if (goal.completedAt) return "達成済み";
  const daysLeft = getDeadlineDaysLeft(goal.deadline, baseDateText);
  if (daysLeft === null) return "期限未設定";
  if (daysLeft < 0) return `${Math.abs(daysLeft)}日超過`;
  if (daysLeft === 0) return "今日が期限";
  if (daysLeft === 1) return "明日が期限";
  return `あと${daysLeft}日`;
}

function getUrgentGoals(baseDateText = getSelectedDate()) {
  return (state.goals || [])
    .filter((goal) => !goal.completedAt)
    .map((goal) => ({ goal, daysLeft: getDeadlineDaysLeft(goal.deadline, baseDateText) }))
    .filter((item) => item.daysLeft !== null && item.daysLeft <= 7)
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .map((item) => item.goal);
}

function getAgendaItemsForDate(date) {
  const goals = currentCalendarFilter === "events" ? [] : getGoalDeadlinesForDate(date).map((goal) => ({
    type: "goal",
    completed: Boolean(goal.completedAt),
    statusClass: getDeadlineStatusClass(goal, date),
    time: goal.completedAt ? "達成済" : "期限",
    title: goal.course ? `${goal.course}: ${goal.title}` : goal.title,
    location: goal.url ? "リンクあり" : goal.completedAt ? `達成日 ${goal.completedAt.slice(0, 10)}` : "",
    url: goal.url || "",
    sort: "00:00",
  }));
  const events = currentCalendarFilter === "goals" ? [] : getCalendarEventsForDate(date).map((event) => ({
    type: "event",
    time: event.allDay ? "終日" : `${formatCalendarTime(event.start)}-${formatCalendarTime(event.end)}`,
    title: event.title || "予定",
    location: event.location || "",
    color: event.color || "",
    sort: event.allDay ? "00:01" : String(event.start || ""),
  }));

  return [...goals, ...events].sort((a, b) => a.sort.localeCompare(b.sort));
}

function setCalendarMonthFromDate(dateText) {
  const date = dateFromIsoDate(dateText);
  if (!date) return;
  calendarCursor = new Date(date.getFullYear(), date.getMonth(), 1);
}

function render() {
  const entry = getEntry();
  pruneGoals();
  renderSyncAccount();
  els.goalStatus.textContent = state.goals.length ? `${state.goals.length}件` : "未設定";
  els.entryPlace.value = entry.place || "";
  els.entryContext.value = entry.context || "";
  els.reflection.value = entry.reflection || "";
  renderAiGradeResult(entry);
  renderAiDiary(entry);
  if (els.cleCalendarUrl && document.activeElement !== els.cleCalendarUrl) {
    els.cleCalendarUrl.value = state.cleCalendarUrl || "";
  }
  currentGrade = entry.grade || suggestGrade(entry.tasks);

  renderGradeButtons();
  renderUrgentDeadlines();
  renderGoals();
  renderMonthlyCalendar();
  renderTasks(entry.tasks);
  renderSummary(entry.tasks);
  renderCalendar(getCalendarEventsForDate());
  renderHealth(getHealthForDate());
  renderScreenTime(entry.screenTime);
  renderHistory();
  renderCharts();
  syncTimerTick();
  saveState();
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
    const manualTime = node.querySelector(".manual-time-input");
    const remove = node.querySelector(".icon-button");
    const isRunning = Boolean(task.timerStartedAt);

    node.classList.toggle("done", task.done);
    node.classList.toggle("running", isRunning);
    checkbox.checked = task.done;
    name.textContent = task.title;
    weight.textContent = `重み ${task.weight}`;
    timerTime.textContent = formatTimer(getTaskElapsedSeconds(task));
    manualTime.value = String(Math.floor(getTaskElapsedSeconds(task) / 60));
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

    manualTime.addEventListener("change", () => {
      stopTaskTimer(task);
      task.elapsedSeconds = Math.max(0, Math.round(Number(manualTime.value) || 0) * 60);
      task.timerStartedAt = "";
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

function renderUrgentDeadlines() {
  if (!els.urgentDeadlineList || !els.urgentStatus) return;
  const baseDate = getSelectedDate();
  const urgentGoals = getUrgentGoals(baseDate);
  els.urgentStatus.textContent = urgentGoals.length ? `${urgentGoals.length}件` : "なし";
  els.urgentDeadlineList.innerHTML = "";
  if (!urgentGoals.length) {
    els.urgentDeadlineList.innerHTML = '<p class="empty">1週間以内の未達成課題はありません。</p>';
    return;
  }

  urgentGoals.slice(0, 6).forEach((goal) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = `urgent-item ${getDeadlineStatusClass(goal, baseDate)}`;
    item.innerHTML = `
      <span>${escapeHtml(formatDeadlineNotice(goal, baseDate))}</span>
      <strong>${escapeHtml(goal.course ? `${goal.course}: ${goal.title}` : goal.title)}</strong>
      <em>${escapeHtml(goal.deadline || "未設定")}</em>
    `;
    item.addEventListener("click", () => {
      if (openGoalUrl(goal)) return;
      if (goal.deadline) {
        els.entryDate.value = goal.deadline;
        setCalendarMonthFromDate(goal.deadline);
        render();
      }
    });
    els.urgentDeadlineList.append(item);
  });
}

function renderGoals() {
  els.goalList.innerHTML = "";
  (state.goals || []).forEach((goal) => {
    const item = document.createElement("li");
    item.className = "goal-item";
    item.classList.add(getDeadlineStatusClass(goal));
    item.classList.toggle("completed", Boolean(goal.completedAt));
    const meta = goal.completedAt ? `達成済み ${goal.completedAt.slice(0, 10)}` : `期限 ${goal.deadline || "未設定"}`;
    item.innerHTML = `
      <div class="goal-main">
        ${goal.course ? `<em class="course-label">${escapeHtml(goal.course)}</em>` : ""}
        <strong>${escapeHtml(goal.title)}</strong>
        <span>${escapeHtml(meta)}</span>
      </div>
      ${goal.url ? '<button type="button" class="ghost open-link">開く</button>' : ""}
      <button type="button" class="ghost complete-goal">${goal.completedAt ? "戻す" : "達成"}</button>
      <button type="button" class="icon-button" aria-label="削除">×</button>
    `;

    item.querySelector(".open-link")?.addEventListener("click", () => {
      openGoalUrl(goal);
    });

    item.querySelector(".complete-goal").addEventListener("click", () => {
      goal.completedAt = goal.completedAt ? "" : new Date().toISOString();
      render();
    });

    item.querySelector(".icon-button").addEventListener("click", () => {
      state.goals = state.goals.filter((entry) => entry.id !== goal.id);
      render();
    });

    els.goalList.append(item);
  });
}

function renderMonthlyCalendar() {
  const selectedDate = els.entryDate.value || todayString;
  const year = calendarCursor.getFullYear();
  const month = calendarCursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const cells = firstDay.getDay() + lastDay.getDate();
  const totalCells = Math.ceil(cells / 7) * 7;

  els.monthLabel.textContent = `${year}年${month + 1}月`;
  els.monthGrid.innerHTML = "";

  for (let index = 0; index < totalCells; index += 1) {
    const dayNumber = index - firstDay.getDay() + 1;
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "month-day";

    if (dayNumber < 1 || dayNumber > lastDay.getDate()) {
      cell.classList.add("outside");
      cell.disabled = true;
      els.monthGrid.append(cell);
      continue;
    }

    const cellDate = formatLocalDate(new Date(year, month, dayNumber));
    const goals = currentCalendarFilter === "events" ? [] : getGoalDeadlinesForDate(cellDate);
    const events = currentCalendarFilter === "goals" ? [] : getCalendarEventsForDate(cellDate);
    const labels = [
      ...goals.map((goal) => ({
        type: "goal",
        completed: Boolean(goal.completedAt),
        statusClass: getDeadlineStatusClass(goal, cellDate),
        text: goal.course ? `${goal.course}: ${goal.title}` : goal.title,
        url: goal.url || "",
      })),
      ...events.map((event) => ({
        type: "event",
        text: event.allDay ? event.title : `${formatCalendarTime(event.start)} ${event.title}`,
        color: event.color || "",
      })),
    ];

    cell.classList.toggle("selected", cellDate === selectedDate);
    cell.classList.toggle("today", cellDate === todayString);
    cell.innerHTML = `
      <span class="day-number">${dayNumber}</span>
      <span class="day-marks">
        ${labels
          .slice(0, 2)
          .map((item) => {
            const markClass = item.type === "goal" ? `deadline-mark ${item.statusClass || "deadline-normal"}` : "event-mark";
            const style = item.type === "event" && item.color ? ` style="${getCalendarColorStyle(item.color)}"` : "";
            const urlAttr = item.type === "goal" && item.url ? ` data-url="${escapeHtml(item.url)}"` : "";
            return `<em class="${markClass}"${style}${urlAttr}>${escapeHtml(item.text || "予定")}</em>`;
          })
          .join("")}
        ${labels.length > 2 ? `<em class="more-mark">+${labels.length - 2}</em>` : ""}
      </span>
    `;

    cell.addEventListener("click", (event) => {
      const url = event.target?.closest?.(".deadline-mark")?.dataset?.url || "";
      if (url && normalizeAssignmentUrl(url)) {
        window.open(url, "_blank", "noopener");
        return;
      }
      els.entryDate.value = cellDate;
      render();
    });

    els.monthGrid.append(cell);
  }

  renderDayAgenda(selectedDate);
}

function renderDayAgenda(date) {
  const items = getAgendaItemsForDate(date);
  els.dayAgenda.innerHTML = `
    <div class="day-agenda-head">
      <strong>${escapeHtml(date)}</strong>
      <span>${items.length ? `${items.length}件` : "予定なし"}</span>
    </div>
  `;

  if (!items.length) {
    els.dayAgenda.insertAdjacentHTML("beforeend", '<p class="empty">この日の期限・予定はありません。</p>');
    return;
  }

  const list = document.createElement("div");
  list.className = "agenda-list";
  items.forEach((item) => {
    const row = document.createElement("div");
    row.className = `agenda-item ${item.type === "goal" ? "deadline" : "event"}`;
    if (item.type === "goal") row.classList.add(item.statusClass || "deadline-normal");
    row.classList.toggle("completed", Boolean(item.completed));
    if (item.type === "event" && item.color) {
      row.style.borderLeftColor = item.color;
    }
    if (item.type === "goal" && item.url) {
      row.classList.add("clickable");
      row.addEventListener("click", () => window.open(item.url, "_blank", "noopener"));
    }
    row.innerHTML = `
      <span>${escapeHtml(item.time)}</span>
      <strong>${escapeHtml(item.title)}</strong>
      ${item.location ? `<em>${escapeHtml(item.location)}</em>` : ""}
    `;
    list.append(row);
  });
  els.dayAgenda.append(list);
}

function renderSummary(tasks) {
  const totalWeight = tasks.reduce((sum, task) => sum + task.weight, 0);
  const doneWeight = tasks
    .filter((task) => task.done)
    .reduce((sum, task) => sum + task.weight, 0);
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
    els.healthSummary.innerHTML = '<p class="empty">ヘルスケア情報なし</p>';
    return;
  }

  const metrics = [
    ["歩数", `${Number(health.steps || 0).toLocaleString()}歩`],
    ["消費エネルギー", `${Math.round(health.activeEnergy || 0).toLocaleString()}kcal`],
  ];

  metrics.forEach(([label, value]) => {
    const item = document.createElement("div");
    item.className = "health-metric";
    item.innerHTML = `<span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong>`;
    els.healthSummary.append(item);
  });

}

function renderScreenTime(screenTime) {
  els.screenSummary.innerHTML = "";
  if (!screenTime) {
    drawInlineBarChart(els.screenCategoryChart, [], {
      color: "#7c3aed",
      unit: "",
      emptyText: "スクリーンタイムなし",
    });
    drawInlineBarChart(els.screenAppChart, [], {
      color: "#2563eb",
      unit: "",
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

  metrics.forEach(([label, value]) => {
    const item = document.createElement("div");
    item.className = "health-metric";
    item.innerHTML = `<span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong>`;
    els.screenSummary.append(item);
  });

  drawInlineBarChart(
    els.screenCategoryChart,
    (screenTime.categories || []).slice(0, 6).map((category) => ({
      label: category.name,
      value: Number(category.minutes || 0),
      display: formatMinutes(category.minutes || 0),
    })),
    { color: "#7c3aed", unit: "分", emptyText: "カテゴリなし" }
  );
  drawInlineBarChart(
    els.screenAppChart,
    (screenTime.apps || []).slice(0, 6).map((app) => ({
      label: app.name,
      value: Number(app.minutes || 0),
      display: formatMinutes(app.minutes || 0),
    })),
    { color: "#2563eb", unit: "分", emptyText: "アプリなし" }
  );
}

function renderCalendar(events) {
  els.calendarSummary.innerHTML = "";
  if (!events.length) {
    els.calendarSummary.innerHTML = '<p class="empty">この日の予定は未読み込みです。</p>';
    return;
  }

  events
    .slice()
    .sort((a, b) => String(a.start || "").localeCompare(String(b.start || "")))
    .forEach((event) => {
      const item = document.createElement("div");
      item.className = "calendar-event";
      if (event.color) {
        item.style.borderLeftColor = event.color;
      }
      const time = event.allDay
        ? "終日"
        : `${formatCalendarTime(event.start)}-${formatCalendarTime(event.end)}`;
      item.innerHTML = `
        <span>${escapeHtml(time)}</span>
        <strong>${escapeHtml(event.title || "予定")}</strong>
        ${event.location ? `<em>${escapeHtml(event.location)}</em>` : ""}
      `;
      els.calendarSummary.append(item);
    });
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
    .reduce((sum, task) => sum + task.weight, 0);

  if (minimumDone && doneWeight >= 15) return "S";
  if (minimumDone && doneWeight >= 12) return "A";
  if (minimumDone && extraDoneCount > 0) return "B";
  if (minimumDone) return "C";
  return "F";
}

function getGradeRuleDetails(tasks) {
  const minimum = tasks.filter((task) => task.minimum);
  const extra = tasks.filter((task) => !task.minimum);
  const minimumDone = minimum.length > 0 && minimum.every((task) => task.done);
  const extraDoneCount = extra.filter((task) => task.done).length;
  const doneWeight = tasks
    .filter((task) => task.done)
    .reduce((sum, task) => sum + task.weight, 0);
  return {
    grade: suggestGrade(tasks),
    minimumTaskCount: minimum.length,
    minimumDone,
    extraDoneCount,
    earnedWeight: doneWeight,
    ruleOrder: [
      "必要最低限タスクが未達成ならF",
      "必要最低限タスクがすべて達成できていればC",
      "Cに加えてプラスアルファのタスクが1つ以上達成できていればB",
      "B/Cの条件に加えて獲得重みが12以上ならA",
      "B/Cの条件に加えて獲得重みが15以上ならS",
    ],
  };
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
        entry.tasks.length ||
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
    const done = entry.tasks.filter((task) => task.done).length;
    const health = entry.health || state.healthByDate?.[date] || null;
    const meta = [
      entry.place ? `場所: ${entry.place}` : "",
      entry.context ? `状況: ${entry.context}` : "",
      getTasksElapsedSeconds(entry.tasks || []) ? `作業: ${formatMinutes(Math.floor(getTasksElapsedSeconds(entry.tasks || []) / 60))}` : "",
      health ? `歩数: ${Number(health.steps || 0).toLocaleString()}歩` : "",
      health ? `消費: ${Math.round(health.activeEnergy || 0).toLocaleString()}kcal` : "",
      entry.screenTime ? `画面: ${formatMinutes(entry.screenTime.totalMinutes || 0)}` : "",
    ].filter(Boolean);
    const card = document.createElement("article");
    card.className = "history-card";
    card.innerHTML = `
      <div class="history-top">
        <strong>${escapeHtml(date)}</strong>
        <span class="history-grade">${escapeHtml(entry.grade || "F")}</span>
      </div>
      <p>${done} / ${entry.tasks.length} タスク完了</p>
      ${
        meta.length
          ? `<div class="history-meta">${meta.map((item) => `<span class="meta-chip">${escapeHtml(item)}</span>`).join("")}</div>`
          : ""
      }
      ${entry.reflection ? `<p>${escapeHtml(entry.reflection)}</p>` : ""}
      ${entry.aiDiary ? `<p><strong>AI日記</strong><br>${escapeHtml(entry.aiDiary)}</p>` : ""}
    `;
    els.historyList.append(card);
  });
}

function getChartEntries() {
  return Object.entries(state.entries)
    .filter(([, entry]) => entry.health || entry.screenTime)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14)
    .map(([date, entry]) => ({ date, entry }));
}

function drawBarChart(canvas, rows, options) {
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
    ctx.fillStyle = "#62656a";
    ctx.font = "16px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("データなし", width / 2, height / 2);
    return;
  }

  const maxValue = Math.max(...rows.map((row) => row.value), options.goal || 0, options.average || 0, 1);
  const gap = 8;
  const barWidth = Math.max(8, (chartWidth - gap * (rows.length - 1)) / rows.length);

  if (options.goal) {
    const goalY = padding.top + chartHeight - (options.goal / maxValue) * chartHeight;
    ctx.strokeStyle = "#b7791f";
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(padding.left, goalY);
    ctx.lineTo(padding.left + chartWidth, goalY);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (options.average) {
    const averageY = padding.top + chartHeight - (options.average / maxValue) * chartHeight;
    ctx.strokeStyle = options.averageColor || options.color || "#7c3aed";
    ctx.setLineDash([3, 5]);
    ctx.beginPath();
    ctx.moveTo(padding.left, averageY);
    ctx.lineTo(padding.left + chartWidth, averageY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = options.averageColor || options.color || "#5b21b6";
    ctx.font = "11px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("平均", padding.left + 4, Math.max(padding.top + 12, averageY - 4));
  }

  rows.forEach((row, index) => {
    const x = padding.left + index * (barWidth + gap);
    const barHeight = (row.value / maxValue) * chartHeight;
    const y = padding.top + chartHeight - barHeight;
    ctx.fillStyle = options.color;
    ctx.fillRect(x, y, barWidth, barHeight);

    ctx.fillStyle = "#62656a";
    ctx.font = "11px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(row.label.slice(5), x + barWidth / 2, padding.top + chartHeight + 18);
  });

  ctx.fillStyle = "#202124";
  ctx.font = "12px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(options.format(maxValue), padding.left - 6, padding.top + 4);
  ctx.fillText("0", padding.left - 6, padding.top + chartHeight);
}

function formatMinutesHuman(minutes) {
  const value = Math.max(0, Math.round(Number(minutes) || 0));
  const hours = Math.floor(value / 60);
  const rest = value % 60;
  if (hours && rest) return `${hours}時間${rest}分`;
  if (hours) return `${hours}時間`;
  return `${rest}分`;
}

function getScreenAverageMinutes(days, baseDateText = todayString) {
  const baseDate = dateFromIsoDate(baseDateText) || dateFromIsoDate(todayString);
  if (!baseDate) return { average: 0, count: 0 };
  const startDate = addDays(baseDate, -(days - 1));
  const values = Object.entries(state.entries)
    .filter(([date]) => {
      const entryDate = dateFromIsoDate(date);
      return entryDate && entryDate >= startDate && entryDate <= baseDate;
    })
    .map(([, entry]) => Number(entry.screenTime?.totalMinutes) || 0)
    .filter((minutes) => minutes > 0);
  return {
    average: values.length ? values.reduce((sum, minutes) => sum + minutes, 0) / values.length : 0,
    count: values.length,
  };
}

function getStepsAverage(days, baseDateText = todayString) {
  const baseDate = dateFromIsoDate(baseDateText) || dateFromIsoDate(todayString);
  if (!baseDate) return { average: 0, count: 0 };
  const startDate = addDays(baseDate, -(days - 1));
  const dateSet = new Set([...Object.keys(state.entries || {}), ...Object.keys(state.healthByDate || {})]);
  const values = [...dateSet]
    .filter((date) => {
      const entryDate = dateFromIsoDate(date);
      return entryDate && entryDate >= startDate && entryDate <= baseDate;
    })
    .map((date) => Number(getHealthForDate(date)?.steps) || 0)
    .filter((steps) => steps > 0);
  return {
    average: values.length ? values.reduce((sum, steps) => sum + steps, 0) / values.length : 0,
    count: values.length,
  };
}

function drawInlineBarChart(canvas, rows, options = {}) {
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  const padding = { top: 22, right: 20, bottom: 52, left: 40 };
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
    ctx.fillStyle = "#62656a";
    ctx.font = "16px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(options.emptyText || "データなし", width / 2, height / 2);
    return;
  }

  const maxValue = Math.max(...rows.map((row) => Number(row.value) || 0), 1);
  const gap = Math.min(18, Math.max(8, chartWidth / rows.length / 6));
  const barWidth = Math.max(22, (chartWidth - gap * (rows.length - 1)) / rows.length);

  rows.forEach((row, index) => {
    const value = Number(row.value) || 0;
    const x = padding.left + index * (barWidth + gap);
    const barHeight = (value / maxValue) * chartHeight;
    const y = padding.top + chartHeight - barHeight;

    ctx.fillStyle = options.color || "#0f766e";
    ctx.fillRect(x, y, barWidth, barHeight);

    ctx.fillStyle = "#202124";
    ctx.font = "12px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(row.display || `${Math.round(value)}${options.unit || ""}`, x + barWidth / 2, Math.max(14, y - 7));

    ctx.fillStyle = "#62656a";
    ctx.font = "11px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
    ctx.fillText(shortLabel(row.label), x + barWidth / 2, padding.top + chartHeight + 20);
  });

  ctx.fillStyle = "#62656a";
  ctx.font = "12px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("0", padding.left - 8, padding.top + chartHeight);
}

function shortLabel(label) {
  const text = String(label || "");
  return text.length > 8 ? `${text.slice(0, 7)}…` : text;
}

function renderCharts() {
  const chartEntries = getChartEntries();
  const rows = chartEntries.map(({ date, entry }) => {
    const health = getHealthForDate(date);
    const screenMinutes = Number(entry.screenTime?.totalMinutes) || 0;
    return {
      date,
      label: date,
      steps: health?.steps || 0,
      screenMinutes,
      screenHours: screenMinutes / 60,
    };
  });
  const stepsWeekAverage = getStepsAverage(7);
  const stepsMonthAverage = getStepsAverage(30);
  const screenWeekAverage = getScreenAverageMinutes(7);
  const screenMonthAverage = getScreenAverageMinutes(30);
  if (els.stepsAverageWeek) {
    els.stepsAverageWeek.textContent = stepsWeekAverage.count
      ? `7日平均 ${Math.round(stepsWeekAverage.average).toLocaleString()}歩`
      : "7日平均 -";
  }
  if (els.stepsAverageMonth) {
    els.stepsAverageMonth.textContent = stepsMonthAverage.count
      ? `30日平均 ${Math.round(stepsMonthAverage.average).toLocaleString()}歩`
      : "30日平均 -";
  }
  if (els.screenAverageWeek) {
    els.screenAverageWeek.textContent = screenWeekAverage.count
      ? `7日平均 ${formatMinutesHuman(screenWeekAverage.average)}`
      : "7日平均 -";
  }
  if (els.screenAverageMonth) {
    els.screenAverageMonth.textContent = screenMonthAverage.count
      ? `30日平均 ${formatMinutesHuman(screenMonthAverage.average)}`
      : "30日平均 -";
  }

  drawBarChart(
    els.stepsChart,
    rows.map((row) => ({ label: row.label, value: row.steps })),
    {
      color: "#0f766e",
      goal: 8000,
      average: stepsWeekAverage.average,
      averageColor: "#0f766e",
      format: (value) => `${Math.round(value).toLocaleString()}歩`,
    }
  );
  drawBarChart(
    els.screenChart,
    rows.map((row) => ({ label: row.label, value: row.screenHours })),
    { color: "#7c3aed", goal: 3, average: screenWeekAverage.average / 60, format: (value) => `${value.toFixed(1)}h` }
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
      tasks: entry.tasks.map((task) => ({
        title: task.title,
        weight: task.weight,
        minimum: task.minimum,
        done: task.done,
      })),
    }));
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

function parseAppleHealthXml(xmlText, date) {
  return parseAppleHealthXmlByDate(xmlText)[date] || {
    importedAt: new Date().toISOString(),
    sourceDate: date,
    steps: 0,
    sleepMinutes: 0,
    workoutMinutes: 0,
    activeEnergy: 0,
    walkingDistance: 0,
  };
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

function parseXmlAttributes(tagText) {
  const attributes = {};
  tagText.replace(/([A-Za-z0-9_:-]+)="([^"]*)"/g, (_, key, value) => {
    attributes[key] = value;
    return "";
  });
  return attributes;
}

function parseAppleHealthXmlByDate(xmlText) {
  if (!xmlText.includes("<HealthData") && !xmlText.includes("<Record") && !xmlText.includes("<Workout")) {
    throw new Error("ヘルスケアのXMLを読み取れませんでした");
  }

  const byDate = {};
  const recordPattern = /<Record\b[^>]*>/g;
  const workoutPattern = /<Workout\b[^>]*>/g;

  for (const match of xmlText.matchAll(recordPattern)) {
    const record = parseXmlAttributes(match[0]);
    const type = record.type || "";
    const startDate = record.startDate || "";
    const date = startDate.slice(0, 10);
    if (!date) continue;

    const bucket = getHealthBucket(byDate, date);
    const value = Number(record.value) || 0;
    if (type === "HKQuantityTypeIdentifierStepCount") {
      bucket.steps += value;
    } else if (type === "HKQuantityTypeIdentifierActiveEnergyBurned") {
      bucket.activeEnergy += value;
    } else if (type === "HKQuantityTypeIdentifierDistanceWalkingRunning") {
      bucket.walkingDistance += value;
    } else if (type === "HKCategoryTypeIdentifierSleepAnalysis") {
      const sleepValue = record.value || "";
      if (sleepValue.includes("Asleep")) {
        bucket.sleepMinutes += minutesBetween(startDate, record.endDate);
      }
    }
  }

  for (const match of xmlText.matchAll(workoutPattern)) {
    const workout = parseXmlAttributes(match[0]);
    const startDate = workout.startDate || "";
    const date = startDate.slice(0, 10);
    if (!date) continue;
    const bucket = getHealthBucket(byDate, date);
    const duration = Number(workout.duration) || 0;
    const unit = workout.durationUnit || "min";
    bucket.workoutMinutes += unit === "sec" ? duration / 60 : duration;
  }

  Object.values(byDate).forEach((health) => {
    health.steps = Math.round(health.steps);
    health.sleepMinutes = Math.round(health.sleepMinutes);
    health.workoutMinutes = Math.round(health.workoutMinutes);
    health.activeEnergy = Math.round(health.activeEnergy);
    health.walkingDistance = Number(health.walkingDistance.toFixed(2));
  });

  return byDate;
}

function numberFromKeys(source, keys) {
  for (const key of keys) {
    const value = source?.[key];
    if (value !== undefined && value !== null && value !== "") return Number(value) || 0;
  }
  return 0;
}

function textFromKeys(source, keys) {
  for (const key of keys) {
    const value = source?.[key];
    if (value !== undefined && value !== null && value !== "") return String(value);
  }
  return "";
}

function normalizeHealthJsonItem(item, fallbackDate) {
  const date = textFromKeys(item, ["date", "Date", "日付"]) || fallbackDate || todayString;
  const sourceDate = date.slice(0, 10);
  if (!sourceDate) throw new Error("JSONの日付を読み取れませんでした");

  return {
    importedAt: new Date().toISOString(),
    sourceDate,
    steps: Math.round(numberFromKeys(item, ["steps", "stepCount", "歩数"])),
    sleepMinutes: 0,
    workoutMinutes: 0,
    activeEnergy: Math.round(numberFromKeys(item, ["activeEnergy", "calories", "activeCalories", "消費カロリー", "アクティブエネルギー"])),
    walkingDistance: numberFromKeys(item, ["walkingDistance", "distance", "歩行距離"]),
  };
}

function parseHealthJsonByDate(text, fallbackDate = els.entryDate.value) {
  const data = JSON.parse(text);
  const items = Array.isArray(data) ? data : Array.isArray(data.health) ? data.health : [data];
  const byDate = {};

  items.forEach((item) => {
    const health = normalizeHealthJsonItem(item, fallbackDate);
    byDate[health.sourceDate] = health;
  });

  return byDate;
}

function importHealthByDate(healthByDate) {
  state.healthByDate = { ...(state.healthByDate || {}), ...healthByDate };
  render();
  return Object.keys(healthByDate).length;
}

function decodeHealthShortcutPayload(rawValue) {
  const raw = String(rawValue || "").trim();
  if (!raw) throw new Error("ショートカットのJSONが空です");
  const decodedText = decodeURIComponent(raw);
  if (decodedText.trim().startsWith("{") || decodedText.trim().startsWith("[")) return decodedText;

  const normalized = raw.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function getIncomingHealthPayload() {
  const params = new URLSearchParams(window.location.search);
  const hash = window.location.hash.startsWith("#?") ? window.location.hash.slice(2) : "";
  const hashParams = new URLSearchParams(hash);
  return (
    params.get("health") ||
    params.get("healthJson") ||
    params.get("healthData") ||
    hashParams.get("health") ||
    hashParams.get("healthJson") ||
    hashParams.get("healthData") ||
    ""
  );
}

function clearIncomingHealthPayload() {
  if (!history.replaceState) return;
  const url = new URL(window.location.href);
  ["health", "healthJson", "healthData"].forEach((key) => url.searchParams.delete(key));
  if (url.hash.startsWith("#?")) url.hash = "";
  history.replaceState(null, "", url.toString());
}

function importHealthFromShortcutUrl() {
  const payload = getIncomingHealthPayload();
  if (!payload) return false;
  try {
    const text = decodeHealthShortcutPayload(payload);
    const healthByDate = parseHealthJsonByDate(text, els.entryDate.value);
    const dayCount = importHealthByDate(healthByDate);
    els.healthStatus.textContent = `${dayCount}日分のヘルスケア情報をショートカットから同期しました`;
    els.healthStatus.style.color = "";
    clearIncomingHealthPayload();
    return true;
  } catch (error) {
    els.healthStatus.textContent = error.message || "ショートカットのヘルスケアJSONを読み込めませんでした";
    els.healthStatus.style.color = "var(--danger)";
    return false;
  }
}

function runHealthShortcut() {
  const shortcutName = String(window.GTJ_HEALTH_SHORTCUT_NAME || "ヘルスケア作成").trim();
  const callbackUrl = new URL(window.location.href);
  ["health", "healthJson", "healthData"].forEach((key) => callbackUrl.searchParams.delete(key));
  callbackUrl.hash = "";
  const shortcutUrl =
    `shortcuts://run-shortcut?name=${encodeURIComponent(shortcutName)}` +
    `&input=text&text=${encodeURIComponent(callbackUrl.toString())}`;
  window.location.href = shortcutUrl;
  els.healthStatus.textContent = `ショートカット「${shortcutName}」を起動します`;
  els.healthStatus.style.color = "";
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
  if (rows.length < 2) throw new Error("CSVの行が足りません");

  const headers = rows[0].map(normalizeHeader);
  const findIndex = (...names) => headers.findIndex((header) => names.includes(header));
  const dateIndex = findIndex("date", "日付");
  const appIndex = findIndex("app", "application", "name", "アプリ", "アプリ名", "名前");
  const minutesIndex = findIndex("minutes", "minute", "duration", "time", "使用時間", "時間", "分", "使用時間(分)");
  const categoryIndex = findIndex("category", "カテゴリ", "分類");

  if (dateIndex < 0 || appIndex < 0 || minutesIndex < 0) {
    throw new Error("CSVには date/日付、app/アプリ、minutes/使用時間 の列が必要です");
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

  return {
    importedAt: new Date().toISOString(),
    sourceDate: date,
    totalMinutes: apps.reduce((sum, app) => sum + app.minutes, 0),
    apps,
  };
}

function unfoldIcsLines(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .reduce((lines, line) => {
      if (/^[ \t]/.test(line) && lines.length) {
        lines[lines.length - 1] += line.slice(1);
      } else {
        lines.push(line);
      }
      return lines;
    }, []);
}

function decodeIcsText(value) {
  return String(value || "")
    .replace(/\\n/g, " ")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
    .trim();
}

function normalizeIcsColor(value) {
  const color = String(value || "").trim();
  const hex = color.match(/^#?([0-9a-fA-F]{6})([0-9a-fA-F]{2})?$/);
  if (!hex) return "";
  return `#${hex[1].toLowerCase()}`;
}

function hexToRgb(color) {
  const hex = normalizeIcsColor(color).slice(1);
  if (!hex) return null;
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  };
}

function getReadableTextColor(color) {
  const rgb = hexToRgb(color);
  if (!rgb) return "";
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.58 ? "#202124" : "#ffffff";
}

function getCalendarColorStyle(color) {
  const normalized = normalizeIcsColor(color);
  if (!normalized) return "";
  return `background:${normalized};color:${getReadableTextColor(normalized)};`;
}

function padDatePart(value) {
  return String(value).padStart(2, "0");
}

function formatLocalDate(date) {
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
}

function formatLocalDateTime(date) {
  return `${formatLocalDate(date)}T${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}:${padDatePart(date.getSeconds())}`;
}

function dateFromIsoDate(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function parseIcsDate(value) {
  const text = String(value || "").trim();
  const normalized = text.includes(":") ? text.slice(text.lastIndexOf(":") + 1).trim() : text;
  const dateOnly = normalized.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (dateOnly) {
    return {
      iso: `${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]}`,
      date: `${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]}`,
      allDay: true,
    };
  }

  const match = normalized.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/);
  if (!match) return { iso: "", date: "", allDay: false };

  const [, year, month, day, hour, minute, second = "00", utc] = match;
  if (!utc) {
    return {
      iso: `${year}-${month}-${day}T${hour}:${minute}:${second}`,
      date: `${year}-${month}-${day}`,
      allDay: false,
    };
  }

  const valueDate = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`);
  if (Number.isNaN(valueDate.getTime())) return { iso: "", date: "", allDay: false };
  return { iso: formatLocalDateTime(valueDate), date: formatLocalDate(valueDate), allDay: false };
}

function formatCalendarTime(value) {
  if (!value) return "--:--";
  const localTime = String(value).match(/T(\d{2}):(\d{2})/);
  if (localTime) return `${localTime[1]}:${localTime[2]}`;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date, months) {
  const next = new Date(date);
  const day = next.getDate();
  next.setDate(1);
  next.setMonth(next.getMonth() + months);
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(day, lastDay));
  return next;
}

function parseRRule(value) {
  return String(value || "")
    .split(";")
    .reduce((rule, part) => {
      const [key, val] = part.split("=");
      if (key && val) rule[key] = val;
      return rule;
    }, {});
}

function parseIcsDateOnly(value) {
  const parsed = parseIcsDate(value);
  if (!parsed.date) return null;
  return dateFromIsoDate(parsed.date);
}

function getRecurrenceDates(start, ruleText) {
  if (!ruleText || !start.date) return [start.date];

  const rule = parseRRule(ruleText);
  const frequency = rule.FREQ;
  const interval = Math.max(1, Number(rule.INTERVAL || 1));
  const countLimit = Math.min(Math.max(Number(rule.COUNT || 0), 0), 500);
  const untilDate = parseIcsDateOnly(rule.UNTIL);
  const base = dateFromIsoDate(start.date);
  if (!base) return [start.date];
  const dates = [];
  let cursor = new Date(base);
  let guard = 0;
  const defaultEnd = addMonths(base, 18);

  while (guard < 500) {
    guard += 1;
    if (untilDate && cursor > untilDate) break;
    if (!untilDate && !countLimit && cursor > defaultEnd) break;

    dates.push(formatLocalDate(cursor));
    if (countLimit && dates.length >= countLimit) break;

    if (frequency === "DAILY") cursor = addDays(cursor, interval);
    else if (frequency === "WEEKLY") cursor = addDays(cursor, interval * 7);
    else if (frequency === "MONTHLY") cursor = addMonths(cursor, interval);
    else if (frequency === "YEARLY") cursor = addMonths(cursor, interval * 12);
    else break;
  }

  return dates.length ? dates : [start.date];
}

function mergeCalendarByDate(base, addition) {
  const merged = { ...(base || {}) };
  Object.entries(addition || {}).forEach(([date, events]) => {
    merged[date] = [...(merged[date] || []), ...events].sort((a, b) => {
      if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
      return String(a.start || "").localeCompare(String(b.start || ""));
    });
  });
  return merged;
}

function parseCalendarIcs(text) {
  const lines = unfoldIcsLines(text);
  const byDate = {};
  let current = null;
  let calendarColor = "";

  lines.forEach((line) => {
    if (!current) {
      const separator = line.indexOf(":");
      if (separator >= 0) {
        const rawKey = line.slice(0, separator).split(";")[0].toUpperCase();
        if (["X-APPLE-CALENDAR-COLOR", "COLOR", "X-WR-CALCOLOR"].includes(rawKey)) {
          calendarColor = normalizeIcsColor(line.slice(separator + 1)) || calendarColor;
        }
      }
    }

    if (line === "BEGIN:VEVENT") {
      current = {};
      return;
    }
    if (line === "END:VEVENT") {
      if (!current) return;
      const start = parseIcsDate(current.DTSTART || "");
      const end = parseIcsDate(current.DTEND || "");
      if (start.date) {
        const event = {
          title: decodeIcsText(current.SUMMARY || "予定"),
          location: decodeIcsText(current.LOCATION || ""),
          start: start.iso,
          end: end.iso || start.iso,
          allDay: start.allDay,
          color: normalizeIcsColor(current.COLOR || current["X-APPLE-CALENDAR-COLOR"] || current["X-WR-CALCOLOR"] || calendarColor),
        };
        getRecurrenceDates(start, current.RRULE || "").forEach((date) => {
          byDate[date] = [...(byDate[date] || []), event];
        });
      }
      current = null;
      return;
    }
    if (!current) return;

    const separator = line.indexOf(":");
    if (separator < 0) return;
    const rawKey = line.slice(0, separator).split(";")[0].toUpperCase();
    current[rawKey] = line.slice(separator + 1);
  });

  return byDate;
}

function cleanCourseName(value = "") {
  const text = String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s:：／/・\-–—\[\]【】]+|[\s:：／/・\-–—\[\]【】]+$/g, "")
    .trim();
  if (text.length < 2 || text.length > 80) return "";
  if (/https?:\/\//i.test(text)) return "";
  if (/^\d{4}[-/年.]\d{1,2}/.test(text)) return "";
  if (/^(due|deadline|締切|期限)\b/i.test(text)) return "";
  if (/\b\d{1,2}[-/](Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\b/i.test(text)) return "";
  if (/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[-/]\d{1,2}\b/i.test(text)) return "";
  if (/^\d{1,2}[-/月.]\d{1,2}日?$/.test(text)) return "";
  const compact = text.replace(/[\s_\-・･.　]/g, "").toUpperCase();
  const genericNames = new Set([
    "OSAKAUNIVERSITY",
    "THEUNIVERSITYOFOSAKA",
    "大阪大学",
    "大阪大学CLE",
    "CLE",
    "BLACKBOARD",
    "BLACKBOARDLEARN",
    "COURSE",
    "COURSES",
    "CALENDAR",
    "ASSIGNMENTS",
    "ASSIGNMENT",
  ]);
  if (genericNames.has(compact)) return "";
  if (/^(OSAKA)?UNIVERSITY$/i.test(compact)) return "";
  if (/^(大阪大学|OSAKAUNIVERSITY|THEUNIVERSITYOFOSAKA)/i.test(compact) && compact.length <= 28) return "";
  if (/^(Assignment|Assignments|Due|Calendar|Event|Blackboard|CLE|Course|Courses|課題|期限|締切|カレンダー|予定)$/i.test(text)) return "";
  return text;
}

function extractCourseFromText(text = "") {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  const patterns = [
    /(?:Course\s*Name|Class\s*Name|Subject|Calendar|Course|Class|授業名|科目名|授業|科目|講義|コース)\s*[:：]\s*([^,;|／/]+)/i,
    /\d{4}-\d{2}-\d{6}-[A-Z]\s*[:：]\s*\d+\s+([^/／|]+?)\s+[月火水木金土日][1-7１-７](?:\s|$)/,
    /(?:^|\s)\d{4}[-\dA-Za-z]+(?:[・･]\s*\d+)?\s+([^/／|]+?)\s+[月火水木金土日][1-7１-７](?:\s|$)/,
    /(?:^|\s)\d{4}[-\dA-Za-z]+\s*[:：]\s*\d+\s+([^/／|]+?)\s+[月火水木金土日][1-7１-７](?:\s|$)/,
    /(?:^|\s)\d{1,3}\s+([^/／|]+?)\s+[月火水木金土日][1-7１-７](?:\s|$)/,
    /([^,;|／/]+?)\s+[月火水木金土日][1-7１-７](?:\s|$)/,
    /([一-龥ぁ-んァ-ヶA-Za-z0-9０-９・･ー+\s]+?[（(][^）)]+[）)])/,
    /\[([^\]]{2,80})\]/,
    /【([^】]{2,80})】/,
    /(?:^|\s)([^,;|／/]+?)\s+(?:確認問題|確認テスト|演習問題|練習問題|宿題|課題|レポート|小テスト|Assignment)/i,
  ];
  for (const pattern of patterns) {
    const match = value.match(pattern);
    const course = cleanCourseName(match?.[1]);
    if (course) return course;
  }
  return "";
}

function splitCourseAndTitle(title = "") {
  const text = String(title || "").trim();
  const separators = ["：", ":", " - ", " – ", " — ", "／", "/"];
  for (const separator of separators) {
    const index = text.indexOf(separator);
    if (index > 0 && index < text.length - separator.length) {
      const course = text.slice(0, index).trim();
      const assignmentTitle = text.slice(index + separator.length).trim();
      if (course.length >= 2 && assignmentTitle.length >= 2) return { course, title: assignmentTitle };
    }
  }
  return { course: "", title: text };
}

function removeCoursePrefix(title = "", course = "") {
  const text = String(title || "").trim();
  const courseText = String(course || "").trim();
  if (!courseText || !text.startsWith(courseText)) return text;
  return text.slice(courseText.length).replace(/^[\s:：／/・\-–—]+/, "").trim() || text;
}

function cleanAssignmentTitle(value = "") {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function assignmentMatchTitle(value = "") {
  return cleanAssignmentTitle(value)
    .replace(/\[\s*(?:due|deadline|締切|期限)\s+[^\]]+\]/gi, "")
    .replace(/（\s*(?:due|deadline|締切|期限)\s+[^）]+）/gi, "")
    .trim();
}

function normalizeAssignmentUrl(value = "") {
  const url = String(value || "").trim();
  if (!/^https?:\/\//i.test(url)) return "";
  try {
    return new URL(url).href;
  } catch {
    return "";
  }
}

function extractFirstUrl(value = "") {
  const text = String(value || "");
  const markdown = text.match(/\[[^\]]+\]\((https?:\/\/[^)\s]+)\)/i);
  if (markdown) return normalizeAssignmentUrl(markdown[1]);
  const plain = text.match(/https?:\/\/[^\s)\]>]+/i);
  return plain ? normalizeAssignmentUrl(plain[0]) : "";
}

function stripMarkdownUrls(value = "") {
  return String(value || "")
    .replace(/\[([^\]]+)\]\(https?:\/\/[^)\s]+\)/gi, "$1")
    .replace(/https?:\/\/\S+/gi, "")
    .trim();
}

function openGoalUrl(goal) {
  const url = normalizeAssignmentUrl(goal?.url);
  if (!url) return false;
  window.open(url, "_blank", "noopener");
  return true;
}

function normalizeCleGoalCourse(goal) {
  if (!goal || goal.source !== "cle") return false;
  if (goal.course && !cleanCourseName(goal.course)) {
    goal.course = "";
    return true;
  }
  return false;
}

function normalizeDateString(value) {
  const text = String(value || "").trim();
  const iso = text.match(/(\d{4})[-/年.](\d{1,2})[-/月.](\d{1,2})/);
  if (iso) return `${iso[1]}-${String(iso[2]).padStart(2, "0")}-${String(iso[3]).padStart(2, "0")}`;
  const compact = text.match(/(\d{4})(\d{2})(\d{2})/);
  if (compact) return `${compact[1]}-${compact[2]}-${compact[3]}`;
  const md = text.match(/(\d{1,2})[-/月.](\d{1,2})/);
  if (md) return `${todayString.slice(0, 4)}-${String(md[1]).padStart(2, "0")}-${String(md[2]).padStart(2, "0")}`;
  return "";
}

function parseCleIcs(text) {
  const lines = unfoldIcsLines(text);
  const assignments = [];
  let event = null;

  lines.forEach((line) => {
    const separator = line.indexOf(":");

    if (line.trim() === "BEGIN:VEVENT") {
      event = {};
      return;
    }
    if (line.trim() === "END:VEVENT") {
      if (event?.title && event?.deadline) assignments.push(event);
      event = null;
      return;
    }
    if (!event || separator < 0) return;

    const name = line.slice(0, separator);
    const key = name.split(";")[0].toUpperCase();
    const value = line.slice(separator + 1);
    const decoded = decodeIcsText(value);
    if (key === "SUMMARY") event.title = decoded;
    if (key === "URL") event.url = normalizeAssignmentUrl(decoded);
    if (key === "DESCRIPTION") event.url = event.url || extractFirstUrl(decoded);
    if (key === "DUE" || key === "DTEND" || key === "DTSTART") {
      event.deadline = event.deadline || parseIcsDate(value).date || normalizeDateString(value);
    }
  });

  return assignments;
}

function parseCleCsv(text) {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];
  const headers = rows[0].map((header) => String(header || "").trim().toLowerCase());
  const findHeader = (...names) => headers.findIndex((header) => names.some((name) => header.includes(name)));
  const titleIndex = findHeader("title", "name", "summary", "assignment", "課題", "タイトル", "件名");
  const dueIndex = findHeader("due", "deadline", "date", "期限", "締切", "期日", "日付");
  const courseIndex = findHeader("course", "class", "subject", "授業", "科目", "講義", "コース");
  const urlIndex = findHeader("url", "link", "リンク", "URL");
  if (titleIndex < 0 || dueIndex < 0) return [];

  return rows
    .slice(1)
    .map((row) => {
      const rawTitle = String(row[titleIndex] || "").trim();
      return {
        title: rawTitle,
        course: courseIndex >= 0 ? String(row[courseIndex] || "").trim() : "",
        url: urlIndex >= 0 ? normalizeAssignmentUrl(row[urlIndex]) : extractFirstUrl(rawTitle),
        deadline: normalizeDateString(row[dueIndex]),
      };
    })
    .filter((item) => item.title && item.deadline);
}

function parseCleText(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines
    .map((line, index) => {
      const deadline = normalizeDateString(line);
      if (!deadline) return null;
      const url = extractFirstUrl(line);
      const previousLine = lines[index - 1] || "";
      const titleSource = previousLine && !normalizeDateString(previousLine) ? previousLine : line;
      const cleaned = line
        .replace(/\[([^\]]+)\]\(https?:\/\/[^)\s]+\)/gi, "$1")
        .replace(/\d{4}[-/年.]\d{1,2}[-/月.]\d{1,2}日?/g, "")
        .replace(/\d{1,2}[-/月.]\d{1,2}日?/g, "")
        .replace(/https?:\/\/\S+/gi, "")
        .replace(/期限|締切|期日|Due:?/gi, "")
        .trim();
      const title = stripMarkdownUrls(titleSource === line ? cleaned || line : titleSource);
      return {
        title,
        course: "",
        url,
        deadline,
      };
    })
    .filter(Boolean)
    .filter((item) => item.title && item.deadline);
}

function parseCleAssignments(text, fileName = "") {
  const name = String(fileName).toLowerCase();
  const trimmed = text.trim();
  if (name.endsWith(".ics") || trimmed.includes("BEGIN:VCALENDAR")) return parseCleIcs(text);
  if (name.endsWith(".csv") || trimmed.includes(",")) {
    const csvItems = parseCleCsv(text);
    if (csvItems.length) return csvItems;
  }
  if (name.endsWith(".json") || trimmed.startsWith("{") || trimmed.startsWith("[")) {
    const parsed = JSON.parse(trimmed);
    const rows = Array.isArray(parsed) ? parsed : Array.isArray(parsed.assignments) ? parsed.assignments : [parsed];
    return rows
      .map((item) => ({
        title: String(item.title || item.name || item.summary || item["課題"] || "").trim(),
        course: String(item.course || item.class || item.subject || item["授業"] || item["科目"] || item["講義"] || "").trim(),
        url: normalizeAssignmentUrl(item.url || item.link || item.href || item["リンク"] || ""),
        deadline: normalizeDateString(item.deadline || item.due || item.date || item["期限"] || item["締切"] || ""),
      }))
      .filter((item) => item.title && item.deadline);
  }
  return parseCleText(text);
}

function importCleAssignments(assignments) {
  const existing = new Set((state.goals || []).map((goal) => `${goal.course || ""}::${goal.title}::${goal.deadline}`));
  let added = 0;
  let updated = 0;
  assignments.forEach((assignment) => {
    const title = String(assignment.title || "").trim();
    const titleKey = assignmentMatchTitle(title) || title;
    const course = cleanCourseName(assignment.course || "");
    const url = normalizeAssignmentUrl(assignment.url || extractFirstUrl(assignment.title));
    const deadline = normalizeDateString(assignment.deadline);
    if (!title || !deadline) return;
    const sameGoal = (state.goals || []).find((goal) => {
      const goalTitle = String(goal.title || "").trim();
      const goalTitleKey = assignmentMatchTitle(goalTitle) || goalTitle;
      return goal.source === "cle" && goalTitleKey === titleKey && goal.deadline === deadline;
    });
    if (sameGoal) {
      if (sameGoal.course && !cleanCourseName(sameGoal.course)) {
        sameGoal.course = "";
      }
      if (sameGoal.title !== title) {
        sameGoal.title = title;
        updated += 1;
      }
      if (course && sameGoal.course !== course) {
        sameGoal.course = course;
        updated += 1;
      }
      if (url && sameGoal.url !== url) {
        sameGoal.url = url;
        updated += 1;
      }
      return;
    }
    const key = `${course}::${title}::${deadline}`;
    if (existing.has(key)) return;
    existing.add(key);
    state.goals.push({
      id: crypto.randomUUID(),
      title,
      course,
      url,
      deadline,
      source: "cle",
      createdAt: new Date().toISOString(),
    });
    added += 1;
  });
  render();
  return { added, updated };
}

function setCleStatus(message, isError = false) {
  if (!els.cleStatus) return;
  els.cleStatus.textContent = message;
  els.cleStatus.style.color = isError ? "var(--danger)" : "";
}

function setCleCalendarUrlFromText(text) {
  const url = String(text || "").trim();
  if (!url) throw new Error("コピーしたリンクが空です");
  if (!/^https?:\/\//i.test(url) && !/^webcal:\/\//i.test(url)) {
    throw new Error("コピーした内容がリンクではありません。CLEのカレンダー共有リンクをコピーしてください");
  }
  if (!els.cleCalendarUrl) return;
  els.cleCalendarUrl.value = url;
  state.cleCalendarUrl = url;
  saveState();
  setCleStatus("コピーしたリンクを入力しました。更新を押すと読み込みます");
}

window.receiveNativeClipboard = (result) => {
  if (!result?.ok) {
    setCleStatus(result?.error || "クリップボードを読み取れませんでした", true);
    return;
  }
  try {
    setCleCalendarUrlFromText(result.text || "");
  } catch (error) {
    setCleStatus(error.message || "コピーしたリンクを入力できませんでした", true);
  }
};

async function fetchCleCalendarText(calendarUrl) {
  const url = String(calendarUrl || "").trim();
  if (!/^https?:\/\//i.test(url) && !/^webcal:\/\//i.test(url)) {
    throw new Error("CLEのカレンダー共有リンクを入力してください");
  }
  const normalizedUrl = url.replace(/^webcal:/i, "https:");
  const looksLikeCalendarLink = /^webcal:\/\//i.test(url) || /\.ics(?:[?#].*)?$/i.test(normalizedUrl) || /calendar|ical|ics|feed/i.test(normalizedUrl);
  if (!looksLikeCalendarLink) {
    throw new Error("通常のCLEページURLでは読み込めません。CLEのカレンダー共有リンクまたは.icsリンクを貼ってください");
  }
  const proxyUrl = getProxyBaseUrl();
  if (!proxyUrl) throw new Error("CLEカレンダー取得にはCloudflare Worker URLの設定が必要です");

  let response;
  try {
    response = await fetch(`${proxyUrl}/api/fetch-ics?client=mac-app`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: normalizedUrl }),
    });
  } catch {
    throw new Error("Workerに接続できませんでした。アプリを開き直してからもう一度試してください");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "カレンダーを取得できませんでした");
  const icsText = String(data.text || "");
  if (!icsText.trim()) throw new Error("取得したカレンダーが空でした");
  if (/^\s*<!doctype html|^\s*<html[\s>]/i.test(icsText)) {
    throw new Error("CLEのログイン画面または通常ページが返ってきました。課題用のカレンダー共有リンクを使ってください");
  }
  if (!/BEGIN:VCALENDAR/i.test(icsText)) throw new Error("取得した内容が.ics形式ではありません");
  return icsText;
}

async function refreshCleCalendar() {
  const url = els.cleCalendarUrl?.value.trim() || state.cleCalendarUrl || "";
  setCleStatus("CLEカレンダーを取得中...");
  const text = await fetchCleCalendarText(url);
  const assignments = parseCleAssignments(text, "cle-calendar.ics");
  if (!assignments.length) {
    throw new Error("CLE課題を見つけられませんでした。課題期限が入ったCLEカレンダーを指定してください");
  }
  const result = importCleAssignments(assignments);
  const withCourse = assignments.filter((assignment) => assignment.course).length;
  state.cleCalendarUrl = url;
  saveState();
  setCleStatus(`${assignments.length}件を確認し、${result.added}件を追加、${result.updated}件の科目名を更新しました。科目名あり: ${withCourse}件`);
}

function setAiStatus(message, isError = false) {
  els.aiStatus.textContent = message;
  els.aiStatus.style.color = isError ? "var(--danger)" : "";
}

function setAiGradeStatus(message, isError = false) {
  els.aiGradeStatus.textContent = message;
  els.aiGradeStatus.style.color = isError ? "var(--danger)" : "";
}

function setAiDiaryStatus(message, isError = false) {
  if (!els.aiDiaryStatus) return;
  els.aiDiaryStatus.textContent = message;
  els.aiDiaryStatus.style.color = isError ? "var(--danger)" : "";
}

async function postAi(path, body) {
  const response = await fetch(`${getAiBaseUrl()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "AIサーバーに接続できませんでした");
  }
  return data;
}

async function postDiaryAi(body) {
  const proxyUrl = getProxyBaseUrl();
  const baseUrl = proxyUrl || getAiBaseUrl();
  if (!baseUrl) throw new Error("AIサーバーに接続できませんでした");
  const response = await fetch(`${baseUrl}/api/generate-diary`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "AI日記サーバーに接続できませんでした");
  }
  return data;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", () => reject(new Error("画像を読み込めませんでした")));
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

function renderAiDiary(entry) {
  if (!els.aiDiaryResult) return;
  if (!entry.aiDiary) {
    els.aiDiaryResult.hidden = true;
    els.aiDiaryResult.innerHTML = "";
    return;
  }

  els.aiDiaryResult.hidden = false;
  els.aiDiaryResult.innerHTML = `
    <div><strong>${escapeHtml(els.entryDate.value)}</strong><span>AI日記</span></div>
    <p>${escapeHtml(entry.aiDiary)}</p>
  `;
}

function getDiaryPayload() {
  const entry = getEntry();
  return {
    ...getAiPlanningPayload(),
    place: entry.place || "",
    context: entry.context || "",
    reflection: els.reflection.value.trim() || entry.reflection || "",
    tasks: entry.tasks,
  };
}

function createLocalDiary(payload) {
  const doneTasks = (payload.tasks || []).filter((task) => task.done);
  const minimumDone = doneTasks.filter((task) => task.minimum).map((task) => task.title);
  const extraDone = doneTasks.filter((task) => !task.minimum).map((task) => task.title);
  const health = payload.health || {};
  const screen = payload.screenTime || {};
  const parts = [];

  parts.push(`${payload.date}の記録。`);
  if (payload.place || payload.context) {
    parts.push(`${payload.place ? `場所は${payload.place}` : ""}${payload.place && payload.context ? "、" : ""}${payload.context ? `状況は${payload.context}` : ""}。`);
  }
  if (minimumDone.length || extraDone.length) {
    const taskText = [
      minimumDone.length ? `必要最低限として「${minimumDone.join("」「")}」` : "",
      extraDone.length ? `プラスアルファとして「${extraDone.join("」「")}」` : "",
    ].filter(Boolean).join("、");
    parts.push(`${taskText}に取り組めた。`);
  } else {
    parts.push("今日はまだ完了したタスクが少なく、次に何を進めるかを決め直す余地がある。");
  }
  if (health.steps || health.activeEnergy) {
    const healthText = [
      health.steps ? `歩数${Number(health.steps).toLocaleString()}歩` : "",
      health.activeEnergy ? `消費${Math.round(Number(health.activeEnergy)).toLocaleString()}kcal` : "",
    ].filter(Boolean).join("、");
    parts.push(`体の記録は${healthText}。`);
  }
  if (screen.totalMinutes) {
    parts.push(`スクリーンタイムは約${Math.round(Number(screen.totalMinutes) / 60 * 10) / 10}時間だった。`);
  }
  if (payload.reflection) {
    parts.push(`振り返り: ${payload.reflection}`);
  }
  parts.push("明日は、期限が近いものから一つずつ片付けて、今日より少しだけ前に進めたい。");
  return parts.join("\n");
}

els.entryDate.value = todayString;
els.goalDeadline.value = todayString;

els.todayViewButton.addEventListener("click", () => setView("today"));
els.todoViewButton?.addEventListener("click", () => setView("todo"));
els.healthViewButton?.addEventListener("click", () => setView("health"));
els.reviewViewButton?.addEventListener("click", () => setView("review"));
els.recordsViewButton.addEventListener("click", () => {
  setView("records");
});
els.planningGoalsButton?.addEventListener("click", () => setPlanningPane("goals"));
els.planningCalendarButton?.addEventListener("click", () => setPlanningPane("calendar"));
els.calendarAllButton?.addEventListener("click", () => setCalendarFilter("all"));
els.calendarGoalsButton?.addEventListener("click", () => setCalendarFilter("goals"));
els.calendarEventsButton?.addEventListener("click", () => setCalendarFilter("events"));

els.entryDate.addEventListener("change", () => {
  setCalendarMonthFromDate(els.entryDate.value);
  render();
});

els.prevMonth.addEventListener("click", () => {
  calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() - 1, 1);
  renderMonthlyCalendar();
});

els.nextMonth.addEventListener("click", () => {
  calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + 1, 1);
  renderMonthlyCalendar();
});

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

els.cleCalendarUrl?.addEventListener("change", () => {
  state.cleCalendarUrl = els.cleCalendarUrl.value.trim();
  saveState();
});

els.clePasteLink?.addEventListener("click", async () => {
  setCleStatus("コピーしたリンクを確認中...");
  try {
    if (navigator.clipboard?.readText) {
      const text = await navigator.clipboard.readText();
      setCleCalendarUrlFromText(text);
      return;
    }
    throw new Error("ブラウザのクリップボード読取が使えません");
  } catch {
    const handler = window.webkit?.messageHandlers?.nativeSync;
    if (!handler) {
      setCleStatus("リンク欄をクリックして、⌘Vで貼り付けてください", true);
      els.cleCalendarUrl?.focus();
      return;
    }
    handler.postMessage({ type: "readClipboard" });
  }
});

els.cleFetch?.addEventListener("click", async () => {
  els.cleFetch.disabled = true;
  try {
    await refreshCleCalendar();
  } catch (error) {
    setCleStatus(error.message || "CLEカレンダーを更新できませんでした", true);
  } finally {
    els.cleFetch.disabled = false;
  }
});

els.cleFile?.addEventListener("change", async () => {
  const file = els.cleFile.files && els.cleFile.files[0];
  if (!file) return;
  setCleStatus("読み込み中...");
  try {
    const text = await file.text();
    const assignments = parseCleAssignments(text, file.name);
    if (!assignments.length) {
      throw new Error("このファイルからCLE課題を見つけられませんでした。通常の予定.icsは下の「カレンダー予定」で読み込んでください");
    }
    const result = importCleAssignments(assignments);
    const withCourse = assignments.filter((assignment) => assignment.course).length;
    setCleStatus(`${result.added}件を追加、${result.updated}件の科目名を更新しました。科目名あり: ${withCourse}件`);
  } catch (error) {
    setCleStatus(error.message || "CLE課題を読み込めませんでした", true);
  } finally {
    els.cleFile.value = "";
  }
});

els.clePaste?.addEventListener("click", async () => {
  setCleStatus("クリップボードを確認中...");
  try {
    const text = await navigator.clipboard.readText();
    if (!text.trim()) throw new Error("クリップボードが空です。CLEの課題一覧をコピーしてから押してください");
    const assignments = parseCleAssignments(text, "cle-copy.txt");
    if (!assignments.length) {
      throw new Error("貼り付け内容から課題期限を見つけられませんでした。課題名と期限が一緒に見える範囲をコピーしてください");
    }
    const result = importCleAssignments(assignments);
    const withCourse = assignments.filter((assignment) => assignment.course).length;
    setCleStatus(`${result.added}件を追加、${result.updated}件の科目名を更新しました。科目名あり: ${withCourse}件`);
  } catch (error) {
    setCleStatus(error.message || "貼り付けから読み込めませんでした", true);
  }
});

els.suggestTasks.addEventListener("click", async () => {
  setAiStatus("考え中...");
  els.suggestTasks.disabled = true;
  try {
    const result = await postAi("/api/suggest-tasks", getAiPlanningPayload());
    renderAiSuggestions(result);
    setAiStatus("提案しました");
  } catch (error) {
    setAiStatus(error.message, true);
  } finally {
    els.suggestTasks.disabled = false;
  }
});

els.suggestWeight.addEventListener("click", async () => {
  const title = els.taskTitle.value.trim();
  if (!title) {
    setAiStatus("先にタスク名を入力してください", true);
    els.taskTitle.focus();
    return;
  }

  const entry = getEntry();
  setAiStatus("重みを考え中...");
  els.suggestWeight.disabled = true;
  try {
    const result = await postAi("/api/suggest-weight", {
      ...getAiPlanningPayload(),
      taskTitle: title,
    });
    els.taskWeight.value = String(result.weight || 3);
    setAiStatus(result.reason ? `重み ${result.weight}: ${result.reason}` : `重み ${result.weight} を提案しました`);
  } catch (error) {
    setAiStatus(error.message, true);
  } finally {
    els.suggestWeight.disabled = false;
  }
});

els.evaluateDay.addEventListener("click", async () => {
  const entry = getEntry();
  if (!entry.tasks.length && !entry.reflection.trim()) {
    setAiGradeStatus("タスクか振り返りを入力してから評価してください", true);
    return;
  }

  setAiGradeStatus("今日を評価中...");
  els.evaluateDay.disabled = true;
  try {
    const gradeRule = getGradeRuleDetails(entry.tasks);
    const result = await postAi("/api/evaluate-day", {
      ...getAiPlanningPayload(),
      reflection: entry.reflection || "",
      ruleSuggestedGrade: gradeRule.grade,
      gradeRule,
      tasks: entry.tasks,
      gradeDefinitions: gradeLabels,
    });
    if (!gradeOrder.includes(result.grade)) {
      throw new Error("AI評価の形式を読み取れませんでした");
    }
    currentGrade = result.grade;
    entry.grade = result.grade;
    entry.aiGradeReason = result.reason || "";
    render();
    setAiGradeStatus("AI評価を反映しました");
  } catch (error) {
    setAiGradeStatus(error.message, true);
  } finally {
    els.evaluateDay.disabled = false;
  }
});

els.generateDiary?.addEventListener("click", async () => {
  const entry = getEntry();
  if (!entry.tasks.length && !els.reflection.value.trim() && !els.entryContext.value.trim()) {
    setAiDiaryStatus("日記生成には、タスク・状況メモ・今日の振り返りのどれかを入力してください", true);
    return;
  }

  setAiDiaryStatus("日記を生成中...");
  els.generateDiary.disabled = true;
  try {
    const payload = getDiaryPayload();
    let result;
    try {
      result = await postDiaryAi(payload);
    } catch (error) {
      const message = String(error.message || "");
      if (!/未対応|not found|404|Cannot POST|AIサーバーに接続できません/i.test(message)) throw error;
      result = {
        diary: createLocalDiary(payload),
        fallback: true,
      };
    }
    if (!result.diary) throw new Error("AI日記の形式を読み取れませんでした");
    entry.aiDiary = result.diary;
    saveState();
    render();
    setAiDiaryStatus(result.fallback ? "AIサーバー未対応のため、アプリ内で日記下書きを作りました" : "AI日記を生成しました");
  } catch (error) {
    setAiDiaryStatus(error.message, true);
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
    await new Promise((resolve) => setTimeout(resolve, 20));
    const text = await file.text();
    const isJson = file.name.toLowerCase().endsWith(".json") || text.trim().startsWith("{") || text.trim().startsWith("[");
    const healthByDate = isJson ? parseHealthJsonByDate(text, els.entryDate.value) : parseAppleHealthXmlByDate(text);
    const dayCount = importHealthByDate(healthByDate);
    els.healthStatus.textContent = `${dayCount}日分のヘルスケア情報を読み込みました`;
  } catch (error) {
    els.healthStatus.textContent = error.message || "ヘルスケア情報を読み込めませんでした";
    els.healthStatus.style.color = "var(--danger)";
  } finally {
    els.healthFile.value = "";
  }
});

els.healthShortcutSync?.addEventListener("click", () => {
  runHealthShortcut();
});

els.calendarFile.addEventListener("change", async () => {
  const files = Array.from(els.calendarFile.files || []);
  if (!files.length) return;

  els.calendarStatus.textContent = "読み込み中...";
  els.calendarStatus.style.color = "";
  try {
    const parsedList = await Promise.all(files.map(async (file) => parseCalendarIcs(await file.text())));
    const calendarByDate = parsedList.reduce((merged, item) => mergeCalendarByDate(merged, item), {});
    state.calendarByDate = mergeCalendarByDate(state.calendarByDate, calendarByDate);
    render();
    const eventCount = Object.values(calendarByDate).reduce((total, events) => total + events.length, 0);
    els.calendarStatus.textContent = `${files.length}個のicsから${eventCount}件、${Object.keys(calendarByDate).length}日分の予定を読み込みました`;
  } catch (error) {
    els.calendarStatus.textContent = error.message || "カレンダー予定を読み込めませんでした";
    els.calendarStatus.style.color = "var(--danger)";
  } finally {
    els.calendarFile.value = "";
  }
});

els.clearCalendar.addEventListener("click", () => {
  state.calendarByDate = {};
  render();
  els.calendarStatus.textContent = "読み込んだ予定を消しました";
  els.calendarStatus.style.color = "";
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
    els.screenStatus.textContent = `${els.entryDate.value} のスクリーンタイムを読み込みました`;
  } catch (error) {
    els.screenStatus.textContent = error.message || "スクリーンタイムを読み込めませんでした";
    els.screenStatus.style.color = "var(--danger)";
  } finally {
    els.screenFile.value = "";
  }
});

els.screenShotFile.addEventListener("change", async () => {
  const files = Array.from(els.screenShotFile.files || []);
  if (!files.length) return;

  els.screenStatus.textContent = `${files.length}枚のスクショをAIで読み取り中...`;
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
    const screenTime = {
      importedAt: new Date().toISOString(),
      sourceDate: result.date || els.entryDate.value,
      totalMinutes: Number(result.totalMinutes) || 0,
      categories: result.categories || [],
      apps: Array.isArray(result.apps) ? result.apps : [],
      source: "screenshot",
    };
    getEntry().screenTime = screenTime;
    render();
    els.screenStatus.textContent = "スクショからスクリーンタイムを読み込みました";
  } catch (error) {
    els.screenStatus.textContent = error.message || "スクショを読み込めませんでした";
    els.screenStatus.style.color = "var(--danger)";
  } finally {
    els.screenShotFile.value = "";
  }
});

els.taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = els.taskTitle.value.trim();
  if (!title) return;

  const entry = getEntry();
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
  state = structuredClone(initialState);
  render();
});

els.exportSyncFile?.addEventListener("click", () => {
  try {
    exportSyncFile();
  } catch (error) {
    setSyncStatus(error.message || "同期ファイルを書き出せませんでした", true);
  }
});

els.importSyncFile?.addEventListener("change", async () => {
  const file = els.importSyncFile.files && els.importSyncFile.files[0];
  if (!file) return;
  setSyncStatus("同期ファイルを読み込み中...");
  try {
    await importSyncFile(file);
  } catch (error) {
    setSyncStatus(error.message || "同期ファイルを読み込めませんでした", true);
  } finally {
    els.importSyncFile.value = "";
  }
});

els.syncLogin?.addEventListener("click", async () => {
  setSyncStatus("ログイン中...");
  try {
    await loginForSync(false);
  } catch (error) {
    setSyncStatus(error.message || "ログインできませんでした", true);
  }
});

els.syncRegister?.addEventListener("click", async () => {
  setSyncStatus("登録中...");
  try {
    await loginForSync(true);
  } catch (error) {
    setSyncStatus(error.message || "登録できませんでした", true);
  }
});

els.syncLogout?.addEventListener("click", () => {
  saveAuthSession(null);
  if (els.syncPassword) els.syncPassword.value = "";
  setSyncStatus("同期設定を解除しました");
});

els.cloudSyncSave?.addEventListener("click", async () => {
  setSyncStatus("クラウドへ保存中...");
  try {
    await saveCloudState();
  } catch (error) {
    setSyncStatus(error.message || "クラウドへ保存できませんでした", true);
  }
});

els.cloudSyncLoad?.addEventListener("click", async () => {
  setSyncStatus("クラウドから読み込み中...");
  try {
    await loadCloudState();
  } catch (error) {
    setSyncStatus(error.message || "クラウドから読み込めませんでした", true);
  }
});

render();
importHealthFromShortcutUrl();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  });
}
