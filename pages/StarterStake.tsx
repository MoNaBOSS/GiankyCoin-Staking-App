// pages/StandardStake.tsx
import React, { useEffect, useMemo, useState } from "react";
import type { NextPage } from "next";
import {
  ConnectWallet,
  ThirdwebNftMedia,
  useAddress,
  useContract,
  useContractRead,
  useTokenBalance,
  Web3Button,
  useNFT,
} from "@thirdweb-dev/react";
import { BigNumber, ethers } from "ethers";
import styles from "../styles/Home.module.css";
import { STAKING_POOL_ABI, REFERRAL_MANAGER_ABI } from "../constants/abis";

/**
 * STANDARD STAKE PAGE - V5 (single contract for all tiers)
 *
 * - Uses Alchemy to scan wallet for NFTs from the specified collection
 * - Interacts with StakingPoolV5 via STAKING_POOL_ABI
 * - Implements approve -> stake (arrays) and unstake
 * - Shows per-stake live reward (local ticking) and unlock countdown
 *
 * Notes:
 *  - Set NEXT_PUBLIC_ALCHEMY_KEY in your .env (Vercel environment too)
 *  - Make sure constants/abis exports STAKING_POOL_ABI and REFERRAL_MANAGER_ABI
 */

/* ---------------------------
   CONFIG (update if needed)
   --------------------------- */
const PAGE_NAME = "Standard";
const NFT_COLLECTION_ADDRESS = "0x106fb804D03D4EA95CaeFA45C3215b57D8E6835D";
const STAKING_CONTRACT_ADDRESS = "0x0901d6c6c2a7e42cfe9319f7d76d073499d402ab";
const REFERRAL_MANAGER_ADDRESS = "0xF6EeC70971B7769Db3a7F3daffCF8F00AfeF47b9";
const TOKEN_CONTRACT_ADDRESS = "0x64487539aa9d61Bdc652A5755bbe30Ee96cFcEb2";

/* ---------------------------
   Small helpers / components
   --------------------------- */
function formatBN(bn: BigNumber | undefined, decimals = 18, fixed = 6) {
  try {
    if (!bn) return "0.0";
    return parseFloat(ethers.utils.formatUnits(bn, decimals)).toFixed(fixed);
  } catch {
    return "0.0";
  }
}

