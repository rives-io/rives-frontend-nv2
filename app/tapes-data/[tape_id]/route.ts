import { type NextRequest } from "next/server";
import { toHex, toBytes } from "viem";

import { envClient } from "../../utils/clientEnv";
import { formatInCard } from "../../backend-libs/core/lib";
import { FormatInCardPayload } from "@/app/backend-libs/core/ifaces";
import {
  ruleIdFromBytes,
  generateEntropy,
  getRuleInfo,
  getTapes,
} from "@/app/utils/util";

interface FullTapePayload {
  tape?: string;
  incard?: string;
  args?: string;
  entropy?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tape_id: string }> },
) {
  const { tape_id } = await params;
  let data: FullTapePayload = {};
  try {
    const tapes = await getTapes({
      tapeIds: [tape_id],
      currentPage: 1,
      pageSize: 1,
    });
    if (tapes.total == 0) throw new Error(`Tape ${tape_id} not found!`);
    const tape = tapes.data[0];
    const rule = await getRuleInfo(ruleIdFromBytes(tape.rule_id));
    if (!rule) throw new Error(`Rule ${tape.rule_id} not found!`);
    const entropy = generateEntropy(tape._msgSender, rule.id);

    const inputData: FormatInCardPayload = { rule_id: rule.id };
    if (tape.incard && tape.incard.length > 0)
      inputData.in_card = toHex(tape.incard);
    if (tape.tapes && tape.tapes.length > 0) inputData.tapes = tape.tapes;
    const incard = await formatInCard(inputData, {
      cartesiNodeUrl: envClient.CARTESI_NODE_URL,
      applicationAddress: envClient.DAPP_ADDR as `0x${string}`,
      decode: true,
      decodeModel: "bytes",
    });

    data = {
      entropy: entropy,
      tape: btoa(
        new Uint8Array(toBytes(tape.tape)).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          "",
        ),
      ),
      args: rule.args,
    };
    if (incard) {
      data.incard = btoa(
        new Uint8Array(toBytes(incard)).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          "",
        ),
      );
    }
  } catch (error) {
    console.log(error);
  }
  if (data.tape === undefined)
    return new Response(null, {
      status: 404,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
