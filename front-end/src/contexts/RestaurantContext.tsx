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
  updatePedidoStatus,
  deletePedido,
  getMesas,
  createMesa,
  updateMesa,
  closeComanda,
  addItemComanda,
} from "@/services/api";

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

interface RestaurantContextType {
  products: Product[];
  orders: Order[];
  tabs: Tab[];
  reservations: Reservation[];
  employees: Employee[];
  auditLogs: AuditLog[];
  addProduct: (p: Omit<Product, "id">) => void;
  updateProduct: (id: string, p: Partial<Product>) => void;
  addOrder: (o: Omit<Order, "id" | "createdAt" | "updatedAt">) => void;
  updateOrderStatus: (id: string, status: OrderStatus) => void;
  openTab: (tableNumber: number) => void;
  closeTab: (id: string, paymentMethod: PaymentMethod) => void;
  markTabUnpaid: (id: string) => void;
  addOrderToTab: (tabId: string, orderId: string) => void;
  addReservation: (r: Omit<Reservation, "id">) => {
    success: boolean;
    message: string;
  };
  cancelReservation: (id: string) => void;
  addEmployee: (e: Omit<Employee, "id">) => {
    success: boolean;
    message: string;
  };
  updateEmployee: (id: string, e: Partial<Employee>) => void;
  dailySales: {
    total: number;
    byMethod: Record<PaymentMethod, number>;
    openTabs: number;
    closedTabs: number;
  };
}

const RestaurantContext = createContext<RestaurantContextType | null>(null);

const INITIAL_PRODUCTS: Product[] = [
  {
    id: "p1",
    name: "Filé Mignon",
    category: "Carnes",
    price: 69.9,
    stock: 30,
    minStock: 5,
  },
  {
    id: "p2",
    name: "Salmão Grelhado",
    category: "Peixes",
    price: 59.9,
    stock: 20,
    minStock: 3,
  },
  {
    id: "p3",
    name: "Risoto de Cogumelos",
    category: "Massas",
    price: 45.9,
    stock: 25,
    minStock: 5,
  },
  {
    id: "p4",
    name: "Coca-Cola 350ml",
    category: "Bebidas",
    price: 7.9,
    stock: 100,
    minStock: 20,
  },
  {
    id: "p5",
    name: "Suco Natural",
    category: "Bebidas",
    price: 12.9,
    stock: 50,
    minStock: 10,
  },
  {
    id: "p6",
    name: "Cerveja Artesanal",
    category: "Bebidas",
    price: 18.9,
    stock: 60,
    minStock: 15,
  },
  {
    id: "p7",
    name: "Petit Gateau",
    category: "Sobremesas",
    price: 29.9,
    stock: 15,
    minStock: 3,
  },
  {
    id: "p8",
    name: "Salada Caesar",
    category: "Saladas",
    price: 32.9,
    stock: 20,
    minStock: 5,
  },
  {
    id: "p9",
    name: "Bruschetta",
    category: "Entradas",
    price: 24.9,
    stock: 25,
    minStock: 5,
  },
  {
    id: "p10",
    name: "Água Mineral",
    category: "Bebidas",
    price: 5.9,
    stock: 200,
    minStock: 30,
  },
];

const INITIAL_ORDERS: Order[] = [
  {
    id: "o1",
    tableNumber: 3,
    items: [
      { productId: "p1", productName: "Filé Mignon", quantity: 2, price: 69.9 },
      {
        productId: "p4",
        productName: "Coca-Cola 350ml",
        quantity: 2,
        price: 7.9,
      },
    ],
    status: "completed",
    createdAt: new Date(Date.now() - 3600000),
    updatedAt: new Date(Date.now() - 1800000),
    createdBy: "João Oliveira",
    total: 155.6,
  },
  {
    id: "o2",
    tableNumber: 7,
    items: [
      {
        productId: "p3",
        productName: "Risoto de Cogumelos",
        quantity: 1,
        price: 45.9,
      },
      {
        productId: "p5",
        productName: "Suco Natural",
        quantity: 1,
        price: 12.9,
      },
    ],
    status: "in_progress",
    createdAt: new Date(Date.now() - 1200000),
    updatedAt: new Date(Date.now() - 600000),
    createdBy: "João Oliveira",
    total: 58.8,
  },
  {
    id: "o3",
    tableNumber: 1,
    items: [
      {
        productId: "p2",
        productName: "Salmão Grelhado",
        quantity: 1,
        price: 59.9,
      },
      {
        productId: "p6",
        productName: "Cerveja Artesanal",
        quantity: 2,
        price: 18.9,
      },
    ],
    status: "preparing",
    createdAt: new Date(Date.now() - 300000),
    updatedAt: new Date(Date.now() - 300000),
    createdBy: "João Oliveira",
    total: 97.7,
  },
];

