require("dotenv").config();
const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT}`,
  defaultQuery: { "api-version": process.env.AZURE_OPENAI_API_VERSION },
  defaultHeaders: { "api-key": process.env.AZURE_OPENAI_API_KEY },
});

const generateAIReply = async (postTitle, postBody) => {
  try {
    const templates = [
      "Hey! 👋 Here’s what I recommend: {advice}",
      "Great question! Here's some helpful info: {advice}",
      "Let’s break it down: {advice}",
      "Here's a detailed answer: {advice}",
      "This might help: {advice}",
    ];

    const response = await openai.chat.completions.create({
      model: process.env.AZURE_OPENAI_DEPLOYMENT,
      messages: [
        { role: "system", content: "You are a friendly AI assistant specializing in home improvement and water filtration." },
        { role: "user", content: `A Reddit user posted the following:\n\nTitle: "${postTitle}"\nBody: "${postBody}"\n\nHow would you help them? Provide a helpful response.` }
      ],
      max_tokens: 250,
    });

    const aiReply = response.choices[0].message.content.trim();

    const finalReply = templates[Math.floor(Math.random() * templates.length)].replace("{advice}", aiReply);

    return finalReply;
  } catch (error) {
    console.error("Error generating AI response:", error);
    return "I'm here to help! Let me know your questions about water filters.";
  }
};

module.exports = { generateAIReply };
