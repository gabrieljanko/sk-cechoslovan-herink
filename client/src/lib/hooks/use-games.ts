import { useQuery } from "@tanstack/react-query";
import { Game, Player, Registration } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

/**
 * Custom hook for fetching all games
 * 
 * @returns Query with all games data
 */
export const useGames = () => {
  const { toast } = useToast();
  
  return useQuery<Game[]>({
    queryKey: ['/api/games'],
    onError: (error) => {
      toast({
        title: "Failed to load games",
        description: error.message,
        variant: "destructive"
      });
    }
  });
};

/**
 * Custom hook for fetching a single game by ID
 * 
 * @param id - Game ID
 * @returns Query with game data
 */
export const useGame = (id: number | undefined) => {
  const { toast } = useToast();
  
  return useQuery<Game>({
    queryKey: [`/api/games/${id}`],
    enabled: id !== undefined,
    onError: (error) => {
      toast({
        title: "Failed to load game",
        description: error.message,
        variant: "destructive"
      });
    }
  });
};

/**
 * Custom hook for fetching the upcoming game
 * 
 * @returns Query with upcoming game data
 */
export const useUpcomingGame = () => {
  const { toast } = useToast();
  
  return useQuery<Game>({
    queryKey: ['/api/games/upcoming'],
    onError: (error) => {
      toast({
        title: "Failed to load upcoming game",
        description: error.message,
        variant: "destructive"
      });
    }
  });
};

/**
 * Custom hook for fetching teams for a specific game
 * 
 * @param gameId - Game ID
 * @returns Query with teams data
 */
export const useGameTeams = (gameId: number | undefined) => {
  const { toast } = useToast();
  
  return useQuery<{ whiteTeam: number[]; blackTeam: number[] }>({
    queryKey: [`/api/games/${gameId}/teams`],
    enabled: gameId !== undefined,
    onError: (error) => {
      toast({
        title: "Failed to load teams",
        description: error.message,
        variant: "destructive"
      });
    }
  });
};

/**
 * Custom hook for fetching all registrations for a game with player details
 * 
 * @param gameId - Game ID
 * @returns Query with registrations including player details
 */
export const useGameRegistrations = (gameId: number | undefined) => {
  const { toast } = useToast();
  
  return useQuery<(Registration & { player: Player })[]>({
    queryKey: [`/api/games/${gameId}/registrations`],
    enabled: gameId !== undefined,
    onError: (error) => {
      toast({
        title: "Failed to load registrations",
        description: error.message,
        variant: "destructive"
      });
    }
  });
};
