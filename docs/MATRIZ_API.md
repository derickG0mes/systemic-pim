# Matriz de contrato da API

Validada pelo teste de integração `Api_contract_checks_authentication_roles_and_csrf_for_all_69_actions` no banco isolado. O teste descobriu 69 ações pelo metadata MVC: 62 exigiram autenticação e 34 ações administrativas retornaram 403 para usuário employee. Os indicadores abaixo representam somente cenários executados; não significam que todos os fluxos felizes foram exercitados.

Legenda:

- `401`: sem autenticação, para ação protegida.
- `403`: usuário employee em ação exclusiva de admin/owner.
- `400 corpo`: JSON malformado em ação com parâmetro de body/form.
- `400 CSRF`: requisição mutável sem token CSRF.
- `404`: identificador inexistente em rota com parâmetro `id`, e download de backup inexistente.
- `409`: duplicidade verificada por teste de integração focado na criação da entidade.
- `—`: não aplicável ou não executado para essa ação.

| Controller | Método | Rota | 401 | 403 | 400 corpo | 404 | 409 | CSRF |
|---|---|---|---|---|---|---|---|---|
| Autenticacao | GET | `/api/Autenticacao/csrf` | — | — | — | — | — | — |
| Autenticacao | POST | `/api/Autenticacao/logout` | — | — | — | — | — | Passou |
| Autenticacao | POST | `/api/Autenticacao/login` | — | — | Passou | — | — | Passou |
| Autenticacao | GET | `/api/Autenticacao/validar` | Passou | — | — | — | — | — |
| Backup | POST | `/api/Backup/gerar` | Passou | Passou | — | — | — | Passou |
| Backup | GET | `/api/Backup/baixar/{nomeArquivo}` | Passou | Passou | — | Passou | — | — |
| Backup | GET | `/api/Backup/listar` | Passou | Passou | — | — | — | — |
| Backup | POST | `/api/Backup/restore` | Passou | Passou | Passou | — | — | Passou |
| Comanda | GET | `/api/Comanda` | Passou | — | — | — | — | — |
| Comanda | GET | `/api/Comanda/{id}` | Passou | — | — | Passou | — | — |
| Comanda | GET | `/api/Comanda/abertas/todas` | Passou | — | — | — | — | — |
| Comanda | GET | `/api/Comanda/mesa/{tableNumber}` | Passou | — | — | — | — | — |
| Comanda | PUT | `/api/Comanda/{id}` | Passou | — | Passou | Passou | — | Passou |
| Comanda | POST | `/api/Comanda` | Passou | — | Passou | — | — | Passou |
| Comanda | POST | `/api/Comanda/{id}/itens` | Passou | — | Passou | Passou | — | Passou |
| Comanda | PUT | `/api/Comanda/{id}/pagar` | Passou | — | Passou | Passou | — | Passou |
| Comanda | PUT | `/api/Comanda/{id}/fechar` | Passou | — | — | Passou | — | Passou |
| Comanda | DELETE | `/api/Comanda/{id}/itens/{itemId}` | Passou | — | — | Passou | — | Passou |
| Comanda | PUT | `/api/Comanda/{id}/inadimplente` | Passou | — | — | Passou | — | Passou |
| Comanda | DELETE | `/api/Comanda/{id}` | Passou | — | — | Passou | — | Passou |
| Cliente | GET | `/api/Cliente` | Passou | Passou | — | — | — | — |
| Cliente | GET | `/api/Cliente/{id}` | Passou | Passou | — | Passou | — | — |
| Cliente | POST | `/api/Cliente` | Passou | Passou | Passou | — | Passou | Passou |
| Cliente | PUT | `/api/Cliente/{id}` | Passou | Passou | Passou | Passou | — | Passou |
| Cliente | DELETE | `/api/Cliente/{id}` | Passou | Passou | — | Passou | — | Passou |
| Faturamento | GET | `/api/Faturamento` | Passou | Passou | — | — | — | — |
| Faturamento | GET | `/api/Faturamento/relatorio` | Passou | Passou | — | — | — | — |
| Faturamento | GET | `/api/Faturamento/produtos-mais-vendidos` | Passou | Passou | — | — | — | — |
| Faturamento | GET | `/api/Faturamento/receita-por-forma` | Passou | Passou | — | — | — | — |
| Faturamento | GET | `/api/Faturamento/despesa-por-categoria` | Passou | Passou | — | — | — | — |
| Faturamento | POST | `/api/Faturamento/despesa` | Passou | Passou | Passou | — | — | Passou |
| Faturamento | GET | `/api/Faturamento/despesas` | Passou | Passou | — | — | — | — |
| Log | GET | `/api/Log/sistema` | Passou | Passou | — | — | — | — |
| Log | POST | `/api/Log/registrar` | Passou | Passou | Passou | — | — | Passou |
| Log | GET | `/api/Log/comanda/{idComanda}` | Passou | Passou | — | — | — | — |
| Funcionario | POST | `/api/Funcionario/login` | — | — | Passou | — | — | Passou |
| Funcionario | GET | `/api/Funcionario` | Passou | Passou | — | — | — | — |
| Funcionario | GET | `/api/Funcionario/{id}` | Passou | Passou | — | Passou | — | — |
| Funcionario | POST | `/api/Funcionario` | Passou | Passou | Passou | — | Passou | Passou |
| Funcionario | PUT | `/api/Funcionario/{id}` | Passou | Passou | Passou | Passou | — | Passou |
| Funcionario | DELETE | `/api/Funcionario/{id}` | Passou | Passou | — | Passou | — | Passou |
| Mesa | GET | `/api/Mesa` | Passou | — | — | — | — | — |
| Mesa | GET | `/api/Mesa/{id}` | Passou | — | — | Passou | — | — |
| Mesa | POST | `/api/Mesa` | Passou | Passou | Passou | — | Passou | Passou |
| Mesa | PUT | `/api/Mesa/{id}` | Passou | Passou | Passou | Passou | — | Passou |
| Mesa | DELETE | `/api/Mesa/{id}` | Passou | Passou | — | Passou | — | Passou |
| HealthCheck | GET | `/api/HealthCheck` | — | — | — | — | — | — |
| HealthCheck | GET | `/api/HealthCheck/database` | — | — | — | — | — | — |
| HealthCheck | GET | `/api/HealthCheck/info` | — | — | — | — | — | — |
| Pedidos | GET | `/api/Pedidos` | Passou | — | — | — | — | — |
| Pedidos | GET | `/api/Pedidos/{id}` | Passou | — | — | Passou | — | — |
| Pedidos | POST | `/api/Pedidos` | Passou | — | Passou | — | — | Passou |
| Pedidos | PUT | `/api/Pedidos/{id}` | Passou | — | Passou | Passou | — | Passou |
| Pedidos | PUT | `/api/Pedidos/{id}/status` | Passou | — | Passou | Passou | — | Passou |
| Pedidos | DELETE | `/api/Pedidos/{id}` | Passou | — | — | Passou | — | Passou |
| FormaPagamento | GET | `/api/FormaPagamento` | Passou | — | — | — | — | — |
| FormaPagamento | GET | `/api/FormaPagamento/{id}` | Passou | — | — | Passou | — | — |
| FormaPagamento | POST | `/api/FormaPagamento` | Passou | Passou | Passou | — | Passou | Passou |
| FormaPagamento | PUT | `/api/FormaPagamento/{id}` | Passou | Passou | Passou | Passou | — | Passou |
| FormaPagamento | DELETE | `/api/FormaPagamento/{id}` | Passou | Passou | — | Passou | — | Passou |
| Reserva | GET | `/api/Reserva` | Passou | — | — | — | — | — |
| Reserva | POST | `/api/Reserva` | Passou | — | Passou | — | — | Passou |
| Reserva | DELETE | `/api/Reserva/{id}` | Passou | — | — | Passou | — | Passou |
| Produto | GET | `/api/Produto` | Passou | — | — | — | — | — |
| Produto | GET | `/api/Produto/{id}` | Passou | — | — | Passou | — | — |
| Produto | POST | `/api/Produto` | Passou | Passou | Passou | — | — | Passou |
| Produto | PUT | `/api/Produto/{id}` | Passou | Passou | Passou | Passou | — | Passou |
| Produto | DELETE | `/api/Produto/{id}` | Passou | Passou | — | Passou | — | Passou |
| Produto | PUT | `/api/Produto/{id}/ajustar-estoque` | Passou | Passou | Passou | Passou | — | Passou |

## Limites do teste de contrato

- O teste automatizado verificou a resposta de autenticação nas 62 ações protegidas, o body inválido nas ações com parâmetro body/form, a ausência de CSRF nas ações mutáveis, IDs inexistentes nas rotas reconhecidas pelo parâmetro `id` e o papel inferior nas ações administrativas.
- As respostas 409 foram verificadas em testes focados de criação para Cliente (telefone), Funcionário (e-mail), FormaPagamento (nome) e Mesa (número). A coluna 409 não afirma que duplicidade foi exercitada nos demais endpoints.
- A rota `/api/Log/comanda/{idComanda}` não foi incluída no teste de ID inexistente: o teste automatizado seleciona parâmetros chamados `id`; o parâmetro aqui se chama `idComanda`.
- Esta matriz não afirma caminho feliz para cada uma das 69 ações nem cobertura de todos os tipos/campos inválidos. Os cenários não listados permanecem não verificados.
