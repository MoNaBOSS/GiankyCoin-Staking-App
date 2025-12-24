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

// --- CHANGE THIS FOR OTHER PAGES (e.g. "Standard", "VIP") ---
const PAGE_NAME = "Starter";

// --- INTERNAL COMPONENTS (Do not move these) ---

const LiveReward = ({ stake }: { stake: any }) => {
  const [reward, setReward] = useState("0.000000");
  useEffect(() => {
    const update = () => {
      try {
        const now = Math.floor(Date.now() / 1000);
        const lastClaim = parseInt(stake.lastClaimTime.toString());
        const elapsed = now > lastClaim ? now - lastClaim : 0;
        const rate = parseFloat(ethers.utils.formatEther(stake.rewardRate));
        setReward((elapsed * rate).toFixed(6));
      } catch (e) { setReward("0.00"); }
    };
    const timer = setInterval(update, 1000);
    update();
    return () => clearInterval(timer);
  }, [stake]);
  return <span>{reward}</span>;
};

const UnlockTimer = ({ endTime }: { endTime: any }) => {
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    const tick = () => {
      const now = Math.floor(Date.now() / 1000);
      const end = parseInt(endTime.toString());
      const diff = end - now;
      if (diff <= 0) { setTimeLeft("UNLOCKED"); return; }
      const d = Math.floor(diff / 86400);
      const h = Math.floor((diff % 86400) / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = Math.floor(diff % 60);
      setTimeLeft(`${d}d ${h}h ${m}m ${s}s`);
    };
    tick(); const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [endTime]);
  return <span style={{ color: timeLeft === "UNLOCKED" ? "#4ade80" : "#ffb703", fontWeight: "bold" }}>{timeLeft}</span>;
};

// --- MAIN PAGE COMPONENT ---

