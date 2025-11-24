import {
    ConnectWallet,
    ThirdwebNftMedia,
    useAddress,
    useContract,
    useContractRead,
    useTokenBalance,
    Web3Button,
    useNFT,
} from "@thirdweb-dev/react";
import { BigNumber, ethers } from "ethers";
import type { NextPage } from "next";
import { useEffect, useState } from "react";
import { STAKING_POOL_ABI, REFERRAL_MANAGER_ABI } from "../constants/abis";
import styles from "../styles/Home.module.css";

// --- CONFIGURATION FOR STARTER POOL ---
const PAGE_NAME = "Starter";
const nftDropContractAddress = "0x106fb804D03D4EA95CaeFA45C3215b57D8E6835D";
const stakingContractAddress = "0x76Ca881a2455441869fC35ec1B54997A8252F59C";
const referralManagerAddress = "0xF6EeC70971B7769Db3a7F3daffCF8F00AfeF47b9";
const tokenContractAddress = "0x64487539aa9d61Bdc652A5755bbe30Ee96cFcEb2";
const minvalue = 1;
const maxval = 1000000;

// YOUR ALCHEMY KEY (Pre-filled)
const ALCHEMY_KEY = "Xx_szvkGT0KJ5CT7ZdoHY";
// --------------------------------------

