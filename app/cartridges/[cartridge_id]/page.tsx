import { cartridgeInfo, rules } from "@/app/backend-libs/core/lib";
import { CartridgeInfo, RuleInfo } from "@/app/backend-libs/core/ifaces";
import { envClient } from "@/app/utils/clientEnv";
import CartridgePage from "@/app/components/CartridgePage";

export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ cartridge_id: string }>;
}) {
  const { cartridge_id } = await params;
  const cartridge: CartridgeInfo = await cartridgeInfo(
    { id: cartridge_id },
    {
      decode: true,
      cartesiNodeUrl: envClient.CARTESI_NODE_URL,
      applicationAddress: envClient.DAPP_ADDR as `0x${string}`,
    },
  );

  if (!cartridge) return null;

  const cartridgeCoverUrl = `/cartridges-img/${cartridge_id}`;
  const shareTitle = `${cartridge.name} | RIVES`;
  const desc = `Cartridge "${cartridge.name}"`;

  return {
    title: cartridge.name,
    openGraph: {
      images: [cartridgeCoverUrl],
      siteName: "rives.io",
      title: shareTitle,
      description: desc,
    },
    twitter: {
      images: [cartridgeCoverUrl],
      title: shareTitle,
      card: "summary",
      creator: "@rives_io",
      description: desc,
    },
  };
}

export default async function Cartridge({
  params,
}: {
  params: Promise<{ cartridge_id: string }>;
}) {
  const { cartridge_id } = await params;
  const cartridge: CartridgeInfo = await cartridgeInfo(
    { id: cartridge_id },
    {
      decode: true,
      cartesiNodeUrl: envClient.CARTESI_NODE_URL,
      applicationAddress: envClient.DAPP_ADDR as `0x${string}`,
    },
  );

  if (!cartridge) return null;

  const cartridgeRules: RuleInfo[] = (
    await rules(
      { cartridge_id: cartridge.last_version || cartridge.id },
      {
        cartesiNodeUrl: envClient.CARTESI_NODE_URL,
        decode: true,
        applicationAddress: envClient.DAPP_ADDR as `0x${string}`,
      },
    )
  ).data;

  return (
    <CartridgePage
      cartridge={cartridge}
      rulesInfo={cartridgeRules}
    ></CartridgePage>
  );
}
