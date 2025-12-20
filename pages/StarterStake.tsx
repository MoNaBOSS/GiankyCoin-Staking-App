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
import { Wallet, Lock, Unlock, Zap, ShieldCheck, Clock, AlertTriangle } from "lucide-react";
import { STAKING_POOL_ABI, REFERRAL_MANAGER_ABI } from "../constants/abis";
import { 
  STAKING_CONTRACT_ADDRESS, 
  NFT_DROP_ADDRESS, 
  TOKEN_CONTRACT_ADDRESS, 
  REFERRAL_MANAGER_ADDRESS 
} from "../constants/config";
import styles from "../styles/Home.module.css";
import Nav from "../components/Nav";

const PAGE_NAME = "Starter";

// --- SUB-COMPONENTS (Internal for Real-time Performance) ---

/**
 * LiveReward Component: Updates every second based on the reward rate 
 * defined in the contract for smooth UI feedback.
 */
const LiveReward = ({ stake }: { stake: any }) => {
  const [reward, setReward] = useState("0.000000");

  useEffect(() => {
    const update = () => {
      const now = Math.floor(Date.now() / 1000);
      const lastClaim = stake.lastClaimTime.toNumber();
      // Calculate pending based on seconds elapsed and fixed rate
      const elapsed = now > lastClaim ? now - lastClaim : 0;
      const rate = parseFloat(ethers.utils.formatEther(stake.rewardRate));
      setReward((elapsed * rate).toFixed(6));
    };

    const timer = setInterval(update, 1000);
    update();
    return () => clearInterval(timer);
  }, [stake]);

  return <span>{reward}</span>;
};

/**
 * UnlockTimer Component: Shows a countdown or "READY" status based on lock period.
 */
