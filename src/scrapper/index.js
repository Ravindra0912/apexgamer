const puppeteer = require("puppeteer");

const getIgnReviewAndRating = async (url) => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url);

  const reviewSummary = await page.evaluate(() => {
    const ratingRawData = document.querySelector(".review").textContent;
    const ParsedRating = ratingRawData?.trim()?.[0];
    const reviewSummaryRawData = document.querySelector(".blurb").textContent;
    return {
      rating: parseInt(ParsedRating),
      reviewSummary: reviewSummaryRawData,
    };
  });
  console.log(reviewSummary);
  browser.close();
};

module.exports = {
  getIgnReviewAndRating,
};
