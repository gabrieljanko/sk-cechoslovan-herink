import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useMutation } from "@tanstack/react-query";
import { Game } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/components/ui/language-provider";

interface ScoreEntryProps {
  game: Game;
  onClose: () => void;
}

export function ScoreEntry({ game, onClose }: ScoreEntryProps) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [whiteScore, setWhiteScore] = useState<number | undefined>(game.whiteTeamScore !== null ? game.whiteTeamScore : undefined);
  const [blackScore, setBlackScore] = useState<number | undefined>(game.blackTeamScore !== null ? game.blackTeamScore : undefined);
  const [notPlayed, setNotPlayed] = useState(!game.wasPlayed);
  
  const updateGameMutation = useMutation({
    mutationFn: async () => {
      const gameData = {
        whiteTeamScore: notPlayed ? null : whiteScore,
        blackTeamScore: notPlayed ? null : blackScore,
        wasPlayed: !notPlayed,
        isArchived: !notPlayed // automatically archive the game when scores are saved
      };
      
      console.log("Updating game with data:", gameData);
      return apiRequest('PATCH', `/api/games/${game.id}`, gameData);
    },
    onSuccess: () => {
      // Invalidate all relevant game queries
      queryClient.invalidateQueries({ queryKey: ['/api/games'] });
      queryClient.invalidateQueries({ queryKey: ['/api/games/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/games/archived'] });
      queryClient.invalidateQueries({ queryKey: ['/api/games/upcoming'] });
      
      // Also invalidate player stats as they've been updated
      queryClient.invalidateQueries({ queryKey: ['/api/players'] });
      
      toast({
        title: t("Game updated"),
        description: notPlayed 
          ? t("Game has been marked as not played.") 
          : t("Game scores have been saved and the game has been archived."),
      });
      
      // Close the dialog first
      onClose();
      
      // Refresh the page after a short delay to ensure data is updated
      if (!notPlayed) {
        setTimeout(() => {
          window.location.reload();
        }, 300);
      }
    },
    onError: (error) => {
      toast({
        title: t("Failed to update game"),
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate scores if the game was played
    if (!notPlayed) {
      if (whiteScore === undefined || blackScore === undefined) {
        toast({
          title: t("Invalid scores"),
          description: t("Please enter scores for both teams."),
          variant: "destructive"
        });
        return;
      }
      
      if (whiteScore < 0 || blackScore < 0) {
        toast({
          title: t("Invalid scores"),
          description: t("Scores cannot be negative."),
          variant: "destructive"
        });
        return;
      }
    }
    
    updateGameMutation.mutate();
  };
  
  return (
    <div className="mt-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
      <h3 className="text-lg font-medium text-gray-900 mb-4">{t("Game Results")}</h3>
      
      <img 
        src="https://images.unsplash.com/photo-1585951237318-9ea5e175b891?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=600&h=300" 
        alt="Digital scoreboard" 
        className="w-full h-32 object-cover rounded-lg mb-4"
      />
      
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <Label htmlFor="white-score" className="block text-sm font-medium text-gray-700 mb-1">
              {t("Team White")}
            </Label>
            <Input 
              id="white-score"
              type="number" 
              min="0" 
              placeholder={t("Score")}
              value={whiteScore ?? ""}
              onChange={(e) => setWhiteScore(e.target.value ? parseInt(e.target.value) : undefined)}
              disabled={notPlayed || updateGameMutation.isPending}
            />
          </div>
          <div>
            <Label htmlFor="black-score" className="block text-sm font-medium text-gray-700 mb-1">
              {t("Team Black")}
            </Label>
            <Input 
              id="black-score"
              type="number" 
              min="0" 
              placeholder={t("Score")}
              value={blackScore ?? ""}
              onChange={(e) => setBlackScore(e.target.value ? parseInt(e.target.value) : undefined)}
              disabled={notPlayed || updateGameMutation.isPending}
            />
          </div>
        </div>
        
        <div className="flex items-center mb-4">
          <Checkbox 
            id="not-played" 
            checked={notPlayed}
            onCheckedChange={(checked) => setNotPlayed(checked === true)}
            disabled={updateGameMutation.isPending}
          />
          <Label htmlFor="not-played" className="ml-2 block text-sm text-gray-900">
            {t("Game was not played")}
          </Label>
        </div>
        
        <div className="mt-5 sm:mt-6 flex justify-end space-x-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={updateGameMutation.isPending}
          >
            {t("Cancel")}
          </Button>
          <Button 
            type="submit" 
            className="bg-blue-600 hover:bg-blue-700"
            disabled={updateGameMutation.isPending}
          >
            {updateGameMutation.isPending ? t("Saving...") : t("Save Results")}
          </Button>
        </div>
      </form>
    </div>
  );
}
