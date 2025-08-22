"use client";

import { useEffect, useState } from "react";
import { DecodedIndexerOutput } from "../backend-libs/cartesapp/lib";
import { getTapes } from "../utils/util";
import { VerifyPayload } from "../backend-libs/core/lib";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import TapeCard from "./TapeCard";
import Loading from "./Loading";
import { User } from "../utils/privyApi";

export default function UserTapes({
  address,
  twitterInfo,
}: {
  address: string;
  twitterInfo: User;
}) {
  const [tapesCreated, setTapesCreated] = useState<Array<Array<VerifyPayload>>>(
    [],
  );
  const [tapesCreatedPage, setTapesCreatedPage] = useState(0);

  const [tapesCreatedPageToLoad, setTapesCreatedPageToLoad] = useState(1);
  const [totalTapesCreatedPages, setTotalTapesCreatedPages] = useState(-1);

  const disablePrevTapesCreatedPage = tapesCreatedPage == 1;

  const [tapesCreatedLoading, setTapesCreatedLoading] = useState(true);

  const disableNextTapesCreatedPage =
    tapesCreatedPage == totalTapesCreatedPages;

  const TapesCreatedByProfile = async () => {
    if (tapesCreated[tapesCreatedPageToLoad - 1]) {
      setTapesCreatedPage(tapesCreatedPageToLoad);
      setTapesCreatedLoading(false);
      return;
    }

    setTapesCreatedLoading(true);

    const page_size = 6;

    const res: DecodedIndexerOutput = await getTapes({
      currentPage: tapesCreatedPageToLoad,
      pageSize: page_size,
      msg_sender: address,
      orderBy: "block_timestamp",
      orderDir: "desc",
    });

    const new_total_pages = Math.ceil(res.total / page_size);
    if (totalTapesCreatedPages != new_total_pages)
      setTotalTapesCreatedPages(new_total_pages);

    setTapesCreated([...tapesCreated, res.data]);
    setTapesCreatedPage(tapesCreatedPageToLoad);
    setTapesCreatedLoading(false);
  };

  const nextCreatedTapesPage = () => {
    setTapesCreatedPageToLoad(tapesCreatedPageToLoad + 1);
  };

  const prevCreatedTapesPage = () => {
    setTapesCreatedPageToLoad(tapesCreatedPageToLoad - 1);
  };

  useEffect(() => {
    TapesCreatedByProfile();
  }, [tapesCreatedPageToLoad]);

  return (
    <div>
      <div className="flex flex-col gap-4">
        <div className="w-full lg:w-[80%]">
          <h1 className={`text-2xl pixelated-font`}>Tapes Created</h1>
        </div>

        {tapesCreatedLoading ? (
          <Loading msg="Loading Created Tapes" />
        ) : (
          <>
            <div className="flex justify-center">
              <div className="flex flex-wrap justify-center md:grid md:grid-cols-3 gap-4">
                {tapesCreated[tapesCreatedPage - 1]?.map((tape, index) => {
                  return (
                    <TapeCard
                      key={`${tapesCreatedPage}-${index}`}
                      tapeInput={tape}
                      creator={twitterInfo ? twitterInfo : null}
                    />
                  );
                })}
              </div>
            </div>

            {tapesCreated.length == 0 || tapesCreated[0].length == 0 ? (
              totalTapesCreatedPages != -1 ? (
                <div className="text-center pixelated-font">
                  No Tapes Created
                </div>
              ) : (
                <></>
              )
            ) : (
              <div className="flex justify-center items-center space-x-1">
                <button
                  disabled={disablePrevTapesCreatedPage}
                  onClick={prevCreatedTapesPage}
                  className={`border border-transparent ${disablePrevTapesCreatedPage ? "" : "hover:border-black"}`}
                >
                  <NavigateBeforeIcon />
                </button>
                <span>
                  {tapesCreatedPage} of {totalTapesCreatedPages}
                </span>
                <button
                  disabled={disableNextTapesCreatedPage}
                  onClick={nextCreatedTapesPage}
                  className={`border border-transparent ${disableNextTapesCreatedPage ? "" : "hover:border-black"}`}
                >
                  <NavigateNextIcon />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
