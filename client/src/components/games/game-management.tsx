import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Game, Player, UpdateGame } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { format, addDays, addHours, setHours, setMinutes } from "date-fns";
import { ScoreEntry } from "./score-entry";
import { GameDetails } from "./game-details";
import { ChevronRight, Archive, Trash2, Calendar, Clock, User, Edit, RefreshCw, MoreVertical } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function GameManagement() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [openGameId, setOpenGameId] = useState<number | null>(null);
  const [showAllActiveGames, setShowAllActiveGames] = useState(false);
  const [showAllArchivedGames, setShowAllArchivedGames] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("active");
  
  // Date/time editing state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingGameId, setEditingGameId] = useState<number | null>(null);
  const [editDate, setEditDate] = useState<Date | undefined>(undefined);
  const [editHour, setEditHour] = useState<string>("19");
  const [editMinute, setEditMinute] = useState<string>("00");
  
  // Player loading state
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(false);
  const [gameRegistrationId, setGameRegistrationId] = useState<number | null>(null);

  // Active games query
  const { 
    data: activeGamesData = [], 
    isLoading: isLoadingActive 
  } = useQuery<Game[]>({
    queryKey: ['/api/games/active']
  });

  // Archived games query  
  const { 
    data: archivedGamesData = [], 
    isLoading: isLoadingArchived 
  } = useQuery<Game[]>({
    queryKey: ['/api/games/archived']
  });

  // Sort games by date (nearest first)
  const sortGamesByDate = (games: Game[]) => {
    return [...games].sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA.getTime() - dateB.getTime();
    });
  };

  const activeGames = sortGamesByDate(activeGamesData);
  const archivedGames = sortGamesByDate(archivedGamesData);

  // Upcoming game query to identify current active game
  const { 
    data: upcomingGame 
  } = useQuery<Game>({
    queryKey: ['/api/games/upcoming']
  });
  
  // Get registered players for each game
  const {
    data: registeredPlayers = [], 
    isLoading: isLoadingRegistrations,
    refetch: refetchRegistrations
  } = useQuery<any[]>({
    queryKey: ['/api/games', gameRegistrationId, 'registrations'],
    enabled: !!gameRegistrationId,
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
  
  // Update game date/time mutation
  const updateGameDateMutation = useMutation({
    mutationFn: async ({ gameId, date }: { gameId: number, date: Date }) => {
      return await apiRequest('PATCH', `/api/games/${gameId}`, { date });
    },
    onSuccess: () => {
      setIsEditModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/games/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/games/archived'] });
      queryClient.invalidateQueries({ queryKey: ['/api/games'] });
      queryClient.invalidateQueries({ queryKey: ['/api/games/upcoming'] });
      toast({
        title: t("Game updated"),
        description: t("The game date and time have been updated."),
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
  
  const openEditDateModal = (game: Game) => {
    const gameDate = new Date(game.date);
    setEditingGameId(game.id);
    setEditDate(gameDate);
    setEditHour(gameDate.getHours().toString().padStart(2, '0'));
    setEditMinute(gameDate.getMinutes().toString().padStart(2, '0'));
    setIsEditModalOpen(true);
  };
  
  const handleUpdateGameDate = () => {
    if (!editingGameId || !editDate) {
      toast({
        title: t("Error"),
        description: t("Please select a valid date and time"),
        variant: "destructive"
      });
      return;
    }
    
    // Set the time on the selected date
    const updatedDate = new Date(editDate);
    updatedDate.setHours(parseInt(editHour));
    updatedDate.setMinutes(parseInt(editMinute));
    
    updateGameDateMutation.mutate({
      gameId: editingGameId,
      date: updatedDate
    });
  };
  
  const handleLoadRegistrations = (gameId: number) => {
    setGameRegistrationId(gameId);
    setIsLoadingPlayers(true);
    
    refetchRegistrations().then(() => {
      setIsLoadingPlayers(false);
      queryClient.invalidateQueries({ queryKey: ['/api/games/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/games/archived'] });
      
      toast({
        title: t("Players loaded"),
        description: t("The registered players information has been updated."),
      });
    });
  };

  const renderGameItem = (game: Game) => {
    const gameDate = new Date(game.date);
    const formattedDate = format(gameDate, "MMMM d, yyyy");
    const formattedTime = format(gameDate, "HH:mm");
    
    // Get player count - use registeredPlayers if available, otherwise use team counts
    let totalPlayers = 0;
    
    if (Array.isArray(game.registeredPlayers) && game.registeredPlayers.length > 0) {
      totalPlayers = game.registeredPlayers.length;
    } else {
      const whiteTeamCount = Array.isArray(game.whiteTeam) ? game.whiteTeam.length : 0;
      const blackTeamCount = Array.isArray(game.blackTeam) ? game.blackTeam.length : 0; 
      const benchCount = Array.isArray(game.benchPlayers) ? game.benchPlayers.length : 0;
      totalPlayers = whiteTeamCount + blackTeamCount + benchCount;
    }
    
    // Check if this is the current active game
    const isCurrentActiveGame = upcomingGame && game.id === upcomingGame.id;
    
    return (
      <li 
        key={game.id} 
        className={`py-4 ${isCurrentActiveGame ? 'bg-blue-50 border-l-4 border-blue-500 pl-3 -ml-4' : ''}`}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium text-gray-900">
                {formattedDate} <span className="text-gray-600">{formattedTime}</span>
              </h4>
              {isCurrentActiveGame && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {t("Current")}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500">
              {totalPlayers} {t("players")}
            </p>
          </div>
          
          {game.wasPlayed && game.whiteTeamScore !== null && game.blackTeamScore !== null ? (
            <div className="flex items-center space-x-4">
              <div className="text-center">
                <div className="bg-white border border-gray-300 py-1 px-3 rounded">
                  <span className="font-bold">{game.whiteTeamScore}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{t("White")}</p>
              </div>
              <div className="text-center">
                <div className="bg-gray-900 text-white py-1 px-3 rounded">
                  <span className="font-bold">{game.blackTeamScore}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{t("Black")}</p>
              </div>
            </div>
          ) : game.wasPlayed ? (
            <div className="flex items-center space-x-4">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                {t("Score Incomplete")}
              </span>
            </div>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              {t("Not Played")}
            </span>
          )}
        </div>
        
        <div className="mt-2 flex justify-between">
          <div className="flex space-x-2 items-center">
            {/* Actions Dropdown Menu */}
            {!game.isArchived && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                  >
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => openEditDateModal(game)}>
                    <Edit className="h-3 w-3 mr-2" />
                    {t("Edit Date")}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleLoadRegistrations(game.id)}
                    disabled={isLoadingPlayers}
                  >
                    <RefreshCw className={`h-3 w-3 mr-2 ${isLoadingPlayers ? 'animate-spin' : ''}`} />
                    {t("Refresh Players")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleArchiveGame(game.id)}>
                    <Archive className="h-3 w-3 mr-2" />
                    {t("Archive")}
                  </DropdownMenuItem>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem 
                        className="text-red-600 focus:text-red-700"
                        onSelect={(e) => e.preventDefault()}
                      >
                        <Trash2 className="h-3 w-3 mr-2" />
                        {t("Delete")}
                      </DropdownMenuItem>
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
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          
          <Button 
            variant="outline" 
            size="sm"
            className="text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 border-blue-200"
            onClick={() => handleViewDetails(game.id)}
          >
            <Edit className="h-3 w-3 mr-1" />
            {t("Enter Score")}
          </Button>
        </div>
        
        {openGameId === game.id && (
          game.isArchived ? 
            <GameDetails game={game} onClose={() => setOpenGameId(null)} /> :
            <ScoreEntry game={game} onClose={() => setOpenGameId(null)} />
        )}
      </li>
    );
  };

  // Sort active games by date (nearest first) and prioritize current active game
  const sortedActiveGames = [...activeGames].sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    
    // If there's an upcoming game, prioritize it at the top
    if (upcomingGame) {
      if (a.id === upcomingGame.id) return -1;
      if (b.id === upcomingGame.id) return 1;
    }
    
    // Sort by date ascending (nearest first)
    return dateA.getTime() - dateB.getTime();
  });

  // Determine loading state and displayed games
  const isLoading = activeTab === "active" ? isLoadingActive : isLoadingArchived;
  const displayedActiveGames = showAllActiveGames ? sortedActiveGames : sortedActiveGames.slice(0, 4);
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
        <h3 className="text-lg font-medium leading-6 text-gray-900">{t("Game Management")}</h3>
        <p className="mt-1 text-sm text-gray-500">{t("Manage active and archived games")}</p>
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
      
      {/* Date/Time Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("Edit Game Date & Time")}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            <div className="mb-4">
              <Label htmlFor="game-date" className="block text-sm font-medium text-gray-700 mb-2">
                {t("Game Date")}
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !editDate && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {editDate ? format(editDate, "PPP") : <span>{t("Select a date")}</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={editDate}
                    onSelect={setEditDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="mb-4">
              <Label className="block text-sm font-medium text-gray-700 mb-2">
                {t("Game Time")}
              </Label>
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-gray-400" />
                <Select value={editHour} onValueChange={setEditHour}>
                  <SelectTrigger className="w-24">
                    <SelectValue placeholder={t("Hour")} />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => (
                      <SelectItem key={`hour-${i.toString().padStart(2, '0')}`} value={i.toString().padStart(2, '0')}>
                        {i.toString().padStart(2, '0')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-xl">:</span>
                <Select value={editMinute} onValueChange={setEditMinute}>
                  <SelectTrigger className="w-24">
                    <SelectValue placeholder={t("Minute")} />
                  </SelectTrigger>
                  <SelectContent>
                    {['00', '15', '30', '45'].map(value => (
                      <SelectItem key={`minute-${value}`} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-4">
              <Button 
                variant="outline" 
                onClick={() => setIsEditModalOpen(false)}
              >
                {t("Cancel")}
              </Button>
              <Button 
                onClick={handleUpdateGameDate}
                disabled={!editDate || updateGameDateMutation.isPending}
              >
                {updateGameDateMutation.isPending ? t("Saving...") : t("Save Changes")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}