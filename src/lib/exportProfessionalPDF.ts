import { jsPDF } from 'jspdf';
import type { BattleCardData } from '@/types/battlecard';

export const exportProfessionalPDF = (battleCard: BattleCardData) => {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = 20;

  // Title
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text(battleCard.title, margin, yPos);
  yPos += 10;

  // Draw comparison table
  const colWidth = (pageWidth - 2 * margin) / 2;
  const leftColX = margin;
  const rightColX = margin + colWidth;

  // Helper to draw table row
  const drawRow = (category: string, tuskiraContent: string, competitorContent: string, isHeader = false) => {
    if (yPos > pageHeight - 40) {
      pdf.addPage();
      yPos = 20;
    }

    const rowHeight = Math.max(
      pdf.splitTextToSize(tuskiraContent, colWidth - 10).length * 5,
      pdf.splitTextToSize(competitorContent, colWidth - 10).length * 5,
      15
    );

    // Draw row background
    if (isHeader) {
      pdf.setFillColor(220, 220, 220);
      pdf.rect(leftColX, yPos - 5, pageWidth - 2 * margin, rowHeight + 5, 'F');
    }

    // Draw borders
    pdf.setDrawColor(200, 200, 200);
    pdf.rect(leftColX, yPos - 5, colWidth, rowHeight + 5);
    pdf.rect(rightColX, yPos - 5, colWidth, rowHeight + 5);

    // Category label (left aligned in first column)
    if (category) {
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text(category, leftColX + 3, yPos);
    }

    // Content
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    
    const tuskiraLines = pdf.splitTextToSize(tuskiraContent, colWidth - 10);
    const competitorLines = pdf.splitTextToSize(competitorContent, colWidth - 10);

    let contentY = category ? yPos + 5 : yPos;
    
    tuskiraLines.forEach((line: string, i: number) => {
      pdf.text(line, leftColX + 3, contentY + i * 5);
    });

    competitorLines.forEach((line: string, i: number) => {
      pdf.text(line, rightColX + 3, contentY + i * 5);
    });

    yPos += rowHeight + 5;
  };

  // Header row
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Tuskira', leftColX + 3, yPos);
  pdf.text('Competitor', rightColX + 3, yPos);
  yPos += 7;

  // Draw horizontal line under header
  pdf.setDrawColor(0, 0, 0);
  pdf.line(leftColX, yPos - 2, pageWidth - margin, yPos - 2);
  yPos += 3;

  // Comparison rows
  const competitorName = battleCard.competitor || 'Competitor';

  drawRow(
    'Positioning',
    'AI-Native Security Operations Platform for Continuous Threat Exposure Management',
    `${competitorName}'s market positioning based on their public materials`,
    false
  );

  drawRow(
    'Key Strengths',
    battleCard.strengths.slice(0, 3).join('\n\n'),
    battleCard.weaknesses.slice(0, 3).join('\n\n'),
    false
  );

  drawRow(
    'Approach',
    battleCard.differentiators.slice(0, 3).join('\n\n'),
    `Traditional approach with ${battleCard.weaknesses[0] || 'legacy methods'}`,
    false
  );

  drawRow(
    'Deployment',
    'Cloud-native, agentless, API-first. Deploys in days with 150+ integrations.',
    'Varies by implementation. May require on-premise components.',
    false
  );

  // Key Differentiators section
  yPos += 10;
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Key Differentiators', margin, yPos);
  yPos += 7;

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  battleCard.differentiators.forEach((diff: string) => {
    if (yPos > pageHeight - 30) {
      pdf.addPage();
      yPos = 20;
    }
    const lines = pdf.splitTextToSize(`✓ ${diff}`, pageWidth - 2 * margin);
    lines.forEach((line: string) => {
      pdf.text(line, margin + 5, yPos);
      yPos += 5;
    });
    yPos += 2;
  });

  // Why Tuskira section
  yPos += 10;
  if (yPos > pageHeight - 50) {
    pdf.addPage();
    yPos = 20;
  }

  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`Why Tuskira > ${competitorName}`, margin, yPos);
  yPos += 10;

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  
  // Add overview
  const overviewLines = pdf.splitTextToSize(battleCard.overview, pageWidth - 2 * margin);
  overviewLines.forEach((line: string) => {
    if (yPos > pageHeight - 20) {
      pdf.addPage();
      yPos = 20;
    }
    pdf.text(line, margin, yPos);
    yPos += 5;
  });

  yPos += 5;

  // Add objection handling as numbered points
  battleCard.objections.slice(0, 3).forEach((obj: any, index: number) => {
    if (yPos > pageHeight - 30) {
      pdf.addPage();
      yPos = 20;
    }

    pdf.setFont('helvetica', 'bold');
    pdf.text(`${index + 1}. ${obj.objection}`, margin, yPos);
    yPos += 6;

    pdf.setFont('helvetica', 'normal');
    const responseLines = pdf.splitTextToSize(obj.response, pageWidth - 2 * margin - 5);
    responseLines.forEach((line: string) => {
      if (yPos > pageHeight - 20) {
        pdf.addPage();
        yPos = 20;
      }
      pdf.text(line, margin + 5, yPos);
      yPos += 5;
    });
    yPos += 3;
  });

  // Footer on all pages
  const pageCount = pdf.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(128, 128, 128);
    pdf.text('Tuskira Battle Card - Confidential', margin, pageHeight - 10);
    pdf.text(`Page ${i} of ${pageCount}`, pageWidth - margin - 20, pageHeight - 10);
  }

  // Save
  const fileName = `${battleCard.title.replace(/[^a-z0-9]/gi, '_')}.pdf`;
  pdf.save(fileName);
};
