"use client";

import Image from "next/image";
import rivesCheck from "@/public/default_profile.png";
import { usePrivy } from "@privy-io/react-auth";
import XIcon from "@mui/icons-material/X";
import { User } from "../utils/privyApi";
import Link from "next/link";

export default function ProfileOptions({
  address,
  twitterInfo,
}: {
  address: string;
  twitterInfo: User;
}) {
  const { ready, authenticated, logout, user, linkTwitter } = usePrivy();
  const formated_addr =
    address.substring(0, 6) +
    "..." +
    address.substring(address.length - 4, address.length);

  return (
    <div id="profile_pic" className="flex flex-col gap-4">
      {!twitterInfo ? (
        <div className="flex items-center gap-4">
          <Image
            width={72}
            height={72}
            src={rivesCheck}
            className="rounded-full pixelated-img"
            alt=""
          />
          <div className="flex flex-col gap-2">
            <div title={address} className="flex flex-col">
              {formated_addr}

              {ready ? (
                authenticated &&
                user?.wallet?.address == address &&
                !user.twitter ? (
                  <button onClick={linkTwitter}>
                    <XIcon />{" "}
                    <span className="hover:underline text-xs">
                      link twitter account
                    </span>
                  </button>
                ) : (
                  <></>
                )
              ) : (
                <></>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <Image
            width={72}
            height={72}
            src={twitterInfo.picture_url.replace("_normal", "_bigger")}
            className="rounded-full"
            alt=""
          />
          <div className="flex flex-col gap-2">
            <div className="flex flex-col">
              <span>{twitterInfo.name}</span>
              <span title={address} className="text-xs">
                {formated_addr}
              </span>
            </div>
            <Link
              href={`https://twitter.com/${twitterInfo.username}`}
              rel="noopener noreferrer"
              target="_blank"
              className="flex items-center space-x-2"
            >
              <XIcon />{" "}
              <span className="hover:underline">{twitterInfo.username}</span>
            </Link>
          </div>
        </div>
      )}

      {ready &&
      authenticated &&
      user?.wallet?.address.toLowerCase() == address.toLowerCase() ? (
        <button
          disabled={!ready}
          className="bg-black p-2 hover:text-black hover:bg-rives-gray"
          onClick={logout}
        >
          Disconnect
        </button>
      ) : (
        <></>
      )}
    </div>
  );
}
