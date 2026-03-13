import { envClient } from "./clientEnv";
import {
  anvil,
  base,
  mainnet,
  sepolia,
  polygon,
  polygonMumbai,
  Chain,
  baseSepolia,
  worldchain,
} from "viem/chains";
import {
  Hex,
  isHex,
  toBytes,
  fromHex,
  createWalletClient,
  createPublicClient,
  custom,
  http,
  keccak256,
} from "viem";
import {
  publicActionsL1,
  walletActionsL1,
  createCartesiPublicClient,
} from "@cartesi/viem";
import { DecodedIndexerOutput } from "../backend-libs/cartesapp/lib";
import { BaseLayerWalletClient } from "../backend-libs/cartesapp/utils";
import {
  cartridgeInfo,
  cartridges,
  getOutputs,
  rules,
  VerifyPayload,
} from "../backend-libs/core/lib";
import { IndexerPayload } from "../backend-libs/indexer/ifaces";
import { encrypt } from "@/lib";
import { sha256 } from "js-sha256";
import {
  CartridgeInfo,
  CartridgesOutput,
  CartridgesPayload,
  RuleInfo,
  VerificationOutput,
} from "../backend-libs/core/ifaces";
import { getUsersByAddress, User } from "./privyApi";
import { ConnectedWallet } from "@privy-io/react-auth";

const FRONTEND_ERROR_PREFIX = "RIVES Frontend ERROR:";

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function buildUrl(baseUrl: string, path: string) {
  let formatedBaseUrl = baseUrl;
  let formatedPath = path;

  if (baseUrl[baseUrl.length - 1] == "/") {
    formatedBaseUrl = baseUrl.slice(0, baseUrl.length - 1);
  }

  if (path.length > 0 && path[0] == "/") {
    formatedPath = path.slice(1);
  }

  return `${formatedBaseUrl}/${formatedPath}`;
}

export async function getContestWinner(
  cartridge_id: string,
  rule: string,
): Promise<string | undefined> {
  const tags = ["score", cartridge_id, rule];
  const tapes: Array<VerificationOutput> = (
    await getOutputs(
      {
        tags,
        type: "notice",
        page_size: 1,
        page: 1,
        order_by: "value",
        order_dir: "desc",
      },
      {
        cartesiNodeUrl: envClient.CARTESI_NODE_URL,
        applicationAddress: envClient.DAPP_ADDR as `0x${string}`,
      },
    )
  ).data;

  if (tapes.length == 0) return undefined;
  return tapes[0].user_address;
}

// time in seconds
export function formatTime(time: number): string {
  let val: number;

  if (time > 2592000) {
    val = Math.round(time / 2592000);
    return val == 1 ? `${val} month` : `${val} months`;
  }
  if (time > 604800) {
    val = Math.round(time / 604800);
    return val == 1 ? `${val} week` : `${val} weeks`;
  }
  if (time > 86400) {
    val = Math.round(time / 86400);
    return val == 1 ? `${val} day` : `${val} days`;
  }
  if (time > 3600) {
    val = Math.round(time / 3600);
    return val == 1 ? `${val} hour` : `${val} hours`;
  }
  if (time > 60) {
    val = Math.round(time / 60);
    return val == 1 ? `${val} minute` : `${val} minutes`;
  }

  return `${Math.round(time)} seconds`;
}

// time in seconds
export function timeToDateUTCString(time: number) {
  const date = new Date(time * 1000);
  return formatDate(date);
}

export function formatDate(date: Date) {
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    timeZone: "UTC",
    timeZoneName: "short",
  };

  const dateString = date.toLocaleDateString("en-US", options);
  const [month_day, year, time] = dateString.split(",");
  const [month, day] = month_day.split(" ");
  const year_simple = year.substring(1);

  return `${month}/${day}/${year_simple}, ${time}`;
}

export function generateEntropy(userAddress?: string, ruleId?: string): string {
  const hexRuleId = `0x${ruleId}`;
  if (
    !userAddress ||
    userAddress.length != 42 ||
    !isHex(userAddress) ||
    !isHex(hexRuleId)
  ) {
    return "";
  }

  const userBytes = toBytes(`${userAddress}`);
  const ruleIdBytes = toBytes(hexRuleId);

  const fullEntropyBytes = new Uint8Array(
    userBytes.length + ruleIdBytes.length,
  );
  fullEntropyBytes.set(userBytes);
  fullEntropyBytes.set(ruleIdBytes, userBytes.length);
  return sha256(fullEntropyBytes);
}

