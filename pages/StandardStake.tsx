

import {
    ConnectWallet, ThirdwebNftMedia, useAddress, useContract, useContractRead,
    Web3Button, useNFT,
} from "@thirdweb-dev/react";
import { BigNumber, ethers } from "ethers";
import type { NextPage } from "next";
import { STAKING_POOL_ABI, REFERRAL_MANAGER_ABI } from "../constants/abis";
import styles from "../styles/Home.module.css";
import React, { useEffect, useState } from "react"; // Added useEffect and useState

// --- NEW HELPER COMPONENT to load and display one NFT ---
// This component fetches and displays a single NFT,
// and checks if it belongs in this pool.
const NftCard = ({ tokenId, minvalue, maxval, stakingContractAddress }: any) => {
    const { contract: nftDropContract } = useContract(
        "0x106fb804D03D4EA95CaeFA45C3215b57D8E6835D",
        "nft-drop" // We still use "nft-drop" to get the ABI
    );
    
    // useNFT hook fetches metadata for a single token ID
    const { data: nft, isLoading } = useNFT(nftDropContract, tokenId);

    // Filter logic is now INSIDE the card
    if (isLoading) return <div className={styles.nftBox}><p>Loading NFT...</p></div>;
    if (!nft) return null;

    const idNumber = Number(nft.metadata.id);
    if (idNumber < minvalue || idNumber > maxval) {
        // This NFT is not for this pool, don't show it
        return null;
    }

    // This is a valid, unstaked NFT for this pool
    return (
        <div className={styles.nftBox} key={nft.metadata.id.toString()}>
            <ThirdwebNftMedia
                metadata={nft.metadata}
                className={styles.nftMedia}
            />
            <h3>{nft.metadata.name}</h3>
            <Web3Button
                contractAddress={stakingContractAddress}
                contractAbi={STAKING_POOL_ABI}
                action={(contract) => contract.call("stake", [[nft.metadata.id]])}
            >
                Stake
            </Web3Button>
        </div>
    );
};

// --- STAKED NFT HELPER (Unstake Card) ---
// This is the same as your old `StakedNftCard` component.
const StakedNftCard = ({ tokenId, stakingContractAddress }: any) => {
    const { contract: nftDropContract } = useContract("0x106fb804D03D4EA95CaeFA45C3215b57D8E6835D", "nft-drop");
    const { data: nft } = useNFT(nftDropContract, tokenId);
    return (
        <div className={styles.nftBox}>
            {nft ? (
                <>
                    <ThirdwebNftMedia metadata={nft.metadata} className={styles.nftMedia} />
                    <h3>{nft.metadata.name}</h3>
                    <Web3Button
                        contractAddress={stakingContractAddress}
                        contractAbi={STAKING_POOL_ABI}
                        action={(contract) => contract.call("unstake", [[nft.metadata.id]])}
                        onSuccess={() => alert("Unstake Successful!")}
                        onError={(error) => alert(`Error: ${error.message}`)}
                    >Unstake (Take)</Web3Button>
                </>
            ) : (<p>Loading Staked NFT...</p>)}
        </div>
    );
};


