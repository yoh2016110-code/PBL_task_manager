# yoh2016110-code側にCloudflare Workerをデプロイする手順

このWorkerは、Web版アプリの次の機能を担当します。

- AIタスク提案
- AI重み提案
- AI評価
- AI日記
- CLEカレンダー `.ics` の取得

## 1. Terminalでフォルダへ移動

```bash
cd "/Users/y.uchida/Documents/New project 2/cloudflare-ai-diary-worker"
```

## 2. Cloudflareにログイン

```bash
npx wrangler login
```

ブラウザが開いたら、`yoh2016110-code` で使いたいCloudflareアカウントでログインして許可します。

## 3. OpenAI APIキーをWorkerのSecretに入れる

```bash
npx wrangler secret put OPENAI_API_KEY
```

貼り付けを求められたら、OpenAI APIキーを貼り付けてEnterを押します。

注意: OpenAI APIキーは `cloud-config.js` には書かないでください。

## 4. デプロイ

```bash
npx wrangler deploy
```

成功すると、次のようなURLが表示されます。

```text
https://pbl-task-manager.yoh2016110-code.workers.dev
```

表示されたURLが違う場合は、Web版の `cloud-config.js` の `GTJ_AI_PROXY_URL` をそのURLに合わせます。

## 5. Web版をGitHubにアップロード

`/Users/y.uchida/Documents/New project 2/PBL_task_manager_preserve_merge_upload 4/cloud-config.js` は、すでに次のURLに設定済みです。

```js
window.GTJ_AI_PROXY_URL = "https://pbl-task-manager.yoh2016110-code.workers.dev/";
```

Workerをデプロイした後に、Web版のファイルをGitHubへアップロードしてください。

## うまくいかない時

- `Could not resolve host` が出る: まだWorkerがデプロイされていません。
- `ログインが必要です` が出る: Web版でログインしてからCLE更新やAI機能を使ってください。
- `OPENAI_API_KEYが設定されていません` が出る: `npx wrangler secret put OPENAI_API_KEY` をもう一度実行してください。
- URLが違う: Cloudflareが表示した実際のWorker URLを `cloud-config.js` に入れてください。
