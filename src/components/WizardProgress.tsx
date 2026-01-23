import { motion } from 'framer-motion';
import { Check, Globe, Target, FileUp, Palette, Sparkles, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WizardStep } from '@/types/battlecard';

interface WizardProgressProps {
  currentStep: WizardStep;
  completedSteps: WizardStep[];
}

const steps: { id: WizardStep; label: string; icon: React.ElementType }[] = [
  { id: 'competitors', label: 'Competitors', icon: Globe },
  { id: 'use-case', label: 'Use Case', icon: Target },
  { id: 'documents', label: 'Documents', icon: FileUp },
  { id: 'customize', label: 'Customize', icon: Palette },
  { id: 'generate', label: 'Generate', icon: Sparkles },
  { id: 'export', label: 'Export', icon: Share2 },
];

export function WizardProgress({ currentStep, completedSteps }: WizardProgressProps) {
  const currentIndex = steps.findIndex(s => s.id === currentStep);

  return (
    <div className="w-full py-6">
      <div className="flex items-center justify-between relative">
        {/* Progress Line */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-border" />
        <motion.div 
          className="absolute top-5 left-0 h-0.5 bg-gradient-to-r from-primary to-info"
          initial={{ width: '0%' }}
          animate={{ width: `${(currentIndex / (steps.length - 1)) * 100}%` }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        />

        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent = step.id === currentStep;
          const isPast = index < currentIndex;
          const Icon = step.icon;

          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
                  isCompleted && "bg-gradient-to-br from-primary to-info",
                  isCurrent && "bg-primary glow-effect",
                  !isCompleted && !isCurrent && "bg-secondary border border-border"
                )}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5 text-primary-foreground" />
                ) : (
                  <Icon className={cn(
                    "w-5 h-5",
                    isCurrent ? "text-primary-foreground" : "text-muted-foreground"
                  )} />
                )}
              </motion.div>
              <span className={cn(
                "mt-2 text-xs font-medium transition-colors",
                isCurrent ? "text-primary" : isPast ? "text-foreground" : "text-muted-foreground"
              )}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
