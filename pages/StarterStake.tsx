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

// --- SUB-COMPONENTS ---
const LiveReward = ({ stake }: { stake: any }) => {
  const [reward, setReward] = useState("0.000000");
  useEffect(() => {
    const update = () => {
      const now = Math.floor(Date.now() / 1000);
      const lastClaim = parseInt(stake.lastClaimTime.toString());
      const elapsed = now > lastClaim ? now - lastClaim : 0;
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
  return <span style={{ color: timeLeft === "UNLOCKED" ? "#4ade80" : "#fbbf24", fontWeight: "bold" }}>{timeLeft}</span>;
};

// --- MAIN PAGE ---
const StarterStake: NextPage = () => {
  const address = useAddress();
  const { contract: stakingContract } = useContract(STAKING_CONTRACT_ADDRESS, STAKING_POOL_ABI);
  const { contract: nftContract } = useContract(NFT_DROP_ADDRESS, "nft-drop");
  const { contract: tokenContract } = useContract(TOKEN_CONTRACT_ADDRESS, "token");

  const { data: ownedNfts, isLoading: loadingNfts } = useNFTs(nftContract);
  const { data: tokenBalance } = useTokenBalance(tokenContract, address);
  const { data: userFullState, isLoading: loadingStakes } = useContractRead(stakingContract, "getUserFullState", [address]);

  const stakedNFTs = useMemo(() => (userFullState ? userFullState[0] : []) as any[], [userFullState]);
  const [selectedPlan, setSelectedPlan] = useState<{[id: string]: number}>({});
  const [refInput, setRefInput] = useState("");

  const walletNfts = ownedNfts?.filter(nft => nft.owner === address);
  const totalPendingDisplay = useMemo(() => {
    if (!userFullState || !userFullState[1]) return "0.00";
    return (parseInt(userFullState[1].toString()) / 1e18).toFixed(4);
  }, [userFullState]);

  return (
    <div className={styles.container}>
      <Nav />
      <div className={styles.stakeContainer}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <h1 className={styles.title}>{PAGE_NAME} Staking</h1>
          <ConnectWallet theme="dark" />
        </div>

        <div className={styles.tokenGrid}>
          <div className={styles.tokenItem}>
            <h3 className={styles.tokenLabel}>Staked Assets</h3>
            <p className={styles.tokenValue}>{stakedNFTs.length}</p>
          </div>
          <div className={styles.tokenItem}>
             <h3 className={styles.tokenLabel}>Wallet Balance</h3>
             <p className={styles.tokenValue}>{tokenBalance?.displayValue.slice(0, 6)} GIAN</p>
          </div>
          <div className={styles.tokenItem}>
             <h3 className={styles.tokenLabel}>Total Pending</h3>
             <p className={styles.tokenValue} style={{ color: '#4ade80' }}>{totalPendingDisplay} GKY</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '20px', background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px', marginTop: '20px', flexWrap: 'wrap' }}>
           <div style={{ flex: 1, display: 'flex', gap: '10px' }}>
              <input type="text" placeholder="Referrer Address" value={refInput} onChange={e => setRefInput(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '8px', background: '#111', color: 'white', border: '1px solid #333' }} />
              <Web3Button contractAddress={REFERRAL_MANAGER_ADDRESS} contractAbi={REFERRAL_MANAGER_ABI} action={c => c.call("register", [refInput])}>Register</Web3Button>
           </div>
           <Web3Button contractAddress={STAKING_CONTRACT_ADDRESS} action={c => c.call("claimReward", [stakedNFTs.map(s => s.collection), stakedNFTs.map(s => s.tokenId)])} isDisabled={stakedNFTs.length === 0}>Claim All Yield</Web3Button>
        </div>

        <hr className={styles.divider} style={{ margin: '40px 0' }} />

        <h2>Your Wallet (Unstaked)</h2>
        {loadingNfts ? <p>Scanning wallet...</p> : walletNfts?.length === 0 ? <p>No NFTs found.</p> : (
          <div className={styles.nftBoxGrid}>
            {walletNfts?.map(nft => (
              <div key={nft.metadata.id} className={styles.nftBox}>
                <ThirdwebNftMedia metadata={nft.metadata} style={{ height: '200px', width: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                <div style={{ padding: '15px' }}>
                  <h3 style={{ margin: '10px 0' }}>{nft.metadata.name}</h3>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ fontSize: '10px', color: '#888' }}>SELECT PLAN</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '5px', marginTop: '5px' }}>
                      {[0, 1, 2].map(i => (
                        <button key={i} onClick={() => setSelectedPlan({...selectedPlan, [nft.metadata.id]: i})} style={{ padding: '8px 0', borderRadius: '6px', border: (selectedPlan[nft.metadata.id] || 0) === i ? '1px solid #6366f1' : '1px solid #333', background: (selectedPlan[nft.metadata.id] || 0) === i ? '#4f46e5' : 'transparent', color: 'white', fontSize: '10px' }}>{i === 0 ? "3M" : i === 1 ? "6M" : "12M"}</button>
                      ))}
                    </div>
                  </div>
                  <Web3Button contractAddress={STAKING_CONTRACT_ADDRESS} action={async c => {
                    const approved = await nftContract?.isApproved(address || "", STAKING_CONTRACT_ADDRESS);
                    if (!approved) await nftContract?.setApprovalForAll(STAKING_CONTRACT_ADDRESS, true);
                    await c.call("stake", [[NFT_DROP_ADDRESS], [nft.metadata.id], selectedPlan[nft.metadata.id] || 0]);
                  }} style={{ width: '100%' }}>Approve & Stake</Web3Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <h2 style={{ marginTop: '40px' }}>Active Vaults (Staked)</h2>
        {loadingStakes ? <p>Loading vault data...</p> : stakedNFTs.length === 0 ? <p>No assets earning yield.</p> : (
           <div className={styles.nftBoxGrid}>
             {stakedNFTs.map(stake => (
               <div key={stake.tokenId.toString()} className={styles.nftBox} style={{ border: '1px solid #333' }}>
                 <div style={{ padding: '20px' }}>
                   <h3>Token #{stake.tokenId.toString()}</h3>
                   <div style={{ background: '#000', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px' }}>
                        <span style={{ color: '#888' }}>Yield</span>
                        <span style={{ color: '#4ade80', fontWeight: 'bold' }}><LiveReward stake={stake} /> GKY</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                        <span style={{ color: '#888' }}>Unlock In</span>
                        <UnlockTimer endTime={stake.lockEndTime} />
                      </div>
                   </div>
                   <Web3Button contractAddress={STAKING_CONTRACT_ADDRESS} action={c => c.call("unstake", [[NFT_DROP_ADDRESS], [stake.tokenId]])} isDisabled={Math.floor(Date.now()/1000) < parseInt(stake.lockEndTime.toString())} style={{ width: '100%' }}>Unstake & Claim</Web3Button>
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