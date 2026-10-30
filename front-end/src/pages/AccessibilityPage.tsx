import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Accessibility, Hand, Minus, Plus } from "lucide-react";
import { useAccessibility } from "@/contexts/useAccessibility";
import {
  FONT_SIZE_LEVELS,
  type AccessibilityTheme,
} from "@/contexts/accessibility-context";

const themeLabels: Record<AccessibilityTheme, string> = {
  light: "claro",
  dark: "escuro",
  "high-contrast": "alto contraste",
};

export default function AccessibilityPage() {
  const {
    vlibrasEnabled,
    setVlibrasEnabled,
    fontSizeScale,
    setFontSizeScale,
    theme,
    setTheme,
  } = useAccessibility();
  const [announcement, setAnnouncement] = useState("");

  const changeFontSize = (direction: -1 | 1) => {
    const currentIndex = FONT_SIZE_LEVELS.indexOf(fontSizeScale);
    const nextScale = FONT_SIZE_LEVELS[currentIndex + direction];
    if (nextScale === undefined) return;
    setFontSizeScale(nextScale);
    setAnnouncement(`Tamanho da fonte alterado para ${nextScale}%.`);
  };

  const changeTheme = (nextTheme: AccessibilityTheme) => {
    setTheme(nextTheme);
    setAnnouncement(`Tema ${themeLabels[nextTheme]} ativado.`);
  };

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
          <CardTitle>Preferências visuais</CardTitle>
          <CardDescription>
            Ajuste o tamanho do texto e o tema de cores. As escolhas ficam salvas neste dispositivo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <section aria-labelledby="font-size-heading" className="space-y-3">
            <h2 id="font-size-heading" className="font-semibold">Tamanho da fonte</h2>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                aria-label="Diminuir tamanho da fonte"
                onClick={() => changeFontSize(-1)}
                disabled={fontSizeScale === FONT_SIZE_LEVELS[0]}
              >
                <Minus aria-hidden="true" className="h-4 w-4" />
              </Button>
              <output aria-label="Tamanho atual da fonte" className="min-w-16 text-center font-medium">
                {fontSizeScale}%
              </output>
              <Button
                type="button"
                variant="outline"
                aria-label="Aumentar tamanho da fonte"
                onClick={() => changeFontSize(1)}
                disabled={fontSizeScale === FONT_SIZE_LEVELS[FONT_SIZE_LEVELS.length - 1]}
              >
                <Plus aria-hidden="true" className="h-4 w-4" />
              </Button>
            </div>
          </section>

          <section aria-labelledby="theme-heading" className="space-y-3">
            <h2 id="theme-heading" className="font-semibold">Tema</h2>
            <div role="group" aria-label="Tema de cores" className="flex flex-wrap gap-2">
              {(["light", "dark", "high-contrast"] as const).map((themeOption) => (
                <Button
                  key={themeOption}
                  type="button"
                  variant={theme === themeOption ? "default" : "outline"}
                  aria-label={`Tema ${themeLabels[themeOption]}`}
                  aria-pressed={theme === themeOption}
                  onClick={() => changeTheme(themeOption)}
                >
                  {themeLabels[themeOption]}
                </Button>
              ))}
            </div>
          </section>
          <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
            {announcement}
          </p>
        </CardContent>
      </Card>

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
