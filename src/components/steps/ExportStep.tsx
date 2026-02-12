import { exportProfessionalPDF } from '@/lib/exportProfessionalPDF';
import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Download,
  Link2,
  Copy,
  Check,
  FileText,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import type { BattleCardContent } from '@/services/aws';

interface ExportStepProps {
  battleCard: BattleCardContent;
  onBack: () => void;
  onReset: () => void;
}

export function ExportStep({ battleCard, onBack, onReset }: ExportStepProps) {
  const [copied, setCopied] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(['overview']);
  const battleCardRef = useRef<HTMLDivElement>(null);
  const shareUrl = `https://tuskira.app/cards/${battleCard.id.slice(-8)}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const exportToPDF = () => {
  console.log('Battle card data:', battleCard);
  console.log('Has differentiators?', battleCard?.differentiators);
  console.log('Type of battleCard:', typeof battleCard);
  console.log('Keys:', Object.keys(battleCard || {}));
  
  if (!battleCard) {
    toast({
      title: "Error",
      description: "No battle card data",
      variant: "destructive",
    });
    return;
  }

  try {
    exportProfessionalPDF(battleCard);
    toast({
      title: "Success",
      description: "PDF exported",
    });
  } catch (error) {
    console.error('PDF export error:', error);
    toast({
      title: "Error",
      description: "Failed to export PDF",
      variant: "destructive",
    });
  }
};

  const exportToJSON = () => {
    const dataStr = JSON.stringify(battleCard, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `battle-card-${battleCard.id}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();

    toast.success('JSON downloaded successfully!');
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Your Battle Card</h2>
        <p className="text-muted-foreground">
          Review, export, and share your competitive intelligence
        </p>
      </div>

      {/* Share Link */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Share Link
        </h3>
        <div className="flex gap-3">
          <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-lg bg-secondary border border-border">
            <Link2 className="w-5 h-5 text-muted-foreground shrink-0" />
            <span className="text-sm text-foreground truncate">{shareUrl}</span>
          </div>
          <Button onClick={copyLink} variant="outline" className="shrink-0">
            {copied ? (
              <Check className="w-5 h-5 text-success" />
            ) : (
              <Copy className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Export Options */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Export Options
        </h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="h-auto py-4 justify-start gap-4"
            onClick={exportToPDF}
          >
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-destructive" />
            </div>
            <div className="text-left">
              <p className="font-medium">Download PDF</p>
              <p className="text-sm text-muted-foreground">Printable format</p>
            </div>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-4 justify-start gap-4"
            onClick={exportToJSON}
          >
            <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
              <Download className="w-5 h-5 text-info" />
            </div>
            <div className="text-left">
              <p className="font-medium">Download JSON</p>
              <p className="text-sm text-muted-foreground">Raw data format</p>
            </div>
          </Button>
        </div>
      </div>

      {/* Battle Card Content */}
      <div ref={battleCardRef} className="space-y-4 p-8 rounded-xl bg-card border border-border">
        {/* Title */}
        <div className="text-center pb-6 border-b border-border">
          <h1 className="text-3xl font-bold gradient-text mb-2">{battleCard.title}</h1>
          <p className="text-sm text-muted-foreground">
            Generated on {new Date(battleCard.generatedAt).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            })}
          </p>
        </div>

        {/* Overview */}
        {battleCard.overview && (
          <Card className="bg-secondary/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Overview</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">{battleCard.overview}</p>
            </CardContent>
          </Card>
        )}

        {/* Key Differentiators */}
        {battleCard.differentiators && battleCard.differentiators.length > 0 && (
          <Card className="bg-secondary/50">
            <CardHeader className="cursor-pointer" onClick={() => toggleSection('differentiators')}>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Key Differentiators</span>
                {expandedSections.includes('differentiators') ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </CardTitle>
            </CardHeader>
            {expandedSections.includes('differentiators') && (
              <CardContent>
                <ul className="space-y-3">
                  {battleCard.differentiators.map((diff, idx) => (
                    <li key={idx} className="flex gap-3">
                      <span className="text-primary font-bold shrink-0">•</span>
                      <span className="text-muted-foreground">{diff}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            )}
          </Card>
        )}

        {/* Tuskira Strengths */}
        {battleCard.strengths && battleCard.strengths.length > 0 && (
          <Card className="bg-success/5 border-success/20">
            <CardHeader className="cursor-pointer" onClick={() => toggleSection('strengths')}>
              <CardTitle className="text-lg flex items-center justify-between">
                <span className="text-success">Tuskira Strengths</span>
                {expandedSections.includes('strengths') ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </CardTitle>
            </CardHeader>
            {expandedSections.includes('strengths') && (
              <CardContent>
                <ul className="space-y-3">
                  {battleCard.strengths.map((strength, idx) => (
                    <li key={idx} className="flex gap-3">
                      <span className="text-success font-bold shrink-0">✓</span>
                      <span className="text-muted-foreground">{strength}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            )}
          </Card>
        )}

        {/* Competitor Weaknesses */}
        {battleCard.weaknesses && battleCard.weaknesses.length > 0 && (
          <Card className="bg-destructive/5 border-destructive/20">
            <CardHeader className="cursor-pointer" onClick={() => toggleSection('weaknesses')}>
              <CardTitle className="text-lg flex items-center justify-between">
                <span className="text-destructive">Competitor Weaknesses</span>
                {expandedSections.includes('weaknesses') ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </CardTitle>
            </CardHeader>
            {expandedSections.includes('weaknesses') && (
              <CardContent>
                <ul className="space-y-3">
                  {battleCard.weaknesses.map((weakness, idx) => (
                    <li key={idx} className="flex gap-3">
                      <span className="text-destructive font-bold shrink-0">✗</span>
                      <span className="text-muted-foreground">{weakness}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            )}
          </Card>
        )}

        {/* Pricing */}
        {battleCard.pricing && (
          <Card className="bg-secondary/50">
            <CardHeader className="cursor-pointer" onClick={() => toggleSection('pricing')}>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Pricing Comparison</span>
                {expandedSections.includes('pricing') ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </CardTitle>
            </CardHeader>
            {expandedSections.includes('pricing') && (
              <CardContent>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                  {battleCard.pricing}
                </p>
              </CardContent>
            )}
          </Card>
        )}

        {/* Objections & Responses */}
        {battleCard.objections && battleCard.objections.length > 0 && (
          <Card className="bg-secondary/50">
            <CardHeader className="cursor-pointer" onClick={() => toggleSection('objections')}>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Common Objections & Responses</span>
                {expandedSections.includes('objections') ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </CardTitle>
            </CardHeader>
            {expandedSections.includes('objections') && (
              <CardContent>
                <div className="space-y-4">
                  {battleCard.objections.map((obj, idx) => (
                    <div key={idx} className="space-y-2">
                      <p className="font-semibold text-foreground">Q: {obj.objection}</p>
                      <p className="text-muted-foreground pl-4 border-l-2 border-primary">
                        A: {obj.response}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* Discovery Questions */}
        {battleCard.questions && battleCard.questions.length > 0 && (
          <Card className="bg-secondary/50">
            <CardHeader className="cursor-pointer" onClick={() => toggleSection('questions')}>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Discovery Questions</span>
                {expandedSections.includes('questions') ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </CardTitle>
            </CardHeader>
            {expandedSections.includes('questions') && (
              <CardContent>
                <ul className="space-y-2">
                  {battleCard.questions.map((question, idx) => (
                    <li key={idx} className="flex gap-3">
                      <span className="text-primary shrink-0">{idx + 1}.</span>
                      <span className="text-muted-foreground">{question}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            )}
          </Card>
        )}

        {/* Customer Testimonials */}
        {battleCard.testimonials && battleCard.testimonials.length > 0 && (
          <Card className="bg-secondary/50">
            <CardHeader className="cursor-pointer" onClick={() => toggleSection('testimonials')}>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Customer Testimonials</span>
                {expandedSections.includes('testimonials') ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </CardTitle>
            </CardHeader>
            {expandedSections.includes('testimonials') && (
              <CardContent>
                <div className="space-y-4">
                  {battleCard.testimonials.map((testimonial, idx) => (
                    <div key={idx} className="p-4 rounded-lg bg-background/50 border border-border">
                      <p className="text-muted-foreground italic mb-2">"{testimonial.quote}"</p>
                      <p className="text-sm font-semibold text-primary">— {testimonial.company}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center pt-4 border-t border-border">
        <Button variant="outline" size="lg" onClick={onBack}>
          Back
        </Button>
        <Button variant="hero" size="lg" onClick={onReset}>
          Create Another Card
        </Button>
      </div>
    </motion.div>
  );
}
