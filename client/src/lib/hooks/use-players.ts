import { useQuery } from "@tanstack/react-query";
import { Player } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

/**
 * Custom hook for fetching all players
 * 
 * @returns Query with all players data
 */
export const usePlayers = () => {
  const { toast } = useToast();
  
  return useQuery<Player[]>({
    queryKey: ['/api/players'],
    onError: (error) => {
      toast({
        title: "Failed to load players",
        description: error.message,
        variant: "destructive"
      });
    }
  });
};

/**
 * Custom hook for fetching all players with statistics
 * 
 * @returns Query with all players including up-to-date statistics
 */
export const usePlayersWithStats = () => {
  const { toast } = useToast();
  
  return useQuery<Player[]>({
    queryKey: ['/api/players/stats'],
    onError: (error) => {
      toast({
        title: "Failed to load player statistics",
        description: error.message,
        variant: "destructive"
      });
    }
  });
};

/**
 * Custom hook for fetching a single player by ID
 * 
 * @param id - Player ID
 * @returns Query with player data
 */
export const usePlayer = (id: number | undefined) => {
  const { toast } = useToast();
  
  return useQuery<Player>({
    queryKey: [`/api/players/${id}`],
    enabled: id !== undefined,
    onError: (error) => {
      toast({
        title: "Failed to load player",
        description: error.message,
        variant: "destructive"
      });
    }
  });
};

/**
 * Custom hook for fetching registered players for a specific game
 * 
 * @param gameId - Game ID
 * @returns Query with registered players
 */
export const useRegisteredPlayers = (gameId: number | undefined) => {
  const { toast } = useToast();
  
  return useQuery<Player[]>({
    queryKey: [`/api/games/${gameId}/players`],
    enabled: gameId !== undefined,
    onError: (error) => {
      toast({
        title: "Failed to load registered players",
        description: error.message,
        variant: "destructive"
      });
    }
  });
};
