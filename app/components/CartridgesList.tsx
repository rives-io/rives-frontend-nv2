"use client";

import { cache, useEffect, useState } from "react";
import { cartridges as cartridgerequest } from "../backend-libs/core/lib";
import { envClient } from "../utils/clientEnv";
import CartridgeCard from "./CartridgeCard";
import { CartridgeInfo } from "../backend-libs/core/ifaces";
import Loading from "./Loading";
import { User } from "../utils/privyApi";
import { getUsersFromCartridges } from "../utils/util";

interface CartridgesRequest {
  currentPage: number;
  pageSize: number;
  atEnd: boolean;
  fetching: boolean;
  tags?: string[]; // can be used to filter by cartridge tags
  authors?: string[]; // can be used to filter by cartridge authors
}

const getCartridges = cache(
  async (cartridgesRequestOptions: CartridgesRequest) => {
    return (
      await cartridgerequest(
        { ...cartridgesRequestOptions, get_cover: true },
        {
          decode: true,
          cartesiNodeUrl: envClient.CARTESI_NODE_URL,
          applicationAddress: envClient.DAPP_ADDR as `0x${string}`,
        },
      )
    ).data;
  },
);

function CartridgesList() {
  const [cartridges, setCartridges] = useState<Array<CartridgeInfo> | null>(
    null,
  );
  const [cartridgesRequestOptions, setCartridgesRequestOptions] =
    useState<CartridgesRequest>({
      currentPage: 1,
      pageSize: 12,
      atEnd: false,
      fetching: false,
    });
  const [userMap, setUserMap] = useState<Record<string, User>>({});

  useEffect(() => {
    const getFirstPage = async () => {
      await nextPage();
    };

    getFirstPage();
  }, []);

  async function nextPage() {
    if (cartridgesRequestOptions.fetching || cartridgesRequestOptions.atEnd)
      return;

    setCartridgesRequestOptions({
      ...cartridgesRequestOptions,
      fetching: true,
    });
    const newCartridges: Array<CartridgeInfo> = await getCartridges(
      cartridgesRequestOptions,
    );

    // no more cartridges to get
    if (newCartridges.length == 0) {
      setCartridgesRequestOptions({
        ...cartridgesRequestOptions,
        atEnd: true,
        fetching: false,
      });
      return;
    }

    const newUserMap: Record<string, User> = await getUsersFromCartridges(
      newCartridges,
      userMap,
    );
    if (Object.keys(newUserMap).length > 0)
      setUserMap({ ...userMap, ...newUserMap });

    if (cartridges) setCartridges([...cartridges, ...newCartridges]);
    else setCartridges(newCartridges);

    setCartridgesRequestOptions({
      ...cartridgesRequestOptions,
      currentPage: cartridgesRequestOptions.currentPage + 1,
      fetching: false,
      atEnd: newCartridges.length < cartridgesRequestOptions.pageSize,
    });
  }

  if (cartridgesRequestOptions.fetching || !cartridges) {
    return (
      <div className="col-span-full flex justify-center">
        <Loading msg="Loading Cartridges" />
      </div>
    );
  }

  if (cartridges.length == 0) {
    return "No cartridges Found!";
  }

  return (
    <>
      {cartridges?.map((cartridge: CartridgeInfo, index: number) => {
        return (
          <div key={index}>
            <CartridgeCard
              cartridge={cartridge}
              creator={userMap[cartridge.user_address.toLowerCase()] || null}
            />
          </div>
        );
      })}
    </>
  );
}

export default CartridgesList;
