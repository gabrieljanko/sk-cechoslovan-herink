import { Button } from "@/components/ui/button";
import { formatDistanceToNow, format } from "date-fns";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Game, Player, Registration } from "@shared/schema";
import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePlayers } from "@/lib/hooks/use-players";
import { useLanguage } from "@/components/ui/language-provider";

interface NextGameCardProps {
  onScheduleClick?: () => void;
}

export function NextGameCard({ onScheduleClick }: NextGameCardProps) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [showPlayers, setShowPlayers] = useState(false);
  const [goingPlayersCount, setGoingPlayersCount] = useState(0);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0 });
  
  const { data: game, isLoading: isGameLoading } = useQuery<Game>({
    queryKey: ['/api/games/upcoming'],
    enabled: true
  });
  
  const { data: players, isLoading: isPlayersLoading } = usePlayers();
  const { data: registrations = [], isLoading: isRegistrationsLoading } = useQuery<Registration[]>({
    queryKey: ['/api/games', game?.id, 'registrations'],
    enabled: !!game?.id
  });
  
  // Calculate and update countdown timer
  useEffect(() => {
    if (!game) return;
    
    const gameDate = new Date(game.date);
    
    // Function to update countdown
    const updateCountdown = () => {
      const now = new Date();
      const diffMs = Math.max(0, gameDate.getTime() - now.getTime());
      
      // Calculate days, hours, minutes
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      setCountdown({ days, hours, minutes });
    };
    
    // Update immediately
    updateCountdown();
    
    // Set interval to update countdown every minute
    const intervalId = setInterval(updateCountdown, 60000);
    
    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, [game]);
  
  // Update the player count when registrations change
  useEffect(() => {
    // Process registration data
    if (Array.isArray(registrations)) {
      // Count registrations with status "going"
      const goingCount = registrations.filter(reg => reg.status === "going").length;
      console.log(`Found ${goingCount} players going out of ${registrations.length} total registrations`);
      setGoingPlayersCount(goingCount);
    }
  }, [registrations]);
  
  const currentPlayerId = 1; // This would be the logged-in player in a real app
  
  const registerMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/registrations', {
        playerId: currentPlayerId,
        gameId: game?.id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/games/upcoming'] });
      toast({
        title: "Success!",
        description: "You have been registered for the game.",
      });
    },
    onError: (error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  const unregisterMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('DELETE', `/api/games/${game?.id}/players/${currentPlayerId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/games/upcoming'] });
      toast({
        title: "Success!",
        description: "You have been unregistered from the game.",
      });
    },
    onError: (error) => {
      toast({
        title: "Unregistration failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  if (isGameLoading || isRegistrationsLoading) {
    return <div className="bg-white shadow rounded-lg overflow-hidden mb-6 p-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <div className="h-6 w-6 bg-gray-200 rounded-full mr-3"></div>
          <div className="h-8 bg-gray-200 rounded w-48"></div>
        </div>
        <div className="h-6 bg-gray-200 rounded-full w-32"></div>
      </div>
      
      {/* Banner image skeleton */}
      <div className="h-48 bg-gray-200 rounded-lg mb-6"></div>
      
      {/* Countdown header skeleton */}
      <div className="flex justify-center mb-2">
        <div className="h-4 bg-gray-200 rounded w-40"></div>
      </div>
      
      {/* Countdown box skeleton */}
      <div className="bg-gray-200 rounded-lg p-6 mb-3">
        <div className="flex justify-center items-center">
          <div className="w-1/3 text-center">
            <div className="h-12 bg-gray-300 rounded w-16 mx-auto mb-2"></div>
            <div className="h-3 bg-gray-300 rounded w-10 mx-auto"></div>
          </div>
          <div className="mx-2">
            <div className="h-2 w-2 bg-gray-300 rounded-full mb-2"></div>
            <div className="h-2 w-2 bg-gray-300 rounded-full"></div>
          </div>
          <div className="w-1/3 text-center">
            <div className="h-12 bg-gray-300 rounded w-16 mx-auto mb-2"></div>
            <div className="h-3 bg-gray-300 rounded w-10 mx-auto"></div>
          </div>
          <div className="mx-2">
            <div className="h-2 w-2 bg-gray-300 rounded-full mb-2"></div>
            <div className="h-2 w-2 bg-gray-300 rounded-full"></div>
          </div>
          <div className="w-1/3 text-center">
            <div className="h-12 bg-gray-300 rounded w-16 mx-auto mb-2"></div>
            <div className="h-3 bg-gray-300 rounded w-10 mx-auto"></div>
          </div>
        </div>
      </div>
    </div>;
  }
  
  if (!game) {
    return (
      <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
        <div className="p-4 sm:p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">{t("No upcoming games")}</h2>
          <p className="text-gray-600 mb-4">{t("There are no upcoming games scheduled.")}</p>
          <Button 
            className="w-full sm:w-auto"
            onClick={onScheduleClick}
          >
            {t("Schedule a Game")}
          </Button>
        </div>
      </div>
    );
  }
  
  const gameDate = new Date(game.date);
  const isPlayerRegistered = game.registeredPlayers?.includes(currentPlayerId);
  
  // Czech date and time formatting function
  const formatDateCzech = (date: Date): string => {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
    
    const dayName = dayNames[date.getDay()];
    const day = date.getDate();
    const monthName = monthNames[date.getMonth()];
    
    // Format time in 24-hour format (HH:MM)
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const timeString = `${hours}:${minutes}`;
    
    return `${t(dayName)}, ${day}. ${t(monthName)} ${timeString}`;
  };
  
  const formattedMonthDay = formatDateCzech(gameDate);
  
  return (
    <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
      <div className="p-6">
        {/* Header with football icon and game date */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="text-green-500 mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 2a10 10 0 0 0-8 15h16a10 10 0 0 0-8-15Z"></path>
                <path d="m7 17 2.5-5H14l2.5 5"></path>
                <path d="M7 11a5.5 5.5 0 0 1 5-5c2.5 0 4.25 2 4.5 3.5"></path>
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">{t("Next Game")}: {formattedMonthDay}</h2>
          </div>
          <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium bg-green-100 text-green-800">
            {game.wasPlayed ? t("Game Played") : t("Registration Open")}
          </span>
        </div>
        
        {/* Game banner image */}
        <img 
          src="https://images.unsplash.com/photo-1517466787929-bc90951d0974?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1200&h=400" 
          alt="Football players ready for game" 
          className="w-full h-48 object-cover object-center rounded-lg mb-6"
        />
        
        {/* Countdown section */}
        <div className="text-center mb-2">
          <h3 className="text-sm font-medium uppercase tracking-wider text-gray-500">{t("COUNTDOWN TO KICKOFF")}</h3>
        </div>
        
        <div className="bg-gray-900 text-white rounded-lg p-6 text-center mb-3">
          <div className="flex justify-center items-center">
            <div className="w-1/3 text-center">
              <span className="text-5xl font-bold">{countdown.days}</span>
              <p className="text-xs mt-1 uppercase tracking-wider">{t("DAYS")}</p>
            </div>
            
            <div className="text-green-400 mx-2 flex flex-col">
              <div className="w-2 h-2 bg-green-400 rounded-full mb-2"></div>
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            </div>
            
            <div className="w-1/3 text-center">
              <span className="text-5xl font-bold">{countdown.hours}</span>
              <p className="text-xs mt-1 uppercase tracking-wider">{t("HOURS")}</p>
            </div>
            
            <div className="text-green-400 mx-2 flex flex-col">
              <div className="w-2 h-2 bg-green-400 rounded-full mb-2"></div>
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            </div>
            
            <div className="w-1/3 text-center">
              <span className="text-5xl font-bold">{countdown.minutes}</span>
              <p className="text-xs mt-1 uppercase tracking-wider">{t("MINS")}</p>
            </div>
          </div>
        </div>
        

      </div>
    </div>
  );
}
