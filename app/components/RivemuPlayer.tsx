"use client";

import { Parser } from "expr-eval";
import React, { useContext, useState, useEffect, useRef } from "react";

import { toBytes, toHex } from "viem";
import RestartIcon from "@mui/icons-material/RestartAlt";
import StopIcon from "@mui/icons-material/Stop";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import Box from "@mui/material/Box";
import Slider from "@mui/material/Slider";
import PauseIcon from "@mui/icons-material/Pause";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import FastForwardIcon from "@mui/icons-material/FastForward";
import UploadIcon from "@mui/icons-material/Upload";
import CloseIcon from "@mui/icons-material/Close";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import FormControl from "@mui/material/FormControl";
import Input from "@mui/material/Input";
import InputLabel from "@mui/material/InputLabel";
import Autocomplete, { createFilterOptions } from "@mui/material/Autocomplete";
import Chip from "@mui/material/Chip";
import TextField from "@mui/material/TextField";
import {
  GIF_FRAME_FREQ,
  gameplayContext,
} from "../play/GameplayContextProvider";
import { sha256 } from "js-sha256";
import { envClient } from "../utils/clientEnv";
import {
  VerifyPayload,
  formatInCard,
  getOutputs,
  rules,
} from "../backend-libs/core/lib";
import Rivemu, { RivemuRef } from "./Rivemu";
import { FormatInCardPayload, RuleInfo } from "../backend-libs/core/ifaces";
// import { ContestStatus, getContestStatus } from "../utils/common";
import Image from "next/image";
import rivesLogo from "../../public/logo.png";
import { usePrivy } from "@privy-io/react-auth";
import {
  buildUrl,
  cartridgeIdFromBytes,
  generateEntropy,
  ruleIdFromBytes,
} from "../utils/util";
// import ReactGA from "react-ga4";
// import { sendEvent } from "../utils/googleAnalytics";
// import { sendGAEvent } from "@next/third-parties/google";

let canvasPlaying = false;

const darkTheme = createTheme({
  palette: {
    mode: "dark",
  },
});

export interface TapeInfo {
  player?: string;
  timestamp?: string;
  size?: string;
  score?: string;
}

const getCartridgeData = async (cartridgeId: string): Promise<Uint8Array> => {
  const formatedCartridgeId =
    cartridgeId.substring(0, 2) === "0x"
      ? cartridgeIdFromBytes(cartridgeId)
      : cartridgeId;

  const response = await fetch(
    buildUrl(envClient.CARTRIDGES_URL, cartridgeId),
    {
      method: "GET",
      headers: {
        "Content-Type": "application/octet-stream",
      },
      mode: "cors",
    },
  );
  const blob = await response.blob();
  const data = new Uint8Array(await blob.arrayBuffer());

  // const data = await cartridge(
  //     {
  //         id:formatedCartridgeId
  //     },
  //     {
  //         decode:true,
  //         decodeModel:"bytes",
  //         cartesiNodeUrl: envClient.CARTESI_NODE_URL, applicationAddress: envClient.DAPP_ADDR as `0x${string}`
  //     }
  // );
  if (data.length > 0) return data;

  const out: Array<Uint8Array> = (
    await getOutputs(
      {
        tags: ["cartridge", "cartridge_data", cartridgeId],
        type: "report",
      },
      {
        cartesiNodeUrl: envClient.CARTESI_NODE_URL,
        applicationAddress: envClient.DAPP_ADDR as `0x${string}`,
      },
    )
  ).data;
  if (out.length > 0) return out[0];

  throw new Error(`Cartridge ${formatedCartridgeId} not found!`);
};

const getRule = async (ruleId: string): Promise<RuleInfo> => {
  const formatedRuleId = ruleId;
  const data = await rules(
    {
      id: formatedRuleId,
      enable_deactivated: true,
      full: true,
    },
    {
      decode: true,
      decodeModel: "RulesOutput",
      cartesiNodeUrl: envClient.CARTESI_NODE_URL,
      applicationAddress: envClient.DAPP_ADDR as `0x${string}`,
    },
  );

  if (data.total === 0 || data.data.length === 0)
    throw new Error(`Rule ${ruleId} not found!`);

  return data.data[0];
};

const getTapePayload = async (tapeId: string): Promise<VerifyPayload> => {
  const replayLogs: Array<VerifyPayload> = (
    await getOutputs(
      {
        tags: ["tape", tapeId],
        type: "input",
      },
      {
        cartesiNodeUrl: envClient.CARTESI_NODE_URL,
        applicationAddress: envClient.DAPP_ADDR as `0x${string}`,
      },
    )
  ).data;
  if (replayLogs.length === 0) throw new Error(`Tape ${tapeId} not found!`);
  return replayLogs[0];
};

