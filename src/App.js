import logo from "./logo.svg";
import "./App.css";
import { useState } from "react";
import { Connection, clusterApiUrl, Transaction, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

function App() {
  // Create states for wallet connectivity.

  const [walletConnected, setWalletConnected] = useState(false);
  const [provider, setProvider] = useState();
  const [loading, setLoading] = useState();

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

  const getProvider = () => {
    const provider = window.solana;

    return provider;
  };

  const airDropHelper = async () => {
    try {
      setLoading(true);
      const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
      const airdropSignature = await connection.requestAirdrop(new PublicKey(provider.publicKey), 2 * LAMPORTS_PER_SOL);
      await connection.confirmTransaction(airdropSignature, "confirmed");

      console.log(`2 SOL airdropped to your wallet ${provider.publicKey.toString()} successfully`);
      setLoading(false);
    } catch (error) {
      console.log(error);
      setLoading(false);
    }
  };

  return (
    <div className='App'>
      <h1>Deployment of token through solana/web3.js</h1>
      {walletConnected ? (
        <p>
          <strong>Public Key:</strong> {provider.publicKey.toString()}
        </p>
      ) : (
        <p></p>
      )}

      {walletConnected ? (
        <p>
          Airdrop 2 SOL into your wallet
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
