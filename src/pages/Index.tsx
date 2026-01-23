import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Header } from '@/components/Header';
import { WizardProgress } from '@/components/WizardProgress';
import { CompetitorStep } from '@/components/steps/CompetitorStep';
import { UseCaseStep } from '@/components/steps/UseCaseStep';
import { DocumentStep } from '@/components/steps/DocumentStep';
import { CustomizeStep } from '@/components/steps/CustomizeStep';
import { GenerateStep } from '@/components/steps/GenerateStep';
import { ExportStep } from '@/components/steps/ExportStep';
import type { 
  WizardStep, 
  Competitor, 
  UseCase, 
  UploadedDocument,
  TemplateType,
  CardSection,
  BattleCardData 
} from '@/types/battlecard';
import type { BattleCardContent } from '@/services/aws';

const defaultSections: CardSection[] = [
  { id: 'overview', name: 'Company Overview', enabled: true },
  { id: 'differentiators', name: 'Key Differentiators', enabled: true },
  { id: 'strengths', name: 'Tuskira Strengths', enabled: true },
  { id: 'weaknesses', name: 'Competitor Weaknesses', enabled: true },
  { id: 'pricing', name: 'Pricing Comparison', enabled: true },
  { id: 'objections', name: 'Common Objections', enabled: true },
  { id: 'questions', name: 'Discovery Questions', enabled: false },
  { id: 'testimonials', name: 'Customer Testimonials', enabled: false },
];

const Index = () => {
  const [currentStep, setCurrentStep] = useState<WizardStep>('competitors');
  const [completedSteps, setCompletedSteps] = useState<WizardStep[]>([]);
  
  // Form state
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [useCase, setUseCase] = useState<UseCase>(null);
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [template, setTemplate] = useState<TemplateType>('feature-grid');
  const [sections, setSections] = useState<CardSection[]>(defaultSections);
  const [generatedBattleCard, setGeneratedBattleCard] = useState<BattleCardContent | null>(null);

  const stepOrder: WizardStep[] = ['competitors', 'use-case', 'documents', 'customize', 'generate', 'export'];

  const goToStep = useCallback((step: WizardStep) => {
    const currentIndex = stepOrder.indexOf(currentStep);
    const newIndex = stepOrder.indexOf(step);
    
    if (newIndex > currentIndex) {
      setCompletedSteps(prev => [...new Set([...prev, currentStep])]);
    }
    
    setCurrentStep(step);
  }, [currentStep]);

  const goNext = useCallback(() => {
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex < stepOrder.length - 1) {
      goToStep(stepOrder[currentIndex + 1]);
    }
  }, [currentStep, goToStep]);

  const goBack = useCallback(() => {
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1]);
    }
  }, [currentStep]);

  const handleGenerationComplete = useCallback((battleCard: BattleCardContent) => {
    setGeneratedBattleCard(battleCard);
    goNext();
  }, [goNext]);

  const resetWizard = useCallback(() => {
    setCurrentStep('competitors');
    setCompletedSteps([]);
    setCompetitors([]);
    setUseCase(null);
    setDocuments([]);
    setTemplate('feature-grid');
    setSections(defaultSections);
    setGeneratedBattleCard(null);
  }, []);

  const battleCardData: BattleCardData = {
    competitors,
    useCase,
    documents,
    template,
    sections,
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-6 pt-24 pb-12">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="gradient-text">Battle Card</span>
              <span className="text-foreground"> Generator</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Create winning competitive battle cards in minutes. 
              Analyze competitors, customize your messaging, and share with your team.
            </p>
          </motion.div>

          {/* Progress Indicator */}
          <div className="mb-12">
            <WizardProgress 
              currentStep={currentStep} 
              completedSteps={completedSteps} 
            />
          </div>

          {/* Step Content */}
          <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-8">
            <AnimatePresence mode="wait">
              {currentStep === 'competitors' && (
                <CompetitorStep
                  key="competitors"
                  competitors={competitors}
                  onCompetitorsChange={setCompetitors}
                  onNext={goNext}
                />
              )}
              
              {currentStep === 'use-case' && (
                <UseCaseStep
                  key="use-case"
                  selectedUseCase={useCase}
                  onUseCaseChange={setUseCase}
                  onNext={goNext}
                  onBack={goBack}
                />
              )}
              
              {currentStep === 'documents' && (
                <DocumentStep
                  key="documents"
                  documents={documents}
                  onDocumentsChange={setDocuments}
                  onNext={goNext}
                  onBack={goBack}
                />
              )}
              
              {currentStep === 'customize' && (
                <CustomizeStep
                  key="customize"
                  selectedTemplate={template}
                  sections={sections}
                  onTemplateChange={setTemplate}
                  onSectionsChange={setSections}
                  onNext={goNext}
                  onBack={goBack}
                />
              )}
              
              {currentStep === 'generate' && (
                <GenerateStep
                  key="generate"
                  data={battleCardData}
                  onComplete={handleGenerationComplete}
                  onBack={goBack}
                />
              )}
              
              {currentStep === 'export' && generatedBattleCard && (
                <ExportStep
                  key="export"
                  battleCard={generatedBattleCard}
                  onBack={goBack}
                  onReset={resetWizard}
                />
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
