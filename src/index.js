const { generateAIReply } = require("./services/aiService");
const { fetchRelevantPosts, shouldReply, loadKeywordsAndSubreddits } = require("./services/redditService");
const { sendDraftToFront } = require("./services/frontAppService");

const processRedditPosts = async () => {
  console.log("Fetching Reddit posts...");

  await loadKeywordsAndSubreddits();

  const posts = await fetchRelevantPosts(50);

  if (posts.length === 0) {
    console.log("No posts found. Check if subreddits exist or if Reddit API is working.");
    return;
  }

  let replyCount = 0;

  for (const post of posts) {
    if (replyCount >= 3) break;

    const isMatch = shouldReply(post);

    if (isMatch) {
      console.log(`Found keyword match in: "${post.title}"`);

      const aiResponse = await generateAIReply(post.title, post.selftext || post.url || "");
      if (!aiResponse || aiResponse.trim().length < 5) {
        console.log("AI-generated response is empty or too short, skipping post.");
        continue;
      }

      console.log(`Sending draft to Front App: "${aiResponse}"`);

      await sendDraftToFront(post.subreddit.display_name, post.title, post.url, aiResponse);

      replyCount++;
    } else {
      console.log(`No keyword match for: "${post.title}"`);
    }
  }

  console.log("Process completed!");
};

processRedditPosts();
