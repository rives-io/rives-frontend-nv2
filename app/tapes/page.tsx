"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { VerifyPayload } from "../backend-libs/core/lib";
import { TapesRequest, getTapes, getUsersFromTapes } from "../utils/util";
import { DecodedIndexerOutput } from "../backend-libs/cartesapp/lib";
import TapeCard from "../components/TapeCard";
import Loading from "../components/Loading";
import { User } from "../utils/privyApi";

const DEFAULT_PAGE_SIZE = 12;

interface TapesPagination extends TapesRequest {
  atEnd: boolean;
  fetching: boolean;
}

export default function Tapes() {
  const [verificationInputs, setVerificationInputs] =
    useState<Array<VerifyPayload> | null>(null);
  const [tapesRequestOptions, setTapesRequestOptions] =
    useState<TapesPagination>({
      currentPage: 1,
      pageSize: DEFAULT_PAGE_SIZE,
      atEnd: false,
      fetching: false,
      orderBy: "block_timestamp",
      orderDir: "desc",
    });
  const [userMap, setUserMap] = useState<Record<string, User>>({});

  // const nexPageCallback = useCallback(
  //   async (tapesRequestOptions, userMap, verificationInputs) => {
  //     nextPage();
  //   },
  //   [],
  // );

  useEffect(() => {
    const getFirstPage = async () => {
      await nextPage();
    };

    getFirstPage();
  }, []);

  async function nextPage() {
    if (tapesRequestOptions.fetching || tapesRequestOptions.atEnd) return;

    const newRequestOptions = { ...tapesRequestOptions, fetching: true };
    setTapesRequestOptions(newRequestOptions);
    let res: DecodedIndexerOutput;
    try {
      res = await getTapes(tapesRequestOptions);
    } catch (error) {
      console.log(`Failed to fetch tapes!\n${(error as Error).message}`);
      setTapesRequestOptions({
        ...tapesRequestOptions,
        fetching: false,
        atEnd: true,
      });
      return;
    }
    const tapesInputs: Array<VerifyPayload> = res.data;

    const newUserMap: Record<string, User> = await getUsersFromTapes(
      tapesInputs,
      userMap,
    );
    if (Object.keys(newUserMap).length > 0)
      setUserMap({ ...userMap, ...newUserMap });

    if (!verificationInputs) {
      setVerificationInputs(tapesInputs);
    } else {
      setVerificationInputs([...verificationInputs, ...tapesInputs]);
    }

    setTapesRequestOptions({
      ...newRequestOptions,
      currentPage: newRequestOptions.currentPage + 1,
      fetching: false,
      atEnd:
        res.total <= newRequestOptions.currentPage * newRequestOptions.pageSize,
    });
  }

  if (verificationInputs?.length == 0) {
    return (
      <main className="flex items-center justify-center h-lvh text-white">
        No Tapes Found
      </main>
    );
  }

  return (
    <main>
      <section className="flex justify-center">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {verificationInputs?.map((verificationInput, index) => {
            const user = verificationInput._msgSender.toLowerCase();
            // const player = `${user.slice(0, 6)}...${user.substring(user.length - 4, user.length)}`;
            // const timestamp = timeToDateUTCString(
            //   Number(verificationInput._blockTimestamp),
            // );
            // const tapeId = calculateTapeId(
            //   verificationInput.rule_id,
            //   verificationInput.tape,
            // );
            // const size = formatBytes((verificationInput.tape.length - 2) / 2);

            return (
              <TapeCard
                key={index}
                tapeInput={verificationInput}
                creator={userMap[user] || null}
              />
            );
          })}
          {tapesRequestOptions.fetching ? (
            <div className="col-span-full">
              <Loading msg={"Loading Tapes"} />
            </div>
          ) : (
            <></>
          )}

          {!verificationInputs ||
          tapesRequestOptions.atEnd ||
          tapesRequestOptions.fetching ? (
            <></>
          ) : (
            <div className="col-span-full flex justify-center">
              <button
                className="bg-rives-purple p-3 text-center md:w-1/2 hover:scale-110"
                onClick={nextPage}
                disabled={tapesRequestOptions.fetching}
              >
                {tapesRequestOptions.fetching ? (
                  <div className="flex justify-center">
                    <div className="w-8 h-8 border-2 rounded-full border-current border-r-transparent animate-spin"></div>
                  </div>
                ) : (
                  <span className="pixelated-font">Show More</span>
                )}
              </button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
