/**
 * Tuskira Battle Card Lambda
 *
 * Pipeline:
 *   1. fetchDriveDocuments()   — Pull relevant docs from Google Drive (Secrets Manager auth)
 *   2. researchCompetitor()    — Web scrape competitor via Bedrock web_search
 *   3. generateBattleCard()    — Generate battle card from scraped + Drive data only
 */

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  ConverseCommand
} from "@aws-sdk/client-bedrock-runtime";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import {
  SecretsManagerClient,
  GetSecretValueCommand
} from "@aws-sdk/client-secrets-manager";

const bedrockClient  = new BedrockRuntimeClient({ region: "us-east-2" });
const dynamoClient   = new DynamoDBClient({ region: "us-east-2" });
const docClient      = DynamoDBDocumentClient.from(dynamoClient);
const secretsClient  = new SecretsManagerClient({ region: "us-east-2" });

const BATTLECARDS_TABLE   = "TuskiraBattleCards";
const CACHE_DURATION_DAYS = 7;

// ─── Set these via Lambda environment variables ───────────────────────────────
// DRIVE_FOLDER_ID         : root Drive folder ID (fallback)
// BATTLECARDS_FOLDER_ID   : folder ID for saving exported PDFs ("BattleCards" subfolder)
// CTEM_FOLDER_ID          : folder ID for CTEM use-case documents ("ctem" subfolder)
// AISOC_FOLDER_ID         : folder ID for AI-SOC use-case documents ("aisoc" subfolder)
// GOOGLE_SECRET_NAME      : Secrets Manager secret name holding the service account JSON
const DRIVE_FOLDER_ID        = process.env.DRIVE_FOLDER_ID        || "YOUR_FOLDER_ID_HERE";
const BATTLECARDS_FOLDER_ID  = process.env.BATTLECARDS_FOLDER_ID  || DRIVE_FOLDER_ID;
const CTEM_FOLDER_ID         = process.env.CTEM_FOLDER_ID         || DRIVE_FOLDER_ID;
const AISOC_FOLDER_ID        = process.env.AISOC_FOLDER_ID        || DRIVE_FOLDER_ID;
const GOOGLE_SECRET_NAME     = process.env.GOOGLE_SECRET_NAME     || "tuskira/google-service-account";

function getUseCaseFolderId(useCase) {
  if (useCase === "ctem")   return CTEM_FOLDER_ID;
  if (useCase === "ai-soc") return AISOC_FOLDER_ID;
  return DRIVE_FOLDER_ID;
}

// Max characters to send per document (keeps context window manageable)
const MAX_DOC_CHARS = 8000;


