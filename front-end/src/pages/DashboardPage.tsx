import React, { useEffect, useState } from "react";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { DollarSign, TrendingUp, AlertTriangle, ShoppingCart } from "lucide-react";
import { getFaturamento, getReceitaPorForma } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

const COLORS = ["hsl(25,95%,53%)", "hsl(142,71%,45%)", "hsl(217,91%,60%)", "hsl(280,65%,60%)"];

interface PaymentRevenue {
  formaPagemento?: string;
  formaPagamento?: string;
  total: number;
}

export default function DashboardPage() {
  const { orders } = useRestaurant();
  const { toast } = useToast();
  const [finance, setFinance] = useState({ receita: 0, despesas: 0, lucro: 0 });
  const [paymentData, setPaymentData] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    const loadFinance = async () => {
      const date = new Date().toISOString().split("T")[0];
      const start = `${date}T00:00:00`;
      const end = `${date}T23:59:59.999`;
      try {
        const [summaryResponse, paymentsResponse] = await Promise.all([
          getFaturamento(),
          getReceitaPorForma(start, end),
        ]);
        const summary = summaryResponse?.dados ?? summaryResponse?.Dados ?? summaryResponse;
        const payments = paymentsResponse?.dados ?? paymentsResponse?.Dados ?? paymentsResponse;
        setFinance({
          receita: Number(summary?.receita ?? 0),
          despesas: Number(summary?.despesas ?? 0),
          lucro: Number(summary?.lucro ?? 0),
        });
        setPaymentData(Array.isArray(payments) ? payments.map((payment: PaymentRevenue) => ({
          name: payment.formaPagemento ?? payment.formaPagamento ?? "Outros",
          value: Number(payment.total ?? 0),
        })) : []);
      } catch (error) {
        toast({ title: "Erro", description: error instanceof Error ? error.message : "Falha ao carregar o faturamento.", variant: "destructive" });
      }
    };
    void loadFinance();
    const interval = setInterval(() => void loadFinance(), 60000);
    return () => clearInterval(interval);
  }, [toast]);

  const completedOrders = orders.filter(o => o.status === "completed");
  const revenue = finance.receita;
  const expenses = finance.despesas;
  const profit = finance.lucro;
  const expensePercent = revenue > 0 ? (expenses / revenue) * 100 : 0;

  const productSales: Record<string, number> = {};
  completedOrders.forEach(o => o.items.forEach(i => {
    productSales[i.productName] = (productSales[i.productName] || 0) + i.quantity;
  }));
  const topProducts = Object.entries(productSales).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, qty]) => ({ name, qty }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Badge variant="outline" className="text-xs">Atualiza a cada 60s</Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Vendas do Dia" value={`R$ ${revenue.toFixed(2)}`} icon={<DollarSign className="h-5 w-5" />} color="text-primary" />
        <StatCard title="Lucro Líquido" value={`R$ ${profit.toFixed(2)}`} icon={<TrendingUp className="h-5 w-5" />} color="text-success" />
        <StatCard title="Pedidos Completos" value={String(completedOrders.length)} icon={<ShoppingCart className="h-5 w-5" />} color="text-info" />
        <StatCard title="Despesas / Receita" value={`${expensePercent.toFixed(1)}%`} icon={<AlertTriangle className="h-5 w-5" />} color={expensePercent > 20 ? "text-destructive" : "text-warning"} alert={expensePercent > 20} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Produtos Mais Vendidos</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProducts}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,90%)" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="qty" fill="hsl(25,95%,53%)" radius={[4, 4, 0, 0]} name="Qtd" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Vendas por Pagamento</CardTitle></CardHeader>
          <CardContent className="h-64 flex items-center justify-center">
            {paymentData.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhuma venda fechada hoje</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={paymentData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value" label={({ name, value }) => `${name}: R$${value.toFixed(0)}`}>
                    {paymentData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {expensePercent > 20 && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <div>
              <p className="font-semibold text-destructive">Alerta de Despesas</p>
              <p className="text-sm text-muted-foreground">As despesas ultrapassaram 20% da receita.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({ title, value, icon, color, alert }: { title: string; value: string; icon: React.ReactNode; color: string; alert?: boolean }) {
  return (
    <Card className={alert ? "border-destructive animate-pulse" : ""}>
      <CardContent className="p-4 flex items-center gap-4">
        <div className={`p-2 rounded-lg bg-muted ${color}`}>{icon}</div>
        <div>
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
