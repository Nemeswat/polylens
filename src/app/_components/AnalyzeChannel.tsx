'use client';

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "~/trpc/react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { ReloadIcon } from "@radix-ui/react-icons"

import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Card,
  CardContent,
} from "@/components/ui/card"

import { Button } from "@/components/ui/button";

const formSchema = z.object({
  channelId: z.string().min(1),
  clientType: z.enum(["proof", "sim"]),
  chain: z.string().min(1),
});



export function AnalyzeChannel() {
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
      if (res.length === 0) {
        setNoPacketsFound(true);
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

      const failedPackets = res.filter(packet => packet.endTime === 0).length;
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
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    searchChannel.mutate({ channelId: values.channelId, chain: values.chain, clientType: values.clientType });
  }


  return (
    <div className={"flex"}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="w-2/3 space-y-6">
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
                    className="flex row space-y-1"
                  >
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="proof" />
                      </FormControl>
                      <FormLabel className="font-normal">
                        Proof
                      </FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-3 space-y-0">
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
                    className="flex flex-row space-y-1"
                  >
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="base" />
                      </FormControl>
                      <FormLabel className="font-normal">
                        Base
                      </FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-3 space-y-0">
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
                <FormLabel>Channel Id</FormLabel>
                <FormControl>
                  <Input placeholder="Channel Id" {...field} className="w-3/4" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={searchChannel.isLoading}>
            {searchChannel.isLoading && (
              <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
            )}
            {searchChannel.isLoading ? "Analysing..." : "Analyse"}
          </Button>
        </form>
      </Form>
      {searchPerformed && (
        <div className="mt-0 ml-4 w-96">
          {noPacketsFound ? (
            <Card>
              <CardContent  className="grid gap-1 pt-6">
                <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all">
                  <p className="text-sm font-medium leading-none">No packets found for the channel.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="grid gap-1 pt-4">
                <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all">
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">Latest Packet RoundTrip</p>
                    <p className="text-sm text-muted-foreground">
                      {mostRecentRoundTripTime} seconds
                    </p>
                  </div>
                </div>
                <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 text-accent-foreground transition-all">
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">Average Latency Time</p>
                    <p className="text-sm text-muted-foreground">
                      {averageLatency?.toFixed(2)} seconds
                    </p>
                  </div>
                </div>
                <div className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all">
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">Failed Packets</p>
                    <p className="text-sm text-muted-foreground">
                      {failedPacketsCount}
                    </p>
                  </div>
                </div>
                <Button asChild>
                  <Link href="/dashboard">
                    Add an alert
                  </Link>

                </Button>

              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
