import React, { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, FileText, Trash2, ExternalLink, Pencil } from "lucide-react";
import { generateProposalPDF } from "@/utils/pdfGenerator";
import { resolveProposalNumber } from "@/utils/resolveProposalNumber";
import { formatProposalPdfFileName } from "@/utils/proposalFileName";
import {
  getStoredCertificateInfo,
  hasStoredCertificate,
  signPdfWithPfx,
  storePfxCertificate,
} from "@/lib/signature/pfx";

interface Proposal {
  id: string;
  date: string;
  responsible: string;
  created_at: string;
  proposal_number?: string;
  sequence_number?: number;
  sequence_year?: number;
  proposals_number?: { id?: number | null } | { id?: number | null }[] | null;
  clients: {
    name: string;
    company_name: string;
  };
}

export default function Proposals() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [certificatePassword, setCertificatePassword] = useState("");
  const [certificateReady, setCertificateReady] = useState(hasStoredCertificate());
  const [certificateInfo, setCertificateInfo] = useState(getStoredCertificateInfo());
  const [signedProposals, setSignedProposals] = useState<Record<string, boolean>>({});
  const [signing, setSigning] = useState(false);
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
        proposals_number (
          id
        ),
        clients (
          name,
          company_name
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar propostas");
    } else {
      const normalized = (data || []).map((proposal: any) => ({
        ...proposal,
        proposal_number: resolveProposalNumber(proposal),
      }));
      setProposals(normalized as Proposal[]);
    }
    setLoading(false);
  };

  const handleCertificateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCertificateFile(file);
    }
  };

  const handleStoreCertificate = async () => {
    if (!certificateFile) {
      toast.error("Selecione um arquivo PFX");
      return;
    }

    if (!certificatePassword) {
      toast.error("Informe a senha do certificado");
      return;
    }

    try {
      await storePfxCertificate(certificateFile, certificatePassword);
      setCertificateReady(true);
      setCertificateInfo(getStoredCertificateInfo());
      toast.success("Certificado armazenado com segurança");
    } catch {
      toast.error("Não foi possível armazenar o certificado");
    }
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
    if (!certificateReady) {
      toast.error("Importe um certificado PFX antes de assinar o PDF");
      return;
    }

    if (!certificatePassword) {
      toast.error("Informe a senha do certificado para assinar o PDF");
      return;
    }

    setSigning(true);

    try {
      const { data: proposalData, error: proposalError } = await supabase
        .from("proposals")
        .select(`
          *,
          proposals_number (
            id
          ),
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

      if (proposalError || !proposalData) {
        throw new Error("Erro ao carregar dados da proposta");
      }

      const proposalNumber = resolveProposalNumber(proposalData as any) || "";

      const { data: items, error: itemsError } = await supabase
        .from("proposal_items")
        .select(`
          *,
          products (
            id,
            name,
            description
          )
        `)
        .eq("proposal_id", proposal.id);

      if (itemsError) {
        throw new Error("Erro ao carregar itens da proposta");
      }

      const selectedAutomations: Record<string, any> = {};
      (items || []).forEach((item: any) => {
        const product = item.products;
        if (!product) return;
        selectedAutomations[product.id] = {
          selected: true,
          implantation: Number(item.implantation),
          recurrence: Number(item.recurrence),
          name: product.name,
          description: product.description,
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
        proposalNumber,
        proposalId: String(proposalData.id),
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
        pricingLabels: {
          implantation: "Implantação (R$)",
          recurrence: "Recorrência",
        },
      };

      const unsignedPdf = (await generateProposalPDF(pdfData, {
        returnData: "blob",
      })) as Blob;

      const signedPdf = await signPdfWithPfx(unsignedPdf, certificatePassword);
      const fileName = formatProposalPdfFileName(
        proposalData.clients.name,
        proposalData.date
      );

      const blobUrl = URL.createObjectURL(signedPdf);

      if (openInNewTab) {
        window.open(blobUrl, "_blank");
      } else {
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      setSignedProposals((current) => ({ ...current, [proposal.id]: true }));
      toast.success("PDF assinado e gerado com sucesso!");

      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
      }, 5000);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Erro ao gerar PDF");
    } finally {
      setSigning(false);
    }
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

      <div className="border rounded-lg bg-card p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Certificado digital</h2>
            <p className="text-muted-foreground text-sm">
              Importe o PFX e proteja com senha para assinar os PDFs antes do envio.
            </p>
          </div>
          <Badge variant={certificateReady ? "default" : "secondary"}>
            {certificateReady ? "Certificado pronto" : "Sem certificado"}
          </Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="pfx-file">Arquivo PFX</Label>
            <Input
              id="pfx-file"
              type="file"
              accept=".pfx,.p12"
              onChange={handleCertificateChange}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pfx-password">Senha do certificado</Label>
            <Input
              id="pfx-password"
              type="password"
              value={certificatePassword}
              onChange={(event) => setCertificatePassword(event.target.value)}
              placeholder="Informe a senha de proteção"
            />
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              className="w-full"
              onClick={handleStoreCertificate}
              disabled={!certificateFile || !certificatePassword}
            >
              Salvar certificado
            </Button>
          </div>
        </div>

        {certificateInfo && (
          <div className="text-sm text-muted-foreground flex gap-4 flex-wrap">
            <span>Arquivo: {certificateInfo.name}</span>
            <span>
              Importado em {new Date(certificateInfo.createdAt).toLocaleString("pt-BR")}
            </span>
            <span>{(certificateInfo.size / 1024).toFixed(1)} KB</span>
          </div>
        )}
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
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : proposals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  Nenhuma proposta cadastrada
                </TableCell>
              </TableRow>
            ) : (
              proposals.map((proposal) => (
                <TableRow key={proposal.id}>
                  <TableCell className="font-medium">
                    {proposal.proposal_number || '-'}
                  </TableCell>
                  <TableCell className="font-medium">
                    {proposal.clients.name}
                  </TableCell>
                  <TableCell>{proposal.clients.company_name}</TableCell>
                  <TableCell>
                    {new Date(proposal.date).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell>{proposal.responsible}</TableCell>
                  <TableCell>
                    <Badge variant={signedProposals[proposal.id] ? "default" : "secondary"}>
                      {signedProposals[proposal.id] ? "Assinado" : "Pendente"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/proposals/${proposal.id}/edit`)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleGeneratePDF(proposal)}
                        disabled={signing}
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleGeneratePDF(proposal, true)}
                        disabled={signing}
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
