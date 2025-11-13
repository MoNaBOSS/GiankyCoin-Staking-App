// --- THIS IS YOUR MASTER STAKING PAGE TEMPLATE ---

import {
    ConnectWallet,
    ThirdwebNftMedia,
    useAddress,
    useContract,
    useContractRead,
    useOwnedNFTs,
    useTokenBalance,
    Web3Button,
    useNFT,
} from "@thirdweb-dev/react";
import { BigNumber, ethers } from "ethers";
import type { NextPage } from "next";
// This imports the ABIs you just created
import { STAKING_POOL_ABI, REFERRAL_MANAGER_ABI } from "../constants/abis"; 
import styles from "../styles/Home.module.css";
import React from "react";

// --- This is a new component to show your STAKED NFTs ---
const StakedNftCard = ({ tokenId, stakingContractAddress }: any) => {
    // This is the client's main NFT contract. It's the same for all pools.
    const { contract: nftDropContract } = useContract(
        "0x106fb804D03D4EA95CaeFA45C3215b57D8E6835D", 
        "nft-drop"
    );
    // This hook fetches the NFT's image and name
    const { data: nft } = useNFT(nftDropContract, tokenId);

    return (
        <div className={styles.nftBox}>
            {nft ? (
                <>
                    <ThirdwebNftMedia metadata={nft.metadata} className={styles.nftMedia} />
                    <h3>{nft.metadata.name}</h3>
                    {/* This is the "Unstake (Take)" button */}
                    <Web3Button
                        contractAddress={stakingContractAddress}
                        contractAbi={STAKING_POOL_ABI} // Uses your new ABI
                        action={(contract) => contract.call("unstake", [[nft.metadata.id]])}
                        onSuccess={() => alert("Unstake Successful!")}
                        onError={(error) => alert(`Error: ${error.message}`)}
                    >
                        Unstake (Take)
                    </Web3Button>
                </>
            ) : (
                <p>Loading Staked NFT...</p>
            )}
        </div>
    );
};
// --- End of helper component ---


