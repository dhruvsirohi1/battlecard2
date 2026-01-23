import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Download, 
  Link2, 
  ExternalLink, 
  Copy, 
  Check,
  FileText,
  Cloud,
  Database
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { BattleCardData } from '@/types/battlecard';

interface ExportStepProps {
  data: BattleCardData;
  onBack: () => void;
  onReset: () => void;
}

const integrations = [
  { id: 'gamma', name: 'Gamma', icon: '🎨', description: 'Export to Gamma presentation' },
  { id: 'gdrive', name: 'Google Drive', icon: '📁', description: 'Save to Google Drive' },
  { id: 'hubspot', name: 'HubSpot', icon: '🧡', description: 'Sync with HubSpot CRM' },
];

export function ExportStep({ data, onBack, onReset }: ExportStepProps) {
  const [copied, setCopied] = useState(false);
  const shareUrl = `https://tuskira.app/cards/${crypto.randomUUID().slice(0, 8)}`;

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success('Link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const exportPdf = () => {
    toast.success('PDF download started');
  };

  const connectIntegration = (name: string) => {
    toast.info(`Connecting to ${name}...`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Export & Share</h2>
        <p className="text-muted-foreground">
          Share your battle card or export to your favorite tools
        </p>
      </div>

      {/* Battle Card Preview */}
      <div className="p-6 rounded-xl bg-gradient-to-br from-card to-secondary/30 border border-border">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-foreground mb-1">
              {data.useCase === 'ctem' ? 'CTEM' : 'AI SOC'} Battle Card
            </h3>
            <p className="text-sm text-muted-foreground">
              vs. {data.competitors.map(c => c.name).join(', ')}
            </p>
          </div>
          <div className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
            Ready to share
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {data.sections.filter(s => s.enabled).slice(0, 4).map((section) => (
            <div key={section.id} className="p-3 rounded-lg bg-background/50 border border-border/50">
              <p className="text-xs text-muted-foreground mb-1">Section</p>
              <p className="text-sm font-medium text-foreground truncate">{section.name}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Share Link */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Public Link
        </h3>
        <div className="flex gap-3">
          <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-lg bg-secondary border border-border">
            <Link2 className="w-5 h-5 text-muted-foreground shrink-0" />
            <span className="text-sm text-foreground truncate">{shareUrl}</span>
          </div>
          <Button onClick={copyLink} variant="outline" className="shrink-0">
            {copied ? (
              <Check className="w-5 h-5 text-success" />
            ) : (
              <Copy className="w-5 h-5" />
            )}
          </Button>
          <Button variant="outline" className="shrink-0">
            <ExternalLink className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Export Options */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Export Options
        </h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <Button 
            variant="outline" 
            className="h-auto py-4 justify-start gap-4"
            onClick={exportPdf}
          >
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-destructive" />
            </div>
            <div className="text-left">
              <p className="font-medium">Download PDF</p>
              <p className="text-sm text-muted-foreground">High-quality printable format</p>
            </div>
          </Button>
          <Button variant="outline" className="h-auto py-4 justify-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
              <Download className="w-5 h-5 text-info" />
            </div>
            <div className="text-left">
              <p className="font-medium">Download PPTX</p>
              <p className="text-sm text-muted-foreground">PowerPoint presentation</p>
            </div>
          </Button>
        </div>
      </div>

      {/* Integrations */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Integrations
        </h3>
        <div className="grid sm:grid-cols-3 gap-4">
          {integrations.map((integration, index) => (
            <motion.button
              key={integration.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => connectIntegration(integration.name)}
              className="p-4 rounded-xl bg-card border border-border hover:border-primary/50 transition-all text-left group"
            >
              <div className="text-2xl mb-2">{integration.icon}</div>
              <p className="font-medium text-foreground">{integration.name}</p>
              <p className="text-xs text-muted-foreground mt-1">{integration.description}</p>
            </motion.button>
          ))}
        </div>
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-border">
        <Button variant="outline" size="lg" onClick={onBack}>
          Back
        </Button>
        <Button variant="hero" size="lg" onClick={onReset}>
          Create Another Card
        </Button>
      </div>
    </motion.div>
  );
}
