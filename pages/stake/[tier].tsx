import { useRouter } from "next/router";
import StakePage from "../../components/StakePage";

const MAP: Record<string, string> = {
  standard: process.env.NEXT_PUBLIC_STANDARD_NFT!,
  starter: process.env.NEXT_PUBLIC_STARTER_NFT!,
  vip: process.env.NEXT_PUBLIC_VIP_NFT!,
  premium: process.env.NEXT_PUBLIC_PREMIUM_NFT!,
  diamond: process.env.NEXT_PUBLIC_DIAMOND_NFT!,
  basic: process.env.NEXT_PUBLIC_BASIC_NFT!,
};

export default function Page() {
  const { tier } = useRouter().query;
  if (!tier || !MAP[tier as string]) return null;

  return <StakePage pageName={tier as string} collectionAddress={MAP[tier as string]} />;
}