// --- This is the Main Page ---
const Stake: NextPage = () => {
    
    // --- !!! THIS IS THE ONLY PART YOU CHANGE !!! ---
    // This is the configuration block for each page.
    
    const PAGE_NAME = "Standard";
    const stakingContractAddress = "0x8157481610c639D210d74FA8419308DAAaAD566a";
    const referralManagerAddress = "0xF6EeC70971B7769Db3a7F3daffCF8F00AfeF47b9";
    const minvalue = 2000001;
    const maxval = 3000000;

    // ---------------------------------------------------
    // (Do not change anything below this line)
    // ---------------------------------------------------

    // Core hooks to connect to the user's wallet and contracts
    const address = useAddress();
    const { contract: nftDropContract } = useContract("0x106fb804D03D4EA95CaeFA45C3215b57D8E6835D", "nft-drop");
    const { contract: tokenContract } = useContract("0x64487539aa9d61Bdc652A5755bbe30Ee96cFcEb2", "token");
    
    // Your new contract hooks (using your new ABIs)
    const { contract: stakingContract } = useContract(stakingContractAddress, STAKING_POOL_ABI);
    const { contract: referralContract } = useContract(referralManagerAddress, REFERRAL_MANAGER_ABI);

    // Data hooks to read info from your contracts
    const { data: ownedNfts } = useOwnedNFTs(nftDropContract, address);
    const { data: tokenBalance, isLoading: tisLoading } = useTokenBalance(tokenContract, address);
    
    // Reads "Claimable Rewards" using your new `calculateRewards` function
    const { data: claimableRewards } = useContractRead(
        stakingContract, 
        "calculateRewards",
        [address]
    );
    
    // Reads "Staked NFTs" using your new `getStakedTokenIds` function
    const { data: stakedTokenIds, isLoading: stisLoading } = useContractRead(
        stakingContract,
        "getStakedTokenIds",
        [address]
    );

    // --- This is the HTML for the page ---
    return (
        <>
            <div className={address ? "stake loadingstake" : "stake loadingstake"}>
                <div className={!address ? "stakeaa loadingstakea" : ""}>
                    {!address ? (
                        // If wallet is not connected, show "Connect" button
                        <div className="connect"> <ConnectWallet /> </div>
                    ) : (
                        // If wallet is connected, show the full dashboard
                        <div className={styles.container}>
                            <div className=""> <ConnectWallet /> </div>
                            <h1 className={styles.h1}>Stake Your {PAGE_NAME} NFTs</h1>
                            <hr className={`${styles.divider} ${styles.spacerTop}`} />

                            <>
                                {/* --- "Claim Rewards" Section --- */}
                                <h2>Your Tokens</h2>
                                <div className={styles.tokenGrid}>
                                    <div className={styles.tokenItem}>
                                        <h3 className={styles.tokenLabel}>Claimable Rewards</h3>
                                        <p className={styles.tokenValue}>
                                            <b>
                                                {claimableRewards ? ethers.utils.formatUnits(claimableRewards, 18) : "0.0"}
                                            </b>{" "}
                                            {tokenBalance?.symbol}
                                        </p>
                                    </div>
                                    <div className={styles.tokenItem}>
                                        <h3 className={styles.tokenLabel}>Current Balance</h3>
                                        <p className={styles.tokenValue}>
                                            <b>{tisLoading ? "Loading..." : tokenBalance?.displayValue}</b> {tokenBalance?.symbol}
                                        </p>
                                    </div>
                                </div>
                                <Web3Button
                                    contractAddress={stakingContractAddress}
                                    contractAbi={STAKING_POOL_ABI}
                                    action={(contract) => contract.call("claimRewards")}
                                    onSuccess={() => alert("Rewards Claimed!")}
                                    onError={(error) => alert(`Error: ${error.message}`)}
                                >
                                    Claim Rewards
                                </Web3Button>

                                {/* --- "Refer a Friend" Section --- */}
                                <hr className={`${styles.divider} ${styles.spacerTop}`} />
                                <h2>Refer a Friend</h2>
                                <p>Link your wallet to the friend who referred you (one time only).</p>
                                <div className={styles.tokenGrid}>
                                    <input 
                                        type="text" 
                                        placeholder="Friend's NFT ID" 
                                        id="referral-id-input"
                                        style={{ fontSize: "1.2rem", padding: "10px", marginRight: "10px", borderRadius: "8px", border: "1px solid #ccc", width: "100%" }} 
                                    />
                                    <Web3Button
                                        contractAddress={referralManagerAddress}
                                        contractAbi={REFERRAL_MANAGER_ABI}
                                        action={async (contract) => {
                                            const nftId = (document.getElementById("referral-id-input") as HTMLInputElement).value;
                                            if (!nftId) {
                                                alert("Please enter a valid NFT ID");
                                                return;
                                            }
                                            await contract.call("register", [nftId]);
                                        }}
                                        onSuccess={() => alert("Registration Successful!")}
                                        onError={(error) => alert(`Error: ${error.message}`)}
                                    >
                                        Register Referral
                                    </Web3Button>
                                </div>

                                {/* --- "Unstaked NFTs" (Stake) Section --- */}
                                <hr className={`${styles.divider} ${styles.spacerTop}`} />
                                <h2>Your Unstaked {PAGE_NAME} NFTs</h2>
                                <div className={styles.nftBoxGrid}>
                                    {/* This code filters the user's wallet to only show NFTs in this pool's ID range */}
                                    {ownedNfts?.filter(nft => 
                                        nft.metadata.id.toNumber() >= minvalue && 
                                        nft.metadata.id.toNumber() <= maxval
                                    ).map((nft) => (
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
                                    ))}
                                </div>
                                
                                {/* --- "Staked NFTs" (Unstake/Take) Section --- */}
                                <hr className={`${styles.divider} ${styles.spacerTop}`} />
                                <h2>Your Staked {PAGE_NAME} NFTs</h2>
                                {stisLoading ? "Loading..." : (
                                    <div className={styles.nftBoxGrid}>
                                        {stakedTokenIds && stakedTokenIds.map((nftId: BigNumber) => (
                                            <StakedNftCard 
                                                key={nftId.toString()} 
                                                tokenId={nftId} 
                                                stakingContractAddress={stakingContractAddress}
                                            />
                                        ))}
                                    </div>
                                )}
                            </>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default Stake;