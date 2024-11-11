import TelegramBot from 'node-telegram-bot-api';
import { BOT_TOKEN } from './config';

export const bot = new TelegramBot(BOT_TOKEN, { polling: true });