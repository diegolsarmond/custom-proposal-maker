import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CalendarPlus, Pencil, Plus, RotateCcw, Slash } from "lucide-react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  createEvent,
  updateEvent,
  cancelEvent,
} from "@/integrations/googleCalendar";

interface ClientOption {
  id: string;
  name: string;
  company_name: string;
}

interface Appointment {
  id: string;
  client_id: string;
  scheduled_at: string;
  type: string;
  description: string;
  duration?: number | null;
  status: string;
  link_meet?: string | null;
  google_event_id?: string | null;
  clients: {
    id: string;
    name: string;
    company_name: string;
  };
}

const statusOptions = [
  { value: "ativo", label: "Ativo" },
  { value: "cancelado", label: "Cancelado" },
];

export default function Agenda() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [calendarAppointments, setCalendarAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [statusFilter, setStatusFilter] = useState("todos");
  const [clientFilter, setClientFilter] = useState("todos");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const pageSize = 10;
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    client_id: "",
    scheduled_at: "",
    type: "",
    description: "",
    duration: 60,
    status: "ativo",
  });

  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalCount / pageSize)), [
    totalCount,
    pageSize,
  ]);

  const triggerWebhook = async (appointment: Appointment, eventType: string) => {
    const payload = {
      id: appointment.id,
      client_id: appointment.client_id,
      scheduled_at: appointment.scheduled_at,
      type: appointment.type,
      description: appointment.description,
      status: appointment.status,
      google_event_id: appointment.google_event_id,
      client: appointment.clients,
      event_type: eventType,
    };

    try {
      const response = await fetch(
        "https://n8n.quantumtecnologia.com.br/webhook/agenda-crm",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        console.error("Erro ao acionar webhook da agenda");
      }
    } catch (webhookError) {
      console.error(webhookError);
    }
  };

  useEffect(() => {
    fetchClients();
    fetchCalendarAppointments();
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [page, statusFilter, clientFilter]);

  const fetchCalendarAppointments = async () => {
    const { data, error } = await supabase
      .from("appointments")
      .select(`*, clients (id, name, company_name)`)
      .order("scheduled_at", { ascending: true });

    if (error) {
      toast.error("Erro ao carregar eventos do calendário");
    } else {
      setCalendarAppointments((data as Appointment[]) || []);
    }
  };

  const fetchClients = async () => {
    const { data, error } = await supabase
      .from("clients")
      .select("id, name, company_name")
      .order("company_name", { ascending: true });

    if (error) {
      toast.error("Erro ao carregar clientes");
    } else {
      setClients(data || []);
    }
  };

  const fetchAppointments = async () => {
    setLoading(true);
    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;

    let query = supabase
      .from("appointments")
      .select(
        `*, clients (id, name, company_name)`,
        { count: "exact" },
      )
      .order("scheduled_at", { ascending: false })
      .range(start, end);

    if (statusFilter !== "todos") {
      query = query.eq("status", statusFilter);
    }

    if (clientFilter !== "todos") {
      query = query.eq("client_id", clientFilter);
    }

    const { data, error, count } = await query;

    if (error) {
      toast.error("Erro ao carregar agendamentos");
    } else {
      setAppointments((data as Appointment[]) || []);
      setTotalCount(count || 0);
    }

    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.client_id || !formData.scheduled_at || !formData.type || !formData.description) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const parsedDuration = formData.duration ? Number(formData.duration) : 60;

    if (!Number.isFinite(parsedDuration) || parsedDuration <= 0) {
      toast.error("Informe uma duração válida");
      return;
    }

    if (!user?.id) {
      toast.error("Usuário não autenticado");
      return;
    }

    if (editingAppointment) {
      const { data, error } = await supabase
        .from("appointments")
        .update({
          client_id: formData.client_id,
          scheduled_at: formData.scheduled_at,
          type: formData.type,
          description: formData.description,
          duration: parsedDuration,
          status: formData.status,
        })
        .eq("id", editingAppointment.id)
        .select("*, clients (id, name, company_name)")
        .single();

      if (error || !data) {
        toast.error("Erro ao atualizar agendamento");
      } else {
        let googleEventId = data.google_event_id;

        try {
          const updatedId = googleEventId
            ? await updateEvent(googleEventId, {
                scheduled_at: data.scheduled_at,
                type: data.type,
                description: data.description,
                duration: parsedDuration,
                clients: data.clients,
              })
            : await createEvent({
                scheduled_at: data.scheduled_at,
                type: data.type,
                description: data.description,
                duration: parsedDuration,
                clients: data.clients,
              });

          if (updatedId && updatedId !== googleEventId) {
            googleEventId = updatedId;
          }
        } catch (syncError) {
          console.error(syncError);
          toast.error("Erro ao sincronizar com o Google Calendar");
        }

        if (googleEventId && googleEventId !== data.google_event_id) {
          await supabase
            .from("appointments")
            .update({ google_event_id: googleEventId })
            .eq("id", data.id);
        }

        const updatedAppointment = {
          ...(data as Appointment),
          google_event_id: googleEventId,
        };

        toast.success("Agendamento atualizado com sucesso!");
        await triggerWebhook(updatedAppointment, "updated");
        fetchAppointments();
        fetchCalendarAppointments();
        handleClose();
      }
    } else {
      const { data, error } = await supabase
        .from("appointments")
        .insert([
          {
            client_id: formData.client_id,
            scheduled_at: formData.scheduled_at,
            type: formData.type,
            description: formData.description,
            duration: parsedDuration,
            status: formData.status,
            created_by: user.id,
          },
        ])
        .select("*, clients (id, name, company_name)")
        .single();

      if (error || !data) {
        toast.error("Erro ao criar agendamento");
      } else {
        let googleEventId = data.google_event_id;

        try {
          const createdId = await createEvent({
            scheduled_at: data.scheduled_at,
            type: data.type,
            description: data.description,
            duration: parsedDuration,
            clients: data.clients,
          });

          if (createdId) {
            googleEventId = createdId;
          }
        } catch (syncError) {
          console.error(syncError);
          toast.error("Erro ao sincronizar com o Google Calendar");
        }

        if (googleEventId && googleEventId !== data.google_event_id) {
          await supabase
            .from("appointments")
            .update({ google_event_id: googleEventId })
            .eq("id", data.id);
        }

        const createdAppointment = {
          ...data,
          google_event_id: googleEventId,
        } as Appointment;

        await triggerWebhook(createdAppointment, "created");

        toast.success("Agendamento criado com sucesso!");
        fetchAppointments();
        fetchCalendarAppointments();
        handleClose();
      }
    }
  };

  const handleEdit = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setFormData({
      client_id: appointment.client_id,
      scheduled_at: new Date(appointment.scheduled_at).toISOString().slice(0, 16),
      type: appointment.type,
      description: appointment.description,
      duration: appointment.duration ?? 60,
      status: appointment.status,
    });
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingAppointment(null);
    setFormData({
      client_id: "",
      scheduled_at: "",
      type: "",
      description: "",
      duration: 60,
      status: "ativo",
    });
  };

  const handleStatusChange = async (appointment: Appointment, status: string) => {
    const { error } = await supabase
      .from("appointments")
      .update({ status })
      .eq("id", appointment.id);

    if (error) {
      toast.error("Erro ao atualizar status");
    } else {
      toast.success("Status atualizado");
      if (status === "cancelado" && appointment.google_event_id) {
        try {
          await cancelEvent(appointment.google_event_id);
        } catch (syncError) {
          console.error(syncError);
          toast.error("Erro ao sincronizar cancelamento no Google Calendar");
        }
      }
      const updatedAppointment = { ...appointment, status };
      await triggerWebhook(updatedAppointment, "status_changed");
      fetchAppointments();
      fetchCalendarAppointments();
    }
  };

  const handleFilterChange = (setter: (value: string) => void, value: string) => {
    setter(value);
    setPage(1);
  };

  const canGoPrevious = page > 1;
  const canGoNext = page < totalPages;

  const appointmentsByDate = useMemo(() => {
    const grouped: Record<string, Appointment[]> = {};

    calendarAppointments.forEach((appointment) => {
      const key = format(new Date(appointment.scheduled_at), "yyyy-MM-dd");

      if (!grouped[key]) {
        grouped[key] = [];
      }

      grouped[key].push(appointment);
    });

    return grouped;
  }, [calendarAppointments]);

  const eventDays = useMemo(() => {
    const uniqueDates = new Map<string, Date>();

    calendarAppointments.forEach((appointment) => {
      const date = new Date(appointment.scheduled_at);
      const key = format(date, "yyyy-MM-dd");

      if (!uniqueDates.has(key)) {
        uniqueDates.set(key, new Date(date.toDateString()));
      }
    });

    return Array.from(uniqueDates.values());
  }, [calendarAppointments]);

  const selectedDateKey = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null;
  const selectedDayAppointments = selectedDateKey
    ? appointmentsByDate[selectedDateKey] || []
    : [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Agenda</h1>
          <p className="text-muted-foreground">Gerencie seus agendamentos</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Agendamento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{editingAppointment ? "Editar Agendamento" : "Novo Agendamento"}</DialogTitle>
              <DialogDescription>Preencha os dados do agendamento</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="client">Cliente *</Label>
                  <Select
                    value={formData.client_id}
                    onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                  >
                    <SelectTrigger id="client">
                      <SelectValue placeholder="Selecione um cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.company_name} - {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scheduled_at">Data e Hora *</Label>
                  <Input
                    id="scheduled_at"
                    type="datetime-local"
                    value={formData.scheduled_at}
                    onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Tipo *</Label>
                  <Input
                    id="type"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Duração</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      value={String(Math.floor((formData.duration ?? 60) / 60))}
                      onValueChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          duration:
                            Number(value) * 60 + ((prev.duration ?? 60) % 60),
                        }))
                      }
                    >
                      <SelectTrigger id="duration-hours">
                        <SelectValue placeholder="Horas" />
                      </SelectTrigger>
                      <SelectContent>
                        {[...Array(13)].map((_, index) => (
                          <SelectItem key={index} value={String(index)}>
                            {index}h
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={String((formData.duration ?? 60) % 60)}
                      onValueChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          duration:
                            Math.floor((prev.duration ?? 60) / 60) * 60 + Number(value),
                        }))
                      }
                    >
                      <SelectTrigger id="duration-minutes">
                        <SelectValue placeholder="Minutos" />
                      </SelectTrigger>
                      <SelectContent>
                        {[0, 15, 30, 45].map((minute) => (
                          <SelectItem key={minute} value={String(minute)}>
                            {minute}m
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button type="submit">{editingAppointment ? "Atualizar" : "Criar"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 border rounded-lg bg-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Calendário</h2>
              <p className="text-sm text-muted-foreground">
                Visualize agendamentos com destaques nos dias com eventos
              </p>
            </div>
            <Badge variant="outline">{eventDays.length} dias com eventos</Badge>
          </div>
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            locale={ptBR}
            weekStartsOn={1}
            modifiers={{ evento: eventDays }}
            modifiersStyles={{
              evento: {
                backgroundColor: "rgb(59 130 246)",
                color: "white",
              },
            }}
            className="w-full"
            styles={{
              root: { width: "100%", display: "flex", justifyContent: "center" },
              months: { width: "100%", justifyContent: "center" },
              month: { width: "100%" },
              caption_label: { fontSize: "1.1rem" },
              head_cell: { fontSize: "1rem" },
              day: { width: "3.75rem", height: "3.75rem", fontSize: "1rem" },
            }}
          />
        </div>
        <div className="border rounded-lg bg-card p-4 space-y-4">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">Eventos do dia</h3>
            <p className="text-sm text-muted-foreground">
              {selectedDate
                ? format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })
                : "Selecione uma data"}
            </p>
          </div>
          {selectedDayAppointments.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum evento para esta data.</p>
          ) : (
            <div className="space-y-3">
              {selectedDayAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="rounded-lg border p-3 bg-muted/50 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{appointment.type}</div>
                    <Badge
                      variant={
                        appointment.status === "ativo" ? "default" : "destructive"
                      }
                      className="capitalize"
                    >
                      {appointment.status}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {appointment.clients.company_name} - {appointment.clients.name}
                  </div>
                  <div className="text-sm">
                    {new Date(appointment.scheduled_at).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  {appointment.link_meet && (
                    <a
                      href={appointment.link_meet}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline break-all"
                    >
                      Link do Meet
                    </a>
                  )}
                  <div className="text-sm line-clamp-2">{appointment.description}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Filtrar por status</Label>
          <Select
            value={statusFilter}
            onValueChange={(value) => handleFilterChange(setStatusFilter, value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Filtrar por cliente</Label>
          <Select
            value={clientFilter}
            onValueChange={(value) => handleFilterChange(setClientFilter, value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.company_name} - {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => {
              handleFilterChange(setStatusFilter, "todos");
              handleFilterChange(setClientFilter, "todos");
            }}
          >
            Limpar filtros
          </Button>
          <Button
            onClick={() => {
              fetchAppointments();
              fetchCalendarAppointments();
            }}
            variant="ghost"
          >
            Atualizar
          </Button>
        </div>
      </div>

      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[220px]">Cliente</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Data/Hora</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : appointments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  Nenhum agendamento encontrado
                </TableCell>
              </TableRow>
            ) : (
              appointments.map((appointment) => (
                <TableRow key={appointment.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <CalendarPlus className="h-4 w-4" />
                      <div>
                        <div>{appointment.clients.company_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {appointment.clients.name}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{appointment.type}</TableCell>
                  <TableCell>
                    {new Date(appointment.scheduled_at).toLocaleString("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={appointment.status === "ativo" ? "default" : "destructive"}
                      className="capitalize"
                    >
                      {appointment.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[240px] truncate">
                    {appointment.description}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(appointment)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {appointment.status === "ativo" ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleStatusChange(appointment, "cancelado")}
                        >
                          <Slash className="h-4 w-4 text-destructive" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleStatusChange(appointment, "ativo")}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Pagination className="mt-4">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (canGoPrevious) {
                  setPage((prev) => prev - 1);
                }
              }}
              aria-disabled={!canGoPrevious}
              className={!canGoPrevious ? "pointer-events-none opacity-50" : ""}
            />
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="#" isActive>
              Página {page} de {totalPages}
            </PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationNext
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (canGoNext) {
                  setPage((prev) => prev + 1);
                }
              }}
              aria-disabled={!canGoNext}
              className={!canGoNext ? "pointer-events-none opacity-50" : ""}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
