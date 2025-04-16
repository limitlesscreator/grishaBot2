const { Telegraf } = require('telegraf');
const axios = require('axios');
const express = require('express');
require('dotenv').config();

const bot = new Telegraf(process.env.BOT_TOKEN);
const app = express();

// Функция для взаимодействия с Voiceflow
async function interact(ctx, chatID, request) {
    const response = await axios({
        method: "POST",
        url: `https://general-runtime.voiceflow.com/state/user/${chatID}/interact`,
        headers: {
            Authorization: process.env.VOICEFLOW_API_KEY
        },
        data: { request }
    });
    for (const trace of response.data) {
        switch (trace.type) {
            case "text":
            case "speak": {
                await ctx.reply(trace.payload.message);
                break;
            }
            case "visual": {
                await ctx.replyWithPhoto(trace.payload.image);
                break;
            }
            case "end": {
                await ctx.reply("Conversation is over");
                break;
            }
        }
    }
}

// Обработка команд и сообщений
bot.start(async (ctx) => {
    let chatID = ctx.message.chat.id;
    await interact(ctx, chatID, { type: "launch" });
});

const ANY_WORD_REGEX = new RegExp(/(.+)/i);
bot.hears(ANY_WORD_REGEX, async (ctx) => {
    let chatID = ctx.message.chat.id;
    await interact(ctx, chatID, {
        type: "text",
        payload: ctx.message.text
    });
});

bot.on('photo', async (ctx) => {
    let chatID = ctx.message.chat.id;
    const photoArray = ctx.message.photo;
    const fileId = photoArray[photoArray.length - 1].file_id;
    await interact(ctx, chatID, {
        type: "text",
        payload: `${fileId}`
    });
});

bot.on('callback_query', async (ctx) => {
    let chatID = ctx.callbackQuery.message.chat.id;
    const data = ctx.callbackQuery.data;
    await ctx.answerCbQuery();
    await interact(ctx, chatID, {
        type: "text",
        payload: data
    });
});

// Настройка webhook
app.use(express.json());
app.use(bot.webhookCallback('/bot'));

const webhookUrl = 'https://grishabot2.onrender.com/bot';
bot.telegram.setWebhook(webhookUrl).then(() => {
    console.log(`Webhook set to ${webhookUrl}`);
});

// Привязка к порту
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
