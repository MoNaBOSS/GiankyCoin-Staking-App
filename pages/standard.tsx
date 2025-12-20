import StakePage from "../components/StakePage";

export default function StandardStake() {
  return (
    <StakePage
      pageName="Standard"
      collectionAddress={process.env.NEXT_PUBLIC_STANDARD_NFT_COLLECTION!}
    />
  );
}
