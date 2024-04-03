const express = require("express");
const app = express();
const port = process.env.PORT;

const gamesRouter = require("./api/v1/routes/gamesRoutes");
const { connectMongo } = require("./config/connection");


app.listen(port, () => {
  console.log(`Example app listening on port ${port}!`);
});

connectMongo();

// Routes
app.use("/games", gamesRouter);
