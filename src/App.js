import logo from "./logo.svg";
import "./App.css";
import { useState, useEffect } from "react";
import { Connection, clusterApiUrl, Transaction, PublicKey, LAMPORTS_PER_SOL, Keypair, sendAndConfirmTransaction } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, Token } from "@solana/spl-token";

function App() {
  // Create states for wallet connectivity.

  const [walletConnected, setWalletConnected] = useState();
  const [provider, setProvider] = useState();
  const [loading, setLoading] = useState();
  const [balance, setBalance] = useState();
  const [tokenBalance, setTokenBalance] = useState();

  // States for mint creation

  const [isTokenCreated, setIsTokenCreated] = useState(false);
  const [createdTokenPublicKey, setCreatedTokenPublicKey] = useState(null);
  const [mintingWalletSecretKey, setMintingWalletSecretKey] = useState(null);
  const [supplyCapped, setSupplyCapped] = useState(false);
  const [tokenObject, setTokenObject] = useState();

  const [tokenATA, setTokenATA] = useState();

  // Quick useEffect to grab SOL balance on connect.
  useEffect(
    () => {
      getBalanceHelper();
    },
    [walletConnected],
    [balance]
  );

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
      getBalanceHelper();
      setLoading(false);
    } catch (error) {
      console.log(error);
      setLoading(false);
    }
  };

  // Initial mint function
  const initialMintHelper = async () => {
    try {
      setLoading(true);
      // Setup new connection
      const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

      // Generate new keypair for initializing and minting of token.
      const mintRequester = await provider.publicKey;
      const mintingFromWallet = await Keypair.generate();
      setMintingWalletSecretKey(JSON.stringify(mintingFromWallet.secretKey));

      console.log("airdropping SOL to minter wallet");

      // airdrop SOL
      const fromAirdropSignature = await connection.requestAirdrop(mintingFromWallet.publicKey, 2 * LAMPORTS_PER_SOL);
      const confirmation = await connection.confirmTransaction(fromAirdropSignature, "confirmed");

      if (!confirmation) {
        return;
      }

      console.log(`airdrop success: ${confirmation}`);

      console.log("creating token");

      // create the actual token itself by initializing a Token class object
      const creatorToken = await Token.createMint(connection, mintingFromWallet, mintingFromWallet.publicKey, mintingFromWallet.publicKey, 0, TOKEN_PROGRAM_ID);

      // create an associated token account if does not exist
      const fromTokenAccount = await creatorToken.getOrCreateAssociatedAccountInfo(mintingFromWallet.publicKey);

      // mint token to ATA
      await creatorToken.mintTo(fromTokenAccount.address, mintingFromWallet.publicKey, [], 1000000);

      console.log("token created");

      // create new ATA for end user
      const toTokenAccount = await creatorToken.getOrCreateAssociatedAccountInfo(mintRequester);

      // transfer token from mint ATA to user ATA
      const transaction = new Transaction().add(
        Token.createTransferInstruction(TOKEN_PROGRAM_ID, fromTokenAccount.address, toTokenAccount.address, mintingFromWallet.publicKey, [], 1000000)
      );

      // send & confirm txn
      const signature = await sendAndConfirmTransaction(connection, transaction, [mintingFromWallet], "confirmed");

      console.log("SIGNATURE: ", signature);

      setCreatedTokenPublicKey(creatorToken.publicKey.toString());
      setIsTokenCreated(true);
      setLoading(false);
      setTokenObject(creatorToken);
      setTokenATA(toTokenAccount.address);
    } catch (error) {
      console.log(error);
      setLoading(false);
    }
  };

  // create additional mint button

  const mintMoreHelper = async () => {
    try {
      setLoading(true);
      const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
      const createMintingWallet = await Keypair.fromSecretKey(Uint8Array.from(Object.values(JSON.parse(mintingWalletSecretKey))));
      const mintRequester = await provider.publicKey;

      const fromTokenAccount = await tokenObject.getOrCreateAssociatedAccountInfo(createMintingWallet.publicKey);
      const toTokenAccount = await tokenObject.getOrCreateAssociatedAccountInfo(mintRequester);
      await tokenObject.mintTo(fromTokenAccount.address, createMintingWallet.publicKey, [], 100000000);

      console.log(tokenObject.publicKey.toString());

      const transaction = new Transaction().add(
        Token.createTransferInstruction(TOKEN_PROGRAM_ID, fromTokenAccount.address, toTokenAccount.address, createMintingWallet.publicKey, [], 100000000)
      );
      await sendAndConfirmTransaction(connection, transaction, [createMintingWallet], { commitment: "confirmed" });

      setLoading(false);
    } catch (err) {
      console.log(err);
      setLoading(false);
    }
  };

  // remove authority function

  const removeAuthorityHelper = async () => {
    try {
      setLoading(true);
      const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

      // convert secret key to uint8array and create new keypair object
      const createMintingWallet = await Keypair.fromSecretKey(Uint8Array.from(Object.values(JSON.parse(mintingWalletSecretKey))));

      // set mint authority to null
      const signature = await tokenObject.setAuthority(new PublicKey(createdTokenPublicKey), null, "MintTokens", createMintingWallet.publicKey, [
        createMintingWallet,
      ]);
      setSupplyCapped(true);
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
          <br></br>
          <strong>Token ATA:</strong> {tokenATA ? tokenATA.toString() : "Not Created"}
          <br></br>
          <strong>Token Public Key:</strong> {tokenObject ? tokenObject.publicKey.toString() : "Not Created"}
        </p>
      ) : (
        <p></p>
      )}

      {walletConnected ? (
        <p>
          <li>
            Create your own token:{" "}
            <button disabled={loading} onClick={initialMintHelper}>
              Initial Mint{" "}
            </button>
          </li>
          <li>
            Mint more tokens:{" "}
            <button disabled={loading || supplyCapped} onClick={mintMoreHelper}>
              Mint Again
            </button>
          </li>
          <li>
            Remove mint authority:{" "}
            <button disabled={loading} onClick={removeAuthorityHelper}>
              Remove mint authority
            </button>
          </li>
        </p>
      ) : (
        <p></p>
      )}

      {walletConnected && balance ? (
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
