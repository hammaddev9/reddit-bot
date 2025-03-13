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

// Load stored processed posts
const processedPostsFile = "./processedPosts.json";
let processedPosts = fs.existsSync(processedPostsFile)
  ? JSON.parse(fs.readFileSync(processedPostsFile, "utf8"))
  : [];

// 🔹 Load keywords and subreddits from Google Sheets
async function loadKeywordsAndSubreddits() {
  try {
    const data = await loadGoogleSheetsData();

    if (!data.keywords || !Array.isArray(data.keywords) || data.keywords.length === 0) {
      console.error("⚠️ No keywords found, using default fallback.");
      data.keywords = ["water filter", "filtration", "purifier"];
    }

    if (!data.subreddits || !Array.isArray(data.subreddits) || data.subreddits.length === 0) {
      console.error("⚠️ No subreddits found, using default fallback.");
      data.subreddits = ["HomeImprovement"];
    }

    targetKeywords = data.keywords.map(keyword => keyword.toLowerCase().trim());
    subredditList = data.subreddits.map(subreddit => subreddit.trim());

    console.log(`✅ Loaded Keywords: ${JSON.stringify(targetKeywords)}`);
    console.log(`✅ Loaded Subreddits: ${JSON.stringify(subredditList)}`);
  } catch (error) {
    console.error("❌ Error loading keywords and subreddits:", error);
  }
}

loadKeywordsAndSubreddits(); // Call on startup

// 🔹 Check if a post should be replied to based on keyword matching
function shouldReply(post) {
  const postContent = `${post.title} ${post.selftext || ""}`.toLowerCase();

  console.log(`🔍 Checking Post: "${post.title}"`);
  console.log(`📌 Post Content:`, postContent);
  console.log(`🔑 Keywords:`, JSON.stringify(targetKeywords));

  if (!targetKeywords || targetKeywords.length === 0) {
    console.warn("⚠️ Warning: No keywords available for matching.");
    return false;
  }

  const matchedKeyword = findMatchingKeyword(postContent, targetKeywords);

  if (matchedKeyword) {
    console.log(`✅ Matched keyword: "${matchedKeyword}" in post: "${post.title}"`);
    return true;
  }

  console.log(`⚠️ No keyword match for post: "${post.title}"`);
  return false;
}

// 🔹 Improved keyword matching logic
function findMatchingKeyword(text, keywordsList) {
  text = text.toLowerCase().replace(/[^a-z0-9\s]/gi, "").trim().replace(/\s+/g, " "); // Normalize spaces and remove special characters
  const words = text.split(/\s+/);

  for (let keyword of keywordsList) {
    const regex = new RegExp(`\\b${keyword}s?\\b`, "i"); // Word boundary match with optional "s"
    if (regex.test(text)) return keyword;
  }

  // 🔹 Enhanced fuzzy matching using bigrams
  const ngrams = words.map((word, i) => (i < words.length - 1 ? word + " " + words[i + 1] : word));
  const matches = stringSimilarity.findBestMatch(text, [...keywordsList, ...ngrams]);

  if (matches.bestMatch.rating > 0.5) { // Lowered threshold for better matching
    return matches.bestMatch.target;
  }

  return null; // No match found
}


const fetchRelevantPosts = async (limit = 10) => {
  try {
    console.log(`📥 Fetching latest ${limit} posts from monitored subreddits...`);

    let allPosts = [];

    for (const subreddit of subredditList) {
      const posts = await reddit.getSubreddit(subreddit).getNew({ limit });

      const newPosts = posts.filter(post => {
        if (!processedPosts.includes(post.id) && post.title) {
          console.log(`📝 Processing Post: ${post.title}`);
          return true;
        }
        return false;
      });

      if (newPosts.length > 0) {
        console.log(`✅ Found ${newPosts.length} new posts in r/${subreddit}`);
      }

      allPosts = [...allPosts, ...newPosts];
    }

    return allPosts;
  } catch (error) {
    console.error("❌ Error fetching posts:", error.message);
    return [];
  }
};

// 🔹 Post AI-generated reply on Reddit
const { sendDraftToFront } = require("../services/frontAppService"); // Import Front App integration

const postRedditReply = async (post) => {
  try {
    console.log(`📤 Attempting to reply to post: "${post.title}"`);

    const replyText = await generateAIReply(post.title, post.selftext || "");
    if (!replyText) {
      console.log("⚠️ No AI-generated response available, skipping post.");
      return false;
    }

    console.log(`📝 AI Reply: "${replyText}"`);

    // Post reply on Reddit
    await post.reply(replyText);
    processedPosts.push(post.id);
    fs.writeFileSync(processedPostsFile, JSON.stringify(processedPosts, null, 2));
    console.log("✅ AI-generated comment posted successfully!");

    // 🔹 Send Draft to Front App
    const sentToFront = await sendDraftToFront(
      post.subreddit.display_name,
      post.title,
      `https://reddit.com${post.permalink}`,
      replyText
    );

    if (sentToFront) {
      console.log("✅ AI response also sent to Front App.");
    } else {
      console.error("❌ Failed to send response to Front App.");
    }

    // 🔹 Increase delay (random between 60-120 seconds)
    const delay = Math.floor(Math.random() * (120000 - 60000 + 1)) + 60000;
    console.log(`⏳ Waiting ${delay / 1000} seconds before next reply...`);
    await new Promise(resolve => setTimeout(resolve, delay));

    return true;
  } catch (error) {
    if (error.message.includes("RATELIMIT")) {
      const waitTime = Math.floor(Math.random() * (600000 - 300000 + 1)) + 300000;
      console.warn(`❌ Rate-limited! Retrying after ${waitTime / 60000} minutes...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return postRedditReply(post);
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
