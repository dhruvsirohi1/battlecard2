import { jsPDF } from 'jspdf';
import type { BattleCardData } from '@/types/battlecard';

/** Optional data URL for the header logo (e.g. from fetch + readAsDataURL). */
export const exportProfessionalPDF = (battleCard: BattleCardData, logoDataUrl?: string) => {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // --- CONFIGURATION ---
  const margin = 15;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const contentWidth = pageWidth - (margin * 2);
  const colWidth = (contentWidth - 10) / 2; // 2-column width with 10mm gap

  let y = 0;

  // --- COLOR PALETTE ---
  const COLORS = {
    primary: [24, 42, 56] as const,      // Dark Navy
    primaryLight: [235, 245, 251] as const, // Light Blue
    accent: [41, 128, 185] as const,     // Bright Blue (Tuskira brand)
    success: [39, 174, 96] as const,
    danger: [192, 57, 43] as const,
    textDark: [44, 62, 80] as const,
    textLight: [127, 140, 141] as const,
    white: [255, 255, 255] as const,
    grayBg: [248, 249, 250] as const,
    border: [230, 230, 230] as const,
    tableHeader: [240, 242, 245] as const
  };

  // --- HELPER FUNCTIONS ---

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - margin) {
      pdf.addPage();
      y = margin;
      return true;
    }
    return false;
  };

  const drawSectionHeader = (title: string, subTitle?: string) => {
    checkPageBreak(25);
    y += 5;
    
    // Icon/Bar accent
    pdf.setFillColor(...COLORS.accent);
    pdf.rect(margin, y, 4, 8, 'F'); 

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.setTextColor(...COLORS.primary);
    pdf.text(title.toUpperCase(), margin + 8, y + 6);

    if (subTitle) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(...COLORS.textLight);
      pdf.text(subTitle, margin + 8, y + 12);
      y += 5;
    }
    y += 12;
  };

  /**
   * Standard Content Card (Used for Strengths/Weaknesses/Overview)
   */
  const drawCard = (
    x: number,
    yPos: number,
    w: number,
    title: string,
    content: string | string[],
    colorAccent: readonly [number, number, number] = COLORS.accent,
    isList: boolean = false
  ) => {
    pdf.setFontSize(10);
    const contentLines = Array.isArray(content)
      ? content.map(c => `•  ${c}`)
      : pdf.splitTextToSize(content, w - 10);

    const finalLines = Array.isArray(contentLines) && isList
      ? pdf.splitTextToSize(contentLines.join('\n\n'), w - 10)
      : contentLines;

    const cardHeight = (finalLines.length * 5) + 20;

    // Background & Border
    pdf.setFillColor(...COLORS.white);
    pdf.setDrawColor(...COLORS.border);
    pdf.setLineWidth(0.1); // Thin consistent border
    pdf.roundedRect(x, yPos, w, cardHeight, 1, 1, 'FD');

    // Top Accent Line
    pdf.setDrawColor(...colorAccent);
    pdf.setLineWidth(0.8);
    pdf.line(x, yPos, x + w, yPos);

    // Title
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(...colorAccent);
    pdf.text(title, x + 5, yPos + 8);

    // Content
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(...COLORS.textDark);
    pdf.text(finalLines, x + 5, yPos + 16);

    return cardHeight;
  };

  // ==================== RENDER LOGIC ====================

  // 1. Header Section
  const headerHeight = 45;
  pdf.setFillColor(...COLORS.primary);
  pdf.rect(0, 0, pageWidth, headerHeight, 'F');

  // Optional Logo
  if (logoDataUrl) {
    const logoSize = 40;
    pdf.addImage(logoDataUrl, 'PNG', pageWidth - margin - logoSize, 3, logoSize, logoSize);
  }

  // Title Logic
  pdf.setTextColor(...COLORS.white);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(20);
  pdf.text("BATTLE CARD", margin, 20);
  
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'normal');
  pdf.text(battleCard.title, margin, 28);

  const generatedDate = (battleCard.generatedAt ? new Date(battleCard.generatedAt) : new Date())
    .toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  pdf.setFontSize(9);
  pdf.setTextColor(...COLORS.textLight);
  pdf.text(`Generated: ${generatedDate}`, margin, 35);

  y = headerHeight + 10;

  // 2. Executive Overview
  drawSectionHeader("Executive Overview");
  const overviewHeight = drawCard(margin, y, contentWidth, "At a Glance", battleCard.overview, COLORS.accent);
  y += overviewHeight + 10;

  // 3. Head-to-Head
  drawSectionHeader("Head-to-Head Comparison");
  const h1 = drawCard(margin, y, colWidth, "Tuskira Strengths", battleCard.strengths, COLORS.success, true);
  const h2 = drawCard(margin + colWidth + 10, y, colWidth, "Competitor Weaknesses", battleCard.weaknesses, COLORS.danger, true);
  y += Math.max(h1, h2) + 12;

  // 4. Key Differentiators (Uniform Grid UX)
  checkPageBreak(60);
  drawSectionHeader("Key Differentiators");

  // Grid Config
  const diffGap = 5;
  const diffCols = 3;
  const diffCardWidth = (contentWidth - (diffGap * (diffCols - 1))) / diffCols;
  
  // A. Calculate Max Height for Uniformity
  // We simulate drawing the text for EVERY differentiator to find the tallest one.
  let maxDiffHeight = 0;
  battleCard.differentiators.forEach(diff => {
    // 5mm padding on sides = width - 10
    const lines = pdf.splitTextToSize(diff, diffCardWidth - 8);
    // Header (10) + Text (lines * 5) + Padding (10)
    const h = 20 + (lines.length * 5);
    if (h > maxDiffHeight) maxDiffHeight = h;
  });

  // B. Draw Grid
  battleCard.differentiators.forEach((diff, i) => {
    const colIndex = i % diffCols;
    
    // New Row Logic
    if (colIndex === 0 && i > 0) {
      y += maxDiffHeight + diffGap;
      checkPageBreak(maxDiffHeight + 20);
    }

    const xPos = margin + (colIndex * (diffCardWidth + diffGap));

    // Card Box (White bg, consistent border)
    pdf.setFillColor(...COLORS.white);
    pdf.setDrawColor(...COLORS.border);
    pdf.setLineWidth(0.1); 
    pdf.roundedRect(xPos, y, diffCardWidth, maxDiffHeight, 1, 1, 'FD');

    // Top Accent (Clean Blue Line)
    pdf.setDrawColor(...COLORS.accent);
    pdf.setLineWidth(0.5);
    pdf.line(xPos, y, xPos + diffCardWidth, y);

    // Number Badge (UX Touch)
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.setTextColor(230, 230, 230); // Subtle large number in background
    pdf.text((i + 1).toString(), xPos + diffCardWidth - 5, y + 6);

    // Text Content
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(...COLORS.textDark);
    
    const lines = pdf.splitTextToSize(diff, diffCardWidth - 8);
    pdf.text(lines, xPos + 4, y + 10); // 4mm padding left
  });
  
  y += maxDiffHeight + 15;

  // 5. Objection Handling (Table Layout)
  checkPageBreak(60);
  drawSectionHeader("Objection Handling");

  // Table Config
  const col1Width = contentWidth * 0.35; // 35% for Objection
  const col2Width = contentWidth * 0.65; // 65% for Response
  const col2X = margin + col1Width;

  // Header Row
  pdf.setFillColor(...COLORS.tableHeader);
  pdf.rect(margin, y, contentWidth, 8, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(...COLORS.textLight);
  pdf.text("RISK SIGNAL", margin + 3, y + 5);
  pdf.text("POSITIONING GUIDANCE", col2X + 3, y + 5);
  y += 8;

  // Rows
  battleCard.objections.forEach((obj) => {
    pdf.setFontSize(9);
    
    // 1. Calculate Heights
    // Note: We use slightly less width (-6) to account for padding
    const qLines = pdf.splitTextToSize(obj.objection, col1Width - 6);
    const aLines = pdf.splitTextToSize(obj.response, col2Width - 6);
    
    const rowHeight = Math.max(qLines.length, aLines.length) * 5 + 10; // +10 for top/bottom padding

    // Page Break Check inside table
    if (checkPageBreak(rowHeight)) {
       // Redraw Header if page broke
       pdf.setFillColor(...COLORS.tableHeader);
       pdf.rect(margin, y, contentWidth, 8, 'F');
       pdf.setFont('helvetica', 'bold');
       pdf.setFontSize(8);
       pdf.setTextColor(...COLORS.textLight);
       pdf.text("RISK SIGNAL (CONT.)", margin + 3, y + 5);
       pdf.text("POSITIONING GUIDANCE", col2X + 3, y + 5);
       y += 8;
    }

    // 2. Backgrounds
    // Left Col (Light Gray)
    pdf.setFillColor(249, 250, 251); 
    pdf.rect(margin, y, col1Width, rowHeight, 'F');
    // Right Col (White)
    pdf.setFillColor(255, 255, 255);
    pdf.rect(col2X, y, col2Width, rowHeight, 'F');

    // 3. Borders (Bottom line only for row separation)
    pdf.setDrawColor(...COLORS.border);
    pdf.setLineWidth(0.1);
    pdf.line(margin, y + rowHeight, margin + contentWidth, y + rowHeight);
    // Vertical divider
    pdf.line(col2X, y, col2X, y + rowHeight);

    // 4. Text Content
    // Left: Bold Objection
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...COLORS.danger); // Slight red tint for risk
    pdf.text(qLines, margin + 3, y + 7);

    // Right: Normal Response
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...COLORS.textDark);
    pdf.text(aLines, col2X + 3, y + 7);

    y += rowHeight;
  });

  y += 10;

  // 6. Pricing & Discovery
  checkPageBreak(50);
  const rowTop = y;
  
  drawSectionHeader("Pricing Model");
  // We'll draw pricing slightly narrower if needed, but let's keep half-width
  const pHeight = drawCard(margin, y, colWidth, "Pricing", battleCard.pricing, COLORS.accent);

  // Discovery Questions (Right Side)
  // Manually draw header for right side to match alignment with "Pricing Model"
  const discHeaderX = margin + colWidth + 10;
  const discHeaderY = rowTop + 5; // Match the vertical offset used in drawSectionHeader

  // Accent rectangle (same size and vertical position as section header)
  pdf.setFillColor(...COLORS.accent);
  pdf.rect(discHeaderX, discHeaderY, 4, 8, 'F');

  // "DISCOVERY QUESTIONS" title text
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.setTextColor(...COLORS.primary);
  const discTitle = "DISCOVERY QUESTIONS";
  pdf.text(discTitle, discHeaderX + 8, discHeaderY + 6);

  // Discovery questions card aligned with Pricing card
  const qHeight = drawCard(
    margin + colWidth + 10,
    y,
    colWidth,
    "Ask This",
    battleCard.questions,
    COLORS.accent,
    true
  );

  y += Math.max(pHeight, qHeight) + 15;

  // 7. Testimonials
  if (checkPageBreak(40)) drawSectionHeader("Customer Testimonies");
  else drawSectionHeader("Customer Testimonies");

  battleCard.testimonials.forEach((t) => {
    // Prepare wrapped quote text so it stays within the testimonial box
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'italic');
    const quoteMaxWidth = contentWidth - 20; // padding inside the box
    const quoteLines = pdf.splitTextToSize(t.quote, quoteMaxWidth);

    // Calculate dynamic box height based on wrapped text + company line
    const lineHeight = 5;
    const textBlockHeight = quoteLines.length * lineHeight;
    const testimonialBoxHeight = textBlockHeight + 18; // includes padding + company line

    checkPageBreak(testimonialBoxHeight + 5);

    // Styling: Light blue box, simple
    pdf.setFillColor(...COLORS.primaryLight);
    pdf.setDrawColor(...COLORS.accent);
    pdf.setLineWidth(0.1);
    pdf.roundedRect(margin, y, contentWidth, testimonialBoxHeight, 1, 1, 'FD');

    // Quote Icon
    pdf.setFontSize(20);
    pdf.setTextColor(...COLORS.accent);
    pdf.text("“", margin + 4, y + 12);

    // Quote text (wrapped)
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(...COLORS.textDark);
    const quoteStartY = y + 8;
    pdf.text(quoteLines, margin + 12, quoteStartY);

    // Company line below the quote
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    const companyY = quoteStartY + textBlockHeight + 4;
    pdf.text(`— ${t.company}`, margin + 12, companyY);

    y += testimonialBoxHeight + 4;
  });

  // --- FOOTER / PAGE NUMBERS ---
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text(`Confidential - Internal Use Only`, margin, pageHeight - 10);
    pdf.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 15, pageHeight - 10);
  }

  // Save
  const fileName = `BattleCard_${battleCard.title.replace(/[^a-z0-9]/gi, '_')}.pdf`;
  pdf.save(fileName);
};