const { generateAIReply } = require("../src/services/aiService");

const testAI = async () => {
  const testPostId = "abc123"; // Fake Reddit Post ID for testing
  const testTitle = "What’s the best water filter for hard water?";
  const testBody = "I have hard water at home and I want to find the best filter to improve my drinking water quality. Any suggestions?";

  const response = await generateAIReply(testPostId, testTitle, testBody);

  if (response) {
    console.log("✅ AI Reply:", response);
  } else {
    console.log("⚠️ AI Reply Skipped: Already processed.");
  }
};

testAI();
