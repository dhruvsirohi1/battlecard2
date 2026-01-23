import { motion } from 'framer-motion';
import { LayoutGrid, FileText, Zap, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type { TemplateType, CardSection } from '@/types/battlecard';

interface CustomizeStepProps {
  selectedTemplate: TemplateType;
  sections: CardSection[];
  onTemplateChange: (template: TemplateType) => void;
  onSectionsChange: (sections: CardSection[]) => void;
  onNext: () => void;
  onBack: () => void;
}

const templates = [
  {
    id: 'feature-grid' as const,
    name: 'Feature Grid',
    description: 'Side-by-side comparison with feature checkmarks',
    icon: LayoutGrid,
  },
  {
    id: 'executive-summary' as const,
    name: 'Executive Summary',
    description: 'High-level overview for leadership presentations',
    icon: FileText,
  },
  {
    id: 'quick-hits' as const,
    name: 'Quick Hits',
    description: 'Rapid talking points for sales conversations',
    icon: Zap,
  },
];

export function CustomizeStep({
  selectedTemplate,
  sections,
  onTemplateChange,
  onSectionsChange,
  onNext,
  onBack,
}: CustomizeStepProps) {
  const toggleSection = (sectionId: string) => {
    onSectionsChange(
      sections.map(s =>
        s.id === sectionId ? { ...s, enabled: !s.enabled } : s
      )
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Customize Your Card</h2>
        <p className="text-muted-foreground">
          Choose a template and select which sections to include
        </p>
      </div>

      {/* Template Selection */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Template Style
        </h3>
        <div className="grid md:grid-cols-3 gap-4">
          {templates.map((template, index) => {
            const Icon = template.icon;
            const isSelected = selectedTemplate === template.id;

            return (
              <motion.button
                key={template.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => onTemplateChange(template.id)}
                className={cn(
                  "relative p-5 rounded-xl border text-left transition-all duration-300",
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-primary/50"
                )}
              >
                {isSelected && (
                  <div className="absolute top-3 right-3">
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-4 h-4 text-primary-foreground" />
                    </div>
                  </div>
                )}

                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-colors",
                  isSelected ? "bg-primary text-primary-foreground" : "bg-secondary"
                )}>
                  <Icon className="w-5 h-5" />
                </div>

                <h4 className="font-semibold text-foreground">{template.name}</h4>
                <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Section Toggles */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Card Sections
        </h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {sections.map((section, index) => (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                "flex items-center justify-between p-4 rounded-lg border transition-all",
                section.enabled
                  ? "border-primary/30 bg-primary/5"
                  : "border-border bg-card"
              )}
            >
              <span className={cn(
                "font-medium transition-colors",
                section.enabled ? "text-foreground" : "text-muted-foreground"
              )}>
                {section.name}
              </span>
              <Switch
                checked={section.enabled}
                onCheckedChange={() => toggleSection(section.id)}
              />
            </motion.div>
          ))}
        </div>
      </div>

      <div className="flex justify-between items-center pt-4">
        <Button variant="outline" size="lg" onClick={onBack}>
          Back
        </Button>
        <Button variant="hero" size="lg" onClick={onNext}>
          Generate Card
        </Button>
      </div>
    </motion.div>
  );
}
