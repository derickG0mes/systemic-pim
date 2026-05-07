import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Accessibility, Hand } from "lucide-react";
import { useAccessibility } from "@/contexts/AccessibilityContext";

export default function AccessibilityPage() {
  const { vlibrasEnabled, setVlibrasEnabled } = useAccessibility();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Accessibility className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Acessibilidade</h1>
          <p className="text-sm text-muted-foreground">
            Configure recursos para tornar o sistema mais inclusivo.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <Hand className="w-5 h-5 text-primary mt-1" />
            <div>
              <CardTitle>Assistente de LIBRAS (VLibras)</CardTitle>
              <CardDescription>
                Tradutor oficial do Governo Federal que converte conteúdo textual da interface para a
                Língua Brasileira de Sinais por meio de um avatar 3D.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5 pr-4">
              <Label htmlFor="vlibras-toggle" className="text-base">
                Ativar VLibras
              </Label>
              <p className="text-sm text-muted-foreground">
                Quando ativo, um botão flutuante aparece em todas as telas. Clique nele para abrir o
                avatar tradutor.
              </p>
            </div>
            <Switch id="vlibras-toggle" checked={vlibrasEnabled} onCheckedChange={setVlibrasEnabled} />
          </div>

          <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground space-y-2">
            <p className="font-medium text-foreground">Como usar</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Clique no botão flutuante azul com o ícone de mãos (canto da tela).</li>
              <li>Selecione qualquer texto da página para que o avatar traduza.</li>
              <li>Ajuste velocidade, posição e tamanho do avatar pelo próprio widget.</li>
              <li>Funciona em desktop, tablet e mobile sem prejudicar o desempenho.</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
