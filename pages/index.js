import { ConnectWallet } from "@thirdweb-dev/react";
import styles from "../styles/Home.module.css";
import Nav from "../components/Nav";
import Link from "next/link";

export default function Home() {
  return (
    <div className={styles.container}>
      <Nav />
      <main className={styles.main} style={{ textAlign: "center", padding: "100px 20px" }}>
        <h1 className={styles.title} style={{ fontSize: "3rem", marginBottom: "20px" }}>
          GiankyCoin <span style={{ color: "#6366f1" }}>Staking</span>
        </h1>
        <p style={{ color: "#64748b", marginBottom: "40px", maxWidth: "600px", margin: "0 auto 40px" }}>
          Secure your assets in our high-yield vaults and earn GKY rewards. 
          Choose your tier to begin staking.
        </p>
        
        <div style={{ display: "flex", gap: "20px", justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/StarterStake">
            <button style={{ padding: "15px 30px", borderRadius: "12px", background: "#6366f1", color: "white", border: "none", fontWeight: "bold", cursor: "pointer" }}>
              ENTER STAKING VAULT
            </button>
          </Link>
          <ConnectWallet theme="dark" />
        </div>
      </main>
    </div>
  );
}