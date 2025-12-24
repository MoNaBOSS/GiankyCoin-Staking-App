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

const PAGE_NAME = "Starter"; 

interface StakeInfo {
  tokenId: BigNumber;
  stakedAt: BigNumber;
  lastClaimTime: BigNumber;
  lockEndTime: BigNumber;
  rewardRate: BigNumber;
  planIndex: BigNumber;
}

// --- HELPER COMPONENTS ---

const Countdown = ({ targetDate }: { targetDate: number }) => {
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    const tick = () => {
      const now = Math.floor(Date.now() / 1000);
      const diff = targetDate - now;
      if (diff <= 0) {
        setTimeLeft("UNLOCKED");
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
  }, [targetDate]);
  
  return <span style={{ color: timeLeft === "UNLOCKED" ? "#4caf50" : "#ff9800", fontWeight: "bold", fontFamily: 'monospace' }}>{timeLeft}</span>;
};

const LiveReward = ({ stake }: { stake: StakeInfo }) => {
  const [reward, setReward] = useState("0.000000");
  useEffect(() => {
    const update = () => {
      const now = Date.now() / 1000;
      const elapsed = now - stake.lastClaimTime.toNumber();
      const rate = parseFloat(ethers.utils.formatEther(stake.rewardRate));
      setReward((elapsed * rate).toFixed(6));
    };
    const timer = setInterval(update, 100);
    update();
    return () => clearInterval(timer);
  }, [stake]);
  return <span>{reward}</span>;
};

// --- MAIN PAGE ---

