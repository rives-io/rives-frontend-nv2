"use client";

import { useEffect, useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { envClient } from "../utils/clientEnv";
import { setUnlockCartridge } from "../backend-libs/core/lib";

import ErrorModal, { ERROR_FEEDBACK } from "./ErrorModal";
import {
  buildUrl,
  extractTxError,
  formatCartridgeIdToBytes,
  getWalletClient,
} from "../utils/util";
import {
  CartridgeInfo,
  SetUnlockedCartridgePayload,
} from "../backend-libs/core/ifaces";
import Link from "next/link";

function CartridgeUnlocker({ cartridge }: { cartridge: CartridgeInfo }) {
  // state
  const { user, ready, connectWallet } = usePrivy();
  const { wallets } = useWallets();

  const [signerAddress, setSignerAddress] = useState<string>();

  // modal state variables
  const [errorFeedback, setErrorFeedback] = useState<ERROR_FEEDBACK>();

  // use effects
  useEffect(() => {
    if (ready && !user) {
      setSignerAddress(undefined);
      return;
    }
    const wallet = wallets.find(
      (wallet) => wallet.address === user!.wallet!.address,
    );
    if (!wallet) {
      setSignerAddress(undefined);
      return;
    }
    setSignerAddress(user!.wallet!.address.toLowerCase());
  }, [ready, user, wallets]);

  async function unlockCartridge(unlock: boolean) {
    if (!signerAddress) {
      setErrorFeedback({
        message: "No wallet connected",
        severity: "warning",
        dismissible: true,
        dissmissFunction: () => setErrorFeedback(undefined),
      });
      return;
    }
    if (signerAddress?.toLowerCase() != envClient.OPERATOR_ADDR.toLowerCase()) {
      setErrorFeedback({
        message: "Only operator can perform this action operator",
        severity: "warning",
        dismissible: true,
        dissmissFunction: () => setErrorFeedback(undefined),
      });
      return;
    }
    const wallet = wallets.find(
      (wallet) => wallet.address === user!.wallet!.address,
    );
    if (!wallet) {
      setErrorFeedback({
        message: `Please connect your wallet ${user!.wallet!.address}`,
        severity: "warning",
        dismissible: true,
        dissmissFunction: () => {
          setErrorFeedback(undefined);
          connectWallet();
        },
      });

      return;
    }

    const inputData: SetUnlockedCartridgePayload = {
      unlocks: [unlock],
      ids: [formatCartridgeIdToBytes(cartridge.id)],
    };
    try {
      const walletClient = await getWalletClient(wallet);

      await setUnlockCartridge(inputData, {
        client: walletClient,
        applicationAddress: envClient.DAPP_ADDR as `0x${string}`,
      });
    } catch (error) {
      console.log(error);
      let errorMsg = (error as Error).message;
      if (errorMsg.toLowerCase().indexOf("user rejected") > -1)
        errorMsg = "User rejected tx";
      else errorMsg = extractTxError(errorMsg);
      // else if (errorMsg.toLowerCase().indexOf("d7b78412") > -1) errorMsg = "Slippage error";
      setErrorFeedback({
        message: errorMsg,
        severity: "error",
        dismissible: true,
        dissmissFunction: () => setErrorFeedback(undefined),
      });
    }
  }

  if (errorFeedback) {
    return <ErrorModal error={errorFeedback} />;
  }

  return (
    <>
      {cartridge.unlocked == undefined ? (
        <div className="justify-center md:justify-end flex-1 flex-wrap self-center text-black flex gap-2">
          <Link
            title={"Test"}
            className="bg-rives-purple assets-btn zoom-btn"
            href={`https://emulator.rives.io/#cartridge=${buildUrl(envClient.CARTRIDGES_URL, cartridge.id)}`}
          >
            Test on Emulator
          </Link>
          {signerAddress &&
          envClient.OPERATOR_ADDR?.toLowerCase() ==
            signerAddress?.toLowerCase() ? (
            <>
              <button
                title={"Reject"}
                className="bg-[#e04ec3] assets-btn zoom-btn"
                onClick={() => unlockCartridge(false)}
              >
                Reject
              </button>
              <button
                title={"Unlock"}
                className="bg-[#53fcd8] assets-btn zoom-btn"
                onClick={() => unlockCartridge(true)}
              >
                Unlock
              </button>
            </>
          ) : (
            <></>
          )}
        </div>
      ) : (
        <></>
      )}
    </>
  );
}

export default CartridgeUnlocker;
