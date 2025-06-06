import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/components/ui/language-provider";
import NotFound from "@/pages/not-found";
import Header from "@/components/layout/header";
import Tabs from "@/components/layout/tabs";
import Footer from "@/components/layout/footer";
import Home from "@/pages/home";
import Games from "@/pages/games";
import Players from "@/pages/players";
import Stats from "@/pages/stats";
import { useState, useEffect } from "react";

function AppContent() {
  const [location] = useLocation();
  const [activeTab, setActiveTab] = useState<string>("games");
  
  // Update active tab based on current route
  useEffect(() => {
    if (location === "/" || location === "/games") {
      setActiveTab("games");
    } else if (location === "/players") {
      setActiveTab("players");
    } else if (location === "/stats") {
      setActiveTab("stats");
    }
  }, [location]);
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-grow py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {activeTab === "games" && <Games />}
          {activeTab === "players" && <Players />}
          {activeTab === "stats" && <Stats />}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={AppContent} />
      <Route path="/games" component={AppContent} />
      <Route path="/players" component={AppContent} />
      <Route path="/stats" component={AppContent} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider defaultLanguage="en">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
