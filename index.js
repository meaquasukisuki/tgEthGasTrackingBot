const { default: axios } = require("axios");
const TelegramBot = require("node-telegram-bot-api");
require("dotenv").config();

const token = process.env.TELEGRAM_BOT_TOKEN;

const api = "https://ethgas.watch/api/gas";
const bot = new TelegramBot(token, { polling: true });

let chatId = 0;
let reminder = Infinity;
let interval;
let priceArr = [];

const getGasFee = async () => {
	return axios
		.get(api)
		.then((response) => {
			return response?.data?.normal?.gwei;
		})
		.catch((e) => {
			console.error(e);
		});
};

bot.onText(/^\/start/gm, (msg) => {
	clearInterval(interval);
	priceArr = [];
	reminder = Infinity;
	bot.sendMessage(msg.chat.id, `Welcome to eth gas fee track bot !`);
});

bot.onText(/^\/set_remind_value/gm, (msg) => {
	chatId = msg.chat.id;
	const text = msg.text.slice(17);
	reminder = Number(text.trim());
	bot.sendMessage(chatId, reminder);
});

bot.onText(/^\/set_0/gm, (msg) => {
	clearInterval(interval);
	priceArr = [];
	reminder = Infinity;
	bot.sendMessage(msg.chat.id, `close notify .`);
});

for (let i = 1; i < 21; i++) {
	const command = `set_${i}`;
	const regex = new RegExp(`^/${command}$`, "gm");
	bot.onText(regex, (msg) => {
		chatId = msg.chat.id;
		bot.sendMessage(msg.chat.id, msg.text);
		clearInterval(interval);
		priceArr = [];
		interval = setInterval(() => {
			if (priceArr.length < i) {
				priceArr.push(getGasFee());
			} else {
				Promise.allSettled(priceArr).then((prices) => {
					let average = 0;
					let total = 0;
					for (const price of prices) {
						if (price?.status == "fulfilled") {
							total += price?.value;
						}
					}
					average = Number(total / prices.length).toFixed(2);
					if (reminder != Infinity) {
						if (average < reminder) {
							bot.sendMessage(
								msg.chat.id,
								`Current average gas fee is ${average}, less than ${reminder} .`
							);
						}
					}
				});
				priceArr = [];
			}
			// 这里改每个周期的毫秒数
			// 现在是10000,就是10秒
		}, 10000);
	});
}
