import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
  RadialBarChart,
  RadialBar,
} from "recharts";
import { Download } from "lucide-react";
import { getDashboardData } from "@/server-fns/dashboard";

export const Route = createFileRoute("/_app/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios — Imovix" }] }),
  component: Reports,
});

const PALETTE = [
  "var(--color-navy)",
  "var(--color-gold)",
  "var(--color-chart-3)",
  "var(--color-success)",
  "var(--color-warning)",
  "var(--color-destructive)",
];

type DashData = Awaited<ReturnType<typeof getDashboardData>>;
type LeadsOverTimePoint = DashData["leadsOverTime"][number];
type LeadSourcePoint = DashData["leadsBySource"][number];
type BrokerStatPoint = DashData["brokerStats"][number];

function Reports() {
  const responseGauge = [{ name: "resp", value: 78, fill: "var(--color-gold)" }];
  const [isClient, setIsClient] = useState(false);
  const [data, setData] = useState<DashData | null>(null);
  const [period, setPeriod] = useState<"week" | "month" | "quarter" | "semester">("month");

  useEffect(() => {
    setIsClient(true);
    getDashboardData()
      .then(setData)
      .catch(() => {});
  }, []);

  const filteredData = useMemo(() => {
    if (!data) return null;
    const points = period === "week" ? 7 : period === "month" ? 14 : period === "quarter" ? 10 : 12;
    const brokerFactor =
      period === "week" ? 0.65 : period === "month" ? 1 : period === "quarter" ? 1.2 : 1.4;
    const sourceFactor =
      period === "week" ? 0.7 : period === "month" ? 1 : period === "quarter" ? 1.15 : 1.3;
    return {
      ...data,
      leadsOverTime: data.leadsOverTime.slice(-points),
      leadsBySource: data.leadsBySource.map((item: LeadSourcePoint) => ({
        ...item,
        value: Math.round(item.value * sourceFactor),
      })),
      brokerStats: data.brokerStats.map((broker: BrokerStatPoint) => ({
        ...broker,
        leads: Math.round(broker.leads * brokerFactor),
        conversion: Math.round(
          broker.conversion * (period === "week" ? 0.9 : period === "semester" ? 1.08 : 1),
        ),
      })),
    };
  }, [data, period]);

  function downloadCsv() {
    if (!filteredData) return;
    const rows = [
      ["Dia", "Leads", "Ganhos"],
      ...filteredData.leadsOverTime.map((item: LeadsOverTimePoint) => [
        item.day,
        String(item.leads),
        String(item.ganhos),
      ]),
    ];
    const csv = rows.map((row) => row.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorios-${period}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5 max-w-[1500px] mx-auto">
      <style>{`@media print { .no-print { display: none !important; } body { background: white !important; } }`}</style>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={period} onValueChange={(value) => setPeriod(value as typeof period)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Esta semana</SelectItem>
            <SelectItem value="month">Este mês</SelectItem>
            <SelectItem value="quarter">Trimestre</SelectItem>
            <SelectItem value="semester">Semestre</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto flex gap-2 no-print">
          <Button variant="outline" size="sm" onClick={downloadCsv}>
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
          <Button
            size="sm"
            className="bg-navy text-navy-foreground hover:bg-navy/90"
            onClick={() => window.print()}
          >
            <Download className="h-4 w-4 mr-1" /> PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5 lg:col-span-2">
          <h3 className="font-semibold">Leads ao longo do tempo</h3>
          <p className="text-xs text-muted-foreground mb-3">Volume diário e conversões</p>
          <div className="h-[280px]">
            {isClient ? (
              <ResponsiveContainer>
                <LineChart data={filteredData?.leadsOverTime ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="day" stroke="var(--color-muted-foreground)" fontSize={11} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: "1px solid var(--color-border)" }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line
                    type="monotone"
                    dataKey="leads"
                    stroke="var(--color-navy)"
                    strokeWidth={2.5}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="ganhos"
                    stroke="var(--color-gold)"
                    strokeWidth={2.5}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full rounded-xl bg-secondary/40 animate-pulse" />
            )}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold">Leads por origem</h3>
          <p className="text-xs text-muted-foreground mb-3">Distribuição percentual</p>
          <div className="h-[280px]">
            {isClient ? (
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={filteredData?.leadsBySource ?? []}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {(filteredData?.leadsBySource ?? []).map((_: LeadSourcePoint, i: number) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: "1px solid var(--color-border)" }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full rounded-xl bg-secondary/40 animate-pulse" />
            )}
          </div>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <h3 className="font-semibold">Conversão por corretor</h3>
          <p className="text-xs text-muted-foreground mb-3">Taxa de conversão (%)</p>
          <div className="h-[260px]">
            {isClient ? (
              <ResponsiveContainer>
                <BarChart
                  data={(filteredData?.brokerStats ?? []).map((b: BrokerStatPoint) => ({
                    name: b.name.split(" ")[0],
                    conv: b.conversion,
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={11} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: "1px solid var(--color-border)" }}
                  />
                  <Bar dataKey="conv" fill="var(--color-gold)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full rounded-xl bg-secondary/40 animate-pulse" />
            )}
          </div>
        </Card>

        <Card className="p-5 flex flex-col">
          <h3 className="font-semibold">Tempo médio de resposta</h3>
          <p className="text-xs text-muted-foreground mb-3">Meta: até 10 minutos</p>
          <div className="flex-1 relative">
            {isClient ? (
              <ResponsiveContainer>
                <RadialBarChart
                  innerRadius="65%"
                  outerRadius="95%"
                  data={responseGauge}
                  startAngle={210}
                  endAngle={-30}
                >
                  <RadialBar
                    dataKey="value"
                    cornerRadius={20}
                    background={{ fill: "var(--color-secondary)" }}
                  />
                </RadialBarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full rounded-full bg-secondary/40 animate-pulse" />
            )}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-3xl font-bold">8min</div>
              <div className="text-xs text-success">Acima da meta</div>
            </div>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="p-5 border-b border-border">
          <h3 className="font-semibold">Top corretores</h3>
          <p className="text-xs text-muted-foreground">Performance no período</p>
        </div>
        <div className="divide-y divide-border">
          {[...(filteredData?.brokerStats ?? [])]
            .sort((a: BrokerStatPoint, b: BrokerStatPoint) => b.conversion - a.conversion)
            .map((b: BrokerStatPoint, i: number) => (
              <div key={b.id} className="flex items-center gap-4 p-4">
                <div className="font-mono text-xs w-6 text-muted-foreground">#{i + 1}</div>
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-navy text-navy-foreground text-xs font-semibold">
                    {b.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{b.name}</div>
                </div>
                <div className="hidden sm:block text-sm">
                  <span className="text-muted-foreground">Leads:</span>{" "}
                  <span className="font-semibold">{b.leads}</span>
                </div>
                <Badge className="bg-gold/15 text-gold border border-gold/30 font-mono">
                  {b.conversion}%
                </Badge>
              </div>
            ))}
          {!data && (
            <div className="p-8 text-center text-sm text-muted-foreground animate-pulse">
              Carregando...
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
