require("dotenv").config({ quiet: true });
const fs = require("fs");
const prisma = require("../config/prismaClient");
const pipelineRepository = require("../api/v1/repositories/pipelineRepository");
const pipeline = require("../api/v1/services/pipelineService");
const { getQuotaUnitsUsed } = require("../api/v1/clients/youtubeClient");

// Daily catalog pipeline: adds new games and keeps every game's features
// fresh. Each stage selects its own work from database state, so a new game
// flows through all stages by itself (over several days if quota runs short),
// an interrupted run resumes next time, and older games missing a feature get
// backfilled by the same code.
//
//   --new-games=N         games to try adding (default 10: ~70% this year's releases)
//   --only=a,b            run only these stages
//   --skip=a,b            skip these stages
//   --rawg-limit=N        games whose RAWG data is refreshed (default 20)
//   --steam-review-limit=N  games whose Steam reviews are refreshed (default 5)
//   --youtube-budget=N    cap YouTube units for this run (default: daily quota minus margin)

const readArg = (name) => {
  const arg = process.argv.find((value) => value.startsWith(`--${name}=`));
  return arg ? arg.split("=")[1] : undefined;
};
const readList = (name) => (readArg(name) ? readArg(name).split(",").map((s) => s.trim()) : null);
const readNumber = (name, fallback) => (readArg(name) !== undefined ? Number(readArg(name)) : fallback);

// YouTube's free quota is 10,000 units/day, reset at midnight Pacific. The
// margin covers usage this process can't see: a previous day's run came in
// ~600 units short of its own count, and the site's "Find videos" button
// spends from the same key.
const YOUTUBE_DAILY_QUOTA = 10000;
const YOUTUBE_SAFETY_MARGIN = 1000;
const VIDEO_METADATA_UNIT_BUDGET = 100;
// Held back from video searches so new games' comments (≈3 units each) and
// stale comment refreshes always get to run. Up to 600 units, but never more
// than a fifth of the run's budget — a fixed reserve starved video searches
// entirely on a small (test) budget.
const COMMENTS_UNIT_RESERVE_MAX = 600;
const COMMENTS_UNIT_RESERVE_SHARE = 0.2;

// A RUNNING row younger than this blocks a new run; older ones are treated as
// crashed runs that never got to record their end.
const RUN_LOCK_HOURS = 3;

const NEW_GAMES = readNumber("new-games", 10);

// --youtube-budget caps a run below the daily allowance, e.g. for a local test
// against a copy of the data, which would otherwise spend the shared key's
// quota on games production still has to search again.
const YOUTUBE_RUN_BUDGET = Math.min(
  readNumber("youtube-budget", Infinity),
  YOUTUBE_DAILY_QUOTA - YOUTUBE_SAFETY_MARGIN,
);
const youtubeUnitsLeft = () => Math.max(0, YOUTUBE_RUN_BUDGET - getQuotaUnitsUsed());

// Order matters only for freshness, never correctness: discovering first means
// today's new games get videos and comments in this same run.
const STAGES = [
  {
    name: "discover",
    run: () =>
      pipeline.discoverNewGames({
        recentCount: Math.ceil(NEW_GAMES * 0.7),
        popularCount: NEW_GAMES - Math.ceil(NEW_GAMES * 0.7),
      }),
  },
  { name: "rawgRefresh", run: () => pipeline.refreshRawgMetadata({ limit: readNumber("rawg-limit", 20) }) },
  {
    name: "steamReviews",
    run: () => pipeline.refreshSteamReviews({ staleDays: 30, limit: readNumber("steam-review-limit", 5) }),
  },
  {
    name: "videoMetadata",
    usesYoutube: true,
    run: () =>
      pipeline.refreshVideoMetadata({
        staleDays: 30,
        limit: 5000,
        unitBudget: Math.min(VIDEO_METADATA_UNIT_BUDGET, youtubeUnitsLeft()),
      }),
  },
  {
    name: "videoGaps",
    usesYoutube: true,
    run: () =>
      pipeline.fillVideoGuideGaps({
        recheckDays: 30,
        unitBudget: Math.max(
          0,
          youtubeUnitsLeft() -
            Math.min(COMMENTS_UNIT_RESERVE_MAX, Math.floor(YOUTUBE_RUN_BUDGET * COMMENTS_UNIT_RESERVE_SHARE)),
        ),
      }),
  },
  { name: "videoBlurbs", usesYoutube: true, run: () => pipeline.repairVideoBlurbs() },
  {
    name: "comments",
    usesYoutube: true,
    run: () =>
      pipeline.refreshReviewComments({
        staleDays: 30,
        recentStaleDays: 7,
        recentReleaseDays: 60,
        unitBudget: youtubeUnitsLeft(),
      }),
  },
  { name: "trending", run: () => pipeline.updateTrendingScores() },
];