// --- COMPONENT: Unstaked NFT Card (Approve + Stake) ---
const NftCard = ({ tokenId }: { tokenId: number }) => {
    const { contract: nftContract } = useContract(nftDropContractAddress);
    const { contract: stakingContract } = useContract(stakingContractAddress, STAKING_POOL_ABI);
    const { data: nft } = useNFT(nftContract, tokenId);

    if (!nft) return null;

    // 1. Approve Function
    const handleApprove = async () => {
        try {
            const confirm = window.confirm("Step 1: Approve the Staking Contract to move your items. Proceed?");
            if (!confirm) return;
            
            // Call setApprovalForAll on the NFT contract
            await nftContract?.call("setApprovalForAll", [stakingContractAddress, true]);
            alert("✅ Approval Successful! Now click 'Stake'.");
        } catch (err) {
            console.error(err);
            alert("Approval Failed. Check Console.");
        }
    };

    // 2. Stake Function
    const handleStake = async () => {
        try {
            // Direct call to ensure array format is correct: [[id]]
            await stakingContract?.call("stake", [[tokenId]]);
            alert("✅ Success! NFT Staked.");
        } catch (err: any) {
            console.error(err);
            // If error mentions approval, remind them
            if (JSON.stringify(err).includes("approved")) {
                alert("⚠️ You must click '1. Approve' first!");
            } else {
                alert("Stake Failed. Check Console.");
            }
        }
    };

    return (
        <div className={styles.nftBox}>
            <ThirdwebNftMedia metadata={nft.metadata} className={styles.nftMedia} />
            <h3>{nft.metadata.name}</h3>
            <p style={{ color: '#888', fontSize: '0.9rem', margin: '0 0 15px 0' }}>ID: {nft.metadata.id}</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Step 1: Approve Button (Outlined Style) */}
                <button
                    onClick={handleApprove}
                    style={{
                        background: 'transparent',
                        border: '1px solid #6a5acd',
                        color: '#6a5acd',
                        padding: '8px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                    }}
                >
                    1. Approve Wallet
                </button>

                {/* Step 2: Stake Button (Solid Style) */}
                <button
                    onClick={handleStake}
                    style={{
                        background: '#6a5acd',
                        border: 'none',
                        color: 'white',
                        padding: '10px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                    }}
                >
                    2. Stake NFT
                </button>
            </div>
        </div>
    );
};

// --- COMPONENT: Staked NFT Card (Unstake) ---
const StakedNftCard = ({ tokenId }: { tokenId: number }) => {
    const { contract: nftContract } = useContract(nftDropContractAddress);
    const { contract: stakingContract } = useContract(stakingContractAddress, STAKING_POOL_ABI);
    const { data: nft } = useNFT(nftContract, tokenId);

    if (!nft) return null;

    const handleUnstake = async () => {
        try {
            await stakingContract?.call("unstake", [[tokenId]]);
            alert("✅ Unstaked Successfully!");
        } catch (err) {
            console.error(err);
            alert("Unstake Failed.");
        }
    };

    return (
        <div className={styles.nftBox}>
            <ThirdwebNftMedia metadata={nft.metadata} className={styles.nftMedia} />
            <h3>{nft.metadata.name}</h3>
            <p style={{ color: '#888', fontSize: '0.9rem', margin: '0 0 15px 0' }}>ID: {nft.metadata.id}</p>
            
            <button
                onClick={handleUnstake}
                style={{
                    background: '#333',
                    border: '1px solid #555',
                    color: 'white',
                    padding: '10px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    width: '100%'
                }}
            >
                Unstake (Take)
            </button>
        </div>
    );
};

// --- MAIN PAGE ---
const Stake: NextPage = () => {
    const address = useAddress();

    // Contract Hooks
    const { contract: tokenContract } = useContract(tokenContractAddress, "token");
    const { contract: stakingContract } = useContract(stakingContractAddress, STAKING_POOL_ABI);
    
    // Data Hooks
    const { data: tokenBalance, isLoading: tisLoading } = useTokenBalance(tokenContract, address);
    const { data: claimableRewards } = useContractRead(stakingContract, "calculateRewards", [address]);
    const { data: stakedTokens, isLoading: stisLoading } = useContractRead(stakingContract, "getStakedTokenIds", [address]);

    // Scanner State
    const [ownedIds, setOwnedIds] = useState<number[]>([]);
    const [loadingNfts, setLoadingNfts] = useState(false);

    // Alchemy Automated Scanner
    useEffect(() => {
        if (!address) return;

        const fetchNftsFromAlchemy = async () => {
            setLoadingNfts(true);
            try {
                const baseURL = `https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}/getNFTs/`;
                const url = `${baseURL}?owner=${address}&contractAddresses[]=${nftDropContractAddress}&withMetadata=false`;

                const response = await fetch(url);
                const data = await response.json();

                if (data.ownedNfts) {
                    const validIds = data.ownedNfts
                        .map((nft: any) => parseInt(nft.id.tokenId, 16))
                        .filter((id: number) => id >= minvalue && id <= maxval);

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
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <ConnectWallet />
                        </div>
                        
                        <h1 className={styles.h1}>Stake Your {PAGE_NAME} NFTs</h1>
                        <hr className={`${styles.divider} ${styles.spacerTop}`} />

                        {/* REWARDS SECTION */}
                        <h2 className={styles.h2}>Your Tokens</h2>
                        <div className={styles.tokenGrid}>
                            <div className={styles.tokenItem}>
                                <h3 className={styles.tokenLabel}>Claimable Rewards</h3>
                                <p className={styles.tokenValue}>
                                    <b>{claimableRewards ? ethers.utils.formatUnits(claimableRewards, 18) : "0.0"}</b> GKY
                                </p>
                            </div>
                            <div className={styles.tokenItem}>
                                <h3 className={styles.tokenLabel}>Current Balance</h3>
                                <p className={styles.tokenValue}>
                                    <b>{tisLoading ? "..." : tokenBalance?.displayValue}</b> {tokenBalance?.symbol}
                                </p>
                            </div>
                        </div>

                        <div style={{ textAlign: 'center', marginTop: '20px' }}>
                            <Web3Button
                                contractAddress={stakingContractAddress}
                                contractAbi={STAKING_POOL_ABI}
                                action={(contract) => contract.call("claimReward")}
                            >
                                Claim Rewards
                            </Web3Button>
                        </div>

                        {/* REFERRAL SECTION */}
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
                            >
                                Register Referral
                            </Web3Button>
                        </div>

                        {/* UNSTAKED SECTION (Alchemy Powered) */}
                        <hr className={`${styles.divider} ${styles.spacerTop}`} />
                        <h2 className={styles.h2}>Your Unstaked {PAGE_NAME} NFTs</h2>
                        <div className={styles.nftBoxGrid}>
                            {loadingNfts ? <p>Scanning wallet...</p> : (
                                ownedIds.length > 0 ? ownedIds.map((id) => (
                                    <NftCard key={id} tokenId={id} />
                                )) : <p>No {PAGE_NAME} NFTs found in wallet.</p>
                            )}
                        </div>

                        {/* STAKED SECTION */}
                        <hr className={`${styles.divider} ${styles.spacerTop}`} />
                        <h2 className={styles.h2}>Your Staked {PAGE_NAME} NFTs</h2>
                        {stisLoading ? <p>Loading...</p> : (
                            <div className={styles.nftBoxGrid}>
                                {stakedTokens && stakedTokens.length > 0 ?
                                    stakedTokens.map((stakedToken: BigNumber) => (
                                        <StakedNftCard key={stakedToken.toString()} tokenId={stakedToken.toNumber()} />
                                    )) : <p>No NFTs staked.</p>
                                }
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Stake;