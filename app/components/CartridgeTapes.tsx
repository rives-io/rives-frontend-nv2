"use client";

import { useEffect, useState } from "react";
import { DecodedIndexerOutput } from "../backend-libs/cartesapp/lib";
import { getTapes, getUsersFromTapes } from "../utils/util";
import { VerifyPayload } from "../backend-libs/core/lib";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import TapeCard from "./TapeCard";
import Loading from "./Loading";
import { User } from "../utils/privyApi";

export default function CartridgeTapes({
  cartridgeId,
  ruleId,
}: {
  cartridgeId: string;
  ruleId?: string;
}) {
  const [tapes, setTapes] = useState<Array<Array<VerifyPayload>>>([]);
  const [tapesPage, setTapesPage] = useState(0);

  const [tapesPageToLoad, setTapesPageToLoad] = useState(1);
  const [totalTapesPages, setTotalTapesPages] = useState(-1);

  const [loading, setLoading] = useState(false);

  const [reload, setReload] = useState(0);

  const disablePrevPage = tapesPage == 1;
  const disableNextPage = tapesPage == totalTapesPages;

  const [userMap, setUserMap] = useState<Record<string, User>>({});

  const tapesByCartridge = async () => {
    if (tapes[tapesPageToLoad - 1]) {
      setTapesPage(tapesPageToLoad);
      return;
    }

    setLoading(true);

    const page_size = 6;
    const res: DecodedIndexerOutput = await getTapes({
      currentPage: tapesPageToLoad,
      pageSize: page_size,
      orderBy: "block_timestamp",
      orderDir: "desc",
      cartridgeId: cartridgeId,
      ruleId: ruleId,
    });

    const new_total_pages = Math.ceil(res.total / page_size);
    if (totalTapesPages != new_total_pages) setTotalTapesPages(new_total_pages);

    const newTapes: Array<VerifyPayload> = res.data;
    const newUserMap: Record<string, User> = await getUsersFromTapes(
      newTapes,
      userMap,
    );
    if (Object.keys(newUserMap).length > 0)
      setUserMap({ ...userMap, ...newUserMap });

    setTapes([...tapes, newTapes]);
    setTapesPage(tapesPageToLoad);
    setLoading(false);
  };

  const nextTapesPage = () => {
    setTapesPageToLoad(tapesPageToLoad + 1);
  };

  const prevTapesPage = () => {
    setTapesPageToLoad(tapesPageToLoad - 1);
  };

  useEffect(() => {
    tapesByCartridge();
  }, []);

  useEffect(() => {
    setTapes([]);
    setTapesPage(0);
    setTotalTapesPages(-1);

    if (tapesPageToLoad == 1) setReload(reload + 1);
    else setTapesPageToLoad(1);
  }, [ruleId]);

  useEffect(() => {
    tapesByCartridge();
  }, [tapesPageToLoad, reload]);

  if (!ruleId) {
    return <></>;
  }

  return (
    <div className="flex flex-col gap-4">
      {loading ? (
        <div className="h-56">
          <Loading msg="Loading Tapes" />
        </div>
      ) : (
        <>
          <div className="flex justify-center">
            <div className="flex flex-wrap justify-center md:grid md:grid-cols-3 gap-4">
              {tapes[tapesPage - 1]?.map((tape, index) => {
                return (
                  <TapeCard
                    key={`${tapesPage}-${index}`}
                    tapeInput={tape}
                    creator={userMap[tape._msgSender.toLowerCase()] || null}
                  />
                );
              })}
            </div>
          </div>

          {tapes.length == 0 || tapes[0].length == 0 ? (
            <></>
          ) : (
            <div className="flex justify-center items-center space-x-1">
              <button
                disabled={disablePrevPage}
                onClick={prevTapesPage}
                className={`border border-transparent ${disablePrevPage ? "" : "hover:border-black"}`}
              >
                <NavigateBeforeIcon />
              </button>
              <span>
                {tapesPage} of {totalTapesPages}
              </span>
              <button
                disabled={disableNextPage}
                onClick={nextTapesPage}
                className={`border border-transparent ${disableNextPage ? "" : "hover:border-black"}`}
              >
                <NavigateNextIcon />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
