const { Worker } = require("bullmq");
const {fetchAndSaveLatestGames, fetchAndSaveRecentGames, refreshTrendingScores} = require("../services/gamesService");
const redisConnection = require("../../../config/redis");

const gamesWorker = new Worker("games", async job => {
    if (job.name === "refreshTrending") {
        await refreshTrendingScores();
        return;
    }
    if (job.name === "fetchRecent") {
        const { count, sinceDate } = job.data;
        await fetchAndSaveRecentGames(count, sinceDate);
        return;
    }
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