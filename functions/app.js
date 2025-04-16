const { Telegraf } = require('telegraf');
const axios = require('axios');
require('dotenv').config();

const bot = new Telegraf(process.env.BOT_TOKEN);

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

// Обработка команды /start
bot.start(async (ctx) => {
    let chatID = ctx.message.chat.id;
    await interact(ctx, chatID, { type: "launch" });
});

// Обработка текстовых сообщений
const ANY_WORD_REGEX = new RegExp(/(.+)/i);
bot.hears(ANY_WORD_REGEX, async (ctx) => {
    let chatID = ctx.message.chat.id;
    await interact(ctx, chatID, {
        type: "text",
        payload: ctx.message.text
    });
});

// Обработка сообщений с фотографиями
bot.on('photo', async (ctx) => {
    let chatID = ctx.message.chat.id;
    const photoArray = ctx.message.photo;
    const fileId = photoArray[photoArray.length - 1].file_id;

    await interact(ctx, chatID, {
        type: "text",
        payload: `${fileId}`
    });
});

// Обработка нажатий на кнопки inline-клавиатуры
bot.on('callback_query', async (ctx) => {
    let chatID = ctx.callbackQuery.message.chat.id;
    const data = ctx.callbackQuery.data;

    await ctx.answerCbQuery();
    await interact(ctx, chatID, {
        type: "text",
        payload: data
    });
});

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));