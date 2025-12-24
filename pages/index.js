import { ConnectWallet } from "@thirdweb-dev/react";
import styles from "../styles/Home.module.css";
import Nav from "../components/Nav";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <div className={styles.container}>
      <Nav />
      <main className={styles.main} style={{ minHeight: "80vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
        <h1 className={styles.title}>
          Welcome to <a href="#">GiankyCoin Staking</a>
        </h1>

        <p className={styles.description}>
          Select a tier to begin staking your assets.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginTop: "40px" }}>
          <Link href="/StarterStake">
            <div className={styles.card} style={{ cursor: "pointer", borderColor: "#6366f1" }}>
              <h2>Starter Tier &rarr;</h2>
              <p>Entry-level vaults.</p>
            </div>
          </Link>

          <Link href="/StandardStake">
            <div className={styles.card} style={{ cursor: "pointer", borderColor: "#22c55e" }}>
              <h2>Standard Tier &rarr;</h2>
              <p>Enhanced yields.</p>
            </div>
          </Link>
          
          <Link href="/VipStake">
            <div className={styles.card} style={{ cursor: "pointer", borderColor: "#f59e0b" }}>
              <h2>VIP Tier &rarr;</h2>
              <p>Exclusive access.</p>
            </div>
          </Link>

          <Link href="/DiamondStake">
            <div className={styles.card} style={{ cursor: "pointer", borderColor: "#ec4899" }}>
              <h2>Diamond Tier &rarr;</h2>
              <p>Maximum returns.</p>
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}