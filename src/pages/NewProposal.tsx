import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { generateProposalPDF } from "@/utils/pdfGenerator";
import { ArrowLeft } from "lucide-react";

interface Client {
  id: string;
  name: string;
  company_name: string;
  document: string | null;
  email: string;
  phone: string | null;
  segment: string | null;
}

interface Product {
  id: string;
  name: string;
  description: string;
  default_implantation: number;
  default_recurrence: number;
}

interface Profile {
  id: string;
  full_name: string | null;
}

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const parseCurrency = (value: string) => {
  const numericValue = value.replace(/\D/g, "");
  return numericValue ? Number(numericValue) / 100 : 0;
};

export default function NewProposal() {
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);
  const [loadingProposal, setLoadingProposal] = useState(false);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    observations: "",
    responsible: "",
    companyConfig: {
      name: "Quantum Tecnologia",
      address: "Rua Antônio de Albuquerque, 330 - Sala 901, BH/MG",
      email: "brenda@quantumtecnologia.com.br",
      phone: "(31) 99305-4200",
    },
    proposalTexts: {
      introductionText:
        "Em um mercado cada vez mais dinâmico, a agilidade e a personalização do atendimento fazem toda a diferença. Pensando nisso, desenvolvemos soluções de automação que integram tecnologia e inteligência artificial para transformar o relacionamento com seus clientes, otimizar processos e garantir resultados reais.",
      objectiveText:
        "Mesmo quem não domina tecnologia possa usufruir de soluções eficientes, escaláveis e simples de operar. Ao escolher implementar essa automação completa, você não está apenas otimizando processos.\n\nVocê está eliminando a necessidade de contratar uma nova equipe para realizar tarefas repetitivas e operacionais. Cada um dos fluxos aqui apresentados substitui com eficiência uma parte do trabalho humano, entregando o que nenhuma contratação isolada conseguiria: agilidade, consistência e disponibilidade total.",
      servicesText:
        "• Configuração completa das automações selecionadas\n• Testes e validação de todos os fluxos\n• Treinamento para utilização das ferramentas\n• Suporte técnico durante a fase de implantação\n• Documentação completa dos processos\n• Manutenção e ajustes durante o primeiro mês",
      whyText:
        "Ao contratar todas as automações, você garante:\n\n• Economia de escala nos custos de implantação\n• Integração perfeita entre todos os processos\n• Visão completa do relacionamento com o cliente\n• Máximo retorno sobre o investimento\n• Time dedicado ao seu projeto\n\nA automação completa transforma sua operação, liberando sua equipe para focar no que realmente importa: crescer o negócio e atender melhor seus clientes.",
    },
    pricingLabels: {
      implantation: "Implantação (R$)",
      recurrence: "Recorrência",
    },
    selectedProducts: {} as Record<
      string,
      {
        selected: boolean;
        implantation: number;
        recurrence: number;
        name: string;
        description?: string;
      }
    >,
  });

  useEffect(() => {
    fetchClients();
    fetchProducts();
    fetchUsers();
  }, []);

  useEffect(() => {
    if (!isEditing || !id) return;
    fetchProposal(id);
  }, [isEditing, id]);

  useEffect(() => {
    if (!isEditing || !selectedClientId) return;
    if (selectedClient) return;
    const client = clients.find((c) => c.id === selectedClientId);
    if (client) setSelectedClient(client);
  }, [clients, isEditing, selectedClientId, selectedClient]);

  useEffect(() => {
    if (!user) return;
    const metadataName =
      (user.user_metadata?.full_name || user.user_metadata?.name || "").trim();
    if (!metadataName) return;
    const parts = metadataName.split(" ").filter(Boolean);
    if (parts.length === 0) return;
    const firstName = parts[0];
    const lastName = parts.length > 1 ? parts[parts.length - 1] : "";
    const formattedName = lastName ? `${firstName} ${lastName}` : firstName;
    setFormData((prev) => {
      if (prev.responsible === formattedName) return prev;
      return {
        ...prev,
        responsible: formattedName,
      };
    });
  }, [user]);

  const fetchClients = async () => {
    const { data } = await supabase
      .from("clients")
      .select("*")
      .order("company_name");
    if (data) setClients(data);
  };

  const fetchProducts = async () => {
    const { data } = await supabase
      .from("products")
      .select("*")
      .order("name");
    if (data) setProducts(data);
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name")
      .order("full_name");
    if (data) setUsers(data);
  };

  const fetchProposal = async (proposalId: string) => {
    setLoadingProposal(true);
    const { data, error } = await supabase
      .from("proposals")
      .select(`
        *,
        clients (
          id,
          name,
          company_name,
          document,
          email,
          phone,
          segment
        )
      `)
      .eq("id", proposalId)
      .single();

    if (error || !data) {
      toast.error("Erro ao carregar proposta");
      setLoadingProposal(false);
      return;
    }

    const clientData = (data.clients as Client) || null;
    setSelectedClientId(data.client_id || "");
    setSelectedClient(clientData);
    setFormData((prev) => ({
      ...prev,
      date: data.date,
      observations: data.observations || "",
      responsible: data.responsible || "",
      companyConfig: {
        name: data.company_name || "",
        address: data.company_address || "",
        email: data.company_email || "",
        phone: data.company_phone || "",
      },
      proposalTexts: {
        introductionText: data.intro_text || "",
        objectiveText: data.objective_text || "",
        servicesText: data.services_text || "",
        whyText: data.why_text || "",
      },
      selectedProducts: prev.selectedProducts,
    }));

    const { data: itemsData, error: itemsError } = await supabase
      .from("proposal_items")
      .select(`
        *,
        products (
          id,
          name,
          description
        )
      `)
      .eq("proposal_id", proposalId);

    if (itemsError) {
      toast.error("Erro ao carregar itens da proposta");
      setLoadingProposal(false);
      return;
    }

    const itemsList = itemsData || [];
    const selectedProducts = itemsList.reduce(
      (acc: Record<string, { selected: boolean; implantation: number; recurrence: number; name: string; description?: string }>, item) => {
        acc[item.product_id] = {
          selected: true,
          implantation: Number(item.implantation),
          recurrence: Number(item.recurrence),
          name: item.products?.name || "",
          description: item.products?.description || "",
        };
        return acc;
      },
      {}
    );

    setFormData((prev) => ({
      ...prev,
      selectedProducts: selectedProducts,
    }));
    setLoadingProposal(false);
  };

  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    const client = clients.find((c) => c.id === clientId);
    setSelectedClient(client || null);
  };

  const handleProductToggle = (productId: string, checked: boolean) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    setFormData((prev) => ({
      ...prev,
      selectedProducts: {
        ...prev.selectedProducts,
        [productId]: checked
          ? {
              selected: true,
              implantation: Number(product.default_implantation),
              recurrence: Number(product.default_recurrence),
              name: product.name,
              description: product.description,
            }
          : {
              selected: false,
              implantation: 0,
              recurrence: 0,
              name: product.name,
              description: product.description,
            },
      },
    }));
  };

  const handleProductValueChange = (
    productId: string,
    field: "implantation" | "recurrence",
    value: number
  ) => {
    setFormData((prev) => ({
      ...prev,
      selectedProducts: {
        ...prev.selectedProducts,
        [productId]: {
          ...prev.selectedProducts[productId],
          [field]: value,
        },
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedClient) {
      toast.error("Selecione um cliente");
      return;
    }

    const selectedCount = Object.values(formData.selectedProducts).filter(
      (p) => p.selected
    ).length;

    if (selectedCount === 0) {
      toast.error("Selecione pelo menos um produto");
      return;
    }

    let proposalData;

    if (isEditing && id) {
      const { data, error } = await supabase
        .from("proposals")
        .update({
          client_id: selectedClient.id,
          date: formData.date,
          observations: formData.observations,
          responsible: formData.responsible,
          company_name: formData.companyConfig.name,
          company_address: formData.companyConfig.address,
          company_email: formData.companyConfig.email,
          company_phone: formData.companyConfig.phone,
          intro_text: formData.proposalTexts.introductionText,
          objective_text: formData.proposalTexts.objectiveText,
          services_text: formData.proposalTexts.servicesText,
          why_text: formData.proposalTexts.whyText,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        toast.error("Erro ao atualizar proposta");
        return;
      }

      proposalData = data;

      const { error: deleteError } = await supabase
        .from("proposal_items")
        .delete()
        .eq("proposal_id", id);

      if (deleteError) {
        toast.error("Erro ao atualizar itens da proposta");
        return;
      }
    } else {
      const { data, error } = await supabase
        .from("proposals")
        .insert([
          {
            client_id: selectedClient.id,
            date: formData.date,
            observations: formData.observations,
            responsible: formData.responsible,
            company_name: formData.companyConfig.name,
            company_address: formData.companyConfig.address,
            company_email: formData.companyConfig.email,
            company_phone: formData.companyConfig.phone,
            intro_text: formData.proposalTexts.introductionText,
            objective_text: formData.proposalTexts.objectiveText,
            services_text: formData.proposalTexts.servicesText,
            why_text: formData.proposalTexts.whyText,
            created_by: user?.id,
          },
        ])
        .select()
        .single();

      if (error) {
        toast.error("Erro ao criar proposta");
        return;
      }

      proposalData = data;
    }

    if (!proposalData?.proposal_number) {
      const { data: proposalNumberData } = await supabase
        .from("proposals")
        .select("proposal_number, sequence_number, sequence_year")
        .eq("id", proposalData.id)
        .single();

      if (proposalNumberData) {
        proposalData = {
          ...proposalData,
          ...proposalNumberData,
        };
      }

      if (
        !proposalData.proposal_number &&
        proposalData.sequence_number &&
        proposalData.sequence_year
      ) {
        proposalData = {
          ...proposalData,
          proposal_number: `${String(proposalData.sequence_number).padStart(3, "0")}/${proposalData.sequence_year}`,
        };
      }
    }

    const items = Object.entries(formData.selectedProducts)
      .filter(([_, value]) => value.selected)
      .map(([productId, value]) => ({
        proposal_id: proposalData.id,
        product_id: productId,
        implantation: value.implantation,
        recurrence: value.recurrence,
      }));

    if (items.length > 0) {
      const { error: itemsError } = await supabase
        .from("proposal_items")
        .insert(items);

      if (itemsError) {
        toast.error("Erro ao salvar itens da proposta");
        return;
      }
    }

  const pdfData = {
      clientName: selectedClient.name,
      companyName: selectedClient.company_name,
      document: selectedClient.document || "",
      email: selectedClient.email,
      phone: selectedClient.phone || "",
      date: formData.date,
      segment: selectedClient.segment || "",
      proposalNumber: proposalData.proposal_number,
      selectedAutomations: formData.selectedProducts,
      observations: formData.observations,
      responsible: formData.responsible,
      companyConfig: formData.companyConfig,
      proposalTexts: formData.proposalTexts,
      pricingLabels: formData.pricingLabels,
    };

    generateProposalPDF(pdfData);
    toast.success(
      isEditing
        ? `Proposta ${proposalData.proposal_number} atualizada com sucesso!`
        : `Proposta ${proposalData.proposal_number} criada com sucesso!`
    );
    navigate("/proposals");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/proposals")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            {isEditing ? "Editar Proposta" : "Nova Proposta"}
          </h1>
          <p className="text-muted-foreground">
            {isEditing
              ? "Atualize as informações da proposta"
              : "Crie uma nova proposta comercial"}
          </p>
        </div>
      </div>

      {isEditing && loadingProposal ? (
        <div className="flex justify-center py-10">Carregando proposta...</div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Selecionar Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <Label htmlFor="client">Cliente *</Label>
            <Select value={selectedClientId} onValueChange={handleClientChange}>
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
          </CardContent>
        </Card>

        {selectedClient && (
          <>
            <div className="grid lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Dados do Cliente</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div>
                    <strong>Nome:</strong> {selectedClient.name}
                  </div>
                  <div>
                    <strong>Empresa:</strong> {selectedClient.company_name}
                  </div>
                  {selectedClient.document && (
                    <div>
                      <strong>Documento:</strong> {selectedClient.document}
                    </div>
                  )}
                  <div>
                    <strong>E-mail:</strong> {selectedClient.email}
                  </div>
                  {selectedClient.phone && (
                    <div>
                      <strong>Telefone:</strong> {selectedClient.phone}
                    </div>
                  )}
                  {selectedClient.segment && (
                    <div>
                      <strong>Segmento:</strong> {selectedClient.segment}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Dados da Proposta</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label htmlFor="date">Data da Proposta</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) =>
                        setFormData({ ...formData, date: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="responsible">Responsável</Label>
                    <Select
                      value={formData.responsible || undefined}
                      onValueChange={(value) =>
                        setFormData({ ...formData, responsible: value })
                      }
                    >
                      <SelectTrigger id="responsible">
                        <SelectValue placeholder="Selecione o responsável" />
                      </SelectTrigger>
                      <SelectContent>
                        {users
                          .filter((user) => user.full_name)
                          .map((user) => (
                            <SelectItem
                              key={user.id}
                              value={user.full_name as string}
                            >
                              {user.full_name}
                            </SelectItem>
                          ))}
                        {formData.responsible &&
                          !users.some(
                            (user) => user.full_name === formData.responsible,
                          ) && (
                            <SelectItem value={formData.responsible}>
                              {formData.responsible}
                            </SelectItem>
                          )}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Produtos/Automações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid sm:grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Coluna de Implantação</Label>
                    <Input
                      value={formData.pricingLabels.implantation}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          pricingLabels: {
                            ...formData.pricingLabels,
                            implantation: e.target.value,
                          },
                        })
                      }
                      className="h-8 text-xs"
                      placeholder="Implantação (R$)"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Coluna de Recorrência</Label>
                    <Input
                      value={formData.pricingLabels.recurrence}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          pricingLabels: {
                            ...formData.pricingLabels,
                            recurrence: e.target.value,
                          },
                        })
                      }
                      className="h-8 text-xs"
                      placeholder="Recorrência"
                    />
                  </div>
                </div>
                <div className="grid lg:grid-cols-2 gap-3">
                  {products.map((product) => (
                    <div
                      key={product.id}
                      className="border border-border rounded-lg p-3 space-y-2 hover:border-primary/50 transition-colors"
                    >
                      <div className="flex items-start space-x-2">
                        <Checkbox
                          id={product.id}
                          checked={
                            formData.selectedProducts[product.id]?.selected || false
                          }
                          onCheckedChange={(checked) =>
                            handleProductToggle(product.id, checked as boolean)
                          }
                        />
                        <div className="flex-1">
                          <Label
                            htmlFor={product.id}
                            className="cursor-pointer font-semibold text-sm"
                          >
                            {product.name}
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            {product.description}
                          </p>
                        </div>
                      </div>

                      {formData.selectedProducts[product.id]?.selected && (
                        <div className="grid grid-cols-2 gap-2 ml-6">
                          <div>
                            <Label className="text-xs">Implantação (R$)</Label>
                            <Input
                              type="text"
                              value={formatCurrency(
                                formData.selectedProducts[product.id].implantation
                              )}
                              onChange={(e) =>
                                handleProductValueChange(
                                  product.id,
                                  "implantation",
                                  parseCurrency(e.target.value)
                                )
                              }
                              className="h-8 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Recorrência (R$)</Label>
                            <Input
                              type="text"
                              value={formatCurrency(
                                formData.selectedProducts[product.id].recurrence
                              )}
                              onChange={(e) =>
                                handleProductValueChange(
                                  product.id,
                                  "recurrence",
                                  parseCurrency(e.target.value)
                                )
                              }
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Textos da Proposta</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid lg:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="introText">Texto de Introdução</Label>
                    <Textarea
                      id="introText"
                      value={formData.proposalTexts.introductionText}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          proposalTexts: {
                            ...formData.proposalTexts,
                            introductionText: e.target.value,
                          },
                        })
                      }
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="objectiveText">Texto do Objetivo</Label>
                    <Textarea
                      id="objectiveText"
                      value={formData.proposalTexts.objectiveText}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          proposalTexts: {
                            ...formData.proposalTexts,
                            objectiveText: e.target.value,
                          },
                        })
                      }
                      rows={3}
                    />
                  </div>
                </div>
                <div className="grid lg:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="servicesText">Serviços Atribuídos</Label>
                    <Textarea
                      id="servicesText"
                      value={formData.proposalTexts.servicesText}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          proposalTexts: {
                            ...formData.proposalTexts,
                            servicesText: e.target.value,
                          },
                        })
                      }
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="whyText">Por que contratar?</Label>
                    <Textarea
                      id="whyText"
                      value={formData.proposalTexts.whyText}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          proposalTexts: {
                            ...formData.proposalTexts,
                            whyText: e.target.value,
                          },
                        })
                      }
                      rows={3}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Observações</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData.observations}
                  onChange={(e) =>
                    setFormData({ ...formData, observations: e.target.value })
                  }
                  rows={4}
                  placeholder="Observações adicionais sobre a proposta"
                />
              </CardContent>
            </Card>

            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/proposals")}
              >
                Cancelar
              </Button>
              <Button type="submit">
                {isEditing
                  ? "Salvar alterações e gerar PDF"
                  : "Gerar Proposta e PDF"}
              </Button>
            </div>
          </>
        )}
        </form>
      )}
    </div>
  );
}
