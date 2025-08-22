import ManageSearchIcon from "@mui/icons-material/ManageSearch";
import { cartridgeInfo, rules } from "@/app/backend-libs/core/lib";
import { CartridgeInfo, RuleInfo } from "@/app/backend-libs/core/ifaces";
import { envClient } from "@/app/utils/clientEnv";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContestStatus, getContestStatus } from "../../utils/common";
import CartridgeCard from "@/app/components/CartridgeCard";
import RuleLeaderboard from "@/app/components/RuleLeaderboard";
import {
  formatTime,
  getContestWinner,
  timeToDateUTCString,
} from "@/app/utils/util";
import { getUsersByAddress, User } from "@/app/utils/privyApi";

export const revalidate = 0; // revalidate always

export async function generateMetadata({
  params,
}: {
  params: Promise<{ contest_id: string }>;
}) {
  const { contest_id } = await params;
  const contest = await getRule(contest_id);

  const sharetitle = `${contest?.name} | RIVES`;
  const desc = `Contest "${contest?.name}"`;

  return {
    title: contest?.name,
    openGraph: {
      siteName: "rives.io",
      title: sharetitle,
      description: desc,
    },
    twitter: {
      title: sharetitle,
      card: "summary",
      creator: "@rives_io",
      description: desc,
    },
  };
}

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

const getRule = async (rule_id: string): Promise<RuleInfo | null> => {
  const rulesFound: Array<RuleInfo> = (
    await rules(
      { id: rule_id, enable_deactivated: true },
      {
        cartesiNodeUrl: envClient.CARTESI_NODE_URL,
        applicationAddress: envClient.DAPP_ADDR as `0x${string}`,
        decode: true,
      },
    )
  ).data;

  if (rulesFound.length == 0) return null;

  return rulesFound[0];
};

async function getGameInfo(cartridge_id: string) {
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

export default async function Contest({
  params,
}: {
  params: Promise<{ contest_id: string }>;
}) {
  const { contest_id } = await params;
  const userAddresses: Set<string> = new Set();

  const contest = await getRule(contest_id);
  if (!contest) {
    notFound();
  }

  let contestCreatorUser = null as User | null;
  let contestWinnerUser: User | null = null;
  let contestWinner: string | undefined;
  userAddresses.add(contest.created_by);
  const contestCreatorAddr = contest.created_by.toLowerCase();

  const formatedContestCreator = `${contestCreatorAddr.slice(0, 6)}...${contestCreatorAddr.substring(contestCreatorAddr.length - 4, contestCreatorAddr.length)}`;
  const status = getContestStatus(contest);
  const contestIsOpen = status == ContestStatus.IN_PROGRESS;
  const game = await getGameInfo(contest.cartridge_id);
  if (status == ContestStatus.FINISHED) {
    contestWinner = await getContestWinner(contest.cartridge_id, contest_id);
    if (contestWinner) {
      contestWinner = contestWinner.toLowerCase();
      userAddresses.add(contestWinner);
    }
  }

  const userMap: Record<string, User> = JSON.parse(
    await getUsersByAddress(Array.from(userAddresses)),
  );
  if (contestWinner && userMap[contestWinner]) {
    contestWinnerUser = userMap[contestWinner];
  }

  if (userMap[contestCreatorAddr])
    contestCreatorUser = userMap[contestCreatorAddr];

  return (
    <main>
      <section>
        <div className="w-full flex flex-wrap items-center bg-black p-4 gap-2 md:gap-8 lg:gap-20">
          <CartridgeCard
            cartridge={game}
            small={true}
            creator={userMap[game.user_address.toLowerCase()] || null}
          />

          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col">
              <span className="pixelated-font text-xl">{contest.name}</span>
              {!contestWinner ? (
                <></>
              ) : contestWinnerUser ? (
                <span title={contestWinner} className="text-gray-400">
                  Winner:{" "}
                  <Link
                    className="pixelated-font text-rives-purple hover:underline"
                    href={`/profile/${contestWinner}`}
                  >
                    {contestWinnerUser.name}
                  </Link>
                </span>
              ) : (
                <span title={contestWinner} className="text-gray-400">
                  Winner:{" "}
                  <Link
                    className="pixelated-font text-rives-purple hover:underline"
                    href={`/profile/${contestWinner}`}
                  >
                    {`${contestWinner.slice(0, 6)}...${contestWinner.substring(contestWinner.length - 4, contestWinner.length)}`}
                  </Link>
                </span>
              )}
            </div>

            {!contestIsOpen ? (
              <></>
            ) : (
              <Link
                href={`/play/${contest.id}`}
                className="bg-rives-purple pixelated-font justify-self-end h-fit text-center py-2 w-full md:w-2/3 hover:scale-110"
              >
                PLAY
              </Link>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-7 gap-4 mt-8">
          <div className="flex flex-col gap-4 lg:col-span-3">
            <div className="flex flex-col">
              <h1 className="pixelated-font text-xl">
                Overview{" "}
                <Link
                  href={`/cartridges/${contest.cartridge_id}/play_modes/${contest.id}`}
                  title="Show Details"
                >
                  <ManageSearchIcon></ManageSearchIcon>
                </Link>{" "}
              </h1>

              <div className="grid grid-cols-2">
                {/* TODO: Get tapes */}
                {/* <span className="text-gray-400">Submissions</span>
                  <span>{contest.n_tapes}</span> */}

                <span className="text-gray-400">Status</span>
                {contestStatusMessage(contest)}

                <span className="text-gray-400">Start</span>
                {contest.start ? timeToDateUTCString(contest.start) : "-"}

                <span className="text-gray-400">End</span>
                {contest.end ? timeToDateUTCString(contest.end) : "-"}

                <span className="text-gray-400">Contest Creator</span>
                {contestCreatorUser ? (
                  <Link
                    className="text-rives-purple hover:underline"
                    title={contest.created_by}
                    href={`/profile/${contest.created_by}`}
                  >
                    {contestCreatorUser.name}
                  </Link>
                ) : (
                  <Link
                    className="text-rives-purple hover:underline"
                    title={contest.created_by}
                    href={`/profile/${contest.created_by}`}
                  >
                    {formatedContestCreator}
                  </Link>
                )}
              </div>
            </div>

            <div className="flex flex-col">
              <h1 className="pixelated-font text-xl">Description</h1>
              <pre
                style={{ whiteSpace: "pre-wrap", fontFamily: "Iosevka Web" }}
              >
                {contest.description}
              </pre>
            </div>
          </div>

          <div className="flex flex-col gap-4 lg:col-span-4">
            <h1 className="pixelated-font text-xl">Leaderboard</h1>

            <RuleLeaderboard
              cartridge_id={contest.cartridge_id}
              rule={contest.id}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
