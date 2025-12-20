// components/StakePage.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  useAddress,
  useContract,
  useContractRead,
  useOwnedNFTs,
  ThirdwebNftMedia,
  useTokenBalance,
  Web3Button,
  ConnectWallet,
} from "@thirdweb-dev/react";
import { ethers } from "ethers";
import { Lock, Unlock, Zap, Shield, Wallet as WalletIcon } from "lucide-react";
import styles from "../styles/Home.module.css";
import Nav from "../components/Nav";
import { STAKING_POOL_ABI } from "../constants/abis";
import {
  STAKING_CONTRACT_ADDRESS,
  TOKEN_CONTRACT_ADDRESS,
  REFERRAL_MANAGER_ADDRESS,
} from "../constants/config";

/**
 * Master StakePage component
 *
 * Props:
 *  - pageName: display name for the vault (e.g. "Standard")
 *  - collectionAddress: NFT collection address for this page (string)
 *
 * This component:
 *  - fetches owned NFTs for collectionAddress using useOwnedNFTs
 *  - fetches staked state via getUserFullState() on the single staking contract
 *  - provides stake, claim, unstake, and referral functionality
 *  - renders GIFs/media via ThirdwebNftMedia
 *  - shows live rewards per stake (calculated locally every second)
 *  - shows unlock countdown for each stake
 *
 * Note: This file assumes your project has @thirdweb-dev/react hooks configured
 * and the constants paths above exist.
 */

type StakePageProps = {
  pageName: string;
  collectionAddress: string;
};

type StakeInfo = {
  collection: string;
  tokenId: ethers.BigNumber;
  stakedAt: ethers.BigNumber;
  lastClaimTime: ethers.BigNumber;
  lockEndTime: ethers.BigNumber;
  rewardRate: ethers.BigNumber; // tokens per second (scaled by 1e18)
  planIndex: ethers.BigNumber;
  owner: string;
};

function LiveReward({ stake }: { stake: StakeInfo }) {
  // compute and update reward locally every second
  const [value, setValue] = useState("0.000000");
  useEffect(() => {
    if (!stake || !stake.lastClaimTime || !stake.rewardRate) {
      setValue("0.000000");
      return;
    }
    let mounted = true;
    const calc = () => {
      const now = Math.floor(Date.now() / 1000);
      const last = stake.lastClaimTime.toNumber();
      const elapsed = Math.max(0, now - last);
      // rewardRate is tokens per second with 18 decimals
      const rate = Number(ethers.utils.formatUnits(stake.rewardRate, 18));
      const r = elapsed * rate;
      if (mounted) setValue(r.toFixed(6));
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [stake]);
  return <span className="font-mono">{value}</span>;
}

function UnlockTimer({ lockEndTime }: { lockEndTime: ethers.BigNumber }) {
  const [text, setText] = useState<string>("Loading...");
  useEffect(() => {
    if (!lockEndTime) {
      setText("N/A");
      return;
    }
    let mounted = true;
    const tick = () => {
      const now = Math.floor(Date.now() / 1000);
      const end = lockEndTime.toNumber();
      const diff = end - now;
      if (diff <= 0) {
        if (mounted) setText("READY");
        return;
      }
      const d = Math.floor(diff / 86400);
      const h = Math.floor((diff % 86400) / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      if (mounted) setText(`${d}d ${h}h ${m}m ${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [lockEndTime]);
  const locked = text !== "READY";
  return (
    <div className="flex items-center gap-2">
      {locked ? <Lock size={14} /> : <Unlock size={14} />}
      <span className={`text-sm font-semibold ${locked ? "text-amber-400" : "text-emerald-400"}`}>{text}</span>
    </div>
  );
}

/** Simple NFT card for unstaked NFTs */
function NftCard({
  token,
  collectionAddress,
  stakingAddress,
  stakingContract,
  onStaked,
  isBlacklisted,
  planIndex,
}: {
  token: any;
  collectionAddress: string;
  stakingAddress: string;
  stakingContract: any;
  onStaked?: (tokenId: number) => void;
  isBlacklisted?: boolean;
  planIndex?: number;
}) {
  const address = useAddress();

  return (
    <div className={styles.nftBox} style={{ borderRadius: 16 }}>
      <div style={{ height: 220, overflow: "hidden", borderRadius: 12 }}>
        <ThirdwebNftMedia metadata={token.metadata} className={styles.nftMedia} />
      </div>
      <div style={{ padding: 14 }}>
        <div className="flex justify-between items-center mb-2">
          <div>
            <div className="font-bold text-lg">{token.metadata.name || `#${token.metadata.id}`}</div>
            <div className="text-xs text-gray-400">ID: {token.metadata.id}</div>
          </div>
          <div className="text-xs text-gray-500">Tier</div>
        </div>

        {isBlacklisted && (
          <div className="bg-red-800 text-red-300 rounded-md px-3 py-2 mb-3 text-sm">
            🚫 Blacklisted ID
          </div>
        )}

        <div className="flex gap-3">
          <Web3Button
            contractAddress={stakingAddress}
            contractAbi={STAKING_POOL_ABI}
            onError={(e) => console.error("stake error", e)}
            action={async (c) => {
              // ensure approval first via the stakingContract wrapper isn't available for NFT collection here,
              // but most NFT wrappers have setApprovalForAll. We'll call contract directly from thirdweb's "c".
              // Approve via the NFT collection would normally be done on the front-end via the collection contract.
              // Here we just call stake (assuming user already approved or the collection uses ERC721 approvals).
              await c.call("stake", [[collectionAddress], [Number(token.metadata.id)], planIndex || 0]);
              onStaked && onStaked(Number(token.metadata.id));
            }}
            className={`!w-full !py-3 !rounded-md ${isBlacklisted ? "!bg-slate-700 !text-slate-400 cursor-not-allowed" : "!bg-indigo-600 !text-white"}`}
            isDisabled={!!isBlacklisted}
          >
            Stake
          </Web3Button>
        </div>
      </div>
    </div>
  );
}

/** Staked token card */
function StakedNftCard({
  stake,
  stakingAddress,
  collectionAddress,
}: {
  stake: StakeInfo;
  stakingAddress: string;
  collectionAddress: string;
}) {
  const tokenId = stake.tokenId.toNumber();
  const [nftMeta, setNftMeta] = useState<any>(null);
  const { contract: nftContract } = useContract(collectionAddress, "nft-collection");
  const address = useAddress();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!nftContract) return;
        const meta = await nftContract.get(Number(tokenId));
        if (mounted) setNftMeta(meta);
      } catch (e) {
        // ignore, metadata might still be in stake data
      }
    })();
    return () => {
      mounted = false;
    };
  }, [nftContract, tokenId]);

  return (
    <div className={styles.nftBox} style={{ borderRadius: 16, position: "relative" }}>
      <div style={{ position: "absolute", top: 12, right: 12 }}>
        <div className="bg-emerald-900/20 px-3 py-1 rounded-md text-emerald-300 text-xs flex items-center gap-2">
          <Zap size={14} /> EARNING
        </div>
      </div>

      <div style={{ padding: 16 }}>
        <div className="mb-3">
          <div className="font-bold text-xl">#{tokenId}</div>
          <div className="text-xs text-gray-400">Plan: {stake.planIndex.toNumber() === 0 ? "3 month" : stake.planIndex.toNumber() === 1 ? "6 month" : "12 month"}</div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div className="text-xs text-gray-400 mb-2">Rewards</div>
          <div className="flex items-center justify-between">
            <div className="text-lg font-mono text-emerald-300"><LiveReward stake={stake} /></div>
            <div style={{ textAlign: "right" }}>
              <div className="text-xs text-gray-400">Unlock in</div>
              <UnlockTimer lockEndTime={stake.lockEndTime} />
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <Web3Button
            contractAddress={STAKING_CONTRACT_ADDRESS}
            contractAbi={STAKING_POOL_ABI}
            action={(c) => c.call("unstake", [[collectionAddress], [tokenId]])}
            className="!w-full !py-3 !rounded-md !bg-red-600 !text-white"
          >
            Unstake & Claim
          </Web3Button>
        </div>
      </div>
    </div>
  );
}

