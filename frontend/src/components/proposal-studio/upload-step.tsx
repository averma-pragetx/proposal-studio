import React from "react";
import { 
  FileUp, 
  FileText, 
  Loader2, 
  ScanText, 
  ArrowRight, 
  RefreshCw, 
  AlertTriangle,
  Eye,
  Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "./alert";

interface UploadStepProps {
  file: File | null;
  fileUrl: string | null;
  extracting: boolean;
  extractedText: string;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onPick: (f: File) => void;
  onRemove: () => void;
  onExtract: () => void;
  onNext: () => void;
}

export function UploadStep({
  file,
  fileUrl,
  extracting,
  extractedText,
  fileInputRef,
  onDrop,
  onPick,
  onRemove,
  onExtract,
  onNext,
}: UploadStepProps) {
  const isPdf =
    !!file && (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"));

  const triggerPicker = () => {
    fileInputRef.current?.click();
  };

  return (
    <Card className="overflow-hidden border-none shadow-2xl ring-1 ring-border">
      <CardHeader className="bg-muted/30 pb-2 border-b">
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="text-2xl font-bold tracking-tight">Document Studio</CardTitle>
            <CardDescription className="text-base">
              Upload and review your tender documents side-by-side.
            </CardDescription>
          </div>
          {file && (
             <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={onRemove}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4 rotate-45" /> Reset
                </Button>
             </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {!file ? (
          <div className="p-12 sm:p-20">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              onClick={triggerPicker}
              className="group relative flex cursor-pointer flex-col items-center justify-center gap-6 rounded-2xl border-2 border-dashed border-muted-foreground/20 bg-muted/10 p-20 text-center transition-all hover:border-primary/50 hover:bg-muted/20"
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform group-hover:scale-110">
                <FileUp className="h-10 w-10" />
              </div>
              <div className="space-y-2">
                <p className="text-xl font-semibold">Drop your document here</p>
                <p className="mx-auto max-w-sm text-sm text-muted-foreground">
                  Accepted formats: <strong>PDF</strong> or <strong>DOCX</strong>.
                </p>
              </div>
              <Button 
                type="button" 
                variant="default" 
                size="lg" 
                onClick={(e) => {
                  e.stopPropagation();
                  triggerPicker();
                }}
                className="mt-2 gap-2 rounded-full px-8 shadow-lg shadow-primary/20"
              >
                <FileUp className="h-4 w-4" /> Browse Files
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col">
            {/* Action Bar */}
            <div className="flex items-center justify-between gap-4 border-b bg-muted/10 px-6 py-4">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{file.name}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                    {(file.size / 1024).toFixed(1)} KB ready
                  </p>
                </div>
              </div>
              <Button 
                size="sm" 
                onClick={onExtract} 
                disabled={extracting} 
                className="gap-2 rounded-full shadow-md transition-all active:scale-95"
              >
                {extracting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Extracting…
                  </>
                ) : (
                  <>
                    <ScanText className="h-4 w-4" />
                    {extractedText ? "Refresh Extraction" : "Extract Text"}
                  </>
                )}
              </Button>
            </div>

            {/* Side-by-Side Editor */}
            <div className="grid lg:grid-cols-2 min-h-[700px]">
              {/* Left Column: Preview */}
              <div className="relative flex flex-col border-r bg-zinc-900 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2 bg-black/20 border-b border-white/5">
                  <Eye className="h-3 w-3 text-white/50" />
                  <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Document Preview</span>
                </div>
                <div className="flex-1 relative">
                  {isPdf && fileUrl ? (
                    <iframe
                      src={`${fileUrl}#view=FitH&toolbar=0&navpanes=0`}
                      title="Document preview"
                      className="h-full w-full"
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-4 p-12 text-center text-white/50">
                      <FileText className="h-12 w-12 opacity-20" />
                      <p className="max-w-[200px] text-xs font-medium leading-relaxed">
                        Native preview is only available for PDF files. Use the extraction tool to view DOCX content.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Extracted Text */}
              <div className="flex flex-col bg-background overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b">
                   <div className="flex items-center gap-2">
                    <Search className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Extracted Content</span>
                  </div>
                  {extractedText && (
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {extractedText.length.toLocaleString()} chars
                    </span>
                  )}
                </div>
                <div className="flex-1 relative">
                  <Textarea
                    value={extractedText}
                    readOnly
                    placeholder="Extracted text will appear here..."
                    className="absolute inset-0 h-full w-full resize-none border-none bg-transparent p-6 font-mono text-sm leading-relaxed focus-visible:ring-0"
                  />
                  {!extractedText && !extracting && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                       <Button variant="ghost" className="opacity-30 flex flex-col gap-2 h-auto hover:bg-transparent" onClick={onExtract}>
                         <ScanText className="h-8 w-8" />
                         <span className="text-xs">Click "Extract Text" to begin</span>
                       </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onPick(f);
            e.target.value = "";
          }}
        />

        {/* Footer info & Actions */}
        <div className="border-t bg-muted/5 px-8 py-6 space-y-6">
          <Alert className="border-primary/20 bg-primary/5">
            <AlertTriangle className="h-4 w-4 shrink-0 text-primary" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              <strong>Verification Note:</strong> Please cross-reference the extracted text on the right with the original document on the left. The AI drafting stage relies entirely on this extracted content.
            </p>
          </Alert>

          {file && (
            <div className="flex items-center justify-end">
              <Button
                onClick={onNext}
                disabled={!extractedText}
                size="lg"
                className="group gap-2 rounded-full px-10 shadow-xl shadow-primary/20 transition-all hover:-translate-y-0.5"
              >
                Proceed to Findings
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