export async function getTapeGif(tape_id: string): Promise<string | null> {
  try {
    const response = await fetch(buildUrl(envClient.GIF_SERVER_URL, "gifs"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify([tape_id]),
    });

    if (!response.ok || response.status === 204) return null;

    const gif = await response.json();

    return gif[0];
  } catch (e) {
    console.log(`Error fetching gif: ${e}`);
    return null;
  }
}

export async function getTapesGifs(
  tapes: Array<string>,
): Promise<Array<string>> {
  if (tapes.length == 0) return [];

  try {
    const response = await fetch(buildUrl(envClient.GIF_SERVER_URL, "gifs"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(tapes),
    });

    if (!response.ok) return [];

    const gifs = await response.json();
    return gifs;
  } catch (e) {
    console.log(`Error fetching gifs: ${e}`);
    return [];
  }
}

export async function insertTapeGif(gameplay_id: string, gifImage: string) {
  const payload = await encrypt({ gameplay_id: gameplay_id, gif: gifImage });
  try {
    await fetch(buildUrl(envClient.GIF_SERVER_URL, "insert-gif"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: payload,
    });
  } catch (e) {
    console.log(`Error inserting gif: ${e}`);
  }
}

export async function getTapeImage(tape_id: string): Promise<string | null> {
  try {
    const response = await fetch(buildUrl(envClient.GIF_SERVER_URL, "images"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify([tape_id]),
    });

    if (!response.ok) return null;

    const imgs = await response.json();

    return imgs[0];
  } catch (e) {
    console.log(`Error fetching image: ${e}`);
    return null;
  }
}

export async function getTapesImages(
  tapes: Array<string>,
): Promise<Array<string>> {
  if (tapes.length == 0) return [];

  try {
    const response = await fetch(buildUrl(envClient.GIF_SERVER_URL, "images"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(tapes),
    });

    if (!response.ok) return [];

    const imgs = await response.json();
    return imgs;
  } catch (e) {
    console.log(`Error fetching images: ${e}`);
    return [];
  }
}

export async function insertTapeImage(gameplay_id: string, gifImage: string) {
  const payload = await encrypt({ gameplay_id: gameplay_id, image: gifImage });
  try {
    await fetch(buildUrl(envClient.GIF_SERVER_URL, "insert-image"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: payload,
    });
  } catch (e) {
    console.log(`Error inserting image: ${e}`);
  }
}

export async function getTapeName(tape_id: string): Promise<string | null> {
  try {
    const response = await fetch(buildUrl(envClient.GIF_SERVER_URL, "names"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify([tape_id]),
    });

    if (!response.ok) return null;

    const names = await response.json();

    return names[0];
  } catch (e) {
    console.log(`Error fetching tape name: ${e}`);
    return null;
  }
}

export async function insertTapeName(gameplay_id: string, name: string) {
  const payload = await encrypt({ gameplay_id: gameplay_id, name: name });
  try {
    await fetch(buildUrl(envClient.GIF_SERVER_URL, "insert-name"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: payload,
    });
  } catch (e) {
    console.log(`Error inserting tape name: ${e}`);
  }
}

let customSepolia = Object.assign({}, sepolia); //.rpcUrls.default.http = ["https://base-sepolia-rpc.publicnode.com"];
customSepolia = Object.assign(customSepolia, {
  rpcUrls: {
    default: { http: ["https://ethereum-sepolia-rpc.publicnode.com"] },
  },
});

let customBaseSepolia = Object.assign({}, baseSepolia); //.rpcUrls.default.http = ["https://base-sepolia-rpc.publicnode.com"];
customBaseSepolia = Object.assign(customBaseSepolia, {
  rpcUrls: { default: { http: ["https://base-sepolia-rpc.publicnode.com"] } },
});

const chains: Record<number, Chain> = {};
chains[base.id] = base;
chains[mainnet.id] = mainnet;
chains[sepolia.id] = customSepolia;
chains[polygon.id] = polygon;
chains[polygonMumbai.id] = polygon;
chains[anvil.id] = anvil;
chains[baseSepolia.id] = customBaseSepolia;
chains[worldchain.id] = worldchain;

export function getChain(chainId: number): Chain;
export function getChain(chainId: string): Chain;
export function getChain(chainId: number | string) {
  if (typeof chainId === "string") {
    if (!isHex(chainId)) return null;
    chainId = fromHex(chainId, "number");
  }

  const chain = chains[chainId];
  if (!chain) return null;

  return chain;
}

export async function getClient(wallet: ConnectedWallet) {
  const chainId: string = wallet.chainId.split(":").at(-1) || "0";
  const chain = getChain(parseInt(chainId));
  const provider = await wallet.getEthereumProvider();
  return createPublicClient({
    chain: chain,
    transport: custom(provider),
  }).extend(publicActionsL1());
}

