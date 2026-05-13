import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";

const root = process.cwd();
const errors = [];

const requiredFiles = [
  "AGENTS.md",
  "README.md",
  "LICENSE",
  ".github/pull_request_template.md",
  ".github/ISSUE_TEMPLATE/study-task.yml",
  ".github/ISSUE_TEMPLATE/mistake-review.yml",
  ".github/ISSUE_TEMPLATE/question-intake.yml",
  "config/labels.json",
  "docs/auto-recording-workflow.md",
  "docs/insight-capture-checklist.md",
  "docs/learning-review-checklist.md",
  "docs/reflection-template.md",
  "docs/labels.md",
  "prompts/auto-issue-recorder.md",
];

const requiredLearningLogHeadings = [
  "# ",
  "## 関連Issue",
  "## 問題提起",
  "## 今日の目標",
  "## 最初の理解",
  "## わからなかったこと",
  "## 自分で考えたこと",
  "## 学習中に出た仮説",
  "## 思考の変化",
  "## なるほどポイント",
  "## 得た知見",
  "## 次に使える判断基準",
  "## Codexとの対話で気づいたこと",
  "## 根拠確認の結果",
  "## 間違いの原因",
  "## 解き直し・説明",
  "## 類題・確認問題の結果",
  "## まだ不安なこと",
  "## 次回復習すること",
  "## 次回復習日",
];

const requiredReflectionTemplateHeadings = requiredLearningLogHeadings.filter(
  (heading) => heading !== "# ",
);

const requiredPrTemplateHeadings = [
  "## 学習テーマ",
  "## 関連Issue",
  "## 達成したこと",
  "## 最初にわからなかったこと",
  "## Codexとの対話で気づいたこと",
  "## 思考の変化",
  "## 得た知見",
  "## 次に使える判断基準",
  "## 間違いの原因",
  "## 類題・確認問題",
  "## まだ不安なこと",
  "## 次回復習",
];

const requiredAgentPhrases = [
  "## 自動記録ルール",
  "## 知見化の原則",
  "### 開始時一周記録",
  "思考の転換点",
  "得た知見",
  "次に使える判断基準",
];

const requiredAutoIssueRecorderPhrases = [
  "## 開始時一周記録",
  "## 問題提起",
  "## 学習者の仮説・考え",
  "## 次の確認問題",
  "見出し名を言い換えないでください",
];

const requiredPortfolioWorkflowPhrases = [
  "issues:",
  "closed",
  "Resolve thinking-depth issue",
  "Build thinking-depth report",
  "deploy-pages",
];

const requiredCloseOrderPhrases = [
  "main合流後にIssueをClose",
];

const requiredReadmePhrases = [
  "Source は `GitHub Actions` にします。",
  "mainに合流してからIssueを閉じます",
];

const requiredLicensePhrases = [
  "MIT License",
  "Aoyama Gakuin Junior High School, Noboru Ando",
];

function fullPath(relativePath) {
  return path.join(root, relativePath);
}

function readFile(relativePath) {
  return fs.readFileSync(fullPath(relativePath), "utf8");
}

function fileExists(relativePath) {
  return fs.existsSync(fullPath(relativePath));
}

function listFiles(relativeDir, extension) {
  const dir = fullPath(relativeDir);
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(extension))
    .map((entry) => path.join(relativeDir, entry.name).replaceAll("\\", "/"));
}

function listFilesRecursive(relativeDir, extension) {
  const dir = fullPath(relativeDir);
  if (!fs.existsSync(dir)) return [];

  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const relativePath = path
      .join(relativeDir, entry.name)
      .replaceAll("\\", "/");

    if (entry.isDirectory()) {
      results.push(...listFilesRecursive(relativePath, extension));
    } else if (entry.isFile() && entry.name.endsWith(extension)) {
      results.push(relativePath);
    }
  }

  return results;
}

function assertIncludes(relativePath, content, expected) {
  for (const item of expected) {
    if (!content.includes(item)) {
      errors.push(`${relativePath}: missing required content: ${item}`);
    }
  }
}

function checkRequiredFiles() {
  for (const relativePath of requiredFiles) {
    if (!fileExists(relativePath)) {
      errors.push(`missing required file: ${relativePath}`);
    }
  }
}

function parseYamlFile(relativePath) {
  const content = readFile(relativePath);

  try {
    return YAML.parse(content);
  } catch (error) {
    errors.push(`${relativePath}: invalid YAML: ${error.message}`);
    return null;
  }
}

function checkYamlSyntax() {
  for (const relativePath of listFilesRecursive(".github", ".yml")) {
    parseYamlFile(relativePath);
  }
}

