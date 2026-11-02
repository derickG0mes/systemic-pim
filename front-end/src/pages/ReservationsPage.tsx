import React, { useState } from "react";
import { useRestaurant } from "@/contexts/useRestaurant";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, CalendarClock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ReservationsPage() {
  const { reservations, addReservation, cancelReservation } = useRestaurant();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ clientName: "", tableNumber: "", date: "", time: "", guests: "2" });

  const handleAdd = async () => {
    const result = await addReservation({
      clientName: form.clientName,
      tableNumber: parseInt(form.tableNumber),
      date: form.date,
      time: form.time,
      guests: parseInt(form.guests),
    });
    toast({ title: result.success ? "Sucesso" : "Erro", description: result.message, variant: result.success ? "default" : "destructive" });
    if (result.success) {
      setForm({ clientName: "", tableNumber: "", date: "", time: "", guests: "2" });
      setOpen(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reservas</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Nova Reserva</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova Reserva</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Nome do Cliente" value={form.clientName} onChange={e => setForm({ ...form, clientName: e.target.value })} />
              <Input placeholder="Número da Mesa" type="number" value={form.tableNumber} onChange={e => setForm({ ...form, tableNumber: e.target.value })} />
              <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
              <Input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} />
              <Input placeholder="Nº de Convidados" type="number" value={form.guests} onChange={e => setForm({ ...form, guests: e.target.value })} />
              <Button onClick={handleAdd} className="w-full">Reservar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table aria-label="Reservas">
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Mesa</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Horário</TableHead>
                <TableHead>Pessoas</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reservations.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground"><CalendarClock className="h-8 w-8 mx-auto mb-2 opacity-50" />Nenhuma reserva</TableCell></TableRow>
              ) : reservations.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.clientName}</TableCell>
                  <TableCell>{r.tableNumber}</TableCell>
                  <TableCell>{r.date}</TableCell>
                  <TableCell>{r.time}</TableCell>
                  <TableCell>{r.guests}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => cancelReservation(r.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
