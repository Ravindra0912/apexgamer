const mongoose = require("mongoose");

const uri = process.env.MONGODB_URI;

async function connectMongo() {
  try {
    await mongoose.connect(uri);
    console.log("CONNECTED TO MONGODB");
  } catch (e) {
    console.log("ERROR", e);
    console.log(e);
  }
}

module.exports = {
    connectMongo
}