require("dotenv").config();
const OpenAI = require("openai");

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const testOpenAI = async () => {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",  // Use GPT-3.5 instead of GPT-4
            messages: [{ role: "user", content: "Say hello in a fun way." }],
            max_tokens: 20,
        });

        console.log("✅ OpenAI Response:", response.choices[0].message.content);
    } catch (error) {
        console.error("❌ Error connecting to OpenAI:", error);
    }
};

testOpenAI();
