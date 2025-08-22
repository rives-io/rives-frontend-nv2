"use client";

import Image from "next/image";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { toBytes } from "viem";
import React, { useEffect, useState } from "react";
import { sha256 } from "js-sha256";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";

import {
  getOutputs,
  VerificationOutput,
  VerifyPayloadInput,
} from "../backend-libs/core/lib";
import { envClient } from "../utils/clientEnv";
import { DecodedIndexerOutput } from "../backend-libs/cartesapp/lib";
import { getUsersByAddress, User } from "../utils/privyApi";
import rivesCheck from "@/public/default_profile.png";
import { tapeIdFromBytes, timeToDateUTCString } from "../utils/util";

const DEFAULT_PAGE_SIZE = 10;
let total_pages = 1;

const getGeneralVerificationPayloads = async (
  cartridge_id: string,
  rule: string,
  page: number, //, getVerificationOutputs: boolean
): Promise<DecodedIndexerOutput> => {
  // if (getVerificationOutputs) {
  const tags = ["score", cartridge_id, rule];
  const res = await getOutputs(
    {
      tags,
      type: "notice",
      page,
      page_size: DEFAULT_PAGE_SIZE,
      order_by: "value",
      order_dir: "desc",
    },
    {
      cartesiNodeUrl: envClient.CARTESI_NODE_URL,
      applicationAddress: envClient.DAPP_ADDR as `0x${string}`,
    },
  );
  // } else {
  // const tags = ["tape", cartridge_id, rule];
  // res = await getOutputs(
  //     {
  //         tags,
  //         type: 'input',
  //         page,
  //         page_size: DEFAULT_PAGE_SIZE,
  //         order_by: "block_timestamp",
  //         order_dir: "desc"
  //     },
  //     {cartesiNodeUrl: envClient.CARTESI_NODE_URL, applicationAddress: envClient.DAPP_ADDR as `0x${string}`});
  // }

  total_pages = Math.ceil(res.total / DEFAULT_PAGE_SIZE);
  return res;
};

