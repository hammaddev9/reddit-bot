require("dotenv").config();
const snoowrap = require("snoowrap");
const stringSimilarity = require("string-similarity");
const fs = require("fs");
const { loadGoogleSheetsData } = require("../services/googleSheetsService");
const { generateAIReply } = require("./aiService");

const reddit = new snoowrap({
  userAgent: process.env.REDDIT_USER_AGENT,
  clientId: process.env.REDDIT_CLIENT_ID,
  clientSecret: process.env.REDDIT_CLIENT_SECRET,
  username: process.env.REDDIT_USERNAME,
  password: process.env.REDDIT_PASSWORD,
});

let targetKeywords = [];
let subredditList = [];

async function loadKeywordsAndSubreddits() {
  const data = await loadGoogleSheetsData();

  console.log(`🔹 Raw Data from Google Sheets:`, JSON.stringify(data, null, 2));

  if (!data.keywords || !Array.isArray(data.keywords) || data.keywords.length === 0) {
    console.error("❌ Error: No keywords loaded from Google Sheets!");
  } else {
    console.log(`✅ Loaded Keywords: ${JSON.stringify(data.keywords)}`);
  }

  if (!data.subreddits || !Array.isArray(data.subreddits) || data.subreddits.length === 0) {
    console.error("❌ Error: No subreddits loaded from Google Sheets!");
  } else {
    console.log(`✅ Loaded Subreddits: ${JSON.stringify(data.subreddits)}`);
  }

  targetKeywords = data.keywords || [];
  subredditList = data.subreddits || [];
}

loadKeywordsAndSubreddits();

const processedPostsFile = "./processedPosts.json";
let processedPosts = [];

if (fs.existsSync(processedPostsFile)) {
  processedPosts = JSON.parse(fs.readFileSync(processedPostsFile, "utf8"));
}

function shouldReply(post) {
  const text = `${post.title} ${post.selftext || ""}`.toLowerCase();

  console.log(`🔍 Checking Post: "${post.title}"`);
  console.log(`📌 Post Content:`, text);
  console.log(`🔑 Keywords:`, JSON.stringify(targetKeywords));

  if (!targetKeywords || targetKeywords.length === 0) {
    console.warn("⚠️ Warning: No keywords available for matching.");
    return false;
  }

  const matchedKeyword = findMatchingKeyword(text, targetKeywords);

  if (matchedKeyword) {
    console.log(`✅ Matched keyword: "${matchedKeyword}" in post: "${post.title}"`);
    return true;
  }

  console.log(`⚠️ No keyword match for post: "${post.title}"`);
  return false;
}

function findMatchingKeyword(text, keywordsList) {
  for (let keywordGroup of keywordsList) {
    const individualKeywords = keywordGroup.toLowerCase().split(",").map(k => k.trim());
    const exactMatch = individualKeywords.find(keyword => text.includes(keyword));
    if (exactMatch) return exactMatch;
  }

  const allKeywords = keywordsList.flatMap(k => k.toLowerCase().split(",").map(w => w.trim()));
  const bestMatch = stringSimilarity.findBestMatch(text, allKeywords).bestMatch;

  return bestMatch.rating > 0.3 ? bestMatch.target : null;
}


const fetchRelevantPosts = async (limit = 10) => {
  try {
    console.log(`📥 Fetching latest ${limit} posts from r/HomeImprovement...`);
    const posts = await reddit.getSubreddit("HomeImprovement").getNew({ limit });

    posts.forEach(post => {
      console.log(`🔹 Found Post: "${post.title}" - ${post.url}`);
    });

    return posts;
  } catch (error) {
    console.error("❌ Error fetching posts:", error.message);
    return [];
  }
};


const postRedditReply = async (post) => {
  try {
    console.log(`📤 Attempting to reply to post: "${post.title}"`);

    const replyText = await generateAIReply(post.title, post.selftext || post.body);
    if (!replyText) {
      console.log("⚠️ No AI-generated response available, skipping post.");
      return false;
    }

    console.log(`📝 AI Reply: "${replyText}"`);

    await post.reply(replyText);
    processedPosts.push(post.id);

    fs.writeFileSync(processedPostsFile, JSON.stringify(processedPosts, null, 2));
    console.log("✅ AI-generated comment posted successfully!");

    // 🔹 Increase delay (random between 60-120 seconds)
    const delay = Math.floor(Math.random() * (120000 - 60000 + 1)) + 60000;
    console.log(`⏳ Waiting ${delay / 1000} seconds before next reply...`);
    await new Promise(resolve => setTimeout(resolve, delay));

    return true;
  } catch (error) {
    if (error.message.includes("RATELIMIT")) {
      const waitTime = Math.floor(Math.random() * (600000 - 300000 + 1)) + 300000; // 5-10 min delay
      console.warn(`❌ Rate-limited! Retrying after ${waitTime / 60000} minutes...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return postRedditReply(post); // Retry after delay
    }
    console.error("❌ Error posting AI-generated comment:", error.message);
    return false;
  }
};

module.exports = {
  fetchRelevantPosts,
  shouldReply,
  postRedditReply,
  loadKeywordsAndSubreddits,
};