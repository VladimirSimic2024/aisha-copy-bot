import bs58 from 'bs58';
import {
  Commitment,
  Keypair,
  Connection,
  LAMPORTS_PER_SOL,
  SYSVAR_RENT_PUBKEY,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  ParsedInstruction,
  ParsedAccountData,
  VersionedTransaction,
  TransactionMessage,
  BlockhashWithExpiryBlockHeight,
  AddressLookupTableAccount,
  Version,
  Finality
} from "@solana/web3.js";

import { 
  isValidAddress,
  isInValidKeyPair,
} from "@solana-common/utils";

import {
  TOKEN_PROGRAM_ID,
  AccountLayout,
  TOKEN_2022_PROGRAM_ID,
  getMint,
  getAccount,
  getAssociatedTokenAddress,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction
} from "@solana/spl-token";

import { Metaplex } from "@metaplex-foundation/js";

import {
  Token,
  SPL_ACCOUNT_LAYOUT,
} from "@raydium-io/raydium-sdk";

import axios from 'axios';
import { sha256 } from "js-sha256";

export const DEFAULT_COMMITMENT: Commitment = "finalized";
export const DEFAULT_FINALITY: Finality = "finalized";

export const WSOL_ADDRESS = "So11111111111111111111111111111111111111112";
export const LAMPORTS = LAMPORTS_PER_SOL;
export const USDC_ADDRESS = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

const jito_Validators = [
  "DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh",
  "ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt",
  "3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT",
  "HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe",
  "ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49",
  "Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY",
  "DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL",
  "96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5",
];
const endpoints = [
  "https://mainnet.block-engine.jito.wtf/api/v1/bundles",
  "https://amsterdam.mainnet.block-engine.jito.wtf/api/v1/bundles",
  "https://frankfurt.mainnet.block-engine.jito.wtf/api/v1/bundles",
  "https://ny.mainnet.block-engine.jito.wtf/api/v1/bundles",
  "https://tokyo.mainnet.block-engine.jito.wtf/api/v1/bundles",
];

export const createWallet = () => {
  let keypair = Keypair.generate();
  let publicKey = keypair.publicKey.toBase58();
  let privateKey = bs58.encode(keypair.secretKey);
  return { publicKey, privateKey };
}

export const getPublicKey = (privateKey: string) => {
  try {
    let keypair = Keypair.fromSecretKey(bs58.decode(privateKey));
    let publicKey = keypair.publicKey.toBase58();
    return publicKey;
  } catch (error) {
    return null;
  }
}

export function shortenAddress(address: string) {
  try {
    const firstPart = address.slice(0, 6);
    const lastPart = address.slice(-4);
    return `${firstPart}...${lastPart}`;
  } catch (error) {
    return null;
  }
}

export function isNumber(inputText: string | undefined) {
  if (!inputText)
    return false;
  return !isNaN(parseFloat(inputText)) && isFinite(Number(inputText));
}

export async function getTokenAddressFromTokenAccount(connection: Connection, tokenAccountAddress: string) {
  try {
    const tokenAccountPubkey = new PublicKey(tokenAccountAddress);
    const accountInfo = await connection.getAccountInfo(tokenAccountPubkey);

    if (accountInfo === null) {
      throw new Error('Token account not found');
    }

    const accountData = AccountLayout.decode(accountInfo.data);
    const mintAddress = new PublicKey(accountData.mint);

    // console.log(`Token address (mint address) for token account ${tokenAccountAddress}: ${mintAddress.toBase58()}`);
    return mintAddress.toBase58();
  } catch (error) {
    console.error('Error fetching token address:', error);
  }
}

export const getTokenMetaData = async (CONNECTION: Connection, address: string) => {
  try {
    const metaplex = Metaplex.make(CONNECTION);
    const mintAddress = new PublicKey(address);
    const token = await metaplex.nfts().findByMint({ mintAddress: mintAddress });
    let mintInfo = null
    let totalSupply = 0
    let token_type = "spl-token"
    if (token) {
      const name = token.name;
      const symbol = token.symbol;
      const logo = token.json?.image;
      const description = token.json?.description;
      const extensions = token.json?.extensions;
      const decimals = token.mint.decimals;
      const renounced = token.mint.mintAuthorityAddress ? false : true;

      if (token.mint.currency.namespace === "spl-token") {
        mintInfo = await getMint(CONNECTION, mintAddress, "confirmed", TOKEN_PROGRAM_ID)
        token_type = "spl-token"
      } else {
        mintInfo = await getMint(CONNECTION, mintAddress, "confirmed", TOKEN_2022_PROGRAM_ID)
        token_type = "spl-token-2022"
      }
      if (mintInfo) {
        totalSupply = Number(mintInfo.supply / BigInt(10 ** decimals))
      }
      const metaData = { name, symbol, logo, decimals, address, totalSupply, description, extensions, renounced, type: token_type };
      console.log('metaData = ', metaData);
      return metaData;
    } else {
      console.log("utils.getTokenMetadata tokenInfo", token);
    }

  } catch (error) {
    console.log("getTokenMetadata", error);
  }
  return null
}

