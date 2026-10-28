import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useEffect,
} from "react";
import { addAuditLog, AuditLog } from "@/lib/audit";
import {
  createPedido,
  updatePedido,
  updatePedidoStatus,
  getMesas,
  pagarComanda,
  markComandaInadimplente,
  createComanda,
  getComandas,
  getProdutos,
  createProduto,
  updateProduto,
  createReserva,
  deleteReserva,
  getFuncionarios,
  createFuncionario,
  updateFuncionario,
  getFaturamento,
  getAuthToken,
  getLoggedUserId,
  getLogSistema,
  getReservas,
  ajustarEstoque,
  API_URL,
} from "@/services/api";
import { useSignalR } from "@/hooks/useSignalR";

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  minStock: number;
}

export type OrderStatus = "preparing" | "in_progress" | "completed";
export type PaymentMethod = "pix" | "credit" | "debit" | "cash";

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  tableNumber: number;
  items: OrderItem[];
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  total: number;
}

export interface Tab {
  id: string;
  tableNumber: number;
  orders: string[];
  status: "open" | "closed" | "unpaid";
  paymentMethod?: PaymentMethod;
  total: number;
  openedAt: Date;
  closedAt?: Date;
}

export interface Reservation {
  id: string;
  clientName: string;
  tableNumber: number;
  date: string;
  time: string;
  guests: number;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  password: string;
  role: "employee" | "admin" | "owner";
  position: string;
  active: boolean;
}

interface StockAdjustmentResult {
  quantidadeAnterior?: number;
  quantidadeNova?: number;
  produto?: { qtdEstoque?: number };
}

interface RestaurantContextType {
  products: Product[];
  orders: Order[];
  tabs: Tab[];
  reservations: Reservation[];
  employees: Employee[];
  auditLogs: AuditLog[];
  addProduct: (p: Omit<Product, "id">) => void;
  updateProduct: (id: string, p: Partial<Product>) => Promise<void>;
  adjustProductStock: (id: string, adjustment: { tipo: "ADICIONAR" | "REMOVER"; quantidade: number; motivo: string }) => Promise<StockAdjustmentResult>;
  addOrder: (o: Omit<Order, "id" | "createdAt" | "updatedAt">) => void;
  editOrder: (id: string, items: OrderItem[]) => void;
  updateOrderStatus: (id: string, status: OrderStatus) => void;
  openTab: (tableNumber: number) => Promise<void>;
  closeTab: (id: string, paymentMethod: PaymentMethod) => Promise<void>;
  markTabUnpaid: (id: string) => Promise<void>;
  addOrderToTab: (tabId: string, orderId: string) => Promise<void>;
  addReservation: (
    r: Omit<Reservation, "id">,
  ) => Promise<{ success: boolean; message: string }>;
  cancelReservation: (id: string) => Promise<void>;
  addEmployee: (
    e: Omit<Employee, "id">,
  ) => Promise<{ success: boolean; message: string }>;
  updateEmployee: (id: string, e: Partial<Employee>) => Promise<void>;
  dailySales: {
    total: number;
    byMethod: Record<PaymentMethod, number>;
    openTabs: number;
    closedTabs: number;
  };
  faturamento: { receita: number; despesas: number; lucro: number };
}

const RestaurantContext = createContext<RestaurantContextType | null>(null);

