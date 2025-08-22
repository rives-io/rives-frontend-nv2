import { IndexerOutput, indexerQuery } from "../backend-libs/indexer/lib";
import { envClient } from "../utils/clientEnv";
import { getCartridges } from "../utils/util";

export async function getUserTapesTotal(address: string): Promise<number> {
  if (!address) return 0;
  const indexerOutput: IndexerOutput = (await indexerQuery(
    {
      tags: ["tape"],
      msg_sender: address,
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

export async function getUserCartridgesTotal(address: string): Promise<number> {
  if (!address) return 0;
  // const indexerOutput: IndexerOutput = await indexerQuery(
  //     {
  //         tags:["cartridge"],
  //         msg_sender:address,
  //         type:"input",
  //         page_size:0
  //     },
  //     {cartesiNodeUrl: envClient.CARTESI_NODE_URL, decode:true, decodeModel:"IndexerOutput", applicationAddress: envClient.DAPP_ADDR as `0x${string}`}) as IndexerOutput;
  // return indexerOutput.total;
  const out = await getCartridges({
    pageSize: 0,
    currentPage: 1,
    user_address: address,
  });
  return out.total;
}

export default async function ProfileSummary({ address }: { address: string }) {
  // fetch info to build profile summary
  const totalTapesCreated = getUserTapesTotal(address);
  const totalCartridgesCreated = getUserCartridgesTotal(address);

  return (
    <div id="profile_portfolio">
      <div className="grid grid-cols-3 gap-2 text-center">
        {totalCartridgesCreated ? (
          <div className="p-4 bg-rives-gray flex flex-col">
            <span>Cartridges Created</span>
            <span>{totalCartridgesCreated}</span>
          </div>
        ) : (
          <></>
        )}

        {totalTapesCreated ? (
          <div className="p-4 bg-rives-gray flex flex-col">
            <span>Tapes Created</span>
            <span>{totalTapesCreated}</span>
          </div>
        ) : (
          <></>
        )}
      </div>
    </div>
  );
}
