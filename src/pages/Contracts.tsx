import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Pencil, Plus, RefreshCcw } from "lucide-react";
import { resolveProposalNumber } from "@/utils/resolveProposalNumber";

interface ClientOption {
  id: string;
  name: string;
  company_name: string;
}

interface ProposalOption {
  id: string;
  date: string;
  proposal_number?: string | null;
  proposals_number?: { id?: number | null } | { id?: number | null }[] | null;
  clients?: {
    id: string;
    name: string;
    company_name: string;
  } | null;
}

interface Contract {
  id: string;
  client_id: string;
  proposal_id: string | null;
  start_date: string;
  end_date: string | null;
  status: string;
  notes: string | null;
  clients?: ClientOption;
  proposals?: ProposalOption;
}

const statusOptions = [
  { value: "ativo", label: "Ativo" },
  { value: "encerrado", label: "Encerrado" },
  { value: "pendente", label: "Pendente" },
];

export default function Contracts() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [proposals, setProposals] = useState<ProposalOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [renewOpen, setRenewOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [renewingContract, setRenewingContract] = useState<Contract | null>(null);
  const [formData, setFormData] = useState({
    client_id: "",
    proposal_id: "",
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",
    status: "ativo",
    notes: "",
  });
  const [renewData, setRenewData] = useState({
    end_date: "",
    notes: "",
  });
  const { user } = useAuth();
  const navigate = useNavigate();

  const proposalMap = useMemo(
    () =>
      proposals.reduce<Record<string, string>>((acc, proposal) => {
        const number = resolveProposalNumber(proposal as any);
        acc[proposal.id] = number || "Sem número";
        return acc;
      }, {}),
    [proposals]
  );

  useEffect(() => {
    fetchContracts();
    fetchClients();
    fetchProposals();
  }, []);

  const fetchContracts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("contracts")
      .select(`
        *,
        clients (id, name, company_name),
        proposals (
          id,
          date,
          proposal_number,
          proposals_number (id),
          clients (id, name, company_name)
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar contratos");
    } else {
      setContracts((data as Contract[]) || []);
    }
    setLoading(false);
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

  const fetchProposals = async () => {
    const { data, error } = await supabase
      .from("proposals")
      .select(`
        id,
        date,
        proposal_number,
        proposals_number (id),
        clients (id, name, company_name)
      `)
      .order("date", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar propostas");
    } else {
      setProposals((data as ProposalOption[]) || []);
    }
  };

  const handleOpenNew = () => {
    setEditingContract(null);
    setFormData({
      client_id: "",
      proposal_id: "",
      start_date: new Date().toISOString().split("T")[0],
      end_date: "",
      status: "ativo",
      notes: "",
    });
    setOpen(true);
  };

  const handleEdit = (contract: Contract) => {
    setEditingContract(contract);
    setFormData({
      client_id: contract.client_id,
      proposal_id: contract.proposal_id || "",
      start_date: contract.start_date,
      end_date: contract.end_date || "",
      status: contract.status,
      notes: contract.notes || "",
    });
    setOpen(true);
  };

  const handleRenew = (contract: Contract) => {
    setRenewingContract(contract);
    setRenewData({
      end_date: contract.end_date || new Date().toISOString().split("T")[0],
      notes: contract.notes || "",
    });
    setRenewOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.client_id || !formData.start_date || !formData.status) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    if (!user?.id) {
      toast.error("Usuário não autenticado");
      return;
    }

    const payload = {
      client_id: formData.client_id,
      proposal_id: formData.proposal_id || null,
      start_date: formData.start_date,
      end_date: formData.end_date || null,
      status: formData.status,
      notes: formData.notes || null,
    };

    if (editingContract) {
      const { error } = await supabase
        .from("contracts")
        .update(payload)
        .eq("id", editingContract.id);

      if (error) {
        toast.error("Erro ao atualizar contrato");
        return;
      }

      toast.success("Contrato atualizado com sucesso!");
    } else {
      const { error } = await supabase.from("contracts").insert([payload]);

      if (error) {
        toast.error("Erro ao criar contrato");
        return;
      }

      toast.success("Contrato criado com sucesso!");
    }

    setOpen(false);
    fetchContracts();
  };

  const handleRenewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!renewingContract) return;

    if (!renewData.end_date) {
      toast.error("Informe a nova data de término");
      return;
    }

    if (!user?.id) {
      toast.error("Usuário não autenticado");
      return;
    }

    const { error } = await supabase
      .from("contracts")
      .update({
        end_date: renewData.end_date,
        notes: renewData.notes || null,
        status: "ativo",
      })
      .eq("id", renewingContract.id);

    if (error) {
      toast.error("Erro ao renovar contrato");
      return;
    }

    toast.success("Contrato renovado com sucesso!");
    setRenewOpen(false);
    fetchContracts();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Contratos</h1>
          <p className="text-muted-foreground">Gerencie contratos ativos e renovações</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/proposals")}>Propostas</Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenNew}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Contrato
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>
                  {editingContract ? "Editar contrato" : "Novo contrato"}
                </DialogTitle>
              </DialogHeader>
              <form className="space-y-4" onSubmit={handleSave}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cliente</Label>
                    <Select
                      value={formData.client_id}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, client_id: value }))
                      }
                    >
                      <SelectTrigger>
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
                    <Label>Proposta</Label>
                    <Select
                      value={formData.proposal_id}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, proposal_id: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma proposta" />
                      </SelectTrigger>
                      <SelectContent>
                        {proposals.map((proposal) => (
                          <SelectItem key={proposal.id} value={proposal.id}>
                            {proposalMap[proposal.id]} - {proposal.clients?.company_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Data de início</Label>
                    <Input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          start_date: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Data de término</Label>
                    <Input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          end_date: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, status: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o status" />
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
                  <div className="space-y-2 md:col-span-2">
                    <Label>Observações</Label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, notes: e.target.value }))
                      }
                      placeholder="Detalhes relevantes do contrato"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">
                    {editingContract ? "Salvar alterações" : "Criar contrato"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Proposta</TableHead>
              <TableHead>Início</TableHead>
              <TableHead>Término</TableHead>
              <TableHead>Status</TableHead>
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
            ) : contracts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  Nenhum contrato cadastrado
                </TableCell>
              </TableRow>
            ) : (
              contracts.map((contract) => (
                <TableRow key={contract.id}>
                  <TableCell className="font-medium">
                    {contract.clients?.company_name || "-"}
                  </TableCell>
                  <TableCell className="font-medium">
                    {contract.proposals
                      ? proposalMap[contract.proposals.id]
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {new Date(contract.start_date).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell>
                    {contract.end_date
                      ? new Date(contract.end_date).toLocaleDateString("pt-BR")
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">
                      {contract.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Dialog open={renewOpen && renewingContract?.id === contract.id} onOpenChange={setRenewOpen}>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRenew(contract)}
                          >
                            <RefreshCcw className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[480px]">
                          <DialogHeader>
                            <DialogTitle>Renovar contrato</DialogTitle>
                          </DialogHeader>
                          <form className="space-y-4" onSubmit={handleRenewSubmit}>
                            <div className="space-y-2">
                              <Label>Nova data de término</Label>
                              <Input
                                type="date"
                                value={renewData.end_date}
                                onChange={(e) =>
                                  setRenewData((prev) => ({
                                    ...prev,
                                    end_date: e.target.value,
                                  }))
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Observações</Label>
                              <Textarea
                                value={renewData.notes}
                                onChange={(e) =>
                                  setRenewData((prev) => ({
                                    ...prev,
                                    notes: e.target.value,
                                  }))
                                }
                                placeholder="Detalhes sobre a renovação"
                              />
                            </div>
                            <DialogFooter>
                              <Button type="submit">Confirmar renovação</Button>
                            </DialogFooter>
                          </form>
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(contract)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
