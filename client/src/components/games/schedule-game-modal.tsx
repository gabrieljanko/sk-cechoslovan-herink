import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { InsertGame } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/components/ui/language-provider";
import { cn } from "@/lib/utils";
import { CalendarIcon, Clock } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ScheduleGameModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ScheduleGameModal({ isOpen, onClose }: ScheduleGameModalProps) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [hour, setHour] = useState<string>("19");
  const [minute, setMinute] = useState<string>("00");
  
  const scheduleGameMutation = useMutation({
    mutationFn: async () => {
      if (!date) throw new Error("Date is required");
      
      // Set time on the selected date
      const gameDate = new Date(date);
      gameDate.setHours(parseInt(hour), parseInt(minute));
      
      // Convert the date to ISO string which will be parsed back to Date on the server
      const gameData = {
        date: gameDate.toISOString(),
        wasPlayed: false,
        whiteTeamScore: null,
        blackTeamScore: null,
        whiteTeam: [],
        blackTeam: [],
        registeredPlayers: []
      };
      
      return apiRequest('POST', '/api/games', gameData);
    },
    onSuccess: () => {
      // Invalidate all related queries to ensure UI updates
      queryClient.invalidateQueries({ queryKey: ['/api/games'] });
      queryClient.invalidateQueries({ queryKey: ['/api/games/upcoming'] });
      queryClient.invalidateQueries({ queryKey: ['/api/games/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/games/archived'] });
      
      toast({
        title: t("Game scheduled"),
        description: t("New game has been scheduled successfully."),
      });
      
      resetForm();
      onClose();
      
      // Small delay to allow server to process before refetching
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['/api/games/upcoming'] });
      }, 500);
    },
    onError: (error) => {
      toast({
        title: t("Failed to schedule game"),
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  const resetForm = () => {
    setDate(undefined);
    setHour("19");
    setMinute("00");
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate inputs
    if (!date) {
      toast({
        title: t("Invalid date"),
        description: t("Please select a date for the game."),
        variant: "destructive"
      });
      return;
    }
    
    scheduleGameMutation.mutate();
  };
  
  // Generate hour options (0-23)
  const hourOptions = Array.from({ length: 24 }, (_, i) => {
    const value = i.toString().padStart(2, '0');
    return (
      <SelectItem key={`hour-${value}`} value={value}>
        {value}
      </SelectItem>
    );
  });
  
  // Generate minute options (00, 15, 30, 45)
  const minuteOptions = ['00', '15', '30', '45'].map(value => (
    <SelectItem key={`minute-${value}`} value={value}>
      {value}
    </SelectItem>
  ));
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("Schedule New Game")}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <Label htmlFor="game-date" className="block text-sm font-medium text-gray-700 mb-2">
              {t("Game Date")}
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>{t("Select a date")}</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="mb-6">
            <Label className="block text-sm font-medium text-gray-700 mb-2">
              {t("Game Time")}
            </Label>
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-gray-400" />
              <Select value={hour} onValueChange={setHour}>
                <SelectTrigger className="w-24">
                  <SelectValue placeholder={t("Hour")} />
                </SelectTrigger>
                <SelectContent>
                  {hourOptions}
                </SelectContent>
              </Select>
              <span className="text-xl">:</span>
              <Select value={minute} onValueChange={setMinute}>
                <SelectTrigger className="w-24">
                  <SelectValue placeholder={t("Minute")} />
                </SelectTrigger>
                <SelectContent>
                  {minuteOptions}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={scheduleGameMutation.isPending}
            >
              {t("Cancel")}
            </Button>
            <Button 
              type="submit"
              disabled={scheduleGameMutation.isPending}
            >
              {scheduleGameMutation.isPending ? t("Scheduling...") : t("Schedule Game")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}