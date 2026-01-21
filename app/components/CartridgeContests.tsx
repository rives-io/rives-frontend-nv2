"use client";

import { useEffect, useState } from "react";
import { rules } from "../backend-libs/core/lib";
import Loading from "./Loading";
import { envClient } from "../utils/clientEnv";
import ContestCard, { CartridgeWithUser } from "./ContestCard";
import { RuleInfo } from "../backend-libs/core/ifaces";

export default function CartridgeContests({
  cartridgeId,
  cartridge,
}: {
  cartridgeId: string;
  cartridge: CartridgeWithUser;
}) {
  const [cartridgeContests, setCartridgeContests] =
    useState<Array<RuleInfo> | null>(null);

  const [contestsLoading, setContestsLoading] = useState(false);

  useEffect(() => {
    const contestsByCartridge = async () => {
      setContestsLoading(true);

      const contests = (
        await rules(
          {
            cartridge_id: cartridge.last_version || cartridgeId,
            has_start: true,
            has_end: true,
          },
          {
            cartesiNodeUrl: envClient.CARTESI_NODE_URL,
            decode: true,
            applicationAddress: envClient.DAPP_ADDR as `0x${string}`,
          },
        )
      ).data;

      setCartridgeContests(contests);
      setContestsLoading(false);
    };

    contestsByCartridge();
  }, []);

  return (
    <div className="flex flex-col gap-4">
      {contestsLoading ? (
        <div className="h-56">
          <Loading msg="Loading Contests" />
        </div>
      ) : cartridgeContests?.length == 0 ? (
        <div className="text-center pixelated-font">No Contests</div>
      ) : (
        <div className="flex flex-wrap justify-center gap-4">
          {cartridgeContests?.map((contest, index) => {
            return (
              <ContestCard
                key={index}
                contest={contest}
                cartridge={cartridge}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
