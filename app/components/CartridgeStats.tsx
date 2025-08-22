"use client";

import { useEffect, useState } from "react";

import { envClient } from "../utils/clientEnv";
import { indexerQuery } from "../backend-libs/indexer/lib";
import { IndexerOutput } from "../backend-libs/indexer/ifaces";
import { cartridgeIdFromBytes, formatCartridgeIdToBytes } from "../utils/util";

export async function getCartridgeTapesTotal(
  cartridgeId: string,
): Promise<number> {
  const indexerOutput: IndexerOutput = (await indexerQuery(
    {
      tags: ["tape", cartridgeIdFromBytes(cartridgeId)],
      type: "input",
      page_size: 0,
    },
    {
      cartesiNodeUrl: envClient.CARTESI_NODE_URL,
      decode: true,
      decodeModel: "IndexerOutput",
      applicationAddress: envClient.DAPP_ADDR as `0x${string}`,
    },
  )) as IndexerOutput;

  return indexerOutput.total;
}

function CartridgeStats({
  cartridge_id,
  reload,
}: {
  cartridge_id: string;
  reload: number;
}) {
  // state
  const [totalTapes, setTotalTapes] = useState<number>();

  useEffect(() => {
    const cartridgeIdB32 = formatCartridgeIdToBytes(cartridge_id).slice(2);
    if (cartridgeIdB32) {
      getCartridgeTapesTotal(cartridgeIdB32).then((out) => setTotalTapes(out));
    }
  }, [reload, cartridge_id]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 text-center gap-2">
      {totalTapes != undefined ? (
        <div className="p-4 flex flex-col bg-rives-gray">
          <span>Tapes Created</span>
          <span className="mt-auto">{totalTapes}</span>
        </div>
      ) : (
        <></>
      )}
    </div>
  );
}

export default CartridgeStats;
