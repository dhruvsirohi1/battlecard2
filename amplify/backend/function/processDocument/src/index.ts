/**
 * AWS Lambda Function: Process Document
 * 
 * This function processes uploaded documents (PDF, DOCX, PPTX) from S3
 * and extracts text content using Amazon Textract or libraries
 */

import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { TextractClient, DetectDocumentTextCommand } from "@aws-sdk/client-textract";
import { Readable } from 'stream';

const s3Client = new S3Client({});
const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION });
const textractClient = new TextractClient({ region: process.env.AWS_REGION });

/**
 * Convert stream to buffer
 */
async function streamToBuffer(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

/**
 * Get file from S3
 */
async function getFileFromS3(key: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: process.env.STORAGE_BUCKET,
    Key: key,
  });

  const response = await s3Client.send(command);
  return streamToBuffer(response.Body as Readable);
}

/**
 * Extract text from PDF using Amazon Textract
 */
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const command = new DetectDocumentTextCommand({
      Document: {
        Bytes: buffer,
      },
    });

    const response = await textractClient.send(command);
    
    // Combine all detected text
    const text = response.Blocks
      ?.filter(block => block.BlockType === 'LINE')
      .map(block => block.Text)
      .join('\n') || '';
    
    return text;
  } catch (error) {
    console.error('Error with Textract:', error);
    // Fallback to simple text extraction (you'd use pdf-parse here)
    return 'Unable to extract text from PDF';
  }
}

/**
 * Extract text from DOCX
 */
async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  // In production, use mammoth.js
  // For now, return placeholder
  return 'Document text extraction from DOCX - implement with mammoth library';
}

/**
 * Extract text from PPTX
 */
async function extractTextFromPPTX(buffer: Buffer): Promise<string> {
  // In production, use a PPTX parsing library
  return 'Presentation text extraction from PPTX - implement with pptx library';
}

/**
 * Summarize document using Amazon Bedrock
 */
async function summarizeDocument(text: string, fileName: string): Promise<string> {
  const prompt = `Summarize the following document "${fileName}" in 3-5 concise bullet points. Focus on key facts, features, and competitive information relevant to a sales battle card.

Document content:
${text.substring(0, 10000)}

Provide a concise summary in bullet points:`;

  try {
    const input = {
      modelId: "anthropic.claude-3-haiku-20240307-v1:0",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 500,
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
    return responseBody.content[0].text;
  } catch (error) {
    console.error('Error summarizing with Bedrock:', error);
    return 'Summary unavailable';
  }
}

/**
 * Lambda handler
 */
export const handler = async (event: any) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  try {
    const body = JSON.parse(event.body || '{}');
    const { documentKey } = body;
    
    if (!documentKey) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Document key is required' }),
      };
    }
    
    // Get file from S3
    const fileBuffer = await getFileFromS3(documentKey);
    
    // Determine file type and extract text
    let extractedText = '';
    const fileType = documentKey.split('.').pop()?.toLowerCase();
    const fileName = documentKey.split('/').pop() || 'document';
    
    switch (fileType) {
      case 'pdf':
        extractedText = await extractTextFromPDF(fileBuffer);
        break;
      case 'docx':
        extractedText = await extractTextFromDOCX(fileBuffer);
        break;
      case 'pptx':
        extractedText = await extractTextFromPPTX(fileBuffer);
        break;
      default:
        throw new Error('Unsupported file type');
    }
    
    // Summarize with Bedrock
    const summary = await summarizeDocument(extractedText, fileName);
    
    // Store in DynamoDB
    const documentId = `doc-${Date.now()}`;
    await docClient.send(new PutCommand({
      TableName: process.env.DOCUMENTS_TABLE,
      Item: {
        id: documentId,
        name: fileName,
        type: fileType,
        s3Key: documentKey,
        extractedText,
        summary,
        createdAt: new Date().toISOString(),
      },
    }));
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        id: documentId,
        name: fileName,
        type: fileType,
        extractedText: extractedText.substring(0, 1000), // First 1000 chars
        summary,
      }),
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
