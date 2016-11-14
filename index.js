import { Bot, Elements, Buttons } from 'facebook-messenger-bot';
import express from 'express';
import axios from 'axios';
import cheerio from 'cheerio';

const cookieStore = new Map();
const myPageAccessToken = process.env.PAGE_ACCESS_TOKEN;
const myVerification = process.env.VERIFICATION_TOKEN;
const bot = new Bot(myPageAccessToken, myVerification);

bot.on('message', async message => {
	const { sender } = message;
	const url = await getFirstURL('https://iphone.wahl-o-mat.de/', sender.id);
	const out = await getResponse(url, sender.id);
	await bot.send(sender.id, out);
});

bot.on('postback', async (event, message, data) => {
	const { sender } = message;
	const out = await getResponse(data, sender.id);
	await bot.send(sender.id, out);
});

function getFirstURL(baseURL, senderID) {
	return axios.get(baseURL).then(res => {
		cookieStore.set(senderID, res.headers['set-cookie'][0]);
		let $ = cheerio.load(res.data);
		baseURL = res.request.res.headers.location;
		return baseURL + $('#bnwelcome a').attr('href');
	});
}

function getResponse(url, senderID) {
	const options = {
		headers: {
			Cookie: cookieStore.get(senderID),
		},
	};

	return axios.get(url, options)
	.then(res => {
		let $ = cheerio.load(res.data);
		const baseURL = res.config.url.split('/').slice(0,-1).join('/') + '/';

		if ($('#bnthese').length > 0) {
			const out = new Elements();
			const buttons = new Buttons();
			$('.wom_entscheidung li a').get().forEach(answer => {
				buttons.add({text: $(answer).text(), data: baseURL + $(answer).attr('href')});
			});

			out.add({
				text: $('#bnthese h1').text() + ':\n' + $('#bnthese h1+p').text(),
				buttons,
			});

			return out;
		} else if ($('#bngewichtung').length > 0) {
			const querystring = '&cb_parteien=change&cb_parteien_492=1&cb_parteien_493=1&cb_parteien_494=1&cb_parteien_495=1&cb_parteien_496=1';
			return getResults(res.config.url + querystring, senderID);
		} else {
			console.log('UNKNOWN response');
		}
	});
}

function getResults(url, senderID) {
	const options = {
		headers: {
			Cookie: cookieStore.get(senderID),
		},
	};

	return axios.get(url, options).then(res => {
		let $ = cheerio.load(res.data);
		const baseURL = url.split('/').slice(0,-1).join('/') + '/';

		const out = new Elements();
		out.setListStyle('compact');
		$('.wom_ergebnis_list li').each((i, element) => {
			if (i < 4) {
				out.add({
					text: $(element).find('.wom_ergebnis_partei').text(),
					subtext: $(element).find('.wom_ergebnis_prozent').text() + ' Übereinstimmung',
					image: baseURL + $(element).find('img').attr('src'),
				});
			}
		});

		return out;
	});
}



const app = express();
app.use('/facebook', bot.router());
app.listen(process.env.PORT);
console.log(`✨ Server running on port ${process.env.PORT}`); //eslint-disable-line
