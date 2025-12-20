// pages/stake/starter.tsx
import {
  ConnectWallet,
  ThirdwebNftMedia,
  useAddress,
  useContract,
  useContractRead,
  useNFTs,
  useTokenBalance,
  Web3Button,
} from "@thirdweb-dev/react";
import { ethers } from "ethers";
import type { NextPage } from "next";
import { useEffect, useState, useMemo } from "react";
import { Wallet, Lock, Unlock, Zap, ShieldCheck } from "lucide-react";
import { STAKING_POOL_ABI, REFERRAL_MANAGER_ABI } from "../constants/abis";
import {
  STAKING_CONTRACT_ADDRESS,
  NFT_DROP_ADDRESS,
  TOKEN_CONTRACT_ADDRESS,
  REFERRAL_MANAGER_ADDRESS,
} from "../constants/config";

/**
 * StarterStake.tsx
 * Improved and robust rewrite of the Starter staking page.
 *
 * Notes:
 *  - This keeps your Thirdweb hooks (useContract, useNFTs, useContractRead).
 *  - Make sure STAKING_POOL_ABI and REFERRAL_MANAGER_ABI are exported correctly from constants/abis.
 *  - Make sure addresses in constants/config are correct.
 */

/* ---------------------------
   Helper component: LiveReward
   Computes (elapsedSeconds * rewardRateWei) and formats to 6 decimals
   Uses BigInt arithmetic for determinism (no floats).
   --------------------------- */
