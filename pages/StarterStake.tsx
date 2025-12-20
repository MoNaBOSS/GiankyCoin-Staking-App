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
import { BigNumber, ethers } from "ethers";
import type { NextPage } from "next";
import { useEffect, useState, useMemo } from "react";
import { 
  Wallet, 
  Lock, 
  Unlock, 
  Zap, 
  ShieldCheck, 
  Clock, 
  TrendingUp,
  ArrowUpRight,
  UserPlus
} from "lucide-react";
import { STAKING_POOL_ABI, REFERRAL_MANAGER_ABI } from "../constants/abis";
import { 
  STAKING_CONTRACT_ADDRESS, 
  NFT_DROP_ADDRESS, 
  TOKEN_CONTRACT_ADDRESS, 
  REFERRAL_MANAGER_ADDRESS 
} from "../constants/config";
import Nav from "../components/Nav";

const PAGE_NAME = "Starter";

// --- SUB-COMPONENTS ---

const LiveReward = ({ stake }: { stake: any }) => {
  const [reward, setReward] = useState("0.000000");
  useEffect(() => {
    const update = () => {
      const now = Math.floor(Date.now() / 1000);
      const lastClaim = stake.lastClaimTime.toNumber();
      const elapsed = now > lastClaim ? now - lastClaim : 0;
      const rate = parseFloat(ethers.utils.formatEther(stake.rewardRate));
      setReward((elapsed * rate).toFixed(6));
    };
    const timer = setInterval(update, 1000);
    update();
    return () => clearInterval(timer);
  }, [stake]);
  return <span className="font-mono">{reward}</span>;
};

