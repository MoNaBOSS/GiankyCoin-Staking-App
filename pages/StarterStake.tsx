import {
    ConnectWallet, ThirdwebNftMedia, useAddress, useContract, useContractRead,
    Web3Button, useNFT, useTokenBalance
} from "@thirdweb-dev/react";
import { BigNumber, ethers } from "ethers";
import type { NextPage } from "next";
import { STAKING_POOL_ABI, REFERRAL_MANAGER_ABI } from "../constants/abis";
import styles from "../styles/Home.module.css";
import React, { useEffect, useState } from "react";

// --- CONFIGURATION FOR THIS PAGE ---
// Change these 4 lines for each file (Starter, Basic, etc.)
const PAGE_NAME = "Starter";
const stakingContractAddress = "0x76Ca881a2455441869fC35ec1B54997A8252F59C";
const referralManagerAddress = "0xF6EeC70971B7769Db3a7F3daffCF8F00AfeF47b9";
const minvalue = 1;
const maxval = 1000000;
// -----------------------------------

const NftCard = ({ tokenId, minvalue, maxval, stakingContractAddress }: any) => {
    const { contract: nftDropContract } = useContract("0x106fb804D03D4EA95CaeFA45C3215b57D8E6835D", "nft-drop");
    const { data: nft, isLoading } = useNFT(nftDropContract, tokenId);

    if (isLoading || !nft) return null;

    const idNumber = Number(nft.metadata.id);
    if (idNumber < minvalue || idNumber > maxval) return null;

    return (
        <div className={styles.nftBox}>
            <ThirdwebNftMedia metadata={nft.metadata} className={styles.nftMedia} />
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
                    >
                        Unstake (Take)
                    </Web3Button>
                </>
            ) : <p>Loading...</p>}
        </div>
    );
};

const Stake: NextPage = () => {
    const address = useAddress();
    const { contract: nftDropContract } = useContract("0x106fb804D03D4EA95CaeFA45C3215b57D8E6835D", "nft-drop");
    const { contract: tokenContract } = useContract("0x64487539aa9d61Bdc652A5755bbe30Ee96cFcEb2", "token");
    const { contract: stakingContract } = useContract(stakingContractAddress, STAKING_POOL_ABI);
    
    const { data: tokenBalance, isLoading: tisLoading } = useTokenBalance(tokenContract, address);
    const { data: claimableRewards } = useContractRead(stakingContract, "calculateRewards", [address]);
    const { data: stakedTokenIds, isLoading: stisLoading } = useContractRead(stakingContract, "getStakedTokenIds", [address]);

    // --- NEW MANUAL NFT FETCHING ---
    const [ownedIds, setOwnedIds] = useState<string[]>([]);
    const [loadingNfts, setLoadingNfts] = useState(false);

    useEffect(() => {
        if (!address || !nftDropContract) return;

        const fetchNfts = async () => {
            setLoadingNfts(true);
            try {
                // 1. Get Balance
                const balanceBN = await nftDropContract.call("balanceOf", [address]);
                const balance = Number(balanceBN);

                // 2. Loop through every NFT the user owns
                const foundIds = [];
                for (let i = 0; i < balance; i++) {
                    const tokenId = await nftDropContract.call("tokenOfOwnerByIndex", [address, i]);
                    foundIds.push(tokenId);
                }
                setOwnedIds(foundIds);
            } catch (error) {
                console.error("Error fetching NFTs:", error);
            }
            setLoadingNfts(false);
        };

        fetchNfts();
    }, [address, nftDropContract]);
    // -------------------------------

    return (
        <div className={styles.container}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <ConnectWallet />
            </div>

            <h1 className={styles.h1}>Stake Your {PAGE_NAME} NFTs</h1>

            <h2 className={styles.h2}>Your Tokens</h2>
            <div className={styles.tokenGrid}>
                <div className={styles.tokenItem}>
                    <h3 className={styles.tokenLabel}>Claimable Rewards</h3>
                    <p className={styles.tokenValue}>
                        {claimableRewards ? ethers.utils.formatUnits(claimableRewards, 18) : "0.0"} GKY
                    </p>
                </div>
                <div className={styles.tokenItem}>
                    <h3 className={styles.tokenLabel}>Current Balance</h3>
                    <p className={styles.tokenValue}>
                        {tisLoading ? "..." : tokenBalance?.displayValue} {tokenBalance?.symbol}
                    </p>
                </div>
            </div>

            <div style={{ marginTop: '20px', textAlign: 'center' }}>
                <Web3Button 
                    contractAddress={stakingContractAddress} 
                    contractAbi={STAKING_POOL_ABI}
                    action={(contract) => contract.call("claimReward")}
                >
                    Claim Rewards
                </Web3Button>
            </div>

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
                >
                    Register Referral
                </Web3Button>
            </div>

            <h2 className={styles.h2}>Your Unstaked {PAGE_NAME} NFTs</h2>
            <div className={styles.nftBoxGrid}>
                {loadingNfts ? <p>Scanning wallet...</p> : (
                    ownedIds.length > 0 ? ownedIds.map((id: any) => (
                        <NftCard 
                            key={id.toString()} 
                            tokenId={id} 
                            minvalue={minvalue} 
                            maxval={maxval} 
                            stakingContractAddress={stakingContractAddress} 
                        />
                    )) : <p>No {PAGE_NAME} NFTs found in wallet.</p>
                )}
            </div>

            <h2 className={styles.h2}>Your Staked {PAGE_NAME} NFTs</h2>
            <div className={styles.nftBoxGrid}>
                {stisLoading ? <p>Loading...</p> : (
                    stakedTokenIds && stakedTokenIds.length > 0 ? stakedTokenIds.map((id: any) => (
                        <StakedNftCard 
                            key={id.toString()} 
                            tokenId={id} 
                            stakingContractAddress={stakingContractAddress} 
                        />
                    )) : <p>No NFTs staked.</p>
                )}
            </div>
        </div>
    );
};

export default Stake;