const INITIAL_TABS: Tab[] = [
  {
    id: "t1",
    tableNumber: 3,
    orders: ["o1"],
    status: "closed",
    paymentMethod: "credit",
    total: 155.6,
    openedAt: new Date(Date.now() - 7200000),
    closedAt: new Date(Date.now() - 1800000),
  },
  {
    id: "t2",
    tableNumber: 7,
    orders: ["o2"],
    status: "open",
    total: 58.8,
    openedAt: new Date(Date.now() - 1200000),
  },
  {
    id: "t3",
    tableNumber: 1,
    orders: ["o3"],
    status: "open",
    total: 97.7,
    openedAt: new Date(Date.now() - 300000),
  },
];

const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: "1",
    name: "Carlos Silva",
    email: "admin@restaurante.com",
    password: "admin123",
    role: "admin",
    position: "Gerente",
    active: true,
  },
  {
    id: "2",
    name: "Maria Santos",
    email: "owner@restaurante.com",
    password: "owner123",
    role: "owner",
    position: "Proprietário",
    active: true,
  },
  {
    id: "3",
    name: "João Oliveira",
    email: "garcom@restaurante.com",
    password: "garcom123",
    role: "employee",
    position: "Garçom",
    active: true,
  },
  {
    id: "4",
    name: "Ana Costa",
    email: "cozinha@restaurante.com",
    password: "cozinha123",
    role: "employee",
    position: "Cozinheiro",
    active: true,
  },
];

