import { motion } from 'framer-motion';
import { Shield, Brain, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { UseCase } from '@/types/battlecard';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface UseCaseStepProps {
  selectedUseCase: UseCase;
  onUseCaseChange: (useCase: UseCase) => void;
  onNext: () => void;
  onBack: () => void;
}

const useCases = [
  {
    id: 'ctem' as const,
    name: 'CTEM',
    fullName: 'Continuous Threat Exposure Management',
    description: 'Focus on exposure management, attack surface monitoring, and vulnerability prioritization.',
    icon: Shield,
    features: [
      'Attack Surface Analysis',
      'Vulnerability Prioritization',
      'Exposure Metrics',
      'Risk Scoring'
    ],
  },
  {
    id: 'ai-soc' as const,
    name: 'AI SOC',
    fullName: 'AI-Powered Security Operations Center',
    description: 'Emphasize AI-driven threat detection, automated response, and SOC efficiency improvements.',
    icon: Brain,
    features: [
      'AI Threat Detection',
      'Automated Response',
      'Alert Triage',
      'SOC Productivity'
    ],
  },
];

export function UseCaseStep({ selectedUseCase, onUseCaseChange, onNext, onBack }: UseCaseStepProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Select Use Case</h2>
        <p className="text-muted-foreground">
          Choose the competitive scenario for your battle card
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {useCases.map((useCase, index) => {
          const Icon = useCase.icon;
          const isSelected = selectedUseCase === useCase.id;

          return (
            <motion.button
              key={useCase.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => onUseCaseChange(useCase.id)}
              className={cn(
                "relative p-6 rounded-xl border text-left transition-all duration-300",
                isSelected
                  ? "border-primary bg-primary/5 glow-effect"
                  : "border-border bg-card hover:border-primary/50 hover:bg-secondary/50"
              )}
            >
              {isSelected && (
                <motion.div
                  layoutId="usecase-indicator"
                  className="absolute inset-0 rounded-xl border-2 border-primary"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}

              <div className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <div className={cn(
                    "w-12 h-12 rounded-lg flex items-center justify-center transition-colors",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-secondary"
                  )}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="p-1.5 rounded-full hover:bg-secondary transition-colors">
                        <Info className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <p className="font-medium">{useCase.fullName}</p>
                      <p className="text-sm text-muted-foreground mt-1">{useCase.description}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>

                <h3 className="text-xl font-bold text-foreground mb-1">{useCase.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{useCase.fullName}</p>

                <div className="space-y-2">
                  {useCase.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-2 text-sm">
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        isSelected ? "bg-primary" : "bg-muted-foreground"
                      )} />
                      <span className="text-muted-foreground">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      <div className="flex justify-between items-center pt-4">
        <Button variant="outline" size="lg" onClick={onBack}>
          Back
        </Button>
        <Button
          variant="hero"
          size="lg"
          onClick={onNext}
          disabled={!selectedUseCase}
        >
          Continue
        </Button>
      </div>
    </motion.div>
  );
}
