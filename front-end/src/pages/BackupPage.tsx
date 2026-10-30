import React, { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Database,
  Download,
  CheckCircle,
  Shield,
  AlertCircle,
  Loader2,
  HardDrive,
  Upload,
} from "lucide-react";
import { gerarBackup, listarBackups, baixarBackup, restaurarBackup } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

interface Backup {
  nomeArquivo: string;
  tamanhoBytes: number;
  dataCriacao: string;
}

export default function BackupPage() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingBackup, setLoadingBackup] = useState(false);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const carregarBackups = useCallback(async () => {
    try {
      setLoadingList(true);
      setError(null);
      const data = await listarBackups();
      setBackups(data?.dados || data || []);
    } catch (err) {
      const mensagem =
        err instanceof Error ? err.message : "Erro ao carregar backups";
      setError(mensagem);
      toast({
        title: "Erro ao carregar backups",
        description: mensagem,
        variant: "destructive",
      });
    } finally {
      setLoadingList(false);
    }
  }, [toast]);

  useEffect(() => {
    void carregarBackups();
  }, [carregarBackups]);

  const handleGerarBackup = async () => {
    try {
      setLoadingBackup(true);
      setError(null);
      const resultado = await gerarBackup();

      toast({
        title: "Backup criado com sucesso!",
        description: `Arquivo: ${resultado?.dados?.nomeArquivo || "backup.zip"}`,
        className: "bg-green-50 border-green-200",
      });

      // Recarregar a lista de backups
      await carregarBackups();
    } catch (err) {
      const mensagem =
        err instanceof Error ? err.message : "Erro ao gerar backup";
      setError(mensagem);
      toast({
        title: "Erro ao gerar backup",
        description: mensagem,
        variant: "destructive",
      });
    } finally {
      setLoadingBackup(false);
    }
  };

  const handleRestaurar = async () => {
    if (!restoreFile) return;
    try {
      setRestoring(true);
      setError(null);
      await restaurarBackup(restoreFile);
      toast({
        title: "Backup restaurado",
        description: "Os dados foram substituídos e o backup anterior foi salvo.",
      });
      setRestoreDialogOpen(false);
      setRestoreFile(null);
      if (restoreInputRef.current) restoreInputRef.current.value = "";
      await carregarBackups();
    } catch (err) {
      const mensagem = err instanceof Error ? err.message : "Erro ao restaurar backup";
      setError(mensagem);
      toast({ title: "Erro ao restaurar backup", description: mensagem, variant: "destructive" });
    } finally {
      setRestoring(false);
    }
  };

  const handleBaixarBackup = async (nomeArquivo: string) => {
    try {
      setDownloadingFile(nomeArquivo);
      setError(null);
      await baixarBackup(nomeArquivo);

      toast({
        title: "Download iniciado",
        description: `${nomeArquivo} está sendo baixado...`,
        className: "bg-blue-50 border-blue-200",
      });
    } catch (err) {
      const mensagem =
        err instanceof Error ? err.message : "Erro ao baixar backup";
      setError(mensagem);
      toast({
        title: "Erro ao baixar backup",
        description: mensagem,
        variant: "destructive",
      });
    } finally {
      setDownloadingFile(null);
    }
  };

  const formatarTamanho = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(2) + " " + sizes[i];
  };

  const formatarData = (data: string) => {
    try {
      return new Date(data).toLocaleString("pt-BR");
    } catch {
      return data;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Backup do Sistema</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gere e gerencie backups completos do sistema
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
          <AlertCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-destructive">Erro</p>
            <p className="text-sm text-destructive/80">{error}</p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Gerar Novo Backup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Crie um backup completo do banco de dados, configurações e logs do
            sistema.
          </p>
          <Button
            onClick={handleGerarBackup}
            disabled={loadingBackup}
            size="lg"
            className="w-full"
          >
            {loadingBackup ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Gerando backup...
              </>
            ) : (
              <>
                <Database className="h-4 w-4 mr-2" />
                Gerar Backup Agora
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Restaurar Backup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Selecione um ZIP gerado pelo sistema. A assinatura de integridade é
            verificada antes da restauração; arquivos ausentes ou adulterados serão rejeitados.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Input
              ref={restoreInputRef}
              type="file"
              accept=".zip,application/zip"
              onChange={(event) => setRestoreFile(event.target.files?.[0] ?? null)}
              className="max-w-md"
            />
            <Button onClick={() => setRestoreDialogOpen(true)} disabled={!restoreFile || restoring}>
              <Upload className="h-4 w-4 mr-2" />
              Restaurar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar restauração</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Os dados atuais do sistema serão substituídos pelo conteúdo de <strong>{restoreFile?.name}</strong>. Um backup automático do estado atual será criado antes da restauração. Essa operação não pode ser desfeita.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRestoreDialogOpen(false)} disabled={restoring}>Cancelar</Button>
            <Button variant="destructive" onClick={() => void handleRestaurar()} disabled={restoring}>
              {restoring ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Restaurando...</> : "Confirmar restauração"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-primary" />
            Backups Existentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingList ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
              <p className="text-muted-foreground">Carregando backups...</p>
            </div>
          ) : backups.length === 0 ? (
            <div className="text-center py-8">
              <HardDrive className="h-12 w-12 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-muted-foreground">Nenhum backup disponível</p>
              <p className="text-sm text-muted-foreground">
                Clique em "Gerar Backup Agora" para criar o primeiro
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {backups.map((backup) => (
                <div
                  key={backup.nomeArquivo}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">{backup.nomeArquivo}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatarData(backup.dataCriacao)} •{" "}
                      {formatarTamanho(backup.tamanhoBytes)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="outline"
                      className="bg-green-50 text-green-700 border-green-200"
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Disponível
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleBaixarBackup(backup.nomeArquivo)}
                      disabled={downloadingFile !== null}
                    >
                      {downloadingFile === backup.nomeArquivo ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-1" />
                          Baixar
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
