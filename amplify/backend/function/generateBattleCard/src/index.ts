/**
 * AWS Lambda Function: Generate Battle Card
 * 
 * This function uses Amazon Bedrock (Claude) to generate comprehensive battle cards
 * based on competitor analysis, use case, and uploaded documents
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION });

interface CompetitorAnalysis {
  name: string;
  description: string;
  features: string[];
  pricing: any;
  strengths: string[];
  weaknesses: string[];
  targetMarket: string;
}

interface DocumentContent {
  name: string;
  summary: string;
  extractedText: string;
}

interface GenerateBattleCardInput {
  competitors: CompetitorAnalysis[];
  useCase: string;
  documents: DocumentContent[];
  template: string;
  sections: string[];
}

/**
 * Build prompt for battle card generation
 */
function buildBattleCardPrompt(input: GenerateBattleCardInput): string {
  const competitorInfo = input.competitors.map((c, i) => `
Competitor ${i + 1}: ${c.name}
- Description: ${c.description}
- Features: ${c.features.join(', ')}
- Pricing: ${JSON.stringify(c.pricing)}
- Strengths: ${c.strengths.join(', ')}
- Weaknesses: ${c.weaknesses.join(', ')}
- Target Market: ${c.targetMarket}
`).join('\n');

  const documentInfo = input.documents.map(d => `
Document: ${d.name}
Summary: ${d.summary}
`).join('\n');

  const sectionsToGenerate = input.sections.join(', ');

  return `You are an expert sales enablement consultant creating a competitive battle card for Tuskira, a cybersecurity company.

CONTEXT:
Use Case: ${input.useCase.toUpperCase()}
Template Style: ${input.template}

COMPETITORS ANALYZED:
${competitorInfo}

SUPPORTING DOCUMENTS:
${documentInfo}

TASK:
Create a comprehensive battle card that helps Tuskira's sales team compete effectively. Include the following sections: ${sectionsToGenerate}

IMPORTANT GUIDELINES:
1. Be specific and actionable
2. Focus on differentiators that matter to customers
3. Provide concrete examples and data points
4. Anticipate objections and provide strong responses
5. Keep language professional but conversational
6. Highlight Tuskira's unique value proposition

Respond with a valid JSON object with this structure:
{
  "title": "Battle Card: Tuskira vs [Competitors]",
  "overview": "Executive overview paragraph (3-4 sentences)",
  "differentiators": ["Key differentiator 1", "Key differentiator 2", ...],
  "strengths": ["Tuskira strength 1 with specific example", "Tuskira strength 2 with specific example", ...],
  "weaknesses": ["Competitor weakness 1 with impact", "Competitor weakness 2 with impact", ...],
  "pricing": "Detailed pricing comparison and positioning (2-3 paragraphs)",
  "objections": [
    {
      "objection": "Common objection from prospects",
      "response": "Strong, evidence-based response"
    }
  ],
  "questions": ["Discovery question 1", "Discovery question 2", ...],
  "testimonials": [
    {
      "company": "Company name",
      "quote": "Realistic customer testimonial"
    }
  ]
}

Respond ONLY with valid JSON, no additional text or markdown formatting.`;
}

/**
 * Generate battle card using Amazon Bedrock (Claude Sonnet)
 */
async function generateWithBedrock(input: GenerateBattleCardInput): Promise<any> {
  const prompt = buildBattleCardPrompt(input);

  try {
    const bedrockInput = {
      modelId: "anthropic.claude-3-sonnet-20240229-v1:0", // Using Sonnet for better quality
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 4000,
        temperature: 0.7,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    };

    const command = new InvokeModelCommand(bedrockInput);
    const response = await bedrockClient.send(command);
    
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    const contentText = responseBody.content[0].text;
    
    // Parse JSON response
    // Remove any markdown code blocks if present
    const cleanedText = contentText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const battleCard = JSON.parse(cleanedText);
    
    return {
      id: `battlecard-${Date.now()}`,
      ...battleCard,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error generating with Bedrock:', error);
    throw new Error('Failed to generate battle card with AI');
  }
}

/**
 * Lambda handler
 */
export const handler = async (event: any) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  try {
    const body = JSON.parse(event.body || '{}');
    const input: GenerateBattleCardInput = body;
    
    // Validate input
    if (!input.competitors || input.competitors.length === 0) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'At least one competitor is required' }),
      };
    }

    if (!input.useCase) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Use case is required' }),
      };
    }
    
    // Generate battle card with Bedrock
    const battleCard = await generateWithBedrock(input);
    
    // Store in DynamoDB
    const userId = event.requestContext?.authorizer?.claims?.sub || 'anonymous';
    await docClient.send(new PutCommand({
      TableName: process.env.BATTLECARDS_TABLE,
      Item: {
        ...battleCard,
        userId,
        competitors: input.competitors.map(c => c.name),
        useCase: input.useCase,
        template: input.template,
        createdAt: new Date().toISOString(),
      },
    }));
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(battleCard),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
