import StakePage from "../components/StakePage";
import {
  STAKING_POOL_ADDRESS,
  STANDARD_NFT_ADDRESS,
  TOKEN_ADDRESS,
} from "../constants/config";

export default function StandardStake() {
  return (
    <StakePage
      pageName="Standard"
      nftAddress={STANDARD_NFT_ADDRESS}
      planIndex={1}
      stakingAddress={STAKING_POOL_ADDRESS}
      tokenAddress={TOKEN_ADDRESS}
    />
  );
}
