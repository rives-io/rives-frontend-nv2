import { type NextRequest } from "next/server";
import { toHex, toBytes } from "viem";

import { envClient } from "../../utils/clientEnv";
import { formatInCard } from "../../backend-libs/core/lib";
import { FormatInCardPayload, RuleInfo } from "@/app/backend-libs/core/ifaces";
import { getRuleInfo } from "@/app/utils/util";

interface FullTapePayload {
  tape?: string;
  incard?: string;
  args?: string;
  entropy?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ rule_id: string }> },
) {
  const searchParams = request.nextUrl.searchParams;

  const { rule_id } = await params;
  let rule: RuleInfo | null = null;
  let data: FullTapePayload = {};
  try {
    rule = await getRuleInfo(rule_id);

    const inputData: FormatInCardPayload = {};
    const queryTapes = searchParams.getAll("tapes");
    const queryIncard = searchParams.get("incard");

    if (rule) inputData.rule_id = rule.id;
    if (queryIncard && queryIncard.length > 0)
      inputData.in_card = toHex(
        Uint8Array.from(atob(queryIncard), (c) => c.charCodeAt(0)),
      );
    if (queryTapes && queryTapes.length > 0) inputData.tapes = queryTapes;
    const incard = await formatInCard(inputData, {
      cartesiNodeUrl: envClient.CARTESI_NODE_URL,
      applicationAddress: envClient.DAPP_ADDR as `0x${string}`,
      decode: true,
      decodeModel: "bytes",
    });

    data = {};
    if (rule?.args) {
      data.args = rule.args;
    }
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
