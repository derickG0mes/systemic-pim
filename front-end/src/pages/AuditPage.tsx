import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { getLogSistema } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

interface SystemLog {
  idLogSistema: number;
  dataLog: string;
  tipoLog: string;
  descricaoLog: string;
  usuarioLog: string;
}

const PAGE_SIZE = 50;

export default function AuditPage() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [filterInput, setFilterInput] = useState("");
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getLogSistema(page, PAGE_SIZE, filter)
      .then((response) => {
        if (!active) return;
        const data = response?.dados ?? response?.Dados ?? [];
        setLogs(Array.isArray(data) ? data : []);
        setTotal(Number(response?.total ?? 0));
      })
      .catch((error) => {
        if (active) toast({ title: "Erro", description: error instanceof Error ? error.message : "Falha ao carregar os logs.", variant: "destructive" });
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, filter, toast]);

  const applyFilter = (event: React.FormEvent) => {
    event.preventDefault();
    setPage(1);
    setFilter(filterInput.trim());
  };

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Logs de Auditoria</h1>
        <form onSubmit={applyFilter} className="flex gap-2">
          <Input value={filterInput} onChange={(event) => setFilterInput(event.target.value)} placeholder="Filtrar ação ou detalhes" className="w-64" />
          <Button type="submit" variant="outline" size="icon" aria-label="Aplicar filtro"><Search className="h-4 w-4" /></Button>
        </form>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Detalhes</TableHead>
                <TableHead>Usuário</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={4} className="text-center py-10 text-muted-foreground">Carregando logs...</TableCell></TableRow> : logs.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-10 text-muted-foreground"><FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />Nenhum log encontrado.</TableCell></TableRow>
              ) : logs.map(log => (
                <TableRow key={log.idLogSistema}>
                  <TableCell className="text-xs whitespace-nowrap">{new Date(log.dataLog).toLocaleString("pt-BR")}</TableCell>
                  <TableCell><Badge variant="outline">{log.tipoLog}</Badge></TableCell>
                  <TableCell className="text-sm">{log.descricaoLog}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{log.usuarioLog}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{total} registros</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" aria-label="Página anterior" disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)}><ChevronLeft className="h-4 w-4" /></Button>
          <span>Página {page} de {pageCount}</span>
          <Button variant="outline" size="icon" aria-label="Próxima página" disabled={page >= pageCount || loading} onClick={() => setPage((current) => current + 1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>
    </div>
  );
}