function RivemuPlayer({
  rule_id,
  tape_id,
}: {
  rule_id?: string;
  tape_id?: string;
}) {
  const { setGameplayOwner, setGameplayLog, setGifResolution, addGifFrame } =
    useContext(gameplayContext);

  const isTape = tape_id ? true : false;
  const page = typeof window !== "undefined" ? window.location.href : null;

  // rivemu state
  const [cartridgeData, setCartridgeData] = useState<Uint8Array>();
  const [rule, setRule] = useState<RuleInfo>();
  const [tape, setTape] = useState<VerifyPayload>();
  const [entropy, setEntropy] = useState<string>("entropy");
  const [currScore, setCurrScore] = useState<number>();
  const [playing, setPlaying] = useState({ isPlaying: false, playCounter: 0 });
  const [currProgress, setCurrProgress] = useState<number>(0);
  const [skipToFrame, setSkipToFrame] = useState<number>();
  const [totalFrames, setTotalFrames] = useState<number>();
  const [lastFrameIndex, setLastFrameIndex] = useState<number>();
  const [loadingMessage, setLoadingMessage] = useState<string | undefined>(
    "Initializing",
  );
  const [errorMessage, setErrorMessage] = useState<string>();
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(1.0);
  const [restarting, setRestarting] = useState(false);
  const [inCard, setInCard] = useState<Uint8Array>();
  const [tapeInCard, setTapeInCard] = useState<Uint8Array>();
  const [usedTapes, setUsedTapes] = useState<string[]>();
  const [ruleInCardHash, setRuleIncardHash] = useState<string>(sha256(""));
  const incardFileRef = useRef<HTMLInputElement | null>(null);

  // signer
  const { user, ready } = usePrivy();
  const [signerAddress, setSignerAddress] = useState<string | null>(
    user && user.wallet ? user.wallet.address.toLowerCase() : null,
  );

  const rivemuRef = useRef<RivemuRef>(null);

  useEffect(() => {
    if (!isTape && ready) {
      if (!user || !user.wallet) {
        setSignerAddress(null);
        if (!isTape && rule_id) setEntropy("entropy");
      } else {
        setSignerAddress(user.wallet.address.toLowerCase());
        if (rule_id)
          setEntropy(
            generateEntropy(user.wallet.address.toLowerCase(), rule_id),
          );
      }
    }
  }, [user, ready, rule_id, isTape]);

  useEffect(() => {
    const loadRule = (ruleId: string) => {
      setLoadingMessage("Loading rule");
      getRule(ruleId).then((out: RuleInfo) => {
        if (!out) {
          setErrorMessage("Rule not found");
          return;
        }
        setRule(out);
        setLoadingMessage("Loading cartridge");
        getCartridgeData(out.cartridge_id).then((data) => {
          if (!data) {
            setErrorMessage("Cartridge not found");
            return;
          }
          setCartridgeData(data);
          setLoadingMessage(undefined);
        });
      });
    };

    const loadTape = (tapeId: string, loadRuleFromTape: boolean) => {
      setLoadingMessage("Loading tape");
      getTapePayload(tapeId).then((out: VerifyPayload) => {
        if (!out) {
          setErrorMessage("Tape not found");
          return;
        }
        setTape(out);

        setEntropy(
          generateEntropy(out._msgSender, ruleIdFromBytes(out.rule_id)),
        );
        if (loadRuleFromTape) {
          loadRule(ruleIdFromBytes(out.rule_id));
        } else {
          setLoadingMessage(undefined);
        }

        setUsedTapes(out.tapes);
        setTapeInCard(out.in_card);
      });
    };

    if (rule_id) {
      loadRule(rule_id);
    }
    if (tape_id) {
      loadTape(tape_id, rule_id == undefined);
    }
    document.addEventListener("visibilitychange", (_event) => {
      if (document.visibilityState == "hidden") {
        if (canvasPlaying) {
          rivemuRef.current?.setSpeed(0);
          setPaused(true);
        }
      }
    });
  }, [tape_id, rule_id]);

  useEffect(() => {
    if (!rule) {
      return;
    }
    if (isTape && (!tapeInCard || !usedTapes)) {
      setRuleIncardHash(sha256(""));
      setUsedTapes(undefined);
      return;
    }

    const inputData: FormatInCardPayload = { rule_id: rule.id };
    if (tapeInCard && tapeInCard.length > 0)
      inputData.in_card = toHex(tapeInCard);
    if (usedTapes && usedTapes.length > 0) inputData.tapes = usedTapes;
    formatInCard(inputData, {
      cartesiNodeUrl: envClient.CARTESI_NODE_URL,
      applicationAddress: envClient.DAPP_ADDR as `0x${string}`,
      decode: true,
      decodeModel: "bytes",
    }).then((out) => {
      setInCard(out);
    });
  }, [rule, tapeInCard, usedTapes, isTape]);

  // const cstatus = rule ? getContestStatus(rule) : ContestStatus.INVALID;

  if (errorMessage) {
    return (
      <span className="flex items-center justify-center h-lvh text-white">
        {errorMessage}
      </span>
    );
  }

  if (loadingMessage) {
    return (
      <div className="gameplay-screen flex flex-col items-center justify-center text-white">
        <Image className="animate-bounce" src={rivesLogo} alt="RiVES logo" />
        <span>{loadingMessage}</span>
      </div>
    );
  }

  if (!(cartridgeData && rule)) {
    return (
      <span className="flex items-center justify-center h-lvh text-white">
        No rule and cartridge
      </span>
    );
  }

  const parser = new Parser();
  const scoreFunctionEvaluator = rule?.score_function
    ? parser.parse(rule.score_function)
    : null;

  const decoder = new TextDecoder("utf-8");

  const filter = createFilterOptions<string>();

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
          setRuleIncardHash(sha256(incard));
          setTapeInCard(incard);
        }
      };
      reader.readAsArrayBuffer(e.target.files[0]);
    }
  }

  async function cleanIncard() {
    setTapeInCard(new Uint8Array([]));
    setRuleIncardHash(sha256(""));
    if (incardFileRef.current) incardFileRef.current.value = "";
  }
  const rivemuOnFrame = function (
    outcard: ArrayBuffer,
    frame: number,
    _cycles: number,
    fps: number,
    _cpu_cost: number,
    _cpu_speed: number,
    _cpu_usage: number,
    _cpu_quota: number,
  ) {
    if (isTape && totalFrames && totalFrames != 0) {
      if (skipToFrame) {
        setCurrProgress(Math.round((100 * skipToFrame) / totalFrames));
        if (frame < skipToFrame) return;
        setSkipToFrame(undefined);
        rivemuRef.current?.setSpeed(speed);
      }
      setCurrProgress(Math.round((100 * frame) / totalFrames));
    } else if (
      lastFrameIndex == undefined ||
      frame >= lastFrameIndex + fps / GIF_FRAME_FREQ
    ) {
      const canvas = document.getElementById("canvas");
      if (!canvas) return;

      const frameImage = (canvas as HTMLCanvasElement).toDataURL("image/jpeg");
      addGifFrame(frameImage);
      setLastFrameIndex(frame);
    }
    if (
      scoreFunctionEvaluator &&
      decoder.decode(outcard.slice(0, 4)) == "JSON"
    ) {
      const outcard_str = decoder.decode(outcard);
      const outcard_json = JSON.parse(outcard_str.substring(4));
      setCurrScore(scoreFunctionEvaluator.evaluate(outcard_json));
    }

    if (page && page != window.location.href) {
      // rivemuRef will be null, call Rivemu directly

      // @ts-expect-error
      Module.ccall("rivemu_stop");
    }
  };

  const rivemuOnBegin = function (
    width: number,
    height: number,
    _target_fps: number,
    total_frames: number,
    _info_data: Uint8Array,
  ) {
    console.log("rivemu_on_begin");
    canvasPlaying = true;
    setCurrScore(undefined);
    if (rule?.score_function) {
      setCurrScore(0);
    }
    setCurrProgress(0);
    setLastFrameIndex(undefined);
    setGameplayLog(null);
    if (isTape && total_frames) setTotalFrames(total_frames);
    else {
      setGameplayOwner(signerAddress || "0x");
      setGifResolution(width, height);
    }
    setRestarting(false);
  };

  const rivemuOnFinish = function (
    rivlog: ArrayBuffer,
    outcard: ArrayBuffer,
    outhash: string,
  ) {
    rivemuRef.current?.stop();
    console.log("rivemu_on_finish");
    canvasPlaying = false;
    if (isTape && totalFrames && totalFrames != 0) setCurrProgress(100);
    if (!isTape && rule && !rule.deactivated && signerAddress && !restarting) {
      let score: number | undefined = undefined;
      if (
        scoreFunctionEvaluator &&
        decoder.decode(outcard.slice(0, 4)) == "JSON"
      ) {
        const outcard_str = decoder.decode(outcard);
        const outcard_json = JSON.parse(outcard_str.substring(4));
        score = scoreFunctionEvaluator.evaluate(outcard_json);
      }
      setGameplayLog({
        cartridge_id: rule.cartridge_id,
        log: new Uint8Array(rivlog),
        outcard: {
          value: new Uint8Array(outcard),
          hash: outhash,
        },
        score,
        rule_id: rule.id,
        tapes:
          usedTapes && usedTapes.length > 0
            ? usedTapes.map((t, _i) => `0x${t}`)
            : undefined,
        in_card: tapeInCard,
      });
      if (document.fullscreenElement) document.exitFullscreen();
    }
    if (restarting)
      setPlaying({ ...playing, playCounter: playing.playCounter + 1 });
    else setPlaying({ isPlaying: false, playCounter: playing.playCounter + 1 });
  };

  async function play() {
    // const eventName = isTape ? "Watch" : "Play";
    // const eventLabel = isTape ? `Watch ${tape_id}` : `Play ${rule?.id}`;
    // sendGAEvent("event", eventName, {
    //   event_category: "Rivemu",
    //   event_label: eventLabel,
    // });

    setSpeed(1.0);
    setPaused(false);
    setRestarting(true);
    setSkipToFrame(undefined);
    rivemuRef.current?.start();
    setPlaying({ ...playing, isPlaying: true });
  }

  async function pause() {
    if (playing.isPlaying) {
      if (paused) {
        rivemuRef.current?.setSpeed(speed);
      } else {
        rivemuRef.current?.setSpeed(0);
      }
      setPaused(!paused);
      setSkipToFrame(undefined);
    }
  }

  async function resumeSpeed() {
    if (skipToFrame) {
      rivemuRef.current?.setSpeed(speed);
      setSkipToFrame(undefined);
    }
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
      rivemuRef.current?.setSpeed(newSpeed);
    }
  }

  async function stop() {
    rivemuRef.current?.stop();
    setPlaying({ ...playing, isPlaying: false });
  }

  const handleSliderChange = (event: Event, newValue: number | number[]) => {
    if (!isTape || !totalFrames) return;
    const valueToset =
      (newValue as number) > currProgress ? (newValue as number) : currProgress;
    setCurrProgress(valueToset);
  };

  const handleSliderChangeCommited = (
    event: React.SyntheticEvent | Event,
    newValue: number | number[],
  ) => {
    if (!isTape || !totalFrames) return;
    setSkipToFrame(Math.round(((newValue as number) * totalFrames) / 100));
    rivemuRef.current?.setSpeed(10);
  };
  return (
    <section className="flex flex-col items-center justify-center">
      <div>
        <div
          style={{ justifyContent: "space-between" }}
          className="screen-controls flex items-center md:grid md:grid-cols-3 bg-gray-500 p-2"
        >
          <div className="flex gap-2">
            <button
              className="bg-gray-700 text-white border border-gray-700 hover:border-black"
              title={isTape ? "Restart" : "Record"}
              onKeyDown={() => null}
              onKeyUp={() => null}
              onClick={play}
              onMouseDown={(event: React.MouseEvent<HTMLButtonElement>) =>
                event.preventDefault()
              }
            >
              {isTape ? <RestartIcon /> : <FiberManualRecordIcon />}
            </button>
            <button
              className="bg-gray-700 text-white border border-gray-700 hover:border-black"
              title="Pause/Resume"
              disabled={!playing.isPlaying}
              onKeyDown={() => null}
              onKeyUp={() => null}
              onClick={pause}
              onMouseDown={(event: React.MouseEvent<HTMLButtonElement>) =>
                event.preventDefault()
              }
            >
              <PauseIcon />
            </button>

            <button
              className="bg-red-500 text-white border border-gray-700 hover:border-black"
              title="Stop"
              disabled={!playing.isPlaying}
              onKeyDown={() => null}
              onKeyUp={() => null}
              onClick={stop}
              onMouseDown={(event: React.MouseEvent<HTMLButtonElement>) =>
                event.preventDefault()
              }
            >
              <StopIcon />
            </button>
          </div>

          <div
            className={`pixelated-font text-center font-bold text-yellow-500 text-xs md:text-xl`}
          >
            {currScore}
          </div>

          <div className="flex md:justify-end gap-2">
            <button
              hidden={!isTape}
              className="justify-self-end bg-gray-700 text-white border border-gray-700 hover:border-black font-thin"
              title="Change Speed"
              disabled={!playing.isPlaying || !isTape}
              onKeyDown={() => null}
              onKeyUp={() => null}
              onClick={rivemuChangeSpeed}
            >
              <span>{speed.toFixed(1)}x</span>
            </button>

            <button
              className="justify-self-end bg-gray-700 text-white border border-gray-700 hover:border-black"
              title="Fullscreen"
              disabled={!playing.isPlaying}
              onKeyDown={() => null}
              onKeyUp={() => null}
              onClick={rivemuRef.current?.fullScreen}
            >
              <FullscreenIcon />
            </button>
          </div>
        </div>

        <div className="relative">
          {!playing.isPlaying ? (
            <button
              className={
                "absolute gameplay-screen text-gray-500 hover:text-white t-0 border border-gray-500"
              }
              onClick={play}
              title={isTape ? "Replay" : "Record"}
            >
              {playing.playCounter === 0 ? (
                <PlayArrowIcon className="text-7xl" />
              ) : isTape ? (
                <RestartIcon className="text-7xl" />
              ) : (
                <PlayArrowIcon className="text-7xl" />
              )}
            </button>
          ) : paused ? (
            <button
              className={
                "absolute gameplay-screen text-gray-500 hover:text-white t-0 backdrop-blur-sm border border-gray-500"
              }
              onClick={pause}
            >
              <PlayArrowIcon className="text-7xl" />
            </button>
          ) : skipToFrame ? (
            <button
              className={
                "absolute gameplay-screen text-gray-500 hover:text-white t-0 backdrop-blur-md backdrop-opacity-40 border border-gray-500"
              }
              onClick={resumeSpeed}
            >
              <FastForwardIcon className="text-7xl animate-pulse" />
            </button>
          ) : (
            <></>
          )}
          <Rivemu
            ref={rivemuRef}
            cartridge_data={cartridgeData}
            args={rule.args}
            entropy={entropy}
            tape={tape?.tape && tape.tape.length > 0 && toBytes(tape.tape)}
            in_card={inCard && inCard.length > 0 ? inCard : new Uint8Array([])}
            rivemu_on_frame={rivemuOnFrame}
            rivemu_on_begin={rivemuOnBegin}
            rivemu_on_finish={rivemuOnFinish}
          />
        </div>
      </div>
      {isTape ? (
        <div className="screen-controls">
          <Box sx={{ width: "100%'" }}>
            <Slider
              size="small"
              aria-label="Progress"
              valueLabelDisplay="auto"
              value={currProgress}
              onChange={handleSliderChange}
              onChangeCommitted={handleSliderChangeCommited}
            />
          </Box>
        </div>
      ) : (
        <div>
          <ThemeProvider theme={darkTheme}>
            <CssBaseline />
            <FormControl variant="standard" hidden={!rule.allow_in_card}>
              <InputLabel htmlFor="tape-incard">
                Tape Incard (Hash){" "}
                <UploadIcon onClick={uploadIncard} className="cursor-pointer" />{" "}
                <CloseIcon onClick={cleanIncard} className="cursor-pointer" />
              </InputLabel>
              <Input
                id="tape-incard"
                disabled
                value={ruleInCardHash || ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setRuleIncardHash(e.target.value)
                }
              />
              <input
                type="file"
                ref={incardFileRef}
                onChange={(e) => handleOnChangeIncardUpload(e)}
                style={{ display: "none" }}
              />
            </FormControl>

            <Autocomplete
              hidden={!rule.allow_tapes}
              multiple
              value={usedTapes || []}
              defaultValue={[]}
              id="tapes-standard"
              options={usedTapes || []}
              getOptionLabel={(option) => option}
              isOptionEqualToValue={(option, value) => option === value}
              onChange={(_event: unknown, newValue: string[] | null) =>
                setUsedTapes(newValue || undefined)
              }
              filterOptions={(options, params) => {
                const filtered = filter(options, params);

                const { inputValue } = params;
                // Suggest the creation of a new value
                const isExisting = options.some(
                  (option) => inputValue === option,
                );
                if (inputValue !== "" && !isExisting) {
                  filtered.push(inputValue);
                }

                return filtered;
              }}
              renderInput={(params) => (
                <TextField {...params} variant="standard" label="Tapes" />
              )}
              renderTags={(tagValue, getTagProps) => {
                return tagValue.map((option, index) => (
                  <Chip
                    {...getTagProps({ index })}
                    key={option}
                    label={option}
                  />
                ));
              }}
            />
          </ThemeProvider>
        </div>
      )}
    </section>
  );
}

export default RivemuPlayer;