export async function getWalletClient(
  wallet: ConnectedWallet,
): Promise<BaseLayerWalletClient> {
  const chainId: string = wallet.chainId.split(":").at(-1) || "0";
  const chain = getChain(parseInt(chainId));
  const provider = await wallet.getEthereumProvider();
  return createWalletClient({
    account: wallet.address as Hex,
    chain: chain,
    transport: custom(provider),
  }).extend(walletActionsL1()) as BaseLayerWalletClient;
}

export async function getL2Client() {
  const nodeAddress = envClient.CARTESI_NODE_URL;
  if (!nodeAddress) return null;
  return createCartesiPublicClient({
    transport: http(nodeAddress),
  });
}

export interface TapesRequest {
  tapeIds?: string[];
  currentPage: number;
  pageSize: number;
  orderBy?: string;
  orderDir?: string;
  cartridgeId?: string; // can be used to filter by cartridge
  msg_sender?: string;
  ruleId?: string;
}

export async function getTapes(options: TapesRequest) {
  let tags: Array<string> = ["tape"];
  if (options.cartridgeId) tags.push(options.cartridgeId);
  if (options.ruleId) tags.push(options.ruleId);

  if (options.tapeIds && options.tapeIds.length > 0) {
    tags = tags.concat(options.tapeIds);
  }
  const req_options: IndexerPayload = {
    page: options.currentPage,
    page_size: options.pageSize,
    type: "input",
    tags: tags,
  };

  if (options.orderBy) req_options.order_by = options.orderBy;
  if (options.orderDir) req_options.order_dir = options.orderDir;
  if (options.msg_sender) req_options.msg_sender = options.msg_sender;

  const res: DecodedIndexerOutput = await getOutputs(req_options, {
    cartesiNodeUrl: envClient.CARTESI_NODE_URL,
    applicationAddress: envClient.DAPP_ADDR as `0x${string}`,
  });

  return res;
}

export interface CartridgesRequest {
  cartridgeIds?: string[];
  currentPage: number;
  pageSize: number;
  orderBy?: string;
  orderDir?: string;
  user_address?: string;
  ruleId?: string;
  tags?: string[];
  getCover?: boolean;
}

export async function getCartridges(
  options: CartridgesRequest,
): Promise<CartridgesOutput> {
  const req_options: CartridgesPayload = {
    get_cover: options.getCover,
    // page: options.currentPage,
    // page_size: options.pageSize,
    // TODO: other parameters after new version
  };
  if (options.tags && options.tags.length > 0) req_options.tags = options.tags;

  const res: CartridgesOutput = await cartridges(req_options, {
    decode: true,
    decodeModel: "CartridgesOutput",
    cartesiNodeUrl: envClient.CARTESI_NODE_URL,
    applicationAddress: envClient.DAPP_ADDR as `0x${string}`,
  });

  const newData: CartridgeInfo[] = [];
  for (const cartridge of res.data) {
    if (
      options.user_address &&
      options.user_address.toLowerCase() != cartridge.user_address.toLowerCase()
    )
      continue;
    if (
      options.cartridgeIds &&
      options.cartridgeIds.indexOf(cartridge.id) == -1
    )
      continue;
    newData.push(cartridge);
  }

  res.total = newData.length;
  if (
    options.pageSize &&
    options.currentPage &&
    options.pageSize < newData.length
  ) {
    res.data = newData.slice(
      options.pageSize * (options.currentPage - 1),
      options.pageSize * options.currentPage,
    );
  } else {
    res.data = newData;
  }

  return res;
}

