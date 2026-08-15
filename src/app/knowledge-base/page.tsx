'use client';

import { useEffect, useRef, useState } from 'react';
import { BookOpen, CheckCircle2, FileText, Trash2, UploadCloud } from 'lucide-react';
import { SidebarToggle } from '@/components/app-sidebar';
import { Button } from '@/components/ui/button';

const BUSINESS_INFO_KEY = 'bookly-business-information';
const DOCUMENTS_KEY = 'bookly-knowledge-documents';

type KnowledgeDocument = {
  id: string;
  name: string;
  size: number;
  addedAt: string;
};

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function KnowledgeBasePage() {
  const [businessInformation, setBusinessInformation] = useState('');
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const storedInformation = localStorage.getItem(BUSINESS_INFO_KEY) ?? '';
    setBusinessInformation(storedInformation);
    try {
      const storedDocuments = JSON.parse(localStorage.getItem(DOCUMENTS_KEY) ?? '[]') as KnowledgeDocument[];
      setDocuments(Array.isArray(storedDocuments) ? storedDocuments : []);
    } catch {
      setDocuments([]);
    }

    fetch('/api/knowledge-base')
      .then(async (response) => {
        if (!response.ok) throw new Error('Could not load the Knowledge base.');
        return response.json() as Promise<{ knowledgeBase?: unknown }>;
      })
      .then((payload) => {
        if (typeof payload.knowledgeBase === 'string' && payload.knowledgeBase) setBusinessInformation(payload.knowledgeBase);
      })
      .catch(() => undefined);
  }, []);

  async function saveKnowledgeBase() {
    setSaving(true);
    setSaveError('');
    try {
      const response = await fetch('/api/knowledge-base', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ knowledgeBase: businessInformation }),
      });
      const payload = await response.json().catch(() => ({})) as { knowledgeBase?: unknown; error?: unknown };
      if (!response.ok) throw new Error(typeof payload.error === 'string' ? payload.error : 'Could not save the Knowledge base.');
      const savedInformation = typeof payload.knowledgeBase === 'string' ? payload.knowledgeBase : businessInformation;
      setBusinessInformation(savedInformation);
      localStorage.setItem(BUSINESS_INFO_KEY, savedInformation);
      localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(documents));
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2200);
    } catch (reason) {
      setSaveError(reason instanceof Error ? reason.message : 'Could not save the Knowledge base.');
    } finally {
      setSaving(false);
    }
  }

  function addDocuments(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    if (selectedFiles.length === 0) return;

    setDocuments((current) => [
      ...current,
      ...selectedFiles.map((file) => ({
        id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
        name: file.name,
        size: file.size,
        addedAt: new Date().toISOString(),
      })),
    ]);
    event.target.value = '';
  }

  function removeDocument(id: string) {
    setDocuments((current) => current.filter((document) => document.id !== id));
  }

  return (
    <main className="h-dvh overflow-y-auto overscroll-contain bg-[var(--chat-canvas)] text-foreground">
      <header className="sticky top-0 z-10 border-b border-[var(--chat-border)] bg-background/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-start gap-4 px-4 sm:px-6 lg:px-8">
          <SidebarToggle />
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Knowledge base</h1>
            <p className="hidden text-sm text-muted-foreground sm:block">Give your assistant the information it needs about your business.</p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="max-w-3xl space-y-6">
          <section className="rounded-xl border border-[var(--chat-border)] bg-card p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <BookOpen className="size-4" />
              </div>
              <div>
                <h2 className="font-semibold tracking-tight">Business information</h2>
                <p className="mt-1 text-sm leading-5 text-muted-foreground">Add details about your business, services, policies, and anything your meeting assistant should know.</p>
              </div>
            </div>
            <textarea
              value={businessInformation}
              onChange={(event) => setBusinessInformation(event.target.value)}
              placeholder="Tell us about your business, services, hours, locations, and booking policies..."
              className="mt-6 min-h-56 w-full resize-y rounded-lg border bg-background p-3 text-sm leading-6 outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
            />
            <p className="mt-2 text-xs text-muted-foreground">This information helps Bookly give more accurate answers.</p>
          </section>

          <section className="rounded-xl border border-[var(--chat-border)] bg-card p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <UploadCloud className="size-4" />
              </div>
              <div>
                <h2 className="font-semibold tracking-tight">Business documents</h2>
                <p className="mt-1 text-sm leading-5 text-muted-foreground">Upload documents with additional information for your assistant to reference.</p>
              </div>
            </div>

            <input ref={fileInputRef} type="file" multiple accept=".pdf,.doc,.docx,.txt,.md,.csv" onChange={addDocuments} className="sr-only" />
            <button type="button" onClick={() => fileInputRef.current?.click()} className="mt-6 flex w-full flex-col items-center justify-center rounded-lg border border-dashed border-[var(--chat-border)] bg-muted/30 px-5 py-8 text-center transition-colors hover:bg-muted/60">
              <UploadCloud className="size-6 text-primary" />
              <span className="mt-3 text-sm font-medium">Choose files to upload</span>
              <span className="mt-1 text-xs text-muted-foreground">PDF, Word, TXT, Markdown, or CSV files</span>
            </button>

            {documents.length > 0 && (
              <div className="mt-6 space-y-2">
                <p className="text-sm font-medium">Uploaded documents</p>
                <div className="divide-y rounded-lg border">
                  {documents.map((document) => (
                    <div key={document.id} className="flex items-center gap-3 p-3">
                      <FileText className="size-4 shrink-0 text-primary" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{document.name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{formatFileSize(document.size)} · Ready</p>
                      </div>
                      <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeDocument(document.id)} aria-label={`Remove ${document.name}`}>
                        <Trash2 />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <div className="flex items-center justify-end gap-3">
            {saveError && <p className="text-sm text-destructive">{saveError}</p>}
            <Button onClick={() => void saveKnowledgeBase()} disabled={saving}>{saved ? <><CheckCircle2 />Saved</> : saving ? 'Saving…' : 'Save knowledge base'}</Button>
          </div>
        </div>
      </div>
    </main>
  );
}
