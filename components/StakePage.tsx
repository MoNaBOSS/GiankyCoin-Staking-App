"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useAddress,
  useContract,
  useContractRead,
  useNFTBalance,
  Web3Button,
  ThirdwebNftMedia,
} from "@thirdweb-dev/react";
import { ethers, BigNumber } from "ethers";
import { Alchemy, Network } from "alchemy-sdk";
import { Lock, Zap } from "lucide-react";

import styles from "../styles/Home.module.css";
import Nav from "../components/Nav";

import { STAKING_POOL_ABI } from "../constants/abis";
import { STAKING_POOL_ADDRESS, NFT_COLLECTIONS } from "../constants/config";

/* ------------------ Alchemy Setup ------------------ */
const alchemy = new Alchemy({
  apiKey: process.env.NEXT_PUBLIC_ALCHEMY_KEY!,
  network: Network.MATIC_MAINNET,
});

/* ------------------ Types ------------------ */
type StakedNFT = {
  collection: string;
  tokenId: number;
  startTime: number;
  lockEndTime: number;
  rewardRate: BigNumber;
};

/* ------------------ Helpers ------------------ */
const formatTime = (seconds: number) => {
  if (seconds <= 0) return "READY";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
};

/* ------------------ Component ------------------ */
export default function StakePage() {
  const address = useAddress();

  const { contract } = useContract(
    STAKING_POOL_ADDRESS,
    STAKING_POOL_ABI
  );

  /* ------------------ Contract Reads ------------------ */
  const { data: userState } = useContractRead(
    contract,
    "getUserFullState",
    [address]
  );

  const stakedNFTs: StakedNFT[] = userState?.stakes || [];
  const blacklist: number[] = userState?.blacklistedIds || [];

  /* ------------------ Rewards (Live) ------------------ */
  const [liveRewards, setLiveRewards] = useState<BigNumber>(BigNumber.from(0));

  useEffect(() => {
    if (!stakedNFTs?.length) return;

    const interval = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      let total = BigNumber.from(0);

      stakedNFTs.forEach((s) => {
        const elapsed = now - s.startTime;
        if (elapsed > 0) {
          total = total.add(
            s.rewardRate.mul(elapsed)
          );
        }
      });

      setLiveRewards(total);
    }, 1000);

    return () => clearInterval(interval);
  }, [stakedNFTs]);

  /* ------------------ Alchemy NFT Fetch ------------------ */
  const [ownedNFTs, setOwnedNFTs] = useState<any[]>([]);
  const [loadingNFTs, setLoadingNFTs] = useState(false);

  useEffect(() => {
    if (!address) return;

    setLoadingNFTs(true);

    alchemy.nft
      .getNftsForOwner(address, {
        contractAddresses: NFT_COLLECTIONS,
      })
      .then((res) => {
        setOwnedNFTs(res.ownedNfts);
      })
      .finally(() => setLoadingNFTs(false));
  }, [address]);

  /* ------------------ Render ------------------ */
  return (
    <div className={styles.container}>
      <Nav />

      <h1 className={styles.title}>⚡ Alpha Kong Staking</h1>

      {/* Stats */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span>Total Staked</span>
          <b>{stakedNFTs.length} / 6</b>
        </div>
        <div className={styles.statCard}>
          <span>Live Rewards</span>
          <b>{ethers.utils.formatUnits(liveRewards, 18)} GKY</b>
        </div>
      </div>

      {/* Claim */}
      <Web3Button
        contractAddress={STAKING_POOL_ADDRESS}
        contractAbi={STAKING_POOL_ABI}
        action={(c) => c.call("claimReward")}
        className={styles.claimBtn}
      >
        Claim Rewards
      </Web3Button>

      {/* Unstaked NFTs */}
      <h2 className={styles.sectionTitle}>Your Wallet (Unstaked)</h2>

      {loadingNFTs && <p>Scanning wallet...</p>}

      <div className={styles.nftGrid}>
        {ownedNFTs.map((nft) => {
          const tokenId = Number(nft.tokenId);
          const isBlacklisted = blacklist.includes(tokenId);

          return (
            <div key={tokenId} className={styles.nftCard}>
              <ThirdwebNftMedia metadata={nft.rawMetadata} />

              <h3>#{tokenId}</h3>

              {isBlacklisted ? (
                <span className={styles.blacklisted}>Blacklisted</span>
              ) : (
                <Web3Button
                  contractAddress={STAKING_POOL_ADDRESS}
                  contractAbi={STAKING_POOL_ABI}
                  action={(c) =>
                    c.call("stake", [
                      [nft.contract.address],
                      [tokenId],
                      0, // planIndex
                    ])
                  }
                >
                  Stake
                </Web3Button>
              )}
            </div>
          );
        })}
      </div>

      {/* Staked NFTs */}
      <h2 className={styles.sectionTitle}>Staked Assets</h2>

      <div className={styles.nftGrid}>
        {stakedNFTs.map((s, i) => {
          const remaining = s.lockEndTime - Math.floor(Date.now() / 1000);

          return (
            <div key={i} className={styles.nftCard}>
              <Lock size={18} />

              <p>ID #{s.tokenId}</p>

              <p className={styles.unlock}>
                Unlock: {formatTime(remaining)}
              </p>

              <Web3Button
                contractAddress={STAKING_POOL_ADDRESS}
                contractAbi={STAKING_POOL_ABI}
                action={(c) =>
                  c.call("unstake", [
                    [s.collection],
                    [s.tokenId],
                  ])
                }
              >
                Unstake & Claim
              </Web3Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
