import { envClient } from "@/app/utils/clientEnv";
import {
  CartridgeInfo,
  GetRulesPayload,
  RuleInfo,
} from "@/app/backend-libs/core/ifaces";
import { cartridgeInfo, rules } from "@/app//backend-libs/core/lib";
import { getContestStatus } from "@/app//utils/common";
import ContestCard from "@/app//components/ContestCard";
import { Metadata } from "next";
import { getUsersByAddress, User } from "@/app//utils/privyApi";
import NewContestCard from "@/app/components/NewContestCard";

export const revalidate = 0; // revalidate always

export const metadata: Metadata = {
  title: "PlayModes",
  description: "Cartridge Play Modes",
};

const getRules = async (cartridgeId: string, onlyActive = false) => {
  const inputPayload: GetRulesPayload = {
    cartridge_id: cartridgeId,
    order_by: "created_at",
    order_dir: "desc",
  };
  if (onlyActive) {
    inputPayload.active_ts = Math.floor(new Date().valueOf() / 1000);
  }

  const allRules: Array<RuleInfo> = (
    await rules(inputPayload, {
      cartesiNodeUrl: envClient.CARTESI_NODE_URL,
      decode: true,
      applicationAddress: envClient.DAPP_ADDR as `0x${string}`,
    })
  ).data;
  return allRules;
};

export default async function PlayModes({
  params,
}: {
  params: Promise<{ cartridge_id: string }>;
}) {
  const { cartridge_id } = await params;
  const contests = (await getRules(cartridge_id)).sort((a, b) => {
    const aStatus = getContestStatus(a);
    const bStatus = getContestStatus(b);
    const aStart = a.start ? a.start : 0;
    const bStart = b.start ? b.start : 0;
    console.log("ordering", a.id, b.id, aStatus, bStatus, aStart, bStart);
    if (aStatus != bStatus) return aStatus - bStatus;
    return bStart - aStart;
  });

  const cartridgeInfoMap: Record<string, CartridgeInfo> = {};
  const userAddresses: Set<string> = new Set();

  if (contests.length == 0) {
    return (
      <main className="flex items-center justify-center h-lvh">
        <span className={`text-4xl text-white pixelated-font`}>
          No Contests!
        </span>
      </main>
    );
  }

  // get cartridgeInfo
  for (let i = 0; i < contests.length; i++) {
    if (!cartridgeInfoMap[contests[i].cartridge_id]) {
      let cartridge: CartridgeInfo = await cartridgeInfo(
        { id: contests[i].cartridge_id },
        {
          decode: true,
          cartesiNodeUrl: envClient.CARTESI_NODE_URL,
          applicationAddress: envClient.DAPP_ADDR as `0x${string}`,
        },
      );

      if (!cartridge.primary && cartridge.primary_id) {
        cartridge = await cartridgeInfo(
          { id: cartridge.primary_id },
          {
            decode: true,
            cartesiNodeUrl: envClient.CARTESI_NODE_URL,
            applicationAddress: envClient.DAPP_ADDR as `0x${string}`,
          },
        );
      }

      cartridgeInfoMap[contests[i].cartridge_id] = cartridge;
      userAddresses.add(cartridge.user_address);
    }
  }

  const userMap: Record<string, User> = JSON.parse(
    await getUsersByAddress(Array.from(userAddresses)),
  );

  return (
    <main>
      <section className="flex flex-wrap justify-center gap-4">
        {contests.map((contest, index) => {
          const cartridgeCreatorAddr =
            cartridgeInfoMap[contest.cartridge_id].user_address.toLowerCase();
          const cartridgeCreatorUser = userMap[cartridgeCreatorAddr] || null;
          return (
            <ContestCard
              key={index}
              contest={contest}
              activateNonContest={true}
              cartridge={{
                ...cartridgeInfoMap[contest.cartridge_id],
                user: cartridgeCreatorUser,
              }}
            />
          );
        })}
        <NewContestCard cartridgeId={cartridge_id} />
      </section>
    </main>
  );
}
