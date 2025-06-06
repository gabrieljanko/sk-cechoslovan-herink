import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Check, X, Ban } from "lucide-react";
import { format } from "date-fns";
import { Player, Registration, Game } from "@shared/schema";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePlayers } from "@/lib/hooks/use-players";
import { useGameRegistrations } from "@/lib/hooks/use-games";
import { useLanguage } from "@/components/ui/language-provider";
import { PenaltyPaymentModal } from "@/components/penalties/penalty-payment-modal";
import { ManualPenaltySelector } from "@/components/penalties/manual-penalty-selector";
import { calculatePenalty } from "@/lib/penalty-calculator";

interface PlayerVotingProps {
  gameId: number;
}

export function PlayerVoting({ gameId }: PlayerVotingProps) {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<string>("going");
  const [isGamePlayable, setIsGamePlayable] = useState(true);
  const [showPenaltyModal, setShowPenaltyModal] = useState(false);
  const [penaltyData, setPenaltyData] = useState<{
    amount: number;
    gameDate: Date;
    withdrawalTime: Date;
  } | null>(null);
  
  // Get game data to check if it's playable (not archived or already played)
  const { data: game } = useQuery<Game>({
    queryKey: [`/api/games/${gameId}`],
    enabled: !!gameId
  });
  
  // Determine if game is in a state where players can register
  useEffect(() => {
    if (game) {
      setIsGamePlayable(!game.wasPlayed && !game.isArchived);
    }
  }, [game]);
  
  const { data: players, isLoading: isPlayersLoading } = usePlayers();
  const { data: registrations, isLoading: isRegistrationsLoading } = useGameRegistrations(gameId);
  
  // Filter and organize players based on their registration status
  const goingPlayers: Array<Player & { registeredAt?: Date }> = [];
  const notGoingPlayers: Array<Player & { registeredAt?: Date }> = [];
  const unregisteredPlayers: Player[] = [];
  
  // If we have both players and registrations data, organize them
  if (players && registrations) {
    // Create maps for faster lookups
    const goingRegistrations = new Map<number, any>();
    const notGoingRegistrations = new Map<number, any>();
    
    // First, categorize all registrations
    for (const reg of registrations) {
      if (reg.status === "going") {
        goingRegistrations.set(reg.playerId, reg);
      } else {
        notGoingRegistrations.set(reg.playerId, reg);
      }
    }
    
    // Now, categorize all players
    for (const player of players) {
      const goingReg = goingRegistrations.get(player.id);
      const notGoingReg = notGoingRegistrations.get(player.id);
      
      if (goingReg) {
        goingPlayers.push({ ...player, registeredAt: new Date(goingReg.registeredAt) });
      } else if (notGoingReg) {
        notGoingPlayers.push({ ...player, registeredAt: new Date(notGoingReg.registeredAt) });
      } else {
        unregisteredPlayers.push(player);
      }
    }
    
    // Sort by name for unregistered, by registration time for others (newest first)
    goingPlayers.sort((a, b) => b.registeredAt!.getTime() - a.registeredAt!.getTime());
    notGoingPlayers.sort((a, b) => b.registeredAt!.getTime() - a.registeredAt!.getTime());
    unregisteredPlayers.sort((a, b) => a.name.localeCompare(b.name));
  }
  
  // Apply search term filtering if needed
  const filterBySearch = (player: Player) => {
    if (!searchTerm) return true;
    return player.name.toLowerCase().includes(searchTerm.toLowerCase());
  };
  
  const filteredGoingPlayers = goingPlayers.filter(filterBySearch);
  const filteredNotGoingPlayers = notGoingPlayers.filter(filterBySearch);
  const filteredUnregisteredPlayers = unregisteredPlayers.filter(filterBySearch);
  
  // Mutations for registering players
  const registerMutation = useMutation({
    mutationFn: async ({ playerId, status }: { playerId: number, status: "going" | "not_going" }) => {
      return apiRequest('POST', '/api/registrations', {
        playerId,
        gameId,
        status
      });
    },
    onSuccess: async (_, { status, playerId }) => {
      queryClient.invalidateQueries({ queryKey: [`/api/games/${gameId}/registrations`] });
      queryClient.invalidateQueries({ queryKey: ['/api/games/upcoming'] });
      
      if (status === "not_going" && game) {
        // Calculate penalty for withdrawing
        const withdrawalTime = new Date();
        const penalty = calculatePenalty(new Date(game.date), withdrawalTime);
        
        if (penalty.amount > 0) {
          // Create penalty record
          try {
            await apiRequest('POST', '/api/penalties', {
              playerId,
              gameId,
              amount: penalty.amount,
              reason: penalty.reason
            });
            
            // Show penalty modal
            setPenaltyData({
              amount: penalty.amount,
              gameDate: new Date(game.date),
              withdrawalTime
            });
            setShowPenaltyModal(true);
          } catch (error) {
            console.error('Error creating penalty:', error);
          }
        } else {
          toast({
            title: t("Marked as not going"),
            description: t("You have been marked as not attending the game."),
          });
        }
      } else {
        toast({
          title: status === "going" ? t("Registered successfully") : t("Marked as not going"),
          description: status === "going" 
            ? t("You have been registered for the game.")
            : t("You have been marked as not attending the game."),
        });
      }
    },
    onError: (error) => {
      toast({
        title: t("Registration failed"),
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Unregister mutation for canceling votes
  const unregisterMutation = useMutation({
    mutationFn: async (playerId: number) => {
      return apiRequest('DELETE', `/api/games/${gameId}/players/${playerId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/games/${gameId}/registrations`] });
      queryClient.invalidateQueries({ queryKey: ['/api/games/upcoming'] });
      toast({
        title: t("Vote canceled"),
        description: t("Your registration status has been canceled."),
      });
    },
    onError: (error) => {
      toast({
        title: t("Failed to cancel vote"),
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Handle player registration or unregistration
  const handlePlayerRegistration = (playerId: number, status: "going" | "not_going") => {
    registerMutation.mutate({ playerId, status });
  };
  
  // Handle canceling a player's vote
  const handleCancelVote = (playerId: number) => {
    unregisterMutation.mutate(playerId);
  };
  
  if (isPlayersLoading || isRegistrationsLoading) {
    return <div className="bg-white shadow rounded-lg p-4 sm:p-6 animate-pulse">
      <div className="h-8 sm:h-10 bg-gray-200 rounded w-36 sm:w-48 mb-4 sm:mb-6"></div>
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-6 sm:h-8 bg-gray-200 rounded"></div>
        ))}
      </div>
      <div className="space-y-3 sm:space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2 sm:mb-0">
            <div className="flex items-center mb-2 sm:mb-0">
              <div className="h-8 w-8 sm:h-10 sm:w-10 bg-gray-200 rounded-full"></div>
              <div className="ml-2 sm:ml-3">
                <div className="h-4 bg-gray-200 rounded w-24 sm:w-32 mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-16 sm:w-20"></div>
              </div>
            </div>
            <div className="flex space-x-1 sm:space-x-2 self-end sm:self-auto">
              <div className="h-7 w-7 sm:h-8 sm:w-8 bg-gray-200 rounded-full"></div>
              <div className="h-7 w-7 sm:h-8 sm:w-8 bg-gray-200 rounded-full"></div>
            </div>
          </div>
        ))}
      </div>
    </div>;
  }
  
  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="p-4 sm:p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">{t("Player Registration")}</h2>
          
          {!isGamePlayable && (
            <div className="bg-yellow-100 text-yellow-800 text-sm px-3 py-1 rounded-full">
              {t("Registration Closed")}
            </div>
          )}
        </div>
        
        {!isGamePlayable && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
            <p className="text-gray-600 text-sm">
              {t("This game has already been played or archived. Player registration is no longer available.")}
            </p>
          </div>
        )}
        
        <div className="mb-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <Input 
              type="text" 
              placeholder={t("Search players...")} 
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <Tabs defaultValue="going" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-3 mb-2">
            <TabsTrigger value="going" className="relative px-0 py-1 text-xs">
              {t("Going")}
              <span className="absolute top-0 right-1 -mt-1 bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {goingPlayers.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="not_going" className="relative px-0 py-1 text-xs">
              {t("Not Going")}
              <span className="absolute top-0 right-1 -mt-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {notGoingPlayers.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="unregistered" className="relative px-0 py-1 text-xs">
              {t("Unregistered")}
              <span className="absolute top-0 right-1 -mt-1 bg-gray-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {unregisteredPlayers.length}
              </span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="going" className="pt-4">
            {filteredGoingPlayers.length === 0 ? (
              <p className="text-center text-gray-500 py-4">{t("No registered players yet.")}</p>
            ) : (
              <ul className="divide-y divide-gray-200">
                {filteredGoingPlayers.map(player => (
                  <li key={player.id} className="py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center mb-2 sm:mb-0">
                      <img 
                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=random&color=fff&size=40`}
                        alt={player.name} 
                        className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gray-200"
                      />
                      <div className="ml-2 sm:ml-3">
                        <p className="text-sm font-medium text-gray-900">{player.name}</p>
                        <div className="flex flex-col sm:flex-row sm:gap-3">
                          <p className="text-xs text-gray-700 font-semibold">
                            {t("Overall")}: {player.overallSkill.toFixed(1)}
                          </p>
                          {player.registeredAt && (
                            <p className="text-xs text-gray-500">
                              {t("Registered")}: {format(player.registeredAt, 'dd.MM.yyyy HH:mm')}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-1 sm:space-x-2 self-end sm:self-auto">
                      <Button 
                        variant="default" 
                        size="icon"
                        className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-green-500 hover:bg-green-600"
                        title={t("Already registered")}
                        disabled
                      >
                        <Check className="h-4 w-4 sm:h-5 sm:w-5" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon"
                        className="h-7 w-7 sm:h-8 sm:w-8 rounded-full border-red-200 text-red-600 hover:bg-red-50"
                        onClick={() => handlePlayerRegistration(player.id, "not_going")}
                        disabled={!isGamePlayable || registerMutation.isPending || unregisterMutation.isPending}
                        title={isGamePlayable ? t("Change to not going") : t("Registration closed")}
                      >
                        <X className="h-4 w-4 sm:h-5 sm:w-5" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon"
                        className="h-7 w-7 sm:h-8 sm:w-8 rounded-full border-yellow-200 text-yellow-600 hover:bg-yellow-50"
                        onClick={() => handleCancelVote(player.id)}
                        disabled={!isGamePlayable || registerMutation.isPending || unregisterMutation.isPending}
                        title={isGamePlayable ? t("Cancel vote") : t("Registration closed")}
                      >
                        <Ban className="h-4 w-4 sm:h-5 sm:w-5" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
          
          <TabsContent value="not_going" className="pt-4">
            <ManualPenaltySelector />
            {filteredNotGoingPlayers.length === 0 ? (
              <p className="text-center text-gray-500 py-4">{t("No players have declined yet.")}</p>
            ) : (
              <ul className="divide-y divide-gray-200">
                {filteredNotGoingPlayers.map(player => (
                  <li key={player.id} className="py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center mb-2 sm:mb-0">
                      <img 
                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=random&color=fff&size=40`}
                        alt={player.name} 
                        className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gray-200"
                      />
                      <div className="ml-2 sm:ml-3">
                        <p className="text-sm font-medium text-gray-900">{player.name}</p>
                        <div className="flex flex-col sm:flex-row sm:gap-3">
                          <p className="text-xs text-gray-700 font-semibold">
                            {t("Overall")}: {player.overallSkill.toFixed(1)}
                          </p>
                          {player.registeredAt && (
                            <p className="text-xs text-gray-500">
                              {t("Declined at")}: {format(player.registeredAt, 'dd.MM.yyyy HH:mm')}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-1 sm:space-x-2 self-end sm:self-auto">
                      <Button 
                        variant="outline" 
                        size="icon"
                        className="h-7 w-7 sm:h-8 sm:w-8 rounded-full border-green-200 text-green-600 hover:bg-green-50"
                        onClick={() => handlePlayerRegistration(player.id, "going")}
                        disabled={!isGamePlayable || registerMutation.isPending || unregisterMutation.isPending}
                        title={isGamePlayable ? t("Change to going") : t("Registration closed")}
                      >
                        <Check className="h-4 w-4 sm:h-5 sm:w-5" />
                      </Button>
                      <Button 
                        variant="default" 
                        size="icon"
                        className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-red-500 hover:bg-red-600"
                        title={t("Already marked as not going")}
                        disabled
                      >
                        <X className="h-4 w-4 sm:h-5 sm:w-5" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon"
                        className="h-7 w-7 sm:h-8 sm:w-8 rounded-full border-yellow-200 text-yellow-600 hover:bg-yellow-50"
                        onClick={() => handleCancelVote(player.id)}
                        disabled={!isGamePlayable || registerMutation.isPending || unregisterMutation.isPending}
                        title={isGamePlayable ? t("Cancel vote") : t("Registration closed")}
                      >
                        <Ban className="h-4 w-4 sm:h-5 sm:w-5" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
          
          <TabsContent value="unregistered" className="pt-4">
            {filteredUnregisteredPlayers.length === 0 ? (
              <p className="text-center text-gray-500 py-4">{t("All players have registered their status.")}</p>
            ) : (
              <ul className="divide-y divide-gray-200">
                {filteredUnregisteredPlayers.map(player => (
                  <li key={player.id} className="py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center mb-2 sm:mb-0">
                      <img 
                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=random&color=fff&size=40`}
                        alt={player.name} 
                        className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gray-200"
                      />
                      <div className="ml-2 sm:ml-3">
                        <p className="text-sm font-medium text-gray-900">{player.name}</p>
                        <div className="flex flex-col sm:flex-row sm:gap-3">
                          <p className="text-xs text-gray-700 font-semibold">
                            {t("Overall")}: {player.overallSkill.toFixed(1)}
                          </p>
                          <p className="text-xs font-medium text-red-600">
                            {t("Not voted yet - fine may apply!")}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-1 sm:space-x-2 self-end sm:self-auto">
                      <Button 
                        variant="outline" 
                        size="icon"
                        className="h-7 w-7 sm:h-8 sm:w-8 rounded-full border-green-200 text-green-600 hover:bg-green-50"
                        onClick={() => handlePlayerRegistration(player.id, "going")}
                        disabled={!isGamePlayable || registerMutation.isPending}
                        title={isGamePlayable ? t("Mark as going") : t("Registration closed")}
                      >
                        <Check className="h-4 w-4 sm:h-5 sm:w-5" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon"
                        className="h-7 w-7 sm:h-8 sm:w-8 rounded-full border-red-200 text-red-600 hover:bg-red-50"
                        onClick={() => handlePlayerRegistration(player.id, "not_going")}
                        disabled={!isGamePlayable || registerMutation.isPending}
                        title={isGamePlayable ? t("Mark as not going") : t("Registration closed")}
                      >
                        <X className="h-4 w-4 sm:h-5 sm:w-5" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Penalty Payment Modal */}
      {showPenaltyModal && penaltyData && (
        <PenaltyPaymentModal
          isOpen={showPenaltyModal}
          onClose={() => setShowPenaltyModal(false)}
          amount={penaltyData.amount}
          gameDate={penaltyData.gameDate}
          withdrawalTime={penaltyData.withdrawalTime}
        />
      )}
    </div>
  );
}