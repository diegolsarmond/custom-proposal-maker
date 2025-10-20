import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ProposalTextEditorProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}

const applyWrapping = (
  textarea: HTMLTextAreaElement,
  value: string,
  wrapper: string,
  onChange: (value: string) => void,
) => {
  const { selectionStart, selectionEnd } = textarea;
  const selected = value.slice(selectionStart, selectionEnd);
  const before = value.slice(0, selectionStart);
  const after = value.slice(selectionEnd);
  const newValue = `${before}${wrapper}${selected}${wrapper}${after}`;
  onChange(newValue);
  const position = selectionStart + wrapper.length;
  requestAnimationFrame(() => {
    textarea.focus();
    const end = position + selected.length;
    textarea.setSelectionRange(position, end);
  });
};

const applyList = (
  textarea: HTMLTextAreaElement,
  value: string,
  onChange: (value: string) => void,
) => {
  const { selectionStart, selectionEnd } = textarea;
  const beforeSelection = value.slice(0, selectionStart);

  const lineStart = beforeSelection.lastIndexOf("\n") + 1;
  const effectiveStart = selectionStart < lineStart ? lineStart : selectionStart;
  const segmentStart = value.slice(0, effectiveStart);
  const target = value.slice(effectiveStart, selectionEnd);
  const lineEndIndex = value.indexOf("\n", selectionEnd);
  const segmentEnd = lineEndIndex === -1 ? value.length : lineEndIndex;
  const segmentTail = value.slice(selectionEnd, segmentEnd);
  const segment = `${target}${segmentTail}`;

  const lines = (segment.length ? segment : "").split(/\r?\n/);
  const formatted = lines
    .map((line) => {
      const trimmed = line.trimStart();
      if (!trimmed.length) {
        return "- ";
      }
      if (trimmed.startsWith("- ")) {
        return trimmed;
      }
      return `- ${trimmed}`;
    })
    .join("\n");

  const result = `${segmentStart}${formatted}${value.slice(segmentEnd)}`;
  onChange(result);
  const cursor = effectiveStart + 2;
  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(cursor, cursor);
  });
};

export const ProposalTextEditor = ({ id, label, value, onChange }: ProposalTextEditorProps) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const handleBold = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    applyWrapping(textarea, value, "**", onChange);
  };

  const handleItalic = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    applyWrapping(textarea, value, "_", onChange);
  };

  const handleList = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    applyList(textarea, value, onChange);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        <div className="flex gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onMouseDown={(event) => event.preventDefault()}
            onClick={handleBold}
            aria-label="Negrito"
          >
            <span className="font-bold text-xs">B</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onMouseDown={(event) => event.preventDefault()}
            onClick={handleItalic}
            aria-label="Itálico"
          >
            <span className="italic text-xs">I</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onMouseDown={(event) => event.preventDefault()}
            onClick={handleList}
            aria-label="Lista"
          >
            <span className="text-xs">•</span>
          </Button>
        </div>
      </div>
      <Textarea
        ref={textareaRef}
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={6}
        className="text-sm min-h-[160px]"
      />
    </div>
  );
};

export default ProposalTextEditor;
