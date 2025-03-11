const { generateAIReply } = require("./services/aiService");
const { fetchRelevantPosts, shouldReply, loadKeywordsAndSubreddits, keywordMatch } = require("./services/redditService");
const { sendDraftToFront } = require("./services/frontAppService");

const processRedditPosts = async () => {
  console.log("Fetching Reddit posts...");

  await loadKeywordsAndSubreddits();

  const posts = await fetchRelevantPosts(50);
  let replyCount = 0;

  if (posts.length === 0) {
    console.log("No posts found. Check if subreddits exist or if Reddit API is working.");
    return;
  }

  for (const post of posts) {
    if (replyCount >= 3) break;

    const postContent = `${post.title} ${post.selftext || post.body}`.toLowerCase();

    const isMatch = shouldReply(postContent);

    if (isMatch) {
      console.log(`Found keyword match in: "${post.title}"`);

      const aiResponse = await generateAIReply(post.title, postContent);
      if (!aiResponse) {
        console.log("No AI-generated response available, skipping post.");
        continue;
      }

      console.log(`Sending draft to Front App: "${aiResponse}"`);

      await sendDraftToFront(post.subreddit.display_name, post.title, post.url, aiResponse);

      replyCount++;
    } else {
      console.log(`No matching keywords for: "${post.title}"`);
    }
  }

  console.log("Process completed!");
};

processRedditPosts();
