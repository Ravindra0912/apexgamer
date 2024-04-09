const puppeteer = require("puppeteer");

const getIgnReviewAndRating = async (url) => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url);

  const reviewSummary = await page.evaluate(() => {
    const rating = document.querySelector(
      ".review-score figcaption"
    ).textContent;
    const reviewRawScripts = document.querySelectorAll(".article-page p");

    const parsedReviewScript = Array.from(reviewRawScripts).map(
      (elem) => elem.textContent
    )?.join('');
    return {
      rating: parseInt(rating),
      reviewScript: parsedReviewScript,
    };
  });
  console.log(reviewSummary);
  browser.close();
};

const getPCGamerReviewAndRating = async (url) => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url);

  const reviewSummary = await page.evaluate(() => {
    const rating = document.querySelector(".score").textContent;
    const reviewRawScripts = document.querySelectorAll("#article-body p");

    const parsedReviewScript = Array.from(reviewRawScripts).map(
      (elem) => elem.textContent
    );
    return {
      rating: parseInt(rating),
      reviewScript: parsedReviewScript,
    };
  });
  console.log(reviewSummary);
  browser.close();
};

const getGamespotReviewAndRating = async (url) => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url);

  const reviewSummary = await page.evaluate(() => {
    const rating = document.querySelector(
      ".review-ring-score__score"
    ).textContent;
    const reviewRawScripts = document.querySelectorAll(".article-body p");

    const parsedReviewScript = Array.from(reviewRawScripts).map(
      (elem) => elem.textContent
    );
    console.log(typeof parsedReviewScript);
    return {
      rating: parseInt(rating),
      reviewScript: parsedReviewScript,
    };
  });
  console.log(reviewSummary);
  browser.close();
};

getIgnReviewAndRating(
  "https://www.ign.com/articles/hogwarts-legacy-review-harry-potter-ps5-xbox-pc"
);

// getPCGamerReviewAndRating("https://www.pcgamer.com/hogwarts-legacy-review/");

// getGamespotReviewAndRating(
//   "https://www.gamespot.com/reviews/hogwarts-legacy-review-sleight-of-hand/1900-6418032/"
// );

module.exports = {
  getIgnReviewAndRating,
  getPCGamerReviewAndRating,
};
