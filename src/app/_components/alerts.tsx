'use client';

import { api } from "~/trpc/react";

export default function Alerts() {
  const { data: alerts, refetch } = api.alert.getAll.useQuery();
  const removeAlertMutation = api.alert.remove.useMutation();

  const handleRemove = async (alertId: number) => {
    await removeAlertMutation.mutateAsync({ id: alertId });
    refetch(); // Refetch alerts after removal
  };

  return (
    <table>
      <thead>
        <tr>
          <th>Channel ID</th>
          <th>Client Type</th>
          <th>Chain</th>
          <th>Threshold</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {alerts?.map((alert) => (
          <tr key={alert.id}>
            <td>{alert.channelId}</td>
            <td>{alert.clientType}</td>
            <td>{alert.chain}</td>
            <td>{alert.threshold}</td>
            <td>
              <button onClick={() => handleRemove(alert.id)}>Remove</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
