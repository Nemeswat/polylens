'use client';

import { useState, useEffect } from 'react';
import { api } from '~/trpc/react';
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

export default function AddAlert() {
  const router = useRouter();

  const [channelId, setChannelId] = useState('');
  const [clientType, setClientType] = useState<"sim" | "proof">('sim'); // default value
  const [chain, setChain] = useState('base'); // default value
  const [threshold, setThreshold] = useState<number>(120); // Set initial default for 'sim'
  const {isLoaded, isSignedIn, user} = useUser();

// Update threshold based on clientType
  useEffect(() => {
    if (clientType === 'sim') {
      setThreshold(120);
    } else if (clientType === 'proof') {
      setThreshold(4000);
    }
  }, [clientType]); // This effect depends on clientType


  const addAlertMutation = api.alert.add.useMutation({
    onSuccess: (res) => {
      router.refresh();
    },
  });


  if (!isLoaded || !isSignedIn) {
    return null;
  }

  const userEmail = user.emailAddresses.find((email) => email.id == user.primaryEmailAddressId)?.emailAddress;

  return (
    <>
      <form onSubmit={(e) => {
        e.preventDefault();
        addAlertMutation.mutate({
          channelId,
          clientType,
          chain,
          threshold,
        });

      }}>
        <input
          type="text"
          placeholder="Channel ID"
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
        <div>
              <label htmlFor="thresholdInput" className="block text-sm font-medium text-white">Threshold (in seconds)</label>
              <input
                id="thresholdInput"
                type="number"
                placeholder="Threshold"
                value={threshold}
                onChange={(e) => setThreshold(parseInt(e.target.value))}
                className="w-full rounded-full px-4 py-2 text-black"
              />
            </div>
        <button
          type="submit"
          disabled={addAlertMutation.isLoading}
          className="rounded-full bg-white/10 px-10 py-3 font-semibold transition hover:bg-white/20"
        >
          {addAlertMutation.isLoading ? "Adding" : "Add Alert"}
        </button>
      </form>
      {addAlertMutation.isError && <p>Error adding alert.</p>}
      {addAlertMutation.isSuccess && <p>Alert added successfully!</p>}
    </>
  );
}