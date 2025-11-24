import {
    ConnectWallet, ThirdwebNftMedia, useAddress, useContract, 
    useContractRead, useTokenBalance, Web3Button, useNFT
} from "@thirdweb-dev/react";
import { BigNumber, ethers } from "ethers";
import type { NextPage } from "next";
import { useEffect, useState } from "react";
import { STAKING_POOL_ABI, REFERRAL_MANAGER_ABI } from "../constants/abis";
import styles from "../styles/Home.module.css";

// --- CONFIGURATION ---
const PAGE_NAME = "Starter";
const nftDropContractAddress = "0x106fb804D03D4EA95CaeFA45C3215b57D8E6835D";
const stakingContractAddress = "0x76Ca881a2455441869fC35ec1B54997A8252F59C"; 
const referralManagerAddress = "0xF6EeC70971B7769Db3a7F3daffCF8F00AfeF47b9";
const tokenContractAddress = "0x64487539aa9d61Bdc652A5755bbe30Ee96cFcEb2";
const minvalue = 1;
const maxval = 1000000;

// !!! 🔴 PASTE YOUR ALCHEMY API KEY HERE !!!
const ALCHEMY_KEY = "Xx_szvkGT0KJ5CT7ZdoHY"; 

const NftCard = ({ tokenId }: { tokenId: number }) => {
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
                action={(contract) => contract.call("stake", [[nft.metadata.id]])}
            >Stake</Web3Button>
        </div>
    );
};

const StakedNftCard = ({ tokenId }: { tokenId: number }) => {
    const { contract } = useContract(nftDropContractAddress);
    const { data: nft } = useNFT(contract, tokenId);
    if (!nft) return null;
    return (
        <div className={styles.nftBox}>
            <ThirdwebNftMedia metadata={nft.metadata} className={styles.nftMedia} />
            <h3>{nft.metadata.name}</h3>
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
    const { contract: tokenContract } = useContract(tokenContractAddress, "token");
    const { contract: stakingContract } = useContract(stakingContractAddress, STAKING_POOL_ABI);
    const { data: tokenBalance, isLoading: tisLoading } = useTokenBalance(tokenContract, address);
    const { data: claimableRewards } = useContractRead(stakingContract, "calculateRewards", [address]);
    const { data: stakedTokens, isLoading: stisLoading } = useContractRead(stakingContract, "getStakedTokenIds", [address]);

    const [ownedIds, setOwnedIds] = useState<number[]>([]);
    const [loadingNfts, setLoadingNfts] = useState(false);

    // --- ALCHEMY SCANNER ---
    useEffect(() => {
        if (!address) return;
        const fetchNftsFromAlchemy = async () => {
            setLoadingNfts(true);
            try {
                // This URL asks Alchemy for the list
                const baseURL = `https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}/getNFTs/`;
                const url = `${baseURL}?owner=${address}&contractAddresses[]=${nftDropContractAddress}&withMetadata=false`;

                const response = await fetch(url);
                const data = await response.json();

                if (data.ownedNfts) {
                    const validIds = data.ownedNfts
                        .map((nft: any) => parseInt(nft.id.tokenId, 16)) // Convert Hex ID to Number
                        .filter((id: number) => id >= minvalue && id <= maxval); // Filter for this pool
                    
                    setOwnedIds(validIds);
                }
            } catch (error) {
                console.error("Alchemy Scan Failed:", error);
            }
            setLoadingNfts(false);
        };
        fetchNftsFromAlchemy();
    }, [address]);

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

                        <h2 className={styles.h2}>Your Tokens</h2>
                        <div className={styles.tokenGrid}>
                            <div className={styles.tokenItem}>
                                <h3 className={styles.tokenLabel}>Claimable Rewards</h3>
                                <p className={styles.tokenValue}><b>{claimableRewards ? ethers.utils.formatUnits(claimableRewards, 18) : "0.0"}</b> {tokenBalance?.symbol}</p>
                            </div>
                            <div className={styles.tokenItem}>
                                <h3 className={styles.tokenLabel}>Current Balance</h3>
                                <p className={styles.tokenValue}><b>{tisLoading ? "..." : tokenBalance?.displayValue}</b> {tokenBalance?.symbol}</p>
                            </div>
                        </div>

                        <div style={{textAlign: 'center', marginTop: '20px'}}>
                            <Web3Button contractAddress={stakingContractAddress} contractAbi={STAKING_POOL_ABI} action={(contract) => contract.call("claimReward")}>Claim Rewards</Web3Button>
                        </div>

                        <hr className={`${styles.divider} ${styles.spacerTop}`} />
                        <h2 className={styles.h2}>Refer a Friend</h2>
                        <div className={styles.tokenGrid}>
                            <input type="text" placeholder="Friend's NFT ID" id="referral-id" />
                            <Web3Button contractAddress={referralManagerAddress} contractAbi={REFERRAL_MANAGER_ABI} action={async (c) => { const val = (document.getElementById("referral-id") as HTMLInputElement).value; await c.call("register", [val]); }}>Register Referral</Web3Button>
                        </div>

                        <hr className={`${styles.divider} ${styles.spacerTop}`} />
                        <h2 className={styles.h2}>Your Unstaked {PAGE_NAME} NFTs</h2>
                        <div className={styles.nftBoxGrid}>
                            {loadingNfts ? <p>Scanning...</p> : (
                                ownedIds.length > 0 ? ownedIds.map((id) => (
                                    <NftCard key={id} tokenId={id} />
                                )) : <p>No {PAGE_NAME} NFTs found.</p>
                            )}
                        </div>

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