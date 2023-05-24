require('dotenv').config();
const {SLACK_BOT_TOKEN, OPENAI_KEY} = process.env

const { WebClient } = require('@slack/web-api');
const { Configuration, OpenAIApi } = require("openai");

// SET UP SLACK CLIENT
const slackToken = SLACK_BOT_TOKEN;
const slackClient = new WebClient(slackToken);

// SET UP OPENAI CLIENT
const configuration = new Configuration({
    apiKey: OPENAI_KEY,
  });

const openaiClient = new OpenAIApi(configuration);


// GET SLACK CHANNEL MESSAGES
//      Includes user, message and amount of replies
async function fetchSlackChannelContent(channelId) {
  try {
    const response = await slackClient.conversations.history({
        channel: channelId,
        token: slackToken
    });
    console.log(response.messages[1].reactions)
    let count = 0
    const messages = response.messages.reverse().map((message) => {
        let reactionCount = 0
        if (message.reactions) message.reactions.map(reaction => reactionCount = reactionCount + reaction.count)
        return `user ${message.user} posted the following: ${message.text}, 
        it has ${message.reply_count? message.reply_count: 0} replies, and ${reactionCount} reactions`})
    return messages.join('\n') // combine into a string for chatGpt
  } catch (error) {
        if (error.data && error.data.response_metadata) {
            const responseMetadata = error.data.response_metadata;   
            return responseMetadata
        }
        return error
  }
}

async function summarizeText(text) {
  try {
    const response = await openaiClient.createChatCompletion({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 
                `Hello! you are a assistant that helps summarizing texts. in this case this text
                consists of the message history of a slack channel, your job is to summarize it following
                this rules:
                *If a user joined the channel, mention that before mentioning that user's posts.
                *When a user posted several times on a row, say it in the same sentence, mentioning that user only once, 
                don't forget to check the username.
                *Each post specifies the amount of replies it has, if its greater than 0 you should mention it.
                *Each post specifies the amount of reactions, mention the amount of reactions of the post if its greater than 0.
          
                The text is the following:
                ${text}` },
       
        ],
        max_tokens: 400,
    });

    return response.data.choices[0].message.content; 
  } catch (error) {
        console.error('Error summarizing text:', error);
        throw error;
  }
}

const channelId = 'C059VEXCMRN'; 

(async () => {
  try {
    const slackChannelContent = await fetchSlackChannelContent(channelId);
    const text = await summarizeText(slackChannelContent);
    console.log(text)
    return(text)
  } catch (error) {
    console.error('Error:', error);
  }
})();
