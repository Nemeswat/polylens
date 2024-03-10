"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { api } from "~/trpc/react";

export function FetchChannelInfo() {
  const router = useRouter();

  const searchChannel = api.channel.search.useMutation({
    onSuccess: (res) => {
      console.log(res);
      router.refresh();
    },
  });

  const [channelId, setChannelId] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        searchChannel.mutate({channelId, chain: "base", clientType: "proof"});
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
      <button
        type="submit"
        className="rounded-full bg-white/10 px-10 py-3 font-semibold transition hover:bg-white/20"
        disabled={searchChannel.isLoading}
      >
         {searchChannel.isLoading ? "Searching..." : "Search"}
      </button>
    </form>
  );
}
