import { useState } from "react";
import { NextGameCard } from "@/components/games/next-game-card";
import { TeamGenerator } from "@/components/games/team-generator";
import { GameManagement } from "@/components/games/game-management";
import { PlayerVoting } from "@/components/games/player-voting";
import { ScheduleGameModal } from "@/components/games/schedule-game-modal";
import { useQuery } from "@tanstack/react-query";
import { Game } from "@shared/schema";
import { useLanguage } from "@/components/ui/language-provider";
import { Button } from "@/components/ui/button";
import { CalendarPlus } from "lucide-react";

export default function Games() {
  const { t } = useLanguage();
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  
  const { data: upcomingGame, isLoading } = useQuery<Game>({
    queryKey: ['/api/games/upcoming'],
  });
  
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-900">{t("Games")}</h1>
        <Button 
          onClick={() => setIsScheduleModalOpen(true)}
          className="flex items-center space-x-1"
        >
          <CalendarPlus className="h-4 w-4 mr-1" />
          {t("Schedule Game")}
        </Button>
      </div>
      
      <div className="space-y-8">
        <NextGameCard onScheduleClick={() => setIsScheduleModalOpen(true)} />
        
        {upcomingGame && !upcomingGame.isArchived && !upcomingGame.wasPlayed && (
          <>
            <section className="mt-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">{t("Player Registration")}</h2>
              <PlayerVoting gameId={upcomingGame.id} />
            </section>
            
            <section className="mt-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">{t("Team Generator")}</h2>
              <TeamGenerator game={upcomingGame} />
            </section>
          </>
        )}
        
        <section className="mt-8">
          <GameManagement />
        </section>
      </div>
      
      {/* Schedule Game Modal */}
      <ScheduleGameModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
      />
    </div>
  );
}