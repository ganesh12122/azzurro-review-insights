import fs from "fs";
import * as cheerio from "cheerio";

const html = fs.readFileSync(
  `${process.env.TEMP}/booking-reviews.html`,
  "utf8",
);
const $ = cheerio.load(html);
const sels = [
  ".review_list_new_item_block",
  ".c-review-block",
  "[data-review-url]",
  ".bui-review-score__badge",
  ".review_item",
  ".c-review",
  "[data-testid='review-card']",
];
for (const s of sels) console.log(s, $(s).length);

const blocks = $(".review_list_new_item_block, .c-review-block");
console.log("blocks", blocks.length);
blocks.slice(0, 2).each((i, el) => {
  const b = $(el);
  console.log("---", i);
  console.log("score", b.find(".bui-review-score__badge").first().text());
  console.log(
    "title",
    b.find(".c-review-block__title, .review-title").first().text().trim().slice(0, 80),
  );
  console.log(
    "date",
    b.find(".c-review-block__date, .review-date").first().text().trim(),
  );
  console.log("name", b.find(".bui-avatar-block__title").first().text().trim());
  console.log(
    "country",
    b.find(".bui-avatar-block__subtitle").first().text().trim(),
  );
  console.log(
    "bodies",
    b
      .find(".c-review__body")
      .map((_, e) => $(e).text().trim().slice(0, 80))
      .get(),
  );
});
