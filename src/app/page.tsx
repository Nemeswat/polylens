import { unstable_noStore as noStore } from "next/cache";

import { AnalyseChannel } from "~/app/_components/analyze-channel";
export default async function Home() {
  noStore();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16 ">
        <div className="w-full max-w-lg">
          <AnalyseChannel />
        </div>
      </div>
    </main>
  );
}