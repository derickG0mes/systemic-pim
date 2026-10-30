# Decisões de escopo

- **Services específicos, sem repository genérico:** a abstração de service fica
  restrita a Comanda, Pedido e Faturamento; não há necessidade comprovada de um
  repository genérico para o escopo atual.
- **Sem funções SQL de usuário:** procedures e views atendem às consultas e
  operações necessárias sem ampliar a superfície de manutenção com funções.
- **Backup com HMAC-SHA256, sem AES:** HMAC verifica integridade e autenticidade,
  mas não fornece confidencialidade; arquivos e chaves devem ser protegidos no
  armazenamento e no ambiente operacional.
- **Sem migrations EF Core:** a evolução do esquema é controlada por scripts
  SQL versionados, alinhados ao processo atual de inicialização do banco.
- **Sem aplicativo mobile nativo:** a cobertura mobile é atendida pela interface
  web responsiva e pelo PWA instalável.
- **Sem Scrum, Kanban, backlog ou sprints:** o trabalho é conduzido por fases de
  conformidade e critérios de entrega, sem adotar um processo de equipe que não
  faz parte do escopo do projeto.
