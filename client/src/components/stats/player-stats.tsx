import { useQuery, useMutation } from "@tanstack/react-query";
import { Player } from "@shared/schema";
import { usePlayers } from "@/lib/hooks/use-players";
import { useState } from "react";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/components/ui/language-provider";

export function PlayerStats() {
  const [sortBy, setSortBy] = useState<keyof Player>('overallSkill');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const { toast } = useToast();
  const { t } = useLanguage();
  
  // Use the new stats endpoint that calculates player statistics from game results
  const { data: players, isLoading } = useQuery({
    queryKey: ['/api/players/stats'],
    retry: 1
  });
  
  // Mutation for recalculating all player statistics
  const recalculateStatsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/stats/recalculate');
    },
    onSuccess: (data: any) => {
      // Invalidate player stats data to refresh the stats
      queryClient.invalidateQueries({ queryKey: ['/api/players/stats'] });
      toast({
        title: t("Statistics recalculated"),
        description: `${t("Successfully processed")} ${data.gamesProcessed || 0} ${t("games and updated statistics for")} ${data.players || 0} ${t("players.")}`
      });
    },
    onError: (error: any) => {
      toast({
        title: t("Failed to recalculate statistics"),
        description: error.message || t("An error occurred while recalculating player statistics."),
        variant: "destructive"
      });
    }
  });
  
  const handleSort = (field: keyof Player) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };
  
  const sortedPlayers = players ? [...players].sort((a, b) => {
    const valueA = a[sortBy];
    const valueB = b[sortBy];
    
    if (typeof valueA === 'number' && typeof valueB === 'number') {
      return sortOrder === 'asc' ? valueA - valueB : valueB - valueA;
    } else if (valueA && valueB) {
      return sortOrder === 'asc' 
        ? String(valueA).localeCompare(String(valueB))
        : String(valueB).localeCompare(String(valueA));
    }
    return 0;
  }) : [];
  
  if (isLoading) {
    return (
      <div className="bg-white shadow rounded-lg overflow-hidden mb-6 animate-pulse">
        <div className="border-b border-gray-200 px-4 py-5 sm:px-6">
          <div className="h-5 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
        <div className="px-4 py-5 sm:p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  {[...Array(6)].map((_, i) => (
                    <th key={i} className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="h-3 bg-gray-200 rounded w-20"></div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {[...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(6)].map((_, j) => (
                      <td key={j} className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-full"></div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }
  
  if (!players || players.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
        <div className="border-b border-gray-200 px-4 py-5 sm:px-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900">{t("Player Statistics")}</h3>
          <p className="mt-1 text-sm text-gray-500">{t("Ranking of players based on performance")}</p>
        </div>
        <div className="px-4 py-5 sm:p-6">
          <p className="text-center text-gray-500 py-4">{t("No player statistics available.")}</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
      <div className="border-b border-gray-200 px-4 py-5 sm:px-6 flex justify-between items-start">
        <div>
          <h3 className="text-lg font-medium leading-6 text-gray-900">{t("Player Statistics")}</h3>
          <p className="mt-1 text-sm text-gray-500">{t("Ranking of players based on performance")}</p>
        </div>
        <Button 
          size="sm"
          variant="outline"
          className="flex items-center gap-1"
          onClick={() => recalculateStatsMutation.mutate()}
          disabled={recalculateStatsMutation.isPending}
        >
          <RefreshCw className={`h-3 w-3 ${recalculateStatsMutation.isPending ? 'animate-spin' : ''}`} />
          {recalculateStatsMutation.isPending ? t("Recalculating...") : t("Recalculate Stats")}
        </Button>
      </div>
      
      <div className="px-4 py-5 sm:p-6">
        <div className="flex flex-col">
          <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
              <div className="overflow-hidden border-b border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('name')}
                      >
                        {t("PLAYER")}
                        {sortBy === 'name' && (
                          <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('gamesPlayed')}
                      >
                        {t("GAMES")}
                        {sortBy === 'gamesPlayed' && (
                          <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('wins')}
                      >
                        {t("WINS")}
                        {sortBy === 'wins' && (
                          <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t("WIN %")}
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('plusMinus')}
                      >
                        +/-
                        {sortBy === 'plusMinus' && (
                          <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('overallSkill')}
                      >
                        {t("RATING")}
                        {sortBy === 'overallSkill' && (
                          <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sortedPlayers.map(player => {
                      const winPercentage = player.gamesPlayed > 0 
                        ? Math.round((player.wins / player.gamesPlayed) * 100) 
                        : 0;
                      
                      return (
                        <tr key={player.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <img 
                                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=random&color=fff&size=40`}
                                  alt={`${player.name} avatar`} 
                                  className="h-10 w-10 rounded-full" 
                                />
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {player.name}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {player.gamesPlayed}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {player.wins}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {winPercentage}%
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                            player.plusMinus > 0 
                              ? 'text-green-600' 
                              : player.plusMinus < 0 
                                ? 'text-red-600' 
                                : 'text-gray-500'
                          }`}>
                            {player.plusMinus > 0 ? `+${player.plusMinus}` : player.plusMinus}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">
                            {player.overallSkill.toFixed(1)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
