import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

type LatencyData = {
  blockNumber: number;
  latency: number;
};

type LatencyGraphProps = {
  data: LatencyData[];
};

export function LatencyGraph({ data }: LatencyGraphProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <XAxis dataKey="blockNumber" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="latency" stroke="#8884d8" />
      </LineChart>
    </ResponsiveContainer>
  );
}