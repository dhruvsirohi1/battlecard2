import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle2, Sparkles, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { BattleCardData } from '@/types/battlecard';
import { 
  analyzeCompetitor, 
  processDocument, 
  generateBattleCard,
  type CompetitorAnalysis,
  type DocumentContent,
  type BattleCardContent 
} from '@/services/aws';

interface GenerateStepProps {
  data: BattleCardData;
  onComplete: (battleCard: BattleCardContent) => void;
  onBack: () => void;
}

const steps = [
  { id: 1, label: 'Analyzing competitor websites...', duration: 0 },
  { id: 2, label: 'Processing uploaded documents...', duration: 0 },
  { id: 3, label: 'Extracting key differentiators...', duration: 0 },
  { id: 4, label: 'Generating competitive insights with AI...', duration: 0 },
  { id: 5, label: 'Building your battle card...', duration: 0 },
];

export function GenerateStep({ data, onComplete, onBack }: GenerateStepProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [battleCard, setBattleCard] = useState<BattleCardContent | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    generateBattleCardAsync();
  }, []);

  const generateBattleCardAsync = async () => {
    try {
      setError(null);
      
      // Step 1: Analyze competitors
      setCurrentStep(0);
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

      // Step 2: Process documents
      setCurrentStep(1);
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

      // Step 3: Extract differentiators (handled by AI)
      setCurrentStep(2);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 4 & 5: Generate battle card with AI
      setCurrentStep(3);
      
      const enabledSections = data.sections
        .filter(s => s.enabled)
        .map(s => s.name);

      const generatedCard = await generateBattleCard({
        competitors: competitorAnalyses,
        useCase: data.useCase || 'general',
        documents: processedDocuments,
        template: data.template,
        sections: enabledSections,
forceRegenerate: true,
      });

      setCurrentStep(4);
      await new Promise(resolve => setTimeout(resolve, 500));

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
          {error ? 'Generation Failed' : isComplete ? 'Your Battle Card is Ready!' : 'Generating Battle Card'}
        </h2>
        <p className="text-muted-foreground">
          {error
            ? 'There was an error generating your battle card'
            : isComplete
            ? 'Your customized battle card has been created successfully'
            : 'Please wait while we analyze and generate your card with AI'}
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
        ) : !isComplete ? (
          <div className="space-y-4">
            {steps.map((step, index) => {
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;

              return (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-4"
                >
                  <div className="shrink-0">
                    {isCompleted ? (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-8 h-8 rounded-full bg-success flex items-center justify-center"
                      >
                        <CheckCircle2 className="w-5 h-5 text-success-foreground" />
                      </motion.div>
                    ) : isActive ? (
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                        <Loader2 className="w-5 h-5 text-primary-foreground animate-spin" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-secondary border border-border" />
                    )}
                  </div>
                  <span className={`text-sm ${
                    isActive ? 'text-foreground font-medium' :
                    isCompleted ? 'text-muted-foreground' :
                    'text-muted-foreground/50'
                  }`}>
                    {step.label}
                  </span>
                </motion.div>
              );
            })}
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
              <h3 className="font-semibold text-foreground mb-4">Card Summary</h3>
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
        <Button variant="outline" size="lg" onClick={onBack} disabled={!isComplete && !error}>
          Back
        </Button>
        {error ? (
          <Button
            variant="hero"
            size="lg"
            onClick={() => {
              setError(null);
              setCurrentStep(0);
              generateBattleCardAsync();
            }}
          >
            Try Again
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
