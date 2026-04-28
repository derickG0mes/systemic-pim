import React from "react";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";

export default function AuditPage() {
  const { auditLogs } = useRestaurant();

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">Logs de Auditoria</h1>
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
              {auditLogs.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-10 text-muted-foreground"><FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />Nenhum log registrado. Interaja com o sistema para gerar logs.</TableCell></TableRow>
              ) : auditLogs.map(log => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs whitespace-nowrap">{new Date(log.timestamp).toLocaleString("pt-BR")}</TableCell>
                  <TableCell><Badge variant="outline">{log.action}</Badge></TableCell>
                  <TableCell className="text-sm">{log.details}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{log.userId}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
