"use client";

import { ContestStatus, getContestStatus } from "../utils/common";
import { CartridgeInfo, RuleInfo } from "../backend-libs/core/ifaces";
import CartridgeCard from "./CartridgeCard";
import { useEffect, useState } from "react";
import { envClient } from "../utils/clientEnv";
import { tapes } from "../backend-libs/core/lib";
import { formatTime, getContestWinner } from "../utils/util";
import { getUsersByAddress, User } from "../utils/privyApi";
import Link from "next/link";

function contestStatusMessage(contest: RuleInfo) {
  // if (!(contest.start && contest.end)) return <span>-</span>;

  const currDate = new Date().getTime() / 1000;
  const start = contest.start ? contest.start : 0;
  const end = contest.end ? contest.end : 32502815999;

  if (currDate > end) {
    return (
      <span className="text-red-500">
        CLOSED: ended {formatTime(currDate - end)} ago{" "}
      </span>
    );
  } else if (currDate < start) {
    const lasts = !contest.end ? "" : ` and lasts ${formatTime(end - start)}`;
    return (
      <span className="text-yellow-500">
        UPCOMING: starts in {formatTime(start - currDate)}
        {lasts}
      </span>
    );
  } else {
    const endsIn = !contest.end
      ? ""
      : `: ends in ${formatTime(end - currDate)}`;
    return <span className="text-green-500">OPEN{endsIn}</span>;
  }
}

export interface CartridgeWithUser extends CartridgeInfo {
  user?: User | null;
}

export default function ContestCard({
  contest,
  cartridge,
  activateNonContest,
}: {
  contest: RuleInfo;
  cartridge: CartridgeWithUser;
  activateNonContest?: boolean;
}) {
  const [winnerAddress, setWinnerAddress] = useState<string>("");
  const [winnerUser, setWinnerUser] = useState<User | null>(null);
  const isContest = activateNonContest || (contest.start && contest.end);
  const cartridgeCard = (
    <CartridgeCard
      cartridge={cartridge}
      small={true}
      creator={cartridge.user}
    />
  );
  const [nTapes, setNTapes] = useState<number>();

  const status = getContestStatus(contest);
  useEffect(() => {
    const checkWinner = async () => {
      if (status == ContestStatus.FINISHED) {
        const contestWinnerAddress = await getContestWinner(
          contest.cartridge_id,
          contest.id,
        );
        if (!contestWinnerAddress) return;
        setWinnerAddress(contestWinnerAddress);

        const userMap: Record<string, User> = JSON.parse(
          await getUsersByAddress([contestWinnerAddress]),
        );
        const contestWinnerUser = userMap[contestWinnerAddress.toLowerCase()];

        if (!contestWinnerUser) {
          return;
        }

        setWinnerUser(contestWinnerUser);
      }
    };

    checkWinner();
  }, []);

  useEffect(() => {
    tapes(
      { rule_id: contest.id, page: 1, page_size: 0 },
      {
        cartesiNodeUrl: envClient.CARTESI_NODE_URL,
        decode: true,
        applicationAddress: envClient.DAPP_ADDR as `0x${string}`,
      },
    ).then((tapeOut) => {
      setNTapes(tapeOut.total);
    });
  }, [contest]);

  return (
    <div className="relative w-[352px] h-60">
      <div
        id={contest.id}
        onClick={() =>
          isContest ? window.open(`/contests/${contest.id}`, "_self") : null
        }
        className={`h-full bg-black p-4 flex flex-col gap-2 text-start border border-transparent ${isContest ? "hover:border-white hover:cursor-pointer" : ""}`}
      >
        <div className="flex gap-2 text-start">
          <div>{cartridgeCard}</div>

          <div className="flex flex-col gap-1 w-full">
            <div className="flex flex-col">
              <span className="pixelated-font text-lg leading-none">
                {contest.name}
              </span>
              <span className="text-sm text-gray-400">
                {nTapes} Submissions
              </span>
            </div>

            <div className="flex flex-col leading-none">
              {contestStatusMessage(contest)}

              {winnerAddress.length == 0 ? (
                status == ContestStatus.FINISHED ? (
                  <span>WINNER: TBA</span>
                ) : (
                  <></>
                )
              ) : !winnerUser ? (
                <span title={winnerAddress}>
                  WINNER:{" "}
                  <Link
                    onClick={(e: React.MouseEvent<HTMLElement>) =>
                      e.stopPropagation()
                    }
                    href={`/profile/${winnerAddress}`}
                    className="text-rives-purple hover:underline"
                  >
                    {`${winnerAddress.slice(0, 6)}...${winnerAddress.substring(winnerAddress.length - 4, winnerAddress.length)}`}
                  </Link>
                </span>
              ) : (
                <span title={winnerAddress}>
                  WINNER:{" "}
                  <Link
                    onClick={(e: React.MouseEvent<HTMLElement>) =>
                      e.stopPropagation()
                    }
                    href={`/profile/${winnerAddress}`}
                    className="text-rives-purple hover:underline"
                  >
                    {winnerUser.name}
                  </Link>
                </span>
              )}

              <div></div>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute start-4 top-4">{cartridgeCard}</div>
    </div>
  );
}
