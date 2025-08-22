"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect } from "react";
import rivesLogo from "@/public/logo.png";
import MenuIcon from "@mui/icons-material/Menu";
import { Menu } from "@headlessui/react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import Image from "next/image";
import { verifyChain } from "../utils/util";

function Navbar() {
  const pathname = usePathname();
  const { ready, authenticated, login, user } = usePrivy();
  const { wallets } = useWallets();
  // Disable login when Privy is not ready or the user is already authenticated
  const logged = ready && authenticated;
  const disableLogin = !ready || logged;
  const onMyProfile =
    logged &&
    pathname.startsWith("/profile") &&
    user?.wallet?.address.toLowerCase() ==
      pathname.split("/")[2]?.toLowerCase();

  useEffect(() => {
    if (!ready || !user || (ready && !wallets)) {
      return;
    }

    const currWallet = wallets.find(
      (wallet) => wallet.address === user!.wallet!.address,
    );
    if (!currWallet) return;

    verifyChain(currWallet).catch((error) => {
      console.log((error as Error).message);
    });
  }, [wallets]);

  return (
    <header className="header">
      <Link
        href={"/"}
        className={`min-w-24 grid grid-cols-1 items-center navbar-item ${pathname === "/" ? "md:link-active" : ""}`}
      >
        <div className="w-28 h-16">
          <Image src={rivesLogo} quality={100} alt="rives logo" />
        </div>
      </Link>

      <Link
        href={"/cartridges"}
        className={`hidden md:grid grid-cols-1 h-full items-center navbar-item ${pathname.startsWith("/cartridges") ? "md:link-active" : ""}`}
      >
        <span className={`text-xl pixelated-font`}>Cartridges</span>
      </Link>

      <Link
        href={"/contests"}
        className={`hidden md:grid grid-cols-1 h-full items-center navbar-item ${pathname.startsWith("/contests") ? "md:link-active" : ""}`}
      >
        <span className={`text-xl pixelated-font`}>Contests</span>
      </Link>

      <Link
        href={"/tapes"}
        className={`hidden md:grid grid-cols-1 h-full items-center navbar-item ${pathname.startsWith("/tapes") ? "md:link-active" : ""}`}
      >
        <span className={`text-xl pixelated-font`}>Tapes</span>
      </Link>

      <div className="hidden md:flex flex-1 justify-end h-full">
        {logged ? (
          <Link
            href={`/profile/${user?.wallet?.address}`}
            title={user?.wallet?.address}
            className={`grid grid-cols-1 h-full items-center place-content-center justify-items-center navbar-item
                        ${onMyProfile ? "md:link-active" : ""}`}
          >
            <span className="text-sm md:text-xl pixelated-font">Profile</span>
            <span className="text-xs pixelated-font">
              {user?.wallet?.address.substring(0, 6)}...
              {user?.wallet?.address.substring(user.wallet.address.length - 4)}
            </span>
          </Link>
        ) : (
          <button
            className={`navbar-item ${onMyProfile ? "md:link-active" : ""}`}
            disabled={!ready}
            onClick={!disableLogin ? login : undefined}
            title={user?.wallet?.address}
          >
            <div className="flex flex-col justify-center h-full">
              <span className={`text-sm md:text-xl pixelated-font`}>
                Connect
              </span>
            </div>
          </button>
        )}
      </div>

      <Menu as="div" className="md:hidden navbar-item ms-auto">
        <Menu.Button className="h-full flex flex-col justify-center">
          <MenuIcon className="text-5xl" />
        </Menu.Button>
        <Menu.Items className="absolute right-0 mt-2 w-full origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black/5 focus:outline-none">
          <div className="px-1 py-1 ">
            <Menu.Item>
              {({ active }) => (
                <Link
                  href={"/cartridges"}
                  className={`${
                    pathname === "/cartridges" || active
                      ? "bg-rives-purple text-white"
                      : "text-black"
                  } group flex w-full items-center rounded-md px-2 py-2 text-sm pixelated-font`}
                >
                  Cartridges
                </Link>
              )}
            </Menu.Item>
          </div>

          <div className="px-1 py-1 ">
            <Menu.Item>
              {({ active }) => (
                <Link
                  href={"/contests"}
                  className={`${
                    pathname === "/contests" || active
                      ? "bg-rives-purple text-white"
                      : "text-black"
                  } group flex w-full items-center rounded-md px-2 py-2 text-sm pixelated-font`}
                >
                  Contests
                </Link>
              )}
            </Menu.Item>
          </div>

          <div className="px-1 py-1">
            <Menu.Item>
              {({ active }) => (
                <Link
                  href={"/tapes"}
                  className={`${
                    pathname === "/tapes" || active
                      ? "bg-rives-purple text-white"
                      : "text-black"
                  } group flex w-full items-center rounded-md px-2 py-2 text-sm pixelated-font`}
                >
                  Tapes
                </Link>
              )}
            </Menu.Item>
          </div>

          <div className="px-1 py-1">
            <Menu.Item>
              {({ active }) =>
                logged ? (
                  <Link
                    href={`/profile/${user?.wallet?.address}`}
                    className={`${
                      onMyProfile || active
                        ? "bg-rives-purple text-white"
                        : "text-black"
                    } group flex w-full items-center rounded-md px-2 py-2 text-sm pixelated-font`}
                  >
                    Profile
                  </Link>
                ) : (
                  <button
                    className={`${
                      onMyProfile || active
                        ? "bg-rives-purple text-white"
                        : "text-black"
                    } group flex w-full items-center rounded-md px-2 py-2 text-sm pixelated-font`}
                    disabled={!ready}
                    onClick={!disableLogin ? login : undefined}
                    title={user?.wallet?.address}
                  >
                    <div className="flex flex-col justify-center h-full">
                      <span className={`text-sm pixelated-font`}>Connect</span>
                    </div>
                  </button>
                )
              }
            </Menu.Item>
          </div>
        </Menu.Items>
      </Menu>
    </header>
  );
}

export default Navbar;
