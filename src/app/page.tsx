import { unstable_noStore as noStore } from "next/cache";
import { AnalyseChannel } from "@/app/_components/analyze-channel";

export default async function Home() {
  noStore();

  return (
    <AnalyseChannel/>
  );
}