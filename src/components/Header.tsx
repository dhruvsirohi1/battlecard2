import { motion } from 'framer-motion';
import { Shield, Zap } from 'lucide-react';

export function Header() {
  return (
    <motion.header 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl"
    >
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-info flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-success flex items-center justify-center">
              <Zap className="w-2.5 h-2.5 text-success-foreground" />
            </div>
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Tuskira</h1>
            <p className="text-xs text-muted-foreground">Battle Card Generator</p>
          </div>
        </div>
        
        <nav className="hidden md:flex items-center gap-6">
          <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Templates
          </a>
          <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            My Cards
          </a>
          <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Help
          </a>
        </nav>
      </div>
    </motion.header>
  );
}
