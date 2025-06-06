import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { TeamCard } from "@/components/ui/team-card";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Player, Game } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePlayers } from "@/lib/hooks/use-players";
import { useLanguage } from "@/components/ui/language-provider";
import { Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TeamGeneratorProps {
  game: Game;
}

export function TeamGenerator({ game }: TeamGeneratorProps) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [teamsGenerated, setTeamsGenerated] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetConfirmation, setResetConfirmation] = useState("");
  const [showEarlyGenerationDialog, setShowEarlyGenerationDialog] = useState(false);
  const [earlyGenerationConfirmation, setEarlyGenerationConfirmation] = useState("");
  const [originalPlayerIds, setOriginalPlayerIds] = useState<number[]>([]);
  const [showTeamUpdateNotification, setShowTeamUpdateNotification] = useState(false);
  const RESET_CONFIRMATION_CODE = "SKCechoslovan";
  const EARLY_GENERATION_CONFIRMATION_CODE = "SKCechoslovan";
  
  // Helper function to check if it's more than 7 hours before game time
  const isMoreThan7HoursBeforeGame = () => {
    const gameTime = new Date(game.date);
    const now = new Date();
    const timeDiff = gameTime.getTime() - now.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    return hoursDiff > 7;
  };
  
  // Use players who registered as "going" directly
  const { data: players, isLoading: isPlayersLoading } = usePlayers();
  const { data: registrations, isLoading: isRegistrationsLoading } = useQuery({
    queryKey: [`/api/games/${game.id}/registrations`],
    enabled: !!game.id
  });
  
  // Get the players who voted "going"
  const goingPlayerIds = registrations
    ? registrations
        .filter((reg: any) => reg.status === "going")
        .map((reg: any) => reg.playerId)
    : [];
  
  const { data: teams, isLoading: isTeamsLoading } = useQuery<{
    whiteTeam: Player[];
    blackTeam: Player[];
    benchPlayers?: Player[];
  }>({
    queryKey: [`/api/games/${game.id}/teams`],
    enabled: teamsGenerated || (!!game.whiteTeam?.length && !!game.blackTeam?.length)
  });
  
  // If teams already exist on the game, show them by default
  // This effect runs only once on mount, game is used as a dependency
  // to get the current state of the game teams
  useEffect(() => {
    if ((game.whiteTeam?.length || 0) > 0 && (game.blackTeam?.length || 0) > 0) {
      setTeamsGenerated(true);
    }
  }, [game]);
  
  // Make sure teams stay displayed when component remounts (e.g., after navigating)
  useEffect(() => {
    if (teams && teams.whiteTeam.length > 0 && teams.blackTeam.length > 0) {
      setTeamsGenerated(true);
      // If teams exist but we don't have original player IDs stored, initialize them
      if (originalPlayerIds.length === 0) {
        setOriginalPlayerIds([...goingPlayerIds]);
      }
    }
  }, [teams, goingPlayerIds, originalPlayerIds.length]);

  // Check if player registrations have changed since teams were generated
  useEffect(() => {
    if (teamsGenerated && originalPlayerIds.length > 0) {
      const currentPlayerIds = goingPlayerIds.sort();
      const originalPlayerIdsSorted = [...originalPlayerIds].sort();
      
      // Compare current players with original players
      const playersChanged = currentPlayerIds.length !== originalPlayerIdsSorted.length ||
        !currentPlayerIds.every((id, index) => id === originalPlayerIdsSorted[index]);
      
      setShowTeamUpdateNotification(playersChanged);
    }
  }, [teamsGenerated, goingPlayerIds, originalPlayerIds]);
  
  const generateTeamsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/games/${game.id}/generate-teams`);
    },
    onSuccess: (response) => {
      setTeamsGenerated(true);
      // Store the current player list when teams are generated
      setOriginalPlayerIds([...goingPlayerIds]);
      setShowTeamUpdateNotification(false);
      queryClient.invalidateQueries({ queryKey: [`/api/games/${game.id}/teams`] });
      queryClient.invalidateQueries({ queryKey: ['/api/games'] });
      queryClient.invalidateQueries({ queryKey: [`/api/games/${game.id}`] });
      toast({
        title: t("Teams Generated"),
        description: t("Teams have been balanced based on player skills and automatically saved."),
      });
    },
    onError: (error) => {
      toast({
        title: t("Failed to generate teams"),
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  const saveTeamsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('PATCH', `/api/games/${game.id}`, {
        whiteTeam: teams?.whiteTeam.map(p => p.id),
        blackTeam: teams?.blackTeam.map(p => p.id)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/games'] });
      toast({
        title: t("Teams Saved"),
        description: t("Team assignments have been saved successfully."),
      });
    },
    onError: (error) => {
      toast({
        title: t("Failed to save teams"),
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  const resetTeamsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('PATCH', `/api/games/${game.id}`, {
        whiteTeam: [],
        blackTeam: [],
        benchPlayers: []
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/games/${game.id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/games'] });
      queryClient.invalidateQueries({ queryKey: [`/api/games/${game.id}/teams`] });
      setTeamsGenerated(false);
      setResetConfirmation("");
      setShowResetDialog(false);
      toast({
        title: t("Teams Reset"),
        description: t("Teams have been reset successfully."),
      });
    },
    onError: (error) => {
      toast({
        title: t("Failed to reset teams"),
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  const handleGenerateTeams = () => {
    if (goingPlayerIds.length < 2) {
      toast({
        title: t("Not enough players"),
        description: t("You need at least 2 players to generate teams."),
        variant: "destructive"
      });
      return;
    }
    
    // Check if it's more than 7 hours before the game
    if (isMoreThan7HoursBeforeGame()) {
      setShowEarlyGenerationDialog(true);
      return;
    }
    
    generateTeamsMutation.mutate();
  };

  const handleEarlyGenerationConfirm = () => {
    if (earlyGenerationConfirmation !== EARLY_GENERATION_CONFIRMATION_CODE) {
      toast({
        title: t("Incorrect confirmation"),
        description: t("Please type SKCechoslovan exactly to confirm."),
        variant: "destructive"
      });
      return;
    }
    
    setShowEarlyGenerationDialog(false);
    setEarlyGenerationConfirmation("");
    generateTeamsMutation.mutate();
  };

  const handleEarlyGenerationCancel = () => {
    setShowEarlyGenerationDialog(false);
    setEarlyGenerationConfirmation("");
  };
  
  // Calculate average ratings for teams
  const getAverageRating = (players: Player[]) => {
    if (!players || players.length === 0) return 0;
    return players.reduce((sum, player) => sum + player.overallSkill, 0) / players.length;
  };
  
  const whiteTeamAvg = teams?.whiteTeam ? getAverageRating(teams.whiteTeam) : 0;
  const blackTeamAvg = teams?.blackTeam ? getAverageRating(teams.blackTeam) : 0;
  
  return (
    <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
      <div className="border-b border-gray-200 px-4 py-5 sm:px-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900">{t("Team Generator")}</h3>
        <p className="mt-1 text-sm text-gray-500">
          {t("Teams are generated from players who voted 'Going'")}
        </p>
      </div>
      
      <div className="px-4 py-5 sm:p-6">
        {teamsGenerated ? (
          <>
            {/* Team Update Notification Banner */}
            {showTeamUpdateNotification && (
              <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm text-yellow-800">
                      {t("Teams are not up to date. Player registration has changed since teams were generated. We recommend regenerating teams.")}
                    </p>
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <Button
                      size="sm"
                      onClick={() => {
                        if (isMoreThan7HoursBeforeGame()) {
                          setShowEarlyGenerationDialog(true);
                        } else {
                          generateTeamsMutation.mutate();
                        }
                      }}
                      disabled={generateTeamsMutation.isPending}
                      className="text-yellow-800 bg-yellow-100 hover:bg-yellow-200 border-yellow-300"
                    >
                      {generateTeamsMutation.isPending ? t("Generating...") : t("Generate Teams")}
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {isTeamsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="animate-pulse border-2 border-gray-200 rounded-lg h-60"></div>
                <div className="animate-pulse border-2 border-gray-200 rounded-lg h-60"></div>
              </div>
            ) : teams ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <TeamCard 
                  team="white" 
                  players={teams.whiteTeam} 
                  benchPlayers={teams.benchPlayers?.filter(p => p.id % 2 === 0)} 
                  averageRating={whiteTeamAvg} 
                  playersPerTeam={teams.whiteTeam.length >= 5 ? 5 : 4}
                />
                <TeamCard 
                  team="black" 
                  players={teams.blackTeam} 
                  benchPlayers={teams.benchPlayers?.filter(p => p.id % 2 === 1)} 
                  averageRating={blackTeamAvg}
                  playersPerTeam={teams.blackTeam.length >= 5 ? 5 : 4}
                />
              </div>
            ) : (
              <div className="flex justify-center">
                <p className="text-gray-500">{t("No teams have been generated yet.")}</p>
              </div>
            )}
            
            <div className="mt-6 flex justify-end">
              {game.id && !game.isArchived && (
                <Button 
                  variant="destructive"
                  onClick={() => setShowResetDialog(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t("Reset Teams")}
                </Button>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="mt-2 mb-6">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-sm font-medium text-gray-700">{t("Players registered as 'Going'")}: </span>
                  <span className="text-sm font-bold">{goingPlayerIds.length}</span>
                  <span className="text-sm text-gray-500 ml-2">({t("min: 2, ideal: 10-16")})</span>
                </div>
                
                <div className="flex space-x-2">
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
                    onClick={handleGenerateTeams}
                    disabled={generateTeamsMutation.isPending || goingPlayerIds.length < 2}
                  >
                    {generateTeamsMutation.isPending ? t("Generating...") : t("Generate Teams")}
                  </Button>
                  {(game.whiteTeam?.length || 0) > 0 && (game.blackTeam?.length || 0) > 0 && (
                    <Button 
                      variant="destructive"
                      onClick={() => setShowResetDialog(true)}
                      disabled={resetTeamsMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t("Reset Teams")}
                    </Button>
                  )}
                </div>
              </div>
              
              {isPlayersLoading || isRegistrationsLoading ? (
                <div className="mt-6 animate-pulse">
                  <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="space-y-2">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="h-6 bg-gray-200 rounded"></div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-6">
                  <h4 className="text-md font-medium mb-2">{t("Players who will be included:")}</h4>
                  <ul className="divide-y divide-gray-200 border rounded-md">
                    {goingPlayerIds.map(playerId => {
                      const player = players?.find(p => p.id === playerId);
                      return player ? (
                        <li key={player.id} className="px-4 py-2 flex justify-between">
                          <span>{player.name}</span>
                          <span className="text-gray-500">
                            {t("Overall")}: {player.overallSkill.toFixed(1)}
                          </span>
                        </li>
                      ) : null;
                    })}
                    
                    {goingPlayerIds.length === 0 && (
                      <li className="px-4 py-4 text-center text-gray-500">
                        {t("No players have registered as 'Going' yet.")}
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Early Generation Confirmation Dialog */}
      <Dialog open={showEarlyGenerationDialog} onOpenChange={setShowEarlyGenerationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hele, ještě je dost času! ⚽</DialogTitle>
            <DialogDescription>
              Generuješ týmy víc než 7 hodin před zápasem.<br />
              Opravdu to chceš udělat už teď?
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <Label htmlFor="early-confirmation">
              Pokud jo, napiš sem: <span className="font-bold">SKCechoslovan</span>
            </Label>
            <Input
              id="early-confirmation"
              value={earlyGenerationConfirmation}
              onChange={(e) => setEarlyGenerationConfirmation(e.target.value)}
              placeholder="SKCechoslovan"
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={handleEarlyGenerationCancel}>
              Ne, počkám
            </Button>
            <Button 
              onClick={handleEarlyGenerationConfirm}
              disabled={generateTeamsMutation.isPending}
            >
              {generateTeamsMutation.isPending ? "Generování..." : "Jasně, chci to"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Teams Confirmation Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Reset Teams")}</DialogTitle>
            <DialogDescription>
              {t("Are you sure you want to reset the teams? This action cannot be undone.")}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <Label htmlFor="confirmation">
              {t("To confirm, type")} <span className="font-bold">SKCechoslovan</span>
            </Label>
            <Input
              id="confirmation"
              value={resetConfirmation}
              onChange={(e) => setResetConfirmation(e.target.value)}
              placeholder="SKCechoslovan"
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setResetConfirmation("");
              setShowResetDialog(false);
            }}>
              {t("Cancel")}
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                if (resetConfirmation === RESET_CONFIRMATION_CODE) {
                  resetTeamsMutation.mutate();
                } else {
                  toast({
                    title: t("Incorrect confirmation"),
                    description: t("Please type SKCechoslovan exactly to confirm."),
                    variant: "destructive"
                  });
                }
              }}
              disabled={resetTeamsMutation.isPending}
            >
              {resetTeamsMutation.isPending ? t("Resetting...") : t("Reset Teams")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
