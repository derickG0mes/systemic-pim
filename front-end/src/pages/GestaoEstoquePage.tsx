import { useState, useEffect } from "react";
import { getProdutos } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

interface Produto {
  idProduto: number;
  nomeProduto: string;
  precoProduto: number;
  qtdEstoque: number;
  estoqueMinimo: number;
}

interface AjusteEstoque {
  tipo: "ADICIONAR" | "REMOVER";
  quantidade: number;
  motivo: string;
}

export default function GestaoEstoquePage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [selectedProduto, setSelectedProduto] = useState<Produto | null>(null);
  const [ajuste, setAjuste] = useState<AjusteEstoque>({
    tipo: "REMOVER",
    quantidade: 0,
    motivo: "",
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    carregarProdutos();
  }, []);

  const carregarProdutos = async () => {
    try {
      const resp = await getProdutos();
      let produtosArray = Array.isArray(resp) ? resp : resp?.dados || resp?.Dados || [];
      setProdutos(produtosArray);
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao carregar produtos" });
    }
  };

  const handleAjustar = async () => {
    if (!selectedProduto || !ajuste.motivo.trim()) {
      toast({
        title: "Erro",
        description: "Selecione um produto e informe o motivo",
      });
      return;
    }

    setLoading(true);
    try {
      // Chamada do novo endpoint
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/produto/${selectedProduto.idProduto}/ajustar-estoque`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          },
          body: JSON.stringify({
            tipo: ajuste.tipo,
            quantidade: ajuste.quantidade,
            motivo: ajuste.motivo,
          }),
        },
      );

      const data = await response.json();
      if (data.sucesso) {
        toast({
          title: "Sucesso",
          description: `Estoque ajustado: ${data.quantidadeAnterior} → ${data.quantidadeNova}`,
        });
        await carregarProdutos();
        setSelectedProduto(null);
        setAjuste({ tipo: "REMOVER", quantidade: 0, motivo: "" });
      } else {
        toast({ title: "Erro", description: data.mensagem });
      }
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao ajustar estoque" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Gestão de Estoque</h1>

      {/* Tabela de Produtos */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3 text-left">Produto</th>
              <th className="px-4 py-3 text-center">Quantidade</th>
              <th className="px-4 py-3 text-center">Mínimo</th>
              <th className="px-4 py-3 text-right">Preço</th>
              <th className="px-4 py-3 text-center">Ação</th>
            </tr>
          </thead>
          <tbody>
            {produtos.map((prod) => (
              <tr key={prod.idProduto} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3">{prod.nomeProduto}</td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={
                      prod.qtdEstoque < prod.estoqueMinimo
                        ? "text-red-600 font-bold"
                        : ""
                    }
                  >
                    {prod.qtdEstoque}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">{prod.estoqueMinimo}</td>
                <td className="px-4 py-3 text-right">
                  R$ {prod.precoProduto.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => setSelectedProduto(prod)}
                    className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Ajustar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de Ajuste */}
      {selectedProduto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-xl font-bold">{selectedProduto.nomeProduto}</h2>
            <div className="bg-gray-100 p-3 rounded text-sm">
              <p>
                Quantidade atual: <strong>{selectedProduto.qtdEstoque}</strong>
              </p>
            </div>

            {/* Tipo de Ajuste */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Tipo de Ajuste
              </label>
              <select
                value={ajuste.tipo}
                onChange={(e) =>
                  setAjuste({
                    ...ajuste,
                    tipo: e.target.value as "ADICIONAR" | "REMOVER",
                  })
                }
                className="w-full px-3 py-2 border rounded"
              >
                <option value="REMOVER">Remover (Baixa)</option>
                <option value="ADICIONAR">Adicionar (Entrada)</option>
              </select>
            </div>

            {/* Quantidade */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Quantidade
              </label>
              <input
                type="number"
                min="1"
                value={ajuste.quantidade}
                onChange={(e) =>
                  setAjuste({
                    ...ajuste,
                    quantidade: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            {/* Motivo */}
            <div>
              <label className="block text-sm font-medium mb-2">Motivo *</label>
              <input
                type="text"
                placeholder="Ex: Dano no recebimento, Erro de lançamento..."
                value={ajuste.motivo}
                onChange={(e) =>
                  setAjuste({ ...ajuste, motivo: e.target.value })
                }
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            {/* Botões */}
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedProduto(null)}
                className="flex-1 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Cancelar
              </button>
              <button
                onClick={handleAjustar}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
              >
                {loading ? "Processando..." : "Confirmar Ajuste"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