export const getBalance = async (connection: Connection, publicKey: string, lamports: boolean = false) => {
  try {
    const balance = await connection.getBalance(new PublicKey(publicKey));
    if (lamports)
      return balance;
    else
      return balance / LAMPORTS_PER_SOL;
  } catch (error) {
    console.log('solana.ts getBalance error :', error);
    return 0;
  }
}

export const jupiter_swap = async (
  connection: Connection,
  privateKey: string,
  inputMint: string,
  outputMint: string,
  amount: number,
  swapMode: "ExactIn" | "ExactOut" = "ExactIn",
  jito_tip: number = 2000000,
  slippage: number = 5000
) => {
  try {
    const keypair = Keypair.fromSecretKey(bs58.decode(privateKey));

    const quoteResponse = await (
      await fetch(`https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippage}&swapMode=${swapMode}`
      )
    ).json();

    const { swapTransaction } = await (
      await fetch('https://quote-api.jup.ag/v6/swap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          quoteResponse,
          userPublicKey: keypair.publicKey.toString(),
          wrapAndUnwrapSol: true,
        })
      })
    ).json();

    // deserialize the transaction
    const swapTransactionBuf = Buffer.from(swapTransaction, 'base64');
    var transaction = VersionedTransaction.deserialize(swapTransactionBuf);

    const simulateResult = await connection.simulateTransaction(transaction);
    console.log('Jupiter SWap Trx Simulation result:', simulateResult);

    // sign the transaction
    transaction.sign([keypair]);
    const txSignature = bs58.encode(transaction.signatures[0]);
    const latestBlockHash = await connection.getLatestBlockhash('processed');

    let result = await sendBundle(connection, transaction, keypair, latestBlockHash, jito_tip);

    if (result) {
      console.log("http://solscan.io/tx/" + txSignature);
      return { success: true, signature: txSignature };
    } else {
      console.log("JuptierSwap Transaction failed");
      return { success: false, signature: null };
    }
  } catch (error) {
    console.log('JupiterSwap Transaction failed, error :', error);
    return { success: false, signature: null };
  }
}