const UnlockTimer = ({ endTime }: { endTime: number }) => {
  const [timeLeft, setTimeLeft] = useState("");
  const [isLocked, setIsLocked] = useState(true);

  useEffect(() => {
    const tick = () => {
      const now = Math.floor(Date.now() / 1000);
      const diff = endTime - now;
      if (diff <= 0) {
        setTimeLeft("READY TO UNSTAKE");
        setIsLocked(false);
        return;
      }
      const d = Math.floor(diff / 86400);
      const h = Math.floor((diff % 86400) / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = Math.floor(diff % 60);
      setTimeLeft(`${d}d ${h}h ${m}m ${s}s`);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [endTime]);

  return (
    <div className={`flex items-center gap-1.5 font-mono text-[10px] font-black tracking-wider ${isLocked ? "text-amber-500" : "text-emerald-400"}`}>
      {isLocked ? <Lock size={12} /> : <Unlock size={12} />}
      {timeLeft}
    </div>
  );
};

// --- MAIN PAGE ---

const StarterStake: NextPage = () => {
  const address = useAddress();
  
  // Contracts
  const { contract: stakingContract } = useContract(STAKING_CONTRACT_ADDRESS, STAKING_POOL_ABI);
  const { contract: nftContract } = useContract(NFT_DROP_ADDRESS, "nft-drop");
  const { contract: tokenContract } = useContract(TOKEN_CONTRACT_ADDRESS, "token");

  // State Fetching
  const { data: ownedNfts, isLoading: loadingNfts } = useNFTs(nftContract);
  const { data: tokenBalance } = useTokenBalance(tokenContract, address);
  const { data: userFullState, isLoading: loadingStakes } = useContractRead(stakingContract, "getUserFullState", [address]);

  const stakedNFTs = useMemo(() => (userFullState ? userFullState[0] : []) as any[], [userFullState]);
  const [selectedPlan, setSelectedPlan] = useState<{[id: string]: number}>({});
  const [refInput, setRefInput] = useState("");

  const walletNfts = ownedNfts?.filter(nft => nft.owner === address);

  const totalPendingDisplay = useMemo(() => {
    if (!userFullState || !userFullState[1]) return "0.0000";
    return parseFloat(ethers.utils.formatEther(userFullState[1])).toFixed(4);
  }, [userFullState]);

  return (
    <div className="min-h-screen bg-[#020203] text-slate-200 font-sans antialiased overflow-x-hidden">
      {/* Decorative Gradients */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-600/5 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10">
        <Nav />
        
        <main className="max-w-7xl mx-auto px-6 pt-12 pb-24">
          
          {/* TOP HERO SECTION */}
          <section className="flex flex-col lg:flex-row justify-between items-end gap-8 mb-16">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1 rounded-full mb-6 backdrop-blur-md">
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">V5 Smart Vault Active</span>
              </div>
              <h1 className="text-6xl md:text-7xl font-black tracking-tighter italic text-white uppercase leading-[0.9]">
                {PAGE_NAME} <span className="text-indigo-500 block">PROTOCOL</span>
              </h1>
              <p className="text-slate-500 mt-6 text-base font-medium max-w-md leading-relaxed">
                Stake your Alpha Kong assets to generate GIANKY rewards with fixed monthly yields up to 15%.
              </p>
            </div>
            
            <div className="flex flex-col items-end gap-4 w-full lg:w-auto">
               <ConnectWallet 
                 theme="dark" 
                 className="!bg-white !text-black !font-black !rounded-xl !py-4 !px-12 !shadow-2xl hover:!scale-[1.02] !transition-transform !border-none" 
               />
               {address && (
                 <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-xl backdrop-blur-md">
                   <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.6)]"/>
                   <span className="text-[10px] font-black font-mono text-slate-400 tracking-wider">
                     {address.slice(0,6)}...{address.slice(-4)}
                   </span>
                 </div>
               )}
            </div>
          </section>

          {/* KPI METRICS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {[
              { label: "Staked Assets", value: stakedNFTs.length, icon: ShieldCheck, sub: "Items in Vault" },
              { label: "GIAN Balance", value: tokenBalance?.displayValue.slice(0, 6) || "0.00", icon: Wallet, sub: "Liquid Balance", unit: "GIAN" },
              { label: "Accrued Rewards", value: totalPendingDisplay, icon: TrendingUp, sub: "Pending Claim", unit: "GKY", color: "text-emerald-400" }
            ].map((stat, i) => (
              <div key={i} className="bg-white/[0.03] p-8 rounded-[32px] border border-white/10 backdrop-blur-xl relative overflow-hidden group hover:border-white/20 transition-all shadow-2xl">
                <stat.icon className="absolute -bottom-4 -right-4 w-24 h-24 text-white/5 group-hover:text-white/10 transition-colors" />
                <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 mb-1">
                   <stat.icon size={12} className="text-indigo-500" /> {stat.label}
                </h3>
                <div className="flex items-baseline gap-2 mt-4">
                  <p className={`text-5xl font-black tracking-tighter italic ${stat.color || "text-white"}`}>
                    {stat.value}
                  </p>
                  {stat.unit && <span className="text-xs font-mono opacity-30 font-bold uppercase">{stat.unit}</span>}
                </div>
                <p className="text-slate-600 text-[10px] font-bold uppercase tracking-widest mt-2">{stat.sub}</p>
              </div>
            ))}
          </div>

          {/* ACTION DASHBOARD */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-24">
             {/* Referral Box */}
             <div className="lg:col-span-7 bg-white/[0.02] p-8 rounded-[40px] border border-white/5 backdrop-blur-xl flex flex-col md:flex-row items-center gap-8 group">
                <div className="p-4 bg-indigo-500/10 rounded-3xl border border-indigo-500/10 group-hover:scale-110 transition-transform">
                  <UserPlus className="text-indigo-500" size={32} />
                </div>
                <div className="flex-1 w-full space-y-4">
                  <div>
                    <h4 className="text-white font-black text-lg italic uppercase tracking-tight">Referral Network</h4>
                    <p className="text-slate-500 text-[10px] uppercase font-bold tracking-[0.2em]">Scale your yield with the community</p>
                  </div>
                  <div className="flex gap-2 p-1.5 bg-black/40 rounded-2xl border border-white/5">
                    <input 
                      type="text" 
                      placeholder="ENTER REFERRAL ID" 
                      value={refInput}
                      onChange={e => setRefInput(e.target.value)}
                      className="bg-transparent text-white px-5 py-3 flex-1 focus:outline-none font-bold text-xs placeholder:text-slate-800 tracking-widest"
                    />
                    <Web3Button
                      contractAddress={REFERRAL_MANAGER_ADDRESS}
                      contractAbi={REFERRAL_MANAGER_ABI}
                      action={c => c.call("register", [refInput])}
                      className="!bg-indigo-600 !text-white !h-auto !py-3 !px-8 !rounded-xl !font-black !uppercase !text-[10px] !border-none !shadow-xl !shadow-indigo-900/20"
                    >Register</Web3Button>
                  </div>
                </div>
             </div>
             
             {/* Global Claim Box */}
             <div className="lg:col-span-5 bg-emerald-500/5 p-8 rounded-[40px] border border-emerald-500/10 backdrop-blur-xl flex flex-col justify-center gap-6">
               <div className="flex justify-between items-center px-2">
                 <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Global Payout</span>
                 <span className="text-emerald-500 text-xs font-mono font-bold tracking-tighter animate-pulse flex items-center gap-1">
                   <Zap size={10} /> ESTIMATED TOTAL: {totalPendingDisplay} GKY
                 </span>
               </div>
               <Web3Button
                  contractAddress={STAKING_CONTRACT_ADDRESS}
                  contractAbi={STAKING_POOL_ABI}
                  action={(c) => {
                    const collections = stakedNFTs.map(s => s.collection);
                    const ids = stakedNFTs.map(s => s.tokenId);
                    return c.call("claimReward", [collections, ids]);
                  }}
                  isDisabled={stakedNFTs.length === 0}
                  className="!bg-emerald-500 !hover:bg-emerald-400 !text-black !w-full !py-6 !rounded-[24px] !text-xl !font-black !tracking-tighter !italic !shadow-2xl !shadow-emerald-950/20 !border-none !transition-all"
               >
                 CLAIM ALL EARNINGS
               </Web3Button>
             </div>
          </div>

          {/* WALLET SECTION */}
          <section className="mb-32">
            <div className="flex items-center gap-6 mb-12">
              <h2 className="text-3xl font-black flex items-center gap-4 tracking-tighter italic text-white uppercase whitespace-nowrap">
                <Wallet className="text-indigo-500" size={32}/> Liquid Assets
              </h2>
              <div className="h-[2px] w-full bg-gradient-to-r from-white/10 to-transparent" />
            </div>
            
            {loadingNfts ? (
              <div className="py-32 text-center flex flex-col items-center gap-6 opacity-40">
                <div className="w-12 h-12 border-[6px] border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"/>
                <p className="text-indigo-500 font-mono text-[10px] uppercase tracking-[0.6em] font-black">Syncing wallet items...</p>
              </div>
            ) : walletNfts?.length === 0 ? (
              <div className="py-24 text-center bg-white/[0.01] rounded-[60px] border-2 border-dashed border-white/5 shadow-inner">
                <p className="text-slate-800 font-black uppercase tracking-[0.4em] italic text-2xl">Wallet Empty</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
                {walletNfts?.map(nft => (
                  <div key={nft.metadata.id} className="bg-white/[0.02] rounded-[48px] overflow-hidden border border-white/5 hover:border-indigo-500/40 transition-all group relative hover:shadow-[0_40px_80px_-20px_rgba(99,102,241,0.2)]">
                    <div className="aspect-square bg-black relative overflow-hidden">
                       <ThirdwebNftMedia metadata={nft.metadata} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[2s] ease-out" />
                       <div className="absolute top-8 right-8 bg-black/80 backdrop-blur-xl px-4 py-2 rounded-2xl text-[10px] font-black font-mono border border-white/10 text-indigo-400 shadow-2xl z-20">
                          ID: #{nft.metadata.id}
                       </div>
                       <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60 pointer-events-none" />
                    </div>
                    
                    <div className="p-10 space-y-10">
                      <div className="space-y-1">
                        <h3 className="font-black text-2xl text-white truncate tracking-tighter italic uppercase">{nft.metadata.name}</h3>
                        <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest">Asset Category: Alpha Kong</p>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex justify-between items-end px-1">
                          <label className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">Select Term</label>
                          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-tighter">
                             EST. +{(selectedPlan[nft.metadata.id] || 0) === 0 ? "10%" : (selectedPlan[nft.metadata.id] || 0) === 1 ? "12%" : "15%"} MONTHLY
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          {[0, 1, 2].map((idx) => (
                            <button
                              key={idx}
                              onClick={() => setSelectedPlan(p => ({...p, [nft.metadata.id]: idx}))}
                              className={`text-[10px] py-4 rounded-2xl border-2 transition-all font-black ${
                                (selectedPlan[nft.metadata.id] || 0) === idx 
                                  ? "bg-white border-white text-black shadow-2xl shadow-white/10 scale-[1.02]" 
                                  : "bg-transparent border-white/10 text-slate-600 hover:border-white/20 hover:text-slate-400"
                              }`}
                            >
                              {idx === 0 ? "3M" : idx === 1 ? "6M" : "12M"}
                            </button>
                          ))}
                        </div>
                      </div>

                      <Web3Button 
                        contractAddress={STAKING_CONTRACT_ADDRESS}
                        action={async c => {
                          const approved = await nftContract?.isApproved(address, STAKING_CONTRACT_ADDRESS);
                          if (!approved) await nftContract?.setApprovalForAll(STAKING_CONTRACT_ADDRESS, true);
                          await c.call("stake", [[NFT_DROP_ADDRESS], [nft.metadata.id], selectedPlan[nft.metadata.id] || 0]);
                        }}
                        className="!w-full !bg-indigo-600 !hover:bg-indigo-500 !text-white !font-black !rounded-[24px] !py-6 !text-sm !shadow-2xl !uppercase !italic !tracking-tighter !border-none !transition-all"
                      >
                        Approve & Stake <ArrowUpRight size={16} className="inline ml-1" />
                      </Web3Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* STAKED SECTION */}
          <section>
            <div className="flex items-center gap-6 mb-12">
              <h2 className="text-3xl font-black flex items-center gap-4 tracking-tighter italic text-emerald-500 uppercase whitespace-nowrap">
                <ShieldCheck size={32}/> Staked Manifest
              </h2>
              <div className="h-[2px] w-full bg-gradient-to-r from-emerald-500/10 to-transparent" />
            </div>

            {loadingStakes ? (
               <div className="py-32 text-center flex flex-col items-center gap-6 opacity-40">
                 <div className="w-12 h-12 border-[6px] border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"/>
                 <p className="text-emerald-500 font-mono text-[10px] uppercase tracking-[0.6em] font-black italic">Reading Manifest Data...</p>
               </div>
            ) : stakedNFTs.length === 0 ? (
              <div className="py-24 text-center bg-white/[0.01] rounded-[60px] border-2 border-dashed border-white/5 shadow-inner">
                <p className="text-slate-800 font-black uppercase tracking-[0.4em] italic text-2xl text-center">No Active Stakes</p>
              </div>
            ) : (
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
                 {stakedNFTs.map(stake => (
                   <div key={stake.tokenId.toString()} className="bg-white/[0.03] rounded-[48px] overflow-hidden border border-white/5 relative group transition-all hover:bg-white/[0.04]">
                     <div className="absolute top-8 right-8 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-4 py-2 rounded-2xl text-[10px] font-black flex items-center gap-2 backdrop-blur-xl z-20 shadow-2xl">
                       <Zap size={12} fill="currentColor" className="animate-pulse" /> LIVE YIELD
                     </div>
                     
                     <div className="p-12 space-y-10">
                       <div className="pt-6">
                         <h3 className="font-black text-4xl text-white tracking-tighter italic uppercase leading-none">Asset #{stake.tokenId.toString()}</h3>
                         <div className="flex items-center gap-3 mt-4">
                            <div className="p-1.5 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                               <Clock size={12} className="text-indigo-500" />
                            </div>
                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">
                              {stake.planIndex.toString() === "0" ? "90 Day Term" : stake.planIndex.toString() === "1" ? "180 Day Term" : "365 Day Term"}
                            </p>
                         </div>
                       </div>

                       <div className="bg-black p-8 rounded-[32px] space-y-8 border border-white/5 shadow-inner">
                          <div className="flex flex-col gap-2">
                            <span className="text-[10px] text-slate-600 uppercase font-black tracking-[0.2em] ml-1">Current Yield</span>
                            <div className="flex items-baseline gap-2">
                               <span className="text-3xl text-emerald-400 font-black italic tracking-tighter">
                                  <LiveReward stake={stake} />
                               </span>
                               <span className="text-[10px] text-slate-700 uppercase tracking-widest font-black">GKY</span>
                            </div>
                          </div>
                          <div className="h-[1px] w-full bg-white/5" />
                          <div className="flex flex-col gap-2">
                            <span className="text-[10px] text-slate-600 uppercase font-black tracking-[0.2em] ml-1">Unlock Schedule</span>
                            <UnlockTimer endTime={stake.lockEndTime.toNumber()} />
                          </div>
                       </div>

                       <Web3Button 
                         contractAddress={STAKING_CONTRACT_ADDRESS}
                         action={c => c.call("unstake", [[NFT_DROP_ADDRESS], [stake.tokenId]])}
                         isDisabled={Math.floor(Date.now()/1000) < stake.lockEndTime.toNumber()}
                         className={`!w-full !font-black !rounded-[28px] !py-6 !text-sm !transition-all !italic !uppercase !tracking-tighter !shadow-2xl !border-none ${
                            Math.floor(Date.now()/1000) < stake.lockEndTime.toNumber() 
                            ? "!bg-slate-900 !text-slate-700 !cursor-not-allowed !shadow-none" 
                            : "!bg-red-600 !hover:bg-red-500 !text-white !shadow-red-900/30"
                         }`}
                       >
                         UNSTAKE & LIQUIDATE
                       </Web3Button>
                     </div>
                   </div>
                 ))}
               </div>
            )}
          </section>
        </main>

        <footer className="max-w-7xl mx-auto mt-40 pb-24 text-center border-t border-white/5 pt-20">
           <div className="inline-block bg-white/[0.02] px-10 py-3 rounded-full border border-white/5 mb-8 backdrop-blur-md">
              <p className="text-slate-700 text-[10px] uppercase font-black tracking-[0.8em]">Gianky Ecosystem • Web3 Dynamic Protocol • v5.0.4</p>
           </div>
           <div className="flex justify-center gap-12 text-slate-800 opacity-20">
              <ShieldCheck size={28} />
              <Zap size={28} />
              <Wallet size={28} />
           </div>
        </footer>
      </div>
    </div>
  );
};

export default StarterStake;