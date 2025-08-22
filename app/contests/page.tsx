import { envClient } from "@/app/utils/clientEnv";
import {
  CartridgeInfo,
  GetRulesPayload,
  RuleInfo,
} from "../backend-libs/core/ifaces";
import { cartridgeInfo, rules } from "../backend-libs/core/lib";
import { getContestStatus } from "../utils/common";
import ContestCard from "../components/ContestCard";
import { Metadata } from "next";
import { getUsersByAddress, User } from "../utils/privyApi";

export const revalidate = 0; // revalidate always

export const metadata: Metadata = {
  title: "Contests",
  description: "Contests",
};

const getRules = async (onlyActive = false) => {
  const inputPayload: GetRulesPayload = {
    has_start: true,
    has_end: true,
  };
  if (onlyActive) {
    inputPayload.active_ts = Math.floor(new Date().valueOf() / 1000);
  }

  const contests: Array<RuleInfo> = (
    await rules(inputPayload, {
      cartesiNodeUrl: envClient.CARTESI_NODE_URL,
      applicationAddress: envClient.DAPP_ADDR as `0x${string}`,
      decode: true,
    })
  ).data;
  return contests;
};

export default async function Contests() {
  const contests = (await getRules()).sort((a, b) => {
    const aStatus = getContestStatus(a);
    const bStatus = getContestStatus(b);
    if (!b.start || !a.start) return b.created_at - a.created_at;
    if (aStatus != bStatus) return aStatus - bStatus;
    return b.start - a.start;
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
          if (!contest.start || !contest.end) return <></>;

          const cartridgeCreatorAddr =
            cartridgeInfoMap[contest.cartridge_id].user_address.toLowerCase();
          const cartridgeCreatorUser = userMap[cartridgeCreatorAddr] || null;
          return (
            <ContestCard
              key={index}
              contest={contest}
              cartridge={{
                ...cartridgeInfoMap[contest.cartridge_id],
                user: cartridgeCreatorUser,
              }}
            />
          );
        })}
      </section>
    </main>
  );
}