export async function sendBundle(
  connection: Connection,
  transaction: VersionedTransaction,
  payer: Keypair,
  lastestBlockhash: BlockhashWithExpiryBlockHeight,
  jitofee: number
) {
  const jito_validator_wallet = await getRandomValidator();
  try {
    if (isInValidKeyPair(payer)) {
      console.log('SendBundle invalid keypair');
      return false;
    }
    const jitoFee_message = new TransactionMessage({
      payerKey: payer.publicKey,
      recentBlockhash: lastestBlockhash.blockhash,
      instructions: [
        SystemProgram.transfer({
          fromPubkey: payer.publicKey,
          toPubkey: jito_validator_wallet,
          lamports: jitofee,
        }),
      ],
    }).compileToV0Message();

    const jitoFee_transaction = new VersionedTransaction(jitoFee_message);
    jitoFee_transaction.sign([payer]);

    const serializedJitoFeeTransaction = bs58.encode(jitoFee_transaction.serialize());
    const serializedTransaction = bs58.encode(transaction.serialize());

    const final_transaction = [
      serializedJitoFeeTransaction,
      serializedTransaction,
    ];

    console.log("Sending bundles...");

    const { data } = await axios.post('https://frankfurt.mainnet.block-engine.jito.wtf/api/v1/bundles', {
      jsonrpc: "2.0",
      id: 1,
      method: "sendBundle",
      params: [final_transaction],
    })

    let bundleIds: any = [];
    if (data) {
      console.log(data);
      bundleIds = [
        data.result
      ];
    }

    console.log("Checking bundle's status...", bundleIds);
    const sentTime = Date.now();
    let confirmed = false;
    while (Date.now() - sentTime < 300000) {

      try {
        const { data } = await axios.post(`https://frankfurt.mainnet.block-engine.jito.wtf/api/v1/bundles`,
          {
            jsonrpc: "2.0",
            id: 1,
            method: "getBundleStatuses",
            params: [
              bundleIds
            ],
          },
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (data) {
          const bundleStatuses = data.result.value;
          console.log("Bundle Statuses:", bundleStatuses);
          let success = true;

          for (let i = 0; i < bundleIds.length; i++) {
            const matched = bundleStatuses.find((item: any) => item && item.bundle_id === bundleIds[i]);
            if (!matched || matched.confirmation_status !== "confirmed") { // finalized
              success = false;
              break;
            }
          }

          if (success) {
            confirmed = true;
            break;
          }
        }
      } catch (err) {
        console.log("JITO ERROR:", err);
      }
      // await sleep(500);
    }
    return confirmed;
  } catch (e) {
    if (e instanceof axios.AxiosError) {
      console.log("Failed to execute the jito transaction");
    } else {
      console.log("Error during jito transaction execution: ", e);
    }
    return false;
  }
}

// export const transferSOL = async (connection: Connection, sender: Keypair, receiver: PublicKey, amount: number) => {
//   const latestBlockHash = await connection.getLatestBlockhash('finalized');
//   const sendmessage = new TransactionMessage({
//     payerKey: sender.publicKey,
//     recentBlockhash: latestBlockHash.blockhash,
//     instructions: [
//       SystemProgram.transfer({
//         fromPubkey: sender.publicKey,
//         toPubkey: receiver,
//         lamports: Math.floor(amount),
//       }),
//     ],
//   }).compileToV0Message();

//   const sendTx = new VersionedTransaction(sendmessage);
//   sendTx.sign([sender]);

//   const simulateResult = await connection.simulateTransaction(sendTx);
//   console.log('transferSOL Simulation result:', simulateResult);

//   const result = await jito_executeAndConfirm(connection, sendTx, keypair, latestBlockHash, jito_tip);
//   return result;
// }

export const transferSol_ = async (connection: Connection, sender: Keypair, receiver: PublicKey, amount: number) => {
  try {

    const transferSolIx = SystemProgram.transfer({
      fromPubkey: sender.publicKey,
      toPubkey: receiver,
      lamports: amount - 50000,
    });

    const recentBlockhash = await connection.getLatestBlockhash('finalized');
    const messageV0 = new TransactionMessage({
      payerKey: sender.publicKey,
      recentBlockhash: recentBlockhash.blockhash,
      instructions: [transferSolIx],
    }).compileToV0Message();

    const transaction = new VersionedTransaction(messageV0);
    transaction.sign([sender]);
    // const signature = await connection.sendRawTransaction(transaction.serialize(), {
    //   skipPreflight: false,
    // });
    const result = await sendAndConfirmTransactions(connection, sender, transaction);
    return result;
  } catch (error) {
    console.log('transferSol error: ', error)
    return false;
  }

}

// export const sendSolana = async (connection: Connection, sender: Keypair, receiver: PublicKey, amount: number) => {
//   try {
//     const sendSolanaTransaction = new Transaction();

//     const transferSolIx = await SystemProgram.transfer({
//       fromPubkey: sender.publicKey,
//       toPubkey: receiver,
//       lamports: amount - 5000,
//     });
//     sendSolanaTransaction.add(transferSolIx);

//     let blockhash = (await connection.getLatestBlockhash("finalized")).blockhash;
//     sendSolanaTransaction.feePayer = sender.publicKey;
//     sendSolanaTransaction.recentBlockhash = blockhash;
//     sendSolanaTransaction.sign(sender);
//     const result = await jito_executeAndConfirm(connection, sendSolanaTransaction, keypair, latestBlockHash, jito_tip);
//   } catch (error) {
//     console.log("error sending tokens: ", error);
//     return false;
//   }
// };

// gpt code
export async function sendSol(connection: Connection, sender: Keypair, receiver: PublicKey, amount: number) {
  try {
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: sender.publicKey,
        toPubkey: receiver,
        lamports: amount - 5000,
      })
    );
    const signature = await connection.sendTransaction(transaction, [sender]);

    if (signature)
      return true;
    else return false;
  } catch (error) {
    console.log('send sol error', error);
    return false;
  }
}

// export const sendSOL = async (senderPrivateKey: string, receiverAddress: string, amount: number) => {
//   try {
//     let privateKey_nums = bs58.decode(senderPrivateKey);
//     let senderKeypair = Keypair.fromSecretKey(privateKey_nums);

//     let transaction = new Transaction().add(
//       SystemProgram.transfer({
//         fromPubkey: senderKeypair.publicKey,
//         toPubkey: new PublicKey(receiverAddress),
//         lamports: Math.round(LAMPORTS_PER_SOL * amount) - 5000
//       })
//     )
//     const recentBlockhash = await connection.getLatestBlockhash('finalized');
//     transaction.feePayer = senderKeypair.publicKey;
//     transaction.recentBlockhash = recentBlockhash.blockhash;
//     const signature = await sendAndConfirmTransaction(connection, transaction, [senderKeypair]);
//     console.log(`Send SOL TX: ${signature}`);
//     return signature;
//   } catch (error) {
//     console.log("Send SOL Erro: ", error)
//     return null;
//   }
// }

const sendAndConfirmTransactions = async (connection: Connection, payer: Keypair, tx: VersionedTransaction) => {
  // tx.sign([payer]);
  const rawTransaction = tx.serialize()
  while (true) {
    try {
      const txid = await connection.sendRawTransaction(rawTransaction, {
        skipPreflight: true,
        maxRetries: 2
      });
      let res = await connection.confirmTransaction(txid);
      if (res.value.err) {
        console.log("Confirming Transaction failed");
        break;
      }
      console.log("Confirmed Transaction ...");
      return true;
    } catch (error) {
      console.log("Sending Transaction Error");
      await sleep(1000);
    }
  }
  return false;
};

