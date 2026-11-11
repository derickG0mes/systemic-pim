export type UserRole = "employee" | "admin" | "owner";

export interface AuthenticatedProfile {
  id: number;
  nome: string;
  role: UserRole;
}

export interface ApiEnvelope<T> {
  sucesso: boolean;
  mensagem?: string;
  dados: T;
  codigoErro?: string | null;
}

export interface TableDto {
  idMesa: number;
  numeroMesa: number;
  capacidadeMesa?: number;
  statusMesa?: string;
}

export interface ProductDto {
  idProduto: number;
  nomeProduto: string;
  descricaoProduto?: string | null;
  precoProduto: number;
  qtdEstoque: number;
  estoqueMinimo: number;
  statusProduto?: string;
  categoria?: string;
  categoriaProduto?: string;
}

export interface CommandItemDto {
  idItemComanda: number;
  idProduto: number;
  qtdProduto: number;
  precoUnitarioPago: number;
  statusItem?: string;
  produto?: { nomeProduto?: string };
  nomeProduto?: string;
}

export interface CommandDto {
  idComanda: number;
  idMesa: number;
  numeroMesa?: number;
  mesa?: { numeroMesa?: number };
  statusComanda: string;
  dataAberta: string;
  dataFechada?: string | null;
  valorTotal: number;
  itensComanda: CommandItemDto[];
}

export interface PaymentFormDto {
  idFormaPagamento: number;
  nomeFormaPagamento: string;
}

export interface ReservationDto {
  idReserva: number;
  nomeCliente: string;
  numeroMesa: number;
  idMesa: number;
  dataReserva: string;
  statusReserva?: string;
}

export interface FinancialSummary {
  receita: number;
  despesas: number;
  lucro: number;
}
