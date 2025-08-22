import { str, envsafe, url } from "envsafe";

export const envClient = envsafe({
  DAPP_ADDR: str({
    input: process.env.NEXT_PUBLIC_DAPP_ADDR,
    desc: "Cartesi DApp ETH address.",
  }),
  CARTESI_NODE_URL: url({
    input: process.env.NEXT_PUBLIC_CARTESI_NODE_URL,
    desc: "Cartesi Node URL.",
  }),
  NETWORK_CHAIN_ID: str({
    input: process.env.NEXT_PUBLIC_NETWORK_CHAIN_ID,
    desc: "Network ChainId (in hex) where the Cartesi DApp was deployed.",
  }),
  GIF_SERVER_URL: url({
    input: process.env.NEXT_PUBLIC_GIF_SERVER_URL,
    desc: "GIF Server URL.",
  }),
  // TAPE_CONTRACT_ADDR: str({
  //   input: process.env.NEXT_PUBLIC_TAPE_CONTRACT,
  //   desc: "Tape asset ETH address."
  // }),
  // CARTRIDGE_CONTRACT_ADDR: str({
  //   input: process.env.NEXT_PUBLIC_CARTRIDGE_CONTRACT,
  //   desc: "Cartridge asset ETH address."
  // }),
  OPERATOR_ADDR: str({
    input: process.env.NEXT_PUBLIC_OPERATOR_ADDR,
    desc: "Operator ETH address.",
  }),
  // ASSETS_BLOCK: str({
  //   input: process.env.NEXT_PUBLIC_ASSETS_BLOCK,
  //   desc: "(Earliest) assets deployment block number (hex)."
  // }),
  DEPLOYMENT_URL: url({
    input: process.env.NEXT_PUBLIC_DEPLOYMENT_URL,
    desc: "Deployment URL for the frontend. It is used to compose the openGraph URL of images.",
  }),
  // WORLD_ADDRESS: str({
  //   input: process.env.NEXT_PUBLIC_WORLD_ADDRESS,
  //   desc: "Mud world ETH address."
  // }),
  // AGGREGATOR: url({
  //   input: process.env.NEXT_PUBLIC_AGGREGATOR_URL,
  //   desc: "Aggregator URL."
  // }),
  // OLYMPICS_DATA_URL: url({
  //   input: process.env.OLYMPICS_DATA_URL,
  //   desc: "URL with the JSON that has the Olympics data.",
  //   default: "https://storage.googleapis.com/rives-vanguard-public/tournament/doom-olympics/leaderboard.json"
  // }),
  CARTRIDGES_URL: str({
    input: process.env.NEXT_PUBLIC_CARTRIDGES_URL,
    desc: "Cartridges URL.",
  }),
  // CARTRIDGE_FREE_INSERTION_MODEL: str({
  //   input: process.env.NEXT_PUBLIC_CARTRIDGE_FREE_INSERTION_MODEL,
  //   desc: "Cartridges insertion model address."
  // }),
  // TAPE_FREE_SUBMISSION_MODEL: str({
  //   input: process.env.NEXT_PUBLIC_TAPE_FREE_SUBMISSION_MODEL,
  //   desc: "Free tape submission model address."
  // }),
  // TAPE_OWNERSHIP_SUBMISSION_MODEL: str({
  //   input: process.env.NEXT_PUBLIC_TAPE_OWNERSHIP_SUBMISSION_MODEL,
  //   desc: "Ownership tape submission model address."
  // }),
  // TAPE_FEE_SUBMISSION_MODEL: str({
  //   input: process.env.NEXT_PUBLIC_TAPE_FEE_SUBMISSION_MODEL,
  //   desc: "Fee tape submission model address."
  // }),
  // GOOGLE_ANALYTICS_MEASUREMENT_ID: str({
  //   input: process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_MEASUREMENT_ID,
  //   desc: "Google analytics id.",
  //   default: "G-0QV24G07N2"
  // }),
  // B3_CONTEST_ID: str({
  //   input: process.env.NEXT_PUBLIC_B3_CONTEST_ID,
  //   desc: "B3 contest id.",
  //   default: "8c6b995264ea8c6b995264eacfee7c08a98f4b56"
  // }),
});