export async function jito_executeAndConfirm(
  CONNECTION: Connection,
  transaction: VersionedTransaction,
  payer: Keypair,
  lastestBlockhash: BlockhashWithExpiryBlockHeight,
  jitofee: number
) {
  console.log("Executing transaction (jito)...");
  const jito_validator_wallet = await getRandomValidator();
  console.log("Selected Jito Validator: ", jito_validator_wallet.toBase58());
  try {
    // const fee = new CurrencyAmount(Currency.SOL, jitofee, false).raw.toNumber();
    // console.log(`Jito Fee: ${fee / 10 ** 9} sol`);
    const jitoFee_message = new TransactionMessage({
      payerKey: payer.publicKey,
      recentBlockhash: lastestBlockhash.blockhash,
      instructions: [
        SystemProgram.transfer({
          fromPubkey: payer.publicKey,
          toPubkey: jito_validator_wallet,
          lamports: jitofee,
        }),
      ],
    }).compileToV0Message();

    const jitoFee_transaction = new VersionedTransaction(jitoFee_message);
    jitoFee_transaction.sign([payer]);
    const jitoTxSignature = bs58.encode(jitoFee_transaction.signatures[0]);
    const serializedJitoFeeTransaction = bs58.encode(
      jitoFee_transaction.serialize()
    );
    const serializedTransaction = bs58.encode(transaction.serialize());
    const final_transaction = [
      serializedJitoFeeTransaction,
      serializedTransaction,
    ];
    const requests = endpoints.map((url) =>
      axios.post(url, {
        jsonrpc: "2.0",
        id: 1,
        method: "sendBundle",
        params: [final_transaction],
      })
    );
    console.log("Sending tx to Jito validators...");
    const res = await Promise.all(requests.map((p) => p.catch((e) => e)));
    const success_res = res.filter((r) => !(r instanceof Error));
    if (success_res.length > 0) {
      console.log("Jito validator accepted the tx");
      const result = await jito_confirm(CONNECTION, jitoTxSignature, lastestBlockhash);
      if (result.confirmed)
        return true;
      else
        return false;
    } else {
      console.log("No Jito validators accepted the tx");
      return false;
    }
  } catch (e) {
    if (e instanceof axios.AxiosError) {
      console.log("Failed to execute the jito transaction");
    } else {
      console.log("Error during jito transaction execution: ", e);
    }
    return false;
  }
}

export function getKeyPairFromPrivateKey(privateKey: string): Keypair {
  return Keypair.fromSecretKey(bs58.decode(privateKey));
}

/**
 * Confirms a transaction on the Solana blockchain.
 * @param {string} signature - The signature of the transaction.
 * @param {object} latestBlockhash - The latest blockhash information.
 * @returns {object} - An object containing the confirmation status and the transaction signature.
 */
async function jito_confirm(CONNECTION: Connection, signature: string, latestBlockhash: BlockhashWithExpiryBlockHeight) {
  console.log("Confirming the jito transaction...");
  const confirmation = await CONNECTION.confirmTransaction(
    {
      signature,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      blockhash: latestBlockhash.blockhash,
    },
    "confirmed"
  );
  return { confirmed: !confirmation.value.err, signature };
}

export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function getRandomValidator() {
  const res =
    jito_Validators[Math.floor(Math.random() * jito_Validators.length)];
  return new PublicKey(res);
}

export const getPoolInfo = async (address: string) => {
  const url = `https://api.dexscreener.com/latest/dex/tokens/${address}`;
  const res = await axios.get(url);
  if (!res.data.pairs) {
    return null;
  }
  for (let pairInfo of res.data.pairs) {
    if (pairInfo.chainId === "solana") {
      const data: any = {}
      data.dex = pairInfo.dexId
      data.dexURL = pairInfo.url
      data.symbol = pairInfo.baseToken.symbol
      data.name = pairInfo.baseToken.name
      data.addr = pairInfo.baseToken.address
      data.priceUsd = pairInfo.priceUsd
      data.priceNative = pairInfo.priceNative
      data.volume = pairInfo.volume.m5
      data.priceChange = pairInfo.priceChange.m5
      if (pairInfo.liquidity != undefined) {
        data.liquidity = pairInfo.liquidity.usd
        data.pooledSOL = pairInfo.liquidity.quote
      }
      data.mc = pairInfo.fdv
      console.log('poolinfo = ', data);
      return data
    }
  }
  return null
}

