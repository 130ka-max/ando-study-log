# Codex Study Harness 超詳細ユーザーガイド

このドキュメントは、`codex-study-harness`（学習ハーネス）を初めて使う人から、内部の仕組みまで知りたい人までを対象にした、すべてを1つにまとめた詳細ガイドです。

- 対象読者: 学習者本人（中学生〜）、保護者、先生、リポジトリを保守する人
- 前提知識: GitHubの基本操作。コマンドの細かい意味はこのガイドで補足します。
- 関連ドキュメント: 概要は [README.md](../README.md)、AIの行動規約は [AGENTS.md](../AGENTS.md)、ラベルは [docs/labels.md](labels.md)、自動記録は [docs/auto-recording-workflow.md](auto-recording-workflow.md)。

---

## 目次

1. [このハーネスは何のためのものか](#1-このハーネスは何のためのものか)
2. [全体アーキテクチャ](#2-全体アーキテクチャ)
3. [登場人物とフォルダーの役割](#3-登場人物とフォルダーの役割)
4. [初期セットアップ（手順を1つずつ）](#4-初期セットアップ手順を1つずつ)
5. [1回の学習の流れ（開始から公開まで）](#5-1回の学習の流れ開始から公開まで)
6. [ハーネス開始の詳細](#6-ハーネス開始の詳細)
7. [学習モード6種類](#7-学習モード6種類)
8. [ハーネス終了とClose前チェック](#8-ハーネス終了とclose前チェック)
9. [Issueラベル完全リファレンス](#9-issueラベル完全リファレンス)
10. [Issueテンプレートと学習ログ構造](#10-issueテンプレートと学習ログ構造)
11. [スクリプト詳細リファレンス](#11-スクリプト詳細リファレンス)
12. [思考の道すじはどう判定されるか](#12-思考の道すじはどう判定されるか)
13. [GitHub Pages公開の仕組み](#13-github-pages公開の仕組み)
14. [品質チェック（npm run check）の中身](#14-品質チェックnpm-run-checkの中身)
15. [トラブルシューティング](#15-トラブルシューティング)
16. [よくある質問](#16-よくある質問)
17. [用語集](#17-用語集)

---

## 1. このハーネスは何のためのものか

学習ハーネスは、**AIに宿題を丸投げするためのものではありません**。AI（Codex / GitHub Copilot）を「家庭教師・添削者・復習計画の補助者」として使い、**学習者自身がどう考えたか**を、あとから読める形で残すための仕組みです。

残したいのは「答え」ではなく、次の思考の道すじです。

```text
問い → 予想 → 確認 → 考え直し → 気づき → 次に使う
```

この6段階が1つの「思考の一周（学習ループ）」です。ハーネスは、GitHub Issueでの会話とコメントから、この一周を機械的に拾い上げ、中学生にも読めるHTMLレポートとして公開します。点数表ではなく、**考えがどう深まったかを見せるページ**です。

中心となる思想（[AGENTS.md](../AGENTS.md) より）:

- AIは最初から最終解答を出さない。まず学習者の理解を確認する。
- 「何を調べたか」だけでなく「**なぜその見方の方が筋がよいとわかったか**」まで書く。
- 知見ログには最低1つ、次のような文を含める。
  - 「最初はAと考えたが、Bを確認してCと考えるようになった」
  - 「この問題では、AではなくBを分けて考える必要がある」
  - 「次に同じ型の問題を見るときは、A、B、Cの順に確認する」

---

## 2. 全体アーキテクチャ

```text
┌─────────────────────────────────────────────────────────────────┐
│ 学習者 ── 会話 ──> AI(Codex/Copilot)                              │
│                      │  prompts/*.md の方針で振る舞う              │
│                      ▼                                            │
│              GitHub Issue（1テーマ＝1学習カード）                  │
│                ├─ ラベル: subject/type/status/needs/...           │
│                ├─ 本文: テンプレート(.github/ISSUE_TEMPLATE)        │
│                └─ コメント: 問い/予想/確認/考え直し/気づき/次に使う │
│                      │                                            │
│        learning-log/YYYY-MM-DD-topic.md（区切りの振り返り）        │
│                      │                                            │
│   ┌──────────────────┴───────────────────┐                        │
│   ▼ (Issue Close または手動実行)          ▼ (PR/push)              │
│ .github/workflows/portfolio.yml      .github/workflows/quality.yml│
│   ├─ npm run build:portfolio          └─ npm run check            │
│   │    → public/index.html                 (テンプレ/ログ検証)    │
│   │      public/portfolio.md                                      │
│   ├─ npm run harness:end-report                                   │
│   │    → public/thinking-depth.html / .md                         │
│   │      public/thinking-depth/issue-N.html / .md                 │
│   └─ GitHub Pages へデプロイ + Markdownをartifact化               │
└─────────────────────────────────────────────────────────────────┘
```

データの流れを一言で言うと: **会話 → Issue/ログ（Markdown） → スクリプトが見出しを解析 → HTML/Markdownレポート → GitHub Pages公開**。

技術スタック:

- Node.js（ESM。`package.json` の `"type": "module"`）。CIは Node 24、ローカル目安は [.nvmrc](../.nvmrc) の 18 以上（スクリプトは Node.js >= 14.6 で動作）。
- 唯一の依存は `yaml`（Issueテンプレートの検証用、devDependency）。
- GitHub CLI（`gh`）— ラベル同期とIssue操作に使用。
- テストフレームワークやリンターはなし。検証は `npm run check` に一本化。

---

## 3. 登場人物とフォルダーの役割

| パス | 役割 |
| --- | --- |
| `README.md` | 使い方の入口。最初に覚える合図とコマンド。 |
| `AGENTS.md` | AIが守る行動規約。開始/終了の手順、禁止事項、知見化の原則。 |
| `.github/ISSUE_TEMPLATE/` | 学習Issueを作るときの3種テンプレート（学習課題/間違いレビュー/問題提起）。 |
| `.github/workflows/portfolio.yml` | Issue CloseでGitHub Pagesへレポートを公開。 |
| `.github/workflows/quality.yml` | PR/pushで `npm run check` を実行。 |
| `.github/copilot-instructions.md` | Copilotセッション向けの英語の運用メモ。 |
| `.github/pull_request_template.md` | PR本文の必須見出しテンプレート。`Closes #` を含む。 |
| `config/labels.json` | ラベルの正本（名前・説明・色）。`sync-labels` が読む。 |
| `docs/` | 運用ルール・チェックリスト・テンプレートの詳細。 |
| `goals/` | 長期・月間・週間の目標（自由記入の枠）。 |
| `learning-log/` | 学習の区切りごとの振り返りMarkdown。 |
| `prompts/` | AIに渡す方針プロンプト（自動記録/ソクラテス式/添削/誤り分析）。 |
| `scripts/` | 検証・ラベル同期・レポート生成のNodeスクリプト4本。 |
| `public/` | 自動生成物の出力先。通常はコミットしない。 |

`prompts/` の4ファイルの使い分け:

- `auto-issue-recorder.md` — 会話を自動でIssue/ログに記録する中心プロンプト。開始時一周記録のテンプレート、コメント形式、終了コメント形式を定義。
- `socratic-tutor.md` — 答えを出さず問いで導く。1返信あたりヒントは最大2つ。
- `answer-reviewer.md` — 解答添削。判定/よい点/修正点/間違いの原因/次に見るポイント/類題の形式。
- `mistake-analyzer.md` — 間違いの原因分類（知識不足・読み落とし・条件整理不足・計算ミス・用語・解法選択・時間配分）。

---

## 4. 初期セットアップ（手順を1つずつ）

このリポジトリは**テンプレートリポジトリ**として使います。

### 4.1 自分用にコピー

1. GitHubでこのリポジトリを「Use this template（Template repository）」でコピー。
2. コピーしたリポジトリをCodexまたはローカルで開く。

### 4.2 依存パッケージのインストール

```powershell
npm install
```

`yaml` が入ります。`package-lock.json` がある環境（CI）では `npm ci` が使われます。

### 4.3 壊れていないか確認

```powershell
npm run check
```

`Learning harness quality checks passed.` と出れば正常。失敗時は不足項目が一覧表示されます（詳細は[第14章](#14-品質チェックnpm-run-checkの中身)）。

### 4.4 GitHub CLIにログイン

ラベル同期やIssue操作に必要です。

```powershell
gh auth login
```

### 4.5 ラベルを作成

```powershell
npm run sync-labels
```

`config/labels.json` の全ラベルをGitHub上に作成（既存なら更新）します。

### 4.6 GitHub Pagesを設定

リポジトリ画面で `Settings → Pages → Build and deployment → Source` を開き、**`GitHub Actions`** を選びます。

> ⚠️ `Deploy from a branch` にはしない。このリポジトリは `Portfolio` workflow がHTMLを生成してPagesに公開する方式です。

セットアップはこれで完了です。

---

## 5. 1回の学習の流れ（開始から公開まで）

1回の学習セッションの理想的な全体像です。

```text
[1] 学習者: 「ハーネススタート」＋ 教科・テーマ・わからないこと・自分の考え
      │
[2] AI: 不足情報を確認 → ラベル整理 → Issue作成/追記
      │   開始時一周記録（## 問題提起 / ## 学習者の仮説・考え / ## 次の確認問題）
      │   学習ブランチ作成: study/YYYYMMDD-issue-N-topic-slug
      │
[3] 学習（モード指定: ヒント/添削/解説/類題/振り返り/テスト）
      │   会話の節目ごとにIssueコメントへ追記（思考の一周を残す）
      │
[4] 区切りで learning-log/YYYY-MM-DD-topic.md を作成/更新
      │
[5] 学習者: 「ハーネス終了」
      │
[6] AI: Close前チェック（7項目）
      │   不足 → Issueは閉じず、未完了タスクを提示
      │   充足 → 終了コメント追記 → 思考深化HTML生成
      │
[7] 学習ブランチをコミット/PR化 → main へ合流
      │   （PR本文に Closes #N を書くと自動Close）
      │
[8] main 合流後に Issue を Close
      │
[9] Portfolio workflow が起動 → GitHub Pages 公開
```

**順序が最重要**: 必ず「**main合流 → Issue Close**」の順。Issueを先に閉じると、`Portfolio` workflow が古い `main` の内容でレポートを作ってしまいます。

---

## 6. ハーネス開始の詳細

### 6.1 開始の合図

次のような表現が「開始ニュアンス」として扱われます。

- `ハーネススタート` / `ハーネス開始`
- `学習ハーネスを始めて` / `ハーネス始めよう`
- `学習を開始したい` / `このテーマでハーネスを使いたい`

ただし「『開始』という言葉の意味を教えて」のように学習意図がない場合は開始しません。

### 6.2 AIが確認する6項目

すでに会話に書かれている項目は聞き直さず、**不足分だけ**短く確認します。

1. 今日の教科・テーマ
2. 何ができるようになりたいか
3. 今わかっていること
4. わからないこと（または間違えた問題）
5. まず自分で考えたこと
6. 希望する学習モード

### 6.3 開始時ラベル整理（必須処理）

Issue作成/最初のコメントの**前**に、ラベルを整える必須処理です。最低限：

- `type:*` を必ず1つ
- `status:*` を必ず1つ（開始時は原則 `status:ready`）
- `portfolio:*` を必ず1つ（`show` と `hide` は排他）

判断できれば `subject:*`、`needs:*`、`difficulty:*` も付与。種別に迷う場合の仮決め基準は[第9章](#9-issueラベル完全リファレンス)を参照。判断材料が足りない場合は安全な仮ラベル（`type:question` 等）を付け、コメントに「仮ラベル」と明記します。

### 6.4 開始時一周記録（必須処理）

最初のIssue作成または最初のコメントに、**同じコメント内**で次の3見出しを必ず入れます（言い換え禁止・省略禁止）。

- `## 問題提起` → 思考ループ判定で「問い」として読まれる
- `## 学習者の仮説・考え` → 「仮説」として読まれる
- `## 次の確認問題` → 「確認」として読まれる

学習者の仮説がまだ無い場合、AIは勝手に作らず、`## 学習者の仮説・考え` に「未確認。開始直後に本人の予想を確認する。」と書き、`## 次の確認問題` で「まず自分ではどう考えるかを1〜3文で書く」問いを置きます。

最小テンプレート（[AGENTS.md](../AGENTS.md) / `prompts/auto-issue-recorder.md` より）:

```md
## 学習開始
ハーネス開始を受けて、このIssueを学習セッションの起点にする。

## ラベル整理
- 教科: `subject:*`
- 種別: `type:*`
- 状態: `status:ready`
- 必要な支援: `needs:*`
- 公開可否: `portfolio:show` または `portfolio:hide`

## 問題提起
学習者が今回わかりたいこと、解きたい問題、書きたいレポートテーマ。

## 学習者の仮説・考え
学習者がすでに書いた予想や考え。なければ「未確認。開始直後に本人の予想を確認する。」

## Codexの整理
最初に分けて考える観点、確認する順番、注意点を短く。

## 次の確認問題
まず自分ではどう考えるかを1〜3文で書く。

## 次回復習
未定。確認問題または最初の説明後に決める。
```

### 6.5 学習ブランチ

テーマ/Issue番号が判明したら学習ブランチを作成します。

```powershell
git status --short --branch
git switch main
git pull --ff-only
git switch -c study/YYYYMMDD-issue-N-topic-slug
```

命名規則:

```text
study/YYYYMMDD-topic-slug            # Issue番号未定のとき
study/YYYYMMDD-issue-N-topic-slug    # Issue番号があるとき
# 例: study/20260513-issue-7-linear-function
```

ブランチ作成前に未コミット変更を確認し、無関係な変更が混ざっている場合は勝手に巻き戻さず、コミット/退避/継続のどれにするか確認します。

---

## 7. 学習モード6種類

会話またはIssueでモードを指定できます。プロンプトの方針（`prompts/`）と対応します。

| モード | 何をするか | 主に使うラベル | 関連プロンプト |
| --- | --- | --- | --- |
| ヒントモード | 答えを出さず、考えるヒントを出す | `needs:hint` | `socratic-tutor.md` |
| 添削モード | 解答・途中式・説明をレビュー | `needs:review` | `answer-reviewer.md` |
| 解説モード | つまずきを段階的に説明 | `needs:explanation` | `socratic-tutor.md` |
| 類題モード | 似た問題で理解を確認 | `needs:practice` | — |
| 振り返りモード | できたこと/原因/次回復習を整理 | — | `mistake-analyzer.md` |
| テストモード | AIが出題し採点・弱点分析 | — | `mistake-analyzer.md` |

指定例:

```text
ハーネススタート
数学の一次関数の文章題を、ヒントモードで進めたいです。
```

ソクラテス式の原則（`prompts/socratic-tutor.md`）: 1返信のヒント/問いは**最大2つ**。「なぜそう思った？」で終わらせず「どこを見てそう思った？」「最初の考えからどこを直す？」まで聞く。

---

## 8. ハーネス終了とClose前チェック

### 8.1 終了の合図

`ハーネス終了` / `ハーネス完了` / `今日の学習を完了したい` / `Issueを閉じて次に進みたい` など。

### 8.2 Close前チェック（7項目）

合図があっても、AIはすぐにIssueを閉じません。次がそろっているか確認します。

1. 学習テーマと目的が記録されている
2. 最初にわからなかったことが記録されている
3. 学習者の仮説/自分で考えたことが記録されている
4. 思考の変化・得た知見・次に使える判断基準のいずれかがある
5. 類題または確認問題を**1問以上**解いている
6. 間違いの原因/誤解しやすい点が記録されている
7. 次回復習する内容または日付が決まっている

不足があればIssueは閉じず、未完了タスクを提示します。

```md
## ハーネス終了前の未完了タスク
- [ ] 確認問題を1問解く
- [ ] 自分の言葉で説明を書く
- [ ] 次回復習日を決める
```

`docs/insight-capture-checklist.md` のClose前知見チェックでは、次の3文が書けるかを確認します。

```text
最初は＿＿＿＿と考えていた。
しかし＿＿＿＿を確認して、＿＿＿＿と考えるようになった。
次に似た問題では、＿＿＿＿を確認する。
```

### 8.3 充足時の処理順

1. Issueに終了コメントを追記（終了コメント形式は `docs/auto-recording-workflow.md` 参照）
2. 必要なら `learning-log/` を作成/更新
3. 思考深化HTMLを生成

   ```powershell
   npm run harness:end-report -- --issue <Issue番号>
   # Markdownも: -- --issue <N> --markdown-out public/thinking-depth.md
   ```
4. 学習ブランチをコミット/PR化
5. PRを作成/更新し `main` へ合流
6. `main` を最新化し合流を確認
7. **main合流後に** Issueを Close（PR本文の `Closes #N` でmerge時自動Closeが推奨）
8. Issue closeで `Portfolio` workflow が自動実行されデプロイ
9. 起動しない場合のみ手動フォールバック

   ```powershell
   gh workflow run portfolio.yml -f issue_number=<Issue番号>
   gh run watch
   ```
10. 次の課題候補/復習Issueを提示

終了後に `main` へ戻る標準コマンド:

```powershell
git switch main
git pull --ff-only
```

---

## 9. Issueラベル完全リファレンス

ラベル名は英語のまま（GitHub Actions/スクリプトが読みやすく、コピーしても壊れにくいため）。説明文は中学生にもわかる日本語。正本は `config/labels.json`、運用は `docs/labels.md`。

### 9.1 教科 `subject:*`（任意・色 1f77b4）

`math` 数学 / `english` 英語 / `japanese` 国語 / `science` 理科 / `social` 社会 / `programming` プログラミング

### 9.2 種別 `type:*`（必須1つ）

| ラベル | 意味 | 仮決め基準 |
| --- | --- | --- |
| `type:concept` | 言葉や仕組みの理解 | 言葉や仕組みを理解する |
| `type:practice` | 問題演習 | 問題を解いて練習する |
| `type:mistake` | 間違いの原因整理 | 間違いを分析する |
| `type:review` | 復習 | 前に学んだことを確認する |
| `type:test-prep` | テスト対策 | テストに向けて確認する |
| `type:writing` | 作文・レポート | 記述を作る |
| `type:question` | 疑問・論点整理 | 疑問を整理する／判断に迷うときの安全な仮ラベル |

### 9.3 状態 `status:*`（必須1つ）

`ready` すぐ始められる / `blocked` 何がわからないか整理中 / `reviewing` 見直し中 / `done` 終了

### 9.4 公開可否 `portfolio:*`（必須1つ・排他）

- `portfolio:show` — Webレポートに載せる（通常の学習）
- `portfolio:hide` — 載せない（個人情報、未整理の提出物、公開したくない内容）

> `show` と `hide` を同時に付けてはいけません（`npm run check` がエラーにします）。

### 9.5 必要な助け `needs:*`（任意）

`hint` ヒント / `explanation` 順番に説明 / `practice` 類題練習 / `review` 添削 / `memorization` 暗記定着 / `teacher-check` 先生・保護者にも確認

### 9.6 難しさ `difficulty:*`（任意）

`easy` 基礎 / `medium` 標準 / `hard` 応用・発展

### 9.7 注意 `risk:*`（任意）

`answer-spoiler` すぐ答えを見ると練習にならない / `exam` テスト・成績に関係 / `needs-human-teacher` AIだけで決めず人にも確認

### 9.8 Close目安 `close:*`（任意）

`on-understood` 説明できたら / `on-reviewed` 添削と振り返り後 / `on-practice` 類題確認後

ラベルを編集したら必ず `npm run sync-labels` でGitHubへ反映します。

---

## 10. Issueテンプレートと学習ログ構造

### 10.1 3種のIssueテンプレート

`.github/ISSUE_TEMPLATE/` にあります。すべて `status:ready` + `type:*` + `portfolio:show` を初期ラベルに持ちます（`check` が「type/status/portfolio 各1つ」を検証）。

| テンプレート | ファイル | タイトル接頭辞 | 初期ラベル | 主な入力欄 |
| --- | --- | --- | --- | --- |
| 学習課題 | `study-task.yml` | `[学習] ` | `status:ready, type:concept, portfolio:show` | 教科/学習テーマ/目的/現在の理解/わからないこと/まず自分で考えたこと/Codexにしてほしいこと/完了条件 |
| 間違いレビュー | `mistake-review.yml` | `[間違い] ` | `status:ready, type:mistake, needs:review, portfolio:show` | 教科/問題/自分の解答/正解・解説/なぜ間違えたか/レビューで明らかにしたいこと |
| 問題提起 | `question-intake.yml` | `[問題提起] ` | `status:ready, type:question, portfolio:show` | 教科/問題提起/背景/学習者の仮説・考え/何がわかると納得か/確認したいこと/Codexにしてほしいこと/完了条件 |

「Codexにしてほしいこと」は6モードのドロップダウンです。

### 10.2 学習ログの必須見出し（`learning-log/*.md`）

`npm run check` が次の見出しの存在を強制します（`# ` のタイトル含む20項目）。

```text
# （タイトル）
## 関連Issue
## 問題提起
## 今日の目標
## 最初の理解
## わからなかったこと
## 自分で考えたこと
## 学習中に出た仮説
## 思考の変化
## なるほどポイント
## 得た知見
## 次に使える判断基準
## Codexとの対話で気づいたこと
## 根拠確認の結果
## 間違いの原因
## 解き直し・説明
## 類題・確認問題の結果
## まだ不安なこと
## 次回復習すること
## 次回復習日
```

> 重要: 学習ログ内に `## 類題・確認問題の結果\n\n未実施` と書かれていると `check` は**エラー**にします。確認問題は必ず1問以上実施して結果を書きます。

雛形は `docs/reflection-template.md`。PR本文の必須見出しは `.github/pull_request_template.md`（`Closes #` を含む）。

---

## 11. スクリプト詳細リファレンス

`package.json` のスクリプト:

| npmスクリプト | 実体 | 用途 |
| --- | --- | --- |
| `npm run check` | `scripts/check-learning-harness.mjs` | テンプレ/必須ファイル/ログ構造の品質検証 |
| `npm run sync-labels` | `scripts/sync-labels.mjs` | `config/labels.json` をGitHubへ反映 |
| `npm run build:portfolio` | `scripts/build-portfolio.mjs` | 全体ダッシュボード生成 |
| `npm run build:thinking-depth` | `scripts/build-thinking-depth-html.mjs` | 思考深化レポート生成 |
| `npm run harness:end-report` | 同上（別名） | 終了時の思考深化レポート生成 |

### 11.1 sync-labels.mjs

`gh auth status` で認証確認 → 各ラベルを `gh label create`、失敗したら `gh label edit` でフォールバック。未認証なら `gh auth login` を促して終了。

### 11.2 build-portfolio.mjs（全体ダッシュボード）

1. リポジトリ特定: `GITHUB_REPOSITORY` 環境変数、なければ `git config remote.origin.url`。
2. トークン取得: `GITHUB_TOKEN` / `GH_TOKEN` / `gh auth token`。
3. GitHub APIで `portfolio:show` ラベルのIssueを全ページ取得（PRと `portfolio:hide` を除外）。
4. 各Issueの本文とコメントを見出し単位で解析（`extractSections`）。
5. `analyzeThinking` でコメントごとに6マーカー（問い/仮説/転換/知見/判断/確認）を判定。3つ以上揃ったコメントを「思考ループ1周」としてカウント。
6. 出力:
   - `public/index.html` — 「思考の道すじ」ダッシュボード（Featured + Issueカード）
   - `public/portfolio.md` — HTML公開失敗時のMarkdownフォールバック
   - `assets/` `reports/` があれば `public/` へコピー

各Issueは「問い/予想/確認/考え直し/気づき/次に使う」の6ステップに整理され、意味のある記述が5つ以上で「思考の深まりがはっきり読める」と表示されます。

### 11.3 build-thinking-depth-html.mjs（思考深化レポート）

引数（`parseArgs`）:

| 引数 | 意味 |
| --- | --- |
| `--issue <N>` | Issue番号から生成。`GITHUB_REPOSITORY`+APIを試し、ダメなら `gh issue view` |
| `--source <path>` | 学習ログ/レポートMarkdownから生成 |
| `--out <path>` | HTML出力先（既定 `public/thinking-depth.html`） |
| `--markdown-out <path>` | Markdown版も出力 |
| （引数なし） | `learning-log/` と `reports/` の最新 `.md` を自動選択。無ければテンプレ初期状態 |

処理: Markdownを見出しで分解 → 6フェーズ（問い/予想/確認/考え直し/気づき/次に使う）に対応する見出しを集約 → 各フェーズの「見え方の強さ」を文字数・文数・推論語（なぜ/根拠/しかし/つまり…）で1〜3段階に判定 → 7段階の到達ステージ（材料を集める→…→次に使える形にする）を決定 → Before/After・次に使えることリストを生成しHTML/Markdownを書き出し。

### 11.4 check-learning-harness.mjs

[第14章](#14-品質チェックnpm-run-checkの中身)で詳述。

---

## 12. 思考の道すじはどう判定されるか

レポートは「点数」ではなく「**その考え方がログからどれくらいはっきり読めるか**」を可視化します。判定の鍵は**見出し名**です。だから開始時一周記録の3見出しは言い換え禁止です。

6フェーズと、それを拾う見出しの対応（`build-thinking-depth-html.mjs` の `phases` / `loopSteps`）:

| フェーズ | やさしい問い | 拾う見出し（例） |
| --- | --- | --- |
| 問い | 何がわからなかった？ | 問題提起 / わからなかったこと / 確認したいこと |
| 予想 | 自分ではどう考えた？ | 自分で考えたこと / 学習中に出た仮説 / 学習者の仮説・考え |
| 確認 | 本当に使えるか試した？ | 類題・確認問題の結果 / 次の確認問題 / 次回復習すること |
| 考え直し | どこで見方が変わった？ | 思考の変化 / 根拠確認の結果 / 解き直し・説明 |
| 気づき | 何がわかった？ | 得た知見 / なるほどポイント / 結論 |
| 次に使う | 次はどう見分ける？ | 次に使える判断基準 |

見出しが無くても、本文の言い回し（「最初は」「しかし」「次に」「なるほど」など）から `classifyLoopEntry` がフェーズを推測する補助ロジックもあります。ただし**明示的に正しい見出しで書くのが最も確実**です。

「見え方の強さ」の目安（`phaseStrength`）:

- 3「はっきり見える」: 140字以上、または3文以上＋推論語あり
- 2「見える」: 50字以上、または2文以上、または推論語あり
- 1「少し見える」: それ以下の短い記述
- 0「これから」: 記述なし

到達ステージ7段階（`stages`）: 材料を集める → 記録する → 問いを立てる → 予想する → 考え直す → つなげて説明する → 次に使える形にする。

---

## 13. GitHub Pages公開の仕組み

`.github/workflows/portfolio.yml`。

トリガー:

- `issues: closed`（Issueが閉じられたとき）
- `workflow_dispatch`（手動。任意の `issue_number` 入力）

ジョブ `build-portfolio` の流れ:

1. checkout → Node 24 → `npm ci`
2. `npm run build:portfolio`（`GITHUB_TOKEN` 付き）→ `public/index.html`, `public/portfolio.md`
3. 対象Issue番号を解決（closeイベントなら `github.event.issue.number`、手動なら入力値）
4. Issue番号があれば `npm run harness:end-report -- --issue N --out public/thinking-depth/issue-N.html --markdown-out public/thinking-depth/issue-N.md`、その後 `thinking-depth.html`/`.md` に最新としてコピー
5. `portfolio-markdown` というActions artifactを常にアップロード（`portfolio.md` / `thinking-depth.md` / `thinking-depth/*.md`）
6. `configure-pages` → `upload-pages-artifact`（`public`）

ジョブ `deploy` が `deploy-pages` でGitHub Pagesへ公開。`concurrency: pages` で同時実行を直列化。

公開されるURL例:

```text
https://<owner>.github.io/<repo>/
https://<owner>.github.io/<repo>/thinking-depth.html
https://<owner>.github.io/<repo>/thinking-depth/issue-<N>.html
https://<owner>.github.io/<repo>/portfolio.md
```

> Pages公開が権限等で失敗しても、`portfolio-markdown` artifact からMarkdown版を必ず回収できます（Actions画面 → 該当run → Artifacts）。

手動再生成:

```powershell
gh workflow run portfolio.yml
gh run watch
# 特定Issue指定:
gh workflow run portfolio.yml -f issue_number=<Issue番号>
```

ローカルで手動生成（コミット不要の `public/`）:

```powershell
npm run build:portfolio
npm run harness:end-report -- --issue <Issue番号>
npm run harness:end-report -- --source learning-log/YYYY-MM-DD-topic.md
```

---

## 14. 品質チェック（npm run check）の中身

`.github/workflows/quality.yml` がPRと `main` へのpushで `npm run check` を実行します。`scripts/check-learning-harness.mjs` の検証内容:

1. **YAML構文**: `.github` 配下の全 `.yml` がパース可能か。
2. **必須ファイルの存在**: `AGENTS.md`, `README.md`, `LICENSE`, PRテンプレ, 3 Issueテンプレ, `config/labels.json`, `docs/` 主要4ファイル, `prompts/auto-issue-recorder.md` など。
3. **Issueテンプレ構造**: `name/description/title/labels/body` の存在、`labels` に `type:` `status:` `portfolio:` が**各ちょうど1つ**、`portfolio:show`+`hide` の同時付与禁止、各 `body` 要素に `type/id/attributes` と `attributes.label`。
4. **labels.json**: 非空配列、各要素に `name/description/color`、名前の重複なし、`color` が6桁HEX。
5. **必須見出し**: `docs/reflection-template.md`、PRテンプレ、`AGENTS.md`（`## 自動記録ルール` `## 知見化の原則` `### 開始時一周記録` 「思考の転換点」「得た知見」「次に使える判断基準」「main合流後にIssueをClose」）、`README.md`（「Source は `GitHub Actions` にします。」「mainに合流してからIssueを閉じます」）、`LICENSE`（"MIT License" / "Aoyama Gakuin Junior High School, Noboru Ando"）、`prompts/auto-issue-recorder.md`、`docs/auto-recording-workflow.md`、`portfolio.yml`（`issues:` `closed` `Resolve thinking-depth issue` `Build thinking-depth report` `deploy-pages`）。
6. **学習ログ**: `learning-log/*.md` が必須20見出しを満たすか。`## 類題・確認問題の結果\n\n未実施` があれば失敗。
7. **PRテンプレ**: `Closes #` を含むか。

エラーがあれば一覧表示して終了コード1。すべて通れば `Learning harness quality checks passed.`。

---

## 15. トラブルシューティング

| 症状 | 原因 | 対処 |
| --- | --- | --- |
| `npm run check` が落ちる | 必須見出し/ファイル不足、ログに「未実施」 | エラー一覧の項目を1つずつ修正。学習ログは20見出しを揃え確認問題を実施 |
| `npm run sync-labels` が `not authenticated` | `gh` 未ログイン | `gh auth login` を実行 |
| Pagesが404 | Pages Sourceが `GitHub Actions` でない | Settings→Pages→Source を `GitHub Actions` に |
| レポートが古い内容 | main合流前にIssueを閉じた | 必ず「main合流→Close」順。手動で `gh workflow run portfolio.yml -f issue_number=N` |
| HTMLが公開されない | Pages権限/設定の失敗 | Actions→該当run→Artifacts の `portfolio-markdown` を回収 |
| Issueがレポートに出ない | `portfolio:show` 無し / `portfolio:hide` 付き / PRである | ラベルを修正して再実行 |
| `harness:end-report` で `Issue could not be loaded` | `gh` 未認証かIssue番号誤り | `gh auth login`、Issue番号確認、`--source` で代替 |
| 思考の道すじが「これから」ばかり | 見出し名の言い換え | `## 問題提起` 等を規定の見出し名で書く |
| build系で `repository could not be inferred` | リモート未設定/環境変数なし | `GITHUB_REPOSITORY` を設定、または `git remote add origin` |

---

## 16. よくある質問

**Q. AIに答えを全部出してもらってはいけないの？**
A. このハーネスの目的は「自分がどう考えたか」を残すこと。AGENTS.mdの禁止事項に「学習者が考える前に最終解答だけを提示する」が明記されています。まず自分の予想を書きましょう。

**Q. テストの点数は記録される？**
A. しません。レポートは点数表ではなく「問い→予想→確認→考え直し→気づき→次に使う」がつながって読めるかを見せるものです。

**Q. 公開したくない内容がある。**
A. そのIssueに `portfolio:hide` を付けます。`portfolio:show` と同時には付けません。個人情報・未整理の提出物も `hide` に。

**Q. learning-log は必ず書く？**
A. 区切り（成果物完成・誤解整理・確認問題実施・復習日決定・Close可能）で作成/更新します。`docs/auto-recording-workflow.md` の条件を参照。

**Q. Copilot CLIでも使える？**
A. 使えます。プロンプトはagent非依存設計です（`docs/copilot-cli.md`）。`prompts/*.md` を貼り、モードを明示してください。

**Q. 言語は？**
A. Issue・学習ログ・振り返りは日本語が基本。英語学習で英文を扱う場合も理解確認は日本語で残します。

**Q. テストやリンターは？**
A. ありません。検証は `npm run check` に一本化されています。

---

## 17. 用語集

| 用語 | 意味 |
| --- | --- |
| ハーネス | この学習支援の仕組み全体 |
| ハーネススタート/終了 | 学習セッションの開始/終了処理に入る合図 |
| 開始時一周記録 | 開始直後に必ず残す `## 問題提起`/`## 学習者の仮説・考え`/`## 次の確認問題` |
| 思考の一周（学習ループ） | 問い→予想→確認→考え直し→気づき→次に使う の6段階 |
| 思考深化レポート | 1つの学習の道すじを可視化するHTML（thinking-depth.html） |
| ポートフォリオ | `portfolio:show` のIssueを集めた全体ダッシュボード（index.html） |
| Close前チェック | Issueを閉じてよいか確認する7項目 |
| 知見化 | 会話の要約でなく「なぜその見方が筋がよいか」まで残すこと |
| 仮ラベル | 判断材料不足時に暫定で付け「仮ラベル」と明記するラベル |
| portfolio:show/hide | Webレポートに載せる/載せない（排他） |

---

ライセンス: MIT（Copyright (c) 2026 Aoyama Gakuin Junior High School, Noboru Ando）。詳細は [LICENSE](../LICENSE)。
