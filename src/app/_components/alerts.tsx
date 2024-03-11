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


export default function Alerts() {
  const {data: alerts, refetch} = api.alert.getAll.useQuery();
  const removeAlertMutation = api.alert.remove.useMutation();

  const handleRemove = async (alertId: number) => {
    await removeAlertMutation.mutateAsync({id: alertId});
    await refetch();
  };

  if (!alerts) return null;

  return (
    <div className="rounded-md border mt-10">
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