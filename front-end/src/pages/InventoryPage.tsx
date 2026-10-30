import React, { useState } from "react";
import { useRestaurant } from "@/contexts/useRestaurant";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, AlertTriangle, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = ["Carnes", "Peixes", "Massas", "Bebidas", "Sobremesas", "Saladas", "Entradas"];

export default function InventoryPage() {
  const { products, addProduct, adjustProductStock } = useRestaurant();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<(typeof products)[number] | null>(null);
  const [adjustment, setAdjustment] = useState({ tipo: "REMOVER" as "ADICIONAR" | "REMOVER", quantidade: "", motivo: "" });
  const [adjusting, setAdjusting] = useState(false);
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

  const handleAdjust = async () => {
    const quantity = Number.parseInt(adjustment.quantidade, 10);
    if (!selectedProduct || quantity < 1 || !adjustment.motivo.trim()) {
      toast({ title: "Ajuste inválido", description: "Informe uma quantidade positiva e o motivo do ajuste.", variant: "destructive" });
      return;
    }

    setAdjusting(true);
    try {
      const result = await adjustProductStock(selectedProduct.id, { ...adjustment, quantidade: quantity, motivo: adjustment.motivo.trim() });
      toast({ title: "Estoque ajustado", description: `Quantidade: ${result.quantidadeAnterior} → ${result.quantidadeNova}` });
      setSelectedProduct(null);
      setAdjustment({ tipo: "REMOVER", quantidade: "", motivo: "" });
    } catch (error) {
      toast({ title: "Erro", description: error instanceof Error ? error.message : "Falha ao ajustar estoque.", variant: "destructive" });
    } finally {
      setAdjusting(false);
    }
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
          <div>
            <Table aria-label="Produtos do estoque">
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
                      <Button size="sm" variant="outline" onClick={() => setSelectedProduct(p)}>Ajustar</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedProduct} onOpenChange={(isOpen) => !isOpen && setSelectedProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajustar estoque: {selectedProduct?.name}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Quantidade atual: {selectedProduct?.stock}</p>
          <div className="space-y-3">
            <Select value={adjustment.tipo} onValueChange={(tipo: "ADICIONAR" | "REMOVER") => setAdjustment({ ...adjustment, tipo })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ADICIONAR">Adicionar (entrada)</SelectItem>
                <SelectItem value="REMOVER">Remover (baixa)</SelectItem>
              </SelectContent>
            </Select>
            <Input type="number" min="1" placeholder="Quantidade" value={adjustment.quantidade} onChange={(event) => setAdjustment({ ...adjustment, quantidade: event.target.value })} />
            <Input placeholder="Motivo do ajuste" value={adjustment.motivo} onChange={(event) => setAdjustment({ ...adjustment, motivo: event.target.value })} />
            <Button className="w-full" onClick={handleAdjust} disabled={adjusting}>
              {adjusting ? "Processando..." : "Confirmar ajuste"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
