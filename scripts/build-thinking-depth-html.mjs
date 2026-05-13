import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const defaultOutputPath = path.join(root, "public", "thinking-depth.html");

const stages = [
  {
    title: "材料を集める",
    short: "まだ準備中",
    description: "学習したことはありますが、何を考えたかを読む材料がまだ少ない状態です。",
    next: "何がわからないかを一文で書きます。",
  },
  {
    title: "記録する",
    short: "学びを残した",
    description: "学んだ内容や困ったことを、あとから読める形で残せています。",
    next: "わからなかったことを問いの形にします。",
  },
  {
    title: "問いを立てる",
    short: "疑問が見える",
    description: "何を知りたいのか、何を確かめたいのかが自分の言葉で見えています。",
    next: "答えを聞く前に、自分の予想を書きます。",
  },
  {
    title: "予想する",
    short: "自分の考えがある",
    description: "AIや先生の答えを待つ前に、自分なりの見方や仮説を出せています。",
    next: "根拠、例、反例を使って予想を確かめます。",
  },
  {
    title: "考え直す",
    short: "見方を動かした",
    description: "確認したことをもとに、最初の考えを直したり、より正確にしたりしています。",
    next: "何がわかったのかを短くまとめます。",
  },
  {
    title: "つなげて説明する",
    short: "説明にできた",
    description: "疑問、予想、確認、気づきがつながり、自分の言葉で説明できる状態です。",
    next: "次に似た問題を見たときの見分け方を作ります。",
  },
  {
    title: "次に使える形にする",
    short: "知見化できた",
    description: "今回の学びを、次の問題やレポートでも使える判断基準にできています。",
    next: "確認問題や復習日を決め、次回も使えるか試します。",
  },
];

const phases = [
  {
    key: "question",
    label: "問い",
    friendly: "何がわからなかった？",
    hint: "疑問や調べたいことを自分の言葉にしたか。",
    sections: ["問題提起", "わからなかったこと", "わからないこと", "確認したいこと", "レポートテーマ"],
  },
  {
    key: "hypothesis",
    label: "予想",
    friendly: "自分ではどう考えた？",
    hint: "答えを見る前の予想や、自分なりの説明があるか。",
    sections: ["自分で考えたこと", "まず自分で考えたこと", "学習中に出た仮説", "学習者の仮説・考え", "考察"],
  },
  {
    key: "check",
    label: "確認",
    friendly: "本当に使えるか試した？",
    hint: "確認問題、類題、復習予定など、次の行動につながっているか。",
    sections: ["類題・確認問題の結果", "確認問題の結果", "次の確認問題", "次回復習すること", "次回復習日"],
  },
  {
    key: "shift",
    label: "考え直し",
    friendly: "どこで見方が変わった？",
    hint: "確認したことをもとに、最初の考えを変えたか。",
    sections: ["思考の変化", "根拠確認の結果", "解き直し・説明"],
  },
  {
    key: "insight",
    label: "気づき",
    friendly: "何がわかった？",
    hint: "ただ調べた内容ではなく、自分が説明できるようになったことがあるか。",
    sections: ["得た知見", "なるほどポイント", "今日できるようになったこと", "結論"],
  },
  {
    key: "criteria",
    label: "次に使う",
    friendly: "次はどう見分ける？",
    hint: "次に似た問題を見たとき、何を確認すればよいかがあるか。",
    sections: ["次に使える判断基準", "科学的な見地から見た注意点"],
  },
];

const loopSteps = [
  {
    key: "question",
    label: "問い",
    prompt: "何が知りたい？",
    empty: "まだ「何が知りたいか」が一文で残っていません。",
    headings: ["問い", "問題提起", "わからなかったこと", "わからないこと", "確認したいこと", "レポートテーマ"],
  },
  {
    key: "hypothesis",
    label: "予想",
    prompt: "自分ではどう考えた？",
    empty: "答えを見る前の予想や、自分なりの説明がまだ少ないです。",
    headings: ["予想", "学習者の仮説・考え", "自分で考えたこと", "まず自分で考えたこと", "学習中に出た仮説", "最初の理解"],
  },
  {
    key: "check",
    label: "確認",
    prompt: "何を見て確かめた？",
    empty: "何を根拠に確かめたかがまだはっきりしていません。",
    headings: ["確認", "根拠確認", "根拠確認の結果", "Codexの整理", "回答", "追加説明", "確認問題の結果", "類題・確認問題の結果", "次の確認問題"],
  },
  {
    key: "shift",
    label: "考え直し",
    prompt: "どこを直した？",
    empty: "最初の考えから、どこを直したのかがまだ読み取りにくいです。",
    headings: ["考え直し", "思考の変化", "学習者の理解更新", "解き直し・説明", "間違いの原因", "誤解しやすい点"],
  },
  {
    key: "insight",
    label: "気づき",
    prompt: "何がわかった？",
    empty: "新しく説明できるようになったことを、もう一文で残すとよくなります。",
    headings: ["気づき", "得た知見", "なるほどポイント", "今日できるようになったこと", "結論", "提出用の最終文"],
  },
  {
    key: "future",
    label: "次に使う",
    prompt: "次は何に使う？",
    empty: "次に似た問題で使う見分け方や復習予定がまだ少ないです。",
    headings: ["次に使う", "これから使う", "次に使える判断基準", "次回復習すること", "次回復習日", "次回復習", "次の課題候補", "まだ不安なこと"],
  },
];

