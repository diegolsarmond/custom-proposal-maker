import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface PromptField {
  id: string;
  name: string;
  type: string;
}

interface PromptRule {
  id: string;
  description: string;
}

interface PromptFunction {
  id: string;
  name: string;
  validation: string;
}

const emptyField = () => ({ id: crypto.randomUUID(), name: "", type: "" });
const emptyRule = () => ({ id: crypto.randomUUID(), description: "" });
const emptyFunction = () => ({ id: crypto.randomUUID(), name: "", validation: "" });

const PromptManager = () => {
  const [agent, setAgent] = useState({ name: "", role: "" });
  const [fields, setFields] = useState<PromptField[]>([emptyField()]);
  const [validations, setValidations] = useState<PromptRule[]>([emptyRule()]);
  const [rules, setRules] = useState<PromptRule[]>([emptyRule()]);
  const [functions, setFunctions] = useState<PromptFunction[]>([emptyFunction()]);
  const [open, setOpen] = useState(false);

  const promptPreview = useMemo(() => {
    const fieldLines = fields
      .filter((field) => field.name || field.type)
      .map((field) => `- ${field.name || "Campo"} (${field.type || "Tipo indefinido"})`)
      .join("\n");
    const validationLines = validations
      .filter((rule) => rule.description)
      .map((rule) => `- ${rule.description}`)
      .join("\n");
    const ruleLines = rules
      .filter((rule) => rule.description)
      .map((rule) => `- ${rule.description}`)
      .join("\n");
    const functionLines = functions
      .filter((fn) => fn.name || fn.validation)
      .map(
        (fn) => `- ${fn.name || "Função"}${fn.validation ? ` | Validação: ${fn.validation}` : ""}`,
      )
      .join("\n");

    return [
      agent.name && `Agente: ${agent.name}`,
      agent.role && `Descrição do agente: ${agent.role}`,
      fieldLines && `Campos configurados:\n${fieldLines}`,
      validationLines && `Validações:\n${validationLines}`,
      ruleLines && `Regras:\n${ruleLines}`,
      functionLines && `Funções:\n${functionLines}`,
    ]
      .filter(Boolean)
      .join("\n\n");
  }, [agent.name, agent.role, fields, validations, rules, functions]);

  const handleFieldChange = (id: string, key: keyof PromptField, value: string) => {
    setFields((prev) => prev.map((field) => (field.id === id ? { ...field, [key]: value } : field)));
  };

  const handleRuleChange = (list: "validations" | "rules", id: string, value: string) => {
    if (list === "validations") {
      setValidations((prev) => prev.map((rule) => (rule.id === id ? { ...rule, description: value } : rule)));
    } else {
      setRules((prev) => prev.map((rule) => (rule.id === id ? { ...rule, description: value } : rule)));
    }
  };

  const handleFunctionChange = (id: string, key: keyof PromptFunction, value: string) => {
    setFunctions((prev) => prev.map((fn) => (fn.id === id ? { ...fn, [key]: value } : fn)));
  };

  const addField = () => setFields((prev) => [...prev, emptyField()]);
  const addValidation = () => setValidations((prev) => [...prev, emptyRule()]);
  const addRule = () => setRules((prev) => [...prev, emptyRule()]);
  const addFunction = () => setFunctions((prev) => [...prev, emptyFunction()]);

  const copyPrompt = async () => {
    if (!promptPreview) {
      toast.error("Preencha o formulário para gerar o prompt");
      return;
    }
    await navigator.clipboard.writeText(promptPreview);
    toast.success("Prompt copiado para a área de transferência");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestão de Prompts</h1>
          <p className="text-sm text-muted-foreground">Apenas um prompt pode ser configurado por vez.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="default">Gerar Prompt</Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Prompt Gerado</DialogTitle>
            </DialogHeader>
            <Textarea value={promptPreview} readOnly rows={12} />
            <DialogFooter className="flex flex-row gap-2 justify-end">
              <Button variant="outline" onClick={copyPrompt}>
                Copiar
              </Button>
              <Button onClick={() => setOpen(false)}>Fechar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Agent</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="agent-name">Nome</Label>
            <Input
              id="agent-name"
              placeholder="Nome do agente"
              value={agent.name}
              onChange={(e) => setAgent((prev) => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="agent-role">Descrição</Label>
            <Textarea
              id="agent-role"
              placeholder="Objetivo e responsabilidades do agente"
              value={agent.role}
              onChange={(e) => setAgent((prev) => ({ ...prev, role: e.target.value }))}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fields Configurator</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.map((field) => (
            <div className="grid gap-4 md:grid-cols-2" key={field.id}>
              <div className="space-y-2">
                <Label>Nome do campo</Label>
                <Input
                  placeholder="Nome"
                  value={field.name}
                  onChange={(e) => handleFieldChange(field.id, "name", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Input
                  placeholder="Tipo"
                  value={field.type}
                  onChange={(e) => handleFieldChange(field.id, "type", e.target.value)}
                />
              </div>
            </div>
          ))}
          <Button variant="outline" onClick={addField}>
            Adicionar campo
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Validations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {validations.map((rule) => (
            <div className="space-y-2" key={rule.id}>
              <Label>Regra</Label>
              <Input
                placeholder="Descreva a validação"
                value={rule.description}
                onChange={(e) => handleRuleChange("validations", rule.id, e.target.value)}
              />
            </div>
          ))}
          <Button variant="outline" onClick={addValidation}>
            Adicionar regra
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {rules.map((rule) => (
            <div className="space-y-2" key={rule.id}>
              <Label>Regra</Label>
              <Input
                placeholder="Descreva a regra"
                value={rule.description}
                onChange={(e) => handleRuleChange("rules", rule.id, e.target.value)}
              />
            </div>
          ))}
          <Button variant="outline" onClick={addRule}>
            Adicionar regra
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Functions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {functions.map((fn) => (
            <div className="grid gap-4 md:grid-cols-2" key={fn.id}>
              <div className="space-y-2">
                <Label>Nome da função</Label>
                <Input
                  placeholder="Nome"
                  value={fn.name}
                  onChange={(e) => handleFunctionChange(fn.id, "name", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Validação</Label>
                <Input
                  placeholder="Validação esperada"
                  value={fn.validation}
                  onChange={(e) => handleFunctionChange(fn.id, "validation", e.target.value)}
                />
              </div>
            </div>
          ))}
          <Button variant="outline" onClick={addFunction}>
            Adicionar função
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PromptManager;
