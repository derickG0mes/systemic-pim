import { useCallback, useState } from "react";
import { Alert, Text, TextInput, View } from "react-native";
import { ActionButton } from "../../src/components/ActionButton";
import { AppScreen } from "../../src/components/AppScreen";
import { Message } from "../../src/components/Message";
import { Panel } from "../../src/components/Panel";
import { EmptyState, LoadingState } from "../../src/components/ResourceStatus";
import { useCachedResource } from "../../src/hooks/useCachedResource";
import { formatDateTime } from "../../src/lib/format";
import { cancelReservation, createReservation, listReservations, listTables } from "../../src/services/api";
import type { ReservationDto, TableDto } from "../../src/types/api";
import { useTheme } from "../../src/contexts/ThemeContext";

export default function ReservationsScreen() {
  const { colors, styles } = useTheme();
  const loadReservations = useCallback(() => listReservations(), []);
  const loadTables = useCallback(() => listTables(), []);
  const reservations = useCachedResource<ReservationDto[]>("reservations", loadReservations);
  const tables = useCachedResource<TableDto[]>("tables", loadTables);
  const [name, setName] = useState("");
  const [tableNumber, setTableNumber] = useState<number | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const refresh = () => {
    void reservations.refresh();
    void tables.refresh();
  };

  const handleCreate = async () => {
    setFormError("");
    if (!name.trim() || tableNumber === null || !date || !time) {
      setFormError("Informe o nome, a mesa, a data e o horário da reserva.");
      return;
    }

    const reservationDate = new Date(`${date}T${time}:00`);
    if (Number.isNaN(reservationDate.getTime()) || reservationDate <= new Date()) {
      setFormError("A data e o horário devem ser válidos e futuros.");
      return;
    }

    setSaving(true);
    try {
      await createReservation({
        nomeCliente: name.trim(),
        numeroMesa: tableNumber,
        dataReserva: reservationDate.toISOString(),
      });
      setName("");
      setTableNumber(null);
      setDate("");
      setTime("");
      await reservations.refresh();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Não foi possível criar a reserva.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = (reservation: ReservationDto) => {
    Alert.alert("Cancelar reserva", `Cancelar a reserva de ${reservation.nomeCliente}?`, [
      { text: "Manter", style: "cancel" },
      {
        text: "Cancelar reserva",
        style: "destructive",
        onPress: () => {
          void cancelReservation(reservation.idReserva)
            .then(() => reservations.refresh())
            .catch((error: unknown) =>
              Alert.alert("Não foi possível cancelar", error instanceof Error ? error.message : "Falha na API."),
            );
        },
      },
    ]);
  };

  return (
    <AppScreen
      title="Reservas"
      subtitle="Consulte, crie ou cancele reservas."
      refreshing={reservations.refreshing || tables.refreshing}
      onRefresh={refresh}
    >
      {reservations.error ? <Message kind="error" text={reservations.error} /> : null}
      {tables.error ? <Message kind="error" text={tables.error} /> : null}
      {reservations.cacheWarning ? <Message kind="info" text={reservations.cacheWarning} /> : null}

      <Panel>
        <Text style={styles.sectionTitle}>Nova reserva</Text>
        <Text style={styles.fieldLabel}>Nome do cliente</Text>
        <TextInput
          accessibilityLabel="Nome do cliente"
          value={name}
          onChangeText={setName}
          placeholder="Nome"
          placeholderTextColor={colors.mutedForeground}
          style={styles.input}
        />
        <Text style={styles.fieldLabel}>Mesa</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {(tables.data ?? []).map((table) => (
            <ActionButton
              key={table.idMesa}
              title={String(table.numeroMesa)}
              variant={tableNumber === table.numeroMesa ? "primary" : "secondary"}
              onPress={() => setTableNumber(table.numeroMesa)}
              style={{ minWidth: 54 }}
            />
          ))}
        </View>
        <Text style={styles.fieldLabel}>Data (AAAA-MM-DD)</Text>
        <TextInput
          accessibilityLabel="Data da reserva"
          value={date}
          onChangeText={setDate}
          placeholder="2026-12-31"
          placeholderTextColor={colors.mutedForeground}
          keyboardType="numbers-and-punctuation"
          style={styles.input}
        />
        <Text style={styles.fieldLabel}>Horário (HH:MM)</Text>
        <TextInput
          accessibilityLabel="Horário da reserva"
          value={time}
          onChangeText={setTime}
          placeholder="19:30"
          placeholderTextColor={colors.mutedForeground}
          keyboardType="numbers-and-punctuation"
          style={styles.input}
        />
        {formError ? <Message kind="error" text={formError} /> : null}
        <ActionButton
          title={saving ? "Salvando..." : "Criar reserva"}
          onPress={() => void handleCreate()}
          loading={saving}
          disabled={saving}
          style={{ marginTop: 14 }}
        />
      </Panel>

      <Text style={styles.sectionTitle}>Reservas cadastradas</Text>
      {reservations.loading && !reservations.data ? <LoadingState label="Carregando reservas..." /> : null}
      {!reservations.loading && (reservations.data?.length ?? 0) === 0 ? (
        <EmptyState text="Nenhuma reserva encontrada." />
      ) : null}
      {(reservations.data ?? []).map((reservation) => {
        const cancelled = reservation.statusReserva?.toUpperCase() === "CANCELADA";
        return (
          <Panel key={reservation.idReserva}>
            <Text style={{ color: colors.foreground, fontFamily: "Inter_700Bold", fontSize: 17 }}>
              {reservation.nomeCliente}
            </Text>
            <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 6 }}>
              Mesa {reservation.numeroMesa} · {formatDateTime(reservation.dataReserva)}
            </Text>
            <Text style={{ color: cancelled ? colors.destructive : colors.success, fontFamily: "Inter_600SemiBold", marginTop: 5 }}>
              {cancelled ? "Cancelada" : "Ativa"}
            </Text>
            {!cancelled ? (
              <ActionButton
                title="Cancelar reserva"
                variant="danger"
                onPress={() => handleCancel(reservation)}
                style={{ marginTop: 12 }}
              />
            ) : null}
          </Panel>
        );
      })}
    </AppScreen>
  );
}
