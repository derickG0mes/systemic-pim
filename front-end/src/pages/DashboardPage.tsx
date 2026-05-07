import React, { useEffect, useState } from "react";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { DollarSign, TrendingUp, AlertTriangle, ShoppingCart } from "lucide-react";

const COLORS = ["hsl(25,95%,53%)", "hsl(142,71%,45%)", "hsl(217,91%,60%)", "hsl(280,65%,60%)"];

export default function DashboardPage() {
  const { products, orders, dailySales } = useRestaurant();
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const completedOrders = orders.filter(o => o.status === "completed");
  const revenue = completedOrders.reduce((s, o) => s + o.total, 0);
  const expenses = revenue * 0.35;
  const profit = revenue - expenses;
  const lossPercent = revenue > 0 ? ((expenses * 0.15) / revenue) * 100 : 0;

  const productSales: Record<string, number> = {};
  completedOrders.forEach(o => o.items.forEach(i => {
    productSales[i.productName] = (productSales[i.productName] || 0) + i.quantity;
  }));
  const topProducts = Object.entries(productSales).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, qty]) => ({ name, qty }));

  const paymentData = Object.entries(dailySales.byMethod).filter(([, v]) => v > 0).map(([method, value]) => ({
    name: method === "pix" ? "Pix" : method === "credit" ? "Crédito" : method === "debit" ? "Débito" : "Dinheiro",
    value,
  }));

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
        <StatCard title="Perdas %" value={`${lossPercent.toFixed(1)}%`} icon={<AlertTriangle className="h-5 w-5" />} color={lossPercent > 20 ? "text-destructive" : "text-warning"} alert={lossPercent > 20} />
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

      {lossPercent > 20 && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <div>
              <p className="font-semibold text-destructive">Alerta de Perdas</p>
              <p className="text-sm text-muted-foreground">As perdas ultrapassaram 20% da receita. Verifique o estoque e operações.</p>
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
