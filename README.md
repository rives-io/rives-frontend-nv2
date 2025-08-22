# RIVES Frontend node v2

```
Cartesi Rollups Node version: 2.0.x
```

The RiscV Entertainment System (RIVES) allows users to play riscv-binaries of games on a RISC-v Cartesi Machine on the browser, submit the game moves onchain so the session will be replayed a Cartesi Rollups App to generate a provable score. Naturally you can upload you own games.

DISCLAIMERS

For now, this is not a final product and should not be used as one.

## Building

Run to install dependencies:

```shell
pnpm i
```

Configure with the .env file and run:

```shell
pnpm build
```

## Running

After building run:

```shell
pnpm start --port 3000
```

Alternatively you can run dev with:

```shell
pnpm dev --port 3000
```
