import { OptimismIcon, BaseIcon } from "./icons";
import { type Chain } from "~/app/utils/types/chain";

export type CHAIN = 'optimism' | 'base';

const opDispatcher = process.env.OP_DISPATCHER!;
const baseDispatcher = process.env.BASE_DISPATCHER!;
const opDispatcherSimClient = process.env.OP_DISPATCHER_SIM!;
const baseDispatcherSimClient = process.env.BASE_DISPATCHER_SIM!;

export const CHAIN_CONFIGS: {
  [key in CHAIN]: Chain;
} = {
  optimism: {
    id: 11155420,
    display: "Optimism",
    rpc: process.env.OPTIMISM_RPC ?? "https://sepolia.optimism.io",
    proofDispatcher: opDispatcher,
    simDispatcher: opDispatcherSimClient,
    blockTime: 2,
    icon: OptimismIcon,
  },
  base: {
    id: 84532,
    display: "Base",
    rpc: process.env.BASE_RPC ?? "https://sepolia.base.org",
    proofDispatcher: baseDispatcher,
    simDispatcher: baseDispatcherSimClient,
    blockTime: 2,
    icon: BaseIcon,
  }
};