const loopHeadingAliases = new Map(
  loopSteps.flatMap((step) => step.headings.map((heading) => [normalizeHeading(heading), step.key])),
);

function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith("--")) continue;

    const key = item.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
    } else {
      args[key] = next;
      index += 1;
    }
  }

  return args;
}

function normalize(value) {
  return String(value ?? "").replace(/\r\n/g, "\n").trim();
}

function normalizeHeading(value) {
  return normalize(value)
    .replace(/^追加説明[:：]\s*/, "追加説明")
    .replace(/\s+/g, "")
    .toLowerCase();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function stripMarkdown(value) {
  return normalize(value)
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[-*]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/\[[ xX]\]\s*/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function compactMarkdown(value, maxLength = 220) {
  const compact = stripMarkdown(value);
  if (compact.length <= maxLength) return compact;
  return `${compact.slice(0, maxLength - 1).trim()}...`;
}

function hasMeaning(value) {
  const text = stripMarkdown(value);
  return Boolean(text) && text !== "未定" && text !== "未実施";
}

function extractTitle(markdown, fallback = "学習レポート") {
  const match = normalize(markdown).match(/^#\s+(.+?)\s*$/m);
  return compactMarkdown(match?.[1] ?? fallback, 96);
}

function cleanHeadingTitle(value) {
  return value.replace(/\s+#+$/g, "").trim();
}

function extractSections(markdown) {
  const sections = new Map();
  const matches = extractSectionEntries(markdown);

  for (const { title, body } of matches) {
    if (!body) continue;

    const previous = sections.get(title);
    sections.set(title, previous ? `${previous}\n\n${body}` : body);
  }

  return sections;
}

function extractSectionEntries(markdown) {
  const text = normalize(markdown);
  const headingPattern = /^(#{1,3})\s+(.+?)\s*$/gm;
  const matches = [...text.matchAll(headingPattern)];

  return matches
    .map((current, index) => {
      const next = matches[index + 1];
      const title = cleanHeadingTitle(current[2]);
      const start = current.index + current[0].length;
      const end = next ? next.index : text.length;
      return {
        title,
        body: text.slice(start, end).trim(),
      };
    })
    .filter((entry) => entry.body);
}

function firstSection(sections, names) {
  for (const name of names) {
    const value = sections.get(name);
    if (value) return value;
  }
  return "";
}

function splitItems(value, maxItems = 4) {
  const text = normalize(value);
  if (!text) return [];

  const bulletItems = text
    .split("\n")
    .map((line) => line.replace(/^[-*]\s+/, "").trim())
    .filter((line) => line && line !== text);

  const source = bulletItems.length > 1 ? bulletItems : stripMarkdown(text).split(/[。！？!?]+/);
  return source
    .map((item) => compactMarkdown(item, 110))
    .filter(Boolean)
    .slice(0, maxItems);
}

function classifyLoopEntry(title, body) {
  const normalizedTitle = normalizeHeading(title);

  for (const [alias, key] of loopHeadingAliases.entries()) {
    if (normalizedTitle === alias || normalizedTitle.startsWith(alias)) return key;
  }

  const text = stripMarkdown(`${title}\n${body}`);
  if (/(最初は|しかし|考え直|見方.*変|修正|正確には|区別|曖昧|取りこぼ)/.test(text)) return "shift";
  if (/(次に|次回|これから|判断基準|復習|課題候補|使う)/.test(text)) return "future";
  if (/(わかった|分かった|なるほど|理解|説明でき|気づ|知見|最終文|提出用|結論|本質|法則)/.test(text)) return "insight";
  if (/(自分では|と思っ|考えた|予想|仮説)/.test(text)) return "hypothesis";
  if (/(なぜ|どうして|わから|分から|疑問|不思議|問題提起)/.test(text)) return "question";
  if (/(確認|根拠|調べ|回答|説明|図|画像)/.test(text)) return "check";

  return "";
}

function buildLearningLoop(entries, phaseModels) {
  const evidence = new Map(loopSteps.map((step) => [step.key, []]));

  for (const entry of entries) {
    const key = classifyLoopEntry(entry.title, entry.body);
    if (!key || !evidence.has(key)) continue;

    const title = compactMarkdown(entry.title, 32);
    const body = compactMarkdown(entry.body, 150);
    if (!body) continue;
    evidence.get(key).push(title ? `${title}: ${body}` : body);
  }

  return loopSteps.map((step) => {
    const rawItems = evidence.get(step.key) ?? [];
    const phaseFallback = phaseModels.find((phase) => phase.key === step.key || (step.key === "future" && phase.key === "criteria"));
    const fallbackText = phaseFallback?.strength ? phaseFallback.text : "";
    const items = rawItems.length ? rawItems.slice(0, 3) : fallbackText ? [fallbackText] : [];

    return {
      ...step,
      items,
      text: items.length ? items.join(" / ") : step.empty,
      status: items.length ? "記録あり" : "これから",
    };
  });
}

function loopText(loop, key) {
  const step = loop.find((item) => item.key === key);
  return step?.items?.join("\n") ?? "";
}

function phaseStrength(rawText) {
  const text = stripMarkdown(rawText);
  if (!text) return 0;

  const sentenceCount = text.split(/[。！？.!?]+/).filter((item) => item.trim()).length;
  const hasReasoningWords = /(なぜ|理由|根拠|確認|比較|反例|つまり|一方|しかし|だから|次に|判断|具体|例えば|見方|変わ)/.test(text);

  if (text.length >= 140 || (sentenceCount >= 3 && hasReasoningWords)) return 3;
  if (text.length >= 50 || sentenceCount >= 2 || hasReasoningWords) return 2;
  return 1;
}

function strengthLabel(strength) {
  if (strength >= 3) return "はっきり見える";
  if (strength === 2) return "見える";
  if (strength === 1) return "少し見える";
  return "これから";
}

function strengthWidth(strength) {
  return [8, 38, 68, 100][strength] ?? 8;
}

function listMarkdownFiles(relativeDir) {
  const absoluteDir = path.join(root, relativeDir);
  if (!fs.existsSync(absoluteDir)) return [];

  return fs
    .readdirSync(absoluteDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => path.join(relativeDir, entry.name).replaceAll("\\", "/"));
}

function newestMarkdownFile() {
  const candidates = [...listMarkdownFiles("learning-log"), ...listMarkdownFiles("reports")];
  if (!candidates.length) return "";

  return candidates
    .map((relativePath) => ({
      relativePath,
      mtime: fs.statSync(path.join(root, relativePath)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime)[0].relativePath;
}

function loadFileSource(sourcePath) {
  const absolutePath = path.resolve(root, sourcePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Source markdown not found: ${sourcePath}`);
  }

  const markdown = fs.readFileSync(absolutePath, "utf8");
  const relativePath = path.relative(root, absolutePath).replaceAll("\\", "/");

  return {
    kind: "file",
    sourceLabel: relativePath,
    title: extractTitle(markdown),
    markdown,
  };
}

function githubToken() {
  return process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
}

function nextLink(linkHeader) {
  if (!linkHeader) return null;
  for (const part of linkHeader.split(",")) {
    const match = part.match(/<([^>]+)>;\s*rel="next"/);
    if (match) return match[1];
  }
  return null;
}

async function githubRequest(url, token) {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "codex-study-harness-thinking-depth",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub API request failed: ${response.status} ${response.statusText}\n${body}`);
  }

  return response;
}

async function githubRequestAll(url, token) {
  const results = [];
  let next = url;

  while (next) {
    const response = await githubRequest(next, token);
    results.push(...(await response.json()));
    next = nextLink(response.headers.get("link"));
  }

  return results;
}

async function loadIssueSourceFromApi(issueNumber) {
  const repository = process.env.GITHUB_REPOSITORY;
  if (!repository) return null;

  const token = githubToken();
  const issueUrl = `https://api.github.com/repos/${repository}/issues/${issueNumber}`;
  const issue = await (await githubRequest(issueUrl, token)).json();
  const comments = await githubRequestAll(issue.comments_url, token);

  return buildIssueSource(issue, comments);
}

function buildIssueSource(issue, comments) {
  const commentMarkdown = comments
    .map((comment, index) => `## Issueコメント ${index + 1}\n\n${comment.body ?? ""}`)
    .join("\n\n");
  const labelText = (issue.labels ?? []).map((label) => label.name).join(", ");
  const markdown = [
    `# ${issue.title}`,
    `## 関連Issue\n\n- #${issue.number} ${issue.html_url ?? issue.url ?? ""}`,
    labelText ? `## ラベル\n\n${labelText}` : "",
    issue.body ?? "",
    commentMarkdown,
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    kind: "issue",
    sourceLabel: `Issue #${issue.number}`,
    title: issue.title,
    url: issue.html_url ?? issue.url,
    issueNumber: issue.number,
    markdown,
  };
}

function loadIssueSource(issueNumber) {
  let json;
  try {
    json = execFileSync(
      "gh",
      [
        "issue",
        "view",
        String(issueNumber),
        "--json",
        "number,title,body,comments,labels,state,url,closedAt,updatedAt",
      ],
      {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
  } catch (error) {
    throw new Error(`Issue #${issueNumber} could not be loaded with GitHub CLI. ${error.message}`);
  }

  const issue = JSON.parse(json);
  return buildIssueSource(
    {
      ...issue,
      html_url: issue.url,
    },
    issue.comments ?? [],
  );
}

async function loadSource(args) {
  if (args.issue) {
    return (await loadIssueSourceFromApi(args.issue)) ?? loadIssueSource(args.issue);
  }

  if (args.source) return loadFileSource(args.source);

  const latest = newestMarkdownFile();
  if (!latest) {
    return {
      kind: "empty",
      sourceLabel: "テンプレート初期状態",
      title: "まだ学習記録がありません",
      markdown: `# まだ学習記録がありません

## 今日の目標

ハーネス終了時に、Issue番号または学習ログを指定すると、このページに思考深化レポートが表示されます。

## わからなかったこと

学習Issueが作成されると、ここに問いが入ります。

## 自分で考えたこと

学習者が自分の予想や説明を書くと、ここに表示されます。

## 思考の変化

確認や対話で考えが変わると、ここに表示されます。

## 得た知見

学習で説明できるようになったことが、ここに表示されます。

## 次に使える判断基準

次に似た問題を見たときの見分け方が、ここに表示されます。

## 次の確認問題

確認問題や復習予定が、ここに表示されます。`,
    };
  }

  return loadFileSource(latest);
}

function buildReportModel(source) {
  const sections = extractSections(source.markdown);
  const sectionEntries = extractSectionEntries(source.markdown);
  const title = compactMarkdown(
    firstSection(sections, ["学習テーマ"]) || source.title || extractTitle(source.markdown),
    110,
  );
  const goal = compactMarkdown(
    firstSection(sections, ["今日の目標", "目的", "レビューで明らかにしたいこと", "レポートテーマ"]),
    220,
  );
  const firstView = compactMarkdown(
    firstSection(sections, ["最初の理解", "最初の見方", "現在の理解"]),
    220,
  );
  const blockers = compactMarkdown(
    firstSection(sections, ["わからなかったこと", "わからないこと", "確認したいこと"]),
    220,
  );
  const review = compactMarkdown(
    firstSection(sections, ["次回復習すること", "次回復習日", "次回復習"]),
    180,
  );
  const nextTask = compactMarkdown(firstSection(sections, ["まだ不安なこと", "次の課題候補"]), 180);

  const basePhaseModels = phases.map((phase) => {
    const raw = firstSection(sections, phase.sections);
    const strength = phaseStrength(raw);
    return {
      ...phase,
      raw,
      text: compactMarkdown(raw || "まだはっきり記録されていません。", 220),
      strength,
      status: strengthLabel(strength),
      width: strengthWidth(strength),
      items: splitItems(raw),
    };
  });

  const learningLoop = buildLearningLoop(sectionEntries, basePhaseModels);
  const phaseModels = basePhaseModels.map((phase) => {
    const loopKey = phase.key === "criteria" ? "future" : phase.key;
    const loopRaw = loopText(learningLoop, loopKey);
    if (!loopRaw) return phase;

    const combinedRaw = [phase.raw, loopRaw]
      .filter(Boolean)
      .filter((value, index, values) => values.indexOf(value) === index)
      .join("\n\n");
    const strength = phaseStrength(combinedRaw);
    return {
      ...phase,
      raw: combinedRaw,
      text: compactMarkdown(combinedRaw, 220),
      strength,
      status: strengthLabel(strength),
      width: strengthWidth(strength),
      items: splitItems(combinedRaw),
    };
  });
  const stage = determineStage(phaseModels, Boolean(goal || firstView || blockers));
  const before = firstView || blockers || phaseModels.find((phase) => phase.key === "question")?.text || "";
  const after =
    firstSection(sections, ["思考の変化"]) ||
    firstSection(sections, ["得た知見", "なるほどポイント", "結論"]) ||
    firstSection(sections, ["次に使える判断基準"]) ||
    loopText(learningLoop, "shift") ||
    loopText(learningLoop, "insight") ||
    loopText(learningLoop, "future") ||
    "";
  const actionItems = [
    ...splitItems(firstSection(sections, ["次に使える判断基準"]), 3),
    ...splitItems(loopText(learningLoop, "future"), 3),
    ...splitItems(firstSection(sections, ["類題・確認問題の結果", "確認問題の結果", "次の確認問題"]), 2),
    ...splitItems(review || nextTask, 2),
  ].slice(0, 5);

  return {
    title,
    goal,
    firstView,
    blockers,
    review,
    nextTask,
    phases: phaseModels,
    learningLoop,
    stage,
    before: compactMarkdown(before, 240),
    after: compactMarkdown(after, 240),
    actionItems,
    source,
    generatedAt: new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date()),
  };
}

function determineStage(phaseModels, hasBasicRecord) {
  const has = (key) => (phaseModels.find((phase) => phase.key === key)?.strength ?? 0) > 0;

  let level = hasBasicRecord || phaseModels.some((phase) => phase.strength > 0) ? 1 : 0;
  if (has("question")) level = Math.max(level, 2);
  if (has("question") && has("hypothesis")) level = Math.max(level, 3);
  if ((has("shift") || has("check") || has("criteria")) && (has("question") || has("hypothesis"))) level = Math.max(level, 4);
  if (has("insight") && (has("shift") || has("hypothesis") || has("criteria"))) level = Math.max(level, 5);
  if (has("insight") && has("criteria") && has("check")) level = Math.max(level, 6);

  return { level, ...stages[level] };
}

function renderStagePath(stage) {
  return `
    <ol class="stage-path" aria-label="思考が深まる道すじ">
      ${stages
        .map((item, index) => {
          const state = index < stage.level ? "is-done" : index === stage.level ? "is-current" : "";
          return `
            <li class="${state}">
              <span class="stage-dot" aria-hidden="true"></span>
              <strong>${escapeHtml(item.title)}</strong>
              <small>${escapeHtml(item.short)}</small>
            </li>`;
        })
        .join("")}
    </ol>`;
}

function renderPhaseCards(phasesToRender) {
  return `
    <div class="phase-grid">
      ${phasesToRender
        .map(
          (phase) => `
            <article class="phase-card ${phase.strength > 0 ? "has-evidence" : "is-empty"}">
              <div class="phase-card__head">
                <span>${escapeHtml(phase.label)}</span>
                <b>${escapeHtml(phase.status)}</b>
              </div>
              <h3>${escapeHtml(phase.friendly)}</h3>
              <p>${escapeHtml(phase.text)}</p>
              <div class="evidence-meter" aria-label="${escapeHtml(phase.label)}の見え方: ${escapeHtml(phase.status)}">
                <i style="width:${phase.width}%"></i>
              </div>
              <small>${escapeHtml(phase.hint)}</small>
            </article>`,
        )
        .join("")}
    </div>`;
}

function renderLearningLoop(loop) {
  return `
    <section class="loop-board" aria-label="学習者の思考の一周ログ">
      <div class="section-head">
        <div>
          <span class="eyebrow">Learning Loop</span>
          <h2>一周ごとの考えの進み方</h2>
        </div>
        <p>会話やIssueコメントから、学習者が「問い → 予想 → 確かめ → 考え直し → 気づき → これから使う」へ進んだ跡を拾います。</p>
      </div>
      <ol class="loop-steps">
        ${loop
          .map(
            (step, index) => `
              <li class="${step.items.length ? "has-evidence" : "is-empty"}">
                <span class="loop-index">${index + 1}</span>
                <div>
                  <small>${escapeHtml(step.status)}</small>
                  <h3>${escapeHtml(step.label)} <em>${escapeHtml(step.prompt)}</em></h3>
                  <p>${escapeHtml(step.text)}</p>
                </div>
              </li>`,
          )
          .join("")}
      </ol>
    </section>`;
}

function renderActionList(items, fallback) {
  const values = items.length ? items : [fallback];

  return `
    <ul class="action-list">
      ${values.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
    </ul>`;
}

function renderBeforeAfter(model) {
  return `
    <section class="change-board" aria-label="思考の変化">
      <article>
        <span>Before</span>
        <h2>最初の見方</h2>
        <p>${escapeHtml(model.before || "最初にどう考えたかがまだ記録されていません。")}</p>
      </article>
      <div class="change-arrow" aria-hidden="true">→</div>
      <article class="after">
        <span>After</span>
        <h2>今の見方</h2>
        <p>${escapeHtml(model.after || "学習後にどう考えるようになったかを、もう一文だけ足すとよくなります。")}</p>
      </article>
    </section>`;
}

function renderTeacherNote() {
  return `
    <section class="teacher-note" aria-label="評価の見方">
      <div>
        <span class="eyebrow">How To Read</span>
        <h2>このレポートの読み方</h2>
      </div>
      <p>
        これはテストの点数ではありません。
        「何を疑問に思ったか」「自分ではどう予想したか」「何を確かめて考え直したか」「どんな気づきを次に使える形にしたか」を、
        学習者の言葉からたどるためのページです。
      </p>
    </section>`;
}

function renderHtml(model) {
  const sourceLink = model.source.url
    ? `<a href="${escapeHtml(model.source.url)}">${escapeHtml(model.source.sourceLabel)}</a>`
    : `<span>${escapeHtml(model.source.sourceLabel)}</span>`;

  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>思考深化レポート | 学習ハーネス</title>
  <style>
    :root {
      color-scheme: light;
      --paper: #fbf8ef;
      --surface: #fffdf8;
      --surface-soft: #f0f7f2;
      --ink: #202426;
      --muted: #5b6267;
      --line: #d9d2c3;
      --blue: #2858a6;
      --teal: #08736e;
      --green: #507b3a;
      --yellow: #f2c94c;
      --orange: #d97732;
      --shadow: 0 18px 45px rgba(32, 36, 38, 0.13);
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      color: var(--ink);
      background:
        linear-gradient(90deg, rgba(40, 88, 166, 0.06) 1px, transparent 1px) 0 0 / 44px 44px,
        linear-gradient(rgba(8, 115, 110, 0.05) 1px, transparent 1px) 0 0 / 44px 44px,
        var(--paper);
      font-family: "BIZ UDPGothic", "Yu Gothic", "Hiragino Sans", Meiryo, sans-serif;
      line-height: 1.72;
    }

    a { color: inherit; }

    .page {
      width: min(1120px, calc(100% - 32px));
      margin: 0 auto;
      padding: 32px 0 56px;
    }

    .topbar {
      display: flex;
      justify-content: space-between;
      gap: 18px;
      align-items: center;
      margin-bottom: 22px;
      color: var(--muted);
      font-size: 0.88rem;
    }

    .brand {
      display: inline-flex;
      gap: 10px;
      align-items: center;
      color: var(--ink);
      font-weight: 800;
    }

    .brand-mark {
      display: grid;
      place-items: center;
      width: 36px;
      height: 36px;
      border-radius: 12px;
      background: var(--teal);
      color: #fff;
      box-shadow: 0 8px 20px rgba(8, 115, 110, 0.22);
    }

    .hero {
      display: grid;
      grid-template-columns: minmax(0, 1.15fr) minmax(300px, 0.85fr);
      gap: 22px;
      align-items: stretch;
      margin-bottom: 24px;
    }

    .hero-main,
    .stage-card,
    .phase-card,
    .loop-board,
    .change-board article,
    .next-card,
    .teacher-note {
      border: 1px solid var(--line);
      background: var(--surface);
      border-radius: 22px;
      box-shadow: var(--shadow);
    }

    .hero-main {
      padding: 34px;
      min-height: 330px;
      display: grid;
      align-content: space-between;
      gap: 24px;
      border-top: 7px solid var(--blue);
    }

    .eyebrow {
      display: inline-flex;
      gap: 9px;
      align-items: center;
      color: var(--teal);
      font-size: 0.82rem;
      font-weight: 800;
      letter-spacing: 0;
      text-transform: uppercase;
    }

    .eyebrow::before {
      content: "";
      width: 28px;
      height: 3px;
      border-radius: 999px;
      background: var(--teal);
    }

    h1,
    h2,
    h3,
    p {
      margin: 0;
    }

    h1 {
      margin-top: 12px;
      max-width: 15em;
      overflow-wrap: anywhere;
      font-size: clamp(1.8rem, 3vw, 2.8rem);
      line-height: 1.12;
      letter-spacing: 0;
    }

    .hero-main p,
    .stage-card p,
    .phase-card p,
    .loop-steps p,
    .change-board p,
    .teacher-note p {
      color: var(--muted);
    }

    .meta-row {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    .meta-row span,
    .meta-row a {
      display: inline-flex;
      align-items: center;
      min-height: 32px;
      padding: 6px 11px;
      border: 1px solid var(--line);
      border-radius: 999px;
      background: #f5f0e4;
      color: var(--muted);
      font-size: 0.82rem;
      text-decoration: none;
    }

    .stage-card {
      padding: 28px;
      display: grid;
      gap: 18px;
      background:
        radial-gradient(circle at top right, rgba(242, 201, 76, 0.26), transparent 36%),
        var(--surface);
    }

    .stage-card__label {
      color: var(--orange);
      font-weight: 800;
      font-size: 0.82rem;
    }

    .stage-card strong {
      display: block;
      font-size: clamp(1.65rem, 3vw, 2.55rem);
      line-height: 1.18;
      color: var(--blue);
    }

    .stage-path {
      list-style: none;
      display: grid;
      gap: 10px;
      margin: 0;
      padding: 0;
    }

    .stage-path li {
      display: grid;
      grid-template-columns: 22px minmax(0, 1fr);
      gap: 9px 10px;
      align-items: center;
      color: var(--muted);
    }

    .stage-path strong,
    .stage-path small {
      display: block;
      grid-column: 2;
    }

    .stage-path strong {
      color: inherit;
      font-size: 0.95rem;
    }

    .stage-path small {
      margin-top: -9px;
      font-size: 0.76rem;
    }

    .stage-dot {
      grid-row: span 2;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      border: 3px solid #cfc7b8;
      background: var(--surface);
    }

    .stage-path .is-done,
    .stage-path .is-current {
      color: var(--ink);
    }

    .stage-path .is-done .stage-dot {
      border-color: var(--teal);
      background: var(--teal);
    }

    .stage-path .is-current .stage-dot {
      border-color: var(--orange);
      background: var(--yellow);
      box-shadow: 0 0 0 6px rgba(242, 201, 76, 0.24);
    }

    .section-head {
      display: flex;
      justify-content: space-between;
      gap: 18px;
      align-items: end;
      margin: 34px 0 14px;
    }

    .section-head h2 {
      font-size: clamp(1.35rem, 2.5vw, 2rem);
      line-height: 1.2;
      letter-spacing: 0;
    }

    .section-head p {
      max-width: 560px;
      color: var(--muted);
      font-size: 0.95rem;
    }

    .phase-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 14px;
    }

    .phase-card {
      padding: 20px;
      display: grid;
      gap: 12px;
      min-height: 252px;
      box-shadow: 0 10px 28px rgba(32, 36, 38, 0.1);
    }

    .phase-card.has-evidence {
      border-top: 6px solid var(--teal);
    }

    .phase-card.is-empty {
      border-style: dashed;
      background: #f7f1e5;
      box-shadow: none;
    }

    .phase-card__head {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      align-items: center;
    }

    .phase-card__head span {
      color: var(--blue);
      font-size: 0.8rem;
      font-weight: 800;
    }

    .phase-card__head b {
      padding: 4px 9px;
      border-radius: 999px;
      background: var(--surface-soft);
      color: var(--green);
      font-size: 0.74rem;
    }

    .phase-card h3 {
      font-size: 1.18rem;
      line-height: 1.35;
    }

    .phase-card small {
      color: var(--muted);
      font-size: 0.82rem;
    }

    .evidence-meter {
      height: 12px;
      overflow: hidden;
      border-radius: 999px;
      background: #e3dbcb;
    }

    .evidence-meter i {
      display: block;
      height: 100%;
      border-radius: inherit;
      background: linear-gradient(90deg, var(--teal), var(--yellow), var(--orange));
    }

    .loop-board {
      margin-top: 18px;
      padding: 24px;
      box-shadow: 0 10px 28px rgba(32, 36, 38, 0.1);
    }

    .loop-board .section-head {
      margin: 0 0 18px;
    }

    .loop-steps {
      list-style: none;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      margin: 0;
      padding: 0;
    }

    .loop-steps li {
      display: grid;
      grid-template-columns: 42px minmax(0, 1fr);
      gap: 12px;
      padding: 16px;
      border: 1px solid var(--line);
      border-radius: 16px;
      background: #fffaf0;
    }

    .loop-steps li.has-evidence {
      border-left: 6px solid var(--teal);
    }

    .loop-steps li.is-empty {
      border-style: dashed;
      background: #f7f1e5;
    }

    .loop-index {
      display: grid;
      place-items: center;
      width: 38px;
      height: 38px;
      border-radius: 999px;
      background: var(--blue);
      color: #fff;
      font-weight: 900;
    }

    .loop-steps small {
      color: var(--green);
      font-size: 0.75rem;
      font-weight: 800;
    }

    .loop-steps h3 {
      margin: 2px 0 6px;
      font-size: 1.05rem;
      line-height: 1.35;
    }

    .loop-steps h3 em {
      display: block;
      color: var(--muted);
      font-size: 0.82rem;
      font-style: normal;
      font-weight: 700;
    }

    .change-board {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 54px minmax(0, 1fr);
      gap: 16px;
      align-items: stretch;
    }

    .change-board article {
      padding: 24px;
      box-shadow: 0 10px 28px rgba(32, 36, 38, 0.1);
    }

    .change-board .after {
      border-top: 6px solid var(--orange);
      background: #fff9e8;
    }

    .change-board span {
      display: block;
      margin-bottom: 8px;
      color: var(--teal);
      font-weight: 800;
      font-size: 0.78rem;
    }

    .change-board h2 {
      margin-bottom: 10px;
      font-size: 1.25rem;
    }

    .change-arrow {
      display: grid;
      place-items: center;
      width: 54px;
      min-height: 100%;
      border-radius: 18px;
      background: var(--blue);
      color: #fff;
      font-size: 1.6rem;
      font-weight: 900;
    }

    .next-card {
      margin-top: 16px;
      padding: 24px;
      border-left: 7px solid var(--green);
    }

    .next-card h2 {
      margin-bottom: 12px;
      font-size: 1.35rem;
    }

    .action-list {
      display: grid;
      gap: 10px;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .action-list li {
      position: relative;
      padding: 12px 14px 12px 42px;
      border-radius: 14px;
      background: var(--surface-soft);
    }

    .action-list li::before {
      content: "✓";
      position: absolute;
      left: 14px;
      top: 12px;
      color: var(--green);
      font-weight: 900;
    }

    .teacher-note {
      margin-top: 18px;
      padding: 22px;
      display: grid;
      grid-template-columns: minmax(220px, 0.72fr) minmax(0, 1.28fr);
      gap: 18px;
      background: #eef6fb;
      box-shadow: none;
    }

    footer {
      margin-top: 34px;
      color: var(--muted);
      font-size: 0.82rem;
      text-align: center;
    }

    @media (max-width: 860px) {
      .hero,
      .phase-grid,
      .loop-steps,
      .change-board,
      .teacher-note {
        grid-template-columns: 1fr;
      }

      .change-arrow {
        width: 100%;
        min-height: 48px;
        transform: rotate(90deg);
      }

      .section-head {
        display: grid;
        align-items: start;
      }
    }

    @media (max-width: 560px) {
      .page {
        width: min(100% - 22px, 1120px);
        padding-top: 18px;
      }

      .topbar {
        display: grid;
      }

      .hero-main,
      .stage-card,
      .phase-card,
      .loop-board,
      .change-board article,
      .next-card,
      .teacher-note {
        border-radius: 18px;
      }

      .hero-main,
      .stage-card {
        padding: 22px;
      }
    }
  </style>
</head>
<body>
  <main class="page">
    <header class="topbar">
      <div class="brand"><span class="brand-mark">思</span><span>Codex Study Harness</span></div>
      <div>生成日時: ${escapeHtml(model.generatedAt)}</div>
    </header>

    <section class="hero" aria-label="思考深化レポートの概要">
      <div class="hero-main">
        <div>
          <span class="eyebrow">Thinking Depth Report</span>
          <h1>${escapeHtml(model.title)}</h1>
        </div>
        <p>${escapeHtml(model.goal || "このHTMLは、今回の学習で考えがどう深まったかを、中学生にも読みやすい形でまとめたものです。")}</p>
        <div class="meta-row">
          ${sourceLink}
          <span>点数ではなく、思考の道すじを見る</span>
        </div>
      </div>

      <aside class="stage-card" aria-label="今回の思考の現在地">
        <div>
          <span class="stage-card__label">今回の現在地</span>
          <strong>${escapeHtml(model.stage.title)}</strong>
        </div>
        <p>${escapeHtml(model.stage.description)}</p>
        ${renderStagePath(model.stage)}
      </aside>
    </section>

    <section aria-label="思考の道すじ">
      <div class="section-head">
        <div>
          <span class="eyebrow">Route Map</span>
          <h2>どう考えが進んだか</h2>
        </div>
        <p>棒の長さは点数ではありません。学習ログから、その考え方がどれくらいはっきり読めるかを表しています。</p>
      </div>
      ${renderPhaseCards(model.phases)}
    </section>

    ${renderLearningLoop(model.learningLoop)}

    ${renderBeforeAfter(model)}

    <section class="next-card" aria-label="次に使うこと">
      <h2>次に使えること</h2>
      ${renderActionList(model.actionItems, model.stage.next)}
    </section>

    ${renderTeacherNote()}

    <footer>
      Generated from ${escapeHtml(model.source.sourceLabel)}. This file is a local learning artifact and is not committed unless you choose to publish it.
    </footer>
  </main>
</body>
</html>
`;
}

function markdownValue(value, fallback = "未記録") {
  return normalize(value) || fallback;
}

function escapeMarkdownTable(value) {
  return String(value || "")
    .replaceAll("|", "\\|")
    .replace(/\s+/g, " ")
    .trim();
}

function renderMarkdown(model) {
  const sourceLine = model.source.url
    ? `[${model.source.sourceLabel}](${model.source.url})`
    : model.source.sourceLabel;
  const phaseRows = [
    "| 観点 | 見え方 | 内容 |",
    "| --- | --- | --- |",
    ...model.phases.map(
      (phase) =>
        `| ${escapeMarkdownTable(phase.label)} | ${escapeMarkdownTable(phase.status)} | ${escapeMarkdownTable(phase.text)} |`,
    ),
  ].join("\n");
  const actionItems = model.actionItems.length
    ? model.actionItems.map((item) => `- ${item}`).join("\n")
    : `- ${model.stage.next}`;
  const loopRows = [
    "| 段階 | 状態 | 拾った内容 |",
    "| --- | --- | --- |",
    ...model.learningLoop.map(
      (step) =>
        `| ${escapeMarkdownTable(step.label)} | ${escapeMarkdownTable(step.items.length ? "見える" : "これから")} | ${escapeMarkdownTable(step.text)} |`,
    ),
  ].join("\n");

  return [
    `# 思考深化レポート: ${model.title}`,
    "",
    "このファイルは、GitHub Pagesの権限や設定でHTML公開ができない場合でも学習の成果を読めるようにするためのMarkdown版です。",
    "",
    "## 概要",
    "",
    `- 生成元: ${sourceLine}`,
    `- 生成日時: ${model.generatedAt}`,
    `- 今回の現在地: ${model.stage.title}`,
    `- 目標: ${markdownValue(model.goal)}`,
    `- 最初の見方: ${markdownValue(model.firstView || model.blockers)}`,
    "",
    "## 思考の道すじ",
    "",
    phaseRows,
    "",
    "## 一周ごとの考えの進み方",
    "",
    loopRows,
    "",
    "## 変化",
    "",
    `- 最初: ${markdownValue(model.before)}`,
    `- 後から見えたこと: ${markdownValue(model.after)}`,
    "",
    "## 次に使えること",
    "",
    actionItems,
    "",
    "## 次回復習",
    "",
    markdownValue(model.review || model.nextTask),
    "",
  ].join("\n");
}

function writeReport(content, outputPath) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, content, "utf8");
}

const args = parseArgs(process.argv.slice(2));
const source = await loadSource(args);
const model = buildReportModel(source);
const outputPath = path.resolve(root, args.out || defaultOutputPath);
const markdownOutputPath = args["markdown-out"] ? path.resolve(root, args["markdown-out"]) : "";

writeReport(renderHtml(model), outputPath);
if (markdownOutputPath) {
  writeReport(renderMarkdown(model), markdownOutputPath);
}

console.log(`Thinking depth HTML generated: ${path.relative(root, outputPath).replaceAll("\\", "/")}`);
if (markdownOutputPath) {
  console.log(
    `Thinking depth Markdown generated: ${path.relative(root, markdownOutputPath).replaceAll("\\", "/")}`,
  );
}
console.log(`Source: ${source.sourceLabel}`);
