import React, { useState } from "react";
import { useRestaurant, PaymentMethod } from "@/contexts/RestaurantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Banknote, QrCode, Smartphone, Plus } from "lucide-react";

const TABLES = Array.from({ length: 20 }, (_, i) => i + 1);

const paymentIcons: Record<PaymentMethod, React.ReactNode> = {
  pix: <QrCode className="h-4 w-4" />,
  credit: <CreditCard className="h-4 w-4" />,
  debit: <Smartphone className="h-4 w-4" />,
  cash: <Banknote className="h-4 w-4" />,
};
const paymentLabels: Record<PaymentMethod, string> = { pix: "Pix", credit: "Crédito", debit: "Débito", cash: "Dinheiro" };

export default function TabsPage() {
  const { tabs, orders, openTab, closeTab, markTabUnpaid } = useRestaurant();
  const [closingTab, setClosingTab] = useState<string | null>(null);
  const [payMethod, setPayMethod] = useState<PaymentMethod>("pix");

  const getTabForTable = (table: number) => tabs.find(t => t.tableNumber === table && t.status === "open");

  const handleClose = () => {
    if (closingTab) {
      closeTab(closingTab, payMethod);
      setClosingTab(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">Comandas</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {TABLES.map(table => {
          const tab = getTabForTable(table);
          return (
            <Card key={table} className={`cursor-pointer transition-all hover:shadow-md ${tab ? "border-primary/50 bg-accent/30" : "opacity-70"}`}>
              <CardContent className="p-4 text-center space-y-2">
                <p className="text-2xl font-bold">{table}</p>
                <p className="text-xs text-muted-foreground">Mesa</p>
                {tab ? (
                  <>
                    <Badge className="status-in-progress">Aberta</Badge>
                    <p className="text-sm font-semibold">R$ {tab.total.toFixed(2)}</p>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => setClosingTab(tab.id)}>Fechar</Button>
                      <Button size="sm" variant="ghost" className="text-xs" onClick={() => markTabUnpaid(tab.id)}>Não Pago</Button>
                    </div>
                  </>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => openTab(table)} className="w-full">
                    <Plus className="h-3 w-3 mr-1" />Abrir
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Comandas Recentes</h2>
        <div className="space-y-2">
          {tabs.filter(t => t.status !== "open").slice(-10).reverse().map(tab => (
            <Card key={tab.id}>
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-medium">Mesa {tab.tableNumber}</span>
                  <Badge variant={tab.status === "closed" ? "default" : "destructive"}>
                    {tab.status === "closed" ? "Pago" : "Não Pago"}
                  </Badge>
                </div>
                <div className="flex items-center gap-3">
                  {tab.paymentMethod && <span className="flex items-center gap-1 text-sm text-muted-foreground">{paymentIcons[tab.paymentMethod]} {paymentLabels[tab.paymentMethod]}</span>}
                  <span className="font-semibold">R$ {tab.total.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={!!closingTab} onOpenChange={() => setClosingTab(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Fechar Comanda</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Selecione o método de pagamento:</p>
            <Select value={payMethod} onValueChange={(v: PaymentMethod) => setPayMethod(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(paymentLabels) as PaymentMethod[]).map(m => (
                  <SelectItem key={m} value={m}>{paymentLabels[m]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button onClick={handleClose} className="flex-1">Confirmar Pagamento</Button>
              <Button variant="outline" onClick={() => setClosingTab(null)}>Cancelar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
