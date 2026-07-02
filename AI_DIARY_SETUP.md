# AI日記生成を完全無料ホスティングで使う

GitHub PagesにはOpenAI APIキーを置けません。AI日記生成だけCloudflare Workersに置きます。

## 追加で使うもの

- GitHub Pages: アプリ画面
- Supabase Free: ログインと同期
- Cloudflare Workers Free: AI日記API
- OpenAI APIキー: 教授から許可を得たもの

## 手順

1. `cloudflare-ai-diary-worker` フォルダの中身をCloudflare Workerへデプロイする。
2. Workerに次の環境変数を設定する。

```text
ALLOWED_ORIGIN=https://YOUR_GITHUB_USERNAME.github.io
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
OPENAI_MODEL=gpt-4o-mini
```

3. WorkerのSecretに `OPENAI_API_KEY` を設定する。

```bash
npx wrangler secret put OPENAI_API_KEY
```

4. デプロイ後のWorker URLを `cloud-config.js` に入れる。

```js
window.GTJ_AI_PROXY_URL = "https://goal-task-journal-ai-diary.YOUR_SUBDOMAIN.workers.dev";
```

OpenAI APIキーは `cloud-config.js` に書かないでください。

## 使い方

1. GitHub PagesのアプリでSupabaseにログインする。
2. タスクや状況メモを入力する。
3. `AIで日記生成` を押す。

生成された日記は `今日の振り返り` 欄に入ります。
