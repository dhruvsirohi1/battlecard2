import { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, X, File, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { UploadedDocument, UseCase } from '@/types/battlecard';
import { uploadDocumentToDrive } from '@/services/aws';

interface DocumentStepProps {
  documents: UploadedDocument[];
  onDocumentsChange: (documents: UploadedDocument[]) => void;
  useCase: UseCase;
  onNext: () => void;
  onBack: () => void;
}

const acceptedTypes = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
} as const;

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileIcon = (type: string) => {
  switch (type) {
    case 'pdf':  return <FileText className="w-5 h-5 text-destructive" />;
    case 'docx': return <FileText className="w-5 h-5 text-info" />;
    case 'pptx': return <File className="w-5 h-5 text-warning" />;
    default:     return <File className="w-5 h-5" />;
  }
};

export function DocumentStep({ documents, onDocumentsChange, useCase, onNext, onBack }: DocumentStepProps) {
  const [uploadingIds, setUploadingIds] = useState<Set<string>>(new Set());
  const [errorIds, setErrorIds] = useState<Set<string>>(new Set());

  const processFiles = useCallback((files: File[]) => {
    const newDocs: Array<{ doc: UploadedDocument; file: File }> = [];

    files.forEach(file => {
      const fileType = acceptedTypes[file.type as keyof typeof acceptedTypes];
      if (fileType) {
        newDocs.push({
          doc: {
            id: crypto.randomUUID(),
            name: file.name,
            type: fileType as 'pdf' | 'docx' | 'pptx',
            size: file.size,
            uploadedAt: new Date(),
          },
          file,
        });
      }
    });

    if (newDocs.length === 0) return;

    onDocumentsChange([...documents, ...newDocs.map(d => d.doc)]);

    // Upload each file to Drive
    newDocs.forEach(({ doc, file }) => {
      setUploadingIds(prev => new Set(prev).add(doc.id));
      uploadDocumentToDrive(file, useCase || 'ctem')
        .then(() => {
          setUploadingIds(prev => { const s = new Set(prev); s.delete(doc.id); return s; });
        })
        .catch(() => {
          setUploadingIds(prev => { const s = new Set(prev); s.delete(doc.id); return s; });
          setErrorIds(prev => new Set(prev).add(doc.id));
        });
    });
  }, [documents, useCase]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    processFiles(Array.from(e.dataTransfer.files));
  }, [processFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(Array.from(e.target.files));
  }, [processFiles]);

  const removeDocument = (id: string) => {
    onDocumentsChange(documents.filter(d => d.id !== id));
    setUploadingIds(prev => { const s = new Set(prev); s.delete(id); return s; });
    setErrorIds(prev => { const s = new Set(prev); s.delete(id); return s; });
  };

  const isUploading = uploadingIds.size > 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Upload Supporting Documents</h2>
        <p className="text-muted-foreground">
          Add PDFs, Word docs, or PowerPoints — saved to your{' '}
          <span className="font-medium text-foreground">{useCase === 'ai-soc' ? 'aisoc' : 'ctem'}</span>{' '}
          Drive folder for AI reference
        </p>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className={cn(
          "relative border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer",
          "border-border hover:border-primary/50 hover:bg-secondary/30",
          "group"
        )}
      >
        <input
          type="file"
          accept=".pdf,.docx,.pptx"
          multiple
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-secondary flex items-center justify-center group-hover:bg-primary/10 transition-colors">
            <Upload className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <div>
            <p className="text-foreground font-medium">Drop files here or click to upload</p>
            <p className="text-sm text-muted-foreground mt-1">Supports PDF, DOCX, and PPTX files</p>
          </div>
        </div>
      </div>

      <AnimatePresence mode="popLayout">
        {documents.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            <p className="text-sm font-medium text-muted-foreground">
              Uploaded Documents ({documents.length})
            </p>
            {documents.map((doc, index) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-4 p-4 rounded-lg bg-card border border-border hover:border-primary/30 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                  {getFileIcon(doc.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{doc.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {doc.type.toUpperCase()} • {formatFileSize(doc.size)}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {uploadingIds.has(doc.id) ? (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Saving to Drive...
                    </span>
                  ) : errorIds.has(doc.id) ? (
                    <span className="flex items-center gap-1 text-xs text-destructive">
                      <AlertCircle className="w-3 h-3" />
                      Upload failed
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-success">
                      <CheckCircle2 className="w-3 h-3" />
                      Saved to Drive
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeDocument(doc.id)}
                    className="hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-between items-center pt-4">
        <Button variant="outline" size="lg" onClick={onBack}>
          Back
        </Button>
        <div className="flex gap-3">
          <Button variant="secondary" size="lg" onClick={onNext}>
            Skip
          </Button>
          <Button variant="hero" size="lg" onClick={onNext} disabled={isUploading}>
            {isUploading ? 'Uploading...' : 'Continue'}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
