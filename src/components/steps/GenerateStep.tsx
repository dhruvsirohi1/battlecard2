import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { BattleCardData } from '@/types/battlecard';
import {
  analyzeCompetitor,
  generateBattleCard,
  type CompetitorAnalysis,
  type DocumentContent,
  type BattleCardContent
} from '@/services/aws';

interface GenerateStepProps {
  data: BattleCardData;
  forceRegenerate: boolean;
  onComplete: (battleCard: BattleCardContent) => void;
  onBack: () => void;
}


const STAGES = [
  { label: 'Checking cache...',               duration: 3000  },
  { label: 'Parsing Google Drive docs...',    duration: 8000  },
  { label: 'Scraping competitor website...',  duration: 25000 },
  { label: 'Writing battlecard with AI...',   duration: Infinity },
];

export function GenerateStep({ data, forceRegenerate, onComplete, onBack }: GenerateStepProps) {
  const [isComplete, setIsComplete] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [battleCard, setBattleCard] = useState<BattleCardContent | null>(null);
  const { toast } = useToast();
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (!hasStarted || isComplete || error) return;

    // Schedule stage transitions
    let elapsed = 0;
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    STAGES.forEach((stage, i) => {
      if (i === 0 || stage.duration === Infinity) return;
      elapsed += STAGES[i - 1].duration === Infinity ? 0 : STAGES[i - 1].duration;
      const t = setTimeout(() => setStageIndex(i), elapsed);
      timersRef.current.push(t);
    });

    // Advance to last stage after all timed ones
    const totalTimed = STAGES.slice(0, -1).reduce((sum, s) => sum + (s.duration === Infinity ? 0 : s.duration), 0);
    const last = setTimeout(() => setStageIndex(STAGES.length - 1), totalTimed);
    timersRef.current.push(last);

    return () => timersRef.current.forEach(clearTimeout);
  }, [hasStarted]);

  useEffect(() => {
    if (isComplete || error) timersRef.current.forEach(clearTimeout);
  }, [isComplete, error]);

  const generateBattleCardAsync = async (force = false) => {
    try {
      setError(null);
      const competitorAnalyses: CompetitorAnalysis[] = [];
      
      for (const competitor of data.competitors) {
        try {
          const analysis = await analyzeCompetitor(competitor.url);
          competitorAnalyses.push(analysis);
        } catch (err) {
          console.error(`Error analyzing ${competitor.url}:`, err);
          toast({
            title: 'Warning',
            description: `Could not fully analyze ${competitor.name}. Continuing with available data.`,
            variant: 'destructive',
          });
        }
      }

      if (competitorAnalyses.length === 0) {
        throw new Error('Failed to analyze any competitors');
      }

      const processedDocuments: DocumentContent[] = [];
      
      for (const doc of data.documents) {
        try {
          // In real implementation, documentKey would be from S3 upload
          // For now, we'll skip actual document processing
          processedDocuments.push({
            id: doc.id,
            name: doc.name,
            type: doc.type,
            extractedText: '',
            summary: 'Document processed',
          });
        } catch (err) {
          console.error(`Error processing ${doc.name}:`, err);
        }
      }

      const enabledSections = data.sections
        .filter(s => s.enabled)
        .map(s => s.name);

      const generatedCard = await generateBattleCard({
        competitors: competitorAnalyses,
        useCase: data.useCase || 'general',
        documents: processedDocuments,
        template: data.template,
        sections: enabledSections,
        forceRegenerate: force,
      });

      setBattleCard(generatedCard);
      setIsComplete(true);
      
      toast({
        title: 'Success!',
        description: 'Your battle card has been generated successfully.',
      });
    } catch (err) {
      console.error('Error generating battle card:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate battle card');
      toast({
        title: 'Error',
        description: 'Failed to generate battle card. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-8"
    >
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">
          {error ? 'Generation Failed' : isComplete ? 'Your Battle Card is Ready!' : hasStarted ? 'Generating Battlecard' : 'Ready to Generate'}
        </h2>
        <p className="text-muted-foreground">
          {error
            ? 'There was an error generating your battle card'
            : isComplete
            ? 'Your customized battle card has been created successfully'
            : hasStarted
            ? 'Please wait while we generate your card with AI'
            : 'Review your selections below, then click Generate'}
        </p>
      </div>

      <div className="max-w-md mx-auto">
        {error ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-6"
          >
            <div className="w-24 h-24 mx-auto rounded-full bg-destructive/20 flex items-center justify-center">
              <AlertCircle className="w-12 h-12 text-destructive" />
            </div>
            <div className="p-6 rounded-xl bg-card border border-destructive">
              <p className="text-destructive">{error}</p>
            </div>
          </motion.div>
        ) : hasStarted && !isComplete ? (
          <div className="flex flex-col items-center justify-center py-12 gap-6">
            <Loader2 className="w-16 h-16 text-primary animate-spin" />
            <motion.p
              key={stageIndex}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3 }}
              className="text-lg font-medium text-foreground"
            >
              {STAGES[stageIndex].label}
            </motion.p>
          </div>
        ) : !hasStarted ? (
          <div className="p-6 rounded-xl bg-card border border-border space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Competitors</span>
              <span className="text-foreground font-medium">{data.competitors.map(c => c.name).join(', ')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Use Case</span>
              <span className="text-foreground font-medium uppercase">{data.useCase?.replace('-', ' ') || 'General'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Template</span>
              <span className="text-foreground font-medium capitalize">{data.template.replace('-', ' ')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sections</span>
              <span className="text-foreground font-medium">{data.sections.filter(s => s.enabled).length} active</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Documents</span>
              <span className="text-foreground font-medium">{data.documents.length}</span>
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-6"
          >
            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-primary to-info flex items-center justify-center glow-effect">
              <Sparkles className="w-12 h-12 text-primary-foreground" />
            </div>

            <div className="p-6 rounded-xl bg-card border border-border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">Card Summary</h3>
                {battleCard?.fromCache && (
                  <span className="text-xs px-2 py-1 rounded-full bg-warning/10 text-warning font-medium">
                    Cached · {battleCard.cacheAge}
                  </span>
                )}
              </div>
              <div className="space-y-2 text-sm text-left">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Competitors Analyzed</span>
                  <span className="text-foreground font-medium">{data.competitors.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Use Case</span>
                  <span className="text-foreground font-medium uppercase">{data.useCase?.replace('-', ' ') || 'General'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Documents Processed</span>
                  <span className="text-foreground font-medium">{data.documents.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Template</span>
                  <span className="text-foreground font-medium capitalize">{data.template.replace('-', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Active Sections</span>
                  <span className="text-foreground font-medium">{data.sections.filter(s => s.enabled).length}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <div className="flex justify-between items-center pt-4">
        <Button variant="outline" size="lg" onClick={onBack} disabled={hasStarted && !isComplete && !error}>
          Back
        </Button>
        {error ? (
          <Button
            variant="hero"
            size="lg"
            onClick={() => {
              setError(null);
              setCurrentStep(0);
              setHasStarted(true);
              generateBattleCardAsync(forceRegenerate);
            }}
          >
            Try Again
          </Button>
        ) : !hasStarted ? (
          <Button
            variant="hero"
            size="lg"
            onClick={() => {
              setHasStarted(true);
              generateBattleCardAsync(forceRegenerate);
            }}
          >
            Generate
          </Button>
        ) : (
          <Button
            variant="hero"
            size="lg"
            onClick={() => battleCard && onComplete(battleCard)}
            disabled={!isComplete}
          >
            View & Export
          </Button>
        )}
      </div>
    </motion.div>
  );
}
