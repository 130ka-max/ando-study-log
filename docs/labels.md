# Issue Label Guide

Issueラベルは、学習カードにつける目印です。
ラベル名は英語のまま使います。
説明文は、中学生にも意味がわかる日本語にしています。

ラベルをGitHubに作成・更新する場合は、次を実行します。

```powershell
npm run sync-labels
```

## ハーネス開始時の必須ラベル

ハーネス開始時は、CodexがまずIssueラベルを整理します。
Issueがどんな学習かをあとから見てもわかるように、最低でも次の3つを付けます。

- `type:*`: そのIssueがどんな学習か
- `status:*`: 今どんな状態か
- `portfolio:*`: Webレポートに載せるか

教科や進め方が判断できる場合は、`subject:*`、`needs:*`、`difficulty:*` も付けます。
通常の学習記録は `portfolio:show`、公開したくない内容は `portfolio:hide` にします。
`portfolio:show` と `portfolio:hide` は同時に付けません。

## 教科

- `subject:math`: 数学の学習です
- `subject:english`: 英語の学習です
- `subject:japanese`: 国語の学習です
- `subject:science`: 理科の学習です
- `subject:social`: 社会の学習です
- `subject:programming`: プログラミングの学習です

## 学習の種類

- `type:concept`: 言葉や仕組みの意味を理解する学習です
- `type:practice`: 問題を解いて練習する学習です
- `type:mistake`: 間違えた理由を整理する学習です
- `type:review`: 前に学んだことをもう一度確認する学習です
- `type:test-prep`: テストに向けて確認する学習です
- `type:writing`: 文章、作文、レポートを書く学習です
- `type:question`: 疑問や確かめたいことを出した学習です

## 今の状態

- `status:ready`: すぐに学習を始められる状態です
- `status:blocked`: 何がわからないかを先に整理する状態です
- `status:reviewing`: 答えや考え方を見直している状態です
- `status:done`: この学習は終わった状態です

## Webレポートに載せるか

- `portfolio:show`: Webの学習レポートに載せます
- `portfolio:hide`: Webの学習レポートには載せません

## 必要な助け

- `needs:hint`: まずヒントがほしい状態です
- `needs:explanation`: 順番に説明してほしい状態です
- `needs:practice`: 似た問題で練習したい状態です
- `needs:review`: 自分の答えを添削してほしい状態です
- `needs:memorization`: 覚えて定着させたい状態です
- `needs:teacher-check`: 先生や保護者にも確認してほしい状態です

## 難しさ

- `difficulty:easy`: 基礎から確認する内容です
- `difficulty:medium`: 標準的な難しさの内容です
- `difficulty:hard`: 応用や発展に近い内容です

## 注意が必要なもの

- `risk:answer-spoiler`: すぐ答えを見ると考える練習になりにくい内容です
- `risk:exam`: テストや成績に関係する大事な内容です
- `risk:needs-human-teacher`: AIだけで決めず先生や保護者にも確認する内容です

## Issueを閉じる目安

- `close:on-understood`: 自分の言葉で説明できたら閉じます
- `close:on-reviewed`: 添削と振り返りが終わったら閉じます
- `close:on-practice`: 類題で確認できたら閉じます
