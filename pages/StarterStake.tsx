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
import { Wallet, Lock, Unlock, Zap, ShieldCheck, AlertTriangle } from "lucide-react";
import { STAKING_POOL_ABI, REFERRAL_MANAGER_ABI } from "../constants/abis";
import { 
  STAKING_CONTRACT_ADDRESS, 
  NFT_DROP_ADDRESS, 
  TOKEN_CONTRACT_ADDRESS, 
  REFERRAL_MANAGER_ADDRESS 
} from "../constants/config";

const PAGE_NAME = "Starter";

// --- SUB-COMPONENTS (Internal for Real-time Updates) ---

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
  return <span>{reward}</span>;
};

const UnlockTimer = ({ endTime }: { endTime: number }) => {
  const [timeLeft, setTimeLeft] = useState("");
  const [isLocked, setIsLocked] = useState(true);

  useEffect(() => {
    const tick = () => {
      const now = Math.floor(Date.now() / 1000);
      const diff = endTime - now;
      if (diff <= 0) {
        setTimeLeft("UNLOCKED");
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
    <div className={`font-mono text-xs font-bold ${isLocked ? "text-amber-500" : "text-green-400"}`}>
      {isLocked ? <span className="flex items-center gap-1"><Lock size={12}/> {timeLeft}</span> 
                : <span className="flex items-center gap-1"><Unlock size={12}/> READY</span>}
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

  // Logic: Fetch Wallet & Staking State
  const { data: ownedNfts, isLoading: loadingNfts } = useNFTs(nftContract);
  const { data: tokenBalance } = useTokenBalance(tokenContract, address);
  const { data: userFullState, isLoading: loadingStakes } = useContractRead(stakingContract, "getUserFullState", [address]);

  const stakedNFTs = useMemo(() => (userFullState ? userFullState[0] : []) as any[], [userFullState]);
  const [selectedPlan, setSelectedPlan] = useState<{[id: string]: number}>({});
  const [refInput, setRefInput] = useState("");

  const walletNfts = ownedNfts?.filter(nft => nft.owner === address);

  // Helper: Format Total Pending
  const totalPendingDisplay = useMemo(() => {
    if (!userFullState || !userFullState[1]) return "0.00";
    return parseFloat(ethers.utils.formatEther(userFullState[1])).toFixed(4);
  }, [userFullState]);

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
               <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"/>
               <span className="text-sm font-mono">{address.slice(0,6)}...{address.slice(-4)}</span>
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
               {tokenBalance?.displayValue.slice(0, 6)} <span className="text-sm text-slate-500">GIAN</span>
             </p>
          </div>
          <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 shadow-lg">
             <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">Claimable Rewards</h3>
             <p className="text-3xl font-bold text-green-400 mt-2">
               {totalPendingDisplay} <span className="text-sm text-slate-500 uppercase">GKY</span>
             </p>
          </div>
        </div>

        {/* ACTION BAR: REFERRAL & GLOBAL CLAIM */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-800/30 p-6 rounded-xl border border-slate-700/50 backdrop-blur-sm">
           <div className="flex-1 w-full max-w-lg flex flex-col gap-2">
              <label className="text-xs text-slate-500 font-bold uppercase tracking-tighter ml-1">Network Referral</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Friend's NFT ID or Address" 
                  value={refInput}
                  onChange={e => setRefInput(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-2 flex-1 focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <Web3Button
                  contractAddress={REFERRAL_MANAGER_ADDRESS}
                  contractAbi={REFERRAL_MANAGER_ABI}
                  action={c => c.call("register", [refInput])}
                  className="!bg-slate-700 !text-white !h-auto !py-2 !px-4"
                >Register</Web3Button>
              </div>
           </div>
           
           <div className="w-full md:w-auto self-end">
             <Web3Button
                contractAddress={STAKING_CONTRACT_ADDRESS}
                contractAbi={STAKING_POOL_ABI}
                action={(c) => {
                  const collections = stakedNFTs.map(s => s.collection);
                  const ids = stakedNFTs.map(s => s.tokenId);
                  return c.call("claimReward", [collections, ids]);
                }}
                isDisabled={stakedNFTs.length === 0}
                className="!bg-green-600 !hover:bg-green-700 !text-white !w-full md:!w-64 !shadow-xl !shadow-green-900/20"
             >
               Claim All Rewards
             </Web3Button>
           </div>
        </div>

        {/* UNSTAKED SECTION (Wallet Holdings) */}
        <section>
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-indigo-400">
            <Wallet size={20}/> Your Wallet (Unstaked)
          </h2>
          
          {loadingNfts ? <div className="text-slate-500 flex items-center gap-2"><div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"/> Scanning wallet...</div> : 
           walletNfts?.length === 0 ? (
            <div className="p-12 text-center bg-slate-800/20 rounded-2xl border border-dashed border-slate-700 text-slate-500">
              No NFTs found in wallet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {walletNfts?.map(nft => (
                <div key={nft.metadata.id} className="bg-slate-800 rounded-2xl overflow-hidden border border-slate-700 hover:border-indigo-500/50 transition-all group">
                  <div className="h-56 bg-slate-900 relative overflow-hidden">
                     <ThirdwebNftMedia metadata={nft.metadata} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                     <div className="absolute top-2 right-2 bg-slate-900/80 backdrop-blur-md px-2 py-1 rounded text-[10px] font-mono border border-white/10">#{nft.metadata.id}</div>
                  </div>
                  <div className="p-5 space-y-4">
                    <h3 className="font-bold text-lg text-white truncate">{nft.metadata.name}</h3>
                    
                    <div className="space-y-3">
                      <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Select Lock Period</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[0, 1, 2].map((idx) => (
                          <button
                            key={idx}
                            onClick={() => setSelectedPlan(p => ({...p, [nft.metadata.id]: idx}))}
                            className={`text-[10px] py-2 rounded-lg border transition-all font-bold ${
                              (selectedPlan[nft.metadata.id] || 0) === idx 
                                ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/30" 
                                : "bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500"
                            }`}
                          >
                            {idx === 0 ? "3 MO" : idx === 1 ? "6 MO" : "12 MO"}
                          </button>
                        ))}
                      </div>
                      <div className="text-center text-[10px] font-bold text-green-400/80 bg-green-500/5 py-1 rounded border border-green-500/10">
                         YIELD: {(selectedPlan[nft.metadata.id] || 0) === 0 ? "10%" : (selectedPlan[nft.metadata.id] || 0) === 1 ? "12%" : "15%"} MONTHLY
                      </div>
                    </div>

                    <Web3Button 
                      contractAddress={STAKING_CONTRACT_ADDRESS}
                      action={async c => {
                        const approved = await nftContract?.isApproved(address, STAKING_CONTRACT_ADDRESS);
                        if (!approved) await nftContract?.setApprovalForAll(STAKING_CONTRACT_ADDRESS, true);
                        await c.call("stake", [[NFT_DROP_ADDRESS], [nft.metadata.id], selectedPlan[nft.metadata.id] || 0]);
                      }}
                      className="!w-full !bg-white !hover:bg-slate-100 !text-slate-900 !font-bold !rounded-xl !py-2.5 !text-sm"
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
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-green-400">
            <ShieldCheck size={20}/> Staked Assets
          </h2>

          {loadingStakes ? <div className="text-slate-500 flex items-center gap-2 font-mono text-sm"><div className="w-3 h-3 border-2 border-green-500 border-t-transparent rounded-full animate-spin"/> FETCHING ACTIVE STAKES...</div> : 
           stakedNFTs.length === 0 ? (
            <div className="p-12 text-center bg-slate-800/10 rounded-2xl border border-dashed border-slate-700 text-slate-600 italic">
              No active stakes found for this tier.
            </div>
          ) : (
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
               {stakedNFTs.map(stake => (
                 <div key={stake.tokenId.toString()} className="bg-slate-800 rounded-2xl overflow-hidden border border-slate-700 relative shadow-2xl">
                   <div className="absolute top-3 right-3 bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 backdrop-blur-md z-10">
                     <Zap size={10} fill="currentColor" /> EARNING
                   </div>
                   
                   <div className="p-5 pt-8 space-y-5">
                     <div>
                       <h3 className="font-bold text-lg text-white">Alpha Kong #{stake.tokenId.toString()}</h3>
                       <p className="text-[10px] font-mono text-slate-500 mt-1 uppercase">Plan: {stake.planIndex.toString() === "0" ? "3 Months" : stake.planIndex.toString() === "1" ? "6 Months" : "12 Months"}</p>
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
                          <UnlockTimer endTime={stake.lockEndTime.toNumber()} />
                        </div>
                     </div>

                     <Web3Button 
                       contractAddress={STAKING_CONTRACT_ADDRESS}
                       action={c => c.call("unstake", [[NFT_DROP_ADDRESS], [stake.tokenId]])}
                       isDisabled={Math.floor(Date.now()/1000) < stake.lockEndTime.toNumber()}
                       className={`!w-full !font-bold !rounded-xl !py-2.5 !text-sm !transition-all ${
                          Math.floor(Date.now()/1000) < stake.lockEndTime.toNumber() 
                          ? "!bg-slate-700 !text-slate-500 !border !border-slate-600" 
                          : "!bg-red-600 !hover:bg-red-700 !text-white !shadow-lg !shadow-red-900/20"
                       }`}
                     >
                       Unstake & Claim
                     </Web3Button>
                   </div>
                 </div>
               ))}
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