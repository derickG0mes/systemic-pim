import React, { useState, useEffect } from "react";
import { useRestaurant, OrderStatus } from "@/contexts/RestaurantContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Clock, AlertTriangle, Plus, ChefHat } from "lucide-react";

export default function OrdersPage() {
  const { orders, products, addOrder, updateOrderStatus, tabs } = useRestaurant();
  const { user } = useAuth();
  const [, setTick] = useState(0);
  const [newOrderOpen, setNewOrderOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState("");
  const [cart, setCart] = useState<{ productId: string; productName: string; quantity: number; price: number }[]>([]);
  const [filter, setFilter] = useState<"all" | OrderStatus>("all");

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 5000);
    return () => clearInterval(interval);
  }, []);

  const getElapsedMinutes = (date: Date) => Math.floor((Date.now() - new Date(date).getTime()) / 60000);

  const statusLabel: Record<OrderStatus, string> = { preparing: "Preparar", in_progress: "Em Andamento", completed: "Concluído" };
  const statusClass: Record<OrderStatus, string> = { preparing: "status-preparing", in_progress: "status-in-progress", completed: "status-completed" };
  const nextStatus: Record<string, OrderStatus> = { preparing: "in_progress", in_progress: "completed" };

  const addToCart = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    setCart(prev => {
      const existing = prev.find(i => i.productId === productId);
      if (existing) return prev.map(i => i.productId === productId ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { productId, productName: product.name, quantity: 1, price: product.price }];
    });
  };

  const submitOrder = () => {
    if (!selectedTable || cart.length === 0) return;
    const tableNum = parseInt(selectedTable);
    addOrder({
      tableNumber: tableNum,
      items: cart,
      status: "preparing",
      createdBy: user?.name || "Sistema",
      total: cart.reduce((s, i) => s + i.price * i.quantity, 0),
    });
    setCart([]);
    setSelectedTable("");
    setNewOrderOpen(false);
  };

  const filtered = filter === "all" ? orders : orders.filter(o => o.status === filter);
  const sorted = [...filtered].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Pedidos</h1>
        <div className="flex gap-2">
          <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="preparing">Preparar</SelectItem>
              <SelectItem value="in_progress">Em Andamento</SelectItem>
              <SelectItem value="completed">Concluídos</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={newOrderOpen} onOpenChange={setNewOrderOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" />Novo Pedido</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Novo Pedido</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <Input placeholder="Número da Mesa" type="number" value={selectedTable} onChange={e => setSelectedTable(e.target.value)} />
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {products.filter(p => p.stock > 0).map(p => (
                    <div key={p.id} className="flex items-center justify-between p-2 rounded-md bg-muted">
                      <div>
                        <p className="text-sm font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">R$ {p.price.toFixed(2)}</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => addToCart(p.id)}>
                        {cart.find(i => i.productId === p.id)?.quantity || 0} <Plus className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  ))}
                </div>
                {cart.length > 0 && (
                  <div className="border-t pt-2">
                    <p className="text-sm font-semibold">Total: R$ {cart.reduce((s, i) => s + i.price * i.quantity, 0).toFixed(2)}</p>
                  </div>
                )}
                <Button onClick={submitOrder} disabled={!selectedTable || cart.length === 0} className="w-full">Criar Pedido</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {sorted.map(order => {
          const elapsed = getElapsedMinutes(order.createdAt);
          const isAlert = order.status !== "completed" && elapsed > 40;
          return (
            <Card key={order.id} className={isAlert ? "border-destructive shadow-md" : ""}>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <ChefHat className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">Mesa {order.tableNumber}</CardTitle>
                </div>
                <Badge className={statusClass[order.status]}>{statusLabel[order.status]}</Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span>{item.quantity}x {item.productName}</span>
                      <span className="text-muted-foreground">R$ {(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between border-t pt-2">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{elapsed} min</span>
                    {isAlert && <AlertTriangle className="h-3 w-3 text-destructive ml-1" />}
                  </div>
                  <p className="font-semibold">R$ {order.total.toFixed(2)}</p>
                </div>
                {order.status !== "completed" && (
                  <Button size="sm" className="w-full" onClick={() => updateOrderStatus(order.id, nextStatus[order.status])}>
                    Avançar → {statusLabel[nextStatus[order.status]]}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
        {sorted.length === 0 && <p className="text-muted-foreground col-span-full text-center py-10">Nenhum pedido encontrado</p>}
      </div>
    </div>
  );
}
