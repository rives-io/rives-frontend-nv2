"use client";
export const dynamic = "force-dynamic";

import { Parser } from "expr-eval";
import React, { useState, useEffect, useRef } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { isHex, toHex, toBytes, keccak256 } from "viem";

import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import TextField from "@mui/material/TextField";
import FormControl from "@mui/material/FormControl";
import Input from "@mui/material/Input";
import InputLabel from "@mui/material/InputLabel";
import Autocomplete, { createFilterOptions } from "@mui/material/Autocomplete";
import Chip from "@mui/material/Chip";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import StopIcon from "@mui/icons-material/Stop";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import PauseIcon from "@mui/icons-material/Pause";
import ReplayIcon from "@mui/icons-material/Replay";
import UploadIcon from "@mui/icons-material/Upload";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";
import { sha256 } from "js-sha256";
import { envClient } from "../utils/clientEnv";
import {
  CartridgesOutput,
  cartridgeInfo,
  cartridges,
  createRule,
  insertCartridge,
  rules,
  ruleTags as getRuleTags,
  RuleTagsOutput,
  transferCartridge,
  formatInCard,
  deactivateRule,
} from "../backend-libs/core/lib";
import Rivemu, { RivemuRef } from "./Rivemu";
import {
  CartridgeInfo,
  RuleInfo,
  InfoCartridge,
  RuleData,
  InsertCartridgePayload,
  TransferCartridgePayload,
  CartridgesPayload,
  FormatInCardPayload,
  DeactivateRulePayload,
} from "../backend-libs/core/ifaces";

import ErrorModal, { ERROR_FEEDBACK } from "./ErrorModal";
import {
  buildUrl,
  cartridgeIdFromBytes,
  formatCartridgeIdToBytes,
  formatRuleIdToBytes,
  getWalletClient,
} from "../utils/util";

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

const getCartridgeInfo = async (id: string): Promise<CartridgeInfo> => {
  const out: CartridgeInfo = await cartridgeInfo(
    { id },
    {
      decode: true,
      decodeModel: "CartridgeInfo",
      cartesiNodeUrl: envClient.CARTESI_NODE_URL,
      applicationAddress: envClient.DAPP_ADDR as `0x${string}`,
    },
  );
  return out;
};

const getCartridges = async (ids?: string[]): Promise<CartridgeInfo[]> => {
  const inputData: CartridgesPayload = {};
  if (ids && ids.length > 0) {
    inputData.ids = ids;
    inputData.enable_non_primary = true;
  }
  const out: CartridgesOutput = await cartridges(inputData, {
    decode: true,
    decodeModel: "CartridgesOutput",
    cartesiNodeUrl: envClient.CARTESI_NODE_URL,
    applicationAddress: envClient.DAPP_ADDR as `0x${string}`,
  });
  const data: CartridgeInfo[] = out.data;

  return data;
};

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

const getRules = async (cartridge_id: string): Promise<RuleInfo[]> => {
  if (!cartridge_id) return [];
  const data = await rules(
    {
      cartridge_id,
      full: true,
    },
    {
      decode: true,
      decodeModel: "RulesOutput",
      cartesiNodeUrl: envClient.CARTESI_NODE_URL,
      applicationAddress: envClient.DAPP_ADDR as `0x${string}`,
    },
  );

  return data.data as RuleInfo[];
};

