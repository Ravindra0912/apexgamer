const express = require("express");
const app = express();
const port = 7000;
var bodyParser = require('body-parser')

const gamesRouter = require("./api/v1/routes/gamesRoutes");
const { connectMongo } = require("./config/connection");
require("./api/v1/workers/gamesWorker");

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


const jobsRouter = require("./api/v1/routes/jobsRoutes");

app.use("/jobs", jobsRouter);

app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || "Internal server error" });
});