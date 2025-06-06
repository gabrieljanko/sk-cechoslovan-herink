import { Game, Player } from "@shared/schema";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/ui/language-provider";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
         AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, 
         AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Trash2 } from "lucide-react";

interface GameDetailsProps {
  game: Game;
  onClose: () => void;
}

export function GameDetails({ game, onClose }: GameDetailsProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [confirmationText, setConfirmationText] = useState("");
  const [validConfirmation, setValidConfirmation] = useState(false);
  
  // Check if confirmation text is valid
  useEffect(() => {
    setValidConfirmation(confirmationText === "SKCechoslovan");
  }, [confirmationText]);
  
  // Define team data interface
  interface TeamData {
    whiteTeam: Player[];
    blackTeam: Player[];
    benchPlayers: Player[];
  }
  
  // Fetch team data for this game
  const { data: teamsData, isLoading: isLoadingTeams, refetch: refetchTeams } = useQuery<TeamData>({
    queryKey: ['/api/games', game.id, 'teams'],
    enabled: !!game.id,
    staleTime: 0, // Force refetch on component mount
    retry: 3, // Retry failed requests
  });
  
  // Force a refetch of team data when component mounts
  useEffect(() => {
    if (game.id) {
      console.log(`Fetching teams for game ${game.id}:`, {
        isArchived: game.isArchived,
        wasPlayed: game.wasPlayed,
        whiteTeam: game.whiteTeam,
        blackTeam: game.blackTeam,
        whiteTeamLength: Array.isArray(game.whiteTeam) ? game.whiteTeam.length : 0,
        blackTeamLength: Array.isArray(game.blackTeam) ? game.blackTeam.length : 0
      });
      refetchTeams();
    }
  }, [game.id, refetchTeams, game]);
  
  // Delete game mutation
  const deleteGameMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('DELETE', `/api/games/${game.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/games/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/games/archived'] });
      queryClient.invalidateQueries({ queryKey: ['/api/games'] });
      queryClient.invalidateQueries({ queryKey: ['/api/games/upcoming'] });
      toast({
        title: t("Game deleted"),
        description: t("The game has been successfully deleted."),
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: t("Failed to delete game"),
        description: error.message || t("An error occurred while deleting the game."),
        variant: "destructive"
      });
    }
  });
  
  const renderPlayerItem = (player: Player, index: number) => {
    return (
      <li key={player.id} className="flex items-center p-2 border-b">
        <div className="flex-shrink-0">
          <img 
            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=random&color=fff&size=32`} 
            alt={player.name} 
            className="h-8 w-8 rounded-full"
          />
        </div>
        <div className="ml-3">
          <p className="text-sm font-medium text-gray-900">{player.name}</p>
          <p className="text-xs text-gray-500">
            {t("Skill")}: {player.overallSkill}
            {player.gamesPlayed > 0 && ` • ${t("Games")}: ${player.gamesPlayed}`}
          </p>
        </div>
      </li>
    );
  };
  
  return (
    <div className="mt-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900">{t("Game Details")}</h3>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              {t("Delete Game")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("Delete Game")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("This action cannot be undone. All related data will be permanently removed.")}
                <div className="bg-red-50 border border-red-200 rounded-md p-3 mt-4">
                  <p className="text-sm text-red-800">
                    {t("To confirm deletion, please type")} <span className="font-mono font-semibold">SKCechoslovan</span> {t("in the field below.")}
                  </p>
                </div>
                <div className="mt-4">
                  <Label htmlFor="confirmation-text" className="text-sm font-medium text-gray-700 mb-1">
                    {t("Confirmation Text")}
                  </Label>
                  <Input
                    id="confirmation-text"
                    value={confirmationText}
                    onChange={(e) => setConfirmationText(e.target.value)}
                    placeholder="SKCechoslovan"
                    className={!validConfirmation && confirmationText ? "border-red-500" : ""}
                  />
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setConfirmationText("")}>{t("Cancel")}</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => deleteGameMutation.mutate()}
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={!validConfirmation}
              >
                {deleteGameMutation.isPending ? t("Deleting...") : t("Delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      
      {isLoadingTeams ? (
        <div className="animate-pulse flex space-x-4">
          <div className="space-y-3 w-full">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Game score */}
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <h4 className="font-medium text-gray-900 mb-2">{t("Score")}</h4>
            <div className="flex justify-center items-center space-x-8">
              <div className="text-center">
                <div className="bg-white border border-gray-300 py-2 px-4 rounded-lg">
                  <span className="text-xl font-bold">{game.whiteTeamScore ?? "-"}</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">{t("Team White")}</p>
              </div>
              <div className="text-center">
                <div className="bg-gray-900 text-white py-2 px-4 rounded-lg">
                  <span className="text-xl font-bold">{game.blackTeamScore ?? "-"}</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">{t("Team Black")}</p>
              </div>
            </div>
          </div>
          
          {/* Team rosters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* White team */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <h4 className="font-medium text-gray-900 mb-2">
                {t("Team White")} ({teamsData?.whiteTeam?.length || 0})
              </h4>
              {teamsData?.whiteTeam && teamsData.whiteTeam.length > 0 ? (
                <ul className="divide-y divide-gray-200">
                  {teamsData.whiteTeam.map(renderPlayerItem)}
                </ul>
              ) : (
                <div>
                  {game.isArchived && (
                    <div className="p-2 my-2 bg-yellow-50 rounded border border-yellow-100">
                      <p className="text-xs text-yellow-700 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {t("Team data might not be fully available for archived games.")}
                      </p>
                    </div>
                  )}
                  <p className="text-sm text-gray-500 py-2">
                    {game.whiteTeam && Array.isArray(game.whiteTeam) && game.whiteTeam.length > 0 
                      ? t("Loading team players...") 
                      : t("No players found in this team")}
                  </p>
                </div>
              )}
            </div>
            
            {/* Black team */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <h4 className="font-medium text-gray-900 mb-2">
                {t("Team Black")} ({teamsData?.blackTeam?.length || 0})
              </h4>
              {teamsData?.blackTeam && teamsData.blackTeam.length > 0 ? (
                <ul className="divide-y divide-gray-200">
                  {teamsData.blackTeam.map(renderPlayerItem)}
                </ul>
              ) : (
                <div>
                  {game.isArchived && (
                    <div className="p-2 my-2 bg-yellow-50 rounded border border-yellow-100">
                      <p className="text-xs text-yellow-700 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {t("Team data might not be fully available for archived games.")}
                      </p>
                    </div>
                  )}
                  <p className="text-sm text-gray-500 py-2">
                    {game.blackTeam && Array.isArray(game.blackTeam) && game.blackTeam.length > 0 
                      ? t("Loading team players...") 
                      : t("No players found in this team")}
                  </p>
                </div>
              )}
            </div>
          </div>
          
          {/* Bench players */}
          {(teamsData?.benchPlayers && teamsData.benchPlayers.length > 0) || 
           (game.benchPlayers && game.benchPlayers.length > 0) ? (
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <h4 className="font-medium text-gray-900 mb-2">
                {t("Bench Players")} ({teamsData?.benchPlayers?.length || 0})
              </h4>
              {teamsData?.benchPlayers && teamsData.benchPlayers.length > 0 ? (
                <ul className="divide-y divide-gray-200">
                  {teamsData.benchPlayers.map(renderPlayerItem)}
                </ul>
              ) : (
                <p className="text-sm text-gray-500 py-2">
                  {game.benchPlayers && game.benchPlayers.length > 0 
                    ? t("Loading bench players...") 
                    : t("No players on the bench")}
                </p>
              )}
            </div>
          ) : null}
        </div>
      )}
      
      <div className="mt-6 flex justify-between">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              variant="outline" 
              className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              {t("Delete Game")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("Delete Game")}</AlertDialogTitle>
              <AlertDialogDescription>
                <div>
                  <p className="mb-4">{t("Are you sure you want to delete this game? This action cannot be undone and all related data will be permanently removed.")}</p>
                  <div className="mt-2">
                    <Label htmlFor="confirm-text" className="text-sm font-medium">
                      {t("Please type")} <span className="font-bold">SKCechoslovan</span> {t("to confirm deletion")}
                    </Label>
                    <Input
                      id="confirm-text"
                      value={confirmationText}
                      onChange={(e) => setConfirmationText(e.target.value)}
                      className="mt-1"
                      placeholder="SKCechoslovan"
                    />
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                onClick={() => {
                  if (validConfirmation) {
                    deleteGameMutation.mutate();
                  } else {
                    toast({
                      title: t("Invalid confirmation"),
                      description: t("Please type SKCechoslovan correctly to confirm deletion."),
                      variant: "destructive"
                    });
                  }
                }}
                disabled={!validConfirmation}
              >
                {t("Delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        <Button onClick={onClose}>
          {t("Close")}
        </Button>
      </div>
    </div>
  );
}