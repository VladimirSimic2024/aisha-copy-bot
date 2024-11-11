import { Connection } from "@solana/web3.js";

// Server config
export const PORT = 5000;

// Bot Config
export const BOT_NAME = "";
export const BOT_ID = "";
export const BOT_TOKEN = "6747914862:AAES4HsWM8Bhe8K3kBv-pKcgQ3G8oK_ANdo";
export const CHAT_ID = "-1002484859652";

// MONGODB Config
export const MONGO_URI = `mongodb://127.0.0.1:27017/${BOT_NAME}`;

// Solana Config
export const SOLANA_RPC_ENDPOINT = 'https://mainnet.helius-rpc.com/?api-key=7cac0d36-e381-41f3-a101-5c9136748a64';

export const CONNECTION = new Connection(SOLANA_RPC_ENDPOINT);

// Wallet Config
export const privateKey = "1d5JYSoxrsGHESJotaZosunxvXbxzsEjLuB5GjuvzhBPgRQCAeBtGvagHGCWpMVpr1fVFBdNF7DT2aQbh3SypCL";

