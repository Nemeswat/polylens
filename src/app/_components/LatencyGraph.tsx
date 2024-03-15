import { LineChart, Line, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { format } from 'date-fns';
import { formatLatency } from '~/lib/utils';

type LatencyData = {
  timestamp: number;
  latency: number;
};

type LatencyGraphProps = {
  data: LatencyData[];
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const timestamp = payload[0].payload.timestamp;
        console.log(timestamp);
        return (
            <div className="bg-white p-2 border border-gray-300 rounded shadow">
                <p className="text-gray-600 text-xs">{format(new Date(timestamp), 'MMM d, yyyy HH:mm:ss')}</p>
                <p className="text-gray-600 text-sm font-bold">{`Latency: ${formatLatency(payload[0].value)}`}</p>
            </div>
        );
    }

    return null;
};

export function LatencyGraph({ data }: LatencyGraphProps) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        {/* <YAxis 
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => formatLatency(value)}
            width={40}
        /> */}
        <Tooltip content={<CustomTooltip />} />
        <Line type="monotone" dataKey="latency" stroke="#8884d8" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
