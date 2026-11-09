import { useCallback, useState } from "react";
import { Alert, FlatList, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { ActionButton } from "../src/components/ActionButton";
import { AppScreen } from "../src/components/AppScreen";
import { AuthGate } from "../src/components/AuthGate";
import { Message } from "../src/components/Message";
import { Panel } from "../src/components/Panel";
import { EmptyState, LoadingState } from "../src/components/ResourceStatus";
import { useTheme } from "../src/contexts/ThemeContext";
import {
  createEmployee,
  deleteEmployee,
  listEmployees,
  updateEmployee,
  type EmployeeDto,
} from "../src/services/api";

type RoleOption = "employee" | "admin" | "owner";

const ROLES: { label: string; value: RoleOption }[] = [
  { label: "Funcionário", value: "employee" },
  { label: "Administrador", value: "admin" },
  { label: "Proprietário", value: "owner" },
];

function UsersContent() {
  const { colors, styles } = useTheme();
  const [employees, setEmployees] = useState<EmployeeDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // Modal formulário
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [position, setPosition] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<RoleOption>("employee");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const data = await listEmployees();
      setEmployees(Array.isArray(data) ? data : []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível carregar os funcionários.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const handleOpenCreate = () => {
    setEditingId(null);
    setName("");
    setCpf("");
    setPhone("");
    setPosition("");
    setEmail("");
    setRole("employee");
    setPassword("");
    setFormError("");
    setModalVisible(true);
  };

  const handleOpenEdit = (emp: EmployeeDto) => {
    setEditingId(emp.idFuncionario);
    setName(emp.nomeFuncionario);
    setCpf(emp.cpfFuncionario);
    setPhone(emp.telefoneFuncionario);
    setPosition(emp.cargoFuncionario);
    setEmail(emp.emailFuncionario);
    setRole((emp.role as RoleOption) || "employee");
    setPassword("");
    setFormError("");
    setModalVisible(true);
  };

  const handleSave = async () => {
    setFormError("");
    if (!name.trim() || !cpf.trim() || !email.trim() || !position.trim()) {
      setFormError("Preencha nome, CPF, e-mail e cargo.");
      return;
    }
    if (!editingId && !password.trim()) {
      setFormError("Informe uma senha para o novo funcionário.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        nomeFuncionario: name.trim(),
        cpfFuncionario: cpf.trim(),
        telefoneFuncionario: phone.trim(),
        cargoFuncionario: position.trim(),
        emailFuncionario: email.trim(),
        role,
        ...(password.trim() ? { senha: password.trim() } : {}),
      };

      if (editingId) {
        await updateEmployee(editingId, payload);
        Alert.alert("Sucesso", "Funcionário atualizado com sucesso.");
      } else {
        await createEmployee(payload);
        Alert.alert("Sucesso", "Funcionário cadastrado com sucesso.");
      }

      setModalVisible(false);
      await load(true);
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : "Erro ao salvar funcionário.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (emp: EmployeeDto) => {
    Alert.alert(
      "Desativar Funcionário",
      `Deseja realmente desativar o cadastro de ${emp.nomeFuncionario}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Desativar",
          style: "destructive",
          onPress: () => {
            void deleteEmployee(emp.idFuncionario)
              .then(() => load(true))
              .catch((reason: unknown) =>
                Alert.alert(
                  "Erro",
                  reason instanceof Error ? reason.message : "Não foi possível desativar o funcionário.",
                ),
              );
          },
        },
      ],
    );
  };

  return (
    <AppScreen
      title="Usuários"
      subtitle="Gerenciamento de funcionários e permissões."
      refreshing={refreshing}
      onRefresh={() => void load(true)}
      safeArea
    >
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
        <ActionButton
          title="Voltar ao Início"
          variant="secondary"
          onPress={() => router.back()}
          style={{ flex: 1 }}
        />
        <ActionButton
          title="Novo Funcionário"
          onPress={handleOpenCreate}
          style={{ flex: 1 }}
        />
      </View>

      {error ? <Message kind="error" text={error} /> : null}
      {loading && employees.length === 0 ? <LoadingState label="Carregando funcionários..." /> : null}
      {!loading && employees.length === 0 ? <EmptyState text="Nenhum funcionário cadastrado." /> : null}

      <FlatList
        data={employees}
        keyExtractor={(item) => String(item.idFuncionario)}
        scrollEnabled={false}
        renderItem={({ item }) => {
          const isActive = item.statusFuncionario?.toUpperCase() !== "INATIVO";
          return (
            <Panel key={item.idFuncionario}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.foreground, fontFamily: "Inter_700Bold", fontSize: 16 }}>
                    {item.nomeFuncionario}
                  </Text>
                  <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 4 }}>
                    {item.cargoFuncionario} · {item.role}
                  </Text>
                </View>
                <View
                  style={{
                    backgroundColor: isActive ? colors.successSoft : colors.destructiveSoft,
                    borderRadius: 12,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                  }}
                >
                  <Text
                    style={{
                      color: isActive ? colors.success : colors.destructive,
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 12,
                    }}
                  >
                    {isActive ? "Ativo" : "Inativo"}
                  </Text>
                </View>
              </View>

              <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 8 }}>
                {item.emailFuncionario} · CPF: {item.cpfFuncionario}
              </Text>

              <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Editar ${item.nomeFuncionario}`}
                  onPress={() => handleOpenEdit(item)}
                  style={{
                    flex: 1,
                    backgroundColor: colors.primarySoft,
                    paddingVertical: 8,
                    borderRadius: 8,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>
                    Editar
                  </Text>
                </Pressable>
                {isActive ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Desativar ${item.nomeFuncionario}`}
                    onPress={() => handleDelete(item)}
                    style={{
                      flex: 1,
                      backgroundColor: colors.destructiveSoft,
                      paddingVertical: 8,
                      borderRadius: 8,
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ color: colors.destructive, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>
                      Desativar
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </Panel>
          );
        }}
      />

      {/* Modal Criar/Editar Funcionário */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: "center", padding: 16 }}>
          <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 20, maxHeight: "90%" }}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.sectionTitle, { fontSize: 20, marginBottom: 12 }]}>
                {editingId ? "Editar Funcionário" : "Novo Funcionário"}
              </Text>

              <Text style={styles.fieldLabel}>Nome Completo</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Ex.: Carlos da Silva"
                placeholderTextColor={colors.mutedForeground}
                style={styles.input}
              />

              <Text style={styles.fieldLabel}>CPF</Text>
              <TextInput
                value={cpf}
                onChangeText={setCpf}
                placeholder="Ex.: 123.456.789-00"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numeric"
                style={styles.input}
              />

              <Text style={styles.fieldLabel}>E-mail</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="carlos@exemplo.com"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
              />

              <Text style={styles.fieldLabel}>Telefone</Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="(11) 98765-4321"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="phone-pad"
                style={styles.input}
              />

              <Text style={styles.fieldLabel}>Cargo</Text>
              <TextInput
                value={position}
                onChangeText={setPosition}
                placeholder="Ex.: Garçom, Cozinheiro, Gerente"
                placeholderTextColor={colors.mutedForeground}
                style={styles.input}
              />

              <Text style={styles.fieldLabel}>Perfil de Acesso</Text>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
                {ROLES.map((r) => (
                  <ActionButton
                    key={r.value}
                    title={r.label}
                    variant={role === r.value ? "primary" : "secondary"}
                    onPress={() => setRole(r.value)}
                    style={{ flex: 1 }}
                  />
                ))}
              </View>

              <Text style={styles.fieldLabel}>
                {editingId ? "Nova Senha (opcional)" : "Senha de Acesso"}
              </Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder={editingId ? "Deixe em branco para não alterar" : "Mínimo 6 caracteres"}
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry
                style={styles.input}
              />

              {formError ? <Message kind="error" text={formError} /> : null}

              <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
                <ActionButton
                  title="Cancelar"
                  variant="secondary"
                  onPress={() => setModalVisible(false)}
                  style={{ flex: 1 }}
                />
                <ActionButton
                  title="Salvar"
                  onPress={() => void handleSave()}
                  loading={saving}
                  disabled={saving}
                  style={{ flex: 1 }}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </AppScreen>
  );
}

export default function UsersScreen() {
  return (
    <AuthGate managerOnly>
      <UsersContent />
    </AuthGate>
  );
}
