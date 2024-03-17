import { ethers, JsonRpcProvider } from "ethers";
import { z } from "zod";
import Abi from '~/app/utils/dispatcher.json';

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { type CHAIN, CHAIN_CONFIGS } from "~/app/utils/chains/configs";
import { type Packet } from "~/app/utils/types/packet";
import { currentUser } from "@clerk/nextjs";
import { PrismaClient } from "@prisma/client";

export async function getPackets(ctx: {
  db: PrismaClient
}, channelId: string, chain: string, clientType: string, fromBlock?: ethers.BlockTag, toBlock?: ethers.BlockTag) {
  const chainId = chain as CHAIN;
  const dispatcherAddress = clientType == "sim" ? CHAIN_CONFIGS[chainId].simDispatcher : CHAIN_CONFIGS[chainId].proofDispatcher;
  const provider = new JsonRpcProvider(CHAIN_CONFIGS[chainId].rpc, CHAIN_CONFIGS[chainId].id);
  const contract = new ethers.Contract(dispatcherAddress, Abi.abi, provider);

  const packets: Record<string, Packet> = {};

  const channelIdBytes32 = ethers.encodeBytes32String(channelId);

  const ackLogFilter = contract.filters.Acknowledgement!(null, channelIdBytes32);
  const sendLogFilter = contract.filters.SendPacket!(null, channelIdBytes32);

  const [ackLogs, sendLogs] = await Promise.all([
    contract.queryFilter(ackLogFilter, fromBlock, toBlock),
    contract.queryFilter(sendLogFilter, fromBlock, toBlock),
  ]) as [Array<ethers.EventLog>, Array<ethers.EventLog>];

  if (sendLogs.length == 0) {
    return []
  }

  async function processSendLog(sendEvent: ethers.EventLog) {
    const [srcPortAddress, srcChannelId, , sequence, ,] = sendEvent.args;

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
      console.log(`Negative latency detected for packet ${key}:`);
      console.log(`createTime: ${packets[key]!.createTime}`);
      console.log(`endTime: ${srcBlock!.timestamp}`);
      return;
    }
    packets[key]!.endTime = srcBlock!.timestamp;
    packets[key]!.ackTx = ackEvent.transactionHash;
  }

  await Promise.allSettled(ackLogs.map(processAckLog));

  const response: Packet[] = [];
  Object.keys(packets).sort((a, b) => packets[a]!.createTime - packets[b]!.createTime).forEach((key) => {
    response.push(packets[key]!);
  });

  return response;
}


export const channelRouter = createTRPCRouter({
  search: publicProcedure
    .input(z.object({channelId: z.string(), chain: z.string(), clientType: z.enum(["sim", "proof"])}))
    .mutation(async ({ctx, input}) => {
      return await getPackets(ctx, input.channelId, input.chain, input.clientType);
    }),

});
export const alertRouter = createTRPCRouter({
  add: publicProcedure
    .input(z.object({
      channelId: z.string(),
      chain: z.string(),
      clientType: z.enum(["sim", "proof"]),
      threshold: z.number()
    }))
    .mutation(async ({ctx, input}) => {
      const {channelId, chain, clientType, threshold} = input;
      const user = await currentUser();

      if (!user) {
        throw new Error("User must be signed in to add an alert");
      }

      const userEmail = user.emailAddresses.find((email) => email.id == user.primaryEmailAddressId)?.emailAddress;

      if (!userEmail) {
        throw new Error("User must be signed in to add an alert");
      }

      // Check the number of alerts the user already has
      const userAlerts = await ctx.db.alert.findMany({where: {userEmail: userEmail}});
      if (userAlerts.length >= 3) {
        throw new Error("User cannot have more than 3 alerts");
      }

      return await ctx.db.alert.create({
        data: {
          channelId,
          chain,
          clientType,
          userEmail,
          threshold,
        },
      });
    }),

  remove: publicProcedure
    .input(z.object({id: z.number()}))
    .mutation(({ctx, input}) => {
      return ctx.db.alert.update({
        data: {
          deletedAt: new Date(),
        },
        where: {
          id: input.id,
        },
      });
    }),

  getAll: publicProcedure.query(async ({ctx}) => {
    const user = await currentUser();

    if (!user) {
      throw new Error("User must be signed in to add an alert");
    }


    const userEmail = user.emailAddresses.find((email) => email.id == user.primaryEmailAddressId)?.emailAddress;

    if (!userEmail) {
      throw new Error("User must be signed in to add an alert");
    }

    return ctx.db.alert.findMany({where: {userEmail: userEmail, deletedAt: null}});
  }),
});
