export interface Competitor {
  id: string;
  url: string;
  name: string;
  isValid: boolean;
  isLoading: boolean;
  /** Optional: from brand search, for badge display */
  icon?: string | null;
  claimed?: boolean;
  domain?: string;
}

export type UseCase = 'ctem' | 'ai-soc' | null;

export interface UploadedDocument {
  id: string;
  name: string;
  type: 'pdf' | 'docx' | 'pptx';
  size: number;
  uploadedAt: Date;
}

export type TemplateType = 'feature-grid' | 'executive-summary' | 'quick-hits';

export interface Template {
  id: TemplateType;
  name: string;
  description: string;
  icon: string;
}

export interface CardSection {
  id: string;
  name: string;
  enabled: boolean;
}

export interface BattleCardData {
  competitors: Competitor[];
  useCase: UseCase;
  documents: UploadedDocument[];
  template: TemplateType;
  sections: CardSection[];
  generatedAt?: Date;
}

export type WizardStep = 'competitors' | 'use-case' | 'documents' | 'customize' | 'generate' | 'export';
