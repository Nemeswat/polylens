import { OptimismIcon, BaseIcon } from "./icons";
import { type Chain } from "~/app/utils/types/chain";
import { env } from "@/env";

export type CHAIN = 'optimism' | 'base';

const opDispatcher = env.OP_DISPATCHER!;
const baseDispatcher = env.BASE_DISPATCHER!;
const opDispatcherSimClient = env.OP_DISPATCHER_SIM!;
const baseDispatcherSimClient = env.BASE_DISPATCHER_SIM!;

export const CHAIN_CONFIGS: {
  [key in CHAIN]: Chain;
} = {
  optimism: {
    id: 11155420,
    display: "Optimism",
    rpc: env.OPTIMISM_RPC,
    proofDispatcher: opDispatcher,
    simDispatcher: opDispatcherSimClient,
    blockTime: 2,
    icon: OptimismIcon,
  },
  base: {
    id: 84532,
    display: "Base",
    rpc: env.BASE_RPC,
    proofDispatcher: baseDispatcher,
    simDispatcher: baseDispatcherSimClient,
    blockTime: 2,
    icon: BaseIcon,
  }
};
