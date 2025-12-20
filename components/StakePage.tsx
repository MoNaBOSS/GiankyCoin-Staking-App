import { useEffect, useMemo, useState } from "react";
import {
  useAddress,
  useContract,
  useContractRead,
  useTokenBalance,
  ThirdwebNftMedia,
  Web3Button,
} from "@thirdweb-dev/react";
import { ethers } from "ethers";
import { Alchemy, Network } from "alchemy-sdk";
import styles from "../styles/Home.module.css";
import Nav from "./Nav";
import { STAKING_POOL_ABI } from "../constants/abis";
import {
  STAKING_CONTRACT_ADDRESS,
  TOKEN_CONTRACT_ADDRESS,
} from "../constants/config";

type StakePageProps = {
  pageName: string;
  collectionAddress: string;
};

export default function StakePage({ pageName, collectionAddress }: StakePageProps) {
  const address = useAddress();
  const { contract: stakingContract } = useContract(
    STAKING_CONTRACT_ADDRESS,
    STAKING_POOL_ABI
  );
  const { data: tokenBalance } = useTokenBalance(
    TOKEN_CONTRACT_ADDRESS,
    address
  );

  const [ownedNFTs, setOwnedNFTs] = useState<any[]>([]);
  const [loadingNFTs, setLoadingNFTs] = useState(true);
  const [blacklist, setBlacklist] = useState<Record<number, boolean>>({});
  const [selectedPlan, setSelectedPlan] = useState<Record<number, number>>({});

  /* ---------------- ALCHEMY SETUP ---------------- */
  const alchemy = useMemo(
    () =>
      new Alchemy({
        apiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY!,
        network: Network.MATIC_MAINNET,
      }),
    []
  );

  /* ---------------- STAKED DATA ---------------- */
  const { data: userState } = useContractRead(
    stakingContract,
    "getUserFullState",
    [address]
  );

  const staked = useMemo(() => {
    if (!userState) return [];
    return userState[0];
  }, [userState]);

  const stakedTokenIds = useMemo(
    () => staked.map((s: any) => s.tokenId.toNumber()),
    [staked]
  );

  /* ---------------- FETCH WALLET NFTs (ALCHEMY) ---------------- */
  useEffect(() => {
    if (!address) return;

    async function loadNFTs() {
      setLoadingNFTs(true);
      const res = await alchemy.nft.getNftsForOwner(address);
      const filtered = res.ownedNfts.filter(
        (nft) =>
          nft.contract.address.toLowerCase() ===
            collectionAddress.toLowerCase() &&
          !stakedTokenIds.includes(Number(nft.tokenId))
      );
      setOwnedNFTs(filtered);
      setLoadingNFTs(false);
    }

    loadNFTs();
  }, [address, collectionAddress, stakedTokenIds, alchemy]);

  /* ---------------- BLACKLIST CHECK ---------------- */
  useEffect(() => {
    async function checkBlacklist() {
      if (!stakingContract) return;
      const map: Record<number, boolean> = {};
      for (const nft of ownedNFTs) {
        const id = Number(nft.tokenId);
        map[id] = await stakingContract.call("isBlacklisted", [
          collectionAddress,
          id,
        ]);
      }
      setBlacklist(map);
    }
    checkBlacklist();
  }, [ownedNFTs, stakingContract, collectionAddress]);

  /* ---------------- LIVE REWARD ---------------- */
  function LiveReward({ stake }: any) {
    const [val, setVal] = useState("0.0");

    useEffect(() => {
      const i = setInterval(() => {
        const now = Math.floor(Date.now() / 1000);
        const earned =
          (now - stake.lastClaimTime.toNumber()) *
          Number(ethers.utils.formatUnits(stake.rewardRate, 18));
        setVal(earned.toFixed(6));
      }, 1000);
      return () => clearInterval(i);
    }, [stake]);

    return <span>{val}</span>;
  }

  /* ---------------- UNLOCK TIMER ---------------- */
  function UnlockTimer({ stake }: any) {
    const [txt, setTxt] = useState("");

    useEffect(() => {
      const i = setInterval(() => {
        const now = Math.floor(Date.now() / 1000);
        const diff = stake.lockEndTime.toNumber() - now;
        if (diff <= 0) return setTxt("READY");
        const d = Math.floor(diff / 86400);
        const h = Math.floor((diff % 86400) / 3600);
        setTxt(`${d}d ${h}h`);
      }, 1000);
      return () => clearInterval(i);
    }, [stake]);

    return <span>{txt}</span>;
  }

  return (
    <div className={styles.container}>
      <Nav />
      <div className={styles.stakeContainer}>
        <h1 className={styles.h1}>{pageName} Staking</h1>

        {/* STATS */}
        <div className={styles.tokenGrid}>
          <div className={styles.tokenItem}>
            <h3>Claimable Rewards</h3>
            <p>{userState ? ethers.utils.formatUnits(userState[1], 18) : "0"} GKY</p>
          </div>
          <div className={styles.tokenItem}>
            <h3>Wallet Balance</h3>
            <p>{tokenBalance?.displayValue} {tokenBalance?.symbol}</p>
          </div>
        </div>

        {/* UNSTAKED */}
        <h2>Your Unstaked NFTs</h2>
        <div className={styles.nftBoxGrid}>
          {loadingNFTs ? "Loading..." : ownedNFTs.length === 0 ? "No NFTs" :
            ownedNFTs.map((nft) => {
              const id = Number(nft.tokenId);
              return (
                <div key={id} className={styles.nftBox}>
                  <ThirdwebNftMedia metadata={nft.rawMetadata} />
                  {blacklist[id] && <p className={styles.error}>Blacklisted</p>}
                  <select
                    onChange={(e) =>
                      setSelectedPlan({ ...selectedPlan, [id]: Number(e.target.value) })
                    }
                  >
                    <option value={0}>3 Months</option>
                    <option value={1}>6 Months</option>
                    <option value={2}>12 Months</option>
                  </select>

                  <Web3Button
                    contractAddress={STAKING_CONTRACT_ADDRESS}
                    contractAbi={STAKING_POOL_ABI}
                    isDisabled={blacklist[id]}
                    action={(c) =>
                      c.call("stake", [[collectionAddress], [id], selectedPlan[id] ?? 0])
                    }
                  >
                    Stake
                  </Web3Button>
                </div>
              );
            })}
        </div>

        {/* STAKED */}
        <h2>Your Staked NFTs</h2>
        <div className={styles.nftBoxGrid}>
          {staked.map((stake: any) => (
            <div key={stake.tokenId.toString()} className={styles.nftBox}>
              <p>Token #{stake.tokenId.toString()}</p>
              <p>Earned: <LiveReward stake={stake} /> GKY</p>
              <p>Unlock: <UnlockTimer stake={stake} /></p>

              <Web3Button
                contractAddress={STAKING_CONTRACT_ADDRESS}
                contractAbi={STAKING_POOL_ABI}
                action={(c) =>
                  c.call("unstake", [[collectionAddress], [stake.tokenId]])
                }
              >
                Unstake
              </Web3Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
