const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

const token = '7599710621:AAE3hVWIA7b51H3S0phfQDBlvw-8ucTTXyY';
const bot = new TelegramBot(token, { polling: true });

let userState = {}; // Стан користувача

// Обробка повідомлень
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  // Якщо користувач ввів число
  if (!isNaN(text)) {
    const amount = parseFloat(text);
    userState[chatId] = { step: 'from_currency', amount };
    bot.sendMessage(chatId, 'Оберіть валюту, яку ви хочете конвертувати:', {
      reply_markup: {
        keyboard: [['UAH', 'MDL'], ['USD', 'EUR']],
        one_time_keyboard: true,
      },
    });
    return;
  }

  const state = userState[chatId] || {};

  if (state.step === 'from_currency') {
    // Крок 1: Отримати початкову валюту
    if (!['UAH', 'MDL', 'USD', 'EUR'].includes(text.toUpperCase())) {
      bot.sendMessage(chatId, 'Будь ласка, оберіть валюту зі списку.');
      return;
    }

    userState[chatId] = { ...state, fromCurrency: text.toUpperCase(), step: 'to_currency' };
    bot.sendMessage(chatId, 'Оберіть валюту, у яку ви хочете конвертувати:', {
      reply_markup: {
        keyboard: [['UAH', 'MDL'], ['USD', 'EUR']],
        one_time_keyboard: true,
      },
    });
    return;
  }

  if (state.step === 'to_currency') {
    // Крок 2: Отримати валюту для конвертації
    if (!['UAH', 'MDL', 'USD', 'EUR'].includes(text.toUpperCase())) {
      bot.sendMessage(chatId, 'Будь ласка, оберіть валюту зі списку.');
      return;
    }

    const toCurrency = text.toUpperCase();
    const { amount, fromCurrency } = state;

    try {
      // Запит до API
      const apiUrl = `https://api.exchangerate.host/convert?from=${fromCurrency}&to=${toCurrency}&amount=${amount}&access_key=3bd47c8cb88cad1db0c2274a42e4c5da`;
      const response = await axios.get(apiUrl);

      if (response.data && response.data.success) {
        const convertedAmount = response.data.result.toFixed(2);
        bot.sendMessage(
          chatId,
          `💱 ${amount} ${fromCurrency} ≈ ${convertedAmount} ${toCurrency}`,
          { parse_mode: 'Markdown' }
        );
      } else {
        bot.sendMessage(chatId, 'Не вдалося отримати курс валют. Спробуйте пізніше.');
      }
    } catch (error) {
      console.error('API Error:', error.message);
      bot.sendMessage(chatId, 'Сталася помилка при отриманні курсу валют. Спробуйте пізніше.');
    }

    // Скидаємо стан користувача
    userState[chatId] = null;
    return;
  }

  // Якщо повідомлення не відповідає жодному сценарію
  bot.sendMessage(chatId, 'Будь ласка, введіть суму для конвертації.');
});