// ══════════════════════════════════════════════════════════════════════════════
// AUTH — Get Google OAuth2 access token via service account JWT
// (No googleapis SDK needed — keeps the Lambda bundle small)
// ══════════════════════════════════════════════════════════════════════════════
async function getGoogleAccessToken() {
  const secretResponse = await secretsClient.send(
    new GetSecretValueCommand({ SecretId: GOOGLE_SECRET_NAME })
  );
  const credentials = JSON.parse(secretResponse.SecretString);

  const now     = Math.floor(Date.now() / 1000);
  const header  = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss:   credentials.client_email,
    scope: "https://www.googleapis.com/auth/drive",
    aud:   "https://oauth2.googleapis.com/token",
    exp:   now + 3600,
    iat:   now
  };

  const encode = obj => Buffer.from(JSON.stringify(obj)).toString("base64url");
  const signingInput = `${encode(header)}.${encode(payload)}`;

  const { createSign } = await import("node:crypto");
  const signer = createSign("RSA-SHA256");
  signer.update(signingInput);
  const signature = signer.sign(credentials.private_key).toString("base64url");

  const jwt = `${signingInput}.${signature}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion:  jwt
    })
  });

  if (!tokenRes.ok) throw new Error(`Google token exchange failed: ${await tokenRes.text()}`);
  return (await tokenRes.json()).access_token;
}


// ══════════════════════════════════════════════════════════════════════════════
// STEP 1a — List files in Drive folder, filtered by competitor name
// ══════════════════════════════════════════════════════════════════════════════
async function listDriveFiles(accessToken, competitorName, folderId = DRIVE_FOLDER_ID) {
  const nameFilter = competitorName
    ? ` and name contains '${competitorName.replace(/'/g, "\\'")}'`
    : "";
  const query  = encodeURIComponent(`'${folderId}' in parents and trashed = false${nameFilter}`);
  const fields = encodeURIComponent("files(id,name,mimeType,modifiedTime)");

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&pageSize=20`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) throw new Error(`Drive list failed: ${await res.text()}`);
  return (await res.json()).files || [];
}


// ══════════════════════════════════════════════════════════════════════════════
// STEP 1b — Extract text from a single Drive file
// Supports: Google Docs/Sheets/Slides (export), PDFs, DOCX, plain text
// ══════════════════════════════════════════════════════════════════════════════
async function extractFileText(accessToken, file) {
  const { id, name, mimeType } = file;

  try {
    let content = "";

    if (mimeType === "application/vnd.google-apps.document" ||
        mimeType === "application/vnd.google-apps.presentation") {
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${id}/export?mimeType=text/plain`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      content = await res.text();

    } else if (mimeType === "application/vnd.google-apps.spreadsheet") {
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${id}/export?mimeType=text/csv`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      content = await res.text();

    } else if (mimeType === "application/pdf") {
      const res         = await fetch(
        `https://www.googleapis.com/drive/v3/files/${id}?alt=media`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const base64 = Buffer.from(await res.arrayBuffer()).toString("base64");
      content      = await extractBinaryWithBedrock(base64, "application/pdf", name);

    } else if (mimeType.includes("wordprocessingml") || mimeType === "application/msword") {
      const res         = await fetch(
        `https://www.googleapis.com/drive/v3/files/${id}?alt=media`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const base64 = Buffer.from(await res.arrayBuffer()).toString("base64");
      content      = await extractBinaryWithBedrock(
        base64,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        name
      );

    } else if (mimeType.startsWith("text/")) {
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${id}?alt=media`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      content = await res.text();

    } else {
      console.log(`Skipping unsupported type: ${mimeType} — ${name}`);
      return null;
    }

    return { name, mimeType, content: content.slice(0, MAX_DOC_CHARS) };

  } catch (err) {
    console.error(`Failed to extract "${name}":`, err.message);
    return null;
  }
}


// ══════════════════════════════════════════════════════════════════════════════
// STEP 1c — Use Claude on Bedrock to extract text from binary files (PDF/DOCX)
// ══════════════════════════════════════════════════════════════════════════════
async function extractBinaryWithBedrock(base64Data, mediaType, filename) {
  const response = await bedrockClient.send(
    new InvokeModelCommand({
      modelId:     "us.anthropic.claude-3-5-haiku-20241022-v1:0",
      contentType: "application/json",
      accept:      "application/json",
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 2000,
        messages: [{
          role: "user",
          content: [
            {
              type: "document",
              source: { type: "base64", media_type: mediaType, data: base64Data }
            },
            {
              type: "text",
              text: `Extract all meaningful text from "${filename}". Return raw content only — no summaries, no commentary.`
            }
          ]
        }]
      })
    })
  );

  const body = JSON.parse(new TextDecoder().decode(response.body));
  return body.content[0].text;
}


// ══════════════════════════════════════════════════════════════════════════════
// STEP 1 (orchestrator) — Fetch all relevant Drive docs for a competitor
// ══════════════════════════════════════════════════════════════════════════════
async function fetchDriveDocuments(competitorName, useCase) {
  const folderId = getUseCaseFolderId(useCase);
  console.log(`Fetching Drive documents for: ${competitorName} — folder: ${folderId} (${useCase})`);
  const accessToken = await getGoogleAccessToken();

  let files = await listDriveFiles(accessToken, competitorName, folderId);
  if (files.length === 0) {
    console.log("No competitor-specific files found — fetching all files in use-case folder");
    files = await listDriveFiles(accessToken, null, folderId);
  }
  console.log(`Found ${files.length} Drive files`);

  const results = await Promise.all(files.slice(0, 10).map(f => extractFileText(accessToken, f)));
  const docs    = results.filter(Boolean);

  console.log(`Extracted text from ${docs.length} documents`);
  return docs;
}


// ══════════════════════════════════════════════════════════════════════════════
// UPLOAD — Generic helper to upload any file to a Drive folder
// ══════════════════════════════════════════════════════════════════════════════
async function uploadFileToDrive(accessToken, fileBase64, fileName, mimeType, folderId) {
  const boundary = "boundary_" + Date.now();
  const metadata = JSON.stringify({ name: fileName, mimeType, parents: [folderId] });
  const fileBytes = Buffer.from(fileBase64, "base64");
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`),
    fileBytes,
    Buffer.from(`\r\n--${boundary}--`),
  ]);

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary="${boundary}"`,
      },
      body,
    }
  );

  if (!res.ok) throw new Error(`Drive upload failed: ${await res.text()}`);
  return await res.json();
}

async function uploadPDFToDrive(accessToken, pdfBase64, filename) {
  return uploadFileToDrive(accessToken, pdfBase64, filename, "application/pdf", BATTLECARDS_FOLDER_ID);
}


// ══════════════════════════════════════════════════════════════════════════════
// STEP 2 — Research competitor via Bedrock web_search
// ══════════════════════════════════════════════════════════════════════════════
async function researchCompetitor(competitorName) {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`[WEB SCRAPE] START — competitor: "${competitorName}"`);
  console.log(`[WEB SCRAPE] Timestamp: ${new Date().toISOString()}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const totalStart = Date.now();

  const toolConfig = {
    tools: [{
      toolSpec: {
        name: "web_search",
        description: "Search the web for up-to-date information",
        inputSchema: {
          json: {
            type: "object",
            properties: { query: { type: "string" } },
            required: ["query"]
          }
        }
      }
    }]
  };

  const messages = [{
    role: "user",
    content: [{
      text: `You are a competitive intelligence analyst. Research the cybersecurity company "${competitorName}" using web search.

Search for: official website, products/features, pricing, stated strengths, known weaknesses (G2, Gartner reviews), recent news.

IMPORTANT: Only use information found via web search. Do not hallucinate.

Return ONLY valid JSON (no markdown):
{
  "name": "${competitorName}",
  "officialWebsite": "...",
  "description": "...",
  "productsAndFeatures": ["...", ...],
  "pricingModel": "...",
  "statedStrengths": ["...", ...],
  "knownWeaknesses": ["...", ...],
  "targetMarket": "...",
  "recentNews": ["...", ...],
  "sources": ["url1", ...]
}`
    }]
  }];

  let finalTextBlock = null;
  let turnCount      = 0;
  const MAX_TURNS    = 10;

  while (turnCount < MAX_TURNS) {
    turnCount++;
    console.log(`[WEB SCRAPE] Turn ${turnCount} — calling Bedrock...`);
    const turnStart = Date.now();

    const response = await bedrockClient.send(
      new ConverseCommand({
        modelId:    "us.anthropic.claude-3-5-haiku-20241022-v1:0",
        toolConfig,
        messages,
        inferenceConfig: { maxTokens: 3000, temperature: 0.2 }
      })
    );

    const turnMs     = Date.now() - turnStart;
    const stopReason = response.stopReason;
    const content    = response.output?.message?.content || [];

    console.log(`[WEB SCRAPE] Turn ${turnCount} complete in ${turnMs}ms — stopReason: "${stopReason}" — ${content.length} block(s)`);

    content.forEach((block, i) => {
      if (block.toolUse) {
        console.log(`  [Block ${i + 1}] TYPE: tool_use  |  tool: ${block.toolUse.name}  |  query: ${JSON.stringify(block.toolUse.input)}`);
      } else if (block.text) {
        console.log(`  [Block ${i + 1}] TYPE: text  |  length: ${block.text.length} chars  |  preview: ${block.text.slice(0, 150)}...`);
      } else {
        console.log(`  [Block ${i + 1}] TYPE: unknown —`, JSON.stringify(block).slice(0, 100));
      }
    });

    messages.push({ role: "assistant", content });

    if (stopReason === "end_turn") {
      finalTextBlock = content.find(b => b.text);
      break;
    }

    if (stopReason === "tool_use") {
      const toolUseBlocks = content.filter(b => b.toolUse);
      const toolResults   = [];

      for (const block of toolUseBlocks) {
        const { toolUseId, input } = block.toolUse;
        console.log(`[WEB SCRAPE] Executing tool "web_search" — query: "${input.query}"`);
        toolResults.push({
          toolUseId,
          content: [{ text: `Search executed for: ${input.query}` }]
        });
      }

      messages.push({
        role:    "user",
        content: toolResults.map(r => ({ toolResult: r }))
      });

      continue;
    }

    console.warn(`[WEB SCRAPE] Unexpected stopReason: "${stopReason}" — attempting to extract text anyway`);
    finalTextBlock = content.find(b => b.text);
    break;
  }

  if (turnCount >= MAX_TURNS) {
    console.warn(`[WEB SCRAPE] Hit MAX_TURNS (${MAX_TURNS}) — forcing exit`);
  }

  if (!finalTextBlock?.text) throw new Error("No text from research step after agentic loop");

  let parsed;
  try {
    const cleanJson = finalTextBlock.text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    parsed = JSON.parse(cleanJson);
  } catch (parseErr) {
    console.error("[WEB SCRAPE] ERROR: Failed to parse JSON:", parseErr.message);
    console.error("[WEB SCRAPE] Raw text:", finalTextBlock.text.slice(0, 500));
    throw parseErr;
  }

  const totalMs = Date.now() - totalStart;
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`[WEB SCRAPE] COMPLETE — ${turnCount} turn(s), total time: ${totalMs}ms`);
  console.log(`  Competitor:    ${parsed.name}`);
  console.log(`  Website:       ${parsed.officialWebsite || "N/A"}`);
  console.log(`  Products:      (${(parsed.productsAndFeatures || []).length})`);
  console.log(`  Strengths:     (${(parsed.statedStrengths || []).length})`);
  console.log(`  Weaknesses:    (${(parsed.knownWeaknesses || []).length})`);
  console.log(`  Sources:       (${(parsed.sources || []).length} URLs)`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  return parsed;
}


