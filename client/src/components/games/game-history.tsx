import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Game } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { format } from "date-fns";
import { ScoreEntry } from "./score-entry";
import { ChevronRight, Archive, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/components/ui/language-provider";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog";

interface GameHistoryProps {
  showActiveGames?: boolean;
}

export function GameHistory({ showActiveGames = true }: GameHistoryProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [openGameId, setOpenGameId] = useState<number | null>(null);
  const [showAllActiveGames, setShowAllActiveGames] = useState(false);
  const [showAllArchivedGames, setShowAllArchivedGames] = useState(false);
  const [activeTab, setActiveTab] = useState<string>(showActiveGames ? "active" : "archived");

  // Active games query
  const { 
    data: activeGames = [], 
    isLoading: isLoadingActive 
  } = useQuery<Game[]>({
    queryKey: ['/api/games/active']
  });

  // Archived games query  
  const { 
    data: archivedGames = [], 
    isLoading: isLoadingArchived 
  } = useQuery<Game[]>({
    queryKey: ['/api/games/archived']
  });

  // Archive a game mutation
  const archiveGameMutation = useMutation({
    mutationFn: async (gameId: number) => {
      return await apiRequest(
        'PATCH',
        `/api/games/${gameId}`, 
        { isArchived: true }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/games/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/games/archived'] });
      queryClient.invalidateQueries({ queryKey: ['/api/games'] });
      queryClient.invalidateQueries({ queryKey: ['/api/games/upcoming'] });
      toast({
        title: t("Game archived"),
        description: t("The game has been successfully archived."),
      });
    }
  });

  // Delete a game mutation
  const deleteGameMutation = useMutation({
    mutationFn: async (gameId: number) => {
      return await apiRequest('DELETE', `/api/games/${gameId}`);
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
    }
  });

  const handleViewDetails = (gameId: number) => {
    setOpenGameId(prevId => prevId === gameId ? null : gameId);
  };

  const handleArchiveGame = (gameId: number) => {
    archiveGameMutation.mutate(gameId);
  };

  const handleDeleteGame = (gameId: number) => {
    deleteGameMutation.mutate(gameId);
  };

  const renderGameItem = (game: Game) => {
    const gameDate = new Date(game.date);
    const formattedDate = format(gameDate, "MMMM d, yyyy");
    const playerCount = game.registeredPlayers?.length || 0;
    
    return (
      <li key={game.id} className="py-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-900">{formattedDate}</h4>
            <p className="text-sm text-gray-500">
              {game.wasPlayed ? `${playerCount} players` : "Canceled"}
            </p>
          </div>
          
          {game.wasPlayed ? (
            <div className="flex items-center space-x-4">
              <div className="text-center">
                <div className="bg-white border border-gray-300 py-1 px-3 rounded">
                  <span className="font-bold">{game.whiteTeamScore ?? "-"}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">White</p>
              </div>
              <div className="text-center">
                <div className="bg-gray-900 text-white py-1 px-3 rounded">
                  <span className="font-bold">{game.blackTeamScore ?? "-"}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Black</p>
              </div>
            </div>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              Not Played
            </span>
          )}
        </div>
        
        <div className="mt-2 flex justify-between">
          <div className="flex space-x-2">
            {!game.isArchived && (
              <Button
                variant="outline" 
                size="sm"
                className="text-xs"
                onClick={() => handleArchiveGame(game.id)}
              >
                <Archive className="h-3 w-3 mr-1" />
                {t("Archive")}
              </Button>
            )}
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  {t("Delete")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("Delete Game")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("Are you sure you want to delete this game? This action cannot be undone and all related data will be permanently removed.")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
                  <AlertDialogAction 
                    className="bg-red-600 hover:bg-red-700"
                    onClick={() => handleDeleteGame(game.id)}
                  >
                    {t("Delete")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          
          <Button 
            variant="link" 
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            onClick={() => handleViewDetails(game.id)}
          >
            {t("View Details")}
          </Button>
        </div>
        
        {openGameId === game.id && (
          <ScoreEntry game={game} onClose={() => setOpenGameId(null)} />
        )}
      </li>
    );
  };

  // Determine loading state and which games to display
  const isLoading = activeTab === "active" ? isLoadingActive : isLoadingArchived;
  const displayedActiveGames = showAllActiveGames ? activeGames : activeGames.slice(0, 4);
  const displayedArchivedGames = showAllArchivedGames ? archivedGames : archivedGames.slice(0, 4);
  
  if (isLoading) {
    return (
      <div className="bg-white shadow rounded-lg overflow-hidden animate-pulse">
        <div className="border-b border-gray-200 px-4 py-5 sm:px-6">
          <div className="h-5 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
        <div className="px-4 py-5 sm:p-6">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="py-4 border-b border-gray-200">
                <div className="flex justify-between">
                  <div className="w-1/3">
                    <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                  </div>
                  <div className="flex space-x-4">
                    <div className="h-8 w-8 bg-gray-200 rounded"></div>
                    <div className="h-8 w-8 bg-gray-200 rounded"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="border-b border-gray-200 px-4 py-5 sm:px-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900">{t("Game History")}</h3>
        <p className="mt-1 text-sm text-gray-500">{t("Record of past games and scores")}</p>
      </div>
      
      <Tabs 
        defaultValue={activeTab}
        className="w-full"
        onValueChange={setActiveTab}
      >
        <TabsList className="grid grid-cols-2 mx-4 mt-4">
          <TabsTrigger value="active">{t("Active Games")}</TabsTrigger>
          <TabsTrigger value="archived">{t("Archived Games")}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="active" className="px-4 py-2">
          {activeGames.length === 0 ? (
            <p className="text-center text-gray-500 py-4">{t("No active games found.")}</p>
          ) : (
            <>
              <ul className="divide-y divide-gray-200">
                {displayedActiveGames.map(renderGameItem)}
              </ul>
              
              {activeGames.length > 4 && (
                <div className="mt-6 flex justify-center">
                  <Button 
                    variant="link" 
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center"
                    onClick={() => setShowAllActiveGames(!showAllActiveGames)}
                  >
                    {showAllActiveGames ? t("Show Less") : t("View All Games")}
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>
        
        <TabsContent value="archived" className="px-4 py-2">
          {archivedGames.length === 0 ? (
            <p className="text-center text-gray-500 py-4">{t("No archived games found.")}</p>
          ) : (
            <>
              <ul className="divide-y divide-gray-200">
                {displayedArchivedGames.map(renderGameItem)}
              </ul>
              
              {archivedGames.length > 4 && (
                <div className="mt-6 flex justify-center">
                  <Button 
                    variant="link" 
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center"
                    onClick={() => setShowAllArchivedGames(!showAllArchivedGames)}
                  >
                    {showAllArchivedGames ? t("Show Less") : t("View All Games")}
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}