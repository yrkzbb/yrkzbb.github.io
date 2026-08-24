"use strict";

const fs = require("fs");
const path = require("path");
const prettier = require("prettier");
const root = path.join(__dirname, "..", "source", "_posts");
const fix = process.argv.includes("--fix");
const files = fs.readdirSync(root).filter((file) => file.endsWith(".md"));

async function main() {
  let issueCount = 0;
  let changedCount = 0;

  for (const file of files) {
    const target = path.join(root, file);
    const original = fs.readFileSync(target, "utf8");
    const formatted = await prettier.format(original, {
      parser: "markdown",
      proseWrap: "preserve",
    });
    if (formatted === original) continue;
    issueCount++;
    if (fix) {
      fs.writeFileSync(target, formatted);
      changedCount++;
    } else {
      console.log(`${file}: 可自动修正排版`);
    }
  }

  if (fix) console.log(`Markdown 自动排版完成：修改 ${changedCount} 篇文章`);
  else
    console.log(
      `Markdown 排版检查完成：${issueCount} 篇文章可优化（运行 npm run format:markdown 自动修正）`,
    );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
