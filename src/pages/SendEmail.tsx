import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import "./SendEmail.css";
import { Send, Paperclip, X, Mail, History } from "lucide-react";
import { generateProposalPDF } from "@/utils/pdfGenerator";
import { formatProposalPdfFileName } from "@/utils/proposalFileName";
import { resolveProposalNumber } from "@/utils/resolveProposalNumber";

interface Profile {
  id: string;
  email: string;
  full_name: string;
}

interface Client {
  id: string;
  name: string;
  email: string | null;
}

interface ProposalOption {
  id: string;
  date: string;
  proposal_number?: string | null;
  proposals_number?: { id?: number | null } | { id?: number | null }[] | null;
  clients: {
    name: string;
    company_name: string;
  } | null;
}

interface Attachment {
  file: File;
  base64: string;
}

const convertFileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };
    reader.onerror = () => {
      reject(new Error("Erro ao processar arquivo"));
    };
    reader.readAsDataURL(file);
  });

interface SentEmail {
  id: string;
  from_email: string;
  to_email: string;
  subject: string;
  html_body: string;
  attachments_count: number;
  status: string;
  resend_id: string | null;
  sent_at: string;
  error_message: string | null;
}

export default function SendEmail() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentEmails, setSentEmails] = useState<SentEmail[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [clients, setClients] = useState<Client[]>([]);
  const [proposals, setProposals] = useState<ProposalOption[]>([]);
  const [loadingProposals, setLoadingProposals] = useState(false);
  const [selectedProposalId, setSelectedProposalId] = useState("");
  const [attachingProposal, setAttachingProposal] = useState(false);

  const [fromEmail, setFromEmail] = useState("");
  const [toEmail, setToEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  useEffect(() => {
    fetchUsers();
    fetchSentEmails();
    fetchClients();
    fetchProposals();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .order("full_name", { ascending: true });

    if (error) {
      toast.error("Erro ao carregar usuários");
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  const fetchClients = async () => {
    const { data, error } = await supabase
      .from("clients")
      .select("id, name, email")
      .order("name", { ascending: true });

    if (error) {
      toast.error("Erro ao carregar clientes");
    } else {
      setClients(data || []);
    }
  };

  const fetchProposals = async () => {
    setLoadingProposals(true);
    const { data, error } = await supabase
      .from("proposals")
      .select(`
        id,
        date,
        proposal_number,
        proposals_number (
          id
        ),
        clients (
          name,
          company_name
        )
      `)
      .order("date", { ascending: false })
      .limit(100);

    if (error) {
      toast.error("Erro ao carregar propostas");
    } else {
      const normalized = (data || []).map((proposal: any) => ({
        ...proposal,
        proposal_number: resolveProposalNumber(proposal),
      }));
      setProposals(normalized as ProposalOption[]);
    }
    setLoadingProposals(false);
  };

  const fetchSentEmails = async () => {
    setLoadingHistory(true);
    const { data, error } = await supabase
      .from("sent_emails")
      .select("*")
      .order("sent_at", { ascending: false })
      .limit(50);

    if (error) {
      toast.error("Erro ao carregar histórico");
      console.error(error);
    } else {
      setSentEmails(data || []);
    }
    setLoadingHistory(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments: Attachment[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Limita tamanho a 5MB
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`Arquivo ${file.name} muito grande (máx 5MB)`);
        continue;
      }

      try {
        const base64 = await convertFileToBase64(file);
        newAttachments.push({ file, base64 });
      } catch (error) {
        console.error("Erro ao processar arquivo:", error);
        toast.error(`Não foi possível adicionar ${file.name}`);
      }
    }

    setAttachments([...attachments, ...newAttachments]);
    e.target.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleAttachProposal = async () => {
    if (!selectedProposalId) return;

    setAttachingProposal(true);

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
        .eq("id", selectedProposalId)
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
        .eq("proposal_id", selectedProposalId);

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

      const clientInfo = proposalData.clients;
      const pdfData = {
        clientName: clientInfo?.name || "",
        companyName: clientInfo?.company_name || "",
        document: clientInfo?.document || "",
        email: clientInfo?.email || "",
        phone: clientInfo?.phone || "",
        date: proposalData.date,
        segment: clientInfo?.segment || "",
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

      const blob = (await generateProposalPDF(pdfData, { returnData: "blob" })) as Blob;
      const clientName = clientInfo?.name || "Cliente";
      const fileName = formatProposalPdfFileName(clientName, proposalData.date);
      const pdfFile = new File([blob], fileName, { type: "application/pdf" });
      const base64 = await convertFileToBase64(pdfFile);

      const alreadyAttached = attachments.some(
        (att) => att.file.name === pdfFile.name && att.file.size === pdfFile.size
      );

      if (alreadyAttached) {
        toast.error("Esta proposta já foi anexada");
      } else {
        setAttachments([...attachments, { file: pdfFile, base64 }]);
        toast.success("Proposta anexada com sucesso");
        setSelectedProposalId("");
      }
    } catch (error: any) {
      console.error("Erro ao anexar proposta:", error);
      toast.error(error.message || "Erro ao anexar proposta");
    } finally {
      setAttachingProposal(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fromEmail || !toEmail || !subject || !body) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    // Validação de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(toEmail)) {
      toast.error("Email de destino inválido");
      return;
    }

    setSending(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const baseUrl = import.meta.env.VITE_BACKEND_URL || "";
      const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
      const response = await fetch(`${normalizedBaseUrl}/emails/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          from: fromEmail,
          to: toEmail,
          subject: subject,
          html: body,
          attachments: attachments.map((att) => ({
            filename: att.file.name,
            content: att.base64,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Erro ao enviar email");
      }

      if (data?.success) {
        toast.success("Email enviado com sucesso!");
        // Limpa o formulário
        setToEmail("");
        setSubject("");
        setBody("");
        setAttachments([]);
        // Atualiza o histórico
        fetchSentEmails();
      } else {
        throw new Error(data?.error || "Erro ao enviar email");
      }
    } catch (error: any) {
      console.error("Erro ao enviar email:", error);
      toast.error(error.message || "Erro ao enviar email");
    } finally {
      setSending(false);
    }
  };

  const modules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ["bold", "italic", "underline", "strike"],
      [{ list: "ordered" }, { list: "bullet" }],
      [{ color: [] }, { background: [] }],
      [{ align: [] }],
      ["link"],
      ["clean"],
    ],
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">Gestão de Emails</h1>
        <p className="text-muted-foreground">
          Envie emails formatados e visualize o histórico de envios
        </p>
      </div>

      <Tabs defaultValue="send" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="send" className="gap-2">
            <Mail className="w-4 h-4" />
            Enviar Email
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="w-4 h-4" />
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="send" className="mt-6">
          <form onSubmit={handleSubmit} className="space-y-6 bg-card border rounded-lg p-6">
        <div className="space-y-2">
          <Label htmlFor="from">De: *</Label>
          <Select value={fromEmail} onValueChange={setFromEmail} disabled={loading}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o remetente" />
            </SelectTrigger>
            <SelectContent>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.email}>
                  {user.full_name} ({user.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="to">Para: *</Label>
          <Input
            id="to"
            type="email"
            placeholder="destinatario@exemplo.com"
            value={toEmail}
            onChange={(e) => setToEmail(e.target.value)}
            list="client-email-list"
            required
          />
          <datalist id="client-email-list">
            {clients
              .filter((client) => !!client.email)
              .map((client) => (
                <option
                  key={client.id}
                  value={client.email as string}
                  label={`${client.name} (${client.email})`}
                />
              ))}
          </datalist>
        </div>

        <div className="space-y-2">
          <Label htmlFor="subject">Assunto: *</Label>
          <Input
            id="subject"
            placeholder="Assunto do email"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Mensagem: *</Label>
          <div className="bg-background border rounded-md">
            <ReactQuill
              theme="snow"
              value={body}
              onChange={setBody}
              modules={modules}
              placeholder="Digite sua mensagem aqui..."
              className="min-h-[200px]"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="proposal-attachment">Anexar proposta comercial (opcional)</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Select
                value={selectedProposalId}
                onValueChange={setSelectedProposalId}
                disabled={loadingProposals || attachingProposal}
              >
                <SelectTrigger id="proposal-attachment">
                  <SelectValue placeholder={loadingProposals ? "Carregando..." : "Selecione uma proposta"} />
                </SelectTrigger>
                <SelectContent>
                  {loadingProposals ? (
                    <SelectItem value="carregando" disabled>
                      Carregando...
                    </SelectItem>
                  ) : proposals.length === 0 ? (
                    <SelectItem value="sem-propostas" disabled>
                      Nenhuma proposta disponível
                    </SelectItem>
                  ) : (
                    proposals.map((proposal) => {
                      const number = proposal.proposal_number || "Sem número";
                      const clientName = proposal.clients?.name || "Cliente";
                      const companyName = proposal.clients?.company_name
                        ? ` - ${proposal.clients.company_name}`
                        : "";
                      const dateLabel = new Date(proposal.date).toLocaleDateString("pt-BR");
                      return (
                        <SelectItem key={proposal.id} value={proposal.id}>
                          {`${number} • ${clientName}${companyName} • ${dateLabel}`}
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                onClick={handleAttachProposal}
                disabled={!selectedProposalId || attachingProposal}
              >
                {attachingProposal ? "Anexando..." : "Anexar Proposta"}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Anexos (máx 5MB por arquivo)</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById("file-upload")?.click()}
              >
                <Paperclip className="w-4 h-4 mr-2" />
                Adicionar Anexo
              </Button>
              <input
                id="file-upload"
                type="file"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {attachments.length > 0 && (
              <div className="space-y-2 mt-2">
                {attachments.map((att, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-muted p-2 rounded"
                  >
                    <span className="text-sm truncate flex-1">
                      {att.file.name} ({(att.file.size / 1024).toFixed(1)} KB)
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAttachment(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="submit"
            disabled={sending}
            className="gap-2"
          >
            <Send className="w-4 h-4" />
            {sending ? "Enviando..." : "Enviar Email"}
          </Button>
        </div>

            <p className="text-xs text-muted-foreground">
              * Campos obrigatórios. Uma cópia oculta será enviada para contato@quantumtecnologia.com.br
            </p>
          </form>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <div className="bg-card border rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Histórico de Emails Enviados</h2>
              <Button variant="outline" size="sm" onClick={fetchSentEmails}>
                Atualizar
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>De</TableHead>
                  <TableHead>Para</TableHead>
                  <TableHead>Assunto</TableHead>
                  <TableHead>Anexos</TableHead>
                  <TableHead>Data/Hora</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingHistory ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : sentEmails.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      Nenhum email enviado ainda
                    </TableCell>
                  </TableRow>
                ) : (
                  sentEmails.map((email) => (
                    <TableRow key={email.id}>
                      <TableCell>
                        <Badge
                          variant={email.status === 'sent' ? 'default' : 'destructive'}
                        >
                          {email.status === 'sent' ? 'Enviado' : 'Falhou'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{email.from_email}</TableCell>
                      <TableCell>{email.to_email}</TableCell>
                      <TableCell>{email.subject}</TableCell>
                      <TableCell className="text-center">
                        {email.attachments_count > 0 ? (
                          <Badge variant="outline">{email.attachments_count}</Badge>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(email.sent_at).toLocaleString('pt-BR')}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
