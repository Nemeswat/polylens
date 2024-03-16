import { ethers, JsonRpcProvider } from "ethers";
import { z } from "zod";
import Abi from '~/app/utils/dispatcher.json';

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { type CHAIN, CHAIN_CONFIGS } from "~/app/utils/chains/configs";
import { type Packet } from "~/app/utils/types/packet";
import { currentUser } from "@clerk/nextjs";
import { Resend } from 'resend';
import { env } from "~/env";
import { PrismaClient } from "@prisma/client";


async function sendEmail(email: string, subject: string, message: string) {
  const resend: Resend = new Resend(env.RESEND_API_KEY);

  await resend.emails.send({
    from: 'PolyLens <onboarding@resend.dev>',
    to: [email],
    subject: subject,
    text: message,
  });
}

async function getPackets(ctx: {db: PrismaClient}, channelId: string, chain: string, clientType: string, fromBlock?: ethers.BlockTag, toBlock?: ethers.BlockTag) {
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
    console.log("No send logs found for channel: ", channelId);
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
      return ctx.db.alert.delete({
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

    return ctx.db.alert.findMany({where: {userEmail: userEmail}});
  }),

  sendEmailAlerts: publicProcedure
    .query(async ({ctx}) => {
      const alerts = await ctx.db.alert.findMany();
      // Group alerts by channelId, chain, and clientType
      const groupedAlerts = groupAlerts(alerts);

      for (const [key, alertsGroup] of Object.entries(groupedAlerts)) {
        const [channelId, chain, clientType] = key.split('|');
        const processedBlock = await ctx.db.processedBlock.findUnique({
          where: {chain},
        });

        const provider = new JsonRpcProvider(CHAIN_CONFIGS[chain as CHAIN].rpc, CHAIN_CONFIGS[chain as CHAIN].id);
        const block = await provider.getBlock('latest');
        const latestBlockNumber = BigInt(block!.number);
        if (!latestBlockNumber) {
          throw new Error('Failed to fetch latest block number');
        }

        if (!processedBlock || latestBlockNumber > processedBlock.blockNumber) {
          console.log('Fetching packets for', channelId, chain, clientType);
          const packets = await getPackets(ctx, channelId!, chain!, clientType!, processedBlock?.blockNumber, latestBlockNumber);

          for (const alert of alertsGroup) {
            for (const packet of packets) {
              if (packet.endTime != 0 && (packet.endTime - packet.createTime) > alert.threshold) {
                console.log(`Packet latency is ${packet.endTime - packet.createTime} which is greater than the threshold of ${alert.threshold}`);
                console.log(`Sending email to ${alert.userEmail}`);
                await sendEmail(alert.userEmail, `Alert for Polymer channel ${channelId}`,
                  `A packet transaction on channel ${channelId} on chain ${chain} has exceeded the threshold of ${alert.threshold} seconds. The transaction took ${packet.endTime - packet.createTime} seconds to complete.
                  To modify the alert settings, please visit the PolyLens <a href="https://polylens.vercel.app/">dashboard</a>`);

                console.log(`Saving alert for ${alert.userEmail} to the db`);
                await ctx.db.sentAlert.create({
                  data: {
                    alertId: alert.id,
                    recipient: alert.userEmail,
                  },
                });
              }
            }
          }

          await updateProcessedBlock(ctx, chain!, latestBlockNumber);
        } else {
          console.log('No new blocks to process for', chain);
        }
      }
    }),
});

type Alert = {
  threshold: number;
  userEmail: string;
  chain: string;
  channelId: string;
  clientType: string;
  id: number;
};

function groupAlerts(alerts: Alert[]): Record<string, Alert[]> {
  return alerts.reduce((acc, alert) => {
    const key = `${alert.channelId}|${alert.chain}|${alert.clientType}`;
    if (!acc[key]) {
      acc[key] = [];
    }

    acc[key]!.push(alert);
    return acc;
  }, {} as Record<string, Alert[]>);
}

async function updateProcessedBlock(ctx: {db: PrismaClient}, chain: string, latestBlockNumber: bigint) {
  console.log('Updating processed block for', chain, 'to', latestBlockNumber);
  const processedBlock = await ctx.db.processedBlock.findUnique({
    where: {chain},
  });
  if (processedBlock) {
    await ctx.db.processedBlock.update({
      where: {id: processedBlock.id},
      data: {blockNumber: latestBlockNumber},
    });
  } else {
    await ctx.db.processedBlock.create({
      data: {chain, blockNumber: latestBlockNumber},
    });
  }
}