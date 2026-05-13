import fs from "node:fs";
import { spawnSync } from "node:child_process";

const labels = JSON.parse(fs.readFileSync("config/labels.json", "utf8"));

function runGh(args) {
  return spawnSync("gh", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

const auth = runGh(["auth", "status"]);
if (auth.status !== 0) {
  console.error("GitHub CLI is not authenticated. Run `gh auth login` first.");
  process.exit(auth.status ?? 1);
}

for (const label of labels) {
  const create = runGh([
    "label",
    "create",
    label.name,
    "--description",
    label.description,
    "--color",
    label.color,
  ]);

  if (create.status === 0) {
    console.log(`created ${label.name}`);
    continue;
  }

  const edit = runGh([
    "label",
    "edit",
    label.name,
    "--description",
    label.description,
    "--color",
    label.color,
  ]);

  if (edit.status !== 0) {
    console.error(`failed to sync ${label.name}`);
    console.error(edit.stderr.trim() || create.stderr.trim());
    process.exit(edit.status ?? 1);
  }

  console.log(`updated ${label.name}`);
}

console.log("Label sync complete.");