export function RestaurantProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [faturamento, setFaturamento] = useState({
    receita: 0,
    despesas: 0,
    lucro: 0,
  });

  const hasAuthToken = () => !!getAuthToken();

  // ✅ Função para sincronizar comandas com o banco
  const syncComandas = useCallback(async () => {
    if (!hasAuthToken()) return;
    try {
      const comandasData = await getComandas();
      console.log("🔍 DEBUG: Dados brutos recebidos do backend:", comandasData);

      if (!comandasData) {
        console.warn("⚠️ Resposta nula do backend");
        return;
      }

      // Determinar se é um array ou um objeto com array dentro
      const listaComandas = comandasData?.dados ? comandasData.dados : comandasData;
      const comandasArray = Array.isArray(listaComandas) ? listaComandas : [];

      console.log(`🔍 DEBUG: Processando ${comandasArray.length} comandas`);

      if (comandasArray.length === 0) {
        console.warn("⚠️ Nenhuma comanda retornada");
        setTabs([]);
        setOrders([]);
        return;
      }

      const allOrders: Order[] = [];

      // ✅ Mapear estrutura do backend para o formato do frontend
      const tabsFormatted: Tab[] = comandasArray.map((comanda: any) => {
        const mappedOrders: Order[] = [];
        
        if (comanda.itensComanda && comanda.itensComanda.length > 0) {
          const groupedItems = comanda.itensComanda.map((i: any) => ({
            productId: i.idProduto ? "p" + i.idProduto : "p" + i.produtoId,
            productName: i.produto?.nomeProduto || i.nomeProduto || "Produto " + i.idProduto,
            quantity: i.qtdProduto || 1,
            price: i.precoUnitarioPago || 0,
          }));

          const allCompleted = comanda.itensComanda.every(
            (i: any) => i.statusItem === "CONCLUIDO" || i.statusItem === "ENTREGUE"
          );
          const anyInProgress = comanda.itensComanda.some(
            (i: any) => i.statusItem === "PREPARANDO"
          );
          const orderStatus: OrderStatus = (comanda.statusComanda?.toLowerCase() === "fechada" || allCompleted)
            ? "completed"
            : anyInProgress
              ? "in_progress"
              : "preparing";

          const order: Order = {
            id: String(comanda.idComanda),
            tableNumber: Number(comanda.mesa?.numeroMesa ?? comanda.numeroMesa ?? comanda.idMesa),
            items: groupedItems,
            status: orderStatus,
            createdAt: new Date(comanda.dataAberta),
            updatedAt: new Date(comanda.dataAberta),
            createdBy: "Sistema",
            total: Number(comanda.valorTotal || 0),
          };
          mappedOrders.push(order);
          allOrders.push(order);
        }

        const paymentMap: Record<number | string, PaymentMethod> = {
          1: "pix",
          2: "credit",
          3: "debit",
          4: "cash",
        };
        const paymentDetail = comanda.detalhesPagamento?.[0];
        const paymentMethod = paymentDetail ? paymentMap[paymentDetail.idFormaPagamento] : undefined;

        const tabFormatted: Tab = {
          id: String(comanda.idComanda),
          tableNumber: Number(comanda.mesa?.numeroMesa ?? comanda.numeroMesa ?? comanda.idMesa),
          orders: mappedOrders.map((o) => o.id),
          status:
            comanda.statusComanda?.toLowerCase() === "aberta"
              ? "open"
              : "closed",
          paymentMethod,
          total: Number(comanda.valorTotal || 0),
          openedAt: new Date(comanda.dataAberta),
          closedAt: comanda.dataFechada
            ? new Date(comanda.dataFechada)
            : undefined,
        };

        return tabFormatted;
      });

      console.log("✅ Todos os tabs formatados:", tabsFormatted);
      setTabs(tabsFormatted);
      // 🔥 Sincroniza a tela de Cozinha/Pedidos diretamente com a lista filtrada (permite limpar se allOrders for vazio)
      setOrders(allOrders);

      console.log(
        "✅ Comandas sincronizadas da API com totais atualizados:",
        tabsFormatted,
      );
    } catch (error) {
      console.error("❌ Erro ao sincronizar comandas da API:", error);
      throw error;
    }
  }, []);

  // 🔥 Sincronizar Logs do Backend
  const syncLogs = useCallback(async () => {
    if (!hasAuthToken()) return;
    try {
      const data = await getLogSistema(1, 100);
      if (!data) return;

      if (data.sucesso && Array.isArray(data.dados)) {
        const logsFormatted = data.dados.map((l: any) => ({
          id: `log_${l.idLogSistema}`,
          timestamp: new Date(l.dataLog),
          action: l.tipoLog,
          details: l.descricaoLog,
          userId: l.usuarioLog || "system",
        }));

        setAuditLogs(logsFormatted);
        console.log(`✅ ${logsFormatted.length} logs sincronizados do backend`);
      }
    } catch (error) {
      console.error("❌ Erro ao sincronizar logs:", error);
      throw error;
    }
  }, []);

  // 🔥 Sincronizar Reservas do Backend
  const syncReservations = useCallback(async () => {
    if (!hasAuthToken()) return;
    try {
      const data = await getReservas();
      if (!data) return;
      const listaReservas = data?.dados ? data.dados : (data?.Dados ? data.Dados : data);
      const reservasArray = Array.isArray(listaReservas) ? listaReservas : [];

      const formatted = reservasArray.map((r: any) => ({
        id: String(r.idReserva),
        clientName: r.nomeCliente || "",
        tableNumber: Number(r.numeroMesa ?? r.idMesa),
        date: new Date(r.dataReserva).toISOString().split("T")[0],
        time: new Date(r.dataReserva).toTimeString().slice(0, 5),
        guests: 2,
      }));
      setReservations(formatted);
      console.log(`✅ ${formatted.length} reservas sincronizadas`);
    } catch (error) {
      console.error("❌ Erro ao sincronizar reservas:", error);
      throw error;
    }
  }, []);

  const { connected: hubConnected, enabled: hubEnabled } = useSignalR(
    `${API_URL.replace(/\/api$/, "")}/hubs/cozinha`,
    {
      PedidoNovo: () => { void syncComandas(); },
      PedidoEmPreparo: () => { void syncComandas(); },
      PedidoPronto: () => { void syncComandas(); },
      ComandaAtualizada: () => { void syncComandas(); },
    },
  );

  useEffect(() => {
    if (!hubEnabled || hubConnected) return;
    const poll = setInterval(() => {
      if (hasAuthToken()) void syncComandas();
    }, 60000);
    return () => clearInterval(poll);
  }, [hubConnected, hubEnabled, syncComandas]);

  // Carrega dados da API quando o componente é montado OU quando o token muda
  useEffect(() => {
    const loadDataFromAPI = async () => {
      if (!hasAuthToken()) {
        console.warn("⚠️ Sem token — ignorando carga da API");
        return;
      }

      try {
        // Tenta carregar mesas primeiro
        const mesasResp = await getMesas();
        console.log("📡 Resposta de mesas:", mesasResp);
        const listaMesas = mesasResp?.dados ? mesasResp.dados : mesasResp;
        const mesasArray = Array.isArray(listaMesas) ? listaMesas : [];

        if (mesasArray.length > 0) {
          console.log(`✅ ${mesasArray.length} mesas carregadas do backend`);
        } else {
          console.warn("⚠️ Nenhuma mesa retornada do backend");
        }
      } catch (error) {
        console.error("❌ Falha ao carregar mesas da API:", error);
        throw error;
      }

      try {
        // Tenta carregar produtos
        const produtosResp = await getProdutos();
        console.log("📡 Resposta de produtos:", produtosResp);
        const listaProdutos = produtosResp?.dados ? produtosResp.dados : (produtosResp?.Dados ? produtosResp.Dados : produtosResp);
        const produtosArray = Array.isArray(listaProdutos) ? listaProdutos : [];

        if (produtosArray.length > 0) {
          const formattedProducts = produtosArray.map((p: any) => ({
            id: p.idProduto ? `p${p.idProduto}` : p.id,
            name: p.nomeProduto || p.name,
            category:
              p.categoria || p.descricaoProduto || p.category || "Geral",
            price: Number(p.precoProduto || p.price),
            stock: Number(p.qtdEstoque || p.stock || 0),
            minStock: Number(p.estoqueMinimo || p.minStock || 0),
          }));
          setProducts(formattedProducts);
          console.log("✅ Produtos carregados da API", formattedProducts);
        } else {
          console.warn("⚠️ Nenhum produto retornado do backend");
        }
      } catch (error) {
        console.error("❌ Erro ao carregar produtos da API:", error);
        throw error;
      }

      try {
        // Tenta carregar comandas/pedidos
        await syncComandas();
      } catch (error) {
        console.error("❌ Falha ao carregar comandas da API:", error);
        throw error;
      }

      try {
        // Tenta carregar logs de sistema
        await syncLogs();
      } catch (error) {
        console.error("❌ Falha ao carregar logs da API:", error);
        throw error;
      }

      try {
        // Tenta carregar reservas
        await syncReservations();
      } catch (error) {
        console.error("❌ Falha ao carregar reservas da API:", error);
        throw error;
      }

      try {
        // Tenta carregar funcionários/empregados
        const funcResp = await getFuncionarios();
        console.log("📡 Resposta de funcionários:", funcResp);
        const listaFuncionarios = funcResp?.dados ? funcResp.dados : (funcResp?.Dados ? funcResp.Dados : funcResp);
        const funcArray = Array.isArray(listaFuncionarios) ? listaFuncionarios : [];

        if (funcArray.length > 0) {
          const formattedFunc = funcArray.map((f: any) => ({
            id: f.idFuncionario ? String(f.idFuncionario) : f.id,
            name: f.nomeFuncionario || f.name,
            email: f.emailFuncionario || f.email || "",
            role: (f.perfil === "Administrador"
              ? "admin"
              : f.perfil === "Proprietário"
                ? "owner"
                : "employee") as Employee["role"],
            position: f.cargoFuncionario || "",
            password: "",
            active: f.statusFuncionario === "ATIVO",
          }));
          setEmployees(formattedFunc);
          console.log("✅ Funcionários carregados da API", formattedFunc);
        } else {
          console.warn("⚠️ Nenhum funcionário retornado do backend");
        }
      } catch (error) {
        console.error("❌ Erro ao carregar funcionários da API:", error);
        throw error;
      }

      try {
        const fatResp = await getFaturamento();
        const fat = fatResp?.dados ?? fatResp?.Dados;
        if (fat) {
          setFaturamento({
            receita: Number(fat.receita ?? 0),
            despesas: Number(fat.despesas ?? 0),
            lucro: Number(fat.lucro ?? 0),
          });
        }
      } catch (error) {
        console.error("❌ Falha ao carregar faturamento da API:", error);
        throw error;
      }
    };

    if (hasAuthToken()) {
      loadDataFromAPI().catch((err) =>
        console.error("❌ loadDataFromAPI falhou:", err),
      );
    }

    const handleTokenChanged = async () => {
      if (hasAuthToken()) {
        await loadDataFromAPI().catch((err) =>
          console.error("❌ loadDataFromAPI falhou:", err),
        );
      }
    };

    window.addEventListener("authTokenChanged", handleTokenChanged);
    return () => {
      window.removeEventListener("authTokenChanged", handleTokenChanged);
    };
  }, [syncComandas, syncLogs, syncReservations]);

  const log = useCallback(
    (action: string, details: string, userId = "system") => {
      const entry = addAuditLog(action, details, userId);
      setAuditLogs((prev) => [entry, ...prev]);
    },
    [],
  );

  const addProduct = useCallback(
    async (p: Omit<Product, "id">) => {
      try {
        const resp = await createProduto({
          nomeProduto: p.name,
          categoria: p.category,
          precoProduto: p.price,
          qtdEstoque: p.stock,
          estoqueMinimo: p.minStock,
          statusProduto: "DISPONIVEL",
        });
        const saved = resp?.dados ?? resp?.Dados ?? resp;
        const newP: Product = {
          id: saved?.idProduto ? `p${saved.idProduto}` : `p${Date.now()}`,
          name: saved?.nomeProduto ?? p.name,
          category: saved?.categoria ?? p.category,
          price: Number(saved?.precoProduto ?? p.price),
          stock: Number(saved?.qtdEstoque ?? p.stock),
          minStock: Number(saved?.estoqueMinimo ?? p.minStock),
        };
        setProducts((prev) => [...prev, newP]);
        log("CREATE_PRODUCT", `Produto "${p.name}" cadastrado`);
      } catch (error) {
        console.error("Erro ao cadastrar produto na API:", error);
      }
    },
    [log],
  );

  const updateProduct = useCallback(
    async (id: string, p: Partial<Product>) => {
      // Extrai o ID numérico do produto (formato "p123" → 123)
      const numericId = parseInt(id.replace(/\D/g, ""), 10);
      if (!numericId) {
        console.error("[updateProduct] ID inválido:", id);
        return;
      }
      try {
        const existing = products.find((x) => x.id === id);
        if (!existing) return;
        const merged = { ...existing, ...p };
        await updateProduto(String(numericId), {
          nomeProduto: merged.name,
          categoria: merged.category,
          precoProduto: merged.price,
          qtdEstoque: merged.stock,
          estoqueMinimo: merged.minStock,
          statusProduto: "DISPONIVEL",
        });
        // Atualiza estado local apenas após sucesso da API
        setProducts((prev) =>
          prev.map((x) => (x.id === id ? { ...x, ...p } : x)),
        );
        log("UPDATE_PRODUCT", `Produto ${id} atualizado`);
      } catch (error: any) {
        console.error("[updateProduct] Falha na API:", error);
        window.dispatchEvent(
          new CustomEvent("restaurant:toast", {
            detail: { type: "error", message: "Falha ao atualizar produto no servidor." },
          }),
        );
      }
    },
    [products, log],
  );

  const adjustProductStock = useCallback(
    async (id: string, adjustment: { tipo: "ADICIONAR" | "REMOVER"; quantidade: number; motivo: string }) => {
      const numericId = parseInt(id.replace(/\D/g, ""), 10);
      if (!numericId) throw new Error("ID do produto inválido");

      const response = await ajustarEstoque(String(numericId), adjustment);
      const result = (response?.dados ?? response?.Dados ?? response) as StockAdjustmentResult;
      const updatedProduct = result?.produto;
      const newStock = Number(updatedProduct?.qtdEstoque ?? result?.quantidadeNova);

      if (Number.isFinite(newStock)) {
        setProducts((prev) =>
          prev.map((product) => (product.id === id ? { ...product, stock: newStock } : product)),
        );
      }

      return result;
    },
    [],
  );

  const addOrder = useCallback(
    async (o: Omit<Order, "id" | "createdAt" | "updatedAt">) => {
      // ✅ Garantir que total é sempre calculado e válido
      const orderTotal =
        o.total ||
        o.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

      console.log(
        "🛒 [ADDORDER] Iniciando criação de pedido para mesa",
        o.tableNumber,
      );
      console.log("🛒 [ADDORDER] Payload enviado:", {
        idMesa: o.tableNumber,
        idCliente: 1,
        itens: o.items.map((item) => ({
          idProduto: parseInt(item.productId.replace(/\D/g, ""), 10) || 0,
          qtdProduto: item.quantity,
          precoUnitarioPago: item.price,
        })),
      });

      try {
        // Cria pedido na API — idCliente omitido, backend resolve para "Consumidor"
        const pedidoResponse = await createPedido({
          idMesa: o.tableNumber,
          itens: o.items.map((item) => ({
            idProduto: parseInt(item.productId.replace(/\D/g, ""), 10) || 0,
            qtdProduto: item.quantity,
            precoUnitarioPago: item.price,
          })),
        });

        console.log(
          "✅ [ADDORDER] Pedido criado com sucesso no backend:",
          pedidoResponse,
        );

        // Se sucesso, sincroniza as comandas do banco
        console.log(
          "📡 [ADDORDER] Sincronizando comandas após criar pedido...",
        );
        await syncComandas();
        console.log("✅ [ADDORDER] Comandas sincronizadas com sucesso");

        log(
          "CREATE_ORDER",
          `Pedido criado para mesa ${o.tableNumber} - Total: R$ ${orderTotal.toFixed(2)}`,
        );
      } catch (error: any) {
        console.error("❌ [ADDORDER] Erro ao criar pedido na API:", error);
        window.dispatchEvent(
          new CustomEvent("restaurant:toast", {
            detail: { type: "error", message: "Falha ao criar pedido no servidor." },
          }),
        );
      }
    },
    [log, syncComandas],
  );

  const editOrder = useCallback(
    async (id: string, items: OrderItem[]) => {
      const order = orders.find((o) => o.id === id);
      if (!order) return;

      const oldTotal = order.total;
      const newTotal = items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );

      setOrders((prev) =>
        prev.map((o) =>
          o.id === id
            ? { ...o, items, total: newTotal, updatedAt: new Date() }
            : o,
        ),
      );

      setTabs((prev) =>
        prev.map((tab) =>
          tab.tableNumber === order.tableNumber
            ? { ...tab, total: tab.total - oldTotal + newTotal }
            : tab,
        ),
      );

      try {
        await updatePedido(id, {
          itens: items.map((item) => ({
            idProduto: parseInt(item.productId.replace(/\D/g, ""), 10) || 0,
            qtdProduto: item.quantity,
            precoUnitarioPago: item.price,
          })),
        });
        await syncComandas();
      } catch (error) {
        console.error("Erro ao editar pedido na API:", error);
      }

      log(
        "EDIT_ORDER",
        `Pedido ${id} editado - Total atualizado para R$ ${newTotal.toFixed(2)}`,
      );
    },
    [log, orders, syncComandas],
  );

  const updateOrderStatus = useCallback(
    (id: string, status: OrderStatus) => {
      updatePedidoStatus(id, status)
        .then(() => syncComandas())
        .catch((error) => {
          console.error("Erro ao atualizar status na API:", error);
        });

      // 🔥 REMOVER da fila visual se status for "completed"
      if (status === "completed") {
        setOrders((prev) => prev.filter((o) => o.id !== id)); // ← REMOVE IMEDIATAMENTE

        const order = orders.find((o) => o.id === id);
        if (order) {
          setProducts((prev) =>
            prev.map((p) => {
              const item = order.items.find((i) => i.productId === p.id);
              return item
                ? { ...p, stock: Math.max(0, p.stock - item.quantity) }
                : p;
            }),
          );
        }
      } else {
        // Para outros status, apenas atualiza
        setOrders((prev) =>
          prev.map((o) => {
            if (o.id !== id) return o;
            return { ...o, status, updatedAt: new Date() };
          }),
        );
      }
      log("UPDATE_ORDER_STATUS", `Pedido ${id} → ${status}`);
    },
    [orders, log, syncComandas],
  );

  const openTab = useCallback(
    async (tableNumber: number) => {
      try {
        // idCliente omitido (0) — o backend resolve automaticamente para o cliente "Consumidor"
        await createComanda({ idMesa: tableNumber, idCliente: 0 });
        await syncComandas();
        log("OPEN_TAB", `Comanda aberta para mesa ${tableNumber}`);
      } catch (error: any) {
        console.error("Erro ao abrir comanda na API:", error);
        window.dispatchEvent(
          new CustomEvent("restaurant:toast", {
            detail: { type: "error", message: "Falha ao abrir comanda no servidor." },
          }),
        );
      }
    },
    [log, syncComandas],
  );

  const closeTab = useCallback(
    async (id: string, paymentMethod: PaymentMethod) => {
      const formaMap: Record<PaymentMethod, number> = {
        pix: 1,
        credit: 2,
        debit: 3,
        cash: 4,
      };
      try {
        // O backend lê o idFuncionario diretamente do token JWT — não é mais passado pelo frontend
        await pagarComanda(id, {
          idFormaPagamento: formaMap[paymentMethod],
          troco: 0,
        });
        await syncComandas();
        log("CLOSE_TAB", `Comanda ${id} fechada (${paymentMethod})`);
      } catch (error: any) {
        console.error("Erro ao fechar comanda na API:", error);
        window.dispatchEvent(
          new CustomEvent("restaurant:toast", {
            detail: { type: "error", message: "Falha ao registrar pagamento no servidor." },
          }),
        );
      }
    },
    [log, syncComandas],
  );

  const markTabUnpaid = useCallback(
    async (id: string) => {
      try {
        // Fecha a comanda no banco sem DETALHE_PAGAMENTO; registra NAO_PAGO no LOG_SISTEMA
        await markComandaInadimplente(id);
        await syncComandas();
        log("MARK_UNPAID", `Comanda ${id} marcada como não paga`);
      } catch (error: any) {
        console.error("Erro ao marcar comanda como inadimplente:", error);
        window.dispatchEvent(
          new CustomEvent("restaurant:toast", {
            detail: { type: "error", message: "Falha ao registrar inadimplência no servidor." },
          }),
        );
      }
    },
    [log, syncComandas],
  );

  const addOrderToTab = useCallback(
    async (tabId: string, orderId: string) => {
      // O backend já vincula itens à comanda pela própria estrutura da comanda.
      // Esta função sincroniza o estado local após qualquer agrupamento feito via UI.
      const order = orders.find((o) => o.id === orderId);
      setTabs((prev) =>
        prev.map((t) =>
          t.id === tabId
            ? {
                ...t,
                orders: [...t.orders, orderId],
                total: t.total + (order?.total || 0),
              }
            : t,
        ),
      );
      // Sincroniza com o banco para garantir consistência
      try {
        await syncComandas();
      } catch {
        // Falha na sincronização não bloqueia o fluxo visual
      }
    },
    [orders, syncComandas],
  );

  const addReservation = useCallback(
    async (r: Omit<Reservation, "id">) => {
      const conflict = reservations.find(
        (x) =>
          x.tableNumber === r.tableNumber &&
          x.date === r.date &&
          x.time === r.time,
      );
      if (conflict)
        return {
          success: false,
          message: "Conflito de horário para esta mesa.",
        };
      const hour = parseInt(r.time.split(":")[0]);
      if (hour < 11 || hour > 22)
        return {
          success: false,
          message: "Fora do horário de funcionamento (11h-22h).",
        };
      try {
        await createReserva({
          nomeCliente: r.clientName,
          numeroMesa: r.tableNumber,
          dataReserva: new Date(`${r.date}T${r.time}:00`).toISOString(),
        });
        await syncReservations();
        log(
          "CREATE_RESERVATION",
          `Reserva para ${r.clientName} - Mesa ${r.tableNumber}`,
        );
        return { success: true, message: "Reserva criada!" };
      } catch (error) {
        console.error("Erro ao criar reserva na API:", error);
        return {
          success: false,
          message: "Falha ao salvar reserva no servidor.",
        };
      }
    },
    [reservations, log, syncReservations],
  );

  const cancelReservation = useCallback(
    async (id: string) => {
      try {
        await deleteReserva(id);
        // Atualiza lista local apenas após confirmação do servidor
        setReservations((prev) => prev.filter((r) => r.id !== id));
        log("CANCEL_RESERVATION", `Reserva ${id} cancelada`);
      } catch (error: any) {
        console.error("Erro ao cancelar reserva na API:", error);
        window.dispatchEvent(
          new CustomEvent("restaurant:toast", {
            detail: { type: "error", message: "Falha ao cancelar reserva no servidor." },
          }),
        );
      }
    },
    [log],
  );

  const addEmployee = useCallback(
    async (e: Omit<Employee, "id">) => {
      try {
        const resp = await createFuncionario({
          nomeFuncionario: e.name,
          cpfFuncionario: e.email, // se não houver CPF explícito, usar email como fallback
          emailFuncionario: e.email,
          cargoFuncionario: e.position,
          role: e.role,
          senha: e.password,
          telefoneFuncionario: "",
        });
        const saved = resp?.dados ?? resp?.Dados ?? resp;
        const newEmployee: Employee = {
          id: saved?.idFuncionario ? String(saved.idFuncionario) : `e${Date.now()}`,
          name: saved?.nomeFuncionario ?? e.name,
          email: saved?.emailFuncionario ?? e.email,
          password: "", // nunca armazenamos senha no front
          role: e.role,
          position: e.position,
          active: true,
        };
        setEmployees((prev) => [...prev, newEmployee]);
        log("CREATE_EMPLOYEE", `Funcionário "${e.name}" cadastrado`);
        return { success: true, message: "Funcionário cadastrado!" };
      } catch (error: any) {
        console.error("[addEmployee] Falha na API:", error);
        const msg = error?.message?.replace(/^\[API\][^:]*:\s*/, "").trim();
        window.dispatchEvent(
          new CustomEvent("restaurant:toast", {
            detail: { type: "error", message: msg || "Falha ao cadastrar funcionário." },
          }),
        );
        return { success: false, message: msg || "Falha ao cadastrar funcionário." };
      }
    },
    [log],
  );


  const updateEmployee = useCallback(
    async (id: string, e: Partial<Employee>) => {
      const numericId = parseInt(id.replace(/\D/g, ""), 10);
      if (!numericId) {
        console.error("[updateEmployee] ID inválido:", id);
        return;
      }
      try {
        await updateFuncionario(String(numericId), {
          nomeFuncionario: e.name,
          emailFuncionario: e.email,
          cargoFuncionario: e.position,
          role: e.role,
          // Senha vazia significa "não alterar" no backend
          senha: "",
          telefoneFuncionario: "",
        });
        // Atualiza estado local apenas após sucesso
        setEmployees((prev) =>
          prev.map((x) => (x.id === id ? { ...x, ...e } : x)),
        );
        log("UPDATE_EMPLOYEE", `Funcionário ${id} atualizado`);
      } catch (error: any) {
        console.error("[updateEmployee] Falha na API:", error);
        const msg = error?.message?.replace(/^\[API\][^:]*:\s*/, "").trim();
        window.dispatchEvent(
          new CustomEvent("restaurant:toast", {
            detail: { type: "error", message: msg || "Falha ao atualizar funcionário." },
          }),
        );
      }
    },
    [log],
  );

  const dailySales = React.useMemo(() => {
    const closedToday = tabs.filter(
      (t) =>
        t.status === "closed" &&
        t.closedAt &&
        new Date(t.closedAt).toDateString() === new Date().toDateString(),
    );
    const byMethod: Record<PaymentMethod, number> = {
      pix: 0,
      credit: 0,
      debit: 0,
      cash: 0,
    };
    closedToday.forEach((t) => {
      if (t.paymentMethod) byMethod[t.paymentMethod] += t.total;
    });
    return {
      total: closedToday.reduce((s, t) => s + t.total, 0),
      byMethod,
      openTabs: tabs.filter((t) => t.status === "open").length,
      closedTabs: closedToday.length,
    };
  }, [tabs]);

  return (
    <RestaurantContext.Provider
      value={{
        products,
        orders,
        tabs,
        reservations,
        employees,
        auditLogs,
        addProduct,
        updateProduct,
        adjustProductStock,
        addOrder,
        editOrder,
        updateOrderStatus,
        openTab,
        closeTab,
        markTabUnpaid,
        addOrderToTab,
        addReservation,
        cancelReservation,
        addEmployee,
        updateEmployee,
        dailySales,
        faturamento,
      }}
    >
      {children}
    </RestaurantContext.Provider>
  );
}

export const useRestaurant = () => {
  const ctx = useContext(RestaurantContext);
  if (!ctx)
    throw new Error("useRestaurant must be used within RestaurantProvider");
  return ctx;
};