const UnlockTimer = ({ endTime }: { endTime: number }) => {
  const [timeLeft, setTimeLeft] = useState("");
  const [isLocked, setIsLocked] = useState(true);

  useEffect(() => {
    const tick = () => {
      const now = Math.floor(Date.now() / 1000);
      const diff = endTime - now;

      if (diff <= 0) {
        setTimeLeft("READY");
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
    <div className={`flex items-center gap-1 font-mono text-xs font-bold ${isLocked ? "text-amber-500" : "text-green-400"}`}>
      {isLocked ? <><Lock size={12}/> {timeLeft}</> : <><Unlock size={12}/> {timeLeft}</>}
    </div>
  );
};

// --- MAIN PAGE ---

const StarterStake: NextPage = () => {
  const address = useAddress();
  
  // Contract Hooks
  const { contract: stakingContract } = useContract(STAKING_CONTRACT_ADDRESS, STAKING_POOL_ABI);
  const { contract: nftContract } = useContract(NFT_DROP_ADDRESS, "nft-drop");
  const { contract: tokenContract } = useContract(TOKEN_CONTRACT_ADDRESS, "token");

  // Data Hooks
  const { data: ownedNfts, isLoading: loadingNfts } = useNFTs(nftContract);
  const { data: tokenBalance, isLoading: loadingBalance } = useTokenBalance(tokenContract, address);
  
  // V5 efficient state fetch (fetches stakes and global pending in one call)
  const { data: userFullState, isLoading: loadingStakes } = useContractRead(
    stakingContract, 
    "getUserFullState", 
    [address]
  );

  const stakedNFTs = useMemo(() => (userFullState ? userFullState[0] : []) as any[], [userFullState]);
  const [selectedPlan, setSelectedPlan] = useState<{[id: string]: number}>({});
  const [refInput, setRefInput] = useState("");

  const walletNfts = ownedNfts?.filter(nft => nft.owner === address);

  // Formatting Total Pending for the Stats section
  const totalPendingDisplay = useMemo(() => {
    if (!userFullState || !userFullState[1]) return "0.0";
    return parseFloat(ethers.utils.formatEther(userFullState[1])).toFixed(4);
  }, [userFullState]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 md:p-8">
      <Nav />
      
      {/* HEADER SECTION */}
      <header className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center mb-12 mt-8 gap-6">
        <div>
          <h1 className="text-4xl font-black flex items-center gap-3 tracking-tighter italic">
            <Zap className="text-yellow-400 fill-yellow-400" size={32} /> 
            {PAGE_NAME} STAKING
          </h1>
          <p className="text-slate-500 mt-1 uppercase text-[10px] tracking-[0.3em] font-bold">GIANKY V5 Protocol • Dynamic Yield Engine</p>
        </div>
        <div className="flex items-center gap-4">
           {address && (
             <div className="hidden lg:flex items-center gap-3 bg-slate-900 px-5 py-2.5 rounded-2xl border border-slate-800 shadow-2xl">
               <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]"/>
               <span className="text-xs font-mono text-slate-400 font-bold">{address.slice(0,6)}...{address.slice(-4)}</span>
             </div>
           )}
           <ConnectWallet theme="dark" className="!bg-indigo-600 !hover:bg-indigo-700 !text-white !font-black !rounded-2xl !py-3 !px-8 !shadow-2xl !shadow-indigo-900/40" />
        </div>
      </header>

      <main className="max-w-6xl mx-auto space-y-12 pb-20">
        
        {/* REWARDS & BALANCE STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900/50 p-8 rounded-3xl border border-slate-800 backdrop-blur-xl shadow-2xl group hover:border-slate-700 transition-colors">
            <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
               <ShieldCheck size={14} className="text-indigo-500" /> Staked Inventory
            </h3>
            <p className="text-5xl font-black text-white mt-3 tracking-tighter italic">{stakedNFTs.length}</p>
          </div>
          <div className="bg-slate-900/50 p-8 rounded-3xl border border-slate-800 backdrop-blur-xl shadow-2xl group hover:border-slate-700 transition-colors">
             <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                <Wallet size={14} className="text-indigo-500" /> GIAN Balance
             </h3>
             <p className="text-5xl font-black text-white mt-3 tracking-tighter italic">
               {loadingBalance ? "..." : tokenBalance?.displayValue.slice(0, 6)} 
               <span className="text-sm text-slate-600 ml-2 font-mono not-italic uppercase tracking-normal">GIAN</span>
             </p>
          </div>
          <div className="bg-slate-900/50 p-8 rounded-3xl border border-slate-800 backdrop-blur-xl shadow-2xl border-b-green-500/30 group hover:border-green-500/20 transition-all">
             <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                <Zap size={14} className="text-green-500" /> Claimable Yield
             </h3>
             <p className="text-5xl font-black text-green-400 mt-3 tracking-tighter italic">
               {totalPendingDisplay} <span className="text-sm text-green-900 ml-1 font-mono not-italic uppercase tracking-normal">GKY</span>
             </p>
          </div>
        </div>

        {/* GLOBAL ACTIONS AREA */}
        <div className="flex flex-col lg:flex-row gap-6 justify-between items-center bg-indigo-950/20 p-8 rounded-[40px] border border-white/5 backdrop-blur-3xl shadow-2xl relative overflow-hidden">
           <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-600/10 blur-[80px] rounded-full" />
           
           <div className="flex-1 w-full max-w-xl flex flex-col gap-3 relative z-10">
              <label className="text-[10px] text-indigo-400 font-black uppercase tracking-widest ml-2">Network Referral Manager</label>
              <div className="flex gap-3">
                <input 
                  type="text" 
                  id="referral-input"
                  placeholder="NFT ID or Referral Address" 
                  value={refInput}
                  onChange={e => setRefInput(e.target.value)}
                  className="bg-black/40 border border-slate-800 text-white rounded-2xl px-6 py-4 flex-1 focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-700 shadow-inner font-bold"
                />
                <Web3Button
                  contractAddress={REFERRAL_MANAGER_ADDRESS}
                  contractAbi={REFERRAL_MANAGER_ABI}
                  action={c => c.call("register", [refInput])}
                  className="!bg-slate-800 !text-white !h-auto !py-4 !px-8 !rounded-2xl !border !border-white/5 !hover:bg-slate-700 !font-black !uppercase !tracking-tighter"
                >Register</Web3Button>
              </div>
           </div>
           
           <div className="w-full lg:w-auto relative z-10">
             <Web3Button
                contractAddress={STAKING_CONTRACT_ADDRESS}
                contractAbi={STAKING_POOL_ABI}
                action={(c) => {
                  const collections = stakedNFTs.map(s => s.collection);
                  const ids = stakedNFTs.map(s => s.tokenId);
                  return c.call("claimReward", [collections, ids]);
                }}
                isDisabled={stakedNFTs.length === 0}
                className="!bg-green-600 !hover:bg-green-500 !text-white !w-full lg:!w-80 !py-5 !rounded-3xl !text-xl !font-black !tracking-tighter !italic !shadow-[0_20px_50px_rgba(22,163,74,0.3)]"
             >
               CLAIM ALL YIELD
             </Web3Button>
           </div>
        </div>

        {/* UNSTAKED SECTION (Wallet Holdings) */}
        <section>
          <div className="flex justify-between items-center mb-10 px-2">
            <h2 className="text-3xl font-black flex items-center gap-4 tracking-tighter italic text-white uppercase">
              <Wallet className="text-indigo-500" size={28}/> Wallet Items
              <span className="text-xs bg-slate-900 border border-slate-800 text-slate-500 px-4 py-1.5 rounded-full font-mono not-italic font-bold">{walletNfts?.length || 0} TOTAL</span>
            </h2>
          </div>
          
          {loadingNfts ? (
            <div className="p-32 text-center flex flex-col items-center gap-6">
              <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(99,102,241,0.3)]"/>
              <p className="text-slate-600 font-mono text-[10px] uppercase tracking-[0.5em] font-black">Syncing Blockchain State...</p>
            </div>
          ) : walletNfts?.length === 0 ? (
            <div className="p-24 text-center bg-slate-900/20 rounded-[40px] border-2 border-dashed border-slate-800 text-slate-700 italic font-bold">
              No NFTs detected in the connected wallet for this tier.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
              {walletNfts?.map(nft => (
                <div key={nft.metadata.id} className="bg-slate-900/60 rounded-[35px] overflow-hidden border border-slate-800 hover:border-indigo-500/50 transition-all group shadow-2xl relative">
                  <div className="h-72 bg-slate-950 relative overflow-hidden">
                     {/* GIF Support: ThirdwebNftMedia handles GIF rendering automatically */}
                     <ThirdwebNftMedia metadata={nft.metadata} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 ease-in-out" />
                     <div className="absolute top-5 right-5 bg-black/80 backdrop-blur-xl px-4 py-2 rounded-2xl text-[10px] font-black font-mono border border-white/10 text-indigo-400 shadow-2xl">
                        ID: {nft.metadata.id}
                     </div>
                  </div>
                  <div className="p-8 space-y-8">
                    <h3 className="font-black text-2xl text-white truncate tracking-tighter italic uppercase">{nft.metadata.name}</h3>
                    
                    <div className="space-y-4">
                      <label className="text-[10px] text-slate-600 font-black uppercase tracking-[0.2em] ml-2">Choose Lock Term</label>
                      <div className="grid grid-cols-3 gap-3">
                        {[0, 1, 2].map((idx) => (
                          <button
                            key={idx}
                            onClick={() => setSelectedPlan(p => ({...p, [nft.metadata.id]: idx}))}
                            className={`text-[10px] py-4 rounded-2xl border-2 transition-all font-black ${
                              (selectedPlan[nft.metadata.id] || 0) === idx 
                                ? "bg-indigo-600 border-indigo-400 text-white shadow-2xl shadow-indigo-900/60" 
                                : "bg-black border-slate-800 text-slate-600 hover:border-slate-700 hover:text-slate-400"
                            }`}
                          >
                            {idx === 0 ? "3 MO" : idx === 1 ? "6 MO" : "12 MO"}
                          </button>
                        ))}
                      </div>
                      <div className="text-center text-[10px] font-black text-green-400 bg-green-500/5 py-3 rounded-2xl border border-green-500/10 tracking-widest uppercase">
                         Guaranteed Yield: {(selectedPlan[nft.metadata.id] || 0) === 0 ? "10%" : (selectedPlan[nft.metadata.id] || 0) === 1 ? "12%" : "15%"} Monthly
                      </div>
                    </div>

                    <Web3Button 
                      contractAddress={STAKING_CONTRACT_ADDRESS}
                      action={async c => {
                        const approved = await nftContract?.isApproved(address, STAKING_CONTRACT_ADDRESS);
                        if (!approved) await nftContract?.setApprovalForAll(STAKING_CONTRACT_ADDRESS, true);
                        // Contract uses array format for collections and tokenIds
                        await c.call("stake", [[NFT_DROP_ADDRESS], [nft.metadata.id], selectedPlan[nft.metadata.id] || 0]);
                      }}
                      className="!w-full !bg-white !hover:bg-slate-200 !text-black !font-black !rounded-[20px] !py-5 !text-sm !shadow-[0_15px_30px_rgba(255,255,255,0.1)] !uppercase !tracking-tighter !italic"
                    >
                      Approve & Stake
                    </Web3Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* STAKED SECTION (Active Assets) */}
        <section>
          <div className="flex justify-between items-center mb-10 px-2">
            <h2 className="text-3xl font-black flex items-center gap-4 tracking-tighter italic text-green-500 uppercase">
              <ShieldCheck size={32}/> Staked Assets
              <span className="text-xs bg-green-500/5 border border-green-500/10 text-green-500/50 px-4 py-1.5 rounded-full font-mono not-italic font-bold uppercase tracking-widest">{stakedNFTs.length} Active</span>
            </h2>
          </div>

          {loadingStakes ? (
             <div className="p-32 text-center flex flex-col items-center gap-6">
               <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(34,197,94,0.3)]"/>
               <p className="text-slate-600 font-mono text-[10px] uppercase tracking-[0.5em] font-black italic">Reading Vault Manifest...</p>
             </div>
          ) : stakedNFTs.length === 0 ? (
            <div className="p-32 text-center bg-slate-900/10 rounded-[50px] border-2 border-dashed border-slate-900 text-slate-800 font-black uppercase tracking-widest italic">
              The vault is empty. Stake an NFT to start earning.
            </div>
          ) : (
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
               {stakedNFTs.map(stake => (
                 <div key={stake.tokenId.toString()} className="bg-slate-900/80 rounded-[40px] overflow-hidden border border-slate-800 relative shadow-[0_30px_60px_rgba(0,0,0,0.5)] group">
                   <div className="absolute top-5 right-5 bg-green-500/20 text-green-400 border border-green-500/30 px-4 py-2 rounded-2xl text-[10px] font-black flex items-center gap-2 backdrop-blur-xl z-10 shadow-2xl">
                     <Zap size={12} fill="currentColor" className="animate-pulse" /> LIVE EARNING
                   </div>
                   
                   <div className="p-10 space-y-8">
                     <div className="pt-6">
                       <h3 className="font-black text-3xl text-white tracking-tighter italic uppercase">Alpha Kong #{stake.tokenId.toString()}</h3>
                       <div className="flex items-center gap-2 mt-2">
                          <Clock size={12} className="text-indigo-500" />
                          <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] opacity-80">
                            {stake.planIndex.toString() === "0" ? "90 Days" : stake.planIndex.toString() === "1" ? "180 Days" : "365 Days"} Term
                          </p>
                       </div>
                     </div>

                     <div className="bg-black/60 rounded-[30px] p-7 space-y-6 border border-slate-800 shadow-inner">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-slate-600 uppercase font-black tracking-widest">Yield Accumulated</span>
                          <span className="flex items-center gap-2 font-mono text-lg text-green-400 font-black italic">
                             <LiveReward stake={stake} /> <span className="text-[10px] text-slate-700 not-italic uppercase tracking-normal">GKY</span>
                          </span>
                        </div>
                        <div className="flex justify-between items-center pt-4 border-t border-white/5">
                          <span className="text-[10px] text-slate-600 uppercase font-black tracking-widest">Vault Unlock</span>
                          <UnlockTimer endTime={stake.lockEndTime.toNumber()} />
                        </div>
                     </div>

                     <Web3Button 
                       contractAddress={STAKING_CONTRACT_ADDRESS}
                       action={c => c.call("unstake", [[NFT_DROP_ADDRESS], [stake.tokenId]])}
                       isDisabled={Math.floor(Date.now()/1000) < stake.lockEndTime.toNumber()}
                       className={`!w-full !font-black !rounded-[24px] !py-5 !text-sm !transition-all !italic !uppercase !tracking-tighter !shadow-2xl ${
                          Math.floor(Date.now()/1000) < stake.lockEndTime.toNumber() 
                          ? "!bg-slate-800 !text-slate-600 !border !border-slate-700 !cursor-not-allowed shadow-none" 
                          : "!bg-red-600 !hover:bg-red-500 !text-white !shadow-red-900/30"
                       }`}
                     >
                       Unstake & Collect
                     </Web3Button>
                   </div>
                 </div>
               ))}
             </div>
          )}
        </section>

      </main>

      <footer className="max-w-6xl mx-auto mt-40 pb-20 text-center border-t border-slate-900 pt-20">
         <div className="inline-block bg-slate-900/50 px-8 py-3 rounded-full border border-slate-800 mb-6">
            <p className="text-slate-600 text-[9px] uppercase font-black tracking-[0.6em]">GIANKY ECOSYSTEM • SECURED BY POLYGON NETWORK • V5.0.2</p>
         </div>
         <div className="flex justify-center gap-8 text-slate-800">
            <ShieldCheck size={20} />
            <Zap size={20} />
            <Wallet size={20} />
         </div>
      </footer>
    </div>
  );
};

export default StarterStake;