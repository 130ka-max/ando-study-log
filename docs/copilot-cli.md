# Copilot CLI 互換メモ

このドキュメントは、Codex向けに作成された学習ハーネスを Copilot CLI 環境でも使いやすくするための短い補足です。

要点:

- プロンプトは agent に依存しないよう設計済みです。prompts/ 以下の Markdown をそのまま Copilot セッションで利用できます。
- 学習ログ・Issue のフォーマットやチェックは `npm run check`（scripts/check-learning-harness.mjs）が担います。変更をマージする前に必ず実行してください。
- GitHub ラベル同期は `npm run sync-labels` を使います（`gh auth login` が必要）。
- 学習アーティファクトの言語は日本語が基本です。Copilot セッションでも日本語を優先してください。

運用例:

- Copilot CLI でプロンプトを使う場合は prompts/*.md の該当ブロックをコピーしてセッションに貼り、必要なモード（例: ヒントモード、添削モード）を明示してください。
- 自動化やスクリプト呼び出しは従来どおり package.json のスクリプトを使えます（Node.js >=14.6 が必要）。

互換性方針:

- 既存の "Codex" 表記は "Codex / Copilot" として併記し、どちらの環境でも意味が通るようにしました。
- 将来的に Copilot 固有のワークフロー（CLI フラグやセッション API）を追加する場合は、`scripts/` に adapter スクリプトを置き、README とここに追記してください。
