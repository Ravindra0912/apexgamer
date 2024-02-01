const { getRawgData } = require("./service/rawgApiClient");
const express = require("express");
const mongoose = require("mongoose");
const app = express();
const port = process.env.PORT;

const uri = process.env.MONGODB_URI;
 
const z = {
  id: 3498,
  slug: "grand-theft-auto-v",
  name: "Grand Theft Auto V",
  released: "2013-09-17",
  tba: false,
  background_image:
    "https://media.rawg.io/media/games/20a/20aa03a10cda45239fe22d035c0ebe64.jpg",
  rating: 4.47,
  rating_top: 5,
  ratings: [
    {
      id: 5,
      title: "exceptional",
      count: 4019,
      percent: 59.05,
    },
    {
      id: 4,
      title: "recommended",
      count: 2228,
      percent: 32.74,
    },
    {
      id: 3,
      title: "meh",
      count: 434,
      percent: 6.38,
    },
    {
      id: 1,
      title: "skip",
      count: 125,
      percent: 1.84,
    },
  ],
  ratings_count: 6706,
  reviews_text_count: 58,
  added: 20497,
  added_by_status: {
    yet: 525,
    owned: 11738,
    beaten: 5811,
    toplay: 609,
    dropped: 1092,
    playing: 722,
  },
  metacritic: 92,
  playtime: 74,
  suggestions_count: 429,
  updated: "2024-01-26T00:43:03",
  user_game: null,
  reviews_count: 6806,
  saturated_color: "0f0f0f",
  dominant_color: "0f0f0f",
  platforms: [
    {
      platform: {
        id: 4,
        name: "PC",
        slug: "pc",
        image: null,
        year_end: null,
        year_start: null,
        games_count: 524692,
        image_background:
          "https://media.rawg.io/media/games/f87/f87457e8347484033cb34cde6101d08d.jpg",
      },
      released_at: "2013-09-17",
      requirements_en: {
        minimum:
          "Minimum:OS: Windows 10 64 Bit, Windows 8.1 64 Bit, Windows 8 64 Bit, Windows 7 64 Bit Service Pack 1, Windows Vista 64 Bit Service Pack 2* (*NVIDIA video card recommended if running Vista OS)Processor: Intel Core 2 Quad CPU Q6600 @ 2.40GHz (4 CPUs) / AMD Phenom 9850 Quad-Core Processor (4 CPUs) @ 2.5GHzMemory: 4 GB RAMGraphics: NVIDIA 9800 GT 1GB / AMD HD 4870 1GB (DX 10, 10.1, 11)Storage: 72 GB available spaceSound Card: 100% DirectX 10 compatibleAdditional Notes: Over time downloadable content and programming changes will change the system requirements for this game.  Please refer to your hardware manufacturer and www.rockstargames.com/support for current compatibility information. Some system components such as mobile chipsets, integrated, and AGP graphics cards may be incompatible. Unlisted specifications may not be supported by publisher.     Other requirements:  Installation and online play requires log-in to Rockstar Games Social Club (13+) network; internet connection required for activation, online play, and periodic entitlement verification; software installations required including Rockstar Games Social Club platform, DirectX , Chromium, and Microsoft Visual C++ 2008 sp1 Redistributable Package, and authentication software that recognizes certain hardware attributes for entitlement, digital rights management, system, and other support purposes.     SINGLE USE SERIAL CODE REGISTRATION VIA INTERNET REQUIRED; REGISTRATION IS LIMITED TO ONE ROCKSTAR GAMES SOCIAL CLUB ACCOUNT (13+) PER SERIAL CODE; ONLY ONE PC LOG-IN ALLOWED PER SOCIAL CLUB ACCOUNT AT ANY TIME; SERIAL CODE(S) ARE NON-TRANSFERABLE ONCE USED; SOCIAL CLUB ACCOUNTS ARE NON-TRANSFERABLE.  Partner Requirements:  Please check the terms of service of this site before purchasing this software.",
        recommended:
          "Recommended:OS: Windows 10 64 Bit, Windows 8.1 64 Bit, Windows 8 64 Bit, Windows 7 64 Bit Service Pack 1Processor: Intel Core i5 3470 @ 3.2GHz (4 CPUs) / AMD X8 FX-8350 @ 4GHz (8 CPUs)Memory: 8 GB RAMGraphics: NVIDIA GTX 660 2GB / AMD HD 7870 2GBStorage: 72 GB available spaceSound Card: 100% DirectX 10 compatibleAdditional Notes:",
      },
      requirements_ru: null,
    },
    {
      platform: {
        id: 187,
        name: "PlayStation 5",
        slug: "playstation5",
        image: null,
        year_end: null,
        year_start: 2020,
        games_count: 1000,
        image_background:
          "https://media.rawg.io/media/games/559/559bc0768f656ad0c63c54b80a82d680.jpg",
      },
      released_at: "2013-09-17",
      requirements_en: null,
      requirements_ru: null,
    },
    {
      platform: {
        id: 186,
        name: "Xbox Series S/X",
        slug: "xbox-series-x",
        image: null,
        year_end: null,
        year_start: 2020,
        games_count: 866,
        image_background:
          "https://media.rawg.io/media/games/082/082365507ff04d456c700157072d35db.jpg",
      },
      released_at: "2013-09-17",
      requirements_en: null,
      requirements_ru: null,
    },
    {
      platform: {
        id: 18,
        name: "PlayStation 4",
        slug: "playstation4",
        image: null,
        year_end: null,
        year_start: null,
        games_count: 6747,
        image_background:
          "https://media.rawg.io/media/games/9dd/9ddabb34840ea9227556670606cf8ea3.jpg",
      },
      released_at: "2013-09-17",
      requirements_en: null,
      requirements_ru: null,
    },
    {
      platform: {
        id: 16,
        name: "PlayStation 3",
        slug: "playstation3",
        image: null,
        year_end: null,
        year_start: null,
        games_count: 3160,
        image_background:
          "https://media.rawg.io/media/games/4a0/4a0a1316102366260e6f38fd2a9cfdce.jpg",
      },
      released_at: "2013-09-17",
      requirements_en: null,
      requirements_ru: null,
    },
    {
      platform: {
        id: 14,
        name: "Xbox 360",
        slug: "xbox360",
        image: null,
        year_end: null,
        year_start: null,
        games_count: 2787,
        image_background:
          "https://media.rawg.io/media/games/15c/15c95a4915f88a3e89c821526afe05fc.jpg",
      },
      released_at: "2013-09-17",
      requirements_en: null,
      requirements_ru: null,
    },
    {
      platform: {
        id: 1,
        name: "Xbox One",
        slug: "xbox-one",
        image: null,
        year_end: null,
        year_start: null,
        games_count: 5572,
        image_background:
          "https://media.rawg.io/media/games/157/15742f2f67eacff546738e1ab5c19d20.jpg",
      },
      released_at: "2013-09-17",
      requirements_en: null,
      requirements_ru: null,
    },
  ],
  parent_platforms: [
    {
      platform: {
        id: 1,
        name: "PC",
        slug: "pc",
      },
    },
    {
      platform: {
        id: 2,
        name: "PlayStation",
        slug: "playstation",
      },
    },
    {
      platform: {
        id: 3,
        name: "Xbox",
        slug: "xbox",
      },
    },
  ],
  genres: [
    {
      id: 4,
      name: "Action",
      slug: "action",
      games_count: 177847,
      image_background:
        "https://media.rawg.io/media/games/b45/b45575f34285f2c4479c9a5f719d972e.jpg",
    },
  ],
  stores: [
    {
      id: 290375,
      store: {
        id: 3,
        name: "PlayStation Store",
        slug: "playstation-store",
        domain: "store.playstation.com",
        games_count: 7884,
        image_background:
          "https://media.rawg.io/media/games/490/49016e06ae2103881ff6373248843069.jpg",
      },
    },
    {
      id: 438095,
      store: {
        id: 11,
        name: "Epic Games",
        slug: "epic-games",
        domain: "epicgames.com",
        games_count: 1312,
        image_background:
          "https://media.rawg.io/media/games/4e0/4e0e7b6d6906a131307c94266e5c9a1c.jpg",
      },
    },
    {
      id: 290376,
      store: {
        id: 1,
        name: "Steam",
        slug: "steam",
        domain: "store.steampowered.com",
        games_count: 87903,
        image_background:
          "https://media.rawg.io/media/games/6fc/6fcf4cd3b17c288821388e6085bb0fc9.jpg",
      },
    },
    {
      id: 290377,
      store: {
        id: 7,
        name: "Xbox 360 Store",
        slug: "xbox360",
        domain: "marketplace.xbox.com",
        games_count: 1912,
        image_background:
          "https://media.rawg.io/media/games/960/960b601d9541cec776c5fa42a00bf6c4.jpg",
      },
    },
    {
      id: 290378,
      store: {
        id: 2,
        name: "Xbox Store",
        slug: "xbox-store",
        domain: "microsoft.com",
        games_count: 4802,
        image_background:
          "https://media.rawg.io/media/games/16b/16b1b7b36e2042d1128d5a3e852b3b2f.jpg",
      },
    },
  ],
  clip: null,
  tags: [
    {
      id: 31,
      name: "Singleplayer",
      slug: "singleplayer",
      language: "eng",
      games_count: 217097,
      image_background:
        "https://media.rawg.io/media/games/73e/73eecb8909e0c39fb246f457b5d6cbbe.jpg",
    },
    {
      id: 40847,
      name: "Steam Achievements",
      slug: "steam-achievements",
      language: "eng",
      games_count: 35279,
      image_background:
        "https://media.rawg.io/media/games/2ba/2bac0e87cf45e5b508f227d281c9252a.jpg",
    },
    {
      id: 7,
      name: "Multiplayer",
      slug: "multiplayer",
      language: "eng",
      games_count: 36977,
      image_background:
        "https://media.rawg.io/media/games/198/1988a337305e008b41d7f536ce9b73f6.jpg",
    },
    {
      id: 40836,
      name: "Full controller support",
      slug: "full-controller-support",
      language: "eng",
      games_count: 16517,
      image_background:
        "https://media.rawg.io/media/games/8cc/8cce7c0e99dcc43d66c8efd42f9d03e3.jpg",
    },
    {
      id: 13,
      name: "Atmospheric",
      slug: "atmospheric",
      language: "eng",
      games_count: 31800,
      image_background:
        "https://media.rawg.io/media/games/960/960b601d9541cec776c5fa42a00bf6c4.jpg",
    },
    {
      id: 42,
      name: "Great Soundtrack",
      slug: "great-soundtrack",
      language: "eng",
      games_count: 3381,
      image_background:
        "https://media.rawg.io/media/games/bc0/bc06a29ceac58652b684deefe7d56099.jpg",
    },
    {
      id: 24,
      name: "RPG",
      slug: "rpg",
      language: "eng",
      games_count: 19604,
      image_background:
        "https://media.rawg.io/media/games/be0/be01c3d7d8795a45615da139322ca080.jpg",
    },
    {
      id: 18,
      name: "Co-op",
      slug: "co-op",
      language: "eng",
      games_count: 10978,
      image_background:
        "https://media.rawg.io/media/games/34b/34b1f1850a1c06fd971bc6ab3ac0ce0e.jpg",
    },
    {
      id: 36,
      name: "Open World",
      slug: "open-world",
      language: "eng",
      games_count: 7046,
      image_background:
        "https://media.rawg.io/media/games/d69/d69810315bd7e226ea2d21f9156af629.jpg",
    },
    {
      id: 411,
      name: "cooperative",
      slug: "cooperative",
      language: "eng",
      games_count: 4651,
      image_background:
        "https://media.rawg.io/media/games/73e/73eecb8909e0c39fb246f457b5d6cbbe.jpg",
    },
    {
      id: 8,
      name: "First-Person",
      slug: "first-person",
      language: "eng",
      games_count: 30433,
      image_background:
        "https://media.rawg.io/media/games/46d/46d98e6910fbc0706e2948a7cc9b10c5.jpg",
    },
    {
      id: 149,
      name: "Third Person",
      slug: "third-person",
      language: "eng",
      games_count: 10744,
      image_background:
        "https://media.rawg.io/media/games/f87/f87457e8347484033cb34cde6101d08d.jpg",
    },
    {
      id: 4,
      name: "Funny",
      slug: "funny",
      language: "eng",
      games_count: 24012,
      image_background:
        "https://media.rawg.io/media/games/5bb/5bb55ccb8205aadbb6a144cf6d8963f1.jpg",
    },
    {
      id: 37,
      name: "Sandbox",
      slug: "sandbox",
      language: "eng",
      games_count: 6551,
      image_background:
        "https://media.rawg.io/media/games/d82/d82990b9c67ba0d2d09d4e6fa88885a7.jpg",
    },
    {
      id: 123,
      name: "Comedy",
      slug: "comedy",
      language: "eng",
      games_count: 11869,
      image_background:
        "https://media.rawg.io/media/games/0af/0af85e8edddfa55368e47c539914a220.jpg",
    },
    {
      id: 150,
      name: "Third-Person Shooter",
      slug: "third-person-shooter",
      language: "eng",
      games_count: 3234,
      image_background:
        "https://media.rawg.io/media/games/5bb/5bb55ccb8205aadbb6a144cf6d8963f1.jpg",
    },
    {
      id: 62,
      name: "Moddable",
      slug: "moddable",
      language: "eng",
      games_count: 870,
      image_background:
        "https://media.rawg.io/media/games/7a2/7a2500ee8b2c0e1ff268bb4479463dea.jpg",
    },
    {
      id: 144,
      name: "Crime",
      slug: "crime",
      language: "eng",
      games_count: 2706,
      image_background:
        "https://media.rawg.io/media/games/6cc/6cc68fa183b905ac9d85efb9797776f6.jpg",
    },
    {
      id: 62349,
      name: "vr mod",
      slug: "vr-mod",
      language: "eng",
      games_count: 17,
      image_background:
        "https://media.rawg.io/media/screenshots/1bb/1bb3f78f0fe43b5d5ca2f3da5b638840.jpg",
    },
  ],
  esrb_rating: {
    id: 4,
    name: "Mature",
    slug: "mature",
  },
  short_screenshots: [
    {
      id: -1,
      image:
        "https://media.rawg.io/media/games/20a/20aa03a10cda45239fe22d035c0ebe64.jpg",
    },
    {
      id: 1827221,
      image:
        "https://media.rawg.io/media/screenshots/a7c/a7c43871a54bed6573a6a429451564ef.jpg",
    },
    {
      id: 1827222,
      image:
        "https://media.rawg.io/media/screenshots/cf4/cf4367daf6a1e33684bf19adb02d16d6.jpg",
    },
    {
      id: 1827223,
      image:
        "https://media.rawg.io/media/screenshots/f95/f9518b1d99210c0cae21fc09e95b4e31.jpg",
    },
    {
      id: 1827225,
      image:
        "https://media.rawg.io/media/screenshots/a5c/a5c95ea539c87d5f538763e16e18fb99.jpg",
    },
    {
      id: 1827226,
      image:
        "https://media.rawg.io/media/screenshots/a7e/a7e990bc574f4d34e03b5926361d1ee7.jpg",
    },
    {
      id: 1827227,
      image:
        "https://media.rawg.io/media/screenshots/592/592e2501d8734b802b2a34fee2df59fa.jpg",
    },
  ],
};

const gamesListSchema = new mongoose.Schema({
  id: Number,
  rating: Number,
  metacritic: Number,
  ratings: [[{ imdb: Number, metacritic: Number, overAll: Number }]],
  backgroundImage: String,
  reviewSummary: [[String]],
});

const Game = mongoose.model("Games", gamesListSchema);

async function connect() {
  try {
    await mongoose.connect(uri);
    console.log("CONNECTED TO MONGODB");
  } catch (e) {
    console.log(error);
  }
}

connect();

app.listen(port, () => {
  console.log(`Example app listening on port ${port}!`);
});

app.get("/list", async (req, res) => {
  try {
    const response = await getRawgData("games");
    console.log("RESPONSE", response);
    const game = response?.data?.results;
    const { id, rating, background_image, metacritic } = game[0];
    const gameInstance = new Game({
      id,
      rating,
      backgroundImage: background_image,
      metacritic,
    });
    await gameInstance.save();
    console.log("RESPONSE!!", response);
    res.send({
      title: "first get request nodemon",
    });
  } catch (e) {
    console.log("ERROR", e);
  }
});
