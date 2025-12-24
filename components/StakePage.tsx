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
import { STAKING_POOL_ABI, REFERRAL_MANAGER_ABI } from "../constants/abis";
import { 
  STAKING_CONTRACT_ADDRESS, 
  NFT_DROP_ADDRESS, 
  TOKEN_CONTRACT_ADDRESS, 
  REFERRAL_MANAGER_ADDRESS 
} from "../constants/config";
import styles from "../styles/Home.module.css";
import Nav from "../components/Nav";

// --- ICONS (SVG Fallbacks for compatibility) ---
const LockIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
);
const UnlockIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>
);
const ZapIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
);
const ShieldIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
);
const WalletIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"></path><path d="M4 6v12c0 1.1.9 2 2 2h14v-4"></path><path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z"></path></svg>
);

const PAGE_NAME = "Starter";

// --- SUB-COMPONENTS (Internalized for stability) ---

const LiveReward = ({ stake }: { stake: any }) => {
  const [reward, setReward] = useState("0.00");
  
  useEffect(() => {
    const update = () => {
      const now = Math.floor(Date.now() / 1000);
      // Safe BigNumber conversion
      const lastClaim = parseInt(stake.lastClaimTime.toString());
      const elapsed = now > lastClaim ? now - lastClaim : 0;
      // Rate is in Wei (1e18)
      const rate = parseInt(stake.rewardRate.toString()) / 1e18;
      setReward((elapsed * rate).toFixed(6));
    };
    const timer = setInterval(update, 1000);
    update();
    return () => clearInterval(timer);
  }, [stake]);
  
  return <span>{reward}</span>;
};

