import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
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

export default function NewProposal() {
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    observations: "",
    responsible: "Rafael Alves",
    companyConfig: {
      name: "Quantum Soluções",
      address: "Rua Antônio de Albuquerque, 330 - Sala 901, BH/MG",
      email: "brenda@quantumtecnologia.com.br",
      phone: "(31) 9588-5000",
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
    selectedProducts: {} as Record<
      string,
      {
        selected: boolean;
        implantation: number;
        recurrence: number;
        name: string;
      }
    >,
  });

  useEffect(() => {
    fetchClients();
    fetchProducts();
  }, []);

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
            }
          : {
              selected: false,
              implantation: 0,
              recurrence: 0,
              name: product.name,
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

    const { data: proposalData, error: proposalError } = await supabase
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

    if (proposalError) {
      toast.error("Erro ao criar proposta");
      return;
    }

    const items = Object.entries(formData.selectedProducts)
      .filter(([_, value]) => value.selected)
      .map(([productId, value]) => ({
        proposal_id: proposalData.id,
        product_id: productId,
        implantation: value.implantation,
        recurrence: value.recurrence,
      }));

    const { error: itemsError } = await supabase
      .from("proposal_items")
      .insert(items);

    if (itemsError) {
      toast.error("Erro ao salvar itens da proposta");
      return;
    }

    const pdfData = {
      clientName: selectedClient.name,
      companyName: selectedClient.company_name,
      document: selectedClient.document || "",
      email: selectedClient.email,
      phone: selectedClient.phone || "",
      date: formData.date,
      segment: selectedClient.segment || "",
      selectedAutomations: formData.selectedProducts,
      observations: formData.observations,
      responsible: formData.responsible,
      companyConfig: formData.companyConfig,
      proposalTexts: formData.proposalTexts,
    };

    generateProposalPDF(pdfData);
    toast.success("Proposta criada com sucesso!");
    navigate("/proposals");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/proposals")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Nova Proposta</h1>
          <p className="text-muted-foreground">
            Crie uma nova proposta comercial
          </p>
        </div>
      </div>

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
                    <Input
                      id="responsible"
                      value={formData.responsible}
                      onChange={(e) =>
                        setFormData({ ...formData, responsible: e.target.value })
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Produtos/Automações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
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
                              type="number"
                              value={
                                formData.selectedProducts[product.id].implantation
                              }
                              onChange={(e) =>
                                handleProductValueChange(
                                  product.id,
                                  "implantation",
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              min="0"
                              step="0.01"
                              className="h-8 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Recorrência (R$)</Label>
                            <Input
                              type="number"
                              value={
                                formData.selectedProducts[product.id].recurrence
                              }
                              onChange={(e) =>
                                handleProductValueChange(
                                  product.id,
                                  "recurrence",
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              min="0"
                              step="0.01"
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
              <Button type="submit">Gerar Proposta e PDF</Button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
