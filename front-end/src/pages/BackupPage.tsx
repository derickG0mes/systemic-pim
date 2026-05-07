import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Database, Download, CheckCircle, Shield } from "lucide-react";

export default function BackupPage() {
  const [backups, setBackups] = useState<{ id: string; date: Date; size: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const createBackup = () => {
    setLoading(true);
    setSuccess(false);
    setTimeout(() => {
      setBackups(prev => [...prev, {
        id: `bk_${Date.now()}`,
        date: new Date(),
        size: `${(Math.random() * 50 + 10).toFixed(1)} MB`,
      }]);
      setLoading(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }, 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">Backup</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Shield className="h-5 w-5 text-primary" />Backup Manual</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Gere um backup completo do sistema. Os dados são protegidos com criptografia simulada.</p>
          <Button onClick={createBackup} disabled={loading}>
            <Database className="h-4 w-4 mr-2" />
            {loading ? "Gerando backup..." : "Gerar Backup"}
          </Button>
          {success && (
            <div className="flex items-center gap-2 text-success bg-success/10 p-3 rounded-lg">
              <CheckCircle className="h-5 w-5" />
              <span className="text-sm font-medium">Backup criado com sucesso!</span>
            </div>
          )}
        </CardContent>
      </Card>
      {backups.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Backups Anteriores</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {backups.map(b => (
                <div key={b.id} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                  <div>
                    <p className="text-sm font-medium">{new Date(b.date).toLocaleString("pt-BR")}</p>
                    <p className="text-xs text-muted-foreground">{b.size} • Criptografado</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="status-completed">Protegido</Badge>
                    <Button size="sm" variant="outline"><Download className="h-3 w-3" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
