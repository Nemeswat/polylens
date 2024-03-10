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
    rpc: "https://opt-sepolia.g.alchemy.com/v2/jKvLhhXvtnWdNeZrKst0demxnwJcYH1o",
    proofDispatcher: opDispatcher,
    simDispatcher: opDispatcherSimClient,
    blockTime: 2,
    icon: OptimismIcon,
  },
  base: {
    id: 84532,
    display: "Base",
    rpc: "https://base-sepolia.g.alchemy.com/v2/776dC6qT-NTtupdnxlUJuXGbUIKWWhLe",
    proofDispatcher: baseDispatcher,
    simDispatcher: baseDispatcherSimClient,
    blockTime: 2,
    icon: BaseIcon,
  }
};
