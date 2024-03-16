'use client';

import { api } from "~/trpc/react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export default function Alerts() {
  const {data: alerts, isLoading, refetch} = api.alert.getAll.useQuery();
  const removeAlertMutation = api.alert.remove.useMutation();

  const handleRemove = async (alertId: number) => {
    await removeAlertMutation.mutateAsync({id: alertId});
    await refetch();
  };

  if (isLoading) return <Spinner>Loading...</Spinner>;

  if (!alerts || alerts.length === 0) return <p>There are no alerts set up</p>;

  if (!alerts) return null;

  return (
    <div className="rounded-md mt-10">
      <Table className="border border-black">
        <TableHeader className="bg-black text-white"> {/* Add background color and text color */}
          <TableRow className="h-12">
            <TableCell className="border border-black font-bold">Channel ID</TableCell>
            <TableCell className="border border-black font-bold">Client Type</TableCell>
            <TableCell className="border border-black font-bold">Chain</TableCell>
            <TableCell className="border border-black font-bold">Threshold (sec)</TableCell>
            <TableCell className="border border-black font-bold">Actions</TableCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {alerts?.map((alert) => (
            <TableRow key={alert.id} className="h-12">
              <TableCell className="border border-black">{alert.channelId}</TableCell>
              <TableCell className="border border-black">{alert.clientType}</TableCell>
              <TableCell className="border border-black">{alert.chain}</TableCell>
              <TableCell className="border border-black">{alert.threshold}</TableCell>
              <TableCell className="border border-black">
                <Button className={"bg-red-500"} onClick={() => handleRemove(alert.id)}>Remove</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}