const StarterStake: NextPage = () => {
  const address = useAddress();
  
  // 1. Contract Instances
  const { contract: stakingContract } = useContract(STAKING_CONTRACT_ADDRESS, STAKING_POOL_ABI);
  const { contract: nftContract } = useContract(NFT_DROP_ADDRESS, "nft-drop");
  const { contract: tokenContract } = useContract(TOKEN_CONTRACT_ADDRESS, "token");

  // 2. Data Fetching
  const { data: ownedNfts, isLoading: loadingNfts } = useNFTs(nftContract);
  const { data: tokenBalance } = useTokenBalance(tokenContract, address);
  
  // 3. V5 Unified State Fetch (Massive Performance Boost)
  const { data: userFullState, isLoading: loadingStakes } = useContractRead(stakingContract, "getUserFullState", [address]);

  // 4. State Parsing
  const stakedNFTs = useMemo(() => (userFullState ? userFullState[0] : []) as any[], [userFullState]);
  const totalPending = useMemo(() => {
    if (!userFullState || !userFullState[1]) return "0.00";
    return parseFloat(ethers.utils.formatEther(userFullState[1])).toFixed(4);
  }, [userFullState]);

  const [selectedPlan, setSelectedPlan] = useState<{[id: string]: number}>({});
  const [refInput, setRefInput] = useState("");

  const walletNfts = ownedNfts?.filter(nft => nft.owner === address);

  return (
    <div className={styles.container}>
      <Nav />
      <div className={styles.stakeContainer}>
        
        {/* HEADER & WALLET */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <h1 className={styles.title}>{PAGE_NAME} Dashboard</h1>
          <ConnectWallet theme="dark" />
        </div>

        {/* METRICS GRID */}
        <div className={styles.tokenGrid}>
          <div className={styles.tokenItem}>
            <h3 className={styles.tokenLabel}>Staked Assets</h3>
            <p className={styles.tokenValue}>{stakedNFTs.length}</p>
          </div>
          <div className={styles.tokenItem}>
             <h3 className={styles.tokenLabel}>Balance</h3>
             <p className={styles.tokenValue}>{tokenBalance?.displayValue.slice(0, 6)} GIAN</p>
          </div>
          <div className={styles.tokenItem}>
             <h3 className={styles.tokenLabel}>Claimable Yield</h3>
             <p className={styles.tokenValue} style={{ color: '#4ade80' }}>{totalPending} GKY</p>
          </div>
        </div>

        {/* GLOBAL ACTIONS (Referral & Claim) */}
        <div style={{ display: 'flex', gap: '15px', background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '15px', marginTop: '20px', flexWrap: 'wrap' }}>
           <div style={{ flex: 1, display: 'flex', gap: '10px' }}>
              <input type="text" placeholder="Referrer ID" value={refInput} onChange={e => setRefInput(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #333', background: '#000', color: 'white' }} />
              <Web3Button contractAddress={REFERRAL_MANAGER_ADDRESS} contractAbi={REFERRAL_MANAGER_ABI} action={c => c.call("register", [refInput])}>Register</Web3Button>
           </div>
           <Web3Button 
              contractAddress={STAKING_CONTRACT_ADDRESS} 
              action={c => c.call("claimReward", [stakedNFTs.map(s => s.collection), stakedNFTs.map(s => s.tokenId)])}
              isDisabled={stakedNFTs.length === 0}
           >
             Claim All Rewards
           </Web3Button>
        </div>

        <hr className={styles.divider} style={{ margin: '40px 0', opacity: 0.2 }} />

        {/* SECTION A: WALLET (UNSTAKED) */}
        <h2 className={styles.h2}>Your Wallet</h2>
        {loadingNfts ? <p>Loading assets...</p> : walletNfts?.length === 0 ? <p>No {PAGE_NAME} NFTs found.</p> : (
          <div className={styles.nftBoxGrid}>
            {walletNfts?.map(nft => (
              <div key={nft.metadata.id} className={styles.nftBox}>
                <ThirdwebNftMedia metadata={nft.metadata} className={styles.nftMedia} style={{ height: '200px', width: '100%', objectFit: 'cover', borderRadius: '10px' }} />
                <div style={{ padding: '15px' }}>
                  <h3 style={{ margin: '0 0 10px' }}>{nft.metadata.name}</h3>
                  
                  {/* Plan Selector */}
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ fontSize: '12px', color: '#888' }}>SELECT PLAN:</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '5px', marginTop: '5px' }}>
                      {[0, 1, 2].map(i => (
                        <button 
                          key={i} 
                          onClick={() => setSelectedPlan({...selectedPlan, [nft.metadata.id]: i})}
                          style={{ 
                            padding: '8px', 
                            borderRadius: '5px', 
                            border: (selectedPlan[nft.metadata.id] || 0) === i ? '1px solid #6366f1' : '1px solid #333',
                            background: (selectedPlan[nft.metadata.id] || 0) === i ? '#4f46e5' : 'transparent',
                            color: 'white',
                            cursor: 'pointer'
                          }}
                        >
                          {i === 0 ? "3M" : i === 1 ? "6M" : "12M"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Web3Button 
                    contractAddress={STAKING_CONTRACT_ADDRESS} 
                    action={async (c) => {
                      // 1. Approve
                      const approved = await nftContract?.isApproved(address, STAKING_CONTRACT_ADDRESS);
                      if (!approved) await nftContract?.setApprovalForAll(STAKING_CONTRACT_ADDRESS, true);
                      // 2. Stake (V5 Array Format)
                      await c.call("stake", [[NFT_DROP_ADDRESS], [nft.metadata.id], selectedPlan[nft.metadata.id] || 0]);
                    }}
                    style={{ width: '100%' }}
                  >
                    Stake NFT
                  </Web3Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* SECTION B: VAULT (STAKED) */}
        <h2 className={styles.h2} style={{ marginTop: '40px' }}>Active Vaults</h2>
        {loadingStakes ? <p>Loading stakes...</p> : stakedNFTs.length === 0 ? <p>No active stakes.</p> : (
           <div className={styles.nftBoxGrid}>
             {stakedNFTs.map(stake => (
               <div key={stake.tokenId.toString()} className={styles.nftBox} style={{ border: '1px solid #333' }}>
                 <div style={{ padding: '20px' }}>
                   <h3>Token #{stake.tokenId.toString()}</h3>
                   
                   <div style={{ background: '#000', padding: '15px', borderRadius: '10px', margin: '15px 0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <span style={{ color: '#888' }}>Yield</span>
                        <span style={{ color: '#4ade80', fontWeight: 'bold' }}><LiveReward stake={stake} /></span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#888' }}>Unlock</span>
                        <UnlockTimer endTime={stake.lockEndTime} />
                      </div>
                   </div>

                   <Web3Button 
                     contractAddress={STAKING_CONTRACT_ADDRESS} 
                     action={c => c.call("unstake", [[NFT_DROP_ADDRESS], [stake.tokenId]])} 
                     isDisabled={Math.floor(Date.now()/1000) < parseInt(stake.lockEndTime.toString())}
                     style={{ width: '100%' }}
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

export default StarterStake;