function checkYamlTemplates() {
  const templates = listFiles(".github/ISSUE_TEMPLATE", ".yml");

  for (const relativePath of templates) {
    const parsed = parseYamlFile(relativePath);
    if (!parsed) continue;

    if (!parsed || typeof parsed !== "object") {
      errors.push(`${relativePath}: YAML must parse to an object`);
      continue;
    }

    for (const key of ["name", "description", "title", "labels", "body"]) {
      if (!(key in parsed)) {
        errors.push(`${relativePath}: missing top-level key: ${key}`);
      }
    }

    if (!Array.isArray(parsed.labels) || parsed.labels.length === 0) {
      errors.push(`${relativePath}: labels must be a non-empty array`);
    } else {
      const countPrefix = (prefix) =>
        parsed.labels.filter((label) => label.startsWith(prefix)).length;
      const typeCount = countPrefix("type:");
      const statusCount = countPrefix("status:");
      const portfolioCount = countPrefix("portfolio:");

      if (typeCount !== 1) {
        errors.push(`${relativePath}: labels must include exactly one type:* label`);
      }
      if (statusCount !== 1) {
        errors.push(`${relativePath}: labels must include exactly one status:* label`);
      }
      if (portfolioCount !== 1) {
        errors.push(
          `${relativePath}: labels must include exactly one portfolio:* label`,
        );
      }
      if (
        parsed.labels.includes("portfolio:show") &&
        parsed.labels.includes("portfolio:hide")
      ) {
        errors.push(
          `${relativePath}: labels must not include both portfolio:show and portfolio:hide`,
        );
      }
    }

    if (!Array.isArray(parsed.body) || parsed.body.length === 0) {
      errors.push(`${relativePath}: body must be a non-empty array`);
      continue;
    }

    for (const [index, item] of parsed.body.entries()) {
      if (!item || typeof item !== "object") {
        errors.push(`${relativePath}: body[${index}] must be an object`);
        continue;
      }

      for (const key of ["type", "id", "attributes"]) {
        if (!(key in item)) {
          errors.push(`${relativePath}: body[${index}] missing key: ${key}`);
        }
      }

      if (!item.attributes?.label) {
        errors.push(`${relativePath}: body[${index}] missing attributes.label`);
      }
    }
  }
}

function checkMarkdownRequiredHeadings() {
  const reflection = readFile("docs/reflection-template.md");
  assertIncludes(
    "docs/reflection-template.md",
    reflection,
    requiredReflectionTemplateHeadings,
  );

  const prTemplate = readFile(".github/pull_request_template.md");
  assertIncludes(
    ".github/pull_request_template.md",
    prTemplate,
    requiredPrTemplateHeadings,
  );

  const agents = readFile("AGENTS.md");
  assertIncludes("AGENTS.md", agents, requiredAgentPhrases);
  assertIncludes("AGENTS.md", agents, requiredCloseOrderPhrases);

  const readme = readFile("README.md");
  assertIncludes("README.md", readme, requiredReadmePhrases);

  const license = readFile("LICENSE");
  assertIncludes("LICENSE", license, requiredLicensePhrases);

  const recorder = readFile("prompts/auto-issue-recorder.md");
  assertIncludes(
    "prompts/auto-issue-recorder.md",
    recorder,
    requiredAutoIssueRecorderPhrases,
  );
  assertIncludes(
    "prompts/auto-issue-recorder.md",
    recorder,
    requiredCloseOrderPhrases,
  );

  const autoRecordingWorkflow = readFile("docs/auto-recording-workflow.md");
  assertIncludes(
    "docs/auto-recording-workflow.md",
    autoRecordingWorkflow,
    requiredCloseOrderPhrases,
  );

  const portfolioWorkflow = readFile(".github/workflows/portfolio.yml");
  assertIncludes(
    ".github/workflows/portfolio.yml",
    portfolioWorkflow,
    requiredPortfolioWorkflowPhrases,
  );
}

function checkLearningLogs() {
  const logs = listFiles("learning-log", ".md").filter(
    (relativePath) => !relativePath.endsWith(".gitkeep"),
  );

  for (const relativePath of logs) {
    const content = readFile(relativePath);
    assertIncludes(relativePath, content, requiredLearningLogHeadings);

    if (content.includes("## 類題・確認問題の結果\n\n未実施")) {
      errors.push(
        `${relativePath}: confirmation question is still marked 未実施`,
      );
    }
  }
}

function checkNoPlaceholderCloseText() {
  const prTemplate = readFile(".github/pull_request_template.md");
  if (!prTemplate.includes("Closes #")) {
    errors.push(".github/pull_request_template.md: missing related issue line");
  }
}

function checkLabelConfig() {
  let labels;
  try {
    labels = JSON.parse(readFile("config/labels.json"));
  } catch (error) {
    errors.push(`config/labels.json: invalid JSON: ${error.message}`);
    return;
  }

  if (!Array.isArray(labels) || labels.length === 0) {
    errors.push("config/labels.json: must be a non-empty array");
    return;
  }

  const seen = new Set();
  for (const [index, label] of labels.entries()) {
    if (!label || typeof label !== "object") {
      errors.push(`config/labels.json: label[${index}] must be an object`);
      continue;
    }

    for (const key of ["name", "description", "color"]) {
      if (!label[key]) {
        errors.push(`config/labels.json: label[${index}] missing ${key}`);
      }
    }

    if (seen.has(label.name)) {
      errors.push(`config/labels.json: duplicate label ${label.name}`);
    }
    seen.add(label.name);

    if (label.color && !/^[0-9a-fA-F]{6}$/.test(label.color)) {
      errors.push(`config/labels.json: invalid color for ${label.name}`);
    }
  }
}

checkYamlSyntax();
checkRequiredFiles();
checkYamlTemplates();
checkLabelConfig();
checkMarkdownRequiredHeadings();
checkLearningLogs();
checkNoPlaceholderCloseText();

if (errors.length > 0) {
  console.error("Learning harness quality checks failed:\n");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Learning harness quality checks passed.");
