import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/api';
import { uploadData, getUrl, remove } from 'aws-amplify/storage';
import awsconfig from '../aws-exports';

// Configure Amplify
Amplify.configure(awsconfig);

// Create API client
const client = generateClient();

export interface CompetitorAnalysis {
  url: string;
  name: string;
  description: string;
  features: string[];
  pricing: {
    model: string;
    tiers: string[];
  };
  strengths: string[];
  weaknesses: string[];
  targetMarket: string;
}

export interface DocumentContent {
  id: string;
  name: string;
  type: string;
  extractedText: string;
  summary: string;
}

export interface BattleCardContent {
  id: string;
  title: string;
  overview: string;
  differentiators: string[];
  strengths: string[];
  weaknesses: string[];
  pricing: string;
  objections: Array<{ objection: string; response: string }>;
  questions: string[];
  testimonials: Array<{ company: string; quote: string }>;
  generatedAt: string;
}

/**
 * Analyze a competitor's website
 */
export const analyzeCompetitor = async (url: string) => {
  console.log('Analyzing competitor:', url);
  
  // Extract company name from URL
  const cleanUrl = url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  const domain = cleanUrl.split('.')[0];
  const name = domain.charAt(0).toUpperCase() + domain.slice(1);
  
  // Return immediately (no API call)
  return {
    url,
    name,
    description: `${name} is a cybersecurity company`,
    features: ['Security Platform', 'Threat Detection', 'Cloud Protection'],
    pricing: { 
      model: 'Subscription', 
      tiers: ['Essential', 'Professional', 'Enterprise'] 
    },
    strengths: ['Market Leader', 'Comprehensive Features'],
    weaknesses: ['High Cost', 'Complex Setup'],
    targetMarket: 'Enterprise',
    analyzedAt: new Date().toISOString()
  };
};

/**
 * Upload document to S3
 */
export async function uploadDocument(file: File): Promise<string> {
  try {
    const key = `documents/${Date.now()}-${file.name}`;
    
    const result = await uploadData({
      key,
      data: file,
      options: {
        contentType: file.type,
      }
    }).result;

    return result.key;
  } catch (error) {
    console.error('Error uploading document:', error);
    throw error;
  }
}

/**
 * Process uploaded document
 */
export async function processDocument(documentKey: string): Promise<DocumentContent> {
  try {
    const response = await fetch(awsconfig.API.endpoints[0].endpoint + '/process-document', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ documentKey }),
    });

    if (!response.ok) {
      throw new Error('Failed to process document');
    }

    return await response.json();
  } catch (error) {
    console.error('Error processing document:', error);
    throw error;
  }
}

/**
 * Generate battle card using Amazon Bedrock
 */
export async function generateBattleCard(data: {
  competitors: CompetitorAnalysis[];
  useCase: string;
  documents: DocumentContent[];
  template: string;
  sections: string[];
}): Promise<BattleCardContent> {
  try {
    const response = await fetch(awsconfig.API.endpoints[0].endpoint + '/generate-battlecard', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to generate battle card');
    }

    return await response.json();
  } catch (error) {
    console.error('Error generating battle card:', error);
    throw error;
  }
}

/**
 * Save battle card to DynamoDB
 */
export async function saveBattleCard(battleCard: BattleCardContent): Promise<void> {
  try {
    const response = await fetch(awsconfig.API.endpoints[0].endpoint + '/save-battlecard', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(battleCard),
    });

    if (!response.ok) {
      throw new Error('Failed to save battle card');
    }
  } catch (error) {
    console.error('Error saving battle card:', error);
    throw error;
  }
}

/**
 * Get user's battle cards
 */
export async function getBattleCards(): Promise<BattleCardContent[]> {
  try {
    const response = await fetch(awsconfig.API.endpoints[0].endpoint + '/battlecards', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch battle cards');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching battle cards:', error);
    throw error;
  }
}

/**
 * Delete a battle card
 */
export async function deleteBattleCard(id: string): Promise<void> {
  try {
    const response = await fetch(awsconfig.API.endpoints[0].endpoint + `/battlecards/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to delete battle card');
    }
  } catch (error) {
    console.error('Error deleting battle card:', error);
    throw error;
  }
}
