"use client";
export const dynamic = "force-dynamic";

import Script from "next/script";
import { useState, useImperativeHandle, forwardRef } from "react";

export type RivemuRef = {
  stop: () => void;
  fullScreen: () => void;
  start: () => void;
  setSpeed: (speed: number) => void;
};

interface RivemuProps {
  cartridge_data?: Uint8Array;
  args?: string;
  in_card?: Uint8Array;
  entropy?: string;
  tape?: Uint8Array;
  smallSize?: boolean;
  rivemu_on_frame(
    outcard: ArrayBuffer,
    frame: number,
    cycles: number,
    fps: number,
    cpu_cost: number,
    cpu_speed: number,
    cpu_usage: number,
    cpu_quota: number,
  ): void;
  rivemu_on_begin(
    width: number,
    height: number,
    target_fps: number,
    total_frames: number,
    info_data: Uint8Array,
  ): void;
  rivemu_on_finish(
    rivlog: ArrayBuffer,
    outcard: ArrayBuffer,
    outhash: string,
  ): void;
}

const Rivemu = forwardRef<RivemuRef, RivemuProps>((props, ref) => {
  const {
    cartridge_data,
    args,
    in_card,
    entropy,
    tape,
    rivemu_on_frame,
    rivemu_on_begin,
    rivemu_on_finish,
  } = props;
  // rivemu state
  const [runtimeInitialized, setRuntimeInitialized] = useState(false);

  useImperativeHandle(ref, () => ({
    start: rivemuStart,
    stop: rivemuStop,
    fullScreen: rivemuFullscreen,
    setSpeed: rivemuSetSpeed,
  }));

  // BEGIN: rivemu
  async function rivemuStart() {
    if (!cartridge_data || cartridge_data.length == 0) return;
    console.log("rivemuStart");

    // // @ts-expect-error
    // if (Module.quited) {
    //     // restart wasm when back to page
    //     // @ts-expect-error
    //     Module._main();
    // }
    await rivemuInitialize();
    await rivemuHalt();

    // @ts-expect-error
    const cartridgeBuf = Module._malloc(cartridge_data.length);
    // @ts-expect-error
    Module.HEAPU8.set(cartridge_data, cartridgeBuf);
    const inCard = in_card || new Uint8Array([]);
    // @ts-expect-error
    const incardBuf = Module._malloc(inCard.length);
    // @ts-expect-error
    Module.HEAPU8.set(inCard, incardBuf);
    const params = args || "";
    if (tape && tape.length > 0) {
      // @ts-expect-error
      const rivlogBuf = Module._malloc(tape.length);
      // @ts-expect-error
      Module.HEAPU8.set(tape, rivlogBuf);
      // @ts-expect-error
      Module.ccall(
        "rivemu_start_replay",
        null,
        [
          "number",
          "number",
          "number",
          "number",
          "string",
          "string",
          "number",
          "number",
        ],
        [
          cartridgeBuf,
          cartridge_data.length,
          incardBuf,
          inCard.length,
          entropy,
          params,
          rivlogBuf,
          tape.length,
        ],
      );
      // @ts-expect-error
      Module._free(rivlogBuf);
    } else {
      console.log("rivemuStart");

      // @ts-expect-error
      Module.ccall(
        "rivemu_start_record",
        null,
        ["number", "number", "number", "number", "string", "string"],
        [
          cartridgeBuf,
          cartridge_data.length,
          incardBuf,
          inCard.length,
          entropy,
          params,
        ],
      );
    }
    // @ts-expect-error
    Module._free(cartridgeBuf);
    // @ts-expect-error
    Module._free(incardBuf);
  }

  async function rivemuInitialize() {
    if (!runtimeInitialized) {
      // @ts-expect-error
      if (typeof Module == "undefined" || !Module.runtimeInitialized)
        await waitEvent("rivemu_on_runtime_initialized");
      setRuntimeInitialized(true);
    }
  }

  async function rivemuHalt() {
    await rivemuInitialize();
    // @ts-expect-error
    if (Module.ccall("rivemu_stop")) {
      await waitEvent("rivemu_on_shutdown");
    }
  }

  function waitEvent(name: string) {
    return new Promise((resolve) => {
      const listener = (e: unknown) => {
        window.removeEventListener(name, listener);
        resolve(e);
      };
      window.addEventListener(name, listener);
    });
  }

  async function rivemuStop() {
    console.log("rivemuStop");
    await rivemuHalt();
  }

  function rivemuFullscreen() {
    const canvas: unknown = document.getElementById("canvas");
    if (canvas) {
      // @ts-expect-error
      canvas.requestFullscreen();
    }
  }

  function rivemuSetSpeed(speed: number) {
    // @ts-expect-error
    Module.ccall("rivemu_set_speed", null, ["number"], [speed]);
  }

  if (typeof window !== "undefined") {
    // @ts-expect-error
    window.rivemu_on_frame = rivemu_on_frame;

    // @ts-expect-error
    window.rivemu_on_begin = rivemu_on_begin;

    // @ts-expect-error
    window.rivemu_on_finish = rivemu_on_finish;
  }
  // END: rivemu

  return (
    <>
      {!cartridge_data ? (
        <div className="flex items-center justify-center">
          <div className="text-white">No Cartridge...</div>
        </div>
      ) : (
        <canvas
          className={`border border-[#131415] bg-black ${props.smallSize ? "gameplay-screen-sm" : "gameplay-screen"}`}
          id="canvas"
          onContextMenu={(e) => e.preventDefault()}
          tabIndex={-1}
          style={{
            imageRendering: "pixelated",
            objectFit: "contain",
          }}
        />
      )}
      <Script src="/initializeRivemu.js?" strategy="lazyOnload" />
      <Script src="/rivemu.js?" strategy="lazyOnload" />
    </>
  );
});

Rivemu.displayName = "Rivemu";

export default Rivemu;