function RivemuEditor() {
  // rivemu state
  const [cartridgeData, setCartridgeData] = useState<Uint8Array>();
  const [rule, setRule] = useState<RuleInfo | null>();
  const [tape, setTape] = useState<Uint8Array>();

  // Control
  const ruleListRef = useRef<readonly RuleInfo[]>([]);
  const cartridgeListRef = useRef<readonly CartridgeInfo[]>([]); //([{name:"test",id:"test",info:{} as unknown,user_address:"",created_at:0,authors:[]}]);
  const [selectedCartridge, setSelectedCartridge] =
    useState<CartridgeInfo | null>();
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

  const [cartridgesComboOpen, setCartridgesComboOpen] = useState(false);
  const [rulesComboOpen, setRulesComboOpen] = useState(false);
  const [storedCartridge, setStoredCartridge] = useState(false);
  const [ruleInCard, setRuleIncard] = useState<Uint8Array>();
  const [finalInCard, setFinalIncard] = useState<Uint8Array>();
  const [ruleInCardHash, setRuleIncardHash] = useState<string>();
  const [ruleArgs, setRuleArgs] = useState<string>();
  const [ruleScoreFunction, setRuleScoreFunction] = useState<string>();
  const [ruleName, setRuleName] = useState<string>();
  const [ruleDescription, setRuleDescription] = useState<string>();
  const [ruleStart, setRuleStart] = useState<Dayjs>();
  const [ruleEnd, setRuleEnd] = useState<Dayjs>();
  const [ruleCartridgeTags, setRuleCartridgeTags] = useState<string[]>();
  const [ruleTags, setRuleTags] = useState<string[]>();
  const cartridgeFileRef = useRef<HTMLInputElement | null>(null);
  const incardFileRef = useRef<HTMLInputElement | null>(null);
  const [enableRuleEditing, setEnableRuleEditing] = useState(false);
  const [showCartridgeInfo, setShowCartridgeInfo] = useState(false);
  const [infoCartridge, setInfoCartridge] = useState<InfoCartridge>();
  const [restarting, setRestarting] = useState(false);
  const [ruleTapes, setRuleTapes] = useState<string[]>();
  const [ruleAllowTapes, setRuleAllowTapes] = useState(false);
  const [ruleAllowIncard, setRuleAllowIncard] = useState(false);
  const [ruleSaveOutcard, setRuleSaveOutcard] = useState(false);
  const [ruleSaveTapes, setRuleSaveTapes] = useState(false);
  const [manageCartridge, setManageCartridge] = useState(false);
  const [newUserAddress, setNewUserAddress] = useState<string>();
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
    if (cartridgesComboOpen && cartridgeListRef.current.length == 0) {
      getCartridges().then((data) => {
        cartridgeListRef.current = data;
      });
    }
  }, [cartridgesComboOpen]);

  useEffect(() => {
    if (
      storedCartridge &&
      selectedCartridge &&
      rulesComboOpen &&
      ruleListRef.current.length == 0
    ) {
      getRules(selectedCartridge.id).then((data) => {
        ruleListRef.current = data;
      });
    }
  }, [rulesComboOpen, selectedCartridge, storedCartridge]);

  useEffect(() => {
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
    getRuleTags(
      {
        cartridge_id: rule?.cartridge_id,
      },
      {
        decode: true,
        decodeModel: "RuleTagsOutput",
        cartesiNodeUrl: envClient.CARTESI_NODE_URL,
        applicationAddress: envClient.DAPP_ADDR as `0x${string}`,
      },
    ).then((out: RuleTagsOutput) => {
      setRuleCartridgeTags(out.tags);
      setRuleTags(rule?.tags);
    });
  }, [rule]);

  useEffect(() => {
    if (playing.isPlaying && !playing.isReplay && tape && tape.length == 0) {
      rivemuRef.current?.start();
    }
  }, [playing.isPlaying, playing.isReplay, tape]);

  useEffect(() => {
    const inputData: FormatInCardPayload = {};
    if (selectedCartridge && storedCartridge)
      inputData.cartridge_id = selectedCartridge.id;
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
  }, [ruleInCard, selectedCartridge, storedCartridge, ruleTapes]);

  const selectCartridge = (selCart: CartridgeInfo | null) => {
    ruleListRef.current = [];
    setRule(undefined);
    setTape(new Uint8Array([]));
    setOutcard(undefined);
    if (selCart)
      getCartridgeInfo(selCart.id).then((newCartridge) => {
        setSelectedCartridge(newCartridge);
        if (playing.isPlaying) rivemuRef.current?.stop();
        if (newCartridge && newCartridge.last_version) {
          setStoredCartridge(false);
          getCartridgeData(newCartridge.last_version).then((data) => {
            setCartridgeData(data);
            setStoredCartridge(true);
          });
          // if (newCartridge.versions) {
          //     getCartridges(newCartridge.versions).then(data => setCartridgeVersions(data));
          // }
        } else {
          setCartridgeData(undefined);
        }
      });
    else setSelectedCartridge(null);
  };

  const selectRule = (newRule: RuleInfo | null) => {
    setRule(newRule);
    if (playing.isPlaying) replay();
  };

  async function uploadCartridge() {
    // replay({car});
    cartridgeFileRef.current?.click();
  }

  function handleOnChangeCartridgeUpload(
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    if (e?.target?.files) changeCartridgeUpload(e.target.files[0]);
  }
  function changeCartridgeUpload(f: Blob) {
    const reader = new FileReader();
    reader.onload = async (readerEvent) => {
      rivemuRef.current?.stop();
      ruleListRef.current = [];
      setRule(undefined);
      setTape(new Uint8Array([]));
      setOutcard(undefined);
      setCartridgeData(undefined);
      setSelectedCartridge(undefined);
      setInfoCartridge(undefined);
      const data = readerEvent.target?.result;
      if (data) {
        setStoredCartridge(false);
        setCartridgeData(new Uint8Array(data as ArrayBuffer));
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
          setRuleIncard(incard);
          setRuleIncardHash(sha256(incard));
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
      if (ruleScoreFunction) {
        try {
          const parser = new Parser();
          const scoreFunctionEvaluator = parser.parse(ruleScoreFunction);
          setCurrScore(scoreFunctionEvaluator.evaluate(outcard_json));
        } catch (e) {
          rivemuRef.current?.stop();
          console.log(e);
          setErrorFeedback({
            message: "Error parsing score",
            severity: "error",
            dismissible: true,
            dissmissFunction: () => setErrorFeedback(undefined),
          });
        }
      } else {
        setCurrScore(outcard_json.score);
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
    setInfoCartridge(info);
    setCurrScore(undefined);
    setOutcard(undefined);
    if (rule?.score_function) {
      setCurrScore(0);
    }
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

    if (storedCartridge) {
      setErrorFeedback({
        message: "Cartridge is already stored",
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

    const wallet = wallets.find(
      (wallet) => wallet.address === user!.wallet!.address,
    );
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

    const inputData: InsertCartridgePayload = {
      data: toHex(cartridgeData),
    };
    try {
      const walletClient = await getWalletClient(wallet);

      await insertCartridge(inputData, {
        client: walletClient,
        applicationAddress: envClient.DAPP_ADDR as `0x${string}`,
      });
      setStoredCartridge(true);
      setInfoCartridge(undefined);
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
      ruleListRef.current = [];
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

  // async function sendRemoveCartridge() {

  //     if (!storedCartridge) {
  //         setErrorFeedback({message:"Cartridge not stored", severity: "warning", dismissible: true, dissmissFunction: () => setErrorFeedback(undefined)});
  //         return;
  //     }

  //     if (!selectedCartridge) {
  //         setErrorFeedback({message:"No selected cartridge data", severity: "warning", dismissible: true, dissmissFunction: () => setErrorFeedback(undefined)});
  //         return;
  //     }

  //     if (!versionSelected) {
  //         setErrorFeedback({message:"No version selected", severity: "warning", dismissible: true, dissmissFunction: () => setErrorFeedback(undefined)});
  //         return;
  //     }

  //     const wallet = wallets.find((wallet) => wallet.address === user!.wallet!.address)
  //     if (!wallet) {
  //         setErrorFeedback({message:"Please connect your wallet", severity: "warning", dismissible: true, dissmissFunction: () => setErrorFeedback(undefined)});
  //         return;
  //     }

  //     if (wallet.address.toLowerCase() != envClient.OPERATOR_ADDR.toLowerCase()) {
  //         setErrorFeedback({message:"Only operator can remove cartridges", severity: "warning", dismissible: true, dissmissFunction: () => setErrorFeedback(undefined)});
  //         return;
  //     }

  //     const inputData: RemoveCartridgePayload = {
  //         id: formatCartridgeIdToBytes(versionSelected.id)
  //     }
  //     try {
  //         const walletClient = await getWalletClient(wallet);
  //
  //         await removeCartridge(inputData, {
  //           client: walletClient,
  //           applicationAddress: envClient.DAPP_ADDR as `0x${string}`,
  //         });
  //         selectCartridge(null);
  //         setVersionSelected(null);
  //     } catch (error) {
  //         console.log(error)
  //         let errorMsg = (error as Error).message;
  //         if (errorMsg.toLowerCase().indexOf("user rejected") > -1) errorMsg = "User rejected tx";
  //         setErrorFeedback({message:errorMsg, severity: "error", dismissible: true, dissmissFunction: () => setErrorFeedback(undefined)});
  //         return;
  //     }
  // }

  async function sendTransferCartridge() {
    if (!storedCartridge) {
      setErrorFeedback({
        message: "Cartridge not stored",
        severity: "warning",
        dismissible: true,
        dissmissFunction: () => setErrorFeedback(undefined),
      });
      return;
    }

    if (!selectedCartridge) {
      setErrorFeedback({
        message: "No selected cartridge data",
        severity: "warning",
        dismissible: true,
        dissmissFunction: () => setErrorFeedback(undefined),
      });
      return;
    }

    if (!newUserAddress) {
      setErrorFeedback({
        message: "No new user address",
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
        message: "Please connect your wallet",
        severity: "warning",
        dismissible: true,
        dissmissFunction: () => setErrorFeedback(undefined),
      });
      return;
    }

    if (
      wallet.address.toLowerCase() !=
      selectedCartridge.user_address.toLowerCase()
    ) {
      setErrorFeedback({
        message: "Not owner of the cartridge",
        severity: "warning",
        dismissible: true,
        dissmissFunction: () => setErrorFeedback(undefined),
      });
      return;
    }

    const inputData: TransferCartridgePayload = {
      id: formatCartridgeIdToBytes(selectedCartridge.id),
      new_user_address: newUserAddress,
    };
    try {
      const walletClient = await getWalletClient(wallet);

      await transferCartridge(inputData, {
        client: walletClient,
        applicationAddress: envClient.DAPP_ADDR as `0x${string}`,
      });
      selectCartridge(null);
      setNewUserAddress(undefined);
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
      <div className="h-[calc(100vh-13rem)] overflow-auto absolute top-16 w-full">
        <div className="flex items-start flex-wrap justify-center gap-2 pt-4">
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
            <TextField
              className="w-full"
              label="Outcard"
              disabled
              value={outcard || ""}
              variant="standard"
              hidden={!enableRuleEditing}
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
          </div>
          <div className="grid grid-cols-1 gap-4 place-items-left text-white w-1/4">
            <Autocomplete
              value={selectedCartridge || null}
              className="w-full"
              options={cartridgeListRef.current}
              onChange={(_event: unknown, newValue: CartridgeInfo | null) =>
                selectCartridge(newValue)
              }
              open={cartridgesComboOpen}
              onOpen={() => setCartridgesComboOpen(true)}
              onClose={() => setCartridgesComboOpen(false)}
              isOptionEqualToValue={(a, b) =>
                a.id.toLowerCase() == b.id.toLowerCase()
              }
              getOptionLabel={(option: CartridgeInfo) => option?.name}
              renderInput={(params) => (
                <TextField {...params} label="Cartridge" variant="standard" />
              )}
            />

            <Autocomplete
              value={rule || null}
              className="w-full"
              options={ruleListRef.current}
              open={rulesComboOpen}
              onChange={(_event: unknown, newValue: RuleInfo | null) =>
                selectRule(newValue)
              }
              onOpen={() => setRulesComboOpen(true)}
              onClose={() => setRulesComboOpen(false)}
              isOptionEqualToValue={(a, b) =>
                a.id.toLowerCase() == b.id.toLowerCase()
              }
              getOptionLabel={(option: RuleInfo) => option.name}
              renderInput={(params) => (
                <TextField label="Rule" {...params} variant="standard" />
              )}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={enableRuleEditing}
                  onChange={(_e: React.ChangeEvent<HTMLInputElement>) =>
                    setEnableRuleEditing(!enableRuleEditing)
                  }
                />
              }
              label="Rule Editing"
            />
            <TextField
              className="w-full"
              label="Rule Name"
              value={ruleName || ""}
              variant="standard"
              hidden={!enableRuleEditing}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setRuleName(e.target.value)
              }
            />
            <TextField
              className="w-full"
              label="Rule Description"
              value={ruleDescription || ""}
              multiline
              variant="standard"
              hidden={!enableRuleEditing}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setRuleDescription(e.target.value)
              }
            />
            <TextField
              className="w-full"
              label="Rule Args"
              value={ruleArgs || ""}
              variant="standard"
              hidden={!enableRuleEditing}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setRuleArgs(e.target.value)
              }
            />
            <TextField
              className="w-full"
              label="Rule Score Function"
              value={ruleScoreFunction || ""}
              variant="standard"
              hidden={!enableRuleEditing}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setRuleScoreFunction(e.target.value)
              }
            />

            <FormControl variant="standard" hidden={!enableRuleEditing}>
              <InputLabel htmlFor="incard">
                Rule Incard (Hash){" "}
                <UploadIcon onClick={uploadIncard} className="cursor-pointer" />
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
              type="file"
              ref={incardFileRef}
              onChange={(e) => handleOnChangeIncardUpload(e)}
              style={{ display: "none" }}
            />

            <div hidden={!enableRuleEditing}>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DateTimePicker
                  label="Start (local)"
                  value={ruleStart || null}
                  onChange={(newValue: Dayjs | null) =>
                    setRuleStart(newValue || undefined)
                  }
                />
              </LocalizationProvider>
            </div>

            <div hidden={!enableRuleEditing}>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DateTimePicker
                  label="End (local)"
                  value={ruleEnd || null}
                  onChange={(newValue: Dayjs | null) =>
                    setRuleEnd(newValue || undefined)
                  }
                  defaultValue={null}
                />
              </LocalizationProvider>
            </div>

            <Autocomplete
              hidden={!enableRuleEditing}
              multiple
              value={ruleTags || []}
              defaultValue={[]}
              id="tags-standard"
              options={ruleCartridgeTags || []}
              getOptionLabel={(option) => option}
              isOptionEqualToValue={(option, value) => option === value}
              onChange={(_event: unknown, newValue: string[] | null) =>
                setRuleTags(newValue || undefined)
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
            <FormControlLabel
              hidden={!enableRuleEditing}
              control={
                <Switch
                  checked={ruleAllowIncard}
                  onChange={(_e: React.ChangeEvent<HTMLInputElement>) =>
                    setRuleAllowIncard(!ruleAllowIncard)
                  }
                />
              }
              label="Allow tapes to use incards"
            />

            <FormControlLabel
              hidden={!enableRuleEditing}
              control={
                <Switch
                  checked={ruleAllowTapes}
                  onChange={(_e: React.ChangeEvent<HTMLInputElement>) =>
                    setRuleAllowTapes(!ruleAllowTapes)
                  }
                />
              }
              label="Allow tapes to use tapes"
            />
            <FormControlLabel
              hidden={!enableRuleEditing}
              control={
                <Switch
                  checked={ruleSaveOutcard}
                  onChange={(_e: React.ChangeEvent<HTMLInputElement>) =>
                    setRuleSaveOutcard(!ruleSaveOutcard)
                  }
                />
              }
              label="Save outcards"
            />
            <FormControlLabel
              hidden={!enableRuleEditing}
              disabled={true}
              control={
                <Switch
                  checked={ruleSaveTapes}
                  onChange={(_e: React.ChangeEvent<HTMLInputElement>) =>
                    setRuleSaveTapes(!ruleSaveTapes)
                  }
                />
              }
              label="Save tapes"
            />

            <Autocomplete
              hidden={!enableRuleEditing}
              multiple
              value={ruleTapes || []}
              defaultValue={[]}
              id="tapes-standard"
              options={ruleTapes || []}
              getOptionLabel={(option) => option}
              isOptionEqualToValue={(option, value) => option === value}
              onChange={(_event: unknown, newValue: string[] | null) =>
                setRuleTapes(newValue || undefined)
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

            <FormControlLabel
              control={
                <Switch
                  checked={showCartridgeInfo}
                  onChange={(_e: React.ChangeEvent<HTMLInputElement>) =>
                    setShowCartridgeInfo(!showCartridgeInfo)
                  }
                />
              }
              label="Show Cartridge Info"
            />
            <TextField
              className="w-full"
              label="Cartridge Info Name"
              disabled
              value={infoCartridge?.name || ""}
              variant="standard"
              hidden={!showCartridgeInfo}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              className="w-full"
              label="Cartridge Info Summary"
              disabled
              value={infoCartridge?.summary || ""}
              variant="standard"
              hidden={!showCartridgeInfo}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              className="w-full"
              label="Cartridge Info Description"
              disabled
              value={infoCartridge?.description || ""}
              variant="standard"
              hidden={!showCartridgeInfo}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              className="w-full"
              label="Cartridge Info Authors"
              disabled
              value={
                `${infoCartridge?.authors?.map((a, _i) => a.name + (a.link ? `: ${a.link}` : "")).join(", ")}` ||
                ""
              }
              variant="standard"
              hidden={!showCartridgeInfo}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              className="w-full"
              label="Cartridge Info Status"
              disabled
              value={infoCartridge?.status || ""}
              variant="standard"
              hidden={!showCartridgeInfo}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              className="w-full"
              label="Cartridge Info Url"
              disabled
              value={infoCartridge?.links?.join(", ") || ""}
              variant="standard"
              hidden={!showCartridgeInfo}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              className="w-full"
              label="Cartridge Info Tags"
              disabled
              value={`${infoCartridge?.tags}` || ""}
              variant="standard"
              hidden={!showCartridgeInfo}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              className="w-full"
              label="Cartridge Info Version"
              disabled
              value={infoCartridge?.version || ""}
              variant="standard"
              hidden={!showCartridgeInfo}
              InputLabelProps={{ shrink: true }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={manageCartridge}
                  onChange={(_e: React.ChangeEvent<HTMLInputElement>) =>
                    setManageCartridge(!manageCartridge)
                  }
                />
              }
              label="Manage Cartridge"
            />
            <TextField
              className="w-full"
              label="Transfer to"
              value={newUserAddress || ""}
              variant="standard"
              hidden={!manageCartridge}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setNewUserAddress(e.target.value)
              }
            />

            {/* Remove Cartridge only for  */}
            {/* <Autocomplete
                        hidden={!manageCartridge}
                        value={versionSelected || null}
                        className="w-full"
                        options={cartridgeVersions}
                        onChange={(_event: unknown, newValue: CartridgeInfo | null) => setVersionSelected(newValue)}
                        open={versionsComboOpen}
                        onOpen={() => setVersionsComboOpen(true)}
                        onClose={() => setVersionsComboOpen(false)}
                        getOptionLabel={(option: CartridgeInfo) =>
                            (option?.updated_at ? `${option?.id} - ${new Date(option?.updated_at * 1000).toLocaleDateString()}` : option?.id) +
                            (option?.primary ? " primary" : "") +
                            (selectedCartridge?.last_version == option?.id ? " latest" : "")
                        }
                        renderInput={(params) => (
                            <TextField {...params} label="Version" variant="standard"/>
                        )}
                    /> */}

            <div className="grid grid-cols-3 gap-1 justify-items-center">
              <button
                disabled={
                  !cartridgeData ||
                  storedCartridge ||
                  !infoCartridge?.name ||
                  !ready ||
                  !user
                }
                className="btn mt-2 text-[10px] shadow"
                onClick={sendCartridge}
              >
                Insert Cartridge
              </button>

              {/* <button hidden={!manageCartridge} disabled={!cartridgeData || !versionSelected || !storedCartridge || !ready || !user} className="btn mt-2 text-[10px] shadow" onClick={sendRemoveCartridge}>
                        Remove Cartridge
                    </button> */}

              <button
                hidden={!manageCartridge}
                disabled={
                  !cartridgeData ||
                  !newUserAddress ||
                  !storedCartridge ||
                  !ready ||
                  !user
                }
                className="btn mt-2 text-[10px] shadow"
                onClick={sendTransferCartridge}
              >
                Transfer Cartridge
              </button>

              <button
                disabled={!ruleName || !ready || !user}
                className="btn mt-2 text-[10px] shadow"
                onClick={sendRule}
                hidden={!enableRuleEditing}
              >
                Create Rule
              </button>

              <button
                disabled={!rule || !ready || !user}
                className="btn mt-2 text-[10px] shadow"
                onClick={sendRuleDeactivation}
                hidden={!enableRuleEditing}
              >
                Deactivate Rule
              </button>
            </div>
          </div>
        </div>

        {errorFeedback ? <ErrorModal error={errorFeedback} /> : <></>}
      </div>
    </ThemeProvider>
  );
}

export default RivemuEditor;
