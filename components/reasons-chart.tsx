'use client'

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { reasonLabel } from '@/lib/constants'
import type { ReasonCount } from '@/lib/metrics'

const chartConfig = {
  count: { label: 'Rejections', color: 'var(--chart-1)' },
} satisfies ChartConfig

export function ReasonsChart({ reasons }: { reasons: ReasonCount[] }) {
  const data = reasons.map((r) => ({ reason: reasonLabel(r.code), count: r.count }))

  return (
    <ChartContainer
      config={chartConfig}
      className="h-56 w-full"
      aria-label="Rejection reasons"
    >
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
        <CartesianGrid horizontal={false} />
        <YAxis
          dataKey="reason"
          type="category"
          tickLine={false}
          axisLine={false}
          width={100}
        />
        <XAxis type="number" allowDecimals={false} hide />
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <Bar dataKey="count" fill="var(--color-count)" radius={4} />
      </BarChart>
    </ChartContainer>
  )
}
