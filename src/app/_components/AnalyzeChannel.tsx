'use client';

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "~/trpc/react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ReloadIcon } from "@radix-ui/react-icons";

import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle, } from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { LatencyGraph } from './LatencyGraph';
import { formatLatency } from '~/lib/utils';

const formSchema = z.object({
  channelId: z.string().min(1).refine(value => /^channel-\d+$/.test(value), {
    message: "Channel Id should start with 'channel-' followed by a number",
  }),
  clientType: z.enum(["proof", "sim"]),
  chain: z.string().min(1),
});

export function AnalyzeChannel() {
  const router = useRouter();

  const [mostRecentRoundTripTime, setMostRecentRoundTripTime] = useState<number | null>(null);
  const [averageLatency, setAverageLatency] = useState<number | null>(null);
  const [failedPacketsCount, setFailedPacketsCount] = useState<number>(0);
  const [succeededPacketsCount, setSucceededPacketsCount] = useState<number>(0);
  const [searchPerformed, setSearchPerformed] = useState<boolean>(false);
  const [noPacketsFound, setNoPacketsFound] = useState<boolean>(false);
  const [latencyData, setLatencyData] = useState<{ timestamp: number; latency: number }[]>([]);
  const [latencyPercentiles, setLatencyPercentiles] = useState<{ p25: number; p50: number; p75: number; p95: number }>({ p25: 0, p50: 0, p75: 0, p95: 0 });
  const [latencyTrendColor, setLatencyTrendColor] = useState<string>('gray');

  function calculateSMA(data: number[]): number[] {
    const sma: number[] = [];
    for (let i = 0; i < data.length; i++) {
      let sum = 0;
      for (let j = 0; j <= i; j++) {
        sum += data[j]!;
      }
      sma.push(sum / (i + 1));
    }
    return sma;
  }

  function getTrendColorClass(latencyData: number[]): string {
    const sma = calculateSMA(latencyData);
    const fullAverage = sma[sma.length - 1];
    const firstTwoThirdsAverage = sma[sma.length - Math.floor(sma.length / 3)]

    if (fullAverage! <= firstTwoThirdsAverage!) {
      return 'bg-green-500'; // Declining trend
    } else {
      return 'bg-red-500'; // Increasing trend
    }
  }

  const searchChannel = api.channel.search.useMutation({
    onSuccess: (res) => {
      if (res.length === 0) {
        setNoPacketsFound(true);
      } else {
        setNoPacketsFound(false);
      }
      const completedPackets = res.filter((packet) => packet.endTime !== 0);

      if (completedPackets.length > 0) {
        const mostRecentPacket = completedPackets.sort((a, b) => b.createTime - a.createTime)[0];
        const roundTripTime = mostRecentPacket!.endTime - mostRecentPacket!.createTime;
        setMostRecentRoundTripTime(roundTripTime);

        const totalLatency = completedPackets.reduce((acc, packet) => acc + (packet.endTime - packet.createTime), 0);
        setAverageLatency(totalLatency / completedPackets.length);
      } else {
        setMostRecentRoundTripTime(null);
        setAverageLatency(null);
      }

      const failedPackets = res.filter((packet) => packet.endTime === 0).length;
      setFailedPacketsCount(failedPackets);
      setSucceededPacketsCount(res.length - failedPackets);

      // Prepare data for latency graph
      const latencyGraphData = res.filter((packet) => packet.endTime !== 0).map((packet) => ({
        timestamp: packet.createTime * 1000, // Convert timestamp to Date object
        latency: packet.endTime - packet.createTime,
      }));

      // Calculate latency percentiles
      const latencies = latencyGraphData.map((data) => data.latency);

      const p25 = calculatePercentile(latencies, 25);
      const p50 = calculatePercentile(latencies, 50);
      const p75 = calculatePercentile(latencies, 75);
      const p95 = calculatePercentile(latencies, 95);

      // Update state with latency data and percentiles
      setLatencyData(latencyGraphData);
      setLatencyPercentiles({ p25, p50, p75, p95 });
      setLatencyTrendColor(getTrendColorClass(latencies));

      setSearchPerformed(true);
      router.refresh();
    },
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      channelId: "channel-17",
      clientType: "proof",
      chain: "base",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    searchChannel.mutate({ channelId: values.channelId, chain: values.chain, clientType: values.clientType });
  }

  return (
    <div className="flex flex-col items-center">
      <h1 className="text-3xl font-semibold mb-8">Channel Analysis</h1>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Enter Channel Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="clientType"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Client Type</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex row space-y-0"
                      >
                        <FormItem className="flex items-center space-x-1 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="proof" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Proof
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-1 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="sim" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Sim
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="chain"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Chain</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-row space-y-0"
                      >
                        <FormItem className="flex items-center space-x-1 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="base" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Base
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-1 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="optimism" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Optimism
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="channelId"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Channel ID</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter Channel ID" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={searchChannel.isLoading} className="w-full">
                {searchChannel.isLoading && <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />}
                {searchChannel.isLoading ? "Analyzing..." : "Analyze Channel"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {searchPerformed && (
        <div className="mt-8 w-full max-w-md">
          {noPacketsFound ? (
            <Card>
              <CardContent>
                <p className="text-center text-muted-foreground pt-6">No packets found for the channel.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Analysis Results</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="flex items-center space-x-4">
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">Latest Packet Round Trip</p>
                    <p className="text-2xl font-semibold">{formatLatency(mostRecentRoundTripTime!)}</p>
                  </div>
                  <div className="flex items-center">
                    {(mostRecentRoundTripTime && mostRecentRoundTripTime > 1.5 * averageLatency!) && (
                      <div className="rounded-full bg-red-500 p-3"></div>
                    )}
                    {(mostRecentRoundTripTime && mostRecentRoundTripTime < 1.5 * averageLatency!) && (
                      <div className="rounded-full bg-green-500 p-3"></div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">Average Latency</p>
                    <p className="text-2xl font-semibold">{formatLatency(averageLatency!)}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">Succeeded Packets</p>
                    <p className="text-2xl font-semibold">{succeededPacketsCount}</p>
                  </div>
                  <div className="rounded-full bg-green-500 p-3">
                    {/* Icon */}
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">Not Acknowledged Packets</p>
                    <p className="text-2xl font-semibold">{failedPacketsCount}</p>
                  </div>
                  <div className="rounded-full bg-red-500 p-3">
                    {/* Icon */}
                  </div>
                </div>
                <div className="mt-8">
                  <div className="mt-4 border-t border-border pt-2">
                    <h3 className="text-lg font-semibold mb-2">Latency Percentiles</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium">25th Percentile</p>
                      <p className="text-lg font-semibold">{formatLatency(latencyPercentiles.p25)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">50th Percentile</p>
                      <p className="text-lg font-semibold">{formatLatency(latencyPercentiles.p50)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">75th Percentile</p>
                      <p className="text-lg font-semibold">{formatLatency(latencyPercentiles.p75)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">95th Percentile</p>
                      <p className="text-lg font-semibold">{formatLatency(latencyPercentiles.p95)}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-8">
                  <div className="mt-4 border-t border-border pt-2">
                    <h3 className="text-lg font-semibold mb-2">Latency Trend</h3>
                  </div>
                  <div className={`rounded-full p-3 ${latencyTrendColor}`}>
                    {/* Icon */}
                  </div>
                </div>

                <div className="mt-8">
                  <h3 className="text-lg font-semibold mb-2">Latency Graph</h3>
                  {/* <p className="text-sm text-muted-foreground mb-4">This graph displays the packet latency over time for the selected channel.</p> */}
                  <LatencyGraph data={latencyData} />
                </div>
              </CardContent>
              <div className="flex justify-center p-4">
                <Button asChild className="w-full max-w-md">
                  <Link href="/dashboard">Add Alert</Link>
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

// Helper function to calculate percentile
function calculatePercentile(data: number[], percentile: number): number {
  const sorted = [...data].sort((a, b) => a - b);
  const index = (percentile / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) {
    return sorted[lower]!;
  }
  const weightedAverage = (sorted[lower]! * (upper - index)) + (sorted[upper]! * (index - lower));
  return weightedAverage;
}

// Helper function to get trend color class
function getTrendColorClass(color: string): string {
  switch (color) {
    case 'green':
      return 'bg-green-500';
    case 'yellow':
      return 'bg-yellow-500';
    case 'red':
      return 'bg-red-500';
    default:
      return 'bg-gray-500';
  }
}