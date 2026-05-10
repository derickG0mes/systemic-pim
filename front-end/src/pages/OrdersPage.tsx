import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useRestaurant, OrderStatus } from "@/contexts/RestaurantContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Clock, AlertTriangle, Plus, ChefHat, MapPin, Minus, Trash2 } from "lucide-react";

export default function OrdersPage() {
  const { orders, products, addOrder, editOrder, updateOrderStatus, tabs } =
    useRestaurant();
  const { user } = useAuth();
  const [, setTick] = useState(0);
  const [newOrderOpen, setNewOrderOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState("");
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [cart, setCart] = useState<
    {
      productId: string;
      productName: string;
      quantity: number;
      price: number;
    }[]
  >([]);
  const [filter, setFilter] = useState<"all" | OrderStatus>("all");
  const [searchParams, setSearchParams] = useSearchParams();

  // ✅ Mesas com comandas abertas
  const availableTables = useMemo(() => {
    const openTables = tabs
      .filter((tab) => tab.status === "open")
      .map((t) => t.tableNumber);
    return openTables.sort((a, b) => a - b);
  }, [tabs]);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const newOrderTable = searchParams.get("newOrder");
    if (newOrderTable && availableTables.includes(Number(newOrderTable))) {
      setSelectedTable(newOrderTable);
      setNewOrderOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [availableTables, searchParams, setSearchParams]);

  const selectedPreparingOrder = selectedTable
    ? orders.find(
        (o) =>
          o.tableNumber === Number(selectedTable) &&
          o.status === "preparing",
      )
    : undefined;

  const getElapsedMinutes = (date: Date) =>
    Math.floor((Date.now() - new Date(date).getTime()) / 60000);

  const statusLabel: Record<OrderStatus, string> = {
    preparing: "Preparar",
    in_progress: "Em Andamento",
    completed: "Concluído",
  };
  const statusClass: Record<OrderStatus, string> = {
    preparing: "status-preparing",
    in_progress: "status-in-progress",
    completed: "status-completed",
  };
  const nextStatus: Record<string, OrderStatus> = {
    preparing: "in_progress",
    in_progress: "completed",
  };

  const addToCart = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === productId);
      if (existing)
        return prev.map((i) =>
          i.productId === productId ? { ...i, quantity: i.quantity + 1 } : i,
        );
      return [
        ...prev,
        {
          productId,
          productName: product.name,
          quantity: 1,
          price: product.price,
        },
      ];
    });
  };

  const openCreateOrder = () => {
    setEditingOrderId(null);
    setCart([]);
    setNewOrderOpen(true);
  };

  const openEditOrder = () => {
    if (!selectedPreparingOrder) return;
    setEditingOrderId(selectedPreparingOrder.id);
    setCart(selectedPreparingOrder.items);
    setNewOrderOpen(true);
  };

  const decrementCartItem = (productId: string) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.productId === productId
            ? { ...item, quantity: Math.max(1, item.quantity - 1) }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const submitOrder = () => {
    // ✅ Validações robustas
    if (!selectedTable) {
      alert("Selecione uma mesa com comanda aberta");
      return;
    }

    if (cart.length === 0) {
      alert("Adicione pelo menos um item ao carrinho");
      return;
    }

    const tableNum = parseInt(selectedTable);

    // Validar que a mesa existe na lista de abertos
    if (!availableTables.includes(tableNum)) {
      alert("Essa mesa não tem comanda aberta");
      return;
    }

    // Validar items
    if (cart.some((item) => item.quantity <= 0 || item.price <= 0)) {
      alert("Quantidade e preço devem ser maiores que 0");
      return;
    }

    // ✅ Calcular total com precisão
    const total = cart.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    if (total <= 0) {
      alert("Total do pedido deve ser maior que zero");
      return;
    }

    if (editingOrderId) {
      editOrder(editingOrderId, cart);
    } else {
      addOrder({
        tableNumber: tableNum,
        items: cart,
        status: "preparing",
        createdBy: user?.name || "Sistema",
        total, // ✅ Garantir que total é sempre passado
      });
    }

    // Reset do formulário
    setCart([]);
    setSelectedTable("");
    setEditingOrderId(null);
    setNewOrderOpen(false);
  };

  const filtered =
    filter === "all" ? orders : orders.filter((o) => o.status === filter);
  const sorted = [...filtered].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Pedidos</h1>
        <div className="flex gap-2 flex-wrap">
          <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="preparing">Preparar</SelectItem>
              <SelectItem value="in_progress">Em Andamento</SelectItem>
              <SelectItem value="completed">Concluídos</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={openCreateOrder}
            disabled={availableTables.length === 0}
          >
            <Plus className="h-4 w-4 mr-1" />
            Criar Novo Pedido
          </Button>
          {selectedPreparingOrder && (
            <Button
              variant="outline"
              onClick={openEditOrder}
            >
              Editar Comanda
            </Button>
          )}
          <Dialog open={newOrderOpen} onOpenChange={setNewOrderOpen}>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingOrderId ? "Editar Comanda" : "Novo Pedido"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* ✅ Seletor visual de mesas com comanda aberta */}
                <div>
                  <label className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Selecione uma Mesa com Comanda Aberta
                  </label>
                  {availableTables.length > 0 ? (
                    <div className="grid grid-cols-4 gap-2">
                      {availableTables.map((tableNum) => (
                        <Button
                          key={tableNum}
                          variant={
                            selectedTable === String(tableNum)
                              ? "default"
                              : "outline"
                          }
                          className="h-auto py-3 flex flex-col items-center"
                          onClick={() => setSelectedTable(String(tableNum))}
                        >
                          <span className="text-lg font-bold">{tableNum}</span>
                          <span className="text-xs opacity-70">Mesa</span>
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 bg-muted rounded-md text-center text-sm text-muted-foreground">
                      Nenhuma mesa com comanda aberta. Abra uma comanda
                      primeiro.
                    </div>
                  )}
                </div>

                {/* Produtos para adicionar */}
                {selectedTable && (
                  <div>
                    <label className="text-sm font-semibold mb-2 block">
                      Produtos Disponíveis
                    </label>
                    <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-2">
                      {products
                        .filter((p) => p.stock > 0)
                        .map((p) => (
                          <div
                            key={p.id}
                            className="flex items-center justify-between p-2 rounded-md bg-muted"
                          >
                            <div className="flex-1">
                              <p className="text-sm font-medium">{p.name}</p>
                              <p className="text-xs text-muted-foreground">
                                R$ {p.price.toFixed(2)} | Estoque: {p.stock}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => addToCart(p.id)}
                            >
                              {cart.find((i) => i.productId === p.id)
                                ?.quantity || 0}{" "}
                              <Plus className="h-3 w-3 ml-1" />
                            </Button>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Carrinho */}
                {cart.length > 0 && (
                  <div className="border-t pt-3">
                    <label className="text-sm font-semibold mb-2 block">
                      Itens no Carrinho
                    </label>
                    <div className="space-y-2 max-h-40 overflow-y-auto mb-3">
                      {cart.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex flex-col gap-2 p-2 bg-muted rounded-md"
                        >
                          <div className="flex justify-between items-start gap-4">
                            <div>
                              <p className="text-sm font-medium">
                                {item.productName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                R$ {item.price.toFixed(2)} cada
                              </p>
                            </div>
                            <button
                              type="button"
                              className="text-destructive"
                              onClick={() => removeFromCart(item.productId)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => decrementCartItem(item.productId)}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <span className="font-semibold">{item.quantity}</span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => addToCart(item.productId)}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                            <p className="font-semibold">
                              R$ {(item.quantity * item.price).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="bg-primary/10 p-3 rounded-md">
                      <p className="text-lg font-bold">
                        Total: R${" "}
                        {cart
                          .reduce((s, i) => s + i.price * i.quantity, 0)
                          .toFixed(2)}
                      </p>
                    </div>
                  </div>
                )}

                <Button
                  onClick={submitOrder}
                  disabled={!selectedTable || cart.length === 0}
                  className="w-full"
                  size="lg"
                >
                  Criar Pedido
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {sorted.map((order) => {
          const elapsed = getElapsedMinutes(order.createdAt);
          const isAlert = order.status !== "completed" && elapsed > 40;
          return (
            <Card
              key={order.id}
              className={isAlert ? "border-destructive shadow-md" : ""}
            >
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <ChefHat className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">
                    Mesa {order.tableNumber}
                  </CardTitle>
                </div>
                <Badge className={statusClass[order.status]}>
                  {statusLabel[order.status]}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span>
                        {item.quantity}x {item.productName}
                      </span>
                      <span className="text-muted-foreground">
                        R$ {(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between border-t pt-2">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{elapsed} min</span>
                    {isAlert && (
                      <AlertTriangle className="h-3 w-3 text-destructive ml-1" />
                    )}
                  </div>
                  <p className="font-semibold">R$ {order.total.toFixed(2)}</p>
                </div>
                {order.status !== "completed" && (
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() =>
                      updateOrderStatus(order.id, nextStatus[order.status])
                    }
                  >
                    Avançar → {statusLabel[nextStatus[order.status]]}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
        {sorted.length === 0 && (
          <p className="text-muted-foreground col-span-full text-center py-10">
            Nenhum pedido encontrado
          </p>
        )}
      </div>
    </div>
  );
}
