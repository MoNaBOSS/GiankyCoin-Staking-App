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
// NOTE: I removed "nft-drop" to force Thirdweb to detect the contract type automatically
const nftDropContractAddress = "0x106fb804D03D4EA95CaeFA45C3215b57D8E6835D";
const stakingContractAddress = "0x76Ca881a2455441869fC35ec1B54997A8252F59C";
const referralManagerAddress = "0xF6EeC70971B7769Db3a7F3daffCF8F00AfeF47b9";
const tokenContractAddress = "0x64487539aa9d61Bdc652A5755bbe30Ee96cFcEb2";
const minvalue = 1;
const maxval = 1000000;

// --- Helper Components ---
const NftCard = ({ tokenId }: { tokenId: number }) => {
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
    const { contract: nftDropContract } = useContract(nftDropContractAddress);
    const { contract: tokenContract } = useContract(tokenContractAddress, "token");
    const { contract: stakingContract } = useContract(stakingContractAddress, STAKING_POOL_ABI);
    const { data: tokenBalance, isLoading: tisLoading } = useTokenBalance(tokenContract, address);
    const { data: claimableRewards } = useContractRead(stakingContract, "calculateRewards", [address]);
    const { data: stakedTokens, isLoading: stisLoading } = useContractRead(stakingContract, "getStakedTokenIds", [address]);

    const [ownedIds, setOwnedIds] = useState<number[]>([]);
    const [loadingNfts, setLoadingNfts] = useState(false);
    const [debugLog, setDebugLog] = useState<string>("Initializing..."); // ON-SCREEN DEBUGGER

    useEffect(() => {
        if (!address) {
            setDebugLog("Wallet not connected.");
            return;
        }
        if (!nftDropContract) {
            setDebugLog("Waiting for NFT Contract connection...");
            return;
        }

        const fetchNfts = async () => {
            setLoadingNfts(true);
            setDebugLog("Starting Scan...");
            try {
                // 1. Get Balance
                console.log("Asking for balance...");
                const balanceBN = await nftDropContract.call("balanceOf", [address]);
                const balance = Number(balanceBN);
                console.log("User owns:", balance);
                setDebugLog(`User owns ${balance} NFTs. Scanning IDs...`);

                const foundIds = [];
                // 2. Loop through IDs
                for (let i = 0; i < balance; i++) {
                    try {
                        console.log(`Checking index ${i}...`);
                        // This line is the likely failure point
                        const tokenId = await nftDropContract.call("tokenOfOwnerByIndex", [address, i]);
                        const idNum = Number(tokenId);
                        console.log(`Found ID: ${idNum}`);
                        
                        if (idNum >= minvalue && idNum <= maxval) {
                            foundIds.push(idNum);
                        }
                    } catch (innerErr) {
                        console.error(`Failed to read index ${i}`, innerErr);
                        setDebugLog(`Error reading NFT at index ${i}. Contract might not support enumeration.`);
                    }
                }
                setOwnedIds(foundIds);
                setDebugLog(`Scan Complete. Found ${foundIds.length} valid NFTs.`);
            } catch (error) {
                console.error("Critical Error scanning wallet:", error);
                setDebugLog("CRITICAL ERROR: Could not read contract. Check Console.");
            }
            setLoadingNfts(false);
        };

        fetchNfts();
    }, [address, nftDropContract]);

    return (
        <div className={styles.container}>
            <div style={{display: 'flex', justifyContent: 'space-between'}}> <ConnectWallet /> </div>
            <h1 className={styles.h1}>Stake Your {PAGE_NAME} NFTs</h1>
            
            {/* DEBUGGER BOX - SHOWS ERRORS ON SCREEN */}
            <div style={{background: '#330000', color: '#ffaaaa', padding: '10px', borderRadius: '5px', marginBottom: '20px', fontFamily: 'monospace'}}>
                <strong>DEBUG STATUS:</strong> {debugLog}
            </div>

            <h2 className={styles.h2}>Your Unstaked {PAGE_NAME} NFTs</h2>
            <div className={styles.nftBoxGrid}>
                {loadingNfts ? <p>Scanning wallet...</p> : (
                    ownedIds.length > 0 ? ownedIds.map((id) => (
                        <NftCard key={id} tokenId={id} />
                    )) : <p>No {PAGE_NAME} NFTs found.</p>
                )}
            </div>
            
            <h2 className={styles.h2}>Your Staked {PAGE_NAME} NFTs</h2>
            <div className={styles.nftBoxGrid}>
                 {stisLoading ? <p>Loading...</p> : (
                    stakedTokens && stakedTokens.length > 0 ? 
                    stakedTokens.map((stakedToken: BigNumber) => (
                        <StakedNftCard key={stakedToken.toString()} tokenId={stakedToken.toNumber()} />
                    )) : <p>No NFTs staked.</p>
                )}
            </div>
        </div>
    );
};

export default Stake;