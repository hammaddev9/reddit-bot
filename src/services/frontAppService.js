const axios = require("axios");

const FRONT_API_URL = "https://api.frontapp.com/conversations";
const FRONT_INBOX_ID = "inb_h3nry"; // Ensure this is correct
const FRONT_API_TOKEN = process.env.FRONT_API_TOKEN;
const FRONT_TEAMMATE_ID = "tea_jct9a"; // Ensure this is correct

const sendDraftToFront = async (subreddit, postTitle, postUrl, aiReply) => {
  try {
    console.log(`📤 Sending draft for post: "${postTitle}" to Front App...`);

    const payload = {
      inbox_id: FRONT_INBOX_ID,
      subject: `Reddit Reply for ${subreddit}`,
      status: "draft",
      type: "discussion",
      recipients: [{ id: FRONT_TEAMMATE_ID }], // Make sure teammate ID is correct
      comment: {
        body: `**Reddit Discussion:** [${postTitle}](${postUrl})\n\n**AI-Generated Response:**\n${aiReply}`,
        author_id: FRONT_TEAMMATE_ID, // Ensure this is a valid ID
      },
    };

    const response = await axios.post(FRONT_API_URL, payload, {
      headers: {
        Authorization: `Bearer ${FRONT_API_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    console.log(`✅ Draft successfully sent to Front App: ${response.data.id}`);
    return true;
  } catch (error) {
    console.error("❌ Error sending draft to Front App:", error.response?.data || error.message);

    if (error.response) {
      console.log("🔍 Error Details:", JSON.stringify(error.response.data, null, 2));
    }

    return false;
  }
};

module.exports = { sendDraftToFront };