// --- MAIN STAKE PAGE COMPONENT ---
const Stake: NextPage = () => {
    
    // --- !!! STEP 1: CONFIGURE THIS PAGE !!! ---
    // You MUST change these 4 values for each of the 6 pages
    // For StarterStake.tsx, this is correct:
    const PAGE_NAME = "Standard";
    const stakingContractAddress = "0x8157481610c639D210d74FA8419308DAAaAD566a";
    const referralManagerAddress = "0xF6EeC70971B7769Db3a7F3daffCF8F00AfeF47b9";
    const minvalue = 2000001;
    const maxval = 3000000;
    // --- END CONFIGURATION ---


    // --- Core Contract Hooks ---
    const address = useAddress();
    const { contract: nftDropContract } = useContract("0x106fb804D03D4EA95CaeFA45C3215b57D8E6835D", "nft-drop");
    const { contract: tokenContract } = useContract("0x64487539aa9d61Bdc652A5755bbe30Ee96cFcEb2", "token");
    const { contract: stakingContract } = useContract(stakingContractAddress, STAKING_POOL_ABI);
    const { contract: referralContract } = useContract(referralManagerAddress, REFERRAL_MANAGER_ABI);

    // --- Data Read Hooks ---
    const { data: tokenBalance, isLoading: tisLoading } = useTokenBalance(tokenContract, address);
    const { data: claimableRewards } = useContractRead(stakingContract, "calculateRewards", [address]);
    const { data: stakedTokenIds, isLoading: stisLoading } = useContractRead(stakingContract, "getStakedTokenIds", [address]);

    
    // --- NEW NFT FETCHING LOGIC ---
    // This replaces the broken `useOwnedNFTs` hook
    const [ownedNftIds, setOwnedNftIds] = useState<number[]>([]);
    const [isLoadingNfts, setIsLoadingNfts] = useState(true);

    // 1. Get the total number of NFTs the user owns
    const { data: nftBalance } = useContractRead(
        nftDropContract, 
        "balanceOf", 
        [address]
    );

    // 2. Manually fetch all NFT IDs owned by the user
    useEffect(() => {
        if (!nftBalance || !nftDropContract || !address) {
            setIsLoadingNfts(false);
            return;
        }

        const fetchNfts = async () => {
            setIsLoadingNfts(true);
            const ids: number[] = [];
            // Get total number of NFTs
            const balance = nftBalance.toNumber ? nftBalance.toNumber() : 0; 

            for (let i = 0; i < balance; i++) {
                try {
                    // Get the token ID at index i for the user
                    const tokenId = await nftDropContract.call("tokenOfOwnerByIndex", [address, i]);
                    if (tokenId) {
                        ids.push(tokenId.toNumber());
                    }
                } catch (error) {
                    console.error("Error fetching token ID by index", error);
                }
            }
            setOwnedNftIds(ids);
            setIsLoadingNfts(false);
        };

        fetchNfts();
    }, [nftBalance, nftDropContract, address]);
    // --- END OF NEW NFT FETCHING LOGIC ---


    return (
        <div className={address ? "stake loadingstake" : "stake loadingstake"}>
            <div className={!address ? "stakeaa loadingstakea" : ""}><{!address ? (<div className="connect"> <ConnectWallet /> </div>) : (<div className={styles.container}><div className=""> <ConnectWallet /> </div><h1 className={styles.h1}>Stake Your {PAGE_NAME} NFTs</h1>
                
                <h2 className={styles.h2}>Your Tokens</h2>
                <div className={styles.tokenGrid}>
                    <div className={styles.tokenItem}><h3 className={styles.tokenLabel}>Claimable Rewards</h3><p className={styles.tokenValue}><b>{claimableRewards ? ethers.utils.formatUnits(claimableRewards, 18) : "0.0"}</b>{" "}{tokenBalance?.symbol}</p></div>
                    <div className={styles.tokenItem}><h3 className={styles.tokenLabel}>Current Balance</h3><p className={styles.tokenValue}><b>{tisLoading ? "Loading..." : tokenBalance?.displayValue}</b> {tokenBalance?.symbol}</p></div>
                </div>
                <Web3Button contractAddress={stakingContractAddress} contractAbi={STAKING_POOL_ABI} action={(contract) => contract.call("claimReward")} onSuccess={() => alert("Rewards Claimed!")} onError={(error) => alert(`Error: ${error.message}`)}>Claim Rewards</Web3Button>
                
                <h2 className={styles.h2}>Refer a Friend</h2>
                <p>Link your wallet to the friend who referred you (one time only).</p>
                <div className={styles.tokenGrid}>
                    <input type="text" placeholder="Friend's NFT ID" id="referral-id-input" style={{ fontSize: "1.2rem", padding: "10px", marginRight: "10px", borderRadius: "8px", border: "1px solid #ccc", width: "100%" }} />
                    <Web3Button contractAddress={referralManagerAddress} contractAbi={REFERRAL_MANAGER_ABI} action={async (contract) => { const nftId = (document.getElementById("referral-id-input") as HTMLInputElement).value; if (!nftId) { alert("Please enter a valid NFT ID"); return; } await contract.call("register", [nftId]); }} onSuccess={() => alert("Registration Successful!")} onError={(error) => alert(`Error: ${error.message}`)}>Register Referral</Web3Button>
                </div>
                
                {/* --- THIS SECTION IS NOW UPDATED --- */}
                <h2 className={styles.h2}>Your Unstaked {PAGE_NAME} NFTs</h2>
                <div className={styles.nftBoxGrid}>
                    {isLoadingNfts ? (
                        <p>Loading your NFTs...</p>
                    ) : (
                        ownedNftIds.length > 0 ? (
                            ownedNftIds.map((tokenId) => (
                                <NftCard
                                    key={tokenId}
                                    tokenId={tokenId}
                                    minvalue={minvalue}
                                    maxval={maxval}
                                    stakingContractAddress={stakingContractAddress}
                                />
                            ))
                        ) : (
                            <p>You do not have any unstaked {PAGE_NAME} NFTs in your wallet.</p>
                        )
                    )}
                </div>

                {/* --- THIS SECTION IS UNCHANGED --- */}
                <h2 className={styles.h2}>Your Staked {PAGE_NAME} NFTs</h2>
                {stisLoading ? "Loading..." : (
                    <div className={styles.nftBoxGrid}>
                        {stakedTokenIds && stakedTokenIds.length > 0 ? (
                            stakedTokenIds.map((nftId: BigNumber) => (
                                <StakedNftCard 
                                    key={nftId.toString()} 
                                    tokenId={nftId} 
                                    stakingContractAddress={stakingContractAddress}
                                />
                            ))
                        ) : (
                            <p>You have not staked any NFTs in this pool yet.</p>
                        )
                    }
                    </div>
                )}
            </div>)}</div>
        </div>
    );
};
export default Stake;