const LiveReward = ({ stake }: { stake: any }) => {
  const [reward, setReward] = useState("0.000000");

  useEffect(() => {
    if (!stake) return;
    // obtain rewardRate as BigInt (wei-per-second)
    const getRateBigInt = (): bigint => {
      try {
        // stake.rewardRate could be BigNumber (ethers) or numeric string
        if (stake.rewardRate?.toBigInt) return stake.rewardRate.toBigInt();
        if (stake.rewardRate?._hex) return BigInt(stake.rewardRate._hex);
        return BigInt(String(stake.rewardRate || "0"));
      } catch {
        return BigInt(0);
      }
    };

    const rewardRateWei = getRateBigInt();
    const tick = () => {
      // lastClaimTime may be BigNumber
      const lastClaim =
        stake.lastClaimTime?.toNumber?.() ?? Number(stake.lastClaimTime ?? 0);
      const now = Math.floor(Date.now() / 1000);
      const elapsed = now > lastClaim ? BigInt(now - lastClaim) : BigInt(0);
      // valueInWei = rateWei * elapsed
      const valueInWei = rewardRateWei * elapsed;
      // format to 6 decimals:
      // integer = valueInWei / 1e18
      // fractional6 = (valueInWei % 1e18) / 1e12 (to get 6 decimals)
      const WEI = BigInt("1000000000000000000"); // 1e18
      const MUL6 = BigInt("1000000"); // 1e6
      const integerPart = valueInWei / WEI;
      const fractionalPart = (valueInWei % WEI) / (WEI / MUL6);
      const fracStr = fractionalPart.toString().padStart(6, "0");
      setReward(`${integerPart.toString()}.${fracStr}`);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [stake]);

  return <span>{reward}</span>;
};

/* ---------------------------
   Helper component: UnlockTimer
   Shows countdown and READY state.
   --------------------------- */
const UnlockTimer = ({ endTime }: { endTime: number }) => {
  const [timeLeft, setTimeLeft] = useState("");
  const [isLocked, setIsLocked] = useState(true);

  useEffect(() => {
    if (!endTime) {
      setTimeLeft("UNKNOWN");
      setIsLocked(true);
      return;
    }

    const tick = () => {
      const now = Math.floor(Date.now() / 1000);
      const diff = endTime - now;
      if (diff <= 0) {
        setTimeLeft("UNLOCKED");
        setIsLocked(false);
        return;
      }
      setIsLocked(true);
      const d = Math.floor(diff / 86400);
      const h = Math.floor((diff % 86400) / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = Math.floor(diff % 60);
      setTimeLeft(`${d}d ${h}h ${m}m ${s}s`);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endTime]);

  return (
    <div className={`font-mono text-xs font-bold ${isLocked ? "text-amber-500" : "text-green-400"}`}>
      {isLocked ? (
        <span className="flex items-center gap-1">
          <Lock size={12} /> {timeLeft}
        </span>
      ) : (
        <span className="flex items-center gap-1">
          <Unlock size={12} /> READY
        </span>
      )}
    </div>
  );
};

/* ---------------------------
   StarterStake main page
   --------------------------- */
const PAGE_NAME = "Starter";

const StarterStake: NextPage = () => {
  const address = useAddress();

  // Contracts (guarded)
  const { contract: stakingContract } = useContract(STAKING_CONTRACT_ADDRESS, STAKING_POOL_ABI);
  // NFT drop may be a Thirdweb drop; keep "nft-drop" if your contract is a drop
  const { contract: nftContract } = useContract(NFT_DROP_ADDRESS, "nft-drop");
  const { contract: tokenContract } = useContract(TOKEN_CONTRACT_ADDRESS, "token");

  // Data hooks
  const { data: ownedNfts, isLoading: loadingNfts } = useNFTs(nftContract);
  const { data: tokenBalance } = useTokenBalance(tokenContract, address);
  // getUserFullState(address) -> returns (StakeInfo[] stakes, uint256 totalPending)
  const { data: userFullState, isLoading: loadingStakes } = useContractRead(
    stakingContract,
    "getUserFullState",
    [address]
  );

  // extract stakes array and totalPending safely
  const stakedNFTs = useMemo(() => {
    try {
      if (!userFullState) return [];
      // userFullState expected: [stakesArray, totalPending]
      // stakesArray elements are objects from solidity -> BigNumber fields
      const arr = userFullState[0] ?? [];
      return arr;
    } catch {
      return [];
    }
  }, [userFullState]);

  const totalPendingDisplay = useMemo(() => {
    try {
      if (!userFullState || !userFullState[1]) return "0.0000";
      const pending = userFullState[1];
      // pending might be BigNumber
      const pendingStr = typeof pending?.toString === "function" ? pending.toString() : String(pending);
      // use ethers to format (assuming 18 decimals)
      return Number(ethers.utils.formatEther(pendingStr)).toFixed(4);
    } catch {
      return "0.0000";
    }
  }, [userFullState]);

  // selected plan per token (UI only)
  const [selectedPlan, setSelectedPlan] = useState<{ [id: string]: number }>({});
  const [refInput, setRefInput] = useState("");

  const walletNfts = useMemo(() => {
    if (!ownedNfts || !address) return [];
    // thirdweb NFT shape: items in ownedNfts where owner === address (you previously filtered)
    return ownedNfts?.filter((nft: any) => {
      const owner = nft?.owner ?? nft?.ownerOf ?? address;
      return (owner || "").toLowerCase() === (address || "").toLowerCase();
    }) ?? [];
  }, [ownedNfts, address]);

  /* ---------- UI ---------- */
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-4 md:p-8">
      {/* HEADER */}
      <header className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Zap className="text-yellow-400 fill-yellow-400" />
            Alpha Kong {PAGE_NAME}
          </h1>
          <p className="text-slate-400 mt-1">Fixed Yield Protocol V5 • Earn GIANKY Every Second</p>
        </div>
        <div className="flex items-center gap-4">
          {address && (
            <div className="hidden lg:flex items-center gap-2 bg-slate-800 px-4 py-2 rounded-lg border border-slate-700">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-mono">{address.slice(0, 6)}...{address.slice(-4)}</span>
            </div>
          )}
          <ConnectWallet theme="dark" className="!bg-indigo-600 !hover:bg-indigo-700 !text-white !font-bold !rounded-lg" />
        </div>
      </header>

      <main className="max-w-6xl mx-auto space-y-12">
        {/* STATS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 shadow-lg">
            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Staked</h3>
            <p className="text-3xl font-bold text-white mt-2">{stakedNFTs.length}</p>
          </div>
          <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 shadow-lg">
            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">GIAN Balance</h3>
            <p className="text-3xl font-bold text-white mt-2">
              {tokenBalance?.displayValue ? String(tokenBalance.displayValue).slice(0, 8) : "0.00"} <span className="text-sm text-slate-500">GIAN</span>
            </p>
          </div>
          <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 shadow-lg">
            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">Claimable Rewards</h3>
            <p className="text-3xl font-bold text-green-400 mt-2">{totalPendingDisplay} <span className="text-sm text-slate-500 uppercase">GKY</span></p>
          </div>
        </div>

        {/* ACTION BAR */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-800/30 p-6 rounded-xl border border-slate-700/50 backdrop-blur-sm">
          <div className="flex-1 w-full max-w-lg flex flex-col gap-2">
            <label className="text-xs text-slate-500 font-bold uppercase tracking-tighter ml-1">Network Referral</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Friend's NFT ID or Address"
                value={refInput}
                onChange={(e) => setRefInput(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-2 flex-1 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <Web3Button
                contractAddress={REFERRAL_MANAGER_ADDRESS}
                contractAbi={REFERRAL_MANAGER_ABI}
                action={async (c) => {
                  if (!refInput) return alert("Enter referrer NFT id or address");
                  return c.call("register", [refInput]);
                }}
                className="!bg-slate-700 !text-white !h-auto !py-2 !px-4"
              >
                Register
              </Web3Button>
            </div>
          </div>

          <div className="w-full md:w-auto self-end">
            <Web3Button
              contractAddress={STAKING_CONTRACT_ADDRESS}
              contractAbi={STAKING_POOL_ABI}
              action={async (c) => {
                if (!stakedNFTs || stakedNFTs.length === 0) return;
                // build arrays: collections[], tokenIds[]
                const collections = stakedNFTs.map((s: any) => s.collection ?? NFT_DROP_ADDRESS);
                const ids = stakedNFTs.map((s: any) => s.tokenId);
                return c.call("claimReward", [collections, ids]);
              }}
              isDisabled={!stakedNFTs || stakedNFTs.length === 0}
              className="!bg-green-600 !hover:bg-green-700 !text-white !w-full md:!w-64 !shadow-xl !shadow-green-900/20"
            >
              Claim All Rewards
            </Web3Button>
          </div>
        </div>

        {/* WALLET (UNSTAKED) */}
        <section>
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-indigo-400">
            <Wallet size={20} /> Your Wallet (Unstaked)
          </h2>

          {loadingNfts ? (
            <div className="text-slate-500 flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /> Scanning wallet...
            </div>
          ) : walletNfts?.length === 0 ? (
            <div className="p-12 text-center bg-slate-800/20 rounded-2xl border border-dashed border-slate-700 text-slate-500">
              No NFTs found in wallet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {walletNfts.map((nft: any) => {
                const id = nft.metadata.id ?? nft.metadata?.id ?? nft?.id ?? (nft.tokenId ? String(nft.tokenId) : "unknown");
                const selected = selectedPlan[id] ?? 0;
                return (
                  <div key={id} className="bg-slate-800 rounded-2xl overflow-hidden border border-slate-700 hover:border-indigo-500/50 transition-all group">
                    <div className="h-56 bg-slate-900 relative overflow-hidden">
                      <ThirdwebNftMedia metadata={nft.metadata} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute top-2 right-2 bg-slate-900/80 backdrop-blur-md px-2 py-1 rounded text-[10px] font-mono border border-white/10">#{id}</div>
                    </div>
                    <div className="p-5 space-y-4">
                      <h3 className="font-bold text-lg text-white truncate">{nft.metadata.name ?? `Token #${id}`}</h3>

                      <div className="space-y-3">
                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest ml-1">Select Lock Period</label>
                        <div className="grid grid-cols-3 gap-2">
                          {[0, 1, 2].map((idx) => (
                            <button
                              key={idx}
                              onClick={() => setSelectedPlan((p) => ({ ...p, [id]: idx }))}
                              className={`text-[10px] py-2 rounded-lg border transition-all font-bold ${
                                selected === idx
                                  ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/30"
                                  : "bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500"
                              }`}
                            >
                              {idx === 0 ? "3 MO" : idx === 1 ? "6 MO" : "12 MO"}
                            </button>
                          ))}
                        </div>
                        <div className="text-center text-[10px] font-bold text-green-400/80 bg-green-500/5 py-1 rounded border border-green-500/10">
                          YIELD: {selected === 0 ? "10%" : selected === 1 ? "12%" : "15%"} MONTHLY
                        </div>
                      </div>

                      <Web3Button
                        contractAddress={STAKING_CONTRACT_ADDRESS}
                        contractAbi={STAKING_POOL_ABI}
                        action={async (c) => {
                          // Approve if needed using nftContract helper
                          try {
                            if (!nftContract) throw new Error("NFT contract not ready");
                            const isApproved = await nftContract?.isApproved(address, STAKING_CONTRACT_ADDRESS);
                            if (!isApproved) {
                              await nftContract?.setApprovalForAll(STAKING_CONTRACT_ADDRESS, true);
                            }
                            // Stake call needs arrays of collections and tokenIds (matching contract)
                            return c.call("stake", [[NFT_DROP_ADDRESS], [id], selected]);
                          } catch (err) {
                            console.error("Approve & Stake error:", err);
                            throw err;
                          }
                        }}
                        className="!w-full !bg-white !hover:bg-slate-100 !text-slate-900 !font-bold !rounded-xl !py-2.5 !text-sm"
                      >
                        Approve & Stake
                      </Web3Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* STAKED SECTION */}
        <section>
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-green-400">
            <ShieldCheck size={20} /> Staked Assets
          </h2>

          {loadingStakes ? (
            <div className="text-slate-500 flex items-center gap-2 font-mono text-sm">
              <div className="w-3 h-3 border-2 border-green-500 border-t-transparent rounded-full animate-spin" /> FETCHING ACTIVE STAKES...
            </div>
          ) : stakedNFTs.length === 0 ? (
            <div className="p-12 text-center bg-slate-800/10 rounded-2xl border border-dashed border-slate-700 text-slate-600 italic">
              No active stakes found for this tier.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {stakedNFTs.map((stake: any) => {
                const tokenId = stake.tokenId?.toString?.() ?? String(stake.tokenId ?? "0");
                const planIndex = stake.planIndex?.toString?.() ?? String(stake.planIndex ?? "0");
                const lockEndTime = Number(stake.lockEndTime?.toNumber?.() ?? stake.lockEndTime ?? 0);
                const isLockedNow = Math.floor(Date.now() / 1000) < lockEndTime;

                return (
                  <div key={tokenId} className="bg-slate-800 rounded-2xl overflow-hidden border border-slate-700 relative shadow-2xl">
                    <div className="absolute top-3 right-3 bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 backdrop-blur-md z-10">
                      <Zap size={10} fill="currentColor" /> EARNING
                    </div>

                    <div className="p-5 pt-8 space-y-5">
                      <div>
                        <h3 className="font-bold text-lg text-white">Alpha Kong #{tokenId}</h3>
                        <p className="text-[10px] font-mono text-slate-500 mt-1 uppercase">Plan: {planIndex === "0" ? "3 Months" : planIndex === "1" ? "6 Months" : "12 Months"}</p>
                      </div>

                      <div className="bg-slate-900/80 rounded-xl p-4 space-y-4 border border-slate-700/50 shadow-inner">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Pending</span>
                          <span className="flex items-center gap-1 font-mono text-sm text-indigo-400 font-bold">
                            <LiveReward stake={stake} /> <span className="text-[10px] text-slate-600">GKY</span>
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Unlock In</span>
                          <UnlockTimer endTime={lockEndTime} />
                        </div>
                      </div>

                      <Web3Button
                        contractAddress={STAKING_CONTRACT_ADDRESS}
                        contractAbi={STAKING_POOL_ABI}
                        action={async (c) => {
                          // unstake signature expects arrays for collections & tokenIds
                          return c.call("unstake", [[NFT_DROP_ADDRESS], [tokenId]]);
                        }}
                        isDisabled={isLockedNow}
                        className={`!w-full !font-bold !rounded-xl !py-2.5 !text-sm !transition-all ${
                          isLockedNow ? "!bg-slate-700 !text-slate-500 !border !border-slate-600" : "!bg-red-600 !hover:bg-red-700 !text-white !shadow-lg !shadow-red-900/20"
                        }`}
                      >
                        Unstake & Claim
                      </Web3Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <footer className="max-w-6xl mx-auto mt-24 pb-12 text-center">
        <p className="text-slate-600 text-[10px] uppercase font-bold tracking-[0.2em]">GIANKY ECOSYSTEM • SECURED BY POLYGON</p>
      </footer>
    </div>
  );
};

export default StarterStake;
