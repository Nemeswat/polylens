'use client';

import { useState } from 'react';
import { api } from '~/trpc/react';
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useForm } from "react-hook-form"
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod"
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Button } from "@/components/ui/button";
import { ReloadIcon } from '@radix-ui/react-icons';
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";


const formSchema = z.object({
  channelId: z.string().min(1),
  clientType: z.enum(["sim", "proof"]),
  chain: z.enum(["base", "optimism"]),
  threshold: z.number().min(1),
});

export default function AddAlert() {
  const router = useRouter();
  const { toast } = useToast()

  const { isLoaded, isSignedIn, user } = useUser();
  const addAlertMutation = api.alert.add.useMutation({
    onSuccess: (res) => {
      toast({
        description: "Alert added successfully!",
      })
      router.refresh();
    },
    onError: (err) => {
      let errorMessage = "Error adding alert.";
      if (err.message === "User cannot have more than 3 alerts") {
        errorMessage = "You cannot add more than 3 alerts";
      }
      toast({
        variant: "destructive",
        description: errorMessage,
      })
      router.refresh();
    }
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      channelId: '',
      clientType: 'sim',
      chain: 'base',
      threshold: 120,
    },
  });


  if (!isLoaded || !isSignedIn) {
    return null;
  }



  function onSubmit(values: z.infer<typeof formSchema>) {
    addAlertMutation.mutate(values);
  }


  return (
    <>
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
            name="threshold"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>Threshold (in seconds)</FormLabel>
                <FormControl>
                  <Input
                    id="thresholdInput"
                    type="number"
                    placeholder="Threshold"
                    {...field}
                    onChange={e => field.onChange(Number(e.target.value))}
                    className="w-3/4 px-4 py-2"
                  />
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
          <Button type="submit" disabled={addAlertMutation.isLoading}>
            {addAlertMutation.isLoading && (
              <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
            )}
            {addAlertMutation.isLoading ? "Adding" : "Add Alert"}
          </Button>
        </form>
      </Form>
      {addAlertMutation.isError && <p>Error adding alert.</p>}
    </>
  );
}