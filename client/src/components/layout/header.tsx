import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import LanguageSelector from "./language-selector";
import { useLanguage } from "@/components/ui/language-provider";
import herinkLogo from "@assets/sk-cechoslovan-herink-logo.jpg";

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t } = useLanguage();
  
  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center">
          <img 
            src={herinkLogo} 
            alt="SK Čechoslovan Herink Logo" 
            className="w-12 h-12 mr-3"
          />
          <span className="hidden sm:inline">SK Čechoslovan Herink</span>
          <span className="sm:hidden">SK Herink</span>
        </h1>
        <div className="flex items-center space-x-4">
          <LanguageSelector />
          <Button 
            variant="ghost" 
            className="text-gray-600 hover:text-gray-900 focus:outline-none md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <Menu className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </header>
  );
}
