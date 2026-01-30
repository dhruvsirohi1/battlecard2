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
  const margin = 20;
  let y = 25;

  // Helper: Add text with wrapping
  const addText = (text: string, x: number, maxWidth: number, fontSize = 10, isBold = false) => {
    pdf.setFontSize(fontSize);
    pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
    const lines = pdf.splitTextToSize(text, maxWidth);
    lines.forEach((line: string) => {
      if (y > pageHeight - 30) {
        pdf.addPage();
        y = margin;
      }
      pdf.text(line, x, y);
      y += fontSize * 0.4;
    });
  };

  // Helper: Add section header
  const addHeader = (text: string) => {
    if (y > pageHeight - 40) {
      pdf.addPage();
      y = margin;
    }
    y += 8;
    pdf.setFillColor(41, 128, 185);
    pdf.rect(margin, y - 6, pageWidth - 2 * margin, 10, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(13);
    pdf.setFont('helvetica', 'bold');
    pdf.text(text, margin + 3, y);
    y += 10;
    pdf.setTextColor(0, 0, 0);
  };

  // Helper: Add bullet point
  const addBullet = (text: string) => {
    if (y > pageHeight - 25) {
      pdf.addPage();
      y = margin;
    }
    pdf.setFontSize(10);
    pdf.text('•', margin + 2, y);
    const lines = pdf.splitTextToSize(text, pageWidth - 2 * margin - 8);
    lines.forEach((line: string, i: number) => {
      pdf.text(line, margin + 8, y);
      y += 5;
    });
    y += 1;
  };

  // ==================== TITLE ====================
  pdf.setFillColor(41, 128, 185);
  pdf.rect(0, 0, pageWidth, 50, 'F');
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text(battleCard.title, margin, 25);
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  const date = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  pdf.text(`Generated: ${date}`, margin, 38);
  
  y = 60;
  pdf.setTextColor(0, 0, 0);

  // ==================== OVERVIEW ====================
  addHeader('EXECUTIVE OVERVIEW');
  addText(battleCard.overview, margin, pageWidth - 2 * margin);
  
  // ==================== DIFFERENTIATORS ====================
  addHeader('KEY DIFFERENTIATORS');
  battleCard.differentiators.forEach((diff: string) => {
    addBullet(diff);
  });
  
  // ==================== STRENGTHS ====================
  addHeader('TUSKIRA STRENGTHS');
  battleCard.strengths.forEach((strength: string) => {
    addBullet(strength);
  });
  
  // ==================== WEAKNESSES ====================
  addHeader('COMPETITOR WEAKNESSES');
  battleCard.weaknesses.forEach((weakness: string) => {
    addBullet(weakness);
  });
  
  // ==================== PRICING ====================
  addHeader('PRICING COMPARISON');
  addText(battleCard.pricing, margin, pageWidth - 2 * margin);
  
  // ==================== OBJECTIONS ====================
  addHeader('OBJECTION HANDLING');
  battleCard.objections.forEach((obj: any) => {
    if (y > pageHeight - 35) {
      pdf.addPage();
      y = margin;
    }
    y += 3;
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(41, 128, 185);
    const qLines = pdf.splitTextToSize(`Q: ${obj.objection}`, pageWidth - 2 * margin);
    qLines.forEach((line: string) => {
      pdf.text(line, margin, y);
      y += 5;
    });
    
    y += 2;
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(0, 0, 0);
    const aLines = pdf.splitTextToSize(`A: ${obj.response}`, pageWidth - 2 * margin);
    aLines.forEach((line: string) => {
      if (y > pageHeight - 25) {
        pdf.addPage();
        y = margin;
      }
      pdf.text(line, margin, y);
      y += 5;
    });
    y += 3;
  });
  
  // ==================== QUESTIONS ====================
  addHeader('DISCOVERY QUESTIONS');
  battleCard.questions.forEach((q: string) => {
    addBullet(q);
  });
  
  // ==================== TESTIMONIALS ====================
  addHeader('CUSTOMER TESTIMONIALS');
  battleCard.testimonials.forEach((t: any) => {
    if (y > pageHeight - 30) {
      pdf.addPage();
      y = margin;
    }
    y += 3;
    pdf.setFillColor(245, 245, 245);
    const quoteHeight = pdf.splitTextToSize(`"${t.quote}"`, pageWidth - 2 * margin - 10).length * 5 + 15;
    pdf.rect(margin, y - 3, pageWidth - 2 * margin, quoteHeight, 'F');
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'italic');
    const quoteLines = pdf.splitTextToSize(`"${t.quote}"`, pageWidth - 2 * margin - 10);
    quoteLines.forEach((line: string) => {
      pdf.text(line, margin + 5, y + 2);
      y += 5;
    });
    
    y += 3;
    pdf.setFont('helvetica', 'bold');
    pdf.text(`— ${t.company}`, margin + 5, y);
    y += 12;
  });

  // ==================== FOOTER ====================
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setDrawColor(200, 200, 200);
    pdf.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
    pdf.setFontSize(8);
    pdf.setTextColor(128, 128, 128);
    pdf.text('Tuskira Battle Card - Confidential', margin, pageHeight - 10);
    pdf.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 20, pageHeight - 10);
  }

  // ==================== SAVE ====================
  const fileName = `${battleCard.title.replace(/[^a-z0-9]/gi, '_')}_${date.replace(/[^a-z0-9]/gi, '_')}.pdf`;
  pdf.save(fileName);
};