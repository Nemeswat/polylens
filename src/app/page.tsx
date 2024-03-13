import { unstable_noStore as noStore } from "next/cache";
import { AnalyzeChannel } from "@/app/_components/AnalyzeChannel";

export default async function Home() {
  noStore();

  return (
    <AnalyzeChannel/>
  );
}