export const getTokenBalance = async (connection: Connection, walletAddress: string, tokenAddress: string, lamports: boolean = false) => {
  const mint = new PublicKey(tokenAddress);
  const mintInfo = await getMint(connection, mint);
  const baseToken = new Token(TOKEN_PROGRAM_ID, tokenAddress, mintInfo.decimals);
  console.log('token =', baseToken);
  const walletTokenAccounts = await getWalletTokenAccount(connection, new PublicKey(walletAddress));
  let tokenBalance = 0;
  if (walletTokenAccounts && walletTokenAccounts.length > 0) {
    for (let walletTokenAccount of walletTokenAccounts) {
      if (walletTokenAccount.accountInfo.mint.toBase58() === tokenAddress) {
        if (lamports == true)
          tokenBalance = Number(walletTokenAccount.accountInfo.amount);
        else
          tokenBalance = Number(walletTokenAccount.accountInfo.amount) / 10 ** baseToken.decimals;
        break;
      }
    }

  }
  return tokenBalance;
};

export const getWalletTokenAccount = async (connection: Connection, wallet: PublicKey) => {
  const walletTokenAccount = await connection.getTokenAccountsByOwner(wallet, {
    programId: TOKEN_PROGRAM_ID,
  });
  return walletTokenAccount.value.map((i) => ({
    pubkey: i.pubkey,
    programId: i.account.owner,
    accountInfo: SPL_ACCOUNT_LAYOUT.decode(i.account.data),
  }));
};

export const getTokenPrice = async (tokenAddress: string, quoteTokenAddress: string) => {
  try {
    const url = `https://price.jup.ag/v6/price?ids=${tokenAddress}&vsToken=${quoteTokenAddress}`
    const resp = await axios.get(url);
    console.log('response = ', resp.data);
    let price;
    if (resp && resp.data && resp.data.data && resp.data.data[tokenAddress]) {
      price = resp.data.data[tokenAddress].price
      return price;
    }
  } catch (error) {
    console.log("getTokenPrice", error)
  }
  return null;
}

export const isPumpFunSwapTx = async (connection: Connection, signature: string) => {
  try {

    const tx: any = await connection.getParsedTransaction(signature, { maxSupportedTransactionVersion: 0 });
    const logs = tx.meta.logMessages;
    const instructions = tx!.transaction.message.instructions;
    const innerinstructions = tx!.meta!.innerInstructions

    let isPumpFunSwap = false;
    let direction;
    let token;
    let tokenAmount = 0;
    let solAmount = 0;

    for (let i = 0; i < logs.length; i++) {
      if (logs[i].includes('Program 6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P invoke')) {
        if (logs[i + 1] == 'Program log: Instruction: Buy') {
          isPumpFunSwap = true;
          direction = "buy";
        } else if (logs[i + 1] == 'Program log: Instruction: Sell') {
          isPumpFunSwap = true;
          direction = "sell";
        }
        break;
      }
    }

    if (!isPumpFunSwap)
      return { isPumpFunSwap: false, direction: null, token: null, solAmount: null };

    for (let i = 0; i < instructions.length; i++) {
      if (instructions[i].programId.toBase58() === "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P") {
        for (let j = 0; j < innerinstructions!.length; j++) {
          if (innerinstructions![j].index === i) {

            if (direction == "buy") {
              token = await getTokenAddressFromTokenAccount(connection, (innerinstructions![j].instructions[0] as ParsedInstruction).parsed.info.destination);
              tokenAmount = Number((innerinstructions![j].instructions[0] as any).parsed.info.amount);
              solAmount = (innerinstructions![j].instructions[1] as any).parsed.info.lamports;
            } else {
              token = await getTokenAddressFromTokenAccount(connection, (innerinstructions![j].instructions[0] as ParsedInstruction).parsed.info.source);
              tokenAmount = Number((innerinstructions![j].instructions[0] as any).parsed.info.amount);
              solAmount = 0;
            }
            return { isPumpFunSwap, direction, token, tokenAmount, solAmount };
          }
        }
      } else if (instructions[i].programId.toBase58() === "BSfD6SHZigAfDWSjzD5Q41jw8LmKwtmjskPH9XW1mrRW") {
        for (let j = 0; j < innerinstructions!.length; j++) {
          if (innerinstructions![j].index === i) {
            if (direction == "buy") {
              token = await getTokenAddressFromTokenAccount(connection, (innerinstructions![j].instructions[1] as ParsedInstruction).parsed.info.destination);
              tokenAmount = Number((innerinstructions![j].instructions[1] as any).parsed.info.amount);
              solAmount = (innerinstructions![j].instructions[2] as any).parsed.info.lamports;
            } else {
              token = await getTokenAddressFromTokenAccount(connection, (innerinstructions![j].instructions[1] as ParsedInstruction).parsed.info.source);
              tokenAmount = Number((innerinstructions![j].instructions[1] as any).parsed.info.amount);
              solAmount = 0;
            }
            return { isPumpFunSwap, direction, token, tokenAmount, solAmount };
          }
        }
      }
    }
    return { isPumpFunSwap: false, direction, token, tokenAmount, solAmount };
  } catch (error) {
    console.log('error = ', error);
    return null;
  }
};

