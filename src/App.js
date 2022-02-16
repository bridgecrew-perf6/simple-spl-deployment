import logo from "./logo.svg";
import "./App.css";
import { useState, useEffect } from "react";
import { Connection, clusterApiUrl, Transaction, PublicKey, LAMPORTS_PER_SOL, Keypair, sendAndConfirmTransaction } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, Token } from "@solana/spl-token";

function App() {
  // Create states for wallet connectivity.

  const [walletConnected, setWalletConnected] = useState(false);
  const [provider, setProvider] = useState();
  const [loading, setLoading] = useState();
  const [balance, setBalance] = useState();

  // States for mint creation

  const [isTokenCreated, setIsTokenCreated] = useState(false);
  const [createdTokenPublicKey, setCreatedTokenPublicKey] = useState(null);
  const [mintingWalletSecretKey, setMintingWalletSecretKey] = useState(null);

  // Quick useEffect to grab SOL balance on connect.
  useEffect(() => {
    getBalanceHelper();
  }, [walletConnected]);

  // simple getBalance function
  const getBalanceHelper = async () => {
    if (walletConnected === true) {
      const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
      const walletBalance = await connection.getBalance(new PublicKey(provider.publicKey));

      setBalance(walletBalance);
    }
  };

  // Wallet connector
  const walletConnectionHelper = async () => {
    if (walletConnected) {
      setProvider();
      setWalletConnected(false);
    } else {
      const userWallet = await getProvider();

      if (userWallet) {
        await userWallet.connect();
        userWallet.on("connect", async () => {
          setProvider(userWallet);
          setWalletConnected(true);
        });
      }
    }
  };

  // Check if solana exists in window
  const getProvider = () => {
    const provider = window.solana;

    return provider;
  };

  // Simple airdrop function
  const airDropHelper = async () => {
    try {
      setLoading(true);
      // Start connection to devnet cluster
      const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
      // Send txn for airdrop
      const airdropSignature = await connection.requestAirdrop(new PublicKey(provider.publicKey), 2 * LAMPORTS_PER_SOL);

      // Check if txn went through
      await connection.confirmTransaction(airdropSignature, "confirmed");

      console.log(`2 SOL airdropped to your wallet ${provider.publicKey.toString()} successfully`);
      setLoading(false);
    } catch (error) {
      console.log(error);
      setLoading(false);
    }
  };

  const initialMintHelper = async () => {
    try {
      const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

      const mintRequester = await provider.publicKey;
      const mintingFromWallet = await Keypair.generate();
      setMintingWalletSecretKey(JSON.stringify(mintingFromWallet.secretKey));

      console.log("airdropping SOL to minter wallet");

      const fromAirdropSignature = await connection.requestAirdrop(mintingFromWallet.publicKey, 2 * LAMPORTS_PER_SOL);
      const confirmation = await connection.confirmTransaction(fromAirdropSignature, "confirmed");

      if (!confirmation) {
        return;
      }

      console.log(`airdrop success: ${confirmation}`);

      console.log("creating token");

      const creatorToken = await Token.createMint(connection, mintingFromWallet, mintingFromWallet.publicKey, mintingFromWallet.publicKey, 9, TOKEN_PROGRAM_ID);
      const fromTokenAccount = await creatorToken.getOrCreateAssociatedAccountInfo(mintingFromWallet.publicKey);
      await creatorToken.mintTo(fromTokenAccount.address, mintingFromWallet.publicKey, [], 1000000);

      console.log("token created");

      const toTokenAccount = await creatorToken.getOrCreateAssociatedAccountInfo(mintRequester);
      const transaction = new Transaction().add(
        Token.createTransferInstruction(TOKEN_PROGRAM_ID, fromTokenAccount.address, toTokenAccount.address, mintingFromWallet.publicKey, [], 1000000)
      );

      const signature = await sendAndConfirmTransaction(connection, transaction, [mintingFromWallet], "confirmed");

      console.log("SIGNATURE: ", signature);

      setCreatedTokenPublicKey(creatorToken.publicKey.toString());
      setIsTokenCreated(true);
      setLoading(false);
    } catch (error) {
      console.log(error);
      setLoading(false);
    }
  };

  return (
    <div className='App'>
      <h1>Token Deployment</h1>
      {walletConnected ? (
        <p>
          <strong>Public Key:</strong> {provider.publicKey.toString()}
        </p>
      ) : (
        <p></p>
      )}

      {walletConnected ? (
        <p>
          Create your own token
          <button disabled={loading} onClick={initialMintHelper}>
            Initial Mint{" "}
          </button>
        </p>
      ) : (
        <p></p>
      )}

      {walletConnected ? (
        <p>
          <strong>Balance: {balance / LAMPORTS_PER_SOL}</strong>
        </p>
      ) : (
        <p></p>
      )}

      {walletConnected ? (
        <p>
          Airdrop 2 SOL into your wallet<br></br>
          <button disabled={loading} onClick={airDropHelper}>
            AirDrop SOL{" "}
          </button>
        </p>
      ) : (
        <></>
      )}

      <button onClick={walletConnectionHelper} disabled={loading}>
        {!walletConnected ? "Connect Wallet" : "Disconnect Wallet"}
      </button>
    </div>
  );
}

export default App;
