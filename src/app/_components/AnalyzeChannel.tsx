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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";

const formSchema = z.object({
  channelId: z.string().min(1),
  clientType: z.enum(["proof", "sim"]),
  chain: z.string().min(1),
});

export function AnalyzeChannel() {
  const router = useRouter();

  const [mostRecentRoundTripTime, setMostRecentRoundTripTime] = useState<number | null>(null);
  const [averageLatency, setAverageLatency] = useState<number | null>(null);
  const [failedPacketsCount, setFailedPacketsCount] = useState<number>(0);
  const [searchPerformed, setSearchPerformed] = useState<boolean>(false);
  const [noPacketsFound, setNoPacketsFound] = useState<boolean>(false);

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
                        className="flex flex-row space-x-4"
                      >
                        <FormItem>
                          <FormControl>
                            <RadioGroupItem value="proof" />
                          </FormControl>
                          <FormLabel className="font-normal">Proof</FormLabel>
                        </FormItem>
                        <FormItem>
                          <FormControl>
                            <RadioGroupItem value="sim" />
                          </FormControl>
                          <FormLabel className="font-normal">Sim</FormLabel>
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
                        className="flex flex-row space-x-4"
                      >
                        <FormItem>
                          <FormControl>
                            <RadioGroupItem value="base" />
                          </FormControl>
                          <FormLabel className="font-normal">Base</FormLabel>
                        </FormItem>
                        <FormItem>
                          <FormControl>
                            <RadioGroupItem value="optimism" />
                          </FormControl>
                          <FormLabel className="font-normal">Optimism</FormLabel>
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
                <p className="text-center text-muted-foreground">No packets found for the channel.</p>
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
                    <p className="text-2xl font-semibold">{mostRecentRoundTripTime} sec</p>
                  </div>
                  <div className="rounded-full bg-accent p-3">
                    {/* Icon */}
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">Average Latency</p>
                    <p className="text-2xl font-semibold">{averageLatency?.toFixed(2)} sec</p>
                  </div>
                  <div className="rounded-full bg-accent p-3">
                    {/* Icon */}
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">Failed Packets</p>
                    <p className="text-2xl font-semibold">{failedPacketsCount}</p>
                  </div>
                  <div className="rounded-full bg-red-500 p-3">
                    {/* Icon */}
                  </div>
                </div>
              </CardContent>
              <div className="flex justify-end p-4">
                <Button asChild>
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