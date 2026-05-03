import React, { useState } from "react";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Users, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function UsersPage() {
  const { employees, addEmployee, updateEmployee } = useRestaurant();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "employee" as const, position: "", password: "" });
  const [passwordError, setPasswordError] = useState("");

  const validatePassword = (password: string) => {
    if (!password) {
      setPasswordError("Senha é obrigatória");
      return false;
    }
    if (password.length < 6) {
      setPasswordError("Senha deve ter pelo menos 6 caracteres");
      return false;
    }
    setPasswordError("");
    return true;
  };

  const handleAdd = () => {
    if (!validatePassword(form.password)) return;
    const result = addEmployee({ ...form, active: true });
    toast({ title: result.success ? "Sucesso" : "Erro", description: result.message, variant: result.success ? "default" : "destructive" });
    if (result.success) {
      setForm({ name: "", email: "", role: "employee", position: "", password: "" });
      setPasswordError("");
      setOpen(false);
    }
  };

  const roleLabels = { employee: "Funcionário", admin: "Administrador", owner: "Proprietário" };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gestão de Usuários</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Novo Usuário</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo Usuário</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Nome" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              <Input placeholder="E-mail" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              <Input placeholder="Cargo" value={form.position} onChange={e => setForm({ ...form, position: e.target.value })} />
              <div className="space-y-2">
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Senha" 
                    type="password" 
                    value={form.password} 
                    onChange={e => {
                      setForm({ ...form, password: e.target.value });
                      setPasswordError("");
                    }} 
                    className="pl-10"
                  />
                </div>
                {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
              </div>
              <Select value={form.role} onValueChange={(v: any) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Funcionário</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="owner">Proprietário</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleAdd} className="w-full">Cadastrar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map(e => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" />{e.name}</TableCell>
                  <TableCell>{e.email}</TableCell>
                  <TableCell>{e.position}</TableCell>
                  <TableCell><Badge variant="outline">{roleLabels[e.role]}</Badge></TableCell>
                  <TableCell><Badge className={e.active ? "status-completed" : "status-alert"}>{e.active ? "Ativo" : "Inativo"}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => updateEmployee(e.id, { active: !e.active })}>{e.active ? "Desativar" : "Ativar"}</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
