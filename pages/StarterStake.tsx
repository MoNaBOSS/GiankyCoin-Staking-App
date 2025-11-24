import {
    ConnectWallet, ThirdwebNftMedia, useAddress, useContract, 
    useContractRead, useTokenBalance, Web3Button, useNFT
} from "@thirdweb-dev/react";
import { BigNumber, ethers } from "ethers";
import type { NextPage } from "next";
import { useEffect, useState } from "react";
import { STAKING_POOL_ABI, REFERRAL_MANAGER_ABI } from "../constants/abis";
import styles from "../styles/Home.module.css";

const PAGE_NAME = "Starter";
const nftDropContractAddress = "0x106fb804D03D4EA95CaeFA45C3215b57D8E6835D";
const stakingContractAddress = "0x76Ca881a2455441869fC35ec1B54997A8252F59C"; 
const referralManagerAddress = "0xF6EeC70971B7769Db3a7F3daffCF8F00AfeF47b9";
const tokenContractAddress = "0x64487539aa9d61Bdc652A5755bbe30Ee96cFcEb2";

// Helper Component for Staked NFT
const StakedNftCard = ({ tokenId }: { tokenId: number }) => {
    const { contract } = useContract(nftDropContractAddress);
    const { data: nft } = useNFT(contract, tokenId);

    if (!nft) return null;

    return (
        <div className={styles.nftBox}>
            <ThirdwebNftMedia metadata={nft.metadata} className={styles.nftMedia} />
            <h3>{nft.metadata.name}</h3>
            <p style={{color:'#888', fontSize:'0.9rem'}}>ID: {nft.metadata.id}</p>
            <Web3Button
                contractAddress={stakingContractAddress}
                contractAbi={STAKING_POOL_ABI}
                action={(contract) => contract.call("unstake", [[nft.metadata.id]])}
            >Unstake (Take)</Web3Button>
        </div>
    );
};

// Helper to Preview NFT before staking
const NftPreview = ({ tokenId }: { tokenId: string }) => {
    const { contract } = useContract(nftDropContractAddress);
    const { data: nft, isLoading } = useNFT(contract, tokenId);

    if (!tokenId) return null;
    if (isLoading) return <p>Loading Preview...</p>;
    if (!nft) return <p>Invalid ID or NFT not found.</p>;

    return (
        <div style={{marginTop: '20px', border: '1px solid #333', padding: '20px', borderRadius: '10px', textAlign: 'center', background: '#111'}}>
            <h3 style={{marginTop:0}}>Preview</h3>
            <div style={{maxWidth: '200px', margin: '0 auto'}}>
                 <ThirdwebNftMedia metadata={nft.metadata} className={styles.nftMedia} />
            </div>
            <p><strong>{nft.metadata.name}</strong></p>
        </div>
    );
};

