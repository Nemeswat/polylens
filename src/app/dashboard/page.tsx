import { unstable_noStore as noStore } from "next/cache";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"


import AddAlert from "~/app/_components/add-alert";
import Alerts from "~/app/_components/alerts";

export default async function Dashboard() {
  noStore();

  return (
    <Tabs defaultValue="alerts" className="w-[400px]">
      <TabsList>
        <TabsTrigger value="alerts">Alerts</TabsTrigger>
        <TabsTrigger value="addAlert">Add Alert</TabsTrigger>
      </TabsList>
      <TabsContent value="alerts">
        <Alerts/>
      </TabsContent>
      <TabsContent value="addAlert">
        <AddAlert/>
      </TabsContent>
    </Tabs>
  );
}