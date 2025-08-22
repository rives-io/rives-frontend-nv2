"use client";

import { useEffect, useState } from "react";
import { getCartridges } from "../utils/util";
import { CartridgeInfo } from "../backend-libs/core/ifaces";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import CartridgeCard from "./CartridgeCard";
import Loading from "./Loading";
import { CartridgesOutput } from "../backend-libs/core/ifaces";
import { User } from "../utils/privyApi";

export default function UserCartridges({
  address,
  twitterInfo,
}: {
  address: string;
  twitterInfo: User;
}) {
  const [cartridgesCreated, setCartridgesCreated] = useState<
    Array<Array<CartridgeInfo>>
  >([]);
  const [cartridgesCreatedPage, setCartridgesCreatedPage] = useState(0);

  const [cartridgesCreatedPageToLoad, setCartridgesCreatedPageToLoad] =
    useState(1);
  const [totalCartridgesCreatedPages, setTotalCartridgesCreatedPages] =
    useState(-1);

  const [cartridgesCreatedLoading, setCartridgesCreatedLoading] =
    useState(true);

  const disablePrevCartridgesCreatedPage = cartridgesCreatedPage == 1;

  const disableNextCartridgesCreatedPage =
    cartridgesCreatedPage == totalCartridgesCreatedPages;

  const CartridgesCreatedByProfile = async () => {
    if (cartridgesCreated[cartridgesCreatedPageToLoad - 1]) {
      setCartridgesCreatedPage(cartridgesCreatedPageToLoad);
      setCartridgesCreatedLoading(false);
      return;
    }

    setCartridgesCreatedLoading(true);

    const page_size = 6;

    const res: CartridgesOutput = await getCartridges({
      currentPage: cartridgesCreatedPageToLoad,
      pageSize: page_size,
      user_address: address,
      orderBy: "block_timestamp",
      orderDir: "desc",
      getCover: true,
    });

    const new_total_pages = Math.ceil(res.total / page_size);
    if (totalCartridgesCreatedPages != new_total_pages)
      setTotalCartridgesCreatedPages(new_total_pages);

    setCartridgesCreated([...cartridgesCreated, res.data]);
    setCartridgesCreatedPage(cartridgesCreatedPageToLoad);
    setCartridgesCreatedLoading(false);
  };

  const nextCreatedCartridgesPage = () => {
    setCartridgesCreatedPageToLoad(cartridgesCreatedPageToLoad + 1);
  };

  const prevCreatedCartridgesPage = () => {
    setCartridgesCreatedPageToLoad(cartridgesCreatedPageToLoad - 1);
  };

  useEffect(() => {
    CartridgesCreatedByProfile();
  }, []);

  useEffect(() => {
    CartridgesCreatedByProfile();
  }, [cartridgesCreatedPageToLoad]);

  return (
    <div>
      <div className="flex flex-col gap-4">
        <div className="w-full lg:w-[80%]">
          <h1 className={`text-2xl pixelated-font`}>Cartridges Created</h1>
        </div>

        {cartridgesCreatedLoading ? (
          <Loading msg="Loading Created Cartridges" />
        ) : (
          <>
            <div className="flex justify-center">
              <div className="flex flex-wrap justify-center md:grid md:grid-cols-3 gap-4">
                {cartridgesCreated[cartridgesCreatedPage - 1]?.map(
                  (cartridge, index) => {
                    return (
                      <CartridgeCard
                        key={`${cartridgesCreatedPage}-${index}`}
                        cartridge={cartridge}
                        creator={twitterInfo ? twitterInfo : null}
                      />
                    );
                  },
                )}
              </div>
            </div>

            {cartridgesCreated.length == 0 ||
            cartridgesCreated[0].length == 0 ? (
              totalCartridgesCreatedPages != -1 ? (
                <div className="text-center pixelated-font">
                  No Cartridges Created
                </div>
              ) : (
                <></>
              )
            ) : (
              <div className="flex justify-center items-center space-x-1">
                <button
                  disabled={disablePrevCartridgesCreatedPage}
                  onClick={prevCreatedCartridgesPage}
                  className={`border border-transparent ${disablePrevCartridgesCreatedPage ? "" : "hover:border-black"}`}
                >
                  <NavigateBeforeIcon />
                </button>
                <span>
                  {cartridgesCreatedPage} of {totalCartridgesCreatedPages}
                </span>
                <button
                  disabled={disableNextCartridgesCreatedPage}
                  onClick={nextCreatedCartridgesPage}
                  className={`border border-transparent ${disableNextCartridgesCreatedPage ? "" : "hover:border-black"}`}
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
