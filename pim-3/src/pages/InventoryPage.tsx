import React, { useState } from "react";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, AlertTriangle, Package } from "lucide-react";

const CATEGORIES = ["Carnes", "Peixes", "Massas", "Bebidas", "Sobremesas", "Saladas", "Entradas"];

export default function InventoryPage() {
  const { products, addProduct, updateProduct } = useRestaurant();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Bebidas");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [minStock, setMinStock] = useState("5");
  const [filterCat, setFilterCat] = useState("all");

  const handleAdd = () => {
    if (!name || !price || !stock) return;
    addProduct({ name, category, price: parseFloat(price), stock: parseInt(stock), minStock: parseInt(minStock) });
    setName(""); setPrice(""); setStock(""); setMinStock("5");
    setOpen(false);
  };

  const filtered = filterCat === "all" ? products : products.filter(p => p.category === filterCat);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Estoque & Produtos</h1>
        <div className="flex gap-2">
          <Select value={filterCat} onValueChange={setFilterCat}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Produto</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo Produto</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Nome" value={name} onChange={e => setName(e.target.value)} />
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
                <Input placeholder="Preço" type="number" value={price} onChange={e => setPrice(e.target.value)} />
                <Input placeholder="Estoque" type="number" value={stock} onChange={e => setStock(e.target.value)} />
                <Input placeholder="Estoque Mín." type="number" value={minStock} onChange={e => setMinStock(e.target.value)} />
                <Button onClick={handleAdd} className="w-full">Cadastrar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Preço</TableHead>
                  <TableHead className="text-right">Estoque</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium flex items-center gap-2"><Package className="h-4 w-4 text-muted-foreground" />{p.name}</TableCell>
                    <TableCell><Badge variant="outline">{p.category}</Badge></TableCell>
                    <TableCell className="text-right">R$ {p.price.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{p.stock}</TableCell>
                    <TableCell>
                      {p.stock <= p.minStock ? (
                        <Badge className="status-alert"><AlertTriangle className="h-3 w-3 mr-1" />Baixo</Badge>
                      ) : (
                        <Badge className="status-completed">OK</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => updateProduct(p.id, { stock: p.stock + 10 })}>+10</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
