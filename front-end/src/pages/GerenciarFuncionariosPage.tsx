import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { API_URL } from "@/services/api";

interface NovoFuncionario {
  nomeFuncionario: string;
  cpfFuncionario: string;
  telefoneFuncionario: string;
  cargoFuncionario: string;
  emailFuncionario: string;
  senha: string;
  confirmarSenha: string;
}

export default function GerenciarFuncionariosPage() {
  const [form, setForm] = useState<NovoFuncionario>({
    nomeFuncionario: "",
    cpfFuncionario: "",
    telefoneFuncionario: "",
    cargoFuncionario: "Garçom",
    emailFuncionario: "",
    senha: "",
    confirmarSenha: "",
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validações
    if (!form.nomeFuncionario.trim()) {
      toast({ title: "Erro", description: "Nome obrigatório" });
      return;
    }

    if (form.cpfFuncionario.length !== 11) {
      toast({ title: "Erro", description: "CPF deve ter 11 dígitos" });
      return;
    }

    if (form.senha !== form.confirmarSenha) {
      toast({ title: "Erro", description: "Senhas não conferem" });
      return;
    }

    if (form.senha.length < 6) {
      toast({
        title: "Erro",
        description: "Senha deve ter no mínimo 6 caracteres",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/funcionario`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          },
          body: JSON.stringify({
            nomeFuncionario: form.nomeFuncionario,
            cpfFuncionario: form.cpfFuncionario.replace(/\D/g, ""),
            telefoneFuncionario: form.telefoneFuncionario,
            cargoFuncionario: form.cargoFuncionario,
            emailFuncionario: form.emailFuncionario,
            senha: form.senha,
          }),
        },
      );

      const data = await response.json();
      if (response.ok) {
        toast({
          title: "Sucesso",
          description: `Funcionário ${form.nomeFuncionario} criado com sucesso!`,
        });
        setForm({
          nomeFuncionario: "",
          cpfFuncionario: "",
          telefoneFuncionario: "",
          cargoFuncionario: "Garçom",
          emailFuncionario: "",
          senha: "",
          confirmarSenha: "",
        });
      } else {
        toast({
          title: "Erro",
          description: data.message || "Falha ao criar funcionário",
        });
      }
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao conectar com o servidor" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Gerenciar Funcionários</h1>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg shadow p-6 space-y-4"
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Nome *</label>
            <input
              type="text"
              value={form.nomeFuncionario}
              onChange={(e) =>
                setForm({ ...form, nomeFuncionario: e.target.value })
              }
              className="w-full px-3 py-2 border rounded"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              CPF (11 dígitos) *
            </label>
            <input
              type="text"
              value={form.cpfFuncionario}
              onChange={(e) =>
                setForm({
                  ...form,
                  cpfFuncionario: e.target.value
                    .replace(/\D/g, "")
                    .slice(0, 11),
                })
              }
              className="w-full px-3 py-2 border rounded"
              placeholder="00000000000"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Telefone</label>
            <input
              type="tel"
              value={form.telefoneFuncionario}
              onChange={(e) =>
                setForm({ ...form, telefoneFuncionario: e.target.value })
              }
              className="w-full px-3 py-2 border rounded"
              placeholder="(11) 99999-9999"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Cargo</label>
            <select
              value={form.cargoFuncionario}
              onChange={(e) =>
                setForm({ ...form, cargoFuncionario: e.target.value })
              }
              className="w-full px-3 py-2 border rounded"
            >
              <option value="Garçom">Garçom</option>
              <option value="Cozinheiro">Cozinheiro</option>
              <option value="Gerente">Gerente</option>
              <option value="Barman">Barman</option>
            </select>
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              value={form.emailFuncionario}
              onChange={(e) =>
                setForm({ ...form, emailFuncionario: e.target.value })
              }
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Senha *</label>
            <input
              type="password"
              value={form.senha}
              onChange={(e) => setForm({ ...form, senha: e.target.value })}
              className="w-full px-3 py-2 border rounded"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Confirmar Senha *
            </label>
            <input
              type="password"
              value={form.confirmarSenha}
              onChange={(e) =>
                setForm({ ...form, confirmarSenha: e.target.value })
              }
              className="w-full px-3 py-2 border rounded"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          {loading ? "Criando..." : "Criar Funcionário"}
        </button>
      </form>
    </div>
  );
}
