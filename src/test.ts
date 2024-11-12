import { CONNECTION } from "./config";
import { getSwapInfo } from "./solana";

const test = async () => {
    const hash = "3WCeZSQzWB7gFHwNyxbLcZUWojh3eCFxkQP82kDwoyKwHgtT9QpnwACzBhhFVmPgJ34YzkedcrLzwd7uuSENsgvF";
    const info = await getSwapInfo(CONNECTION, hash);
    console.log('info = ', info);
}

test();