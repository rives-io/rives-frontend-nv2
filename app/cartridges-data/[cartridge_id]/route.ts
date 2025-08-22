import { type NextRequest } from "next/server";

import { envClient } from "../../utils/clientEnv";
import { cartridge } from "../../backend-libs/core/lib";

export const revalidate = 0;

const getCartridgeData = async (cartridgeId: string) => {
  const formatedCartridgeId =
    cartridgeId.substring(0, 2) === "0x" ? cartridgeId.slice(2) : cartridgeId;
  const data = await cartridge(
    {
      id: formatedCartridgeId,
    },
    {
      decode: true,
      decodeModel: "bytes",
      cartesiNodeUrl: envClient.CARTESI_NODE_URL,
      applicationAddress: envClient.DAPP_ADDR as `0x${string}`,
    },
  );

  if (data.length === 0)
    throw new Error(`Cartridge ${formatedCartridgeId} not found!`);

  return data;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cartridge_id: string }> },
) {
  const { cartridge_id } = await params;
  let data: Uint8Array = new Uint8Array();
  try {
    data = await getCartridgeData(cartridge_id);
  } catch (error) {
    console.log(error);
  }
  if (data.length == 0)
    return new Response(data as BodyInit, {
      status: 404,
      headers: {
        "Content-Type": "application/octet-stream",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  return new Response(data as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/octet-stream",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
