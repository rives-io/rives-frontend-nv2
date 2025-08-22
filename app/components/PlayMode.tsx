"use client";

import React, { Fragment, useEffect, useState } from "react";
import { RuleInfo } from "../backend-libs/core/ifaces";
import { ContestStatus, getContestStatus } from "../utils/common";
import Link from "next/link";
import { Dialog, Tab, Transition } from "@headlessui/react";
import { useRouter } from "next/navigation";
import { formatTime, timeToDateUTCString } from "../utils/util";
import { tapes } from "../backend-libs/core/lib";
import { envClient } from "../utils/clientEnv";
import { getUsersByAddress, User } from "../utils/privyApi";

function contestStatusMessage(contest: RuleInfo) {
  if (!(contest.start && contest.end)) return <></>;

  const currDate = new Date().getTime() / 1000;

  if (currDate > contest.end) {
    return (
      <span className="text-red-500">
        CLOSED: ended {formatTime(currDate - contest.end)} ago{" "}
      </span>
    );
  } else if (currDate < contest.start) {
    return (
      <span className="text-yellow-500">
        UPCOMING: starts in {formatTime(contest.start - currDate)} and lasts{" "}
        {formatTime(contest.end - contest.start)}
      </span>
    );
  } else {
    return (
      <span className="text-green-500">
        OPEN: ends in {formatTime(contest.end - currDate)}
      </span>
    );
  }
}

