import fs from "fs";
import * as cheerio from "cheerio";

const file = process.argv[2] || "src/data/raw/olympic-paddington-offset-0-attempt-1.html";
const html = fs.readFileSync(file, "utf8");
const $ = cheerio.load(html);

const sels = [
  "[data-testid='review-card']",
  "[data-testid='review']",
  ".review_list_new_item_block",
  ".c-review-block",
  "[data-review-url]",
  ".bui-review-score__badge",
  ".review-score-badge",
  "li.review_list_new_item_block",
  ".c-review",
  "[itemprop='review']",
];
for (const s of sels) console.log(s, $(s).length);

// dump class names containing review
const classes = new Set();
$("[class*='review']").each((_, el) => {
  const c = $(el).attr("class");
  if (c) classes.add(c.split(/\s+/).slice(0, 3).join("."));
});
console.log("sample review classes", [...classes].slice(0, 40));

console.log("has challenge", /challenge|captcha|cf-browser/i.test(html));
console.log("title", $("title").text());
console.log("h1", $("h1").first().text());
