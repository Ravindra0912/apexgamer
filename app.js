const express = require("express");
const app = express();
const port = process.env.PORT;
var bodyParser = require('body-parser')

const gamesRouter = require("./api/v1/routes/gamesRoutes");
const { connectMongo } = require("./config/connection");

app.listen(port, () => {
  console.log(`Example app listening on port ${port}!`);
});

connectMongo();

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

app.use(bodyParser.json());

// Routes
app.use("/games", gamesRouter);

// Schedule the cron job to run once every 24 hours
cron.schedule('0 0 * * *', async () => {
  try {
    console.log('Running cron job: getLatestGamesAndSave');
    await getLatestGamesAndSave();
  } catch (error) {
    console.error('Error running cron job:', error);
  }
});