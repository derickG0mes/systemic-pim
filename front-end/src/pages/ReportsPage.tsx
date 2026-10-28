import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { DollarSign, Receipt, CreditCard } from "lucide-react";
import { getReceitaPorForma, getRelatorioFaturamento } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

interface FinancialReport {
  receita: number;
  despesas: number;
  lucro: number;
}

interface PaymentRevenue {
  formaPagemento?: string;
  formaPagamento?: string;
  total: number;
}

function dateRange(date: string) {
  return { start: `${date}T00:00:00`, end: `${date}T23:59:59.999` };
}

export default function ReportsPage() {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [report, setReport] = useState<FinancialReport>({ receita: 0, despesas: 0, lucro: 0 });
  const [paymentData, setPaymentData] = useState<{ name: string; total: number }[]>([]);
  const [chartData, setChartData] = useState<{ date: string; total: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const loadReport = async () => {
      setLoading(true);
      try {
        const selectedRange = dateRange(selectedDate);
        const [daily, payments, weekly] = await Promise.all([
          getRelatorioFaturamento(selectedRange.start, selectedRange.end),
          getReceitaPorForma(selectedRange.start, selectedRange.end),
          Promise.all(Array.from({ length: 7 }, (_, index) => {
            const date = new Date(`${selectedDate}T12:00:00`);
            date.setDate(date.getDate() - (6 - index));
            const day = date.toISOString().split("T")[0];
            const range = dateRange(day);
            return getRelatorioFaturamento(range.start, range.end).then((response) => ({
              date: date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
              total: Number(response?.receita ?? response?.dados?.receita ?? 0),
            }));
          })),
        ]);
        if (!active) return;
        const dailyData = daily?.dados ?? daily?.Dados ?? daily;
        const paymentRows = payments?.dados ?? payments?.Dados ?? payments;
        setReport({ receita: Number(dailyData?.receita ?? 0), despesas: Number(dailyData?.despesas ?? 0), lucro: Number(dailyData?.lucro ?? 0) });
        setPaymentData(Array.isArray(paymentRows) ? paymentRows.map((row: PaymentRevenue) => ({ name: row.formaPagemento ?? row.formaPagamento ?? "Outros", total: Number(row.total ?? 0) })) : []);
        setChartData(weekly);
      } catch (error) {
        if (active) toast({ title: "Erro", description: error instanceof Error ? error.message : "Falha ao carregar o relatório.", variant: "destructive" });
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadReport();
    return () => { active = false; };
  }, [selectedDate, toast]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Relatórios</h1>
        <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-auto" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary"><DollarSign className="h-5 w-5" /></div>
            <div><p className="text-xs text-muted-foreground">Receita Total</p><p className="text-xl font-bold">{loading ? "..." : `R$ ${report.receita.toFixed(2)}`}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10 text-success"><Receipt className="h-5 w-5" /></div>
            <div><p className="text-xs text-muted-foreground">Despesas</p><p className="text-xl font-bold">{loading ? "..." : `R$ ${report.despesas.toFixed(2)}`}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning/10 text-warning"><CreditCard className="h-5 w-5" /></div>
            <div><p className="text-xs text-muted-foreground">Lucro Líquido</p><p className="text-xl font-bold">{loading ? "..." : `R$ ${report.lucro.toFixed(2)}`}</p></div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Vendas por Dia</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,90%)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => `R$ ${v.toFixed(2)}`} />
                <Bar dataKey="total" fill="hsl(25,95%,53%)" radius={[4, 4, 0, 0]} name="Total" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Receita por Forma de Pagamento</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {paymentData.map(({ name, total }) => (
                <div key={name} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                  <span className="text-sm font-medium">{name}</span>
                  <Badge variant="outline">R$ {total.toFixed(2)}</Badge>
                </div>
              ))}
              {!loading && paymentData.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma receita no período.</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
