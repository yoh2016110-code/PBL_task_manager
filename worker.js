const jsonHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = String(env.ALLOWED_ORIGIN || "").split(",").map((item) => item.trim()).filter(Boolean);
  const allowOrigin = allowed.includes(origin) ? origin : allowed[0] || "*";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

function json(data, status = 200, request, env) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...jsonHeaders,
      ...(request && env ? corsHeaders(request, env) : {}),
    },
  });
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    throw new Error("JSONを読み取れませんでした。");
  }
}

async function requireUser(request, env) {
  const auth = request.headers.get("Authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new Error("ログインが必要です。");

  const response = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error("ログインが必要です。");
  return response.json();
}

function compact(value) {
  return JSON.stringify(value, null, 2).slice(0, 12000);
}

async function callOpenAI(env, messages, schemaHint) {
  if (!env.OPENAI_API_KEY) throw new Error("WorkerにOPENAI_API_KEYが設定されていません。");
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "あなたは学習と生活管理を支援する日本語のAIです。必ずJSONだけで返してください。" +
            (schemaHint ? ` 期待する形式: ${schemaHint}` : ""),
        },
        ...messages,
      ],
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.message || "OpenAI APIでエラーが発生しました。");
  const content = data.choices?.[0]?.message?.content || "{}";
  try {
    return JSON.parse(content);
  } catch {
    throw new Error("AIの返答をJSONとして読み取れませんでした。");
  }
}

async function fetchIcs(request, env) {
  await requireUser(request, env);
  const body = await readJson(request);
  const url = String(body.url || "").trim().replace(/^webcal:/i, "https:");
  if (!/^https:\/\//i.test(url)) throw new Error("httpsまたはwebcalのカレンダーURLを指定してください。");

  const response = await fetch(url, {
    headers: {
      "User-Agent": "PBL-task-manager/1.0",
      Accept: "text/calendar,text/plain,*/*",
    },
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`カレンダーを取得できませんでした。HTTP ${response.status}`);
  return { text };
}

async function suggestTasks(request, env) {
  await requireUser(request, env);
  const body = await readJson(request);
  return callOpenAI(
    env,
    [
      {
        role: "user",
        content: `次の情報から今日のタスク案を3から6件作ってください。必要最低限のタスクと追加タスクを分け、重要度weightは1から5にしてください。\n${compact(body)}`,
      },
    ],
    '{"summary":"短い説明","tasks":[{"title":"タスク名","weight":3,"minimum":true,"reason":"理由"}]}'
  );
}

async function suggestWeight(request, env) {
  await requireUser(request, env);
  const body = await readJson(request);
  return callOpenAI(
    env,
    [
      {
        role: "user",
        content: `このタスクの重要度を1から5で提案してください。理由は短くしてください。\n${compact(body)}`,
      },
    ],
    '{"weight":3,"reason":"理由"}'
  );
}

async function evaluateDay(request, env) {
  await requireUser(request, env);
  const body = await readJson(request);
  return callOpenAI(
    env,
    [
      {
        role: "user",
        content:
          "1日の成果をS,A,B,C,Fのどれかで評価してください。ヘルスケア、スクリーンタイム、予定、タスクの完了状況を加味してください。" +
          "必要最低限をこなし、追加タスクの獲得重みが10を超える場合はSを検討してください。\n" +
          compact(body),
      },
    ],
    '{"grade":"A","reason":"理由"}'
  );
}

async function generateDiary(request, env) {
  await requireUser(request, env);
  const body = await readJson(request);
  return callOpenAI(
    env,
    [
      {
        role: "user",
        content: `今日の日記を日本語で120から250字程度で作ってください。反省だけでなく、次につながる一文も入れてください。\n${compact(body)}`,
      },
    ],
    '{"diary":"日記本文"}'
  );
}

const routes = {
  "/api/fetch-ics": fetchIcs,
  "/api/suggest-tasks": suggestTasks,
  "/api/suggest-weight": suggestWeight,
  "/api/evaluate-day": evaluateDay,
  "/api/generate-diary": generateDiary,
};

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders(request, env) });
    const url = new URL(request.url);
    const handler = routes[url.pathname];
    if (!handler || request.method !== "POST") return json({ error: "Not found" }, 404, request, env);
    try {
      const result = await handler(request, env);
      return json(result, 200, request, env);
    } catch (error) {
      const message = error?.message || "サーバーでエラーが発生しました。";
      const status = message.includes("ログイン") ? 401 : 400;
      return json({ error: message }, status, request, env);
    }
  },
};