export default function StakePage({ pageName, collectionAddress }: StakePageProps) {
  const address = useAddress();
  const { contract: stakingContract, isLoading: stakingLoading } = useContract(STAKING_CONTRACT_ADDRESS, STAKING_POOL_ABI);

  // Owned NFTs for THIS COLLECTION and connected address
  const { data: ownedNfts, isLoading: loadingOwnedNfts } = useOwnedNFTs(collectionAddress as any, address);
  // token balance (reward token)
  const { contract: tokenContract } = useContract(TOKEN_CONTRACT_ADDRESS, "token");
  const { data: tokenBalance } = useTokenBalance(TOKEN_CONTRACT_ADDRESS as any, address);

  // getUserFullState(address) -> (StakeInfo[], totalPending)
  const { data: userFullState, isLoading: loadingUserState } = useContractRead(
    stakingContract,
    "getUserFullState",
    [address]
  );

  // isBlacklisted mapping read helper (collection, tokenId)
  const [blacklistCache, setBlacklistCache] = useState<Record<string, boolean>>({});
  useEffect(() => {
    // prefetch blacklist for owned tokens
    (async () => {
      if (!stakingContract || !ownedNfts || ownedNfts.length === 0) return;
      const newCache: Record<string, boolean> = { ...blacklistCache };
      await Promise.all(
        ownedNfts.map(async (nft: any) => {
          try {
            const tokenId = Number(nft.metadata.id);
            const key = `${collectionAddress}-${tokenId}`;
            if (newCache[key] === undefined) {
              const result = await stakingContract.call("isBlacklisted", [collectionAddress, tokenId]);
              newCache[key] = !!result;
            }
          } catch (e) {
            // ignore
          }
        })
      );
      setBlacklistCache(newCache);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stakingContract, ownedNfts]);

  // parse staked stakes
  const stakes: StakeInfo[] = useMemo(() => {
    if (!userFullState || !userFullState[0]) return [];
    return userFullState[0] as StakeInfo[];
  }, [userFullState]);

  // arrays for claim/unstake operations
  const stakedCollections = useMemo(() => stakes.map((s) => s.collection), [stakes]);
  const stakedTokenIds = useMemo(() => stakes.map((s) => s.tokenId.toNumber()), [stakes]);

  // total pending (contract-side) - but we display local per-token too
  const totalPending = useMemo(() => {
    if (!userFullState || !userFullState[1]) return "0.00";
    try {
      return Number(ethers.utils.formatUnits(userFullState[1], 18)).toFixed(6);
    } catch {
      return "0.00";
    }
  }, [userFullState]);

  // referral input state (controlled)
  const [referralId, setReferralId] = useState("");

  const isLoading = loadingOwnedNfts || loadingUserState || stakingLoading;

  return (
    <div className={styles.container}>
      <Nav />

      <div className={styles.stakeContainer}>
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-extrabold">{pageName} Staking</h1>
            <p className="text-sm text-gray-400">Fixed yield protocol V5 - Earn GIANKY</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-300 font-mono bg-slate-800 px-3 py-1 rounded">{address ? `${address.slice(0, 6)}...${address.slice(-4)}` : <ConnectWallet />}</div>
          </div>
        </div>

        {/* Stats */}
        <div className={styles.tokenGrid}>
          <div className={styles.tokenItem}>
            <h3 className={styles.tokenLabel}><Shield size={16} /> TOTAL STAKED</h3>
            <p className={styles.tokenValue}>{stakes.length}</p>
          </div>
          <div className={styles.tokenItem}>
            <h3 className={styles.tokenLabel}><WalletIcon size={16} /> GIAN BALANCE</h3>
            <p className={styles.tokenValue}>{tokenBalance ? `${tokenBalance.displayValue} ${tokenBalance.symbol}` : "0.0"}</p>
          </div>
          <div className={styles.tokenItem}>
            <h3 className={styles.tokenLabel}><Zap size={16} /> CLAIMABLE YIELD</h3>
            <p className={styles.tokenValue}>{totalPending} GKY</p>
          </div>
        </div>

        {/* Referral + Claim All */}
        <div className="my-6 bg-slate-900/40 p-4 rounded-lg border border-slate-800 flex gap-4 items-center">
          <input
            className="flex-1 bg-transparent border border-slate-800 px-4 py-2 rounded-md outline-none text-white"
            placeholder="Friend's NFT ID or Address"
            value={referralId}
            onChange={(e) => setReferralId(e.target.value)}
          />
          <Web3Button
            contractAddress={REFERRAL_MANAGER_ADDRESS}
            contractAbi={[] as any} // you can put REFERRAL_MANAGER_ABI here if available
            action={async (c) => {
              // registered signature expects uint256 or address; pass what user typed
              // ensure the contract ABI includes register function
              await c.call("register", [referralId]);
            }}
            className="bg-pink-600 text-white px-4 py-2 rounded-md"
          >
            Register
          </Web3Button>

          <Web3Button
            contractAddress={STAKING_CONTRACT_ADDRESS}
            contractAbi={STAKING_POOL_ABI as any}
            action={(c) => c.call("claimReward", [stakedCollections, stakedTokenIds])}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md"
            isDisabled={stakes.length === 0}
          >
            Claim All Yield
          </Web3Button>
        </div>

        {/* Unstaked Assets */}
        <h2 className={styles.h2}>Your Unstaked {pageName} NFTs</h2>
        <div className={styles.nftBoxGrid}>
          {isLoading && <div className="text-gray-400">Scanning wallet...</div>}
          {!isLoading && (!ownedNfts || ownedNfts.length === 0) && <div className="text-gray-500">No {pageName} NFTs found in wallet.</div>}
          {!isLoading && ownedNfts && ownedNfts.length > 0 && (
            <>
              {ownedNfts.map((nft: any) => {
                const id = Number(nft.metadata.id || nft.id);
                const key = `${collectionAddress}-${id}`;
                const black = !!blacklistCache[key];
                return (
                  <NftCard
                    key={id}
                    token={nft}
                    collectionAddress={collectionAddress}
                    stakingAddress={STAKING_CONTRACT_ADDRESS}
                    stakingContract={stakingContract}
                    isBlacklisted={black}
                    planIndex={0}
                    onStaked={() => {
                      // optional: trigger a refresh by reading getUserFullState (thirdweb hook will auto revalidate)
                    }}
                  />
                );
              })}
            </>
          )}
        </div>

        {/* Staked */}
        <h2 className={styles.h2}>Your Staked {pageName} NFTs</h2>
        <div className={styles.nftBoxGrid}>
          {isLoading && <div className="text-gray-400">Loading staked assets...</div>}
          {!isLoading && stakes.length === 0 && <div className="text-gray-500">No NFTs staked.</div>}
          {!isLoading && stakes.length > 0 && (
            stakes.map((s: any) => {
              // ensure s is StakeInfo typed
              const stake: StakeInfo = s as StakeInfo;
              return (
                <StakedNftCard key={stake.tokenId.toString()} stake={stake} stakingAddress={STAKING_CONTRACT_ADDRESS} collectionAddress={collectionAddress} />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
