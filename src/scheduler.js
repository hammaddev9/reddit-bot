const cron = require("node-cron");
const { processRedditPosts } = require("./index");

console.log("⏳ Scheduler started. Running every 24 hours...");

cron.schedule("0 8 * * *", () => {
    console.log("Running Reddit bot at 8 AM PST...");
    processRedditPosts();
});
