import React, { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Users, Lock, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createFuncionario, desativarFuncionario, getFuncionarios, updateFuncionario } from "@/services/api";

type Role = "employee" | "admin" | "owner";

interface Funcionario {
  idFuncionario: number;
  nomeFuncionario: string;
  emailFuncionario: string;
  cpfFuncionario: string;
  telefoneFuncionario: string;
  cargoFuncionario: string;
  role: Role;
  statusFuncionario: string;
}

const emptyForm = { nomeFuncionario: "", cpfFuncionario: "", telefoneFuncionario: "", cargoFuncionario: "", emailFuncionario: "", role: "employee" as Role, senha: "" };

export default function UsersPage() {
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Funcionario[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Funcionario | null>(null);
  const [form, setForm] = useState(emptyForm);

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getFuncionarios();
      const data = response?.dados ?? response?.Dados ?? response;
      setEmployees(Array.isArray(data) ? data : []);
    } catch (error) {
      toast({ title: "Erro", description: error instanceof Error ? error.message : "Falha ao carregar funcionários.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { void loadEmployees(); }, [loadEmployees]);

  const beginCreate = () => {
    setSelectedEmployee(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const beginEdit = (employee: Funcionario) => {
    setSelectedEmployee(employee);
    setForm({
      nomeFuncionario: employee.nomeFuncionario,
      cpfFuncionario: employee.cpfFuncionario,
      telefoneFuncionario: employee.telefoneFuncionario ?? "",
      cargoFuncionario: employee.cargoFuncionario ?? "",
      emailFuncionario: employee.emailFuncionario ?? "",
      role: employee.role,
      senha: "",
    });
    setOpen(true);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    const cpf = form.cpfFuncionario.replace(/\D/g, "");
    if (!form.nomeFuncionario.trim() || cpf.length !== 11 || (!selectedEmployee && form.senha.length < 6)) {
      toast({ title: "Dados inválidos", description: "Informe nome, CPF com 11 dígitos e uma senha de pelo menos 6 caracteres ao cadastrar.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const payload = { ...form, nomeFuncionario: form.nomeFuncionario.trim(), cpfFuncionario: cpf };
      if (selectedEmployee) {
        await updateFuncionario(String(selectedEmployee.idFuncionario), payload);
      } else {
        await createFuncionario(payload);
      }
      toast({ title: "Sucesso", description: selectedEmployee ? "Funcionário atualizado." : "Funcionário cadastrado." });
      setOpen(false);
      await loadEmployees();
    } catch (error) {
      toast({ title: "Erro", description: error instanceof Error ? error.message : "Falha ao salvar funcionário.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (employee: Funcionario) => {
    if (!window.confirm(`Desativar ${employee.nomeFuncionario}?`)) return;
    try {
      await desativarFuncionario(String(employee.idFuncionario));
      toast({ title: "Funcionário desativado", description: employee.nomeFuncionario });
      await loadEmployees();
    } catch (error) {
      toast({ title: "Erro", description: error instanceof Error ? error.message : "Falha ao desativar funcionário.", variant: "destructive" });
    }
  };

  const roleLabels: Record<Role, string> = { employee: "Funcionário", admin: "Administrador", owner: "Proprietário" };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gestão de Usuários</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={beginCreate}><Plus className="h-4 w-4 mr-1" />Novo Usuário</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{selectedEmployee ? "Editar funcionário" : "Novo funcionário"}</DialogTitle></DialogHeader>
            <form onSubmit={handleSave} className="space-y-3">
              <Input placeholder="Nome" value={form.nomeFuncionario} onChange={e => setForm({ ...form, nomeFuncionario: e.target.value })} required />
              <Input placeholder="CPF (11 dígitos)" value={form.cpfFuncionario} onChange={e => setForm({ ...form, cpfFuncionario: e.target.value.replace(/\D/g, "").slice(0, 11) })} required disabled={!!selectedEmployee} />
              <Input placeholder="E-mail" type="email" value={form.emailFuncionario} onChange={e => setForm({ ...form, emailFuncionario: e.target.value })} />
              <Input placeholder="Telefone" value={form.telefoneFuncionario} onChange={e => setForm({ ...form, telefoneFuncionario: e.target.value })} />
              <Input placeholder="Cargo" value={form.cargoFuncionario} onChange={e => setForm({ ...form, cargoFuncionario: e.target.value })} />
              {!selectedEmployee && <div className="relative"><Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Senha (mínimo 6 caracteres)" type="password" value={form.senha} onChange={e => setForm({ ...form, senha: e.target.value })} className="pl-10" required minLength={6} /></div>}
              <Select value={form.role} onValueChange={(role: Role) => setForm({ ...form, role })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="employee">Funcionário</SelectItem><SelectItem value="admin">Administrador</SelectItem><SelectItem value="owner">Proprietário</SelectItem></SelectContent>
              </Select>
              <Button type="submit" className="w-full" disabled={saving}>{saving ? "Salvando..." : selectedEmployee ? "Salvar alterações" : "Cadastrar"}</Button>
            </form>
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
              {loading ? <TableRow><TableCell colSpan={6} className="text-center">Carregando funcionários...</TableCell></TableRow> : employees.map(e => (
                <TableRow key={e.idFuncionario}>
                  <TableCell className="font-medium flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" />{e.nomeFuncionario}</TableCell>
                  <TableCell>{e.emailFuncionario}</TableCell>
                  <TableCell>{e.cargoFuncionario}</TableCell>
                  <TableCell><Badge variant="outline">{roleLabels[e.role] ?? e.role}</Badge></TableCell>
                  <TableCell><Badge className={e.statusFuncionario === "ATIVO" ? "status-completed" : "status-alert"}>{e.statusFuncionario === "ATIVO" ? "Ativo" : "Inativo"}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => beginEdit(e)} aria-label={`Editar ${e.nomeFuncionario}`}><Pencil className="h-4 w-4" /></Button>
                    {e.statusFuncionario === "ATIVO" && <Button size="sm" variant="ghost" onClick={() => void handleDeactivate(e)}>Desativar</Button>}
                  </TableCell>
                </TableRow>
              ))}
              {!loading && employees.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Nenhum funcionário cadastrado.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
