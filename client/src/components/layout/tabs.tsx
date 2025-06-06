import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import { useLanguage } from "@/components/ui/language-provider";

interface TabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Tabs({ activeTab, setActiveTab }: TabsProps) {
  const [_, navigate] = useLocation();
  const { t } = useLanguage();
  
  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex space-x-4 overflow-x-auto hide-scrollbar">
          <button 
            onClick={() => setActiveTab("games")} 
            className={cn(
              "whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm",
              activeTab === "games" 
                ? "border-blue-500 text-blue-600" 
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            )}
          >
            {t("Games")}
          </button>
          <button 
            onClick={() => setActiveTab("players")} 
            className={cn(
              "whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm",
              activeTab === "players" 
                ? "border-blue-500 text-blue-600" 
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            )}
          >
            {t("Players")}
          </button>
          <button 
            onClick={() => setActiveTab("stats")} 
            className={cn(
              "whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm",
              activeTab === "stats" 
                ? "border-blue-500 text-blue-600" 
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            )}
          >
            {t("Statistics")}
          </button>
        </div>
      </div>
    </nav>
  );
}