const Stake: NextPage = () => {
    const address = useAddress();
    const { contract: nftDropContract } = useContract(nftDropContractAddress);
    const { contract: tokenContract } = useContract(tokenContractAddress, "token");
    const { contract: stakingContract } = useContract(stakingContractAddress, STAKING_POOL_ABI);
    const { data: tokenBalance, isLoading: tisLoading } = useTokenBalance(tokenContract, address);
    const { data: claimableRewards } = useContractRead(stakingContract, "calculateRewards", [address]);
    const { data: stakedTokens, isLoading: stisLoading } = useContractRead(stakingContract, "getStakedTokenIds", [address]);

    const [manualId, setManualId] = useState("");

    // Function to handle APPROVE + STAKE
    const handleStake = async () => {
        if(!manualId) return alert("Please enter an ID");
        
        try {
            // 1. Check Approval (Optional logic, but safer to just try staking directly first)
            // If the stake fails, we catch the error and suggest approval.
            await stakingContract?.call("stake", [[Number(manualId)]]);
            alert("Success! NFT Staked.");
            setManualId("");
        } catch (err: any) {
            console.error(err);
            // If error contains "approved", tell user to approve
            if(JSON.stringify(err).includes("approve") || JSON.stringify(err).includes("transfer caller is not owner nor approved")) {
                alert("APPROVAL NEEDED: Please go to PolygonScan and 'SetApprovalForAll' for the Staking Contract.");
                window.open(`https://polygonscan.com/address/${nftDropContractAddress}#writeContract`, '_blank');
            } else {
                alert("Error staking. Make sure you own this ID and it is unstaked.");
            }
        }
    };

    return (
        <div className={address ? "stake loadingstake" : "stake loadingstake"}>
            <div className={!address ? "stakeaa loadingstakea" : ""}>
                {!address ? (
                    <div className="connect"> <ConnectWallet /> </div>
                ) : (
                    <div className={styles.container}>
                        <div className=""> <ConnectWallet /> </div>
                        <h1 className={styles.h1}>Stake Your {PAGE_NAME} NFTs</h1>
                        <hr className={`${styles.divider} ${styles.spacerTop}`} />

                        {/* --- TOKENS --- */}
                        <h2 className={styles.h2}>Your Tokens</h2>
                        <div className={styles.tokenGrid}>
                            <div className={styles.tokenItem}>
                                <h3 className={styles.tokenLabel}>Claimable Rewards</h3>
                                <p className={styles.tokenValue}>
                                    <b>{claimableRewards ? ethers.utils.formatUnits(claimableRewards, 18) : "0.0"}</b> {tokenBalance?.symbol}
                                </p>
                            </div>
                            <div className={styles.tokenItem}>
                                <h3 className={styles.tokenLabel}>Current Balance</h3>
                                <p className={styles.tokenValue}>
                                    <b>{tisLoading ? "Loading..." : tokenBalance?.displayValue}</b> {tokenBalance?.symbol}
                                </p>
                            </div>
                        </div>

                        <div style={{textAlign: 'center', marginTop: '20px'}}>
                            <Web3Button
                                contractAddress={stakingContractAddress}
                                contractAbi={STAKING_POOL_ABI}
                                action={(contract) => contract.call("claimReward")}
                            >Claim Rewards</Web3Button>
                        </div>

                        {/* --- REFERRAL --- */}
                        <hr className={`${styles.divider} ${styles.spacerTop}`} />
                        <h2 className={styles.h2}>Refer a Friend</h2>
                        <div className={styles.tokenGrid}>
                            <input type="text" placeholder="Friend's NFT ID" id="referral-id" />
                            <Web3Button
                                contractAddress={referralManagerAddress}
                                contractAbi={REFERRAL_MANAGER_ABI}
                                action={async (c) => {
                                    const val = (document.getElementById("referral-id") as HTMLInputElement).value;
                                    await c.call("register", [val]);
                                }}
                            >Register Referral</Web3Button>
                        </div>

                        {/* --- MANUAL ID STAKE WITH PREVIEW --- */}
                        <hr className={`${styles.divider} ${styles.spacerTop}`} />
                        <h2 className={styles.h2}>Stake by ID</h2>
                        <p>Enter your NFT ID below to verify and stake it.</p>
                        <div className={styles.tokenGrid}>
                            <input 
                                type="text" 
                                placeholder="Enter NFT ID (e.g. 28)" 
                                value={manualId}
                                onChange={(e) => setManualId(e.target.value)}
                            />
                            <button onClick={handleStake}>Stake This ID</button>
                        </div>
                        
                        {/* SHOW PREVIEW OF THE GIF IF ID IS ENTERED */}
                        {manualId && <NftPreview tokenId={manualId} />}

                        {/* --- STAKED NFTs --- */}
                        <hr className={`${styles.divider} ${styles.spacerTop}`} />
                        <h2 className={styles.h2}>Your Staked {PAGE_NAME} NFTs</h2>
                         {stisLoading ? <p>Loading...</p> : (
                            <div className={styles.nftBoxGrid}>
                            {stakedTokens && stakedTokens.length > 0 ? 
                            stakedTokens.map((stakedToken: BigNumber) => (
                                <StakedNftCard key={stakedToken.toString()} tokenId={stakedToken.toNumber()} />
                            )) : <p>No NFTs staked.</p>}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Stake;