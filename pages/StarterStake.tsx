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
import { Lock, Unlock, Zap, Shield, Wallet } from "lucide-react";
import { ethers } from "ethers";
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

const PAGE_NAME = "Standard";

const LiveReward = ({ stake }: { stake: any }) => {
  const [reward, setReward] = useState("0.00");
  
  useEffect(() => {
    const update = () => {
      const now = Math.floor(Date.now() / 1000);
      const lastClaim = stake.lastClaimTime.toNumber();
      const elapsed = now > lastClaim ? now - lastClaim : 0;
      const rate = stake.rewardRate.toNumber() / 1e18;
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
      {isLocked ? <><Lock size={12} /> {timeLeft}</> : <><Unlock size={12} /> READY</>}
    </div>
  );
};

const StandardStake: NextPage = () => {
  const address = useAddress();
  
  // Contracts
  const { contract: stakingContract } = useContract(STAKING_CONTRACT_ADDRESS, STAKING_POOL_ABI);
  const { contract: nftContract } = useContract(NFT_DROP_ADDRESS, "nft-drop");
  const { contract: tokenContract } = useContract(TOKEN_CONTRACT_ADDRESS, "token");

  // Data Hooks
  const { data: ownedNfts, isLoading: loadingNfts } = useNFTs(nftContract);
  const { data: tokenBalance } = useTokenBalance(tokenContract, address);
  
  // V5 Optimized Fetch
  const { data: userFullState, isLoading: loadingStakes } = useContractRead(
    stakingContract, 
    "getUserFullState", 
    [address]
  );

  // Extract Staked Array from Tuple
  const stakedNFTs = useMemo(() => (userFullState ? userFullState[0] : []) as any[], [userFullState]);
  
  // Local State
  const [selectedPlan, setSelectedPlan] = useState<{[id: string]: number}>({});
  const [refInput, setRefInput] = useState("");

  const walletNfts = ownedNfts?.filter(nft => nft.owner === address);

  // Total Pending Helper (formatted to 4 decimals)
  const totalPendingDisplay = useMemo(() => {
    if (!userFullState || !userFullState[1]) return "0.00";
    return Number(ethers.utils.formatUnits(userFullState[1], 18)).toFixed(4);
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
                <span style={{ color: '#6366f1' }}><Zap size={14} /></span> {PAGE_NAME} STAKING
              </h1>
              <p style={{ color: '#64748b', marginTop: '5px', fontSize: '0.8rem', fontWeight: '700', letterSpacing: '2px', textTransform: 'uppercase' }}>
                Premium Fixed Yield • Dynamic Protocol V5
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              {address && (
                <div style={{ padding: '8px 16px', background: '#1e293b', borderRadius: '12px', border: '1px solid #334155', fontSize: '0.8rem', fontFamily: 'monospace', color: '#94a3b8' }}>
                  {address.slice(0,6)}...{address.slice(-4)}
                </div>
              )}
              <ConnectWallet theme="dark" className="!bg-white !text-black !font-black !rounded-xl !shadow-lg" />
            </div>
          </div>
        </div>

        {/* STATS HUD */}
        <div className={styles.tokenGrid}>
          <div className={styles.tokenItem}>
            <h3 className={styles.tokenLabel} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Shield size={20} /> TOTAL STAKED
            </h3>
            <p className={styles.tokenValue}>{stakedNFTs.length}</p>
          </div>
          <div className={styles.tokenItem}>
            <h3 className={styles.tokenLabel} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Wallet size={20} /> GIAN BALANCE
            </h3>
            <p className={styles.tokenValue}>
              {tokenBalance?.displayValue.slice(0, 6)} <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 'normal' }}>GIAN</span>
            </p>
          </div>
          <div className={styles.tokenItem} style={{ borderBottom: '3px solid #6366f1' }}>
            <h3 className={styles.tokenLabel} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Zap size={14} /> CLAIMABLE YIELD
            </h3>
            <p className={styles.tokenValue} style={{ color: '#818cf8' }}>
              {totalPendingDisplay} <span style={{ fontSize: '0.8rem', color: '#4338ca', fontWeight: 'normal' }}>GKY</span>
            </p>
          </div>
        </div>

        {/* GLOBAL ACTIONS */}
        <div style={{ display: 'flex', gap: '20px', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '25px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', flexWrap: 'wrap', marginBottom: '40px', backdropFilter: 'blur(10px)' }}>
          <div style={{ flex: 1, minWidth: '300px', display: 'flex', gap: '10px', flexDirection: 'column' }}>
            <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold', color: '#6366f1', marginLeft: '5px' }}>Network Referral Manager</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input 
                type="text" 
                placeholder="Friend's NFT ID or Address" 
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
               className="!bg-indigo-600 !hover:bg-indigo-500 !text-white !w-full !py-4 !rounded-2xl !text-lg !font-black !uppercase !italic !shadow-lg"
            >
              CLAIM ALL YIELD
            </Web3Button>
          </div>
        </div>

        {/* SECTION 1: WALLET */}
        <h2 style={{ fontSize: '1.5rem', fontWeight: '900', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px', textTransform: 'uppercase', fontStyle: 'italic', color: '#818cf8' }}>
          <Wallet size={20} /> Unstaked Assets <span style={{ fontSize: '0.8rem', background: '#312e81', color: '#c7d2fe', padding: '2px 8px', borderRadius: '10px', fontStyle: 'normal' }}>{walletNfts?.length || 0}</span>
        </h2>
        
        {loadingNfts ? <p style={{ color: '#64748b', textAlign: 'center', padding: '40px', letterSpacing: '2px', fontWeight: 'bold', textTransform: 'uppercase' }}>Syncing Inventory...</p> : 
         walletNfts?.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '30px', border: '2px dashed #334155', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
            No Standard Tier NFTs detected
          </div>
        ) : (
          <div className={styles.nftBoxGrid}>
            {walletNfts?.map(nft => (
              <div key={nft.metadata.id} className={styles.nftBox} style={{ borderRadius: '24px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ height: '240px', overflow: 'hidden', position: 'relative', background: '#020617' }}>
                   {/* GIF Support via ThirdwebNftMedia */}
                   <ThirdwebNftMedia metadata={nft.metadata} className={styles.nftMedia} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                   <div style={{ position: 'absolute', top: '15px', right: '15px', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)', padding: '4px 8px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 'bold', fontFamily: 'monospace', color: '#818cf8', border: '1px solid rgba(255,255,255,0.1)' }}>
                     #{nft.metadata.id}
                   </div>
                </div>
                <div style={{ padding: '20px' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: '900', marginBottom: '15px', fontStyle: 'italic', textTransform: 'uppercase' }}>{nft.metadata.name}</h3>
                  
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '8px' }}>Select Vault Term</label>
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
                    <div style={{ textAlign: 'center', fontSize: '0.7rem', color: '#4ade80', marginTop: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', background: 'rgba(74, 222, 128, 0.05)', padding: '6px', borderRadius: '8px', border: '1px solid rgba(74, 222, 128, 0.1)' }}>
                      Est. Yield: {(selectedPlan[nft.metadata.id] || 0) === 0 ? "10%" : (selectedPlan[nft.metadata.id] || 0) === 1 ? "12%" : "15%"} Monthly
                    </div>
                  </div>

                  <Web3Button 
                    contractAddress={STAKING_CONTRACT_ADDRESS}
                    contractAbi={STAKING_POOL_ABI}
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
          <Shield size={20} /> Active Standard Vaults <span style={{ fontSize: '0.8rem', background: '#14532d', color: '#86efac', padding: '2px 8px', borderRadius: '10px', fontStyle: 'normal' }}>{stakedNFTs.length}</span>
        </h2>

        {loadingStakes ? <p style={{ color: '#64748b' }}>Accessing Vault...</p> : 
         stakedNFTs.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '30px', border: '2px dashed #334155', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
            No assets currently earning yield
          </div>
        ) : (
           <div className={styles.nftBoxGrid}>
             {stakedNFTs.map(stake => (
               <div key={stake.tokenId.toString()} className={styles.nftBox} style={{ borderRadius: '24px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)', position: 'relative' }}>
                 <div style={{ position: 'absolute', top: '15px', right: '15px', background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', border: '1px solid rgba(34, 197, 94, 0.3)', padding: '4px 10px', borderRadius: '8px', fontSize: '0.65rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '4px', zIndex: 10, backdropFilter: 'blur(5px)' }}>
                   <Zap size={14} /> EARNING
                 </div>
                 
                 <div style={{ padding: '25px', paddingTop: '50px' }}>
                   <h3 style={{ fontSize: '1.5rem', fontWeight: '900', marginBottom: '5px', fontStyle: 'italic', textTransform: 'uppercase' }}>Token #{stake.tokenId.toString()}</h3>
                   <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '20px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
                     {stake.planIndex.toString() === "0" ? "90 Day Vault" : stake.planIndex.toString() === "1" ? "180 Day Vault" : "365 Day Vault"}
                   </div>

                   <div style={{ background: '#020617', borderRadius: '16px', padding: '15px', marginBottom: '20px', border: '1px solid #1e293b' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '1px' }}>Yield Earned</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'monospace', fontSize: '1.1rem', color: '#4ade80', fontWeight: 'bold' }}>
                           <LiveReward stake={stake} /> <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 'normal' }}>GKY</span>
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '1px' }}>Vault Unlock</span>
                        <UnlockTimer endTime={stake.lockEndTime} />
                      </div>
                   </div>

                   <Web3Button 
                     contractAddress={STAKING_CONTRACT_ADDRESS}
                     contractAbi={STAKING_POOL_ABI}
                     action={c => c.call("unstake", [[NFT_DROP_ADDRESS], [stake.tokenId]])}
                     isDisabled={Math.floor(Date.now()/1000) < parseInt(stake.lockEndTime.toString())}
                     className={`!w-full !font-black !rounded-xl !py-4 !text-sm !uppercase !italic !transition-all ${
                        Math.floor(Date.now()/1000) < parseInt(stake.lockEndTime.toString()) 
                        ? "!bg-slate-800 !text-slate-600 !cursor-not-allowed" 
                        : "!bg-red-600 !hover:bg-red-500 !text-white !shadow-lg"
                     }`}
                   >
                     Unstake & Claim
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

export default StandardStake;
