const { Worker } = require("bullmq");
const {fetchAndSaveLatestGames} = require("../services/gamesService");
const redisConnection = require("../../../config/redis");

const gamesWorker = new Worker("games", async job => {
    const { count } = job.data;
    await fetchAndSaveLatestGames(count);
},{connection:redisConnection})

gamesWorker.on("completed", (job) => {
    console.log(`Job with id ${job.id} has completed`);
});

gamesWorker.on("failed", (job, err) => {    
    console.error(`Job with id ${job.id} has failed with error: ${err.message}`);
})

module.exports = gamesWorker;