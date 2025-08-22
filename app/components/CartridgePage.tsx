"use client";

import {
  CartridgeInfo as Cartridge,
  RuleInfo,
} from "../backend-libs/core/ifaces";
import Image from "next/image";
import { Menu, Tab } from "@headlessui/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import RuleLeaderboard from "./RuleLeaderboard";
// import { ContestStatus, getContestStatus } from "../utils/common";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
// import EditIcon from '@mui/icons-material/Edit';
import AddIcon from "@mui/icons-material/Add";
import CartridgeContests from "./CartridgeContests";
import CartridgeTapes from "./CartridgeTapes";
import CartridgeStats from "./CartridgeStats";
import { timeToDateUTCString } from "../utils/util";
import { getUsersByAddress, User } from "../utils/privyApi";
import CartridgeUnlocker from "./CartridgeUnlocker";
import PlayMode from "./PlayMode";

export default function CartridgePage({
  cartridge,
  rulesInfo,
}: {
  cartridge: Cartridge;
  rulesInfo: RuleInfo[];
}) {
  const [selectedRule, setSelectedRule] = useState<RuleInfo | null>(
    rulesInfo.length > 0 ? rulesInfo[0] : null,
  );
  const [creator, setCreator] = useState<User | null>(null);

  // const status = !selectedRule ? null : getContestStatus(selectedRule);
  // const contestIsOpen =
  //   status == ContestStatus.IN_PROGRESS || status == ContestStatus.INVALID;

  // const [reload, setReload] = useState(0);

  useEffect(() => {
    getUsersByAddress([cartridge.user_address]).then((userMapString) => {
      const userMap: Record<string, User> = JSON.parse(userMapString);
      const user = userMap[cartridge.user_address.toLowerCase()];
      if (user) setCreator(user);
    });
  }, [cartridge.user_address]);

  return (
    <main>
      <section className="flex flex-col items-center gap-8">
        <div className="flex flex-col gap-4">
          <div className="cartridgePageCover flex justify-center relative">
            <Image
              className="pixelated-img"
              style={{ objectFit: "contain" }}
              fill
              quality={100}
              src={"data:image/png;base64," + cartridge.cover}
              alt={"Not found"}
            />
          </div>

          <PlayMode rulesInfo={rulesInfo} />
        </div>

        <div className="w-full flex flex-col gap-2">
          <div className="flex flex-wrap gap-4">
            <div className="flex flex-col">
              <h1 className={`pixelated-font text-5xl`}>{cartridge.name}</h1>
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
              {cartridge.created_at > 0 ? (
                <div className="flex">
                  <span className="pixelated-font me-2">On:</span>
                  <div>{timeToDateUTCString(cartridge.created_at)}</div>
                </div>
              ) : (
                <></>
              )}
            </div>
          </div>
          <CartridgeStats cartridge_id={cartridge.id} reload={0} />
        </div>

        <div className="w-full flex flex-col">
          <div>
            <CartridgeUnlocker cartridge={cartridge} />
          </div>
          <h2 className={`pixelated-font text-3xl`}>Summary</h2>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              fontFamily: "Iosevka Web",
              marginBottom: "4px",
            }}
          >
            {cartridge.info?.summary}
          </pre>
          <div className="flex flex-warp gap-2 items-center">
            {cartridge.info?.tags?.map((tag, index) => {
              return (
                <span
                  key={`${tag}-${index}`}
                  className="pixelated-font py-1 px-2 rounded-full bg-rives-gray text-center text-sm"
                >
                  {tag}
                </span>
              );
            })}
          </div>
        </div>

        <div className="w-full flex flex-col">
          <h2 className={`pixelated-font text-3xl`}>Description</h2>
          <pre style={{ whiteSpace: "pre-wrap", fontFamily: "Iosevka Web" }}>
            {cartridge.info?.description}
          </pre>
        </div>

        <div className="w-full flex flex-col gap-2">
          {cartridge.unlocked ? (
            <h2 className={`pixelated-font text-3xl`}>
              Play Mode{" "}
              <Link
                href={`/cartridges/${cartridge.id}/play_modes`}
                title="List Play Modes"
              >
                <FormatListBulletedIcon></FormatListBulletedIcon>
              </Link>{" "}
              <Link
                href={`/cartridges/${cartridge.id}/play_modes/new`}
                title="Create Play Mode"
              >
                <AddIcon></AddIcon>
              </Link>
            </h2>
          ) : (
            <></>
          )}
          <div className="flex gap-4 justify-center md:justify-start">
            <Menu as="div" className="p-3 bg-rives-gray">
              <Menu.Button className="flex justify-center hover:text-rives-purple pixelated-font">
                {selectedRule?.name} <ArrowDropDownIcon />
              </Menu.Button>
              <Menu.Items className="absolute z-10 h-48 overflow-auto mt-2 divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black/5 focus:outline-none">
                {rulesInfo?.map((ruleInfo, index) => {
                  return (
                    <div key={index} className="px-1 py-1">
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            onClick={() => setSelectedRule(ruleInfo)}
                            className={`${active ? "bg-rives-purple text-white" : "text-black"} group flex w-full items-center rounded-md px-2 py-2 text-sm pixelated-font`}
                          >
                            {ruleInfo.name}
                          </button>
                        )}
                      </Menu.Item>
                    </div>
                  );
                })}
              </Menu.Items>
            </Menu>

            {/* <Link aria-disabled={!selectedRule || !contestIsOpen || selectedRule.deactivated} tabIndex={!selectedRule || !contestIsOpen? -1:undefined}
                        href={`/play/${selectedRule?.id}`}
                        className={`${!selectedRule || !contestIsOpen || selectedRule.deactivated? "pointer-events-none bg-slate-600" : "bg-rives-purple"} p-3 hover:scale-110 pixelated-font`}>
                            Play
                        </Link> */}

            {/* <Link href={`/cartridges/${cartridge.id}/play_modes/${selectedRule?.id}`}
                            aria-disabled={!selectedRule || !contestIsOpen || selectedRule.deactivated} tabIndex={!selectedRule || !contestIsOpen? -1:undefined}
                            className={`${!selectedRule || !contestIsOpen || selectedRule.deactivated? "pointer-events-none bg-slate-600" : ""} p-3 hover:scale-110 pixelated-font`}
                        ><EditIcon></EditIcon></Link> */}
          </div>

          <div>
            <Tab.Group>
              <Tab.List className="grid grid-cols-2 gap-2">
                <Tab
                  className={({ selected }) => {
                    return selected
                      ? "tab-navigation-item-selected"
                      : "tab-navigation-item";
                  }}
                >
                  <span className="text-xl pixelated-font">Leaderboard</span>
                </Tab>

                <Tab
                  className={({ selected }) => {
                    return selected
                      ? "tab-navigation-item-selected"
                      : "tab-navigation-item";
                  }}
                >
                  <span className="text-xl pixelated-font hover:underline">
                    Tapes
                  </span>
                </Tab>
              </Tab.List>

              <Tab.Panels className="mt-2 overflow-visible">
                <Tab.Panel className="">
                  <RuleLeaderboard
                    cartridge_id={cartridge.id}
                    rule={selectedRule?.id}
                  />
                </Tab.Panel>

                <Tab.Panel className="">
                  <CartridgeTapes
                    cartridgeId={cartridge.id}
                    ruleId={selectedRule?.id}
                  />
                </Tab.Panel>
              </Tab.Panels>
            </Tab.Group>
          </div>
        </div>

        <div className="w-full grid grid-cols-1">
          <div>
            <Tab.Group>
              <Tab.List className="grid grid-cols-1 place-content-center gap-2">
                {/* <Tab
                                    className={({selected}) => {return selected?"tab-navigation-item-selected":"tab-navigation-item"}}
                                    >
                                        <span className='text-xl pixelated-font'>Activity</span>
                                </Tab> */}

                <Tab
                  className={({ selected }) => {
                    return selected
                      ? "tab-navigation-item-selected h-[60px]"
                      : "tab-navigation-item";
                  }}
                >
                  <span className="text-xl pixelated-font">Contests</span>
                </Tab>
              </Tab.List>

              <Tab.Panels className="mt-2 overflow-auto custom-scrollbar">
                {/* <Tab.Panel className="">
                                    Show Activities
                                </Tab.Panel> */}

                <Tab.Panel className="">
                  <CartridgeContests
                    cartridgeId={cartridge.id}
                    cartridge={{ ...cartridge, user: creator || undefined }}
                  />
                </Tab.Panel>
              </Tab.Panels>
            </Tab.Group>
          </div>
        </div>
      </section>
    </main>
  );
}
