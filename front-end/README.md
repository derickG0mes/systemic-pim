# Projeto Integrado Multidisciplinar

Aplicacao web em React + Vite + TypeScript para gestao operacional (pedidos, comandas, estoque, reservas, usuarios, auditoria e relatorios).

## O que precisa instalar no sistema

Antes de rodar o projeto, instale:

- `Node.js` (recomendado: versao LTS, >= 20)
- `npm` (normalmente ja vem com o Node.js)
- `Git` (opcional, mas recomendado para clonar e versionar)

### Como verificar as instalacoes

```bash
node -v
npm -v
git --version
```

Se os comandos retornarem versoes, esta tudo certo.

## Instalar e rodar o projeto

No terminal, dentro da pasta `pim-3`:

```bash
npm install
npm run dev
```

Depois abra a URL mostrada no terminal (por padrao, algo como `http://localhost:8080`).

## Scripts disponiveis

- `npm run dev`: inicia ambiente de desenvolvimento
- `npm run build`: gera build de producao
- `npm run preview`: sobe build local para validacao
- `npm run lint`: roda verificacoes de lint
- `npm test -- --run`: roda testes automatizados uma vez

## Fluxo recomendado de validacao

Antes de subir alteracoes:

```bash
npm run lint
npm test -- --run
npm run build
```

## Observacoes

- Caso de erro por dependencias corrompidas, rode:

```bash
rm -rf node_modules package-lock.json
npm install
```

No Windows PowerShell, use:

```powershell
Remove-Item -Recurse -Force node_modules, package-lock.json
npm install
```
