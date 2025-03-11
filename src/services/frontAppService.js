const axios = require("axios");

const FRONT_API_URL = "https://api.frontapp.com/conversations";
const FRONT_INBOX_ID = process.env.FRONT_INBOX_ID;
const FRONT_API_TOKEN = process.env.FRONT_API_TOKEN;

const sendDraftToFront = async (subreddit, postTitle, postUrl, aiReply) => {
  try {
    const response = await axios.post(
      FRONT_API_URL,
      {
        inbox_id: FRONT_INBOX_ID,
        subject: `Reddit Reply for ${subreddit}`,
        status: "draft",
        recipients: [{ handle: "faheemakram2498@gmail.com" }],
        comments: [
          {
            author_id: "alt:reddit-bot@example.com",
            type: "comment",
            body: `**Reddit Discussion:** [${postTitle}](${postUrl})\n\n **AI-Generated Response:**\n${aiReply}`
          }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${FRONT_API_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log(`✅ Draft successfully sent to Front App: ${response.data.id}`);
    return true;
  } catch (error) {
    console.error("❌ Error sending draft to Front App:", error.response?.data || error.message);
    return false;
  }
};

module.exports = { sendDraftToFront };
