import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Player } from "@shared/schema";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/ui/language-provider";

interface TeamCardProps {
  team: "white" | "black";
  players: Player[];
  averageRating: number;
  benchPlayers?: Player[];
  playersPerTeam?: number;
}

export function TeamCard({ team, players, averageRating, benchPlayers = [], playersPerTeam = 5 }: TeamCardProps) {
  const { t } = useLanguage();
  return (
    <div className={cn(
      "border-2 rounded-lg overflow-hidden",
      team === "white" ? "border-gray-300" : "border-gray-800"
    )}>
      <div className={cn(
        "px-4 py-3 border-b",
        team === "white" 
          ? "bg-white border-gray-200"
          : "bg-gray-900 text-white border-gray-700"
      )}>
        <h3 className="text-lg font-bold">Team {team === "white" ? "White" : "Black"}</h3>
        <p className={cn(
          "text-sm",
          team === "white" ? "text-gray-500" : "text-gray-300"
        )}>
          Average Rating: {averageRating.toFixed(1)}
        </p>
      </div>
      <div>
        <div className={cn(
          "px-3 py-2 border-b",
          team === "white" ? "border-gray-200 bg-gray-100" : "border-gray-700 bg-gray-700 text-white"
        )}>
          <p className="text-sm font-semibold">{t("Team Players")} ({players.length + (benchPlayers?.length || 0)})</p>
        </div>
        <ul className={cn(
          "divide-y",
          team === "white"
            ? "divide-gray-200 bg-gray-50"
            : "divide-gray-700 bg-gray-800"
        )}>
          {/* All main team players */}
          {players.map((player) => (
            <li 
              key={player.id} 
              className={cn(
                "px-4 py-3 flex items-center justify-between",
                team === "black" && "text-white"
              )}
            >
              <div>
                <p className={cn(
                  "text-sm font-medium",
                  team === "white" ? "text-gray-900" : ""
                )}>
                  {player.name}
                </p>
                <div className={cn(
                  "flex space-x-2 text-xs",
                  team === "white" ? "text-gray-500" : "text-gray-300"
                )}>
                  <span>Off: {player.offenseSkill.toFixed(1)}</span>
                  <span>Def: {player.defenseSkill.toFixed(1)}</span>
                  <span>Ball: {player.ballHandlingSkill.toFixed(1)}</span>
                </div>
              </div>
              <span className="text-sm font-bold">{player.overallSkill.toFixed(1)}</span>
            </li>
          ))}
          
          {/* Additional bench players */}
          {benchPlayers && benchPlayers.map((player) => (
            <li 
              key={player.id} 
              className={cn(
                "px-4 py-3 flex items-center justify-between",
                team === "black" && "text-white"
              )}
            >
              <div>
                <p className={cn(
                  "text-sm font-medium",
                  team === "white" ? "text-gray-900" : ""
                )}>
                  {player.name}
                </p>
                <div className={cn(
                  "flex space-x-2 text-xs",
                  team === "white" ? "text-gray-500" : "text-gray-300"
                )}>
                  <span>Off: {player.offenseSkill.toFixed(1)}</span>
                  <span>Def: {player.defenseSkill.toFixed(1)}</span>
                  <span>Ball: {player.ballHandlingSkill.toFixed(1)}</span>
                </div>
              </div>
              <span className="text-sm font-bold">{player.overallSkill.toFixed(1)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
