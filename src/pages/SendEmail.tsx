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
import { toast } from "sonner";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import "./SendEmail.css";
import { Send, Paperclip, X } from "lucide-react";

interface Profile {
  id: string;
  email: string;
  full_name: string;
}

interface Attachment {
  file: File;
  base64: string;
}

export default function SendEmail() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  
  const [fromEmail, setFromEmail] = useState("");
  const [toEmail, setToEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  useEffect(() => {
    fetchUsers();
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

      // Converte para base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => {
          const base64 = (reader.result as string).split(",")[1];
          resolve(base64);
        };
        reader.readAsDataURL(file);
      });

      const base64 = await base64Promise;
      newAttachments.push({ file, base64 });
    }

    setAttachments([...attachments, ...newAttachments]);
    e.target.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
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
      const { data, error } = await supabase.functions.invoke("send-email", {
        body: {
          from: fromEmail,
          to: toEmail,
          subject: subject,
          html: body,
          attachments: attachments.map(att => ({
            filename: att.file.name,
            content: att.base64,
          })),
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success("Email enviado com sucesso!");
        // Limpa o formulário
        setToEmail("");
        setSubject("");
        setBody("");
        setAttachments([]);
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
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">Enviar Email</h1>
        <p className="text-muted-foreground">
          Envie emails formatados para seus clientes
        </p>
      </div>

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
            required
          />
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
    </div>
  );
}