// ══════════════════════════════════════════════════════════════════════════════
// STEP 3 — Generate battle card from web research + Drive documents
// ══════════════════════════════════════════════════════════════════════════════
async function generateBattleCard(scrapedData, driveDocuments, useCase) {
  const competitorName = scrapedData.name;
  const useCaseDesc    = useCase === "ctem"
    ? "Continuous Threat Exposure Management (CTEM) — proactive risk identification and automated remediation"
    : "AI-Powered Security Operations (SOC) — intelligent alert triage and automated incident response";

  const competitorContext = `
Competitor:            ${scrapedData.name}
Website:               ${scrapedData.officialWebsite || "N/A"}
Description:           ${scrapedData.description || "N/A"}
Products & Features:   ${(scrapedData.productsAndFeatures || []).join(", ") || "N/A"}
Pricing:               ${scrapedData.pricingModel || "Not publicly available"}
Stated Strengths:      ${(scrapedData.statedStrengths || []).join(", ") || "N/A"}
Known Weaknesses:      ${(scrapedData.knownWeaknesses || []).join(", ") || "N/A"}
Target Market:         ${scrapedData.targetMarket || "N/A"}
Recent News:           ${(scrapedData.recentNews || []).join(", ") || "N/A"}
  `.trim();

  const driveContext = driveDocuments.length > 0
    ? driveDocuments.map((d, i) =>
        `--- Doc ${i + 1}: ${d.name} ---\n${d.content}`
      ).join("\n\n")
    : "No internal documents available.";

  const prompt = `You are a sales enablement expert creating a competitive battle card for Tuskira.

**TUSKIRA:**
AI-native security platform specializing in ${useCaseDesc}.
Core capabilities: AI analysts that simulate/validate/act autonomously, live digital twin, posture-aware decisions, agentless cloud-native deployment, 95% false-positive reduction.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SOURCE 1 — WEB RESEARCH: ${competitorName.toUpperCase()}
(Use ONLY for competitor claims)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${competitorContext}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SOURCE 2 — INTERNAL TUSKIRA DOCS (Google Drive)
(Prioritize for Tuskira claims, proof points, case studies, pricing)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${driveContext}

RULES:
- Every ${competitorName} claim → must come from Source 1
- Every Tuskira claim → prioritize Source 2, then Tuskira capabilities above
- Do NOT invent features, metrics, or customers not in the sources
- Label every strength/weakness with either "Tuskira:" or "${competitorName}:"
- If data is unavailable, say "data unavailable" rather than fabricating

Return ONLY valid JSON (no markdown):
{
  "title": "...",
  "overview": "...",
  "differentiators": ["...", ...],
  "strengths": ["Tuskira: ...", ...],
  "weaknesses": ["${competitorName}: ...", ...],
  "pricing": "...",
  "objections": [{"objection": "...", "response": "..."}, ...],
  "questions": ["...", ...],
  "testimonials": [{"company": "...", "quote": "..."}]
}`;

  const response = await bedrockClient.send(
    new InvokeModelCommand({
      modelId:     "us.anthropic.claude-3-5-haiku-20241022-v1:0",
      contentType: "application/json",
      accept:      "application/json",
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 4000,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4
      })
    })
  );

  const body = JSON.parse(new TextDecoder().decode(response.body));
  return JSON.parse(
    body.content[0].text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
  );
}