const LiveReward: React.FC<{ stake: any }> = ({ stake }) => {
  const [value, setValue] = useState("0.000000");
  useEffect(() => {
    if (!stake) return;
    let mounted = true;
    const update = () => {
      try {
        const now = Math.floor(Date.now() / 1000);
        const lastClaim = BigNumber.from(stake.lastClaimTime ?? 0).toNumber();
        const rateBN = BigNumber.from(stake.rewardRate ?? 0);
        const rate = parseFloat(ethers.utils.formatUnits(rateBN, 18)); // tokens per second
        const elapsed = Math.max(0, now - lastClaim);
        const amount = elapsed * rate;
        if (mounted) setValue(amount.toFixed(6));
      } catch (err) {
        if (mounted) setValue("0.000000");
      }
    };
    update();
    const id = setInterval(update, 1000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [stake]);
  return <span>{value}</span>;
};

const UnlockTimer: React.FC<{ lockEndTime: any }> = ({ lockEndTime }) => {
  const [ttl, setTtl] = useState<number>(() => {
    try {
      return Math.max(0, BigNumber.from(lockEndTime ?? 0).toNumber() - Math.floor(Date.now() / 1000));
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    let mounted = true;
    const tick = () => {
      try {
        const end = BigNumber.from(lockEndTime ?? 0).toNumber();
        const remain = Math.max(0, end - Math.floor(Date.now() / 1000));
        if (mounted) setTtl(remain);
      } catch {
        if (mounted) setTtl(0);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [lockEndTime]);

  if (!ttl || ttl <= 0) return <span className={styles.ready}>READY</span>;

  const days = Math.floor(ttl / 86400);
  const hours = Math.floor((ttl % 86400) / 3600);
  const minutes = Math.floor((ttl % 3600) / 60);
  const seconds = ttl % 60;

  return (
    <span style={{ fontFamily: "monospace" }}>
      {days > 0 ? `${days}d ` : ""}
      {String(hours).padStart(2, "0")}:{String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
    </span>
  );
};

/* ---------------------------
   NFT Card (Unstaked)
   --------------------------- */
const NftCard: React.FC<{ tokenId: number; onStaked?: () => void }> = ({ tokenId, onStaked }) => {
  const address = useAddress();
  const { contract: nftContract } = useContract(NFT_COLLECTION_ADDRESS, "nft-drop");
  const { contract: stakingContract } = useContract(STAKING_CONTRACT_ADDRESS, STAKING_POOL_ABI);
  const { data: nft, isLoading } = useNFT(nftContract, tokenId);

  const [planIndex, setPlanIndex] = useState<number>(0);
  const [approving, setApproving] = useState(false);
  const [staking, setStaking] = useState(false);

  const approveAll = async () => {
    if (!nftContract || !address) return alert("Wallet or contract not ready");
    try {
      setApproving(true);
      // Using call to contract for generic call compatibility
      await nftContract?.call?.("setApprovalForAll", [STAKING_CONTRACT_ADDRESS, true]);
      alert("Approval successful.");
    } catch (err) {
      console.error(err);
      alert("Approval failed. See console.");
    } finally {
      setApproving(false);
    }
  };

  const stakeOne = async () => {
    if (!stakingContract || !address) return alert("Wallet or contract not ready");
    try {
      setStaking(true);
      // stake expects arrays: (address[] collections, uint256[] tokenIds, uint256 planIndex)
      await stakingContract?.call?.("stake", [[NFT_COLLECTION_ADDRESS], [tokenId], planIndex]);
      alert("Staked successfully.");
      onStaked?.();
    } catch (err: any) {
      console.error(err);
      alert(err?.message ? `Stake failed: ${err.message}` : "Stake failed. See console.");
    } finally {
      setStaking(false);
    }
  };

  if (!nft && isLoading) return <div className={styles.nftBox}>Loading NFT #{tokenId}…</div>;
  if (!nft) return <div className={styles.nftBox}>NFT #{tokenId} not found.</div>;

  return (
    <div className={styles.nftBox}>
      <ThirdwebNftMedia metadata={nft.metadata} className={styles.nftMedia} />
      <h3 className={styles.nftTitle}>{nft.metadata.name ?? `${PAGE_NAME} #${tokenId}`}</h3>
      <p className={styles.nftMeta}>ID: {tokenId}</p>

      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <select value={planIndex} onChange={(e) => setPlanIndex(parseInt(e.target.value, 10))} className={styles.input}>
          <option value={0}>3 months (10% / month – shown as plan 0)</option>
          <option value={1}>6 months (12% / month – shown as plan 1)</option>
          <option value={2}>12 months (15% / month – shown as plan 2)</option>
        </select>

        <button onClick={approveAll} disabled={approving} className={styles.btnOutline}>
          {approving ? "Approving…" : "Approve"}
        </button>

        <button onClick={stakeOne} disabled={staking} className={styles.btnPrimary}>
          {staking ? "Staking…" : "Stake"}
        </button>
      </div>
    </div>
  );
};

/* ---------------------------
   Staked NFT Card (from contract state)
   --------------------------- */
const StakedNftCard: React.FC<{ stake: any; onUnstaked?: () => void }> = ({ stake, onUnstaked }) => {
  const tokenId = BigNumber.from(stake.tokenId ?? 0).toNumber();
  const collection = stake.collection ?? NFT_COLLECTION_ADDRESS;
  const { contract: stakingContract } = useContract(STAKING_CONTRACT_ADDRESS, STAKING_POOL_ABI);

  const [unstaking, setUnstaking] = useState(false);
  const canUnstake = BigNumber.from(stake.lockEndTime ?? 0).toNumber() <= Math.floor(Date.now() / 1000);

  const handleUnstake = async () => {
    if (!stakingContract) return alert("Contract not ready");
    try {
      setUnstaking(true);
      await stakingContract?.call?.("unstake", [[collection], [tokenId]]);
      alert("Unstaked successfully.");
      onUnstaked?.();
    } catch (err) {
      console.error(err);
      alert("Unstake failed. See console.");
    } finally {
      setUnstaking(false);
    }
  };

  return (
    <div className={styles.nftBox}>
      <div className={styles.nftMediaPlaceholder}>#{tokenId}</div>
      <h3 className={styles.nftTitle}>{`${PAGE_NAME} #${tokenId}`}</h3>
      <div style={{ marginTop: 8 }}>
        <div style={{ marginBottom: 6 }}>
          Pending: <b><LiveReward stake={stake} /></b> GKY
        </div>
        <div style={{ marginBottom: 6 }}>
          Unlock: <UnlockTimer lockEndTime={stake.lockEndTime} />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={handleUnstake} disabled={!canUnstake || unstaking} className={canUnstake ? styles.btnPrimary : styles.btnDisabled}>
            {unstaking ? "Unstaking…" : canUnstake ? "Unstake & Claim" : "Locked"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ---------------------------
   MAIN PAGE
   --------------------------- */
const StandardStake: NextPage = () => {
  const address = useAddress();

  // Thirdweb contract refs
  const { contract: stakingContract } = useContract(STAKING_CONTRACT_ADDRESS, STAKING_POOL_ABI);
  const { contract: tokenContract } = useContract(TOKEN_CONTRACT_ADDRESS, "token");

  // token balance (for UI)
  const { data: tokenBalance, isLoading: tokenBalLoading } = useTokenBalance(tokenContract, address);

  // read user full state (vaults + total pending) - only call when ready
  const { data: userFullState, isLoading: userStateLoading, refetch: refetchUserState } = useContractRead(
    stakingContract!,
    "getUserFullState",
    address ? [address] : undefined
  );

  // Owned NFTs via Alchemy scanner
  const [ownedIds, setOwnedIds] = useState<number[]>([]);
  const [scanning, setScanning] = useState(false);
  const ALCHEMY_KEY = process.env.NEXT_PUBLIC_ALCHEMY_KEY || "";

  useEffect(() => {
    if (!address || !ALCHEMY_KEY) {
      setOwnedIds([]);
      return;
    }

    let mounted = true;
    const fetch = async () => {
      setScanning(true);
      try {
        // Alchemy getNFTs endpoint
        const base = `https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}/getNFTs/`;
        const url = `${base}?owner=${address}&contractAddresses[]=${NFT_COLLECTION_ADDRESS}&withMetadata=true`;
        const res = await fetch(url);
        const json = await res.json();
        if (!mounted) return;
        const ids: number[] = (json?.ownedNfts ?? [])
          .map((n: any) => {
            try {
              // tokenId may be hex; parse
              const tid = typeof n.id?.tokenId === "string" && n.id.tokenId.startsWith("0x") ? parseInt(n.id.tokenId, 16) : Number(n.id?.tokenId);
              return Number.isFinite(tid) ? tid : null;
            } catch {
              return null;
            }
          })
          .filter(Boolean);
        setOwnedIds(ids as number[]);
      } catch (err) {
        console.error("Alchemy fetch error:", err);
        setOwnedIds([]);
      } finally {
        setScanning(false);
      }
    };

    fetch();
    return () => {
      mounted = false;
    };
  }, [address, ALCHEMY_KEY]);

  // parse userFullState: [StakeInfo[] stakes, uint256 totalPending]
  const stakes: any[] = useMemo(() => {
    try {
      if (!userFullState) return [];
      // userFullState expected: [stakes[], totalPending]
      const s = userFullState[0] ?? userFullState;
      // If getUserFullState returned an object/tuple, normalize:
      if (Array.isArray(s)) return s;
      return [];
    } catch {
      return [];
    }
  }, [userFullState]);

  const totalPending = useMemo(() => {
    try {
      if (!userFullState) return BigNumber.from(0);
      const pending = userFullState[1] ?? BigNumber.from(0);
      return BigNumber.isBigNumber(pending) ? pending : BigNumber.from(pending);
    } catch {
      return BigNumber.from(0);
    }
  }, [userFullState]);

  // handlers to refresh UI after actions
  const refresh = async () => {
    try {
      await refetchUserState?.();
    } catch {}
  };

  return (
    <div className={styles.container}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <h1 className={styles.h1}>STANDARD STAKING</h1>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <ConnectWallet />
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        {/* Overview */}
        <div className={styles.gridOverview}>
          <div className={styles.card}>
            <div className={styles.cardTitle}>TOTAL STAKED</div>
            <div className={styles.cardValue}>{stakes?.length ?? 0}</div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardTitle}>GIAN BALANCE</div>
            <div className={styles.cardValue}>{tokenBalLoading ? "..." : tokenBalance?.displayValue ?? "0.0"}</div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardTitle}>CLAIMABLE YIELD</div>
            <div className={styles.cardValue}>{formatBN(totalPending, 18, 6)} GKY</div>
          </div>
        </div>
      </div>

      {/* Referral & Actions */}
      <div style={{ marginTop: 18 }}>
        <div className={styles.referralBox}>
          <input id="referral-input" placeholder="Friend's NFT ID or address" className={styles.input} />
          <Web3Button
            contractAddress={REFERRAL_MANAGER_ADDRESS}
            contractAbi={REFERRAL_MANAGER_ABI}
            action={async (c) => {
              const val = (document.getElementById("referral-input") as HTMLInputElement).value;
              if (!val) return alert("Provide a referral NFT ID or address");
              await c.call("register", [val]);
              alert("Registered referral (if valid)");
            }}
          >
            Register
          </Web3Button>

          <Web3Button
            contractAddress={STAKING_CONTRACT_ADDRESS}
            contractAbi={STAKING_POOL_ABI}
            action={async (c) => {
              // claim all: gather collections & tokenIds from stakes state
              const collections = (stakes ?? []).map((s) => s.collection ?? NFT_COLLECTION_ADDRESS);
              const tokenIds = (stakes ?? []).map((s) => BigNumber.from(s.tokenId ?? 0).toNumber());
              if (!collections.length) return alert("No stakes found");
              await c.call("claimReward", [collections, tokenIds]);
              alert("Claim attempted (check tx).");
              await refresh();
            }}
          >
            Claim All Yield
          </Web3Button>
        </div>
      </div>

      {/* Unstaked Section */}
      <section style={{ marginTop: 28 }}>
        <h2 className={styles.h2}>UNSTAKED ASSETS</h2>
        <div className={styles.nftBoxGrid}>
          {address ? (
            scanning ? (
              <p>Scanning wallet for {PAGE_NAME} NFTs…</p>
            ) : ownedIds.length > 0 ? (
              ownedIds.map((id) => <NftCard key={id} tokenId={id} onStaked={refresh} />)
            ) : (
              <p>No {PAGE_NAME} NFTs found in wallet.</p>
            )
          ) : (
            <p>Please connect your wallet to see NFTs.</p>
          )}
        </div>
      </section>

      {/* Staked Section */}
      <section style={{ marginTop: 40 }}>
        <h2 className={styles.h2}>ACTIVE {PAGE_NAME.toUpperCase()} VAULTS</h2>
        <div className={styles.nftBoxGrid}>
          {userStateLoading ? (
            <p>Loading stakes…</p>
          ) : stakes && stakes.length > 0 ? (
            stakes.map((s: any, i: number) => <StakedNftCard key={`${s.collection}-${s.tokenId}-${i}`} stake={s} onUnstaked={refresh} />)
          ) : (
            <p>No assets currently earning yield.</p>
          )}
        </div>
      </section>
    </div>
  );
};

export default StandardStake;
