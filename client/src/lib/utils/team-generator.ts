import { Player } from "@shared/schema";

/**
 * Generates balanced teams from a list of players
 * Uses a modified snake draft algorithm to create fair teams
 *
 * @param players Array of players to divide into teams
 * @returns Object containing whiteTeam and blackTeam arrays
 */
export const generateBalancedTeams = (
  players: Player[]
): { whiteTeam: Player[]; blackTeam: Player[] } => {
  if (!players || players.length < 2) {
    return { whiteTeam: [], blackTeam: [] };
  }

  // Sort players by overall skill (descending order)
  const sortedPlayers = [...players].sort((a, b) => b.overallSkill - a.overallSkill);

  // Initialize teams
  const whiteTeam: Player[] = [];
  const blackTeam: Player[] = [];
  let whiteTeamSkill = 0;
  let blackTeamSkill = 0;

  // Distribute players using a modified snake draft approach
  sortedPlayers.forEach((player, index) => {
    // For odd indices (0, 2, 4...), add to white team if white skill is less than or equal to black skill
    // For even indices (1, 3, 5...), add to black team if black skill is less than white skill
    if ((whiteTeamSkill <= blackTeamSkill && index % 2 === 0) || 
        (whiteTeamSkill < blackTeamSkill && index % 2 === 1)) {
      whiteTeam.push(player);
      whiteTeamSkill += player.overallSkill;
    } else {
      blackTeam.push(player);
      blackTeamSkill += player.overallSkill;
    }
  });

  // For odd number of players, verify if swapping would balance better
  if (sortedPlayers.length % 2 === 1 && Math.abs(whiteTeamSkill - blackTeamSkill) > 1) {
    // Try swapping the mid-range players to optimize balance
    for (let i = Math.floor(sortedPlayers.length / 3); i < 2 * Math.floor(sortedPlayers.length / 3); i++) {
      // Find a player from each team that would improve balance if swapped
      const whitePlayer = whiteTeam.find(p => p.id === sortedPlayers[i].id);
      const blackPlayer = blackTeam.find(p => p.id === sortedPlayers[i+1]?.id);
      
      if (whitePlayer && blackPlayer) {
        const newWhiteSkill = whiteTeamSkill - whitePlayer.overallSkill + blackPlayer.overallSkill;
        const newBlackSkill = blackTeamSkill - blackPlayer.overallSkill + whitePlayer.overallSkill;
        
        if (Math.abs(newWhiteSkill - newBlackSkill) < Math.abs(whiteTeamSkill - blackTeamSkill)) {
          // Swap players
          whiteTeam.splice(whiteTeam.indexOf(whitePlayer), 1, blackPlayer);
          blackTeam.splice(blackTeam.indexOf(blackPlayer), 1, whitePlayer);
          break;
        }
      }
    }
  }

  return { whiteTeam, blackTeam };
};

/**
 * Calculates the average skill rating for a team of players
 * 
 * @param players Array of players in the team
 * @returns Average overall skill rating
 */
export const calculateTeamAverageRating = (players: Player[]): number => {
  if (!players || players.length === 0) return 0;
  
  const totalSkill = players.reduce((sum, player) => sum + player.overallSkill, 0);
  return parseFloat((totalSkill / players.length).toFixed(1));
};

/**
 * Calculates an adjusted skill rating based on game performance
 * 
 * @param currentSkill Current skill value
 * @param isWinner Whether the player was on the winning team
 * @param scoreDiff The score difference (absolute value)
 * @returns Adjusted skill value
 */
export const calculateAdjustedSkill = (
  currentSkill: number,
  isWinner: boolean,
  scoreDiff: number
): number => {
  // Skip adjustments for draws
  if (scoreDiff === 0) return currentSkill;
  
  // Calculate adjustment factor (0.05 per goal difference, max 0.2)
  const adjustmentFactor = Math.min(Math.abs(scoreDiff) * 0.05, 0.2);
  
  // Winners get a boost, losers get a penalty
  const multiplier = isWinner ? 1 : -1;
  const adjustment = adjustmentFactor * multiplier;
  
  // Adjust skill (with limits to prevent going out of 1-10 range)
  return Math.max(1, Math.min(10, currentSkill + adjustment));
};
