"use client";

import React from "react";
import { Parser } from "expr-eval";
import { useState, useEffect, useRef } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { toHex, toBytes, keccak256 } from "viem";

import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import TextField from "@mui/material/TextField";
import FormControl from "@mui/material/FormControl";
import Input from "@mui/material/Input";
import InputLabel from "@mui/material/InputLabel";
import Autocomplete, { createFilterOptions } from "@mui/material/Autocomplete";
import Chip from "@mui/material/Chip";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import StopIcon from "@mui/icons-material/Stop";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import PauseIcon from "@mui/icons-material/Pause";
import ReplayIcon from "@mui/icons-material/Replay";
import UploadIcon from "@mui/icons-material/Upload";
import WarningIcon from "@mui/icons-material/Warning";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";
import { sha256 } from "js-sha256";
import Ajv from "ajv";
import addFormats from "ajv-formats";

import { envClient } from "../utils/clientEnv";
import {
  cartridgeInfo,
  createRule,
  rules,
  formatInCard,
  deactivateRule,
} from "../backend-libs/core/lib";
import Rivemu, { RivemuRef } from "./Rivemu";
import {
  CartridgeInfo,
  RuleInfo,
  // InfoCartridge,
  RuleData,
  FormatInCardPayload,
  DeactivateRulePayload,
} from "../backend-libs/core/ifaces";

import ErrorModal, { ERROR_FEEDBACK } from "./ErrorModal";
import {
  buildUrl,
  cartridgeIdFromBytes,
  formatCartridgeIdToBytes,
  formatRuleIdToBytes,
  generateEntropy,
  getWalletClient,
} from "@/app/utils/util";

const ajv = new Ajv({ coerceTypes: true });
addFormats(ajv);

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

const testRivlog: Uint8Array = new Uint8Array([
  1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 15, 0, 0, 0,
]);

// const getCartridgeInfo = async (id: string): Promise<CartridgeInfo> => {
//   const out: CartridgeInfo = await cartridgeInfo(
//     { id },
//     {
//       decode: true,
//       decodeModel: "CartridgeInfo",
//       cartesiNodeUrl: envClient.CARTESI_NODE_URL,
//       applicationAddress: envClient.DAPP_ADDR as `0x${string}`,
//     },
//   );
//   return out;
// };

const getCartridgeData = async (cartridgeId: string): Promise<Uint8Array> => {
  const formatedCartridgeId =
    cartridgeId.substring(0, 2) === "0x"
      ? cartridgeIdFromBytes(cartridgeId)
      : cartridgeId;
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

  const response = await fetch(
    buildUrl(envClient.CARTRIDGES_URL, cartridgeId),
    {
      method: "GET",
      headers: {
        "Content-Type": "application/octet-stream",
      },
    },
  );
  const blob = await response.blob();
  const data = new Uint8Array(await blob.arrayBuffer());

  if (data.length === 0)
    throw new Error(`Cartridge ${formatedCartridgeId} not found!`);

  return data;
};

const getRule = async (id: string): Promise<RuleInfo | null> => {
  if (!id) return null;
  const data = await rules(
    {
      id,
      full: true,
    },
    {
      decode: true,
      decodeModel: "RulesOutput",
      cartesiNodeUrl: envClient.CARTESI_NODE_URL,
      applicationAddress: envClient.DAPP_ADDR as `0x${string}`,
    },
  );
  if (data.total != 1) return null;

  return data.data[0] as RuleInfo;
};

