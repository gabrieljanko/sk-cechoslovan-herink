import { useQuery } from "@tanstack/react-query";
import { Game } from "@shared/schema";
import { useLanguage } from "@/components/ui/language-provider";

export function TeamStats() {
  const { t } = useLanguage();
  const { data: games, isLoading } = useQuery<Game[]>({
    queryKey: ['/api/games']
  });
  
  // Calculate team statistics
  const calculateTeamStats = () => {
    if (!games) return null;
    
    const playedGames = games.filter(game => game.wasPlayed);
    const totalGames = playedGames.length;
    const canceledGames = games.filter(game => !game.wasPlayed).length;
    
    let whiteWins = 0;
    let blackWins = 0;
    let draws = 0;
    let totalWhiteScore = 0;
    let totalBlackScore = 0;
    let totalPlayers = 0;
    
    playedGames.forEach(game => {
      if (game.whiteTeamScore !== undefined && game.blackTeamScore !== undefined) {
        totalWhiteScore += game.whiteTeamScore;
        totalBlackScore += game.blackTeamScore;
        
        if (game.whiteTeamScore > game.blackTeamScore) {
          whiteWins++;
        } else if (game.whiteTeamScore < game.blackTeamScore) {
          blackWins++;
        } else {
          draws++;
        }
      }
      
      // Count players in white and black teams who actually played
      const whiteTeamSize = Array.isArray(game.whiteTeam) ? game.whiteTeam.length : 0;
      const blackTeamSize = Array.isArray(game.blackTeam) ? game.blackTeam.length : 0;
      totalPlayers += whiteTeamSize + blackTeamSize;
    });
    
    const avgPlayersPerGame = totalPlayers / (totalGames || 1);
    const whiteWinRate = (whiteWins / (totalGames || 1)) * 100;
    const blackWinRate = (blackWins / (totalGames || 1)) * 100;
    const drawRate = (draws / (totalGames || 1)) * 100;
    const avgWhiteScore = totalWhiteScore / (totalGames || 1);
    const avgBlackScore = totalBlackScore / (totalGames || 1);
    const totalGoals = totalWhiteScore + totalBlackScore;
    
    return {
      totalGames,
      canceledGames,
      whiteWins,
      blackWins,
      draws,
      whiteWinRate,
      blackWinRate,
      drawRate,
      avgWhiteScore,
      avgBlackScore,
      avgPlayersPerGame,
      totalGoals
    };
  };
  
  const stats = calculateTeamStats();
  
  if (isLoading) {
    return (
      <div className="bg-white shadow rounded-lg overflow-hidden mb-6 animate-pulse">
        <div className="border-b border-gray-200 px-4 py-5 sm:px-6">
          <div className="h-5 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
        <div className="px-4 py-5 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-60 bg-gray-200 rounded"></div>
            <div className="h-60 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }
  
  if (!games || games.length === 0 || !stats) {
    return (
      <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
        <div className="border-b border-gray-200 px-4 py-5 sm:px-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900">{t("Team Performance")}</h3>
          <p className="mt-1 text-sm text-gray-500">{t("Win rates and performance statistics")}</p>
        </div>
        <div className="px-4 py-5 sm:p-6">
          <p className="text-center text-gray-500 py-4">{t("No team statistics available.")}</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
      <div className="border-b border-gray-200 px-4 py-5 sm:px-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900">{t("Team Performance")}</h3>
        <p className="mt-1 text-sm text-gray-500">{t("Win rates and performance statistics")}</p>
      </div>
      
      <div className="px-4 py-5 sm:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-lg font-medium mb-4">{t("Overall Results")}</h4>
            <div className="rounded-lg mb-4 h-40 w-full bg-gradient-to-r from-blue-100 to-blue-50 flex items-center justify-center p-4">
              <div className="flex items-center space-x-8">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{stats.whiteWins}</div>
                  <div className="text-sm text-gray-600">{t("White Wins")}</div>
                </div>
                <div className="text-lg font-bold text-gray-500">{t("vs")}</div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-800">{stats.blackWins}</div>
                  <div className="text-sm text-gray-600">{t("Black Wins")}</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-600">{stats.draws}</div>
                  <div className="text-sm text-gray-600">{t("Draws")}</div>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">{t("Total Games")}</p>
                  <p className="text-xl font-bold">{stats.totalGames}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{t("Canceled Games")}</p>
                  <p className="text-xl font-bold">{stats.canceledGames}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{t("Goals Scored")}</p>
                  <p className="text-xl font-bold">{stats.totalGoals}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{t("Avg. Players/Game")}</p>
                  <p className="text-xl font-bold">{stats.avgPlayersPerGame.toFixed(1)}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="text-lg font-medium mb-4">{t("Team Comparison")}</h4>
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium">{t("Team White")}</p>
                    <p className="text-2xl font-bold">{stats.whiteWins}</p>
                    <p className="text-xs text-gray-500">{t("wins")}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t("Team Black")}</p>
                    <p className="text-2xl font-bold">{stats.blackWins}</p>
                    <p className="text-xs text-gray-500">{t("wins")}</p>
                  </div>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full">
                  <div 
                    className="h-3 bg-blue-600 rounded-full" 
                    style={{ width: `${stats.whiteWinRate}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 text-center mt-1">
                  {stats.whiteWinRate.toFixed(0)}% {t("White Win Rate")}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-500">{t("White Avg. Score")}</p>
                  <p className="text-xl font-bold">{stats.avgWhiteScore.toFixed(1)}</p>
                  <div className="w-full h-3 bg-gray-100 rounded-full mt-2">
                    <div 
                      className="h-3 bg-blue-600 rounded-full" 
                      style={{ width: `${stats.avgWhiteScore * 10}%` }}
                    ></div>
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-500">{t("Black Avg. Score")}</p>
                  <p className="text-xl font-bold">{stats.avgBlackScore.toFixed(1)}</p>
                  <div className="w-full h-3 bg-gray-100 rounded-full mt-2">
                    <div 
                      className="h-3 bg-blue-600 rounded-full" 
                      style={{ width: `${stats.avgBlackScore * 10}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <p className="text-sm font-medium mb-2">
                  {t("Draws:")} {stats.draws} {t("games")} ({stats.drawRate.toFixed(0)}%)
                </p>
                <div className="w-full h-3 bg-gray-100 rounded-full">
                  <div 
                    className="h-3 bg-yellow-400 rounded-full" 
                    style={{ width: `${stats.drawRate}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
