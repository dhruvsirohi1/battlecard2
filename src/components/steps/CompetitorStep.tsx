import { useState } from 'react';
import { motion } from 'framer-motion';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import type { Competitor } from '@/types/battlecard';

interface CompetitorStepProps {
  competitors: Competitor[];
  onCompetitorsChange: (competitors: Competitor[]) => void;
  forceRegenerate: boolean;
  onForceRegenerateChange: (value: boolean) => void;
  onNext: () => void;
}

const validateUrl = (url: string): boolean => {
  try {
    new URL(url.startsWith('http') ? url : `https://${url}`);
    return true;
  } catch {
    return false;
  }
};

export function CompetitorStep({ competitors, onCompetitorsChange, forceRegenerate, onForceRegenerateChange, onNext }: CompetitorStepProps) {
  const [inputValue, setInputValue] = useState(competitors[0]?.url.replace(/^https?:\/\//, '') ?? '');

  const handleChange = (value: string) => {
    setInputValue(value);
    if (!value.trim()) {
      onCompetitorsChange([]);
      return;
    }
    const url = value.startsWith('http') ? value : `https://${value}`;
    if (validateUrl(value)) {
      onCompetitorsChange([{
        id: competitors[0]?.id ?? crypto.randomUUID(),
        url,
        name: new URL(url).hostname.replace('www.', ''),
        isValid: true,
        isLoading: false,
      }]);
    } else {
      onCompetitorsChange([]);
    }
  };

  const isValid = competitors.length === 1 && competitors[0].isValid;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Add Competitor URL</h2>
        <p className="text-muted-foreground">
          Enter a competitor website to analyze for your battle card
        </p>
      </div>

      <div className="relative">
        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          value={inputValue}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && isValid) onNext(); }}
          placeholder="e.g., crowdstrike.com"
          className="pl-10 h-12 bg-secondary border-border focus:border-primary"
        />
      </div>

      <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-secondary/50 border border-border">
        <div>
          <p className="text-sm font-medium text-foreground">Force Regenerate</p>
          <p className="text-xs text-muted-foreground">Bypass 7-day cache and generate a fresh card</p>
        </div>
        <Switch
          checked={forceRegenerate}
          onCheckedChange={onForceRegenerateChange}
        />
      </div>

      <div className="flex justify-end pt-4">
        <Button
          variant="hero"
          size="lg"
          onClick={onNext}
          disabled={!isValid}
        >
          Continue
        </Button>
      </div>
    </motion.div>
  );
}