export function RestaurantProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [tabs, setTabs] = useState<Tab[]>(INITIAL_TABS);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Carrega dados da API quando o componente é montado
  useEffect(() => {
    const loadDataFromAPI = async () => {
      try {
        // Tenta carregar produtos
        const produtosData = await getProdutos();
        if (produtosData && Array.isArray(produtosData)) {
          setProducts(produtosData);
          console.log("✅ Produtos carregados da API");
        }
      } catch (error) {
        console.warn(
          "⚠️ Não foi possível carregar produtos da API, usando dados padrão",
        );
      }

      try {
        // Tenta carregar comandas/pedidos
        const comandasData = await getComandas();
        if (comandasData && Array.isArray(comandasData)) {
          setTabs(comandasData);
          console.log("✅ Comandas carregadas da API");
        }
      } catch (error) {
        console.warn("⚠️ Não foi possível carregar comandas da API");
      }

      try {
        // Tenta carregar funcionários/empregados
        const funcionariosData = await getFuncionarios();
        if (funcionariosData && Array.isArray(funcionariosData)) {
          setEmployees(funcionariosData);
          console.log("✅ Funcionários carregados da API");
        }
      } catch (error) {
        console.warn("⚠️ Não foi possível carregar funcionários da API");
      }
    };

    // Aguarda um pouco para a API estar pronta
    const timer = setTimeout(loadDataFromAPI, 1000);
    return () => clearTimeout(timer);
  }, []);

  const log = useCallback(
    (action: string, details: string, userId = "system") => {
      const entry = addAuditLog(action, details, userId);
      setAuditLogs((prev) => [entry, ...prev]);
    },
    [],
  );

  const addProduct = useCallback(
    (p: Omit<Product, "id">) => {
      const newP = { ...p, id: `p${Date.now()}` };
      setProducts((prev) => [...prev, newP]);
      log("CREATE_PRODUCT", `Produto "${p.name}" cadastrado`);
    },
    [log],
  );

  const updateProduct = useCallback(
    (id: string, p: Partial<Product>) => {
      setProducts((prev) =>
        prev.map((x) => (x.id === id ? { ...x, ...p } : x)),
      );
      log("UPDATE_PRODUCT", `Produto ${id} atualizado`);
    },
    [log],
  );

  const addOrder = useCallback(
    (o: Omit<Order, "id" | "createdAt" | "updatedAt">) => {
      const now = new Date();
      const newO: Order = {
        ...o,
        id: `o${Date.now()}`,
        createdAt: now,
        updatedAt: now,
      };

      // Sincronizar com API (fire and forget com tratamento de erro)
      createPedido({
        idMesa: o.tableNumber,
        idCliente: 1, // TODO: pegar do contexto autenticado
        ...o,
      }).catch((error) => {
        console.error("Erro ao criar pedido na API:", error);
      });

      setOrders((prev) => [...prev, newO]);
      log("CREATE_ORDER", `Pedido criado para mesa ${o.tableNumber}`);
    },
    [log],
  );

  const updateOrderStatus = useCallback(
    (id: string, status: OrderStatus) => {
      // Sincronizar com API
      updatePedidoStatus(id, status).catch((error) => {
        console.error("Erro ao atualizar status na API:", error);
      });

      setOrders((prev) =>
        prev.map((o) => {
          if (o.id !== id) return o;
          return { ...o, status, updatedAt: new Date() };
        }),
      );
      if (status === "completed") {
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
      }
      log("UPDATE_ORDER_STATUS", `Pedido ${id} → ${status}`);
    },
    [orders, log],
  );

  const openTab = useCallback(
    (tableNumber: number) => {
      const newTab: Tab = {
        id: `t${Date.now()}`,
        tableNumber,
        orders: [],
        status: "open",
        total: 0,
        openedAt: new Date(),
      };
      setTabs((prev) => [...prev, newTab]);
      log("OPEN_TAB", `Comanda aberta para mesa ${tableNumber}`);
    },
    [log],
  );

  const closeTab = useCallback(
    (id: string, paymentMethod: PaymentMethod) => {
      setTabs((prev) =>
        prev.map((t) =>
          t.id === id
            ? {
                ...t,
                status: "closed" as const,
                paymentMethod,
                closedAt: new Date(),
              }
            : t,
        ),
      );
      log("CLOSE_TAB", `Comanda ${id} fechada (${paymentMethod})`);
    },
    [log],
  );

  const markTabUnpaid = useCallback(
    (id: string) => {
      setTabs((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, status: "unpaid" as const } : t,
        ),
      );
      log("MARK_UNPAID", `Comanda ${id} marcada como não paga`);
    },
    [log],
  );

  const addOrderToTab = useCallback(
    (tabId: string, orderId: string) => {
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
    },
    [orders],
  );

  const addReservation = useCallback(
    (r: Omit<Reservation, "id">) => {
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
      setReservations((prev) => [...prev, { ...r, id: `r${Date.now()}` }]);
      log(
        "CREATE_RESERVATION",
        `Reserva para ${r.clientName} - Mesa ${r.tableNumber}`,
      );
      return { success: true, message: "Reserva criada!" };
    },
    [reservations, log],
  );

  const cancelReservation = useCallback(
    (id: string) => {
      setReservations((prev) => prev.filter((r) => r.id !== id));
      log("CANCEL_RESERVATION", `Reserva ${id} cancelada`);
    },
    [log],
  );

  const addEmployee = useCallback(
    (e: Omit<Employee, "id">) => {
      const dup = employees.find((x) => x.email === e.email);
      if (dup) return { success: false, message: "E-mail já cadastrado." };
      const newEmployee = { ...e, id: `e${Date.now()}` };
      setEmployees((prev) => [...prev, newEmployee]);

      // Sincronizar com auth context
      const storedUsers = localStorage.getItem("registered_users");
      const users = storedUsers ? JSON.parse(storedUsers) : [];
      users.push(newEmployee);
      localStorage.setItem("registered_users", JSON.stringify(users));

      log("CREATE_EMPLOYEE", `Funcionário "${e.name}" cadastrado`);
      return { success: true, message: "Funcionário cadastrado!" };
    },
    [employees, log],
  );

  const updateEmployee = useCallback(
    (id: string, e: Partial<Employee>) => {
      setEmployees((prev) =>
        prev.map((x) => (x.id === id ? { ...x, ...e } : x)),
      );
      log("UPDATE_EMPLOYEE", `Funcionário ${id} atualizado`);
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
        addOrder,
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
