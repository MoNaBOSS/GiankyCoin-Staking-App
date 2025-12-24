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
import { useEffect, useMemo, useState } from "react";
import styles from "../styles/Home.module.css";

interface StakePageProps {
  nftAddress: string;
  pageName: string;
  planIndex: number;
  stakingAddress: string;
  tokenAddress: string;
}

const LiveReward = ({ stake }: { stake: any }) => {
  const [value, setValue] = useState("0.0");

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const elapsed = Math.max(0, now - Number(stake.lastClaimTime));
      const rate = Number(stake.rewardRate) / 1e18;
      setValue((elapsed * rate).toFixed(6));
    }, 1000);

    return () => clearInterval(timer);
  }, [stake]);

  return <span>{value}</span>;
};

export default function StakePage({
  nftAddress,
  pageName,
  planIndex,
  stakingAddress,
  tokenAddress,
}: StakePageProps) {
  const address = useAddress();

  const { contract: staking } = useContract(stakingAddress);
  const { contract: nft } = useContract(nftAddress, "nft-drop");
  const { contract: token } = useContract(tokenAddress, "token");

  const { data: ownedNFTs, isLoading: loadingNFTs } = useNFTs(nft);
  const { data: tokenBalance } = useTokenBalance(token, address);

  const { data: fullState, isLoading } = useContractRead(
    staking,
    "getUserFullState",
    [address]
  );

  const stakedNFTs = useMemo(() => (fullState ? fullState[0] : []), [fullState]);
  const claimable = fullState ? fullState[1] : BigNumber.from(0);

  if (!address) return <p>Please connect wallet</p>;

  return (
    <div className={styles.container}>
      <h1 className={styles.h1}>{pageName} Staking</h1>

      {/* TOKEN SUMMARY */}
      <div className={styles.tokenGrid}>
        <div className={styles.tokenItem}>
          <h3>Claimable</h3>
          <p>{ethers.utils.formatUnits(claimable, 18)} GKY</p>
        </div>
        <div className={styles.tokenItem}>
          <h3>Balance</h3>
          <p>{tokenBalance?.displayValue} {tokenBalance?.symbol}</p>
        </div>
      </div>

      <Web3Button
        contractAddress={stakingAddress}
        action={(c) =>
          c.call(
            "claimReward",
            [stakedNFTs.map(s => s.collection)],
            [stakedNFTs.map(s => s.tokenId)]
          )
        }
        isDisabled={stakedNFTs.length === 0}
      >
        Claim Rewards
      </Web3Button>

      {/* UNSTAKED */}
      <h2>Your Unstaked NFTs</h2>
      <div className={styles.nftBoxGrid}>
        {loadingNFTs ? "Loading..." : ownedNFTs?.map((nft) => (
          <div key={nft.metadata.id} className={styles.nftBox}>
            <ThirdwebNftMedia metadata={nft.metadata} />
            <p>{nft.metadata.name}</p>

            <Web3Button
              contractAddress={stakingAddress}
              action={async (c) => {
                const approved = await nft?.isApproved(address, stakingAddress);
                if (!approved) {
                  await nft?.setApprovalForAll(stakingAddress, true);
                }
                await c.call(
                  "stake",
                  [[nftAddress], [nft.metadata.id], planIndex]
                );
              }}
            >
              Stake
            </Web3Button>
          </div>
        ))}
      </div>

      {/* STAKED */}
      <h2>Staked NFTs</h2>
      <div className={styles.nftBoxGrid}>
        {isLoading ? "Loading..." : stakedNFTs.map((s: any) => (
          <div key={s.tokenId.toString()} className={styles.nftBox}>
            <p>ID #{s.tokenId.toString()}</p>
            <p>Rewards: <LiveReward stake={s} /> GKY</p>

            <Web3Button
              contractAddress={stakingAddress}
              action={(c) =>
                c.call("unstake", [[s.collection], [s.tokenId]])
              }
              isDisabled={Date.now() / 1000 < Number(s.lockEndTime)}
            >
              Unstake
            </Web3Button>
          </div>
        ))}
      </div>
    </div>
  );
}