export const getTokenSwapInfo = async (connection: Connection, signature: string) => {
  console.log("getTokenSwapInfo, start");
  try {
    const tx = await connection.getParsedTransaction(signature, { maxSupportedTransactionVersion: 0 });
    console.log('tx = ', tx);

    const instructions = tx!.transaction.message.instructions;
    console.log('instructions = ', instructions);

    const innerinstructions = tx!.meta!.innerInstructions;
    console.log('innerInstructions = ', innerinstructions);

    // check if this is raydium swap trx
    const raydiumPoolV4 = "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8";
    const jupiterAggregatorV6 = "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4";
    for (let i = 0; i < instructions.length; i++) {
      // console.log("programid = ", instructions[i].programId.toString());
      if (instructions[i].programId.toBase58() === raydiumPoolV4) {
        // console.log('index = ', i);
        for (let j = 0; j < innerinstructions!.length; j++) {
          if (innerinstructions![j].index === i) {
            // console.log("swap inner instructions, send = ", innerinstructions[j].instructions[0].parsed.info);
            // console.log("swap inner instructions, receive = ", innerinstructions[j].instructions[1].parsed.info);
            const sendToken = await getTokenAddressFromTokenAccount(connection, (innerinstructions![j].instructions[0] as ParsedInstruction).parsed.info.destination);
            const sendAmount = (innerinstructions![j].instructions[0] as ParsedInstruction).parsed.info.amount;
            const receiveToken = await getTokenAddressFromTokenAccount(connection, (innerinstructions![j].instructions[1] as ParsedInstruction).parsed.info.source);
            const receiveAmount = (innerinstructions![j].instructions[1] as ParsedInstruction).parsed.info.amount;
            const result = { isSwap: true, type: "raydium swap", sendToken: sendToken, sendAmount: sendAmount, receiveToken: receiveToken, receiveAmount: receiveAmount, blockTime: tx?.blockTime };
            // console.log('swap info = ', result);
            return result;
          }
        }
      } else if (instructions[i].programId.toBase58() === jupiterAggregatorV6) {
        console.log('index = ', i);
        for (let j = 0; j < innerinstructions!.length; j++) {
          if (innerinstructions![j].index === i) {
            const length = innerinstructions![j].instructions.length;
            let sendToken;
            let sendAmount;
            let receiveToken;
            let receiveAmount;
            for (let i = 0; i < length; i++) {
              if ((innerinstructions![j].instructions[i] as ParsedInstruction).programId.toBase58() == 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') {
                if ((innerinstructions![j].instructions[i] as ParsedInstruction).parsed.type == "transferChecked") {
                  sendToken = await getTokenAddressFromTokenAccount(connection, (innerinstructions![j].instructions[i] as ParsedInstruction).parsed.info.destination);
                  sendAmount = (innerinstructions![j].instructions[i] as ParsedInstruction).parsed.info.tokenAmount.amount;
                  break;
                }

                if ((innerinstructions![j].instructions[i] as ParsedInstruction).parsed.type == "transfer") {
                  sendToken = await getTokenAddressFromTokenAccount(connection, (innerinstructions![j].instructions[i] as ParsedInstruction).parsed.info.destination);
                  sendAmount = (innerinstructions![j].instructions[i] as ParsedInstruction).parsed.info.amount;
                  break;
                }
              }
            }

            for (let i = length - 1; i >= 0; i--) {
              if ((innerinstructions![j].instructions[i] as ParsedInstruction).programId.toBase58() == 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') {
                if ((innerinstructions![j].instructions[i] as ParsedInstruction).parsed.type == "transferChecked") {
                  receiveToken = await getTokenAddressFromTokenAccount(connection, (innerinstructions![j].instructions[i] as ParsedInstruction).parsed.info.source);
                  receiveAmount = (innerinstructions![j].instructions[i] as ParsedInstruction).parsed.info.tokenAmount.amount;
                  break;
                }

                if ((innerinstructions![j].instructions[i] as ParsedInstruction).parsed.type == "transfer") {
                  receiveToken = await getTokenAddressFromTokenAccount(connection, (innerinstructions![j].instructions[i] as ParsedInstruction).parsed.info.source);
                  receiveAmount = (innerinstructions![j].instructions[i] as ParsedInstruction).parsed.info.amount;
                  break;
                }
              }
            }

            const result = { isSwap: true, type: "jupiter swap", sendToken: sendToken, sendAmount: sendAmount, receiveToken: receiveToken, receiveAmount: receiveAmount, blockTime: tx?.blockTime };
            console.log('swap info = ', result);
            return result;
          }
        }
      }
    }
    return { isSwap: false, type: null, sendToken: null, sendAmount: null, receiveToken: null, receiveAmount: null, blockTime: null };;
  } catch (error) {
    console.log('getTokenSwapInfo, Error', error);
    return { isSwap: false, type: null, sendToken: null, sendAmount: null, receiveToken: null, receiveAmount: null, blockTime: null };;
  }
}

