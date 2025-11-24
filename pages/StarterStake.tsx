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

const Stake: NextPage = () => {
    const address = useAddress();
    
    // Contracts
    const { contract: nftDropContract } = useContract(nftDropContractAddress);
    const { contract: tokenContract } = useContract(tokenContractAddress, "token");
    const { contract: stakingContract } = useContract(stakingContractAddress, STAKING_POOL_ABI);

    // Reads
    const { data: tokenBalance, isLoading: tisLoading } = useTokenBalance(tokenContract, address);
    const { data: claimableRewards } = useContractRead(stakingContract, "calculateRewards", [address]);
    const { data: stakedTokens, isLoading: stisLoading } = useContractRead(stakingContract, "getStakedTokenIds", [address]);

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

                        {/* --- NEW: MANUAL ID STAKE --- */}
                        <hr className={`${styles.divider} ${styles.spacerTop}`} />
                        <h2 className={styles.h2}>Stake by ID</h2>
                        <p>Can't see your NFT above? Enter the ID manually to stake.</p>
                        <div className={styles.tokenGrid}>
                            <input type="text" placeholder="Enter NFT ID (e.g. 28)" id="stake-id-input" />
                            <Web3Button
                                contractAddress={stakingContractAddress}
                                contractAbi={STAKING_POOL_ABI}
                                action={async (contract) => {
                                    const val = (document.getElementById("stake-id-input") as HTMLInputElement).value;
                                    if(!val) return alert("Enter an ID");
                                    await contract.call("stake", [[val]]);
                                }}
                            >Stake This ID</Web3Button>
                        </div>

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