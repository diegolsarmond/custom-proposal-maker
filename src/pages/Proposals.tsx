import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, FileText, Trash2, ExternalLink } from "lucide-react";
import { generateProposalPDF } from "@/utils/pdfGenerator";

interface Proposal {
  id: string;
  date: string;
  responsible: string;
  created_at: string;
  proposal_number: string;
  clients: {
    name: string;
    company_name: string;
  };
}

export default function Proposals() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProposals();
  }, []);

  const fetchProposals = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("proposals")
      .select(`
        *,
        clients (
          name,
          company_name
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar propostas");
    } else {
      setProposals(data || []);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta proposta?")) return;

    const { error } = await supabase.from("proposals").delete().eq("id", id);

    if (error) {
      toast.error("Erro ao excluir proposta");
    } else {
      toast.success("Proposta excluída com sucesso!");
      fetchProposals();
    }
  };

  const handleGeneratePDF = async (
    proposal: Proposal,
    openInNewTab = false
  ) => {
    const { data: proposalData, error: proposalError } = await supabase
      .from("proposals")
      .select(`
        *,
        clients (
          name,
          company_name,
          document,
          email,
          phone,
          segment
        )
      `)
      .eq("id", proposal.id)
      .single();

    if (proposalError) {
      toast.error("Erro ao carregar dados da proposta");
      return;
    }

    const { data: items, error: itemsError } = await supabase
      .from("proposal_items")
      .select(`
        *,
        products (
          id,
          name
        )
      `)
      .eq("proposal_id", proposal.id);

    if (itemsError) {
      toast.error("Erro ao carregar itens da proposta");
      return;
    }

    const selectedAutomations: any = {};
    items.forEach((item: any) => {
      selectedAutomations[item.products.id] = {
        selected: true,
        implantation: Number(item.implantation),
        recurrence: Number(item.recurrence),
        name: item.products.name,
      };
    });

    const pdfData = {
      clientName: proposalData.clients.name,
      companyName: proposalData.clients.company_name,
      document: proposalData.clients.document || "",
      email: proposalData.clients.email,
      phone: proposalData.clients.phone || "",
      date: proposalData.date,
      segment: proposalData.clients.segment || "",
      proposalNumber: proposalData.proposal_number,
      selectedAutomations,
      observations: proposalData.observations || "",
      responsible: proposalData.responsible,
      companyConfig: {
        name: proposalData.company_name,
        address: proposalData.company_address,
        email: proposalData.company_email,
        phone: proposalData.company_phone,
      },
      proposalTexts: {
        introductionText: proposalData.intro_text,
        objectiveText: proposalData.objective_text,
        servicesText: proposalData.services_text,
        whyText: proposalData.why_text,
      },
    };

    generateProposalPDF(pdfData, { openInNewTab });
    toast.success("PDF gerado com sucesso!");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Propostas Comerciais</h1>
          <p className="text-muted-foreground">Gerencie suas propostas</p>
        </div>
        <Button onClick={() => navigate("/proposals/new")}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Proposta
        </Button>
      </div>

      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Responsável</TableHead>
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
            ) : proposals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  Nenhuma proposta cadastrada
                </TableCell>
              </TableRow>
            ) : (
              proposals.map((proposal) => (
                <TableRow key={proposal.id}>
                  <TableCell className="font-medium">
                    {proposal.proposal_number}
                  </TableCell>
                  <TableCell className="font-medium">
                    {proposal.clients.name}
                  </TableCell>
                  <TableCell>{proposal.clients.company_name}</TableCell>
                  <TableCell>
                    {new Date(proposal.date).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell>{proposal.responsible}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleGeneratePDF(proposal)}
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleGeneratePDF(proposal, true)}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(proposal.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
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
