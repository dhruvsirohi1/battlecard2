import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type { Competitor } from '@/types/battlecard';

interface CompetitorStepProps {
  competitors: Competitor[];
  onCompetitorsChange: (competitors: Competitor[]) => void;
  forceRegenerate: boolean;
  onForceRegenerateChange: (value: boolean) => void;
  onNext: () => void;
}

const KNOWN_COMPETITORS = [
  { name: 'CrowdStrike',          domain: 'crowdstrike.com' },
  { name: 'Palo Alto Networks',   domain: 'paloaltonetworks.com' },
  { name: 'SentinelOne',          domain: 'sentinelone.com' },
  { name: 'Microsoft Defender',   domain: 'microsoft.com' },
  { name: 'Darktrace',            domain: 'darktrace.com' },
  { name: 'Vectra AI',            domain: 'vectra.ai' },
  { name: 'Exabeam',              domain: 'exabeam.com' },
  { name: 'Splunk',               domain: 'splunk.com' },
  { name: 'IBM Security',         domain: 'ibm.com' },
  { name: 'Rapid7',               domain: 'rapid7.com' },
  { name: 'Qualys',               domain: 'qualys.com' },
  { name: 'Tenable',              domain: 'tenable.com' },
  { name: 'Lacework',             domain: 'lacework.com' },
  { name: 'Orca Security',        domain: 'orca.security' },
  { name: 'Wiz',                  domain: 'wiz.io' },
  { name: 'Zscaler',              domain: 'zscaler.com' },
  { name: 'Okta',                 domain: 'okta.com' },
  { name: 'CyberArk',             domain: 'cyberark.com' },
  { name: 'Proofpoint',           domain: 'proofpoint.com' },
  { name: 'Fortinet',             domain: 'fortinet.com' },
  { name: 'Check Point',          domain: 'checkpoint.com' },
  { name: 'Sophos',               domain: 'sophos.com' },
  { name: 'Trend Micro',          domain: 'trendmicro.com' },
  { name: 'Carbon Black',         domain: 'carbonblack.com' },
  { name: 'Tanium',               domain: 'tanium.com' },
  { name: 'LogRhythm',            domain: 'logrhythm.com' },
  { name: 'Arctic Wolf',          domain: 'arcticwolf.com' },
  { name: 'Cybereason',           domain: 'cybereason.com' },
  { name: 'Secureworks',          domain: 'secureworks.com' },
  { name: 'Elastic Security',     domain: 'elastic.co' },
  { name: 'Huntress',             domain: 'huntress.com' },
  { name: 'Abnormal Security',    domain: 'abnormalsecurity.com' },
  { name: 'Cyware',               domain: 'cyware.com' },
  { name: 'AttackIQ',             domain: 'attackiq.com' },
  { name: 'SafeBreach',           domain: 'safebreach.com' },
  { name: 'XM Cyber',             domain: 'xmcyber.com' },
  { name: 'Pentera',              domain: 'pentera.io' },
  { name: 'Cymulate',             domain: 'cymulate.com' },
  { name: 'Armis',                domain: 'armis.com' },
  { name: 'Claroty',              domain: 'claroty.com' },
];

export function CompetitorStep({ competitors, onCompetitorsChange, forceRegenerate, onForceRegenerateChange, onNext }: CompetitorStepProps) {
  const selected = competitors[0] ?? null;
  const [query, setQuery] = useState(selected?.name ?? '');
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const suggestions = query.trim().length > 0
    ? KNOWN_COMPETITORS.filter(c =>
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.domain.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 7)
    : [];

  // Reset highlight when suggestions change
  useEffect(() => { setHighlighted(0); }, [query]);

  const selectCompetitor = (item: typeof KNOWN_COMPETITORS[0]) => {
    setQuery(item.name);
    setOpen(false);
    onCompetitorsChange([{
      id: selected?.id ?? crypto.randomUUID(),
      url: `https://${item.domain}`,
      name: item.name,
      isValid: true,
      isLoading: false,
    }]);
  };

  const clear = () => {
    setQuery('');
    onCompetitorsChange([]);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || suggestions.length === 0) {
      if (e.key === 'Enter' && selected) onNext();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted(h => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted(h => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      selectCompetitor(suggestions[highlighted]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  // Scroll highlighted item into view
  useEffect(() => {
    const item = listRef.current?.children[highlighted] as HTMLElement;
    item?.scrollIntoView({ block: 'nearest' });
  }, [highlighted]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Search Competitor</h2>
        <p className="text-muted-foreground">
          Search for a competitor to analyze for your battle card
        </p>
      </div>

      {/* Search input */}
      <div className="relative">
        <div className="relative flex items-center">
          <Search className="absolute left-4 w-5 h-5 text-muted-foreground pointer-events-none" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              if (!e.target.value.trim()) onCompetitorsChange([]);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={handleKeyDown}
            placeholder="Search e.g. CrowdStrike, Palo Alto..."
            className={cn(
              "w-full h-14 pl-12 pr-10 rounded-xl text-base",
              "bg-secondary border border-border",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary",
              "text-foreground placeholder:text-muted-foreground transition-all"
            )}
          />
          {query && (
            <button onClick={clear} className="absolute right-4 text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Dropdown */}
        <AnimatePresence>
          {open && suggestions.length > 0 && (
            <motion.ul
              ref={listRef}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.1 }}
              className="absolute z-50 w-full mt-1 rounded-xl border border-border bg-card shadow-lg overflow-hidden max-h-72 overflow-y-auto"
            >
              {suggestions.map((item, i) => (
                <li
                  key={item.domain}
                  onMouseDown={() => selectCompetitor(item)}
                  onMouseEnter={() => setHighlighted(i)}
                  className={cn(
                    "flex items-center justify-between px-4 py-3 cursor-pointer transition-colors",
                    i === highlighted ? "bg-primary/10" : "hover:bg-secondary"
                  )}
                >
                  <span className="font-medium text-foreground">{item.name}</span>
                  <span className="text-sm text-muted-foreground">{item.domain}</span>
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>

      {/* Selected badge */}
      {selected && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 px-4 py-3 rounded-lg bg-primary/10 border border-primary/30"
        >
          <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground">{selected.name}</p>
            <p className="text-sm text-muted-foreground">{selected.url}</p>
          </div>
        </motion.div>
      )}

      {/* Force Regenerate toggle */}
      <div className="flex items-center justify-between py-2 px-3 rounded-md bg-secondary/50 border border-border">
        <span className="text-sm text-muted-foreground">Force regenerate <span className="text-xs">(bypass 7-day cache)</span></span>
        <Switch checked={forceRegenerate} onCheckedChange={onForceRegenerateChange} />
      </div>

      <div className="flex justify-end pt-4">
        <Button variant="hero" size="lg" onClick={onNext} disabled={!selected}>
          Continue
        </Button>
      </div>
    </motion.div>
  );
}
