import { PrismaClient } from "@prisma/client";
import { type CHAIN, CHAIN_CONFIGS } from "@/app/utils/chains/configs";
import { JsonRpcProvider } from "ethers";
import { db } from "~/server/db";
import type { Packet } from "@/app/utils/types/packet";
import { getPackets } from "@/server/api/routers/channel";
import Mailgun from "mailgun.js";
import FormData from "form-data";
import { env } from "@/env";

export const dynamic = 'force-dynamic' // defaults to auto

export async function GET(request: Request) {
  await sendEmailAlerts({db});
  return Response.json({})
}

async function sendEmail(email: string, subject: string, message: string) {
  const mailgun = new Mailgun(FormData);
  const mg = mailgun.client({username: 'api', key: env.MAILGUN_API_KEY});

  const data = {
    from: 'PolyLens <onboarding@your-mailgun-domain.com>',
    to: email,
    subject: subject,
    html: message,
  };

  try {
    const result = await mg.messages.create(env.MAILGUN_DOMAIN, data);
    console.log("Email sent", result);
  } catch (error) {
    console.error(error);
  }
}

async function sendEmailAlerts(ctx: { db: PrismaClient }) {
  console.log('Sending email alerts');
  const alerts = await ctx.db.alert.findMany({where: {deletedAt: null}});
  // Group alerts by channelId, chain, and clientType
  const groupedAlerts = groupAlerts(alerts);

  for (const [key, alertsGroup] of Object.entries(groupedAlerts)) {
    const [channelId, chain, clientType] = key.split('|');
    const processedBlock = await ctx.db.processedBlock.findUnique({
      where: {chain},
    });

    console.log('Fetching latest block for', chain, "rpc", CHAIN_CONFIGS[chain as CHAIN].rpc, "id", CHAIN_CONFIGS[chain as CHAIN].id);
    const provider = new JsonRpcProvider(CHAIN_CONFIGS[chain as CHAIN].rpc, CHAIN_CONFIGS[chain as CHAIN].id);
    const block = await provider.getBlock('latest');
    console.log('Latest block for', chain, 'is', block!.number);
    const latestBlockNumber = BigInt(block!.number);
    if (!latestBlockNumber) {
      throw new Error('Failed to fetch latest block number');
    }

    if (!processedBlock || latestBlockNumber > processedBlock.blockNumber) {
      console.log('Fetching packets for', channelId, chain, clientType);
      const packets = await getPackets(ctx, channelId!, chain!, clientType!, processedBlock?.blockNumber, latestBlockNumber);
      console.log(`Found ${packets.length} packets`)

      const alertsToSend: Record<string, { threshold: number, packets: Packet[], alertIds: Set<number> }> = {};

      for (const alert of alertsGroup) {
        for (const packet of packets) {
          if (packet.endTime !== 0 && (packet.endTime - packet.createTime) > alert.threshold) {
            console.log('Packet', packet.sequence, 'on channel', channelId, 'on chain', chain, 'exceeded the threshold of', alert.threshold, 'seconds');
            const userEmail = alert.userEmail;
            if (!alertsToSend[userEmail]) {
              alertsToSend[userEmail] = {threshold: alert.threshold, packets: [], alertIds: new Set()};
            }
            alertsToSend[userEmail]!.packets.push(packet);
            alertsToSend[userEmail]!.alertIds.add(alert.id);
          }
        }
      }

      for (const [userEmail, {threshold, packets, alertIds}] of Object.entries(alertsToSend)) {
        const packetDetails = packets.map(packet => `Packet sequence ${packet.sequence} took ${packet.endTime - packet.createTime} seconds`).join('<br/>');
        const emailBody = `The following packets on channel <b>${channelId}</b> on chain <b>${chain}</b> have exceeded the threshold of <i>${threshold}</i> seconds:<br/><br/>        
        ${packetDetails}<br/><br/>
        To modify the alert settings, please visit the PolyLens <a href="https://polylens.vercel.app/">dashboard</a>`;

        console.log(`Sending email to ${userEmail}`);
        await sendEmail(userEmail, `Alert for Polymer channel ${channelId}`, emailBody);

        for (const alertId of alertIds) {
          await ctx.db.sentAlert.create({
            data: {
              alertId,
              recipient: userEmail,
            },
          });
        }
      }

      await updateProcessedBlock(ctx, chain!, latestBlockNumber);
    } else {
      console.log('No new blocks to process for', chain);
    }
  }
}

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


type Alert = {
  threshold: number;
  userEmail: string;
  chain: string;
  channelId: string;
  clientType: string;
  id: number;
};


async function updateProcessedBlock(ctx: { db: PrismaClient }, chain: string, latestBlockNumber: bigint) {
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
