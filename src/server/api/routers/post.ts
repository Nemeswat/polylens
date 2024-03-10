import { ethers, JsonRpcProvider } from "ethers";
import { z } from "zod";
import Abi from '~/app/utils/dispatcher.json';

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { type CHAIN, CHAIN_CONFIGS } from "~/app/utils/chains/configs";
import { Packet } from "~/app/utils/types/packet";

export const channelRouter = createTRPCRouter({
  search: publicProcedure
    .input(z.object({channelId: z.string(), chain: z.string(), clientType: z.enum(["sim", "proof"])}))
    .mutation(async ({ctx, input: {channelId, chain, clientType}}) => {
      const chainId = chain as CHAIN;
      const dispatcherAddress = clientType == "sim" ? CHAIN_CONFIGS[chainId].simDispatcher : CHAIN_CONFIGS[chainId].proofDispatcher;
      const provider = new JsonRpcProvider(CHAIN_CONFIGS[chainId].rpc, CHAIN_CONFIGS[chainId].id);
      const contract = new ethers.Contract(dispatcherAddress, Abi.abi, provider);

      const packets: Record<string, Packet> = {};

      const channelIdBytes32 = ethers.encodeBytes32String(channelId);

      const ackLogFilter = contract.filters.Acknowledgement!(null, channelIdBytes32);
      const sendLogFilter = contract.filters.SendPacket!(null, channelIdBytes32);

      const [ackLogs, sendLogs] = await Promise.all([
        contract.queryFilter(ackLogFilter),
        contract.queryFilter(sendLogFilter),
      ]) as [Array<ethers.EventLog>, Array<ethers.EventLog>];

      if (sendLogs.length == 0) {
        return []
      }

      async function processSendLog(sendEvent: ethers.EventLog) {
        const [srcPortAddress, srcChannelId, , sequence, , ] = sendEvent.args;

        const key = `${srcPortAddress}-${ethers.decodeBytes32String(srcChannelId as string)}-${sequence}`;
        const srcBlock = await provider.getBlock(sendEvent.blockNumber);
        packets[key] = {
          sequence: sequence as string,
          createTime: srcBlock!.timestamp,
          endTime: 0,
          ackTx: "",
          sendTx: sendEvent.transactionHash,
        };

      }

      await Promise.allSettled(sendLogs.map(processSendLog))

      async function processAckLog(ackEvent: ethers.EventLog) {
        const [srcPortAddress, srcChannelId, sequence] = ackEvent.args;
        const key = `${srcPortAddress}-${ethers.decodeBytes32String(srcChannelId as string)}-${sequence}`;

        if (!packets[key]) {
          console.log("No packet found for ack: ", key);
          return;
        }

        const srcBlock = await provider.getBlock(ackEvent.blockNumber);
        if (srcBlock!.timestamp < packets[key]!.createTime) {
          return;
        }
        packets[key]!.endTime = srcBlock!.timestamp;
        packets[key]!.ackTx = ackEvent.transactionHash;
      }

      await Promise.allSettled(ackLogs.map(processAckLog));

      const response: Packet[] = [];
      Object.keys(packets).forEach((key) => {
        response.push(packets[key]!);
      });

      return response;
    }),

});
