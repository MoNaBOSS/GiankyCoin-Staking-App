import {
  useAddress,
  useContract,
  useContractRead,
  useNFTs,
  useTokenBalance,
  Web3Button,
  ThirdwebNftMedia,
} from "@thirdweb-dev/react";
import { BigNumber, ethers } from "ethers";
import type { NextPage } from "next";
import { useEffect, useState, useMemo } from "react";
import styles from "../styles/Home.module.css";

// --- CONTRACT CONFIG ---
const STAKING_CONTRACT_ADDRESS = "0x0901d6c6c2a7e42cfe9319f7d76d073499d402ab";
const NFT_COLLECTION_ADDRESS = "0x106fb804D03D4EA95CaeFA45C3215b57D8E6835D"; // Update if standard tier uses different address
const TOKEN_CONTRACT_ADDRESS = "0x64487539aa9d61Bdc652A5755bbe30Ee96cFcEb2";
const REFERRAL_MANAGER_ADDRESS = "0xF6EeC70971B7769Db3a7F3daffCF8F00AfeF47b9";

const PAGE_NAME = "Standard";

// --- HELPERS ---
const LiveReward = ({ stake }: { stake: any }) => {
    const [reward, setReward] = useState("0.00");
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

const Stake: NextPage = () => {
    const address = useAddress();
    const [selectedPlan, setSelectedPlan] = useState<{[key: string]: number}>({});

    // Contracts
    const { contract: stakingContract } = useContract(STAKING_CONTRACT_ADDRESS);
    const { contract: nftContract } = useContract(NFT_COLLECTION_ADDRESS, "nft-drop");
    const { contract: tokenContract } = useContract(TOKEN_CONTRACT_ADDRESS, "token");

    // Data Fetching
    const { data: ownedNfts, isLoading: loadingNfts } = useNFTs(nftContract);
    const { data: tokenBalance, isLoading: tisLoading } = useTokenBalance(tokenContract, address);
    
    // V5 State Fetch (Stakes + Pending Rewards)
    const { data: userFullState, isLoading: stisLoading } = useContractRead(
        stakingContract, 
        "getUserFullState", 
        [address]
    );

    const stakedNFTs = useMemo(() => (userFullState ? userFullState[0] : []) as any[], [userFullState]);
    const claimableRewards = userFullState ? userFullState[1] : BigNumber.from(0);

    return (
        <div className={styles.container}>
            <div className={styles.stakeContainer}>
                {!address ? (
                    <p>Please connect your wallet.</p>
                ) : (
                    <div>
                        {/* REWARDS SECTION */}
                        <h2 className={styles.h2}>Your Tokens</h2>
                        <div className={styles.tokenGrid}>
                            <div className={styles.tokenItem}>
                                <h3 className={styles.tokenLabel}>Claimable Rewards</h3>
                                <p className={styles.tokenValue}>
                                    <b>{claimableRewards ? ethers.utils.formatUnits(claimableRewards, 18).slice(0, 8) : "0.0"}</b> GKY
                                </p>
                            </div>
                            <div className={styles.tokenItem}>
                                <h3 className={styles.tokenLabel}>Current Balance</h3>
                                <p className={styles.tokenValue}>
                                    <b>{tisLoading ? "..." : tokenBalance?.displayValue.slice(0, 8)}</b> {tokenBalance?.symbol}
                                </p>
                            </div>
                        </div>

                        <div style={{ textAlign: 'center', marginTop: '20px' }}>
                            <Web3Button
                                contractAddress={STAKING_CONTRACT_ADDRESS}
                                action={(contract) => {
                                    const collections = stakedNFTs.map(s => s.collection);
                                    const ids = stakedNFTs.map(s => s.tokenId);
                                    return contract.call("claimReward", [collections, ids]);
                                }}
                                isDisabled={stakedNFTs.length === 0}
                            >
                                Claim Rewards
                            </Web3Button>
                        </div>

                        {/* REFERRAL SECTION */}
                        <hr className={`${styles.divider} ${styles.spacerTop}`} />
                        <h2 className={styles.h2}>Refer a Friend</h2>
                        <div className={styles.tokenGrid}>
                            <input type="text" placeholder="Friend's NFT ID" id="referral-id" className={styles.input} />
                            <Web3Button
                                contractAddress={REFERRAL_MANAGER_ADDRESS}
                                action={async (c) => {
                                    const val = (document.getElementById("referral-id") as HTMLInputElement).value;
                                    await c.call("register", [val]);
                                }}
                            >
                                Register Referral
                            </Web3Button>
                        </div>

                        {/* UNSTAKED SECTION */}
                        <hr className={`${styles.divider} ${styles.spacerTop}`} />
                        <h2 className={styles.h2}>Your Unstaked {PAGE_NAME} NFTs</h2>
                        <div className={styles.nftBoxGrid}>
                            {loadingNfts ? <p>Scanning wallet...</p> : (
                                ownedNfts && ownedNfts.length > 0 ? ownedNfts.filter(n => n.owner === address).map((nft) => (
                                    <div key={nft.metadata.id} className={styles.nftBox}>
                                        <ThirdwebNftMedia metadata={nft.metadata} className={styles.nftMedia} />
                                        <h3>{nft.metadata.name}</h3>
                                        <select 
                                            className={styles.selectPlan}
                                            onChange={(e) => setSelectedPlan({...selectedPlan, [nft.metadata.id]: parseInt(e.target.value)})}
                                        >
                                            <option value={0}>3 Months (10%)</option>
                                            <option value={1}>6 Months (12%)</option>
                                            <option value={2}>12 Months (15%)</option>
                                        </select>
                                        <Web3Button
                                            contractAddress={STAKING_CONTRACT_ADDRESS}
                                            action={async (c) => {
                                                const approved = await nftContract?.isApproved(address, STAKING_CONTRACT_ADDRESS);
                                                if (!approved) await nftContract?.setApprovalForAll(STAKING_CONTRACT_ADDRESS, true);
                                                await c.call("stake", [[NFT_COLLECTION_ADDRESS], [nft.metadata.id], selectedPlan[nft.metadata.id] || 0]);
                                            }}
                                        >
                                            Stake NFT
                                        </Web3Button>
                                    </div>
                                )) : <p>No {PAGE_NAME} NFTs found in wallet.</p>
                            )}
                        </div>

                        {/* STAKED SECTION */}
                        <hr className={`${styles.divider} ${styles.spacerTop}`} />
                        <h2 className={styles.h2}>Your Staked {PAGE_NAME} NFTs</h2>
                        <div className={styles.nftBoxGrid}>
                            {stisLoading ? <p>Loading stakes...</p> : (
                                stakedNFTs.length > 0 ? stakedNFTs.map((stake) => (
                                    <div key={stake.tokenId.toString()} className={styles.nftBox} style={{ border: '1px solid #4caf50' }}>
                                        <h3>ID #{stake.tokenId.toString()}</h3>
                                        <div style={{ padding: '10px', fontSize: '14px' }}>
                                            <p>Pending: <b><LiveReward stake={stake} /></b> GKY</p>
                                        </div>
                                        <Web3Button
                                            contractAddress={STAKING_CONTRACT_ADDRESS}
                                            action={(c) => c.call("unstake", [[stake.collection], [stake.tokenId]])}
                                            isDisabled={Math.floor(Date.now()/1000) < parseInt(stake.lockEndTime.toString())}
                                        >
                                            Unstake
                                        </Web3Button>
                                    </div>
                                )) : <p>No NFTs staked.</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Stake;