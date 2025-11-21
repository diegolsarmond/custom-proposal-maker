import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PromptManagement() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gestão de Prompts</h1>
        <p className="text-muted-foreground">Gerencie os prompts disponíveis para geração de propostas.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Área administrativa</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Somente administradores podem acessar esta seção.</p>
        </CardContent>
      </Card>
    </div>
  );
}
