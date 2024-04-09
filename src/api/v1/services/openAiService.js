const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const getSummaryResponse = async (reviewScripts) => {
  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "user",
        content: reviewScripts,
      },
      {
        role: "user",
        content: "Summarize above into main pros and cons",
      },
    ],
    temperature: 1,
    max_tokens: 256,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
  });
  return completion.choices[0].message.content;
};

getSummaryResponse();

module.exports = {
  getSummaryResponse,
};
