import Image from "next/image";
import Link from "next/link";
import ReportIcon from "@mui/icons-material/Report";

import {
  cartridgeIdFromBytes,
  getCartridgeInfo,
  getRuleInfo,
  timeToDateUTCString,
} from "@/app/utils/util";
import { getUsersByAddress, User } from "@/app/utils/privyApi";
import RivemuPlayer from "@/app/components/RivemuPlayer";
import GameplaySubmitter from "@/app/components/GameplaySubmitter";
import { ContestStatus, getContestStatus } from "@/app/utils/common";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ rule_id: string }>;
}) {
  const { rule_id } = await params;
  const cartridge_id = cartridgeIdFromBytes(rule_id);

  const rulePromise = getRuleInfo(rule_id);
  const cartridgePromise = getCartridgeInfo(cartridge_id);

  const [rule, cartridge] = await Promise.all([rulePromise, cartridgePromise]);

  const title = `Play "${cartridge.name} - ${rule?.name}"`;
  const sharetitle = `${title} | RIVES`;
  const desc = `Play "${cartridge.name}" ${rule?.start && rule.end ? "Contest" : "Rule"} "${rule?.name}"`;

  return {
    title: title,
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

export default async function PlayRule({
  params,
}: {
  params: Promise<{ rule_id: string }>;
}) {
  const { rule_id } = await params;
  const cartridge_id = cartridgeIdFromBytes(rule_id);

  const rulePromise = getRuleInfo(rule_id);
  const cartridgePromise = getCartridgeInfo(cartridge_id);

  const [rule, cartridge] = await Promise.all([rulePromise, cartridgePromise]);

  const userMapString = await getUsersByAddress([cartridge.user_address]);
  const userMap: Record<string, User> = JSON.parse(userMapString);
  const creator = userMap[cartridge.user_address.toLowerCase()];

  if (!rule) {
    return (
      <main className="flex items-center justify-center h-lvh">
        <div className="flex w-96 flex-wrap break-all justify-center">
          <ReportIcon className="text-red-500 text-5xl" />
          <span style={{ color: "white" }}> Rule {rule_id} not found!</span>
        </div>
      </main>
    );
  }

  const status = getContestStatus(rule);

  return (
    <main>
      <section className="flex flex-col items-center gap-4">
        <RivemuPlayer rule_id={rule_id} />
        {[ContestStatus.IN_PROGRESS, ContestStatus.INVALID].indexOf(status) >
        -1 ? (
          <GameplaySubmitter />
        ) : (
          <></>
        )}

        <div className="w-full flex flex-col gap-2">
          <div className="flex flex-wrap gap-4">
            <div className="flex flex-col">
              <h1 className={`pixelated-font text-5xl`}>
                {cartridge.name} | {rule.name}
              </h1>
              {!creator ? (
                <div>
                  <span className="pixelated-font me-2">By:</span>
                  <Link
                    href={`/profile/${cartridge.user_address}`}
                    className="hover:underline text-rives-purple pixelated-font break-all"
                  >
                    {cartridge.user_address}
                  </Link>
                </div>
              ) : (
                <Link
                  href={`/profile/${cartridge.user_address}`}
                  className="flex items-center gap-2 w-fit hover:underline"
                >
                  <Image
                    width={48}
                    height={48}
                    src={creator.picture_url}
                    className="rounded-full"
                    alt=""
                  />
                  <span title={cartridge.user_address}>{creator.name}</span>
                </Link>
              )}
              <div className="flex">
                <span className="pixelated-font me-2">On:</span>
                <div>{timeToDateUTCString(cartridge.created_at)}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            className={`flex flex-col ${rule.description.length == 0 ? "col-span-full" : ""}`}
          >
            <h2 className={`pixelated-font text-3xl mb-2`}>
              Cartridge Description
            </h2>
            <pre style={{ whiteSpace: "pre-wrap", fontFamily: "Iosevka Web" }}>
              {cartridge.info?.description}
            </pre>
          </div>

          <div
            className={`${rule.description.length == 0 ? "invisible" : "visible"}`}
          >
            <h2 className={`pixelated-font text-3xl mb-2`}>
              Contest Description
            </h2>
            <pre style={{ whiteSpace: "pre-wrap", fontFamily: "Iosevka Web" }}>
              {rule.description}
            </pre>
          </div>
        </div>
      </section>
    </main>
  );
}
