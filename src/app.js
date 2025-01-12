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
