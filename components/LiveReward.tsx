import { useEffect, useState } from "react";
import { ethers } from "ethers";

export default function LiveReward({ stake }: { stake: any }) {
  const [reward, setReward] = useState("0.000000");

  useEffect(() => {
    const update = () => {
      const now = Math.floor(Date.now() / 1000);
      const lastClaim = stake.lastClaimTime.toNumber();
      // Calculate pending based on elapsed time and fixed rate
      const elapsed = now > lastClaim ? now - lastClaim : 0;
      const rate = parseFloat(ethers.utils.formatEther(stake.rewardRate));
      setReward((elapsed * rate).toFixed(6));
    };

    const timer = setInterval(update, 1000);
    update();
    return () => clearInterval(timer);
  }, [stake]);

  return <span>{reward}</span>;
}