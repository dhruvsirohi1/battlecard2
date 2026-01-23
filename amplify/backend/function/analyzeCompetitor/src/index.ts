/**
 * AWS Lambda Function: Analyze Competitor
 * 
 * This function scrapes a competitor's website and extracts key information
 * using Amazon Bedrock for AI-powered analysis
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import axios from 'axios';
import * as cheerio from 'cheerio';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION });

interface CompetitorData {
  url: string;
  html: string;
  text: string;
}

/**
 * Fetch and parse competitor website
 */
async function fetchCompetitorWebsite(url: string): Promise<CompetitorData> {
  try {
    // Add timeout and headers to mimic browser
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    const $ = cheerio.load(response.data);
    
    // Remove script and style elements
    $('script, style, nav, footer, header').remove();
    
    // Extract main text content
    const text = $('body').text().replace(/\s+/g, ' ').trim();
    
    // Extract key sections
    const title = $('title').text();
    const metaDescription = $('meta[name="description"]').attr('content') || '';
    const h1Tags = $('h1').map((_, el) => $(el).text()).get();
    const h2Tags = $('h2').map((_, el) => $(el).text()).get();
    
    return {
      url,
      html: response.data,
      text: `Title: ${title}\nDescription: ${metaDescription}\n\nHeadings: ${[...h1Tags, ...h2Tags].join(', ')}\n\nContent: ${text.substring(0, 5000)}`,
    };
  } catch (error) {
    console.error('Error fetching website:', error);
    throw new Error(`Failed to fetch competitor website: ${url}`);
  }
}

/**
 * Analyze competitor using Amazon Bedrock (Claude)
 */
async function analyzeWithBedrock(competitorData: CompetitorData): Promise<any> {
  const prompt = `Analyze this competitor's website and provide a structured analysis.

Website URL: ${competitorData.url}

Website Content:
${competitorData.text}

Please provide a JSON response with the following structure:
{
  "name": "Company Name",
  "description": "Brief 2-3 sentence description of the company",
  "features": ["Feature 1", "Feature 2", "Feature 3"],
  "pricing": {
    "model": "Pricing model (e.g., Subscription, Usage-based, Enterprise)",
    "tiers": ["Tier 1", "Tier 2", "Tier 3"]
  },
  "strengths": ["Strength 1", "Strength 2", "Strength 3"],
  "weaknesses": ["Weakness 1", "Weakness 2", "Weakness 3"],
  "targetMarket": "Description of their target market"
}

Respond ONLY with valid JSON, no additional text.`;

  try {
    const input = {
      modelId: "anthropic.claude-3-haiku-20240307-v1:0", // Using Haiku for speed and cost
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 2000,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    };

    const command = new InvokeModelCommand(input);
    const response = await bedrockClient.send(command);
    
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    const analysisText = responseBody.content[0].text;
    
    // Parse the JSON response
    const analysis = JSON.parse(analysisText);
    
    return {
      url: competitorData.url,
      ...analysis,
      analyzedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error analyzing with Bedrock:', error);
    throw new Error('Failed to analyze competitor with AI');
  }
}

/**
 * Lambda handler
 */
export const handler = async (event: any) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  try {
    const body = JSON.parse(event.body || '{}');
    const { url } = body;
    
    if (!url) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'URL is required' }),
      };
    }
    
    // Validate URL
    try {
      new URL(url);
    } catch {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Invalid URL' }),
      };
    }
    
    // Fetch competitor website
    const competitorData = await fetchCompetitorWebsite(url);
    
    // Analyze with Bedrock
    const analysis = await analyzeWithBedrock(competitorData);
    
    // Store in DynamoDB
    await docClient.send(new PutCommand({
      TableName: process.env.COMPETITORS_TABLE,
      Item: {
        id: `competitor-${Date.now()}`,
        url,
        ...analysis,
        createdAt: new Date().toISOString(),
      },
    }));
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(analysis),
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
