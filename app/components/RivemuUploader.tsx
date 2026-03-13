"use client";

import React from "react";
import { useState, useEffect, useRef } from "react";
import { ConnectedWallet, usePrivy, useWallets } from "@privy-io/react-auth";
import { isHex, toHex, toBytes } from "viem";

import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import WarningIcon from "@mui/icons-material/Warning";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import TextField from "@mui/material/TextField";
import FormControl from "@mui/material/FormControl";
import Input from "@mui/material/Input";
import InputLabel from "@mui/material/InputLabel";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import StopIcon from "@mui/icons-material/Stop";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import PauseIcon from "@mui/icons-material/Pause";
import ReplayIcon from "@mui/icons-material/Replay";
import UploadIcon from "@mui/icons-material/Upload";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import { sha256 } from "js-sha256";
import { envClient } from "../utils/clientEnv";
import { cartridgeInfo, insertCartridge } from "../backend-libs/core/lib";
import Rivemu, { RivemuRef } from "./Rivemu";
import {
  CartridgeInfo,
  InfoCartridge,
  InsertCartridgePayload,
} from "../backend-libs/core/ifaces";

import ErrorModal, { ERROR_FEEDBACK } from "./ErrorModal";
import Link from "next/link";
import { getWalletClient } from "../utils/util";

let canvasPlaying = false;

const darkTheme = createTheme({
  palette: {
    mode: "dark",
  },
});

const testRivlog: Uint8Array = new Uint8Array([
  1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 15, 0, 0, 0,
]);

function generateEntropy(userAddress?: string, ruleId?: string): string {
  const hexRuleId = `0x${ruleId}`;
  if (
    !userAddress ||
    userAddress.length != 42 ||
    !isHex(userAddress) ||
    !isHex(hexRuleId)
  ) {
    return "";
  }

  const userBytes = toBytes(`${userAddress}`);
  const ruleIdBytes = toBytes(hexRuleId);

  const fullEntropyBytes = new Uint8Array(
    userBytes.length + ruleIdBytes.length,
  );
  fullEntropyBytes.set(userBytes);
  fullEntropyBytes.set(ruleIdBytes, userBytes.length);
  return sha256(fullEntropyBytes);
}

