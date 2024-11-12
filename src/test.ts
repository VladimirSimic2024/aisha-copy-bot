import { CONNECTION } from "./config";
import { getSwapInfo } from "./solana";

const test = async () => {
    const hash = "3v5nhyZhvUqsvGVowmm61ce7q7cmnoQ2iTkb5A1GgtK7cGUThqBmeGiE2tX9VsD2qpcep8J4DFAq92NhSCeUczVh";
    const info = await getSwapInfo(CONNECTION, hash);
    console.log('info = ', info);
}

test();