const storageKey = "goal-task-journal-v2";

const gradeOrder = ["S", "A", "B", "C", "F"];
const gradeLabels = {
  S: "必要最低限をこなし、獲得重みが10を超えた",
  A: "Bにおいて程度が高いもの",
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
  calendarFile: document.querySelector("#calendarFile"),
  clearCalendar: document.querySelector("#clearCalendar"),
  calendarSummary: document.querySelector("#calendarSummary"),
  calendarStatus: document.querySelector("#calendarStatus"),
  evaluateDay: document.querySelector("#evaluateDay"),
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
  runHealthShortcut: document.querySelector("#runHealthShortcut"),
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
let currentGrade = "F";
let currentView = "today";
let timerTick = null;

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

function setView(view) {
  currentView = view === "records" ? "records" : "today";
  els.todayView.classList.toggle("active", currentView === "today");
  els.recordsView.classList.toggle("active", currentView === "records");
  els.todayViewButton.classList.toggle("active", currentView === "today");
  els.recordsViewButton.classList.toggle("active", currentView === "records");
}

function getAiBaseUrl() {
  if (location.protocol === "file:") return "http://127.0.0.1:8787";
  return "";
}

function getAppUrlWithoutHealthParams() {
  return `${location.origin}${location.pathname}`;
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

  return state.entries[date];
}

function pruneGoals() {
  state.goals = (state.goals || []).filter((goal) => goal.deadline >= todayString);
}

function getActiveGoalText() {
  pruneGoals();
  return (state.goals || []).map((goal) => `${goal.title}（期限: ${goal.deadline}）`).join("\n");
}

function getHealthForDate(date = els.entryDate.value) {
  const entry = getEntry(date);
  return entry.health || state.healthByDate?.[date] || null;
}

function getCalendarEventsForDate(date = els.entryDate.value) {
  return state.calendarByDate?.[date] || [];
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

function renderGoals() {
  els.goalList.innerHTML = "";
  (state.goals || []).forEach((goal) => {
    const item = document.createElement("li");
    item.className = "goal-item";
    item.innerHTML = `
      <div class="goal-main">
        <strong>${escapeHtml(goal.title)}</strong>
        <span>期限 ${escapeHtml(goal.deadline)}</span>
      </div>
      <button type="button" class="ghost">達成</button>
      <button type="button" class="icon-button" aria-label="削除">×</button>
    `;

    item.querySelector(".ghost").addEventListener("click", () => {
      state.goals = state.goals.filter((entry) => entry.id !== goal.id);
      render();
    });

    item.querySelector(".icon-button").addEventListener("click", () => {
      state.goals = state.goals.filter((entry) => entry.id !== goal.id);
      render();
    });

    els.goalList.append(item);
  });
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
    drawInlineBarChart(els.healthTodayChart, [], {
      color: "#0f766e",
      unit: "",
      emptyText: "ヘルスケア情報なし",
    });
    return;
  }

  const metrics = [
    ["歩数", `${Number(health.steps || 0).toLocaleString()}歩`],
    ["睡眠", formatMinutes(health.sleepMinutes || 0)],
    ["ワークアウト", formatMinutes(health.workoutMinutes || 0)],
    ["消費エネルギー", `${Math.round(health.activeEnergy || 0).toLocaleString()}kcal`],
  ];

  metrics.forEach(([label, value]) => {
    const item = document.createElement("div");
    item.className = "health-metric";
    item.innerHTML = `<span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong>`;
    els.healthSummary.append(item);
  });

  drawInlineBarChart(
    els.healthTodayChart,
    [
      { label: "歩数", value: Number(health.steps || 0) / 8000, display: `${Number(health.steps || 0).toLocaleString()}歩` },
      { label: "睡眠", value: Number(health.sleepMinutes || 0) / 420, display: `${(Number(health.sleepMinutes || 0) / 60).toFixed(1)}h` },
      { label: "運動", value: Number(health.workoutMinutes || 0) / 30, display: `${Math.round(health.workoutMinutes || 0)}分` },
      { label: "消費", value: Number(health.activeEnergy || 0) / 500, display: `${Math.round(health.activeEnergy || 0).toLocaleString()}kcal` },
    ],
    { color: "#0f766e", unit: "" }
  );
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
      <p>${done} / ${entry.tasks.length} タスク完了</p>
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

  const maxValue = Math.max(...rows.map((row) => row.value), options.goal || 0, 1);
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
  const rows = chartEntries.map(({ date, entry }) => ({
    date,
    label: date,
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
    sleepMinutes: Math.round(numberFromKeys(item, ["sleepMinutes", "sleep", "睡眠分", "睡眠"])),
    workoutMinutes: Math.round(numberFromKeys(item, ["workoutMinutes", "workout", "exerciseMinutes", "運動分", "ワークアウト分", "ワークアウト"])),
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

function getHealthPayloadFromUrl() {
  const searchParams = new URLSearchParams(location.search);
  const hashText = location.hash.startsWith("#") ? location.hash.slice(1) : location.hash;
  const hashParams = new URLSearchParams(hashText);
  return searchParams.get("health") || searchParams.get("healthJson") || hashParams.get("health") || hashParams.get("healthJson");
}

function importHealthFromUrlIfPresent() {
  const payload = getHealthPayloadFromUrl();
  if (!payload) return;

  try {
    const healthByDate = parseHealthJsonByDate(payload, els.entryDate.value);
    const dayCount = importHealthByDate(healthByDate);
    els.healthStatus.textContent = `ショートカットから${dayCount}日分のヘルスケア情報を読み込みました`;
    els.healthStatus.style.color = "";
    history.replaceState(null, "", getAppUrlWithoutHealthParams());
  } catch (error) {
    els.healthStatus.textContent = error.message || "ショートカットのヘルスケア情報を読み込めませんでした";
    els.healthStatus.style.color = "var(--danger)";
  }
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
  const dateOnly = text.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (dateOnly) {
    return {
      iso: `${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]}`,
      date: `${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]}`,
      allDay: true,
    };
  }

  const match = text.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/);
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

  lines.forEach((line) => {
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
    const rawKey = line.slice(0, separator).split(";")[0];
    current[rawKey] = line.slice(separator + 1);
  });

  return byDate;
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
      calendarEvents: getCalendarEventsForDate(),
      health: getHealthForDate() || null,
      screenTime: entry.screenTime || null,
      currentTasks: entry.tasks,
      recentEntries: getRecentEntries(),
    });
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
    const result = await postAi("/api/evaluate-day", {
      goal: getActiveGoalText(),
      date: els.entryDate.value,
      place: entry.place || "",
      context: entry.context || "",
      reflection: entry.reflection || "",
      calendarEvents: getCalendarEventsForDate(),
      health: getHealthForDate() || null,
      screenTime: entry.screenTime || null,
      ruleSuggestedGrade: suggestGrade(entry.tasks),
      tasks: entry.tasks,
      recentEntries: getRecentEntries(),
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

els.runHealthShortcut.addEventListener("click", () => {
  const shortcutName = "GoalTaskHealth";
  const returnUrl = `${getAppUrlWithoutHealthParams()}?health=`;
  const shortcutUrl = `shortcuts://run-shortcut?name=${encodeURIComponent(shortcutName)}&input=text&text=${encodeURIComponent(returnUrl)}`;
  els.healthStatus.textContent = `ショートカット「${shortcutName}」を起動します`;
  els.healthStatus.style.color = "";
  location.href = shortcutUrl;
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

render();
importHealthFromUrlIfPresent();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  });
}
