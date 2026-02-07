import type { ReactNode } from "react";

interface Props {
  title: string;
  children: ReactNode;
}

export default function ChartCard({ title, children }: Props) {
  return (
    <div className="chart-card">
      <div className="chart-card-title">{title}</div>
      <div className="chart-card-body">{children}</div>
    </div>
  );
}