function RivemuUploader() {
  // rivemu state
  const [cartridgeData, setCartridgeData] = useState<Uint8Array>();
  const [tape, setTape] = useState<Uint8Array>();

  // Control
  const [entropy, setEntropy] = useState<string>("entropy");
  const [currScore, setCurrScore] = useState<number>();
  const [playing, setPlaying] = useState({
    isPlaying: false,
    isReplay: false,
    playCounter: 0,
  });
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(1.0);
  const [outcard, setOutcard] = useState<string>();

  const cartridgeFileRef = useRef<HTMLInputElement | null>(null);

  const [infoCartridge, setInfoCartridge] = useState<InfoCartridge>();
  const [authorsHaveLinks, setAuthorsHaveLinks] = useState<boolean>(false);
  const [hasScore, setHasScore] = useState<boolean>();
  const [testing, setTesting] = useState<boolean>(false);

  const [hideCartridgeParams, setHideCartridgeParams] = useState(true);
  const [inCardHash, setIncardHash] = useState<string>();
  const [incard, setIncard] = useState<Uint8Array>();
  const [args, setArgs] = useState<string>();
  const incardFileRef = useRef<HTMLInputElement | null>(null);

  const [restarting, setRestarting] = useState(false);
  const [wallet, setWallet] = useState<ConnectedWallet>();

  const [errorFeedback, setErrorFeedback] = useState<ERROR_FEEDBACK>();

  const [cartridgeInserted, setCartridgeInserted] = useState<boolean>();
  const [submittingTx, setSubmittingTx] = useState<boolean>();

  // signer
  const { user, ready, connectWallet } = usePrivy();
  const { wallets } = useWallets();

  const rivemuRef = useRef<RivemuRef>(null);

  useEffect(() => {
    document.addEventListener("visibilitychange", (_event) => {
      if (document.visibilityState == "hidden") {
        if (canvasPlaying) {
          rivemuRef.current?.setSpeed(0);
          setPaused(true);
        }
      }
    });
  }, []);

  useEffect(() => {
    if (!ready) {
      setWallet(undefined);
      return;
    }

    if (!user) {
      setEntropy("entropy");
    } else {
      setEntropy(generateEntropy(user.wallet!.address.toLowerCase(), ""));
      setWallet(
        wallets.find((wallet) => wallet.address === user!.wallet!.address),
      );
    }
  }, [user, ready, wallets]);

  useEffect(() => {
    if (playing.isPlaying && !playing.isReplay && tape && tape.length == 0) {
      rivemuRef.current?.start();
    }
  }, [playing.isPlaying, playing.isReplay, tape]);

  useEffect(() => {
    if (testing) {
      replay();
    }
  }, [testing]);

  async function uploadCartridge() {
    // replay({car});
    cartridgeFileRef.current?.click();
  }

  const getTitleMessage = function () {
    // !cartridgeData || !infoCartridge?.name || !ready || !user
    if (!cartridgeData) return "Please, upload Cartridge first";
    if (!infoCartridge?.name)
      return "No cartridge info (you should add a info.json to the cartridge)";
    if (!authorsHaveLinks) return "All authors in info.json should have link";
    if (!wallet) return "Please, connect your wallet";
    return "Send Cartridge to RIVES";
  };

  function clean() {
    setTape(new Uint8Array([]));
    setOutcard(undefined);
    setCartridgeData(undefined);
    setInfoCartridge(undefined);
    setAuthorsHaveLinks(false);
    setHasScore(undefined);
    setCartridgeInserted(false);
    setSubmittingTx(false);
  }

  function handleOnChangeCartridgeUpload(
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    if (e?.target?.files) {
      changeCartridgeUpload(e.target.files[0]);
    }
  }
  function changeCartridgeUpload(f: Blob) {
    const reader = new FileReader();
    reader.onload = async (readerEvent) => {
      rivemuRef.current?.stop();
      clean();
      const data = readerEvent.target?.result;
      if (data) {
        setCartridgeData(new Uint8Array(data as ArrayBuffer));
        setTape(testRivlog);
        setHasScore(undefined);
        setTesting(true);
      }
    };
    reader.readAsArrayBuffer(f);
  }

  const handleCartridgeDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    changeCartridgeUpload(e.dataTransfer.files[0]);
  };

  async function uploadIncard() {
    // replay({car});
    incardFileRef.current?.click();
  }

  function handleOnChangeIncardUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (e?.target?.files) {
      const reader = new FileReader();
      reader.onload = async (readerEvent) => {
        if (playing.isPlaying) rivemuRef.current?.stop();
        const data = readerEvent.target?.result as ArrayBuffer;
        if (data) {
          const incard = new Uint8Array(data);
          setIncard(incard);
          setIncardHash(sha256(incard));
          setTape(new Uint8Array([]));
        }
      };
      reader.readAsArrayBuffer(e.target.files[0]);
    }
  }

  const decoder = new TextDecoder("utf-8");

  const rivemuOnFrame = function (
    outcard: ArrayBuffer,
    _frame: number,
    _cycles: number,
    _fps: number,
    _cpu_cost: number,
    _cpu_speed: number,
    _cpu_usage: number,
    _cpu_quota: number,
  ) {
    if (
      decoder.decode(outcard.slice(0, 4)) == "JSON" ||
      decoder.decode(outcard.slice(0, 4)) == "TEXT"
    ) {
      const outcard_str = decoder.decode(outcard);
      setOutcard(outcard_str.substring(4));
    }
    if (decoder.decode(outcard.slice(0, 4)) == "JSON") {
      const outcard_str = decoder.decode(outcard);
      const outcard_json = JSON.parse(outcard_str.substring(4));
      setCurrScore(outcard_json.score);
      if (testing) {
        if (outcard_json.score != undefined) {
          setHasScore(true);
        }
      }
    }
  };

  const rivemuOnBegin = function (
    _width: number,
    _height: number,
    _target_fps: number,
    _total_frames: number,
    info_data: Uint8Array,
  ) {
    console.log("rivemu_on_begin");
    canvasPlaying = true;

    let info: InfoCartridge | undefined;
    if (info_data.length > 0) {
      try {
        const textDecoder = new TextDecoder();
        info = JSON.parse(textDecoder.decode(info_data));
      } catch (e) {
        console.warn("Failed to parse cartridge info.json:", e);
      }
    }
    if (testing) {
      setInfoCartridge(info);
      if (info?.authors?.length) {
        let authorsWithLinks = 0;
        for (const author of info.authors) {
          if (author.name && author.link) authorsWithLinks++;
        }
        setAuthorsHaveLinks(info.authors.length == authorsWithLinks);
      }
    }

    setCurrScore(undefined);
    setOutcard(undefined);
    setCurrScore(undefined);
    setRestarting(false);
  };

  const rivemuOnFinish = function (
    rivlog: ArrayBuffer,
    _outcard: ArrayBuffer,
    _outhash: string,
  ) {
    rivemuRef.current?.stop();
    console.log("rivemu_on_finish");
    canvasPlaying = false;
    // if (document.fullscreenElement) document.exitFullscreen();
    if (restarting)
      setPlaying({ ...playing, playCounter: playing.playCounter + 1 });
    else
      setPlaying({
        isPlaying: false,
        isReplay: false,
        playCounter: playing.playCounter + 1,
      });
    if (testing) {
      setTesting(false);
      if (hasScore == undefined) setHasScore(false);
    }
    setTape(new Uint8Array(rivlog));
  };

  async function record() {
    setTape(new Uint8Array([]));
    setSpeed(1.0);
    setPaused(false);
    setRestarting(true);
    setPlaying({ ...playing, isPlaying: true, isReplay: false });
  }

  async function replay() {
    setSpeed(1.0);
    setPaused(false);
    setRestarting(true);
    setPlaying({ ...playing, isPlaying: true, isReplay: true });
    rivemuRef.current?.start();
  }

  async function pause() {
    if (paused) {
      rivemuRef.current?.setSpeed(speed);
    } else {
      rivemuRef.current?.setSpeed(0);
    }
    setPaused(!paused);
  }

  async function rivemuChangeSpeed() {
    let newSpeed = 1.0;
    if (speed >= 4.0) {
      newSpeed = 0.5;
    } else if (speed >= 2.0) {
      newSpeed = 4.0;
    } else if (speed >= 1.5) {
      newSpeed = 2.0;
    } else if (speed >= 1) {
      newSpeed = 1.5;
    } else if (speed >= 0.5) {
      newSpeed = 1.0;
    }
    setSpeed(newSpeed);
    if (!paused) {
      await rivemuRef.current?.setSpeed(newSpeed);
    }
  }

  async function stop() {
    rivemuRef.current?.stop();
    setPlaying({ ...playing, isPlaying: false });
  }

  async function sendCartridge() {
    if (!cartridgeData) {
      setErrorFeedback({
        message: "No cartridge data",
        severity: "warning",
        dismissible: true,
        dissmissFunction: () => setErrorFeedback(undefined),
      });
      return;
    }

    const out: CartridgeInfo = await cartridgeInfo(
      { id: sha256(cartridgeData) }, // TODO: Fix name here
      {
        decode: true,
        cartesiNodeUrl: envClient.CARTESI_NODE_URL,
        applicationAddress: envClient.DAPP_ADDR as `0x${string}`,
      },
    );

    if (out) {
      setErrorFeedback({
        message: "Cartridge already inserted",
        severity: "warning",
        dismissible: true,
        dissmissFunction: () => setErrorFeedback(undefined),
      });
      return;
    }

    if (!wallet) {
      setErrorFeedback({
        message: `Please connect your wallet ${user!.wallet!.address}`,
        severity: "warning",
        dismissible: true,
        dissmissFunction: () => {
          connectWallet();
          setErrorFeedback(undefined);
        },
      });
      return;
    }
    if (playing.isPlaying) stop();

    const inputData: InsertCartridgePayload = {
      data: toHex(cartridgeData),
    };
    try {
      setSubmittingTx(true);
      const walletClient = await getWalletClient(wallet);

      await insertCartridge(inputData, {
        client: walletClient,
        applicationAddress: envClient.DAPP_ADDR as `0x${string}`,
      });
      setSubmittingTx(false);
      setCartridgeInserted(true);
    } catch (error) {
      console.log(error);
      let errorMsg = (error as Error).message;
      if (errorMsg.toLowerCase().indexOf("user rejected") > -1)
        errorMsg = "User rejected tx";
      setErrorFeedback({
        message: errorMsg,
        severity: "error",
        dismissible: true,
        dissmissFunction: () => setErrorFeedback(undefined),
      });
      setCartridgeInserted(undefined);
    }
    setSubmittingTx(false);
  }

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <div className="flex items-center flex-wrap justify-center h-[calc(100vh-13rem)] gap-2 overflow-auto absolute top-16 w-full">
        <div className="grid grid-cols-1 place-items-center">
          <div className="grid grid-cols-3 bg-gray-500 p-2 w-full">
            <div className="flex justify-start gap-2">
              <button
                className="justify-self-start bg-gray-700 text-white border border-gray-700 hover:border-black"
                title="Record"
                disabled={!cartridgeData}
                onKeyDown={() => null}
                onKeyUp={() => null}
                onClick={record}
              >
                <FiberManualRecordIcon />
              </button>
              <button
                className="justify-self-start bg-gray-700 text-white border border-gray-700 hover:border-black"
                disabled={!cartridgeData || !tape || tape.length == 0}
                title="Replay"
                onKeyDown={() => null}
                onKeyUp={() => null}
                onClick={replay}
              >
                <ReplayIcon />
              </button>
              <button
                className="justify-self-start bg-gray-700 text-white border border-gray-700 hover:border-black"
                disabled={!playing.isPlaying || !cartridgeData}
                title="Pause/Resume"
                onKeyDown={() => null}
                onKeyUp={() => null}
                onClick={pause}
              >
                <PauseIcon />
              </button>
              <button
                className="justify-self-end bg-red-500 text-white border border-gray-700 hover:border-black"
                disabled={!playing.isPlaying || !cartridgeData}
                title="Stop"
                onKeyDown={() => null}
                onKeyUp={() => null}
                onClick={stop}
              >
                <StopIcon />
              </button>
            </div>

            <div>
              {currScore == undefined ? (
                <span>&emsp;</span>
              ) : (
                <span>Score: {currScore}</span>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <button
                className="justify-self-end bg-gray-700 text-white border border-gray-700 hover:border-black font-thin"
                title="Change Speed"
                disabled={!playing.isPlaying || !cartridgeData}
                onKeyDown={() => null}
                onKeyUp={() => null}
                onClick={rivemuChangeSpeed}
              >
                <span>{speed.toFixed(1)}x</span>
              </button>

              <button
                className="justify-self-end bg-gray-700 text-white border border-gray-700 hover:border-black"
                title="Fullscreen"
                disabled={!playing.isPlaying || !cartridgeData}
                onKeyDown={() => null}
                onKeyUp={() => null}
                onClick={rivemuRef.current?.fullScreen}
              >
                <FullscreenIcon />
              </button>

              <button
                className="justify-self-end bg-gray-700 text-white border border-gray-700 hover:border-black"
                title="Upload Cartridge"
                onClick={uploadCartridge}
              >
                <UploadIcon />
              </button>
            </div>
          </div>
          <div
            className="relative gameplay-screen-sm"
            onDrop={handleCartridgeDrop}
            onDragOver={(event) => event.preventDefault()}
          >
            {!cartridgeData ? (
              <div
                className={
                  "absolute gameplay-screen-sm text-white t-0 border border-gray-500 flex items-center justify-center"
                }
              >
                <span>Select/Drop cartridge</span>
              </div>
            ) : (
              <></>
            )}
            <div hidden={!cartridgeData} className={"absolute t-0 relative"}>
              {!playing.isPlaying ? (
                <button
                  className={
                    "absolute gameplay-screen-sm text-gray-500 hover:text-white t-0 backdrop-blur-sm border border-gray-500"
                  }
                  onClick={record}
                  title="Record"
                >
                  <PlayArrowIcon className="text-7xl" />
                </button>
              ) : paused ? (
                <button
                  className={
                    "absolute gameplay-screen-sm text-gray-500 hover:text-whte t-0 backdrop-blur-sm border border-gray-500"
                  }
                  onClick={pause}
                >
                  <PlayArrowIcon className="text-7xl" />
                </button>
              ) : (
                <></>
              )}
              <Rivemu
                ref={rivemuRef}
                cartridge_data={cartridgeData}
                args={args}
                entropy={entropy}
                tape={tape}
                in_card={incard ? incard : new Uint8Array([])}
                rivemu_on_frame={rivemuOnFrame}
                rivemu_on_begin={rivemuOnBegin}
                rivemu_on_finish={rivemuOnFinish}
                smallSize={true}
              />
            </div>
          </div>

          {hasScore != undefined && hasScore == false ? (
            <span title="Cartridges should have a json outcard with the 'score' key even before the first input, otherwise the default play mode won't have a score-based leaderboard">
              <WarningIcon className="text-yellow-400" />
              Cartridge has no scoring
              <WarningIcon className="text-yellow-400" />
            </span>
          ) : (
            <></>
          )}

          <FormControlLabel
            control={
              <Switch
                checked={hideCartridgeParams}
                onChange={(_e: React.ChangeEvent<HTMLInputElement>) =>
                  setHideCartridgeParams(!hideCartridgeParams)
                }
              />
            }
            label="Hide Cartridge Params"
          />

          <TextField
            className="w-full"
            label="Outcard"
            multiline
            disabled
            value={outcard || ""}
            variant="standard"
            hidden={hideCartridgeParams}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setOutcard(e.target.value)
            }
          />
          <input
            type="file"
            ref={cartridgeFileRef}
            onChange={(e) => handleOnChangeCartridgeUpload(e)}
            style={{ display: "none" }}
          />

          <TextField
            className="w-full"
            label="Rule Args"
            value={args || ""}
            variant="standard"
            hidden={hideCartridgeParams}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setArgs(e.target.value)
            }
          />

          <FormControl
            className="w-full"
            variant="standard"
            hidden={hideCartridgeParams}
          >
            <InputLabel htmlFor="incard">
              Rule Incard (Hash){" "}
              <UploadIcon onClick={uploadIncard} className="cursor-pointer" />
            </InputLabel>
            <Input id="incard" disabled value={inCardHash || "No in card"} />
          </FormControl>
          <input
            type="file"
            ref={incardFileRef}
            onChange={(e) => handleOnChangeIncardUpload(e)}
            style={{ display: "none" }}
          />
        </div>
        {!cartridgeInserted ? (
          <div className="grid grid-cols-1 gap-4 place-items-left text-white xs:w-3/4 md:w-3/4 lg:w-1/3 xl:w-1/4 2xl:w-1/4">
            <div className="flex justify-end">
              <Link
                className={`dialog-btn bg-emerald-400 text-black text-xs`}
                href={"https://rives.io/docs/rives/uploading-cartridges"}
              >
                {"-->"} Read the Docs
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-4 border border-stone-500 p-4">
              <TextField
                className=""
                label="Name"
                disabled
                value={infoCartridge?.name || ""}
                variant="standard"
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                className=""
                label="Summary"
                disabled
                value={infoCartridge?.summary || ""}
                variant="standard"
                multiline
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                className=""
                label="Description"
                disabled
                value={infoCartridge?.description || ""}
                variant="standard"
                multiline
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                className=""
                label="Authors"
                disabled
                value={
                  infoCartridge?.authors
                    ?.map((a, _i) => a.name + (a.link ? `: ${a.link}` : ""))
                    .join("\n") || ""
                }
                variant="standard"
                multiline
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                className=""
                label="Links"
                disabled
                value={infoCartridge?.links?.join("\n") || ""}
                variant="standard"
                multiline
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                className=""
                label="Tags"
                disabled
                value={
                  infoCartridge?.tags?.map((t, _i) => `#${t}`).join(", ") || ""
                }
                variant="standard"
                InputLabelProps={{ shrink: true }}
              />
            </div>

            <div className="grid grid-cols-1 justify-center">
              <button
                disabled={
                  !cartridgeData ||
                  !infoCartridge?.name ||
                  !authorsHaveLinks ||
                  !wallet ||
                  cartridgeInserted ||
                  submittingTx
                }
                className="btn mt-2 text-sm flex justify-center"
                onClick={sendCartridge}
                title={getTitleMessage()}
              >
                {!submittingTx ? (
                  "Upload Cartridge"
                ) : (
                  <div className="w-6 h-6 border-2 rounded-full border-current border-r-transparent animate-spin"></div>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div>Cartridge Uploaded!</div>
        )}

        {errorFeedback ? <ErrorModal error={errorFeedback} /> : <></>}
      </div>
    </ThemeProvider>
  );
}

export default RivemuUploader;
