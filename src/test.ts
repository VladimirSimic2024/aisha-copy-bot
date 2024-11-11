import { isInValidKeyPair } from "@solana-common/utils";
import { Keypair } from "@solana/web3.js";
const test = () => {
    let keypair = Keypair.generate();
    isInValidKeyPair(keypair);
}

test();