export const getSwapInfo = async (connection: Connection, signature: string) => {
  try {
    let tx: any;
    let i = 0;
    let retry = 50;
    while (i < retry) {
      tx = await connection.getParsedTransaction(signature, { maxSupportedTransactionVersion: 0 });
      if (tx != null && tx != undefined)
        break;
      await sleep(100);
      i++;
      console.log(`solana.ts swapInfo, getParsedTransaction, retry number = ${i}, interval = 100ms`);
    }
    // const blocktime = tx?.blockTime;
    const instructions = tx!.transaction.message.instructions;
    const innerinstructions = tx!.meta!.innerInstructions;
    const accountKeys = tx?.transaction.message.accountKeys.map((ak: any) => ak.pubkey);
    const signer = accountKeys[0].toString();
    const logs = tx?.meta?.logMessages;

    let isSwap;
    let dex;
    let tokenAddress;
    let solAmount;
    let tokenAmount;
    let type;

    for (let i = 0; i < logs!.length; i++) {
      if (logs![i].includes('Program 675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8 invoke')) { // raydium
        isSwap = true;
        dex = 'raydium';
        // check instructions of raydium swap
        for (let i = 0; i < instructions.length; i++) {
          if (instructions[i].programId.toBase58() == "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8") {
            for (let j = 0; j < innerinstructions!.length; j++) {
              if (innerinstructions![j].index === i) {

                const [sendToken, receiveToken] = await Promise.all([
                  getTokenAddressFromTokenAccount(connection, (innerinstructions![j].instructions[0] as any).parsed.info.destination),
                  getTokenAddressFromTokenAccount(connection, (innerinstructions![j].instructions[1] as any).parsed.info.source)
                ]);

                const sendAmount = (innerinstructions![j].instructions[0] as any).parsed.info.amount;
                const receiveAmount = (innerinstructions![j].instructions[1] as any).parsed.info.amount;

                if (sendToken == 'So11111111111111111111111111111111111111112') {
                  type = "buy";
                  tokenAddress = receiveToken;
                  solAmount = Number(sendAmount);
                  tokenAmount = Number(receiveAmount);
                } else if (receiveToken == 'So11111111111111111111111111111111111111112') {
                  type = "sell";
                  tokenAddress = sendToken;
                  solAmount = Number(receiveAmount);
                  tokenAmount = Number(sendAmount);
                }
                return { isSwap, dex, type, tokenAddress, solAmount, tokenAmount, signer };
              }
            }
          }
        }

        // check inner instructions of raydium swap
        for (let i = 0; i < innerinstructions!.length; i++) {
          const instructions = innerinstructions![i].instructions;
          for (let j = 0; j < instructions.length; j++) {
            if (instructions[j].programId.toBase58() == '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8') {
              const [sendToken, receiveToken] = await Promise.all([
                getTokenAddressFromTokenAccount(connection, (instructions[j + 1] as any).parsed.info.destination),
                getTokenAddressFromTokenAccount(connection, (instructions[j + 2] as any).parsed.info.source)
              ])
              const sendAmount = (instructions[j + 1] as any).parsed.info.amount;
              const receiveAmount = (instructions[j + 2] as any).parsed.info.amount;
              if (sendToken == 'So11111111111111111111111111111111111111112') {
                type = "buy";
                tokenAddress = receiveToken;
                solAmount = Number(sendAmount);
                tokenAmount = Number(receiveAmount);
              } else if (receiveToken == 'So11111111111111111111111111111111111111112') {
                type = "sell";
                tokenAddress = sendToken;
                solAmount = Number(receiveAmount);
                tokenAmount = Number(sendAmount);
              }
              return { isSwap, dex, type, tokenAddress, solAmount, tokenAmount, signer };
            }
          }
        }
      } else if (logs![i].includes('Program 6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P invoke')) {// pumpfun swap
        isSwap = true;
        dex = 'pumpfun';
        if (logs![i + 1] == 'Program log: Instruction: Sell') {
          type = 'sell';
          // check instructions
          for (let i = 0; i < instructions.length; i++) {
            if (instructions[i].programId.toBase58() == "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P") {
              for (let j = 0; j < innerinstructions!.length; j++) {
                if (innerinstructions![j].index === i) {
                  const tokenAddress = await getTokenAddressFromTokenAccount(connection, (innerinstructions![j].instructions[0] as any).parsed.info.destination);
                  const tokenAmount = Number((innerinstructions![j].instructions[0] as any).parsed.info.amount);
                  const data = (innerinstructions![j].instructions[1] as any).data;
                  const bytedata = bs58.decode(data) as any;
                  const hexString = bytedata.toString("hex");
                  const solAmountBytes = hexString.substring(48 * 2, 56 * 2);
                  const reversedSolAmountBytes = solAmountBytes.match(/.{1,2}/g)!.reverse().join("");
                  const solAmount = Number("0x" + reversedSolAmountBytes);
                  return { isSwap, dex, type, tokenAddress, solAmount, tokenAmount, signer };
                }
              }
            }
          }

          // check inner instructions
          for (let i = 0; i < innerinstructions!.length; i++) {
            const instructions = innerinstructions![i].instructions;
            for (let j = 0; j < instructions.length; j++) {
              if (instructions[j].programId.toBase58() == '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P') {
                const tokenAddress = await getTokenAddressFromTokenAccount(connection, (instructions[j + 1] as any).parsed.info.destination);
                const tokenAmount = Number((instructions[j + 1] as any).parsed.info.amount);
                const data = (instructions[j + 2] as any).data;
                const bytedata = bs58.decode(data) as any;
                const hexString = bytedata.toString("hex");
                const solAmountBytes = hexString.substring(48 * 2, 56 * 2);
                const reversedSolAmountBytes = solAmountBytes.match(/.{1,2}/g)!.reverse().join("");
                const solAmount = Number("0x" + reversedSolAmountBytes);
                return { isSwap, dex, type, tokenAddress, solAmount, tokenAmount, signer };
              }
            }
          }
        } else if (logs![i + 1] == 'Program log: Instruction: Buy') {
          type = 'buy';
          // check instructions
          for (let i = 0; i < instructions.length; i++) {
            if (instructions[i].programId.toBase58() == "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P") {
              for (let j = 0; j < innerinstructions!.length; j++) {
                if (innerinstructions![j].index === i) {
                  const tokenAmount = Number((innerinstructions![j].instructions[0] as any).parsed.info.amount);
                  const tokenAddress = await getTokenAddressFromTokenAccount(connection, (innerinstructions![j].instructions[0] as any).parsed.info.source);
                  const solAmount = Number((innerinstructions![j].instructions[1] as any).parsed.info.lamports);
                  return { isSwap, dex, type, tokenAddress, solAmount, tokenAmount, signer };
                }
              }
            }
          }

          // check inner instructions
          for (let i = 0; i < innerinstructions!.length; i++) {
            const instructions = innerinstructions![i].instructions;
            for (let j = 0; j < instructions.length; j++) {
              if (instructions[j].programId.toBase58() == '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P') {
                const tokenAmount = Number((instructions[j + 1] as any).parsed.info.amount);
                const tokenAddress = await getTokenAddressFromTokenAccount(connection, (instructions[j + 1] as any).parsed.info.source);
                const solAmount = Number((instructions[j + 2] as any).parsed.info.lamports);
                return { isSwap, dex, type, tokenAddress, solAmount, tokenAmount, signer };
              }
            }
          }
        }
      }
    }
    return null;
  } catch (error) {
    console.log('solana.ts getSwapInfo error: ', error);
    return null;
  }
}