const StarterStake: NextPage = () => {
  const address = useAddress();
  
  // Hooks
  const { contract: stakingContract } = useContract(STAKING_CONTRACT_ADDRESS, STAKING_POOL_ABI);
  const { contract: nftContract } = useContract(NFT_DROP_ADDRESS, "nft-drop");
  const { contract: tokenContract } = useContract(TOKEN_CONTRACT_ADDRESS, "token");

  const { data: ownedNfts, isLoading: loadingNfts } = useNFTs(nftContract);
  const { data: tokenBalance } = useTokenBalance(tokenContract, address);
  
  // V5 Optimized Fetch
  const { data: userFullState, isLoading: loadingStakes } = useContractRead(stakingContract, "getUserFullState", [address]);

  const stakedNFTs = useMemo(() => (userFullState ? userFullState[0] : []) as StakeInfo[], [userFullState]);
  const [selectedPlan, setSelectedPlan] = useState<{[id: string]: number}>({});
  const [referralId, setReferralId] = useState("");

  const displayNfts = ownedNfts?.filter(nft => nft.owner === address); 

  return (
    <div className={styles.container}>
      <Nav />
      <div className={styles.stakeContainer}>
        <div className={styles.header}>
          <h1 className={styles.title}>{PAGE_NAME} Staking</h1>
          <ConnectWallet theme="dark" />
        </div>

        <hr className={styles.divider} />

        <div className={styles.tokenGrid}>
          <div className={styles.tokenItem}>
            <h3 className={styles.tokenLabel}>Staked Count</h3>
            <p className={styles.tokenValue}>{stakedNFTs.length}</p>
          </div>
          <div className={styles.tokenItem}>
            <h3 className={styles.tokenLabel}>Wallet Balance</h3>
            <p className={styles.tokenValue}>
              {tokenBalance?.displayValue.slice(0, 6)} {tokenBalance?.symbol}
            </p>
          </div>
        </div>

        <div style={{ textAlign: "center", margin: "20px 0" }}>
           <Web3Button
              contractAddress={STAKING_CONTRACT_ADDRESS}
              contractAbi={STAKING_POOL_ABI}
              action={(c) => c.call("claimReward", [stakedNFTs.map(s => s.tokenId)])}
              isDisabled={stakedNFTs.length === 0}
              className={styles.claimBtn}
           >
             Claim All Rewards
           </Web3Button>
        </div>

        <hr className={styles.divider} />

        <div className={styles.referralSection} style={{padding: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px'}}>
           <h3>Referral Program</h3>
           <div style={{display:'flex', gap:'10px', marginTop:'10px'}}>
             <input 
               type="text" 
               placeholder="Referrer Address" 
               value={referralId}
               onChange={(e) => setReferralId(e.target.value)}
               style={{padding:'10px', borderRadius:'5px', border:'none', flex:1, background: '#222', color: 'white'}}
             />
             <Web3Button
               contractAddress={REFERRAL_MANAGER_ADDRESS}
               contractAbi={REFERRAL_MANAGER_ABI}
               action={(c) => c.call("register", [referralId])}
             >
               Register
             </Web3Button>
           </div>
        </div>

        <hr className={styles.divider} />

        <h2>Your Unstaked NFTs</h2>
        <div className={styles.nftBoxGrid}>
          {loadingNfts ? <p>Loading...</p> : 
           !address ? <p>Connect Wallet</p> :
           displayNfts?.length === 0 ? <p>No NFTs found.</p> :
           displayNfts?.map((nft) => (
             <div key={nft.metadata.id} className={styles.nftBox}>
               <ThirdwebNftMedia metadata={nft.metadata} className={styles.nftMedia} />
               <h3>{nft.metadata.name}</h3>
               
               <div style={{margin: '10px 0'}}>
                 <label style={{fontSize:'12px', color:'#aaa'}}>Select Plan:</label>
                 <select 
                   style={{width:'100%', padding:'8px', marginTop:'5px', background:'#222', color:'#fff', border:'1px solid #444', borderRadius:'5px'}}
                   onChange={(e) => setSelectedPlan({...selectedPlan, [nft.metadata.id]: parseInt(e.target.value)})}
                   value={selectedPlan[nft.metadata.id] || 0}
                 >
                   <option value={0}>3 Months (10%)</option>
                   <option value={1}>6 Months (12%)</option>
                   <option value={2}>12 Months (15%)</option>
                 </select>
               </div>

               <Web3Button
                 contractAddress={STAKING_CONTRACT_ADDRESS}
                 contractAbi={STAKING_POOL_ABI}
                 action={async (contract) => {
                   const isApproved = await nftContract?.isApproved(address, STAKING_CONTRACT_ADDRESS);
                   if (!isApproved) await nftContract?.setApprovalForAll(STAKING_CONTRACT_ADDRESS, true);
                   await contract.call("stake", [[nft.metadata.id], selectedPlan[nft.metadata.id] || 0]);
                 }}
               >
                 Stake NFT
               </Web3Button>
             </div>
           ))
          }
        </div>

        <hr className={styles.divider} />

        <h2>Your Staked NFTs</h2>
        <div className={styles.nftBoxGrid}>
           {loadingStakes ? <p>Loading...</p> :
            stakedNFTs.length === 0 ? <p>No staked NFTs.</p> :
            stakedNFTs.map((stake) => (
              <div key={stake.tokenId.toString()} className={styles.nftBox} style={{borderColor: '#4caf50'}}>
                <div style={{position:'absolute', top:10, right:10, background:'rgba(76, 175, 80, 0.2)', color: '#4caf50', padding:'2px 8px', borderRadius:'4px', fontSize:'10px', fontWeight: 'bold', border: '1px solid #4caf50'}}>STAKED</div>
                
                {/* Visual Placeholder for Staked Item */}
                <div style={{height: '180px', background: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', marginBottom: '10px'}}>
                   <span style={{fontSize: '40px'}}>🦍</span>
                </div>

                <h3>Token #{stake.tokenId.toString()}</h3>
                
                <div style={{background: 'rgba(0,0,0,0.3)', padding:'10px', borderRadius:'5px', margin:'10px 0'}}>
                   <div style={{display:'flex', justifyContent:'space-between', fontSize:'12px'}}>
                      <span style={{color: '#aaa'}}>Pending:</span>
                      <span style={{color:'#4caf50', fontWeight:'bold'}}><LiveReward stake={stake} /></span>
                   </div>
                   <div style={{display:'flex', justifyContent:'space-between', fontSize:'12px', marginTop:'5px'}}>
                      <span style={{color: '#aaa'}}>Unlock:</span>
                      <Countdown targetDate={stake.lockEndTime.toNumber()} />
                   </div>
                </div>

                <Web3Button
                  contractAddress={STAKING_CONTRACT_ADDRESS}
                  contractAbi={STAKING_POOL_ABI}
                  action={(c) => c.call("unstake", [[stake.tokenId]])}
                  isDisabled={Date.now() / 1000 < stake.lockEndTime.toNumber()}
                  style={{opacity: Date.now() / 1000 < stake.lockEndTime.toNumber() ? 0.5 : 1}}
                >
                  Unstake & Claim
                </Web3Button>
              </div>
            ))
           }
        </div>
      </div>
    </div>
  );
};

export default StarterStake;