const UnlockTimer = ({ endTime }: { endTime: any }) => {
  const [timeLeft, setTimeLeft] = useState("");
  const [isLocked, setIsLocked] = useState(true);

  useEffect(() => {
    const tick = () => {
      const now = Math.floor(Date.now() / 1000);
      const end = parseInt(endTime.toString());
      const diff = end - now;
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
    <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: isLocked ? '#f59e0b' : '#4ade80', display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'monospace' }}>
      {isLocked ? <><LockIcon /> {timeLeft}</> : <><UnlockIcon /> READY</>}
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

  // Data Hooks
  const { data: ownedNfts, isLoading: loadingNfts } = useNFTs(nftContract);
  const { data: tokenBalance } = useTokenBalance(tokenContract, address);
  
  // V5 Optimized Fetch
  const { data: userFullState, isLoading: loadingStakes } = useContractRead(stakingContract, "getUserFullState", [address]);

  // Extract Staked Array from Tuple
  const stakedNFTs = useMemo(() => (userFullState ? userFullState[0] : []) as any[], [userFullState]);
  
  // Local State
  const [selectedPlan, setSelectedPlan] = useState<{[id: string]: number}>({});
  const [refInput, setRefInput] = useState("");

  const walletNfts = ownedNfts?.filter(nft => nft.owner === address);

  // Helper to calculate total pending rewards
  const totalPendingDisplay = useMemo(() => {
    if (!userFullState || !userFullState[1]) return "0.00";
    return (parseInt(userFullState[1].toString()) / 1e18).toFixed(4);
  }, [userFullState]);

  return (
    <div className={styles.container}>
      <Nav />
      <div className={styles.stakeContainer}>
        
        {/* HEADER */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '40px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
            <div>
              <h1 style={{ fontSize: '2.5rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '10px', margin: 0, textTransform: 'uppercase', fontStyle: 'italic', letterSpacing: '-1px' }}>
                <span style={{ color: '#fbbf24' }}><ZapIcon /></span> {PAGE_NAME} STAKING
              </h1>
              <p style={{ color: '#64748b', marginTop: '5px', fontSize: '0.8rem', fontWeight: '700', letterSpacing: '2px', textTransform: 'uppercase' }}>
                Fixed Yield Protocol V5 • Earn GIANKY
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
               {address && (
                 <div style={{ padding: '8px 16px', background: '#1e293b', borderRadius: '12px', border: '1px solid #334155', fontSize: '0.8rem', fontFamily: 'monospace', color: '#94a3b8' }}>
                   {address.slice(0,6)}...{address.slice(-4)}
                 </div>
               )}
               <ConnectWallet theme="dark" className="!bg-indigo-600 !hover:bg-indigo-700 !text-white !font-bold !rounded-xl !shadow-lg" />
            </div>
          </div>
        </div>

        {/* STATS HUD */}
        <div className={styles.tokenGrid}>
          <div className={styles.tokenItem}>
            <h3 className={styles.tokenLabel} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
               <ShieldIcon /> TOTAL STAKED
            </h3>
            <p className={styles.tokenValue}>{stakedNFTs.length}</p>
          </div>
          <div className={styles.tokenItem}>
             <h3 className={styles.tokenLabel} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
               <WalletIcon /> GIAN BALANCE
             </h3>
             <p className={styles.tokenValue}>
               {tokenBalance?.displayValue.slice(0, 6)} <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 'normal' }}>GIAN</span>
             </p>
          </div>
          <div className={styles.tokenItem} style={{ borderBottom: '3px solid rgba(74, 222, 128, 0.3)' }}>
             <h3 className={styles.tokenLabel} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
               <ZapIcon /> CLAIMABLE
             </h3>
             <p className={styles.tokenValue} style={{ color: '#4ade80' }}>
               {totalPendingDisplay} <span style={{ fontSize: '0.8rem', color: '#14532d', fontWeight: 'normal' }}>GKY</span>
             </p>
          </div>
        </div>

        {/* GLOBAL ACTIONS */}
        <div style={{ display: 'flex', gap: '20px', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '25px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', flexWrap: 'wrap', marginBottom: '40px', backdropFilter: 'blur(10px)' }}>
           <div style={{ flex: 1, minWidth: '300px', display: 'flex', gap: '10px', flexDirection: 'column' }}>
              <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold', color: '#6366f1', marginLeft: '5px' }}>Network Referral</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input 
                  type="text" 
                  placeholder="Referrer ID / Address" 
                  value={refInput}
                  onChange={e => setRefInput(e.target.value)}
                  style={{ flex: 1, padding: '12px 20px', borderRadius: '14px', border: '1px solid #334155', background: '#0f172a', color: 'white', outline: 'none', fontWeight: 'bold', fontSize: '0.9rem' }}
                />
                <Web3Button
                  contractAddress={REFERRAL_MANAGER_ADDRESS}
                  contractAbi={REFERRAL_MANAGER_ABI}
                  action={c => c.call("register", [refInput])}
                  className="!bg-slate-800 !text-white !h-auto !py-3 !px-6 !rounded-xl !font-bold"
                >REGISTER</Web3Button>
              </div>
           </div>
           
           <div style={{ width: '100%', maxWidth: '300px' }}>
             <Web3Button
                contractAddress={STAKING_CONTRACT_ADDRESS}
                contractAbi={STAKING_POOL_ABI}
                action={(c) => {
                  const collections = stakedNFTs.map(s => s.collection);
                  const ids = stakedNFTs.map(s => s.tokenId);
                  return c.call("claimReward", [collections, ids]);
                }}
                isDisabled={stakedNFTs.length === 0}
                className="!bg-green-600 !hover:bg-green-500 !text-white !w-full !py-4 !rounded-2xl !text-lg !font-black !uppercase !italic !shadow-lg"
             >
               CLAIM ALL
             </Web3Button>
           </div>
        </div>

        {/* SECTION 1: WALLET */}
        <h2 style={{ fontSize: '1.5rem', fontWeight: '900', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px', textTransform: 'uppercase', fontStyle: 'italic', color: '#818cf8' }}>
          <WalletIcon /> Unstaked Assets <span style={{ fontSize: '0.8rem', background: '#312e81', color: '#c7d2fe', padding: '2px 8px', borderRadius: '10px', fontStyle: 'normal' }}>{walletNfts?.length || 0}</span>
        </h2>
        
        {loadingNfts ? <p style={{ color: '#64748b', textAlign: 'center', padding: '40px', letterSpacing: '2px', fontWeight: 'bold', textTransform: 'uppercase' }}>Scanning Blockchain...</p> : 
         walletNfts?.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '30px', border: '2px dashed #334155', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
            No NFTs found in wallet
          </div>
        ) : (
          <div className={styles.nftBoxGrid}>
            {walletNfts?.map(nft => (
              <div key={nft.metadata.id} className={styles.nftBox} style={{ borderRadius: '24px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ height: '220px', overflow: 'hidden', position: 'relative', background: '#020617' }}>
                   <ThirdwebNftMedia metadata={nft.metadata} className={styles.nftMedia} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                   <div style={{ position: 'absolute', top: '15px', right: '15px', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)', padding: '4px 8px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 'bold', fontFamily: 'monospace', color: '#818cf8', border: '1px solid rgba(255,255,255,0.1)' }}>
                      #{nft.metadata.id}
                   </div>
                </div>
                <div style={{ padding: '20px' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: '900', marginBottom: '15px', fontStyle: 'italic', textTransform: 'uppercase' }}>{nft.metadata.name}</h3>
                  
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                      {[0, 1, 2].map((idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedPlan(p => ({...p, [nft.metadata.id]: idx}))}
                          style={{
                            padding: '10px 0',
                            borderRadius: '10px',
                            border: (selectedPlan[nft.metadata.id] || 0) === idx ? '2px solid #6366f1' : '1px solid #334155',
                            background: (selectedPlan[nft.metadata.id] || 0) === idx ? '#4f46e5' : 'transparent',
                            color: (selectedPlan[nft.metadata.id] || 0) === idx ? 'white' : '#64748b',
                            fontSize: '0.7rem',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          {idx === 0 ? "3 MO" : idx === 1 ? "6 MO" : "12 MO"}
                        </button>
                      ))}
                    </div>
                    <div style={{ textAlign: 'center', fontSize: '0.7rem', color: '#4ade80', marginTop: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', background: 'rgba(74, 222, 128, 0.1)', padding: '5px', borderRadius: '8px' }}>
                       +{(selectedPlan[nft.metadata.id] || 0) === 0 ? "10%" : (selectedPlan[nft.metadata.id] || 0) === 1 ? "12%" : "15%"} Monthly Yield
                    </div>
                  </div>

                  <Web3Button 
                    contractAddress={STAKING_CONTRACT_ADDRESS}
                    action={async c => {
                      const approved = await nftContract?.isApproved(address, STAKING_CONTRACT_ADDRESS);
                      if (!approved) await nftContract?.setApprovalForAll(STAKING_CONTRACT_ADDRESS, true);
                      await c.call("stake", [[NFT_DROP_ADDRESS], [nft.metadata.id], selectedPlan[nft.metadata.id] || 0]);
                    }}
                    className="!w-full !bg-white !hover:bg-slate-200 !text-slate-950 !font-black !rounded-xl !py-4 !text-sm !uppercase !italic"
                  >
                    Approve & Stake
                  </Web3Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ height: '60px' }} />

        {/* SECTION 2: STAKED */}
        <h2 style={{ fontSize: '1.5rem', fontWeight: '900', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px', textTransform: 'uppercase', fontStyle: 'italic', color: '#4ade80' }}>
          <ShieldIcon /> Active Stakes <span style={{ fontSize: '0.8rem', background: '#14532d', color: '#86efac', padding: '2px 8px', borderRadius: '10px', fontStyle: 'normal' }}>{stakedNFTs.length}</span>
        </h2>

        {loadingStakes ? <p style={{ color: '#64748b' }}>Loading...</p> : 
         stakedNFTs.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '30px', border: '2px dashed #334155', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
            No NFTs currently staked
          </div>
        ) : (
           <div className={styles.nftBoxGrid}>
             {stakedNFTs.map(stake => (
               <div key={stake.tokenId.toString()} className={styles.nftBox} style={{ borderRadius: '24px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)', position: 'relative' }}>
                 <div style={{ position: 'absolute', top: '15px', right: '15px', background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', border: '1px solid rgba(34, 197, 94, 0.3)', padding: '4px 10px', borderRadius: '8px', fontSize: '0.65rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '4px', zIndex: 10, backdropFilter: 'blur(5px)' }}>
                   <ZapIcon /> EARNING
                 </div>
                 
                 <div style={{ padding: '25px', paddingTop: '50px' }}>
                   <h3 style={{ fontSize: '1.5rem', fontWeight: '900', marginBottom: '5px', fontStyle: 'italic', textTransform: 'uppercase' }}>Token #{stake.tokenId.toString()}</h3>
                   <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '20px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
                     {stake.planIndex.toString() === "0" ? "90 Day Plan" : stake.planIndex.toString() === "1" ? "180 Day Plan" : "365 Day Plan"}
                   </div>

                   <div style={{ background: '#020617', borderRadius: '16px', padding: '15px', marginBottom: '20px', border: '1px solid #1e293b' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '1px' }}>Yield</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'monospace', fontSize: '1rem', color: '#4ade80', fontWeight: 'bold' }}>
                           <LiveReward stake={stake} /> <span style={{ fontSize: '0.7rem', color: '#64748b' }}>GKY</span>
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '1px' }}>Unlock</span>
                        <UnlockTimer endTime={stake.lockEndTime} />
                      </div>
                   </div>

                   <Web3Button 
                     contractAddress={STAKING_CONTRACT_ADDRESS}
                     action={c => c.call("unstake", [[NFT_DROP_ADDRESS], [stake.tokenId]])}
                     isDisabled={Math.floor(Date.now()/1000) < parseInt(stake.lockEndTime.toString())}
                     className={`!w-full !font-black !rounded-xl !py-4 !text-sm !uppercase !italic !transition-all ${
                        Math.floor(Date.now()/1000) < parseInt(stake.lockEndTime.toString()) 
                        ? "!bg-slate-800 !text-slate-600 !cursor-not-allowed" 
                        : "!bg-red-600 !hover:bg-red-500 !text-white !shadow-lg"
                     }`}
                   >
                     Unstake & Collect
                   </Web3Button>
                 </div>
               </div>
             ))}
           </div>
        )}

      </div>
    </div>
  );
};

export default StarterStake;