function RulesEditor({
  cartridge_id,
  rule_id,
}: {
  cartridge_id: string;
  rule_id?: string;
}) {
  // rivemu state
  const [cartridgeData, setCartridgeData] = useState<Uint8Array>();
  // const [cartridge, setCartridge] = useState<CartridgeInfo | null>();
  const [rule, setRule] = useState<RuleInfo | null>();
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
  const [outcardObj, setOutcardObj] = useState<Map<string, unknown>>();
  const [outcardObjKeys, setOutcardObjKeys] = useState<string[]>();
  const [detailedRuleArgs, setDetailedRuleArgs] = useState<
    Record<string, unknown>
  >({});
  const [ruleArgsSchema, setRuleArgsSchema] =
    useState<Record<string, unknown>>();
  const [ruleArgsFields, setRuleArgsFields] = useState<Map<string, unknown>>();
  const [ruleArgsFieldsKeys, setRuleArgsFieldsKeys] = useState<string[]>();
  const [ruleArgsErrors, setRuleArgsErrors] = useState<Map<string, string>>(
    new Map(),
  );
  const [testAutoplay, setTestAutoplay] = useState<boolean>(false);
  const [tested, setTested] = useState<boolean>(false);
  const [valid, setValid] = useState<boolean>(false);
  const [argsErrors, setArgsErrors] = useState<boolean>(false);
  const [hasScore, setHasScore] = useState<boolean>();

  const [ruleInCard, setRuleIncard] = useState<Uint8Array>();
  const [finalInCard, setFinalIncard] = useState<Uint8Array>();
  const [ruleInCardHash, setRuleIncardHash] = useState<string>();
  const [ruleArgs, setRuleArgs] = useState<string>();
  const [ruleScoreFunction, setRuleScoreFunction] = useState<string>();
  const [ruleName, setRuleName] = useState<string>();
  const [ruleDescription, setRuleDescription] = useState<string>();
  const [ruleStart, setRuleStart] = useState<Dayjs>();
  const [ruleEnd, setRuleEnd] = useState<Dayjs>();
  const [ruleTags, setRuleTags] = useState<string[]>(["community"]);
  const incardFileRef = useRef<HTMLInputElement | null>(null);
  // const [infoCartridge, setInfoCartridge] = useState<InfoCartridge>();
  const [restarting, setRestarting] = useState(false);
  const [ruleTapes, setRuleTapes] = useState<string[]>();
  const [ruleAllowTapes, setRuleAllowTapes] = useState(false);
  const [ruleAllowIncard, setRuleAllowIncard] = useState(false);
  const [ruleSaveOutcard, setRuleSaveOutcard] = useState(false);
  const [ruleSaveTapes, setRuleSaveTapes] = useState(false);
  // const [cartridgeVersions, setCartridgeVersions] = useState<readonly CartridgeInfo[]>([])
  // const [versionsComboOpen, setVersionsComboOpen] = useState(false);
  // const [versionSelected, setVersionSelected] = useState<CartridgeInfo|null>();

  const [errorFeedback, setErrorFeedback] = useState<ERROR_FEEDBACK>();

  const filter = createFilterOptions<string>();

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
    if (rule_id) {
      getRule(rule_id).then((res) => {
        if (res) {
          setRule(res);
        }
      });
    }
  }, [rule_id]);

  useEffect(() => {
    if (cartridge_id) {
      getCartridgeData(cartridge_id).then((res) => {
        if (res) {
          setCartridgeData(res);
          setTape(testRivlog);
          setTestAutoplay(true);
        }
      });
      // getCartridgeInfo(cartridge_id).then((res) => {
      //   if (res) {
      //     setCartridge(res);
      //   }
      // });
    }
  }, [cartridge_id]);

  useEffect(() => {
    if (!ready) return;

    if (!user) {
      setEntropy("entropy");
    } else {
      setEntropy(
        generateEntropy(user.wallet!.address.toLowerCase(), rule?.id || ""),
      );
    }
  }, [user, ready, rule?.id]);

  useEffect(() => {
    if (!rule) return;
    // if (rule) setEnableRuleEditing(false);
    setRuleName(rule?.name);
    setRuleArgs(rule?.args);
    setRuleDescription(rule?.description);
    setRuleScoreFunction(rule?.score_function);
    const incard =
      rule?.in_card && rule.in_card.length > 0
        ? toBytes(rule.in_card)
        : new Uint8Array([]);
    setRuleIncard(incard);
    setRuleIncardHash(sha256(incard));
    setRuleStart(
      rule?.start && rule.start > 0 ? dayjs.unix(rule.start) : undefined,
    );
    setRuleEnd(rule?.end && rule.end > 0 ? dayjs.unix(rule.end) : undefined);
    if (rule?.allow_in_card != undefined)
      setRuleAllowIncard(rule.allow_in_card);
    if (rule?.allow_tapes != undefined) setRuleAllowTapes(rule.allow_tapes);
    if (rule?.save_tapes != undefined) setRuleSaveTapes(rule.save_tapes);
    if (rule?.save_out_cards != undefined)
      setRuleSaveOutcard(rule.save_out_cards);
    setRuleTapes(rule?.tapes);
    setRuleTags(rule?.tags);
    // getRuleTags(
    //     {
    //         cartridge_id: rule?.cartridge_id
    //     },
    //     {
    //         decode:true,
    //         decodeModel:"RuleTagsOutput",
    //         cartesiNodeUrl: envClient.CARTESI_NODE_URL, applicationAddress: envClient.DAPP_ADDR as `0x${string}`,
    //     }
    // ).then( (out:RuleTagsOutput) => {
    //     setRuleCartridgeTags(out.tags);
    // });
  }, [rule]);

  useEffect(() => {
    if (playing.isPlaying && !playing.isReplay && tape && tape.length == 0) {
      rivemuRef.current?.start();
    }
  }, [playing.isPlaying, playing.isReplay, tape]);

  useEffect(() => {
    const inputData: FormatInCardPayload = {};
    inputData.cartridge_id = cartridge_id;
    if (ruleInCard && ruleInCard.length > 0)
      inputData.in_card = toHex(ruleInCard);
    if (ruleTapes && ruleTapes.length > 0) inputData.tapes = ruleTapes;
    formatInCard(inputData, {
      cartesiNodeUrl: envClient.CARTESI_NODE_URL,
      applicationAddress: envClient.DAPP_ADDR as `0x${string}`,
      decode: true,
      decodeModel: "bytes",
    }).then((out) => {
      setFinalIncard(out);
    });
  }, [ruleInCard, ruleTapes, cartridge_id]);

  useEffect(() => {
    if (testAutoplay) {
      replay();
    }
  }, [testAutoplay, replay]);

  useEffect(() => {
    setTested(false);
    setValid(false);
  }, [ruleScoreFunction]);

  useEffect(() => {
    setTested(false);
  }, [ruleArgs]);

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
          setRuleIncard(incard);
          setRuleIncardHash(sha256(incard));
          setTape(new Uint8Array([]));
        }
      };
      reader.readAsArrayBuffer(e.target.files[0]);
    }
  }

  const decoder = new TextDecoder("utf-8");

  function sendRuleTooltip(): string {
    // !ruleName || !ready || !user || !tested
    if (argsErrors) return "Please, fix the argument errors";
    if (!tested) return "Please, test the play mode";
    if (!valid) return "Please, fix the errors";
    if (!ruleName) return "Please, set a name";
    if (!ready || !user) return "Please, connect your wallet";
    return "Send Play Mode";
  }

  function updateArgs(
    argsFields: Map<string, unknown>,
    detailedArgs: Record<string, unknown>,
  ) {
    if (!argsFields) return;

    const argsList: string[] = [];
    for (const key in detailedArgs) {
      const value = detailedArgs[key] as string;
      if (value === "" || value === undefined) continue;
      const fields = argsFields.get(key) as Record<string, string>;
      if (fields["format"].indexOf(":value:") == -1 && !value) continue;
      const argStr = fields["format"].replace(":value:", value);
      argsList.push(argStr);
    }
    setRuleArgs(argsList.join(" "));
  }

  function onChangeDetailedRuleArgs(key: string, value: unknown) {
    if (
      typeof detailedRuleArgs[key] == "boolean" &&
      detailedRuleArgs[key] === false
    )
      value = "";
    detailedRuleArgs[key] = value;
    setDetailedRuleArgs(detailedRuleArgs);
    if (ruleArgsSchema && ruleArgsFields) {
      const ruleArgsToValidate: Record<string, unknown> = {};
      for (const key in detailedRuleArgs) {
        if (
          detailedRuleArgs[key] === "" ||
          detailedRuleArgs[key] === undefined
        ) {
          delete ruleArgsToValidate[key];
          continue;
        }
        ruleArgsToValidate[key] = detailedRuleArgs[key];
      }
      const validator = ajv.compile(ruleArgsSchema);
      const detailValid = validator(ruleArgsToValidate);
      if (!detailValid) {
        setArgsErrors(true);
        const newErrors = new Map<string, string>();
        if (validator.errors)
          for (const err of validator.errors) {
            newErrors.set(
              err["instancePath"].replace("/", ""),
              err["message"] as string,
            );
          }
        setRuleArgsErrors(newErrors);
      } else {
        setArgsErrors(false);
        updateArgs(ruleArgsFields, ruleArgsToValidate);
        setRuleArgsErrors(new Map());
      }
    }
  }

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
    let gotScore = testAutoplay || false;
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
      const outcardMap = new Map(Object.entries(outcard_json));
      setOutcardObj(outcardMap);
      setOutcardObjKeys(Object.keys(outcard_json));
      if (ruleScoreFunction) {
        try {
          const parser = new Parser();
          const scoreFunctionEvaluator = parser.parse(ruleScoreFunction);
          setCurrScore(scoreFunctionEvaluator.evaluate(outcard_json));
          if (hasScore == undefined) setHasScore(true);
          gotScore = true;
        } catch (e) {
          rivemuRef.current?.stop();
          console.log(e);
          setErrorFeedback({
            message: "Error parsing score",
            severity: "error",
            dismissible: true,
            dissmissFunction: () => setErrorFeedback(undefined),
          });
          setValid(false);
        }
      } else {
        setCurrScore(outcard_json.score);
      }
    }
    if (!gotScore) setHasScore(false);
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

    let info: Record<string, unknown>;
    if (info_data.length > 0) {
      try {
        const textDecoder = new TextDecoder();
        info = JSON.parse(textDecoder.decode(info_data));
        if (info.fields && info.schema && !ruleArgsFieldsKeys) {
          const schema = info.schema as Record<string, unknown>;
          setRuleArgsSchema(schema);
          const newDetailedArgs: Record<string, unknown> = {};
          if (schema) {
            const properties = schema["properties"] as Record<
              string,
              Record<string, unknown>
            >;
            for (const key in properties) {
              const defValue =
                properties[key]["default"] || properties[key]["const"];
              if (defValue != undefined) newDetailedArgs[key] = defValue;
              else newDetailedArgs[key] = "";
            }
          }
          setDetailedRuleArgs(newDetailedArgs);
          const argsMap = new Map(Object.entries(info.fields));
          setRuleArgsFields(argsMap);
          const fieldNames = Object.keys(info.fields);
          setRuleArgsFieldsKeys(fieldNames);
          updateArgs(argsMap, newDetailedArgs);
        }
      } catch (e) {
        console.warn("Failed to parse cartridge info.json:", e);
      }
    }
    // setInfoCartridge(info);
    setCurrScore(undefined);
    setOutcard(undefined);
    setOutcardObj(undefined);
    if (rule?.score_function) {
      setCurrScore(0);
    }
    setRestarting(false);
    setHasScore(undefined);
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
    setTape(new Uint8Array(rivlog));
    if (testAutoplay) {
      setTestAutoplay(false);
    } else {
      setTested(true);
      if (!errorFeedback) setValid(true);
    }
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

  async function sendRule() {
    if (!cartridgeData) {
      setErrorFeedback({
        message: "No cartridge selected",
        severity: "warning",
        dismissible: true,
        dissmissFunction: () => setErrorFeedback(undefined),
      });
      return;
    }
    const cartridgeId = cartridgeIdFromBytes(keccak256(cartridgeData)); // TODO: Fix name here
    const out: CartridgeInfo = await cartridgeInfo(
      { id: cartridgeId },
      {
        cartesiNodeUrl: envClient.CARTESI_NODE_URL,
        applicationAddress: envClient.DAPP_ADDR as `0x${string}`,
      },
    );

    if (!out) {
      setErrorFeedback({
        message: "Cartridge not inserted yet",
        severity: "warning",
        dismissible: true,
        dissmissFunction: () => setErrorFeedback(undefined),
      });
      return;
    }

    if (!ruleName) {
      setErrorFeedback({
        message: "Invalid rule name",
        severity: "warning",
        dismissible: true,
        dissmissFunction: () => setErrorFeedback(undefined),
      });
      return;
    }

    const existingRules = await rules(
      {
        cartridge_id: cartridgeId,
        name: ruleName,
        enable_deactivated: true,
      },
      {
        decode: true,
        decodeModel: "RulesOutput",
        cartesiNodeUrl: envClient.CARTESI_NODE_URL,
        applicationAddress: envClient.DAPP_ADDR as `0x${string}`,
      },
    );

    if (existingRules.total > 0) {
      setErrorFeedback({
        message: "Rule with this name already exists",
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

    // submit rule
    const inputData: RuleData = {
      cartridge_id: formatCartridgeIdToBytes(cartridgeId),
      name: ruleName,
      description: ruleDescription || "",
      args: ruleArgs || "",
      score_function: ruleScoreFunction || "",
      in_card: toHex(ruleInCard || new Uint8Array([])),
      start: ruleStart?.unix() || 0,
      end: ruleEnd?.unix() || 0,
      tags: ruleTags || [],
      tapes:
        ruleTapes && ruleTapes.length > 0
          ? ruleTapes.map((t, _i) => (t.startsWith("0x") ? t : `0x${t}`))
          : [],
      allow_in_card: ruleAllowIncard || false,
      allow_tapes: ruleAllowTapes || false,
      save_out_cards: ruleSaveOutcard || false,
      save_tapes: ruleSaveTapes || false,
    };
    try {
      const walletClient = await getWalletClient(wallet);

      await createRule(inputData, {
        client: walletClient,
        applicationAddress: envClient.DAPP_ADDR as `0x${string}`,
      });
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
      return;
    }
  }

  async function sendRuleDeactivation() {
    if (!rule) {
      setErrorFeedback({
        message: "No rule selected",
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

    // submit rule
    const inputData: DeactivateRulePayload = {
      rule_id: formatRuleIdToBytes(rule.id),
    };
    try {
      const walletClient = await getWalletClient(wallet);
      await deactivateRule(inputData, {
        client: walletClient,
        applicationAddress: envClient.DAPP_ADDR as `0x${string}`,
      });
      setRule(undefined);
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
      return;
    }
  }

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <div className="w-full">
        <div className="flex items-start flex-wrap justify-center gap-2">
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
              </div>
            </div>
            <div className="gameplay-screen-sm">
              <div hidden={!cartridgeData} className={"relative"}>
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
                      "absolute gameplay-screen-sm text-gray-500 hover:text-white t-0 backdrop-blur-sm border border-gray-500"
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
                  args={ruleArgs}
                  entropy={entropy}
                  tape={tape}
                  in_card={finalInCard ? finalInCard : new Uint8Array([])}
                  rivemu_on_frame={rivemuOnFrame}
                  rivemu_on_begin={rivemuOnBegin}
                  rivemu_on_finish={rivemuOnFinish}
                  smallSize={true}
                />
              </div>
            </div>
            {outcardObj && outcardObjKeys ? (
              <div className="grid grid-cols-1 w-full text-sm justify-items-center">
                <div className="text-center font-bold">Outcard</div>
                <table className="w-3/4">
                  <tbody>
                    {outcardObjKeys.map((key, index) => {
                      if (typeof outcardObj.get(key) != "number") return null;
                      return (
                        <tr key={"outcard" + index}>
                          <td key={"outcard-k" + index} className="text-left">
                            {key}
                          </td>
                          <td key={"outcard-v" + index} className="text-right">
                            {outcardObj.get(key) as string}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <TextField
                className="w-full"
                label="Outcard"
                disabled
                value={outcard || ""}
                multiline
                variant="standard"
              />
            )}
            {/* <TextField className="w-full" label="Outcard" disabled value={outcard || ""} multiline variant="standard"  /> */}
          </div>
          <div className="grid grid-cols-1 gap-4 place-items-left text-white xs:w-3/4 md:w-3/4 lg:w-1/3 xl:w-1/4 2xl:w-1/4">
            <div className="grid grid-cols-1 gap-4 border border-stone-500 p-4">
              <TextField
                className="w-full"
                label="Name"
                value={ruleName || ""}
                variant="standard"
                disabled={rule != undefined}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setRuleName(e.target.value)
                }
              />
              <TextField
                className="w-full"
                label="Description"
                value={ruleDescription || ""}
                multiline
                variant="standard"
                disabled={rule != undefined}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setRuleDescription(e.target.value)
                }
              />
              <div>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DateTimePicker
                    label="Start (local)"
                    value={ruleStart || null}
                    disabled={rule != undefined}
                    onChange={(newValue: Dayjs | null) =>
                      setRuleStart(newValue || undefined)
                    }
                  />
                </LocalizationProvider>
              </div>

              <div>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DateTimePicker
                    label="End (local)"
                    value={ruleEnd || null}
                    disabled={rule != undefined}
                    onChange={(newValue: Dayjs | null) =>
                      setRuleEnd(newValue || undefined)
                    }
                    defaultValue={null}
                  />
                </LocalizationProvider>
              </div>

              <TextField
                className="w-full"
                label="Score Function"
                value={ruleScoreFunction || ""}
                variant="standard"
                disabled={rule != undefined}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setRuleScoreFunction(e.target.value)
                }
              />

              {!rule && ruleArgsFieldsKeys ? (
                ruleArgsFieldsKeys.map((key, index) => {
                  if (!ruleArgsFields || !ruleArgsSchema) return null;
                  const fields = ruleArgsFields.get(key) as Record<
                    string,
                    string
                  >;
                  const properties = ruleArgsSchema["properties"] as Record<
                    string,
                    Record<string, string>
                  >;
                  const schema = properties[key];
                  if (!schema) return null;
                  // .get(key) as Record<string,string>
                  if (schema["type"] == "boolean") {
                    return (
                      <FormControlLabel
                        key={"arg-" + key + index}
                        control={
                          <Checkbox
                            key={"argcheck-" + key + index}
                            disabled={schema["const"] != undefined}
                            indeterminate={detailedRuleArgs[key] === ""}
                            checked={detailedRuleArgs[key] as boolean}
                            onChange={(
                              e: React.ChangeEvent<HTMLInputElement>,
                            ) =>
                              onChangeDetailedRuleArgs(key, e.target.checked)
                            }
                          />
                        }
                        label={fields["field"]}
                      />
                    );
                  }

                  return (
                    <TextField
                      key={"arginput-" + key + index}
                      disabled={schema["const"] != undefined}
                      className="w-full"
                      label={fields["field"]}
                      value={detailedRuleArgs[key]}
                      variant="standard"
                      type={schema["type"]}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        onChangeDetailedRuleArgs(key, e.target.value)
                      }
                      error={ruleArgsErrors.get(key) != undefined}
                      helperText={ruleArgsErrors.get(key)}
                    />
                  );
                })
              ) : (
                <></>
              )}

              <TextField
                className="w-full"
                label="Args"
                value={ruleArgs || ""}
                variant="standard"
                disabled={rule != undefined || ruleArgsFields != undefined}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setRuleArgs(e.target.value)
                }
              />

              <FormControl variant="standard">
                <InputLabel htmlFor="incard">
                  Incard (Hash){" "}
                  <UploadIcon
                    onClick={uploadIncard}
                    className="cursor-pointer"
                  />
                </InputLabel>
                <Input
                  id="incard"
                  disabled
                  value={ruleInCardHash || ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setRuleIncardHash(e.target.value)
                  }
                />
              </FormControl>
              <input
                disabled={rule != undefined}
                type="file"
                ref={incardFileRef}
                onChange={(e) => handleOnChangeIncardUpload(e)}
                style={{ display: "none" }}
              />

              <Autocomplete
                disabled={rule != undefined}
                multiple
                value={ruleTags || []}
                defaultValue={[]}
                id="tags-standard"
                options={[]}
                getOptionLabel={(option: string) => option}
                isOptionEqualToValue={(option: string, value: string) =>
                  option === value
                }
                onChange={(event: unknown, newValue: string[] | null) =>
                  setRuleTags(newValue || [])
                }
                filterOptions={(options, params) => {
                  const filtered = filter(options, params);

                  const { inputValue } = params;
                  // Suggest the creation of a new value
                  const isExisting = options.some(
                    (option) => inputValue === option,
                  );
                  if (inputValue !== "" && !isExisting) {
                    filtered.push(`"${inputValue}"`);
                  }

                  return filtered;
                }}
                renderInput={(params) => (
                  <TextField {...params} variant="standard" label="Tags" />
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
              {/*<FormControlLabel
                            control={
                                <Switch checked={ruleAllowIncard} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRuleAllowIncard(!ruleAllowIncard)}/>
                            } label="Allow tapes to use incards" />

                        <FormControlLabel
                            control={
                                <Switch checked={ruleAllowTapes} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRuleAllowTapes(!ruleAllowTapes)}/>
                            } label="Allow tapes to use tapes" />
                        <FormControlLabel
                            control={
                                <Switch checked={ruleSaveOutcard} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRuleSaveOutcard(!ruleSaveOutcard)}/>
                            } label="Save outcards" />
                        <FormControlLabel  disabled={true}
                            control={
                                <Switch checked={ruleSaveTapes} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRuleSaveTapes(!ruleSaveTapes)}/>
                            } label="Save tapes" />

                        <Autocomplete

                            multiple
                            value={ruleTapes||[]}
                            defaultValue={[]}
                            id="tapes-standard"
                            options={ruleTapes||[]}
                            getOptionLabel={(option) => option}
                            isOptionEqualToValue={(option, value) => option === value}
                            onChange={(event: any, newValue: string[] | null) => setRuleTapes(newValue||undefined)}
                            filterOptions={(options, params) => {
                                const filtered = filter(options, params);

                                const { inputValue } = params;
                                // Suggest the creation of a new value
                                const isExisting = options.some((option) => inputValue === option);
                                if (inputValue !== '' && !isExisting) {
                                    filtered.push(inputValue);
                                }

                                return filtered;
                            }}
                            renderInput={(params) => (
                            <TextField
                                {...params}
                                variant="standard"
                                label="Tapes"
                            />
                            )}
                            renderTags={(tagValue, getTagProps) => {
                                return tagValue.map((option, index) => (
                                <Chip {...getTagProps({ index })} key={option} label={option} />
                                ))
                            }}
                        />

                        <FormControlLabel
                            control={
                                <Switch checked={showCartridgeInfo} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setShowCartridgeInfo(!showCartridgeInfo)}/>
                            } label="Show Cartridge Info" />
                        <TextField className="w-full" label="Cartridge Info Name" disabled value={infoCartridge?.name || ""} variant="standard" hidden={!showCartridgeInfo}
                                InputLabelProps={{ shrink: true }} />
                        <TextField className="w-full" label="Cartridge Info Summary" disabled value={infoCartridge?.summary || ""} variant="standard" hidden={!showCartridgeInfo}
                                InputLabelProps={{ shrink: true }} />
                        <TextField className="w-full" label="Cartridge Info Description" disabled value={infoCartridge?.description || ""} variant="standard" hidden={!showCartridgeInfo}
                                InputLabelProps={{ shrink: true }} />
                        <TextField className="w-full" label="Cartridge Info Authors" disabled value={`${infoCartridge?.authors?.map((a,i) => a.name + (a.link ? `: ${a.link}` : '')).join(", ")}` || ""} variant="standard" hidden={!showCartridgeInfo}
                                InputLabelProps={{ shrink: true }} />
                        <TextField className="w-full" label="Cartridge Info Status" disabled value={infoCartridge?.status || ""} variant="standard" hidden={!showCartridgeInfo}
                                InputLabelProps={{ shrink: true }} />
                        <TextField className="w-full" label="Cartridge Info Url" disabled value={infoCartridge?.links?.join(", ") || ""} variant="standard" hidden={!showCartridgeInfo}
                                InputLabelProps={{ shrink: true }} />
                        <TextField className="w-full" label="Cartridge Info Tags" disabled value={`${infoCartridge?.tags}` || ""} variant="standard" hidden={!showCartridgeInfo}
                                InputLabelProps={{ shrink: true }} />
                        <TextField className="w-full" label="Cartridge Info Version" disabled value={infoCartridge?.version || ""} variant="standard" hidden={!showCartridgeInfo}
                                InputLabelProps={{ shrink: true }} /> */}

              {!rule ? (
                <div className="grid grid-cols-1 gap-1 justify-items-center">
                  {hasScore != undefined && hasScore == false ? (
                    <span title="Play mode does not generate a score and it won't have a score-based leaderboard">
                      <WarningIcon className="text-yellow-400" />
                      Play mode has no scoring
                      <WarningIcon className="text-yellow-400" />
                    </span>
                  ) : (
                    <></>
                  )}
                  <button
                    disabled={
                      !ruleName ||
                      !ready ||
                      !user ||
                      !tested ||
                      !valid ||
                      argsErrors
                    }
                    title={sendRuleTooltip()}
                    className="btn mt-2 text-xs shadow"
                    onClick={sendRule}
                  >
                    Create Play Mode
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-1 justify-items-center">
                  <button
                    disabled={
                      !rule || !ready || !user || rule.name == "default"
                    }
                    className="btn mt-2 text-[10px] shadow"
                    onClick={sendRuleDeactivation}
                  >
                    Deactivate Play Mode
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {errorFeedback ? <ErrorModal error={errorFeedback} /> : <></>}
    </ThemeProvider>
  );
}

export default RulesEditor;
