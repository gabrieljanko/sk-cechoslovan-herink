export interface PenaltyCalculation {
  amount: number;
  reason: string;
}

export function calculatePenalty(gameDate: Date, withdrawalTime: Date = new Date()): PenaltyCalculation {
  const gameDateOnly = new Date(gameDate.getFullYear(), gameDate.getMonth(), gameDate.getDate());
  const withdrawalDateOnly = new Date(withdrawalTime.getFullYear(), withdrawalTime.getMonth(), withdrawalTime.getDate());
  
  // Calculate the difference in days
  const daysDiff = Math.floor((gameDateOnly.getTime() - withdrawalDateOnly.getTime()) / (1000 * 60 * 60 * 24));
  
  // Day before game (until 11:59 PM) - 50 CZK
  if (daysDiff >= 1) {
    return {
      amount: 50,
      reason: "late_withdrawal_day_before"
    };
  }
  
  // Day of game
  if (daysDiff === 0) {
    const withdrawalHour = withdrawalTime.getHours();
    
    // 12:00 AM - 11:59 AM (morning) - 100 CZK
    if (withdrawalHour < 12) {
      return {
        amount: 100,
        reason: "late_withdrawal_day_of_morning"
      };
    }
    
    // 12:00 PM and later (afternoon/evening) - 200 CZK
    return {
      amount: 200,
      reason: "late_withdrawal_day_of_afternoon"
    };
  }
  
  // Game already passed - no penalty
  return {
    amount: 0,
    reason: "no_penalty"
  };
}