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
import type { NextPage } from "next";
import { useEffect, useMemo, useState } from "react";
import styles from "../styles/Home.module.css";

/* ================= CONFIG ================= */

const STAKING_CONTRACT_ADDRESS =
  "0x0901d6c6c2a7e42cfe9319f7d76d073499d402ab";
const NFT_COLLECTION_ADDRESS =
  "0x106fb804D03D4EA95CaeFA45C3215b57D8E6835D";
const TOKEN_CONTRACT_ADDRESS =
  "0x64487539aa9d61Bdc652A5755bbe30Ee96cFcEb2";
const REFERRAL_MANAGER_ADDRESS =
  "0xF6EeC70971B7769Db3a7F3daffCF8F00AfeF47b9";

const PAGE_NAME = "Standard";

/* ================= HELPERS ================= */

const LiveReward = ({ stake }: { stake: any }) => {
  const [value, setValue] = useState("0.000000");

  useEffect(() => {
    const tick = () => {
      const now = Math.floor(Date.now() / 1000);
      const last = Number(stake.lastClaimTime);
      const elapsed = now > last ? now - last : 0;
      const rate = Number(ethers.utils.formatUnits(stake.rewardRate, 18));
      setValue((elapsed * rate).toFixed(6));
    };
    const i = setInterval(tick, 1000);
    tick();
    return () => clearInterval(i);
  }, [stake]);

  return <>{value}</>;
};

const UnlockTimer = ({ lockEnd }: { lockEnd: BigNumber }) => {
  const [left, setLeft] = useState(0);

  useEffect(() => {
    const tick = () => {
      const now = Math.floor(Date.now() / 1000);
      const end = Number(lockEnd);
      setLeft(end > now ? end - now : 0);
    };
    const i = setInterval(tick, 1000);
    tick();
    return () => clearInterval(i);
  }, [lockEnd]);

  if (left === 0) return <span className={styles.ready}>READY</span>;

  const d = Math.floor(left / 86400);
  const h = Math.floor((left % 86400) / 3600);
  const m = Math.floor((left % 3600) / 60);

  return (
    <span>
      {d}d {h}h {m}m
    </span>
  );
};

/* ================= PAGE ================= */

const StandardStake: NextPage = () => {
  const address = useAddress();
  const [plan, setPlan] = useState<Record<string, number>>({});

  const { contract: staking } = useContract(STAKING_CONTRACT_ADDRESS);
  const { contract: nft } = useContract(NFT_COLLECTION_ADDRESS, "nft-drop");
  const { contract: token } = useContract(TOKEN_CONTRACT_ADDRESS, "token");

  const { data: ownedNfts, isLoading: loadingNfts } = useNFTs(nft);
  const { data: tokenBalance } = useTokenBalance(token, address);

  const { data: fullState, isLoading: loadingState } = useContractRead(
    staking,
    "getUserFullState",
    [address]
  );

  const staked = useMemo(() => (fullState ? fullState[0] : []), [fullState]);
  const claimable = useMemo(
    () => (fullState ? fullState[1] : BigNumber.from(0)),
    [fullState]
  );

  return (
    <div className={styles.container}>
      <div className={styles.stakeContainer}>
        {!address ? (
          <p>Connect wallet</p>
        ) : (
          <>
            {/* TOKENS */}
            <h2 className={styles.h2}>Your Tokens</h2>
            <div className={styles.tokenGrid}>
              <div className={styles.tokenItem}>
                <h3>Claimable</h3>
                <p>
                  {ethers.utils.formatUnits(claimable, 18).slice(0, 8)} GKY
                </p>
              </div>
              <div className={styles.tokenItem}>
                <h3>Balance</h3>
                <p>
                  {tokenBalance?.displayValue.slice(0, 8)}{" "}
                  {tokenBalance?.symbol}
                </p>
              </div>
            </div>

            <Web3Button
              contractAddress={STAKING_CONTRACT_ADDRESS}
              isDisabled={staked.length === 0}
              action={(c) =>
                c.call(
                  "claimReward",
                  [staked.map((s: any) => s.collection)],
                  [staked.map((s: any) => s.tokenId)]
                )
              }
            >
              Claim Rewards
            </Web3Button>

            {/* UNSTAKED */}
            <h2 className={styles.h2}>Unstaked {PAGE_NAME} NFTs</h2>
            <div className={styles.nftBoxGrid}>
              {loadingNfts ? (
                <p>Loading...</p>
              ) : ownedNfts && ownedNfts.length > 0 ? (
                ownedNfts.map((nftItem) => (
                  <div key={nftItem.metadata.id} className={styles.nftBox}>
                    <ThirdwebNftMedia metadata={nftItem.metadata} />
                    <h3>{nftItem.metadata.name}</h3>

                    <select
                      onChange={(e) =>
                        setPlan({
                          ...plan,
                          [nftItem.metadata.id]: Number(e.target.value),
                        })
                      }
                    >
                      <option value={0}>3 Months</option>
                      <option value={1}>6 Months</option>
                      <option value={2}>12 Months</option>
                    </select>

                    <Web3Button
                      contractAddress={STAKING_CONTRACT_ADDRESS}
                      action={async (c) => {
                        const ok = await nft?.isApproved(
                          address,
                          STAKING_CONTRACT_ADDRESS
                        );
                        if (!ok)
                          await nft?.setApprovalForAll(
                            STAKING_CONTRACT_ADDRESS,
                            true
                          );
                        await c.call(
                          "stake",
                          [[NFT_COLLECTION_ADDRESS]],
                          [[nftItem.metadata.id]],
                          plan[nftItem.metadata.id] || 0
                        );
                      }}
                    >
                      Stake
                    </Web3Button>
                  </div>
                ))
              ) : (
                <p>No NFTs found</p>
              )}
            </div>

            {/* STAKED */}
            <h2 className={styles.h2}>Staked {PAGE_NAME} NFTs</h2>
            <div className={styles.nftBoxGrid}>
              {loadingState ? (
                <p>Loading...</p>
              ) : staked.length > 0 ? (
                staked.map((s: any) => (
                  <div key={s.tokenId.toString()} className={styles.nftBox}>
                    <h3>ID #{s.tokenId.toString()}</h3>
                    <p>
                      Rewards: <LiveReward stake={s} /> GKY
                    </p>
                    <p>
                      Unlocks in <UnlockTimer lockEnd={s.lockEndTime} />
                    </p>

                    <Web3Button
                      contractAddress={STAKING_CONTRACT_ADDRESS}
                      isDisabled={
                        Math.floor(Date.now() / 1000) <
                        Number(s.lockEndTime)
                      }
                      action={(c) =>
                        c.call(
                          "unstake",
                          [[s.collection]],
                          [[s.tokenId]]
                        )
                      }
                    >
                      Unstake
                    </Web3Button>
                  </div>
                ))
              ) : (
                <p>No active stakes</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StandardStake;
