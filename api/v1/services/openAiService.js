const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const getSummaryResponse = async (reviews, prompt) => {
  const reviewScripts = reviews.join(", ");
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "user",
          content: reviewScripts,
        },
        {
          role: "user",
          content:
            prompt ||
            "Summarize the text into pros and cons, give this response as json with pros and cons as array, pros and cons key should all lowercase  ",
        },
      ],
      temperature: 1,
      max_tokens: 256,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    });
    return JSON.parse(completion?.choices?.[0]?.message?.content);
  } catch (e) {
    console.log("ERROR", e);
  }
};

module.exports = {
  getSummaryResponse,
};
