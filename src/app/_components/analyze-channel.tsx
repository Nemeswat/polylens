'use client';

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "~/trpc/react";

export function AnalyseChannel() {
  const router = useRouter();

  // State to hold the most recent completed packet's round-trip time
  const [mostRecentRoundTripTime, setMostRecentRoundTripTime] = useState<number | null>(null);
  // State to hold the average latency time
  const [averageLatency, setAverageLatency] = useState<number | null>(null);
  // State to hold the count of failed packets
  const [failedPacketsCount, setFailedPacketsCount] = useState<number>(0);
  // State to track if a search has been performed
  const [searchPerformed, setSearchPerformed] = useState<boolean>(false);
  // State to track if no packets were found
  const [noPacketsFound, setNoPacketsFound] = useState<boolean>(false);

  const searchChannel = api.channel.search.useMutation({
    onSuccess: (res) => {
      console.log(res);
      if (res.length === 0) {
        setNoPacketsFound(true);
        setSearchPerformed(false); // Adjust based on your state management needs
        return; // Exit early
      } else {
        setNoPacketsFound(false); // Reset state if packets are found
      }
      // Filter out packets where transmission hasn't finished
      const completedPackets = res.filter(packet => packet.endTime !== 0);
      // Calculate the most recent packet's round-trip time
      if (completedPackets.length > 0) {
        const mostRecentPacket = completedPackets.sort((a, b) => b.createTime - a.createTime)[0];
        const roundTripTime = mostRecentPacket!.endTime - mostRecentPacket!.createTime;
        setMostRecentRoundTripTime(roundTripTime);
        // Calculate average latency
        const totalLatency = completedPackets.reduce((acc, packet) => acc + (packet.endTime - packet.createTime), 0);
        setAverageLatency(totalLatency / completedPackets.length);
      } else {
        setMostRecentRoundTripTime(null);
        setAverageLatency(null);
      }
      // Count failed packets
      const failedPackets = res.filter(packet => packet.endTime === 0).length;
      setFailedPacketsCount(failedPackets);

      // Indicate that a search has been performed
      setSearchPerformed(true);

      router.refresh();
    },
  });

  const [channelId, setChannelId] = useState("");
  const [clientType, setClientType] = useState<"sim" | "proof">("proof");
  const [chain, setChain] = useState("base");

  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          searchChannel.mutate({ channelId, chain, clientType });
        }}
        className="flex flex-col gap-2"
      >
        <input
          type="text"
          placeholder="Channel Id"
          value={channelId}
          onChange={(e) => setChannelId(e.target.value)}
          className="w-full rounded-full px-4 py-2 text-black"
        />
        <div>
          <span>Client type: </span>
          <label>
            <input
              type="radio"
              value="proof"
              checked={clientType === "proof"}
              onChange={() => setClientType("proof")}
            /> Proof
          </label>
          <label>
            <input
              type="radio"
              value="sim"
              checked={clientType === "sim"}
              onChange={() => setClientType("sim")}
            /> Sim
          </label>
        </div>
        <div>
          <span>Chain: </span>
          <label>
            <input
              type="radio"
              value="base"
              checked={chain === "base"}
              onChange={() => setChain("base")}
            /> Base
          </label>
          <label>
            <input
              type="radio"
              value="optimism"
              checked={chain === "optimism"}
              onChange={() => setChain("optimism")}
            /> Optimism
          </label>
        </div>
        <button
          type="submit"
          className="rounded-full bg-white/10 px-10 py-3 font-semibold transition hover:bg-white/20"
          disabled={searchChannel.isLoading}
        >
           {searchChannel.isLoading ? "Analysing..." : "Analyse"}
        </button>
      </form>
      <div className="mt-4">
        {noPacketsFound ? (
          <p>No packets found for the channel.</p>
        ) : (
          <>
            {mostRecentRoundTripTime !== null && (
              <p>Most Recent Completed Packet Round-trip Time: {mostRecentRoundTripTime} seconds</p>
            )}
            {averageLatency !== null && (
              <p>Average Latency Time: {averageLatency.toFixed(2)} seconds</p>
            )}
            {searchPerformed && (
              <p>Failed Packets: {failedPacketsCount}</p>
            )}
          </>
        )}
      </div>
    </>
  );
}
