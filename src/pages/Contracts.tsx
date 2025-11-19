import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Eye, FileSignature, Printer, Plus } from "lucide-react";
import { resolveProposalNumber } from "@/utils/resolveProposalNumber";
import {
  ContractPdfData,
  ContractItem,
  generateContractPDF,
} from "@/utils/contractPdfGenerator";

interface ContractRecord {
  id: string;
  created_at: string;
  contract_number?: string | null;
  status?: string | null;
  proposal_id?: string | null;
  clients: {
    name: string;
    company_name: string;
    document?: string | null;
    email?: string | null;
    phone?: string | null;
    segment?: string | null;
  };
  proposals?: any;
}

export default function Contracts() {
  const navigate = useNavigate();
  const [contracts, setContracts] = useState<ContractRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewData, setPreviewData] = useState<string | null>(null);
  const supabaseClient = supabase as any;

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    setLoading(true);
    const { data, error } = await supabaseClient
      .from("contracts")
      .select(`
        *,
        clients (
          name,
          company_name,
          document,
          email,
          phone,
          segment
        ),
        proposals (
          id,
          date,
          responsible,
          company_name,
          company_address,
          company_phone,
          company_email,
          intro_text,
          objective_text,
          services_text,
          why_text,
          proposals_number (id)
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar contratos");
    } else {
      setContracts(data || []);
    }
    setLoading(false);
  };

  const fetchItems = async (proposalId?: string | null) => {
    if (!proposalId) return [] as ContractItem[];
    const { data, error } = await supabase
      .from("proposal_items")
      .select(`
        *,
        products (
          name,
          description
        )
      `)
      .eq("proposal_id", proposalId);

    if (error) {
      toast.error("Erro ao carregar itens da proposta");
      return [] as ContractItem[];
    }

    return (data || []).map((item: any) => ({
      name: item.products?.name || "Serviço",
      description: item.products?.description,
      implantation: item.implantation,
      recurrence: item.recurrence,
    }));
  };

  const buildPdfData = async (contract: ContractRecord): Promise<ContractPdfData> => {
    const items = await fetchItems(contract.proposal_id || contract.proposals?.id);
    const proposalNumber = contract.proposals
      ? resolveProposalNumber(contract.proposals as any)
      : undefined;

    return {
      contractNumber: contract.contract_number || undefined,
      contractDate: contract.created_at || contract.proposals?.date || new Date().toISOString(),
      contractStatus: contract.status || undefined,
      client: {
        name: contract.clients?.name,
        companyName: contract.clients?.company_name,
        document: contract.clients?.document,
        email: contract.clients?.email,
        phone: contract.clients?.phone,
        segment: contract.clients?.segment,
      },
      company: {
        name: contract.proposals?.company_name,
        address: contract.proposals?.company_address,
        phone: contract.proposals?.company_phone,
        email: contract.proposals?.company_email,
        responsible: contract.proposals?.responsible,
      },
      proposal: contract.proposals
        ? {
            id: contract.proposals.id,
            number: proposalNumber,
            date: contract.proposals.date,
            responsible: contract.proposals.responsible,
            introText: contract.proposals.intro_text,
            objectiveText: contract.proposals.objective_text,
            servicesText: contract.proposals.services_text,
            whyText: contract.proposals.why_text,
            items,
          }
        : undefined,
      signatures: {
        companySigner: contract.proposals?.responsible,
        clientSigner: contract.clients?.name,
      },
    };
  };

  const handlePreview = async (contract: ContractRecord) => {
    const pdfData = await buildPdfData(contract);
    const dataUri = await generateContractPDF(pdfData, { returnData: "datauristring" });
    setPreviewData(dataUri);
    toast.success("PDF gerado com sucesso!");
  };

  const handlePrint = async (contract: ContractRecord) => {
    const pdfData = await buildPdfData(contract);
    const dataUri = await generateContractPDF(pdfData, { returnData: "datauristring" });
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(
        `<iframe src="${dataUri}" style="width:100%;height:100%;" title="Contrato"></iframe>`,
      );
      setTimeout(() => printWindow.print(), 500);
    }
    toast.success("PDF enviado para impressão!");
  };

  const handleSign = async (contract: ContractRecord) => {
    const pdfData = await buildPdfData(contract);
    const blob = await generateContractPDF(pdfData, { returnData: "blob" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Contrato_${contract.clients?.name || contract.clients?.company_name}.pdf`;
    link.click();
    window.open(url, "_blank");
    toast.success("Contrato pronto para assinatura e download!");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Contratos</h1>
          <p className="text-muted-foreground">Gerencie contratos vinculados às propostas</p>
        </div>
        <Button onClick={() => navigate("/proposals")}>
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
              <TableHead>Status</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : contracts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  Nenhum contrato cadastrado
                </TableCell>
              </TableRow>
            ) : (
              contracts.map((contract) => (
                <TableRow key={contract.id}>
                  <TableCell className="font-medium">
                    {contract.contract_number || resolveProposalNumber(contract.proposals as any) || "-"}
                  </TableCell>
                  <TableCell className="font-medium">
                    {contract.clients?.name}
                  </TableCell>
                  <TableCell>{contract.status || "Em aberto"}</TableCell>
                  <TableCell>
                    {new Date(contract.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handlePreview(contract)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handlePrint(contract)}>
                        <Printer className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleSign(contract)}>
                        <FileSignature className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!previewData} onOpenChange={() => setPreviewData(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Visualização do Contrato</DialogTitle>
            <DialogDescription>
              Pré-visualização em PDF em base64 gerada a partir dos dados do contrato
            </DialogDescription>
          </DialogHeader>
          <div className="h-[70vh]">
            {previewData && (
              <iframe src={previewData} className="w-full h-full" title="Contrato" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
