const { getRawgData } = require("./service/rawgApiClient");
const express = require("express");
const mongoose = require("mongoose");
const { getAllGames } = require("./gamesService");
const app = express();
const port = process.env.PORT;

const uri = process.env.MONGODB_URI;

const gamesList = [
  {
    name: "Final Fantasy XVI",
    summary: [
      "💥 Captivating addition to the Final Fantasy franchise",
      "🎮 Blends character action gameplay with RPG mechanics",
      "🌟 Epic story, unforgettable characters, and breathtaking moments",
      "⚔️ Excellent combat, though not on par with other character action games",
      "📚 Accessible lore through Active Time Lore feature",
      "🌌 Introduction of icons and dominance adds depth to story and combat",
      "⚡️ Fast-paced combat system rewarding skillful play",
    ],
  },
  // "Cyberpunk 2077 Phantom Liberty",
  // "The Crew Motorfest",
  // "Sons of the Forest",
  // "Marvel’s Spider-Man 2",
  // "Star Wars Jedi: Survivor",
  {
    name: "Hogwarts Legacy",
    summary: [
      "⚡ Hogwarts Legacy is the Harry Potter RPG fans have been waiting for since childhood.",
      "🌍 The open world map perfectly captures the atmosphere of Hogwarts School of Witchcraft and Wizardry.",
      "🧙‍♂️ The spell-casting combat is stupefyingly good and offers creative combos and engaging challenges.",
      "🎭 The characters in the game are charming, unforgettable, and bring the Wizarding World to life.",
      "⌛ The game offers countless diversions and activities to immerse players for hours on end.",
      "🐉 Despite technical issues and a lack of enemy variety, Hogwarts Legacy still delivers an enchanting experience.",
      "🎮 Overall, the game is a triumphant visit to the Wizarding World that will captivate fans of the Harry Potter series.",
    ],
  },
  // "Dead Island 2",
  // "Season: A Letter to the Future",
  // "Diablo IV",
  // "Atomic Heart",
  {
    name: "Assassin’s Creed Mirage",
    summary: [
      "🗺️ The game features a smaller map and a more limited selection of gear, which is refreshing compared to the bloated scale of previous installments.",
      "⚔️ Stealth is emphasized, with the removal of XP and levels, making every enemy just a hidden blade away from defeat.",
      "🌆 The detailed and historically-rich setting of Baghdad adds to the immersive experience, with bustling streets and city blocks to explore.",
      "📜 The story is straightforward and fast-paced, but lacks depth and memorable characters.",
      "🏰 The locations and infiltrations in Mirage are not groundbreaking, but there are new and returning ways to sneak into fortifications, adding variety to gameplay.",
      "⚔️ Combat is slower and more deliberate, with a focus on counters and dodging, providing a unique and challenging experience.",
    ],
  },
  // "Starfield",
  // "Avatar Frontiers of Pandora",
  // "The Legend of Zelda: Tears of the Kingdom",
];

// gameInfo

const gamesListSchema = new mongoose.Schema({
  rId: Number,
  rating: Number,
  ratings: [[{ metacritic: Number, rawg: Number }]],
  backgroundImage: String,
  reviewSummary: [[String]], // to have a separate API call
  dominantColor: String, // dominant_color,
  screenShots: [[{ id: Number, image: String }]],
});

const Game = mongoose.model("Games", gamesListSchema);

async function connect() {
  try {
    await mongoose.connect(uri);
    console.log("CONNECTED TO MONGODB");
  } catch (e) {
    console.log("ERROR", e);
    console.log(e);
  }
}

connect();

app.listen(port, () => {
  console.log(`Example app listening on port ${port}!`);
});

app.get("/getGames", async (req, res) => {
  const data = await Game.find({});
  res.send(data);
});

app.get("/saveNewGames", async (req, res) => {
  try {
    const response = await getAllGames(gamesList);
    const gameInstances = response.map(
      ({
        id,
        ratings,
        metacritic,
        background_image,
        dominant_color,
        short_screenshots,
        reviewSummary,
      }) => {
        return {
          rId: id,
          ratings,
          backgroundImage: background_image,
          metacritic,
          reviewSummary, // to have a separate API call
          dominantColor: dominant_color,
          screenShots: short_screenshots,
        };
      }
    );
    const insertedGames = await Game.insertMany(gameInstances);
    res.send({
      insertedGames,
    });
  } catch (e) {
    console.log("ERROR", e);
  }
});

app.delete("/deleteAll", async (req, res) => {
  await Game.deleteMany({});
  res.send("all games deleted");
});

app.get("/games", async (req, res) => {
  const games = await Game.find({});
  res.send({
    games,
  });
});
