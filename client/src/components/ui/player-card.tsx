import { Player } from "@shared/schema";
import { SkillBar } from "@/components/ui/skill-bar";
import { Button } from "@/components/ui/button";
import { Edit, Calendar, CheckCircle, CircleDot, Trash2, MoreVertical } from "lucide-react";
import { formatDistance } from "date-fns";
import { cs } from "date-fns/locale";
import { useLanguage } from "@/components/ui/language-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PlayerCardProps {
  player: Player;
  onEditClick: () => void;
  onDeleteClick: () => void;
}

export function PlayerCard({ player, onEditClick, onDeleteClick }: PlayerCardProps) {
  const { t, language } = useLanguage();
  
  return (
    <li className="px-4 py-4 sm:px-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <img 
            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=random&color=fff&size=60`} 
            alt={`${player.name}'s avatar`} 
            className="h-10 w-10 rounded-full object-cover" 
          />
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">{player.name}</div>
            <div className="text-xs text-gray-500">
              {t("Joined")}: {formatDistance(new Date(player.joinedDate), new Date(), { 
                addSuffix: true,
                locale: language === 'cs' ? cs : undefined 
              })}
            </div>
          </div>
        </div>
        <div className="ml-2 flex-shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEditClick}>
                <Edit className="h-4 w-4 mr-2" />
                {t("Edit")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDeleteClick} className="text-red-600">
                <Trash2 className="h-4 w-4 mr-2" />
                {t("Delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mt-2 sm:flex sm:justify-between">
        <div className="sm:flex">
          <div className="flex items-center text-sm text-gray-500">
            <Calendar className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
            <p>{t("Games")}: {player.gamesPlayed}</p>
          </div>
          <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
            <CheckCircle className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
            <p>{t("Wins")}: {player.wins}</p>
          </div>
          <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
            <CircleDot className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
            <p className={player.plusMinus > 0 ? "text-green-600" : player.plusMinus < 0 ? "text-red-600" : ""}>
              +/-: {player.plusMinus > 0 ? `+${player.plusMinus}` : player.plusMinus}
            </p>
          </div>
        </div>
      </div>
      
      <div className="mt-4 grid grid-cols-2 gap-4">
        <SkillBar label={t("Offense")} value={player.offenseSkill} />
        <SkillBar label={t("Defense")} value={player.defenseSkill} />
        <SkillBar label={t("Ball Handling")} value={player.ballHandlingSkill} />
        <SkillBar label={t("Overall")} value={player.overallSkill} />
      </div>
    </li>
  );
}