export function extractTxError(msg: string): string {
  if (msg.substring(0, FRONTEND_ERROR_PREFIX.length) == FRONTEND_ERROR_PREFIX) {
    return msg.substring(FRONTEND_ERROR_PREFIX.length);
  }

  const m = msg.match(/(.*)\s\[/);
  if (m?.length && m.length >= 2) return m[1] as string;
  return "Error in transaction";
}

const CARTRIDGE_ID_BYTES = 6;
const RULE_ID_BYTES = 20;
const TAPE_ID_BYTES = 32;
const TRUNCATED_TAPE_ID_BYTES = 12;

export function cartridgeIdFromBytes(id: string): string {
  return id.startsWith("0x")
    ? id.slice(2, 2 + 2 * CARTRIDGE_ID_BYTES)
    : id.slice(0, 2 * CARTRIDGE_ID_BYTES);
}

export function ruleIdFromBytes(id: string): string {
  return id.startsWith("0x")
    ? id.slice(2, 2 + 2 * RULE_ID_BYTES)
    : id.slice(0, 2 * RULE_ID_BYTES);
}

export function tapeIdFromBytes(id: string): string {
  return id.startsWith("0x")
    ? id.slice(2, 2 + 2 * TAPE_ID_BYTES)
    : id.slice(0, 2 * TAPE_ID_BYTES);
}

export function truncateTapeHash(id: string): string {
  return id.startsWith("0x")
    ? id.slice(2, 2 + 2 * TRUNCATED_TAPE_ID_BYTES)
    : id.slice(0, 2 * TRUNCATED_TAPE_ID_BYTES);
}

export function formatCartridgeIdToBytes(id: string): string {
  return `0x${cartridgeIdFromBytes(id)}${"0".repeat(2 * (32 - CARTRIDGE_ID_BYTES))}`;
}

export function formatRuleIdToBytes(id: string): string {
  return `0x${ruleIdFromBytes(id)}${"0".repeat(2 * (32 - RULE_ID_BYTES))}`;
}

export function formatTapeIdToBytes(id: string): string {
  return `0x${tapeIdFromBytes(id)}${"0".repeat(2 * (32 - TAPE_ID_BYTES))}`;
}

export function calculateTapeId(ruleId: string, log: Uint8Array): string {
  return `${ruleIdFromBytes(ruleId)}${truncateTapeHash(keccak256(log))}`;
}

export function calculateCartridgeId(log: Uint8Array): string {
  return cartridgeIdFromBytes(truncateTapeHash(keccak256(log)));
}

export async function getUsersFromCartridges(
  cartridges: Array<CartridgeInfo>,
  currUserMap: Record<string, User>,
) {
  const newUserAddresses: Set<string> = new Set();
  for (const cartridge of cartridges) {
    const userAddress = cartridge.user_address.toLowerCase();
    if (!currUserMap[userAddress]) {
      newUserAddresses.add(userAddress);
    }
  }

  let newUserMap: Record<string, User> = {};
  if (newUserAddresses.size > 0) {
    newUserMap = JSON.parse(
      await getUsersByAddress(Array.from(newUserAddresses)),
    );
  }

  return newUserMap;
}

export async function getUsersFromTapes(
  tapes: Array<VerifyPayload>,
  currUserMap: Record<string, User>,
) {
  const newUserAddresses: Set<string> = new Set();
  for (const tape of tapes) {
    const userAddress = tape._msgSender.toLowerCase();
    if (!currUserMap[userAddress]) {
      newUserAddresses.add(userAddress);
    }
  }

  let newUserMap: Record<string, User> = {};
  if (newUserAddresses.size > 0) {
    newUserMap = JSON.parse(
      await getUsersByAddress(Array.from(newUserAddresses)),
    );
  }

  return newUserMap;
}

export async function verifyChain(wallet: ConnectedWallet) {
  if (
    wallet.chainId.toLowerCase() != envClient.NETWORK_CHAIN_ID.toLowerCase()
  ) {
    try {
      await wallet.switchChain(envClient.NETWORK_CHAIN_ID as `0x${string}`);
    } catch (error) {
      console.log((error as Error).message);
      throw new Error(
        `${FRONTEND_ERROR_PREFIX} Failed to change to the correct network (${envClient.NETWORK_CHAIN_ID})`,
      );
    }
  }
}

export async function getCartridgeInfo(cartridge_id: string) {
  let cartridgeWithInfo: CartridgeInfo = await cartridgeInfo(
    { id: cartridge_id },
    {
      decode: true,
      cartesiNodeUrl: envClient.CARTESI_NODE_URL,
      applicationAddress: envClient.DAPP_ADDR as `0x${string}`,
    },
  );

  if (!cartridgeWithInfo.primary && cartridgeWithInfo.primary_id) {
    cartridgeWithInfo = await cartridgeInfo(
      { id: cartridgeWithInfo.primary_id },
      {
        decode: true,
        cartesiNodeUrl: envClient.CARTESI_NODE_URL,
        applicationAddress: envClient.DAPP_ADDR as `0x${string}`,
      },
    );
  }

  return cartridgeWithInfo;
}

export async function getRuleInfo(rule_id: string): Promise<RuleInfo | null> {
  const rulesFound: Array<RuleInfo> = (
    await rules(
      { id: rule_id },
      {
        cartesiNodeUrl: envClient.CARTESI_NODE_URL,
        applicationAddress: envClient.DAPP_ADDR as `0x${string}`,
        decode: true,
      },
    )
  ).data;

  if (rulesFound.length == 0) return null;

  return rulesFound[0];
}
