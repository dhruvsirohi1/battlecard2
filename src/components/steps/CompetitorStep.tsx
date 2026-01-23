import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Plus, X, Check, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { Competitor } from '@/types/battlecard';

interface CompetitorStepProps {
  competitors: Competitor[];
  onCompetitorsChange: (competitors: Competitor[]) => void;
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

export function CompetitorStep({ competitors, onCompetitorsChange, onNext }: CompetitorStepProps) {
  const [inputValue, setInputValue] = useState('');

  const addCompetitor = () => {
    if (!inputValue.trim() || competitors.length >= 3) return;

    const url = inputValue.startsWith('http') ? inputValue : `https://${inputValue}`;
    const isValid = validateUrl(inputValue);
    
    const newCompetitor: Competitor = {
      id: crypto.randomUUID(),
      url,
      name: new URL(url).hostname.replace('www.', ''),
      isValid,
      isLoading: isValid,
    };

    const updatedCompetitors = [...competitors, newCompetitor];
    onCompetitorsChange(updatedCompetitors);
    setInputValue('');

    // Simulate URL validation
    if (isValid) {
      setTimeout(() => {
        onCompetitorsChange(
          updatedCompetitors.map(c => c.id === newCompetitor.id ? { ...c, isLoading: false } : c)
        );
      }, 1500);
    }
  };

  const removeCompetitor = (id: string) => {
    onCompetitorsChange(competitors.filter(c => c.id !== id));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCompetitor();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Add Competitor URLs</h2>
        <p className="text-muted-foreground">
          Enter up to 3 competitor websites to analyze for your battle card
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter competitor URL (e.g., crowdstrike.com)"
              className="pl-10 h-12 bg-secondary border-border focus:border-primary"
              disabled={competitors.length >= 3}
            />
          </div>
          <Button
            onClick={addCompetitor}
            disabled={!inputValue.trim() || competitors.length >= 3}
            className="h-12 px-6"
          >
            <Plus className="w-5 h-5" />
            Add
          </Button>
        </div>

        <AnimatePresence mode="popLayout">
          {competitors.map((competitor, index) => (
            <motion.div
              key={competitor.id}
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "flex items-center gap-4 p-4 rounded-lg border transition-all",
                competitor.isValid 
                  ? "bg-card border-border hover:border-primary/50" 
                  : "bg-destructive/10 border-destructive/30"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center",
                competitor.isValid ? "bg-secondary" : "bg-destructive/20"
              )}>
                {competitor.isLoading ? (
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                ) : competitor.isValid ? (
                  <Check className="w-5 h-5 text-success" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-destructive" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{competitor.name}</p>
                <p className="text-sm text-muted-foreground truncate">{competitor.url}</p>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeCompetitor(competitor.id)}
                className="shrink-0 hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="w-5 h-5" />
              </Button>
            </motion.div>
          ))}
        </AnimatePresence>

        {competitors.length === 0 && (
          <div className="text-center py-12 border border-dashed border-border rounded-lg">
            <Globe className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No competitors added yet</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Add competitor URLs to start building your battle card
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center pt-4">
        <p className="text-sm text-muted-foreground">
          {competitors.length}/3 competitors added
        </p>
        <Button
          variant="hero"
          size="lg"
          onClick={onNext}
          disabled={competitors.length === 0 || competitors.some(c => c.isLoading)}
        >
          Continue
        </Button>
      </div>
    </motion.div>
  );
}