function tapesBoardFallback() {
  const arr = Array.from(Array(DEFAULT_PAGE_SIZE).keys());

  return (
    <div className="relative min-h-[480px]">
      <table className="w-full text-left">
        <thead className="text-xsuppercase">
          <tr>
            <th scope="col">#</th>
            <th scope="col">User</th>
            <th scope="col">Timestamp</th>
            <th scope="col">Score</th>
          </tr>
        </thead>
        <tbody className="animate-pulse text-transparent">
          {arr.map((num, index) => {
            return (
              <tr key={index}>
                <td className=" h-[50px] flex items-center gap-2">
                  <div className="h-12 w-12 fallback-bg-color rounded-full"></div>
                  <div className="fallback-bg-color rounded-md">
                    0xf39F...2266
                  </div>
                </td>

                <td className=" h-[50px]">
                  <div className="fallback-bg-color rounded-md">
                    31/12/1969, 21:06:36 PM
                  </div>
                </td>

                <td className="w-[50px] h-[50px]">
                  <div className="fallback-bg-color rounded-md">100</div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RuleLeaderboard({
  cartridge_id,
  rule,
}: {
  cartridge_id: string;
  rule: string | undefined;
}) {
  const [tapePayloads, setTapePayloads] = useState<
    VerifyPayloadInput[] | VerificationOutput[] | null
  >(null);
  const [addressUserMap, setAddressUserMap] = useState<Record<string, User>>(
    {},
  );

  // pagenation state
  const [currPage, setCurrPage] = useState(1);
  const [pageToLoad, setPageToLoad] = useState(1);
  const [atEnd, setAtEnd] = useState(false);
  const [oldRule, setOldRule] = useState<string>();

  // user
  const { user, ready, authenticated } = usePrivy();
  const userAddress =
    ready && authenticated && user?.wallet?.address
      ? user?.wallet?.address.toLowerCase()
      : null;

  const reloadScores = async (page: number) => {
    if (!rule) return null;
    return await getGeneralVerificationPayloads(cartridge_id, rule, page); //, get_verification_outputs))
  };

  const previousPage = () => {
    setPageToLoad(currPage - 1);
  };

  const nextPage = () => {
    setPageToLoad(currPage + 1);
  };

  useEffect(() => {
    let newRule = false;
    let page = pageToLoad;
    if (rule != oldRule) {
      setTapePayloads(null);
      setOldRule(rule);
      newRule = true;
      page = 1;
    }
    if (currPage == pageToLoad && !newRule) return;
    if (tapePayloads) setTapePayloads(null); // set to null to trigger the loading effect

    reloadScores(page).then((res) => {
      if (!res) return;

      const addresses: Set<string> = new Set();

      const scores = res.data;
      scores.forEach((score) => {
        const verification_outputs = score instanceof VerificationOutput;
        const sender = verification_outputs
          ? score.user_address
          : score._msgSender;
        addresses.add(sender);
      });

      getUsersByAddress(Array.from(addresses)).then((res: string) => {
        const users: Record<string, User> = JSON.parse(res);

        setAddressUserMap({ ...addressUserMap, ...users });
        setTapePayloads(scores);
      });

      setAtEnd(res.total <= page * DEFAULT_PAGE_SIZE);
      setCurrPage(page);
      setPageToLoad(page);
    });
  }, [pageToLoad, rule]);

  useEffect(() => {
    setTapePayloads(null);
  }, [cartridge_id]);

  if (!rule) {
    return (
      <div className="relative text-center">
        {/* <span>No rule selected!</span> */}
      </div>
    );
  }

  if (!tapePayloads) {
    return tapesBoardFallback();
  }

  if (tapePayloads.length == 0) {
    return (
      <div className="relative text-center">
        <span className="pixelated-font">No tapes</span>
      </div>
    );
  }

  function getTapeId(tapeHex: string): string {
    return sha256(toBytes(tapeHex));
  }

  return (
    <div className="relative min-h-[480px]">
      <table className="w-full text-left">
        <thead className="text-xsuppercase">
          <tr>
            <th scope="col" className="">
              #
            </th>
            <th scope="col" className="">
              User
            </th>
            <th scope="col" className="">
              Timestamp
            </th>
            <th scope="col" className="">
              Score
            </th>
          </tr>
        </thead>
        <tbody>
          {tapePayloads.map((tape, index) => {
            const verification_outputs = tape instanceof VerificationOutput;
            const tapets = verification_outputs
              ? tape.timestamp
              : tape._blockTimestamp;
            const sender = verification_outputs
              ? tape.user_address
              : tape._msgSender;
            const tapeId = verification_outputs
              ? tapeIdFromBytes(tape.tape_id)
              : getTapeId(tape.tape);
            const score = verification_outputs ? tape.score.toString() : "-";
            const userTape = userAddress == sender?.toLocaleLowerCase();

            const user = addressUserMap[sender.toLowerCase()];

            return (
              <tr
                key={index}
                className={`p-4 hover:bg-rives-purple hover:text-black ${userTape ? "bg-rives-gray" : ""}`}
              >
                <td className="linkTableData">
                  <Link href={`/tapes/${tapeId}`}>
                    {index + 1 + (currPage - 1) * DEFAULT_PAGE_SIZE}
                  </Link>
                </td>
                {!user ? (
                  <td className="linkTableData">
                    <Link href={`/tapes/${tapeId}`}>
                      <div className="flex items-center gap-2">
                        <Image
                          width={48}
                          height={48}
                          src={rivesCheck}
                          className="rounded-full pixelated-img"
                          alt=""
                        />
                        <span className="break-all" title={sender}>
                          {sender?.substring(0, 6) +
                            "..." +
                            sender?.substring(
                              sender?.length - 4,
                              sender?.length,
                            )}
                        </span>
                      </div>
                    </Link>
                  </td>
                ) : (
                  <td className="linkTableData">
                    <Link href={`/tapes/${tapeId}`}>
                      <div className="flex items-center gap-2">
                        <Image
                          width={48}
                          height={48}
                          src={user ? user.picture_url : ""}
                          className="rounded-full pixelated-img"
                          alt=""
                        />
                        <span title={sender}>{user.name}</span>
                      </div>
                    </Link>
                  </td>
                )}

                <td className="linkTableData">
                  <Link href={`/tapes/${tapeId}`}>
                    {timeToDateUTCString(Number(tapets))}
                  </Link>
                </td>
                <td className="linkTableData">
                  <Link href={`/tapes/${tapeId}`}>{score}</Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="flex justify-center items-center space-x-1">
        <button
          disabled={currPage == 1}
          onClick={previousPage}
          className={`border border-transparent ${currPage != 1 ? "hover:border-black" : ""}`}
        >
          <NavigateBeforeIcon />
        </button>
        <span>
          {currPage} of {total_pages}
        </span>
        <button
          disabled={atEnd}
          onClick={nextPage}
          className={`border border-transparent ${!atEnd ? "hover:border-black" : ""}`}
        >
          <NavigateNextIcon />
        </button>
      </div>
    </div>
  );
}

export default RuleLeaderboard;