// ══════════════════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ══════════════════════════════════════════════════════════════════════════════
export const handler = async (event) => {
  console.log("Received event");

  try {
    let body = {};
    if (event.body) {
      body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    }

    // ─── PDF UPLOAD ACTION ────────────────────────────────────────────────────
    if (body.action === "upload-pdf") {
      const { pdfBase64, filename } = body;
      console.log(`[upload-pdf] filename=${filename}, pdfBase64 type=${typeof pdfBase64}, length=${pdfBase64?.length ?? 'null/undefined'}`);
      if (!pdfBase64) return respond(400, { error: "pdfBase64 is missing or null" });
      const accessToken = await getGoogleAccessToken();
      const result = await uploadPDFToDrive(accessToken, pdfBase64, filename);
      return respond(200, result);
    }

    // ─── DOCUMENT UPLOAD ACTION ───────────────────────────────────────────────
    if (body.action === "upload-doc") {
      const { fileBase64, fileName, mimeType, useCase = "ctem" } = body;
      console.log(`[upload-doc] fileName=${fileName}, mimeType=${mimeType}, fileBase64 type=${typeof fileBase64}, length=${fileBase64?.length ?? 'null/undefined'}`);
      if (!fileBase64) return respond(400, { error: "fileBase64 is missing or null" });
      const accessToken = await getGoogleAccessToken();
      const folderId = getUseCaseFolderId(useCase);
      const result = await uploadFileToDrive(accessToken, fileBase64, fileName, mimeType, folderId);
      return respond(200, result);
    }

    // ─── BATTLE CARD GENERATION ───────────────────────────────────────────────
    const { competitors = [], useCase = "ctem", forceRegenerate = false } = body;
    const competitor     = competitors[0] || { name: "Competitor" };
    const competitorName = competitor.name;

    // ─── CACHE CHECK ──────────────────────────────────────────────────────────
    if (!forceRegenerate) {
      try {
        const queryResult = await docClient.send(
          new QueryCommand({
            TableName: BATTLECARDS_TABLE,
            KeyConditionExpression: "competitorName = :name",
            ExpressionAttributeValues: { ":name": competitorName.toLowerCase() },
            ScanIndexForward: false,
            Limit: 1
          })
        );
        if (queryResult.Items?.length > 0) {
          const card    = queryResult.Items[0];
          const daysOld = (Date.now() - new Date(card.generatedAt).getTime()) / 86400000;
          if (daysOld < CACHE_DURATION_DAYS) {
            return respond(200, { ...card, fromCache: true, cacheAge: `${daysOld.toFixed(1)} days` });
          }
        }
      } catch (e) {
        console.log("Cache check failed:", e.message);
      }
    }

    // ─── STEP 1: GOOGLE DRIVE ─────────────────────────────────────────────────
    let driveDocuments = [];
    try {
      driveDocuments = await fetchDriveDocuments(competitorName, useCase);
    } catch (e) {
      console.error("Drive fetch failed (non-fatal):", e.message);
    }

    // ─── STEP 2: WEB RESEARCH ─────────────────────────────────────────────────
    let scrapedData;
    const step2Start = Date.now();
    try {
      scrapedData = await researchCompetitor(competitorName);
      console.log(`[HANDLER] Step 2 (web research) completed in ${Date.now() - step2Start}ms`);
    } catch (e) {
      console.error(`[HANDLER] Step 2 (web research) FAILED after ${Date.now() - step2Start}ms:`, e.message);
      scrapedData = {
        name: competitorName,
        officialWebsite: competitor.website || "N/A",
        description: competitor.description || "N/A",
        productsAndFeatures: competitor.features || [],
        pricingModel: competitor.pricing?.model || "Not publicly available",
        statedStrengths: competitor.strengths || [],
        knownWeaknesses: competitor.weaknesses || [],
        targetMarket: "N/A",
        recentNews: [],
        sources: []
      };
    }

    // ─── STEP 3: GENERATE ─────────────────────────────────────────────────────
    console.log(`Generating battle card — ${driveDocuments.length} Drive docs, web research ready`);
    const battleCard = await generateBattleCard(scrapedData, driveDocuments, useCase);

    const timestamp        = new Date().toISOString();
    battleCard.id          = `battlecard-${Date.now()}`;
    battleCard.generatedAt = timestamp;
    battleCard.competitor  = competitorName;
    battleCard.useCase     = useCase;
    battleCard.fromCache   = false;
    battleCard.sources     = {
      webResearch:    scrapedData.sources || [],
      driveDocuments: driveDocuments.map(d => d.name)
    };

    // ─── SAVE TO DYNAMODB ──────────────────────────────────────────────────────
    try {
      await docClient.send(
        new PutCommand({
          TableName: BATTLECARDS_TABLE,
          Item: {
            competitorName:     competitorName.toLowerCase(),
            generatedAt:        timestamp,
            scrapedData,
            driveDocumentNames: driveDocuments.map(d => d.name),
            ...battleCard
          }
        })
      );
    } catch (e) {
      console.error("DynamoDB save failed (non-fatal):", e.message);
    }

    return respond(200, battleCard);

  } catch (error) {
    console.error("Handler error:", error);
    return respond(500, { error: error.message, stack: error.stack });
  }
};

const respond = (statusCode, body) => ({
  statusCode,
  headers: {
    "Content-Type":                 "application/json",
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Methods": "*"
  },
  body: JSON.stringify(body)
});
