import CartridgeCard from "@/app/components/CartridgeCard";
import TapeCard from "@/app/components/TapeCard";
import { CartridgeInfo, RuleInfo } from "@/app/backend-libs/core/ifaces";
import {
  cartridgeInfo,
  rules,
  VerificationOutput,
} from "@/app/backend-libs/core/lib";
import { VerifyPayload } from "@/app/backend-libs/core/lib";
import { cartridges as cartridgesRequest } from "@/app/backend-libs/core/lib";
import { envClient } from "@/app/utils/clientEnv";
import { getTapes } from "@/app/utils/util";
import ContestCard from "@/app/components/ContestCard";
import { getUsersByAddress, User } from "@/app/utils/privyApi";

export const revalidate = 0; // revalidate data always

let total_cartridges: number;
let total_tapes: number;

async function getLatestsCartridges() {
  const res = await cartridgesRequest(
    {
      page: 1,
      page_size: 4,
      get_cover: true,
      order_by: "created_at",
      order_dir: "desc",
    },
    {
      decode: true,
      cartesiNodeUrl: envClient.CARTESI_NODE_URL,
      applicationAddress: envClient.DAPP_ADDR as `0x${string}`,
    },
  );

  const cartridges: Array<CartridgeInfo> = res.data;
  total_cartridges = res.total;

  return cartridges;
}

async function getLatestsTapes() {
  let tapes: Array<VerifyPayload> = [];

  try {
    const res = await getTapes({
      currentPage: 1,
      pageSize: 4,
      orderBy: "block_timestamp",
      orderDir: "desc",
    });
    tapes = res.data;
    total_tapes = res.total;
  } catch (error) {
    console.log((error as Error).message);
  }

  return tapes;
}

async function getLatestsContests() {
  const contests = (
    await rules(
      {
        active_ts: Math.floor(new Date().getTime() / 1000),
        page: 1,
        page_size: 4,
        order_by: "start",
        order_dir: "desc",
      },
      {
        cartesiNodeUrl: envClient.CARTESI_NODE_URL,
        applicationAddress: envClient.DAPP_ADDR as `0x${string}`,
        decode: true,
      },
    )
  ).data;

  return contests;
}

export default async function Home() {
  const promises = [
    getLatestsCartridges(),
    getLatestsTapes(),
    getLatestsContests(),
  ];

  const userAddresses: Set<string> = new Set();

  const [cartridges, tapes, contests] = await Promise.all(promises);

  const contestCartridges: Record<string, CartridgeInfo> = {};
  for (let i = 0; i < contests.length; i++) {
    const contestCartridgeId = contests[i].cartridge_id;
    let cartridge = cartridges.find(
      (cartridge: CartridgeInfo) => cartridge.id == contestCartridgeId,
    );
    if (!cartridge) {
      cartridge = await cartridgeInfo(
        { id: contestCartridgeId },
        {
          decode: true,
          cartesiNodeUrl: envClient.CARTESI_NODE_URL,
          applicationAddress: envClient.DAPP_ADDR as `0x${string}`,
        },
      );
    }

    if (!cartridge) continue;

    if (!cartridge.primary && cartridge.primary_id) {
      const primaryId = cartridge.primary_id;

      cartridge = cartridges.find(
        (cartridge: CartridgeInfo) => cartridge.id == cartridge.primary_id,
      );
      if (!cartridge) {
        cartridge = await cartridgeInfo(
          { id: primaryId },
          {
            decode: true,
            cartesiNodeUrl: envClient.CARTESI_NODE_URL,
            applicationAddress: envClient.DAPP_ADDR as `0x${string}`,
          },
        );
      }
    }

    if (!cartridge) continue;

    userAddresses.add(cartridge.user_address); // contest cartridge creator
    contestCartridges[contests[i].id] = cartridge;
  }

  // users from cartridges
  for (const cartridge of cartridges) {
    userAddresses.add(cartridge.user_address);
  }

  // users from tapes
  for (const tape of tapes) {
    userAddresses.add(tape._msgSender);
  }

  const userMap: Record<string, User> = JSON.parse(
    await getUsersByAddress(Array.from(userAddresses)),
  );

  return (
    <main className="gap-8">
      <section className="flex flex-col items-center">
        <div className="homepageContainer">
          <h1 className={`text-4xl pixelated-font mb-4`}>Latest Cartridges</h1>
          <div className="flex flex-wrap gap-4 w-fit">
            {cartridges.map((cartridge: CartridgeInfo, index: number) => {
              return (
                <CartridgeCard
                  key={index}
                  cartridge={cartridge}
                  creator={
                    userMap[cartridge.user_address.toLowerCase()] || null
                  }
                />
              );
            })}
          </div>
        </div>
      </section>

      <section className="flex flex-col items-center">
        <div className="homepageContainer">
          <h1 className={`text-4xl pixelated-font mb-4`}>Latest Tapes</h1>
          <div className="flex flex-wrap gap-4 w-fit">
            {tapes.map((tape: VerifyPayload, index: number) => {
              return (
                <TapeCard
                  key={index}
                  tapeInput={JSON.stringify(tape, (key, value) => {
                    if (typeof value === "bigint") {
                      return value.toString();
                    }
                    return value;
                  })}
                  creator={
                    tape._msgSender
                      ? userMap[tape._msgSender.toLowerCase()] || null
                      : null
                  }
                />
              );
            })}
          </div>
        </div>
      </section>

      <section className="flex flex-col items-center">
        <div className="homepageContainer">
          <h1 className={`text-4xl pixelated-font mb-4`}>Open Contests</h1>
          <div
            className={`flex flex-wrap gap-4 justify-center ${contests.length < 2 ? "md:justify-start" : "md:justify-between"}`}
          >
            {contests.length == 0 ? (
              <div className="text-center pixelated-font">No Contests Open</div>
            ) : (
              <>
                {contests.map((contest: RuleInfo, index: number) => {
                  return (
                    <ContestCard
                      key={`${contest.id}-${index}`}
                      contest={contest}
                      cartridge={{
                        ...contestCartridges[contest.id],
                        user: userMap[
                          contestCartridges[
                            contest.id
                          ].user_address.toLowerCase()
                        ],
                      }}
                    />
                  );
                })}
              </>
            )}
          </div>
        </div>
      </section>

      <section className="flex flex-col items-center">
        <div className="homepageContainer">
          <h1 className={`text-4xl pixelated-font mb-4`}>Stats</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ">
            <div className="p-8 bg-rives-gray flex flex-col text-center">
              <span className={`text-3xl pixelated-font`}>
                Total Cartridges Created
              </span>
              <span className={`text-5xl pixelated-font`}>
                {total_cartridges}
              </span>
            </div>

            <div className="p-8 bg-rives-gray flex flex-col text-center">
              <span className={`text-3xl pixelated-font`}>
                Total Tapes Created
              </span>
              <span className={`text-5xl pixelated-font`}>{total_tapes}</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
