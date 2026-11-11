# Documentação do Systemic PIM

## Para começar

- [README do projeto](../README.md): visão geral, requisitos, como executar e testar.
- [Configuração, execução, segurança e backup](CONFIGURACAO.md): Docker Compose,
  execução local, autenticação, CSRF, CORS, banco de dados e scripts.
- [Variáveis de ambiente](VARIAVEIS_AMBIENTE.md): todas as variáveis da API,
  do Compose, do mobile e dos testes.

## Referência técnica

- [Arquitetura](ARQUITETURA.md): componentes, módulos, modelo de dados, fluxos
  e tempo real, com diagramas.
- [Referência da API](API.md): endpoints, perfis, paginação, eventos SignalR,
  notificações e códigos de erro.
- [Exemplo TypeScript de integração com a API](EXEMPLO_INTEGRACAO_REACT.ts)

## Operação e contribuição

- [Guia de implantação e CI/CD](DEPLOY.md)
- [Guia de contribuição](../CONTRIBUTING.md)

## Por projeto

- [API (back-end)](../back-end/README.md)
- [Interface web (front-end)](../front-end/README.md)
- [App mobile](../mobile/README.md)

Os documentos descrevem o comportamento implementado no repositório. Pontos
marcados como "A CONFIRMAR" não puderam ser verificados apenas pelo código. A
configuração de produção deve ser validada no ambiente de destino, em especial
TLS, proxy confiável, CORS, cookies e conexão com SQL Server.