function PlayMode({ rulesInfo }: { rulesInfo: RuleInfo[] }) {
  const router = useRouter();
  const [selectedRule, setSelectedRule] = useState(rulesInfo[0]);
  const [modalOpen, setModalOpen] = useState(false);
  const [nTapes, setNTapes] = useState<Record<string, number>>();
  const [userMap, setUserMap] = useState<Record<string, User>>(); //= JSON.parse(await getUsersByAddress(Array.from(userAddresses)));

  useEffect(() => {
    const getRulesNTapes = async () => {
      const nTapesTmp: Record<string, number> = {};
      let rule: RuleInfo;
      for (let i = 0; i < rulesInfo.length; i++) {
        rule = rulesInfo[i];
        const tapeOut = await tapes(
          { rule_id: rule.id, page: 1, page_size: 0 },
          {
            cartesiNodeUrl: envClient.CARTESI_NODE_URL,
            decode: true,
            applicationAddress: envClient.DAPP_ADDR as `0x${string}`,
          },
        );
        if (tapeOut) nTapesTmp[rule.id.toLowerCase()] = tapeOut.total;
      }

      return nTapesTmp;
    };

    const getContestCreatorsUser = async () => {
      let rule: RuleInfo;
      const userAddresses: Set<string> = new Set();
      for (let i = 0; i < rulesInfo.length; i++) {
        rule = rulesInfo[i];
        userAddresses.add(rule.created_by);
      }

      return JSON.parse(await getUsersByAddress(Array.from(userAddresses)));
    };

    getRulesNTapes().then(setNTapes);
    getContestCreatorsUser().then(setUserMap);
  }, [rulesInfo]);

  function handle_play_click() {
    if (rulesInfo.length == 1) {
      router.push(`/play/${rulesInfo[0].id}`);
    } else {
      setModalOpen(true);
    }
  }

  if (!nTapes || !userMap) {
    return (
      <button disabled className={`bg-rives-purple p-3 flex justify-center`}>
        <div className="w-6 h-6 border-2 rounded-full border-current border-r-transparent animate-spin"></div>
      </button>
    );
  }

  return (
    <>
      {selectedRule ? (
        <Transition appear show={modalOpen} as={Fragment}>
          <Dialog
            as="div"
            className="relative z-10"
            onClose={() => setModalOpen(false)}
          >
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-black/25" />
            </Transition.Child>

            <div className="fixed inset-0 overflow-y-auto">
              <div className="flex min-h-full items-center justify-center p-4 text-center">
                <Transition.Child
                  as={Fragment}
                  enter="ease-out duration-300"
                  enterFrom="opacity-0 scale-95"
                  enterTo="opacity-100 scale-100"
                  leave="ease-in duration-200"
                  leaveFrom="opacity-100 scale-100"
                  leaveTo="opacity-0 scale-95"
                >
                  <Dialog.Panel className="w-[372px] md:w-[720px] md:h-[376px] transform bg-gray-500 p-4 shadow-xl transition-all flex flex-col items-center">
                    <Dialog.Title
                      as="h1"
                      className="text-2xl font-medium text-gray-900 pixelated-font"
                    >
                      Select a play mode
                    </Dialog.Title>
                    <span className="text-xs pixelated-font text-black mb-4">
                      ({selectedRule.name})
                    </span>

                    <Tab.Group>
                      <div className="w-full h-full flex flex-col md:grid md:grid-cols-4 gap-2">
                        <Tab.List className="flex gap-2 overflow-x-scroll w-72 md:w-auto md:flex-col md:h-[224px] md:overflow-y-scroll">
                          {rulesInfo.map((rule, _index) => {
                            const status = getContestStatus(rule);
                            const isContest = rule.start && rule.end;
                            const contestIsOpen =
                              !isContest ||
                              status == ContestStatus.IN_PROGRESS ||
                              status == ContestStatus.INVALID;

                            if (!contestIsOpen || selectedRule.deactivated)
                              return <></>;

                            return (
                              <Tab
                                key={rule.id}
                                onClick={() => setSelectedRule(rule)}
                                className={({ selected }) => {
                                  return selected
                                    ? "tab-navigation-item-selected h-24"
                                    : "tab-navigation-item h-24";
                                }}
                              >
                                <span className="text-sm md:text-xl text-center md:text-left pixelated-font line-clamp-2">
                                  {rule.name}
                                </span>
                              </Tab>
                            );
                          })}
                        </Tab.List>

                        <Tab.Panels className="col-span-3 bg-black text-white">
                          {rulesInfo.map((rule, _index) => {
                            const status = getContestStatus(rule);
                            const isContest = rule.start && rule.end;
                            const contestIsOpen =
                              !isContest ||
                              status == ContestStatus.IN_PROGRESS ||
                              status == ContestStatus.INVALID;

                            if (!contestIsOpen || selectedRule.deactivated)
                              return <></>;

                            const contestCreatorAddr =
                              rule.created_by.toLowerCase();
                            const formatedContestCreator = `${contestCreatorAddr.slice(0, 6)}...${contestCreatorAddr.substring(contestCreatorAddr.length - 4, contestCreatorAddr.length)}`;
                            const contestCreatorUser =
                              userMap[rule.created_by.toLowerCase()];

                            return (
                              <Tab.Panel
                                key={rule.id}
                                className="h-full flex flex-1 flex-col justify-between"
                              >
                                {rule.name.toLowerCase() == "default" ? (
                                  <span className="pixelated-font text-left p-2 h-[224px]">
                                    This is the standard play mode of the
                                    cartridge.
                                  </span>
                                ) : (
                                  <div className="flex flex-col p-2 text-left h-[224px] overflow-y-scroll">
                                    <div className="flex flex-col">
                                      <h1 className="pixelated-font text-lg">
                                        Overview
                                      </h1>

                                      <div className="grid grid-cols-2">
                                        {/* TODO: Get tapes */}
                                        <span className="text-gray-400">
                                          Submissions
                                        </span>
                                        <span>
                                          {nTapes
                                            ? nTapes[rule.id.toLowerCase()]
                                            : "-"}
                                        </span>

                                        {!isContest ? (
                                          <></>
                                        ) : (
                                          <>
                                            <span className="text-gray-400">
                                              Status
                                            </span>
                                            {contestStatusMessage(rule)}
                                          </>
                                        )}

                                        <span className="text-gray-400">
                                          Start
                                        </span>
                                        {rule.start
                                          ? timeToDateUTCString(rule.start)
                                          : "-"}

                                        <span className="text-gray-400">
                                          End
                                        </span>
                                        {rule.end
                                          ? timeToDateUTCString(rule.end)
                                          : "-"}

                                        <span className="text-gray-400">
                                          Contest Creator
                                        </span>
                                        {contestCreatorUser ? (
                                          <Link
                                            className="text-rives-purple hover:underline"
                                            title={rule.created_by}
                                            href={`/profile/${rule.created_by}`}
                                          >
                                            {contestCreatorUser.name}
                                          </Link>
                                        ) : (
                                          <Link
                                            className="text-rives-purple hover:underline"
                                            title={rule.created_by}
                                            href={`/profile/${rule.created_by}`}
                                          >
                                            {formatedContestCreator}
                                          </Link>
                                        )}

                                        {/* {
                                                                                            !contestHasPrizes?
                                                                                            <></>
                                                                                            :
                                                                                            <>
                                                                                                <span className="text-gray-400">Prizes</span>
                                                                                                <div className="flex flex-col">
                                                                                                {
                                                                                                    !contestDetails.prize?
                                                                                                    <></>
                                                                                                    :
                                                                                                    contestDetails.prize
                                                                                                }

                                                                                                <div className="flex gap-2">
                                                                                                    {
                                                                                                    contestDetails.achievements.map((achievement, index) => {
                                                                                                        return <Image
                                                                                                                title={achievement.name}
                                                                                                                key={`${achievement.slug}-${index}`}
                                                                                                                src={`data:image/png;base64,${achievement.image_data}`}
                                                                                                                width={48}
                                                                                                                height={48}
                                                                                                                alt=""
                                                                                                                />
                                                                                                    })
                                                                                                    }
                                                                                                </div>
                                                                                                </div>
                                                                                            </>
                                                                                        } */}
                                      </div>
                                    </div>

                                    <div className="flex flex-col">
                                      <h1 className="pixelated-font text-lg">
                                        Description
                                      </h1>
                                      <pre
                                        style={{
                                          whiteSpace: "pre-wrap",
                                          fontFamily: "Iosevka Web",
                                        }}
                                      >
                                        {rule.description}
                                      </pre>
                                    </div>
                                  </div>
                                )}

                                <div className="bg-gray-500 h-fit flex justify-center">
                                  <Link
                                    aria-disabled={
                                      !contestIsOpen || selectedRule.deactivated
                                    }
                                    tabIndex={
                                      !contestIsOpen || selectedRule.deactivated
                                        ? -1
                                        : undefined
                                    }
                                    href={`/play/${rule.id}`}
                                    className={`${!contestIsOpen || selectedRule.deactivated ? "pointer-events-none bg-slate-600" : "bg-rives-purple"} mt-2 p-3 hover:scale-110 pixelated-font`}
                                  >
                                    Select
                                  </Link>
                                </div>
                              </Tab.Panel>
                            );
                          })}
                        </Tab.Panels>
                      </div>
                    </Tab.Group>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </Dialog>
        </Transition>
      ) : (
        <></>
      )}
      <button
        onClick={handle_play_click}
        disabled={!selectedRule}
        className={`p-3 pixelated-font ${!selectedRule ? "pointer-events-none bg-slate-600" : "hover:scale-110 bg-rives-purple"}`}
      >
        Play
      </button>
    </>
  );
}

export default PlayMode;