const formatDuration = (ms) => `${Math.round(ms / 1000)}s`;

const writeGithubSummary = (runId, status, stats) => {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) return;
  const rows = Object.entries(stats).map(([stage, result]) => {
    const { durationMs, error, skipped, addedNames, ...counts } = result;
    const outcome = skipped ? `skipped: ${skipped}` : error ? `❌ ${error}` : "✅";
    const detail = Object.entries(counts)
      .map(([key, value]) => `${key}: ${value}`)
      .join(", ");
    return `| ${stage} | ${outcome} | ${detail} | ${durationMs ? formatDuration(durationMs) : ""} |`;
  });
  const added = stats.discover?.addedNames?.length ? `\n**Added:** ${stats.discover.addedNames.join(", ")}\n` : "";
  fs.appendFileSync(
    summaryPath,
    [
      `## Daily pipeline run #${runId}: ${status}`,
      `YouTube units used: ${getQuotaUnitsUsed()} of ${YOUTUBE_DAILY_QUOTA}`,
      added,
      "| Stage | Outcome | Counts | Time |",
      "|---|---|---|---|",
      ...rows,
      "",
    ].join("\n"),
  );
};

async function main() {
  const only = readList("only");
  const skip = readList("skip") || [];
  const unknown = [...(only || []), ...skip].filter((name) => !STAGES.some((stage) => stage.name === name));
  if (unknown.length) {
    throw new Error(`Unknown stage(s): ${unknown.join(", ")}. Valid: ${STAGES.map((s) => s.name).join(", ")}`);
  }

  const running = await pipelineRepository.findRunningPipelineRun({
    startedAfter: new Date(Date.now() - RUN_LOCK_HOURS * 60 * 60 * 1000),
  });
  if (running) {
    console.log(`Pipeline run #${running.id} started at ${running.startedAt.toISOString()} is still running — exiting.`);
    return;
  }

  const run = await pipelineRepository.createPipelineRun();
  console.log(`Pipeline run #${run.id} started`);

  const stats = {};
  let stageErrors = 0;
  let quotaExhausted = false;

  for (const stage of STAGES) {
    if ((only && !only.includes(stage.name)) || skip.includes(stage.name)) continue;
    if (stage.usesYoutube && quotaExhausted) {
      stats[stage.name] = { skipped: "YouTube quota exhausted" };
      continue;
    }

    console.log(`\n▶ ${stage.name}`);
    const started = Date.now();
    try {
      stats[stage.name] = await stage.run();
    } catch (error) {
      if (error instanceof pipeline.QuotaExhaustedError) {
        quotaExhausted = true;
        stats[stage.name] = { error: error.message };
      } else {
        stageErrors++;
        stats[stage.name] = { error: error?.message || String(error) };
        console.error(`  Stage ${stage.name} failed: ${error?.stack || error}`);
      }
    }
    stats[stage.name].durationMs = Date.now() - started;
    const { durationMs, addedNames, ...printable } = stats[stage.name];
    console.log(`  ${JSON.stringify(printable)} (${formatDuration(durationMs)})`);
  }

  const itemFailures = Object.values(stats).some((result) => result.failed || result.stoppedAfterConsecutiveFailures);
  const status = stageErrors ? "FAILED" : quotaExhausted || itemFailures ? "PARTIAL" : "SUCCEEDED";

  await pipelineRepository.finishPipelineRun(run.id, { status, stats, youtubeUnitsUsed: getQuotaUnitsUsed() });
  writeGithubSummary(run.id, status, stats);
  console.log(`\nPipeline run #${run.id} ${status} — YouTube units used: ${getQuotaUnitsUsed()}`);

  // Only a stage-level crash fails the CI job (and sends GitHub's failure
  // email). Individual games failing, or quota running out, are expected
  // day-to-day and simply get picked up next run.
  if (stageErrors) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
