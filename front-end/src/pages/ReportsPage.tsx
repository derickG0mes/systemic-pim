import React, { useState } from "react";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { DollarSign, Receipt, CreditCard } from "lucide-react";

export default function ReportsPage() {
  const { tabs, dailySales } = useRestaurant();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  const closedTabs = tabs.filter(t => t.status === "closed" && t.closedAt);
  const totalRevenue = closedTabs.reduce((s, t) => s + t.total, 0);

  const dailyData: Record<string, number> = {};
  closedTabs.forEach(t => {
    const day = new Date(t.closedAt!).toLocaleDateString("pt-BR");
    dailyData[day] = (dailyData[day] || 0) + t.total;
  });
  const chartData = Object.entries(dailyData).map(([date, total]) => ({ date, total }));

  const paymentLabels: Record<string, string> = { pix: "Pix", credit: "Crédito", debit: "Débito", cash: "Dinheiro" };

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
            <div><p className="text-xs text-muted-foreground">Receita Total</p><p className="text-xl font-bold">R$ {totalRevenue.toFixed(2)}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10 text-success"><Receipt className="h-5 w-5" /></div>
            <div><p className="text-xs text-muted-foreground">Comandas Fechadas</p><p className="text-xl font-bold">{closedTabs.length}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning/10 text-warning"><CreditCard className="h-5 w-5" /></div>
            <div><p className="text-xs text-muted-foreground">Comandas Abertas</p><p className="text-xl font-bold">{dailySales.openTabs}</p></div>
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
          <CardHeader><CardTitle className="text-base">Vendas por Pagamento</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(dailySales.byMethod).map(([method, value]) => (
                <div key={method} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                  <span className="text-sm font-medium">{paymentLabels[method]}</span>
                  <Badge variant="outline">R$ {value.toFixed(2)}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
