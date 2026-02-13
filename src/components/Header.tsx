import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function Header() {
  return (
    <motion.header 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/90 backdrop-blur-xl"
    >
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <img
            src="/tuskira-icon2.png"
            alt="Tuskira"
            className="w-10 h-10 rounded-lg"
          />
          <div>
            <h1 className="text-lg font-bold text-foreground">Tuskira</h1>
            <p className="text-xs text-muted-foreground">Battle Card Generator</p>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <a href="#" className="text-sm text-foreground/90 hover:text-foreground transition-colors">
            Templates
          </a>
          <a href="#" className="text-sm text-foreground/90 hover:text-foreground transition-colors">
            My Cards
          </a>
          <a href="#" className="text-sm text-foreground/90 hover:text-foreground transition-colors">
            Help
          </a>
          <Button asChild size="default" className="rounded-md font-medium">
            <a href="#">Get Started</a>
          </Button>
        </nav>
      </div>
    </motion.header>
  );
}
