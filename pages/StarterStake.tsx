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
const minvalue = 1;
const maxval = 1000000;

// Helper Component
const NftCard = ({ tokenId }: { tokenId: number }) => {
    const { contract } = useContract(nftDropContractAddress);
    const { data: nft } = useNFT(contract, tokenId);
    if (!nft) return null;
    return (
        <div className={styles.nftBox}>
            <ThirdwebNftMedia metadata={nft.metadata} className={styles.nftMedia} />
            <h3>{nft.metadata.name}</h3>
            <p>ID: {nft.metadata.id}</p> {/* SHOW ID ON SCREEN */}
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
    
    // --- SUPER DEBUGGER STATE ---
    const [statusLog, setStatusLog] = useState<string>("Waiting...");
    const [foundLog, setFoundLog] = useState<string>("");

    useEffect(() => {
        if (!address || !nftDropContract) {
            setStatusLog("Connecting to wallet/contract...");
            return;
        }

        const fetchNfts = async () => {
            setLoadingNfts(true);
            setStatusLog("Step 1: Checking Balance...");
            try {
                // 1. Check Balance
                const balanceBN = await nftDropContract.call("balanceOf", [address]);
                const balance = Number(balanceBN);
                
                setStatusLog(`Step 2: Balance is ${balance}. Scanning IDs...`);

                const foundIds = [];
                let logString = "";

                // 2. Loop
                for (let i = 0; i < balance; i++) {
                    try {
                        const tokenId = await nftDropContract.call("tokenOfOwnerByIndex", [address, i]);
                        const idNum = Number(tokenId);
                        
                        logString += `[#${idNum}] `; // Add to log
                        
                        // Filter
                        if (idNum >= minvalue && idNum <= maxval) {
                            foundIds.push(idNum);
                        }
                    } catch (err) {
                        console.error(err);
                    }
                }
                
                setFoundLog(logString || "No IDs returned.");
                if (balance > 0 && foundIds.length === 0) {
                    setStatusLog(`Finished. Found ${balance} NFTs but IDs didn't match range (${minvalue}-${maxval}).`);
                } else {
                    setStatusLog(`Finished. Showing ${foundIds.length} NFTs.`);
                }
                
                setOwnedIds(foundIds);
            } catch (error) {
                setStatusLog("CRITICAL ERROR: Contract call failed. " + error);
            }
            setLoadingNfts(false);
        };

        fetchNfts();
    }, [address, nftDropContract]);

    return (
        <div className={styles.container}>
            <div style={{display: 'flex', justifyContent: 'space-between'}}> <ConnectWallet /> </div>
            <h1 className={styles.h1}>Stake Your {PAGE_NAME} NFTs</h1>
            
            {/* --- RED DEBUG BOX --- */}
            <div style={{background: '#330000', border: '1px solid red', padding: '15px', marginBottom: '20px'}}>
                <h3 style={{color: 'red', margin: 0}}>DEBUGGER REPORT:</h3>
                <p style={{color: '#ffcccc', margin: '5px 0'}}><strong>Status:</strong> {statusLog}</p>
                <p style={{color: '#ffcccc', margin: '5px 0'}}><strong>All IDs in Wallet:</strong> {foundLog}</p>
                <p style={{color: '#888', fontSize: '12px'}}>Wallet Connected: {address}</p>
                <p style={{color: '#888', fontSize: '12px'}}>Checking Contract: {nftDropContractAddress}</p>
            </div>
            {/* --------------------- */}

            <h2 className={styles.h2}>Your Unstaked {PAGE_NAME} NFTs</h2>
            <div className={styles.nftBoxGrid}>
                {loadingNfts ? <p>Scanning wallet...</p> : (
                    ownedIds.length > 0 ? ownedIds.map((id) => (
                        <NftCard key={id} tokenId={id} />
                    )) : <p>No {PAGE_NAME} NFTs found.</p>
                )}
            </div>
            
            {/* Other sections... */}
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
    );
};

export default Stake;