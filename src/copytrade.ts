import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { CHAT_ID, CONNECTION, privateKey } from "./config";
import { Position } from "./models/Position";
import { getBalance, getPublicKey, getSwapInfo, jupiter_swap, WSOL_ADDRESS } from "./solana"
import { bot } from "./bot";

export const processSignature = async (signature: string) => {
    const targetSwapInfo = await getSwapInfo(CONNECTION, signature);
    if (targetSwapInfo && targetSwapInfo.isSwap) {

        if (targetSwapInfo.type == "buy") {
            const targetSolBalance = await getBalance(CONNECTION, targetSwapInfo.signer, true);
            let rate = targetSwapInfo.solAmount! / (targetSolBalance + targetSwapInfo.solAmount!);
            const myWallet = getPublicKey(privateKey);
            const mySolBalance = await getBalance(CONNECTION, myWallet!, true);
            if (mySolBalance < 5000000) {
                console.log('Insufficient SOL balance');
                bot.sendMessage(CHAT_ID, 'Insufficient SOL balance');
                return;
            }
            const position = await Position.findOne({ targetWallet: targetSwapInfo.signer, tokenAddress: targetSwapInfo.tokenAddress });
            if (position)
                rate = 0.05; // 5% when second buy
            const buyAmount = Math.round(mySolBalance * rate);
            console.log('Buy SOL Amount = ', buyAmount / LAMPORTS_PER_SOL);
            const swapResult = await jupiter_swap(CONNECTION, privateKey, WSOL_ADDRESS, targetSwapInfo.tokenAddress!, buyAmount);
            if (swapResult.success && swapResult.signature) {
                const mySwapInfo = await getSwapInfo(CONNECTION, swapResult.signature);
                bot.sendMessage(CHAT_ID, `Copy Buy\n\namount: ${buyAmount / LAMPORTS_PER_SOL} SOL\nTxHash:${swapResult.signature}`, { parse_mode: "HTML" });
                if (position) {
                    position.targetTokenAmount = position.targetTokenAmount + targetSwapInfo.tokenAmount!;
                    position.myTokenAmount = position.myTokenAmount + mySwapInfo?.tokenAmount!;
                    await position.save();
                } else {
                    const newPosition = new Position({
                        targetWallet: targetSwapInfo.signer,
                        tokenAddress: targetSwapInfo.tokenAddress,
                        targetTokenAmount: targetSwapInfo.tokenAmount,
                        myTokenAmount: mySwapInfo?.tokenAmount,
                    });
                    await newPosition.save();
                }
            }
        } else { // Sell Case
            const targetWallet = targetSwapInfo.signer;
            console.log('Target wallet sell, wallet address = ', targetWallet);
            let position = await Position.findOne({ targetWallet: targetWallet, tokenAddress: targetSwapInfo.tokenAddress });
            if (!position) {
                console.log('No position of token: ', targetSwapInfo.tokenAddress);
                return;
            }
            const myWallet = getPublicKey(privateKey);
            const mySolBalance = await getBalance(CONNECTION, myWallet!, true);
            if (mySolBalance < 3000000) {
                console.log('Insufficient SOL balance');
                return;
            }
            const rate = targetSwapInfo.tokenAmount! / position.targetTokenAmount;
            const mySellTokenAmount = Math.round(position.myTokenAmount * rate);
            const swapResult = await jupiter_swap(CONNECTION, privateKey, targetSwapInfo.tokenAddress!, WSOL_ADDRESS, mySellTokenAmount);
            if (swapResult.success && swapResult.signature) {
                const mySwapInfo = await getSwapInfo(CONNECTION, swapResult.signature);
                bot.sendMessage(CHAT_ID, `Copy Sell\n\nAmount: ${mySwapInfo!.solAmount! / LAMPORTS_PER_SOL} SOL\nTxHash:${swapResult.signature}`, { parse_mode: "HTML" });
                position.targetTokenAmount = position.targetTokenAmount - targetSwapInfo.tokenAmount!;
                position.myTokenAmount = position.myTokenAmount - mySellTokenAmount;
                position.save();
            }
            if (rate == 1) { // when 100% sell
                await Position.findByIdAndDelete(position._id);
            }
        }
    }
}