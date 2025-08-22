"use client";

import Image from "next/image";
import { CartridgeInfo } from "../backend-libs/core/ifaces";
import rivesLogo from "@/public/logo_cutted.png";
import Link from "next/link";
import { User, getUsersByAddress } from "../utils/privyApi";
import { useEffect, useState } from "react";

export default function CartridgeCard({
  cartridge,
  small,
  creator,
  deactivateLink = false,
}: {
  cartridge: CartridgeInfo;
  small?: boolean;
  creator?: User | null;
  deactivateLink?: boolean;
}) {
  const cartridge_creator = cartridge.user_address;
  const formatedCreatorAddr = `${cartridge_creator.slice(0, 6)}...${cartridge_creator.substring(cartridge_creator.length - 4, cartridge_creator.length)}`;

  const cartridgeSize = small ? "w-[88px] h-[120px]" : "w-44 h-60";
  const cartridgeLogoSize = small ? "w-8 h-2" : "w-16 h-4";
  const cartridgeCoverSize = small ? "w-20 h-20" : "w-40 h-40";
  const cartridgeTextAreaSize = small ? "h-5" : "h-10";
  const cartridgeTitleSize = small ? "text-[7px]" : "text-sm";
  const cartridgeCreatorSize = small ? "text-[6px]" : "text-xs";
  const cartridgeMarginX = small ? "-mx-3" : "-mx-2";
  const cartridgeHeaderMargins = small ? "-mt-3 -ms-3" : "-mt-2 -ms-2";
  const cartridgeTextAreaMarginTop = small ? "-mt-1" : "";

  const [twitterInfo, setTwitterInfo] = useState<User | null>(null);

  useEffect(() => {
    if (creator) {
      setTwitterInfo(creator);
    } else if (typeof creator === "undefined") {
      getUsersByAddress([cartridge.user_address]).then((userMapString) => {
        const userMap: Record<string, User> = JSON.parse(userMapString);
        const user = userMap[cartridge.user_address.toLowerCase()];

        if (user) {
          setTwitterInfo(user);
        }
      });
    }
  }, [creator, cartridge]);

  function handleClick(e: React.MouseEvent<HTMLElement>) {
    e.preventDefault();
    window.open(`/profile/${cartridge.user_address}`, "_self");
  }

  return (
    <Link
      title={cartridge.name}
      href={`/cartridges/${cartridge.id}`}
      className={`cartridgeBorder rounded-full ${cartridgeSize} flex flex-col gap-1 ${deactivateLink ? "pointer-events-none" : "hover:scale-110"}`}
      aria-disabled={deactivateLink}
      tabIndex={deactivateLink ? -1 : undefined}
    >
      <div className={`flex items-stretch ${cartridgeHeaderMargins}`}>
        <div className="w-fit">
          <div className={`${cartridgeLogoSize} relative`}>
            <Image
              fill
              src={rivesLogo}
              quality={100}
              alt="rives logo"
              className=""
            />
          </div>
        </div>
      </div>

      <div className={`w-fit ${cartridgeMarginX} justify-center`}>
        <div
          className={`${cartridgeCoverSize} grid grid-cols-1 place-content-center bg-black relative`}
        >
          <Image
            fill
            style={{ objectFit: "cover" }}
            src={"data:image/png;base64," + cartridge.cover}
            alt={""}
          />
        </div>
      </div>

      <div
        className={`flex ${cartridgeTextAreaSize} w-fill ${cartridgeMarginX} ${cartridgeTextAreaMarginTop}`}
      >
        <div className="flex flex-col px-[2px] pb-[2px] h-full w-full">
          <span className={`pixelated-font ${cartridgeTitleSize} truncate`}>
            {cartridge.name}
          </span>
          <span className={`pixelated-font ${cartridgeCreatorSize} truncate`}>
            By{" "}
            <button
              onClick={handleClick}
              className="pixelated-font text-rives-purple hover:underline"
            >
              {!twitterInfo ? formatedCreatorAddr : twitterInfo.name}
            </button>
          </span>
        </div>
      </div>
    </Link>
  );
}
