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
      <Table>
        <TableHeader>
          <TableRow className="h-12">
            <TableCell>Channel ID</TableCell>
            <TableCell>Client Type</TableCell>
            <TableCell>Chain</TableCell>
            <TableCell>Threshold (sec)</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {alerts?.map((alert) => (
            <TableRow key={alert.id} className="h-12">
              <TableCell>{alert.channelId}</TableCell>
              <TableCell>{alert.clientType}</TableCell>
              <TableCell>{alert.chain}</TableCell>
              <TableCell>{alert.threshold}</TableCell>
              <TableCell>
                <Button className={"bg-red-500"} onClick={() => handleRemove(alert.id)}>Remove</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}