export const printSOLBalance = async (
  connection: Connection,
  pubKey: PublicKey,
  info: string = ""
) => {
  const balance = await connection.getBalance(pubKey);
  console.log(
    `${info ? info + " " : ""}${pubKey.toBase58()}:`,
    balance / LAMPORTS_PER_SOL,
    `SOL`
  );
};

export const getSPLBalance = async (
  connection: Connection,
  mintAddress: PublicKey,
  pubKey: PublicKey,
  allowOffCurve: boolean = false
) => {
  try {
    let ata = getAssociatedTokenAddressSync(mintAddress, pubKey, allowOffCurve);
    const balance = await connection.getTokenAccountBalance(ata, "processed");
    return balance.value.uiAmount;
  } catch (e) { }
  return null;
};

export const printSPLBalance = async (
  connection: Connection,
  mintAddress: PublicKey,
  user: PublicKey,
  info: string = ""
) => {
  const balance = await getSPLBalance(connection, mintAddress, user);
  if (balance === null) {
    console.log(
      `${info ? info + " " : ""}${user.toBase58()}:`,
      "No Account Found"
    );
  } else {
    console.log(`${info ? info + " " : ""}${user.toBase58()}:`, balance);
  }
};

export const baseToValue = (base: number, decimals: number): number => {
  return base * Math.pow(10, decimals);
};

export const valueToBase = (value: number, decimals: number): number => {
  return value / Math.pow(10, decimals);
};

//i.e. account:BondingCurve
export function getDiscriminator(name: string) {
  return sha256.digest(name).slice(0, 8);
}

export const buildVersionedTx = async (
  connection: Connection,
  payer: PublicKey,
  tx: Transaction,
  commitment: Commitment = DEFAULT_COMMITMENT
): Promise<VersionedTransaction> => {
  const blockHash = (await connection.getLatestBlockhash(commitment))
    .blockhash;

  let messageV0 = new TransactionMessage({
    payerKey: payer,
    recentBlockhash: blockHash,
    instructions: tx.instructions,
  }).compileToV0Message();

  return new VersionedTransaction(messageV0);
};