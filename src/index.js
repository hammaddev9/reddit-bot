const { generateAIReply } = require("./services/aiService");
const { fetchRelevantPosts, shouldReply, loadKeywordsAndSubreddits, postRedditReply } = require("./services/redditService");
const { sendDraftToFront } = require("./services/frontAppService");

const processRedditPosts = async () => {
  console.log("Fetching Reddit posts...");

  await loadKeywordsAndSubreddits();
  const posts = await fetchRelevantPosts(50);

  if (!posts.length) return console.log("No posts found. Check if subreddits exist or if Reddit API is working.");

  let replyCount = 0;
  for (const post of posts) {
    if (replyCount >= 3) break;
    if (!shouldReply(post)) {
      console.log(`⚠️ No keyword match for: "${post.title}"`);
      continue;
    }

    console.log(`✅ Found keyword match in: "${post.title}"`);
    const aiResponse = await generateReply(post);
    if (!aiResponse) continue;

    await handlePosting(post, aiResponse);
    replyCount++;
  }
  console.log("🚀 Process completed!");
};

const generateReply = async (post) => {
  const response = await generateAIReply(post.title, post.selftext || post.url || "");
  if (!response || response.trim().length < 5) {
    console.log("⚠️ AI-generated response is empty or too short, skipping post.");
    return null;
  }
  return response;
};

const handlePosting = async (post, aiResponse) => {
  console.log("📤 Sending draft to Front App & Posting comment on Reddit...");

  const sentToFront = await sendDraftToFront(post.subreddit.display_name, post.title, post.url, aiResponse);
  console.log(sentToFront ? "✅ Draft successfully sent to Front App." : "❌ Failed to send draft to Front App.");

  const postedOnReddit = await postRedditReply(post, aiResponse);
  console.log(postedOnReddit ? "✅ AI response successfully posted on Reddit." : "❌ Failed to post comment on Reddit.");
};

processRedditPosts();
