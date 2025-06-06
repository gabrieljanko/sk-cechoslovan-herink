import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InsertPlayer } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/components/ui/language-provider";

interface AddPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddPlayerModal({ isOpen, onClose }: AddPlayerModalProps) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [offenseSkill, setOffenseSkill] = useState<number>(5);
  const [defenseSkill, setDefenseSkill] = useState<number>(5);
  const [ballHandlingSkill, setBallHandlingSkill] = useState<number>(5);
  const [overallSkill, setOverallSkill] = useState<number>(5);
  
  // Calculate overall skill as the average of the three skills
  useEffect(() => {
    const calculated = parseFloat(((offenseSkill + defenseSkill + ballHandlingSkill) / 3).toFixed(1));
    setOverallSkill(calculated);
  }, [offenseSkill, defenseSkill, ballHandlingSkill]);
  
  const addPlayerMutation = useMutation({
    mutationFn: async () => {
      const playerData: InsertPlayer = {
        name,
        offenseSkill,
        defenseSkill,
        ballHandlingSkill,
        overallSkill
      };
      
      return apiRequest('POST', '/api/players', playerData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/players'] });
      toast({
        title: t("Player added"),
        description: t("New player has been added successfully."),
      });
      resetForm();
      onClose();
      // Refresh page to show updated player list
      setTimeout(() => {
        window.location.reload();
      }, 500);
    },
    onError: (error) => {
      toast({
        title: t("Failed to add player"),
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  const resetForm = () => {
    setName("");
    setOffenseSkill(5);
    setDefenseSkill(5);
    setBallHandlingSkill(5);
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate inputs
    if (!name.trim()) {
      toast({
        title: t("Invalid name"),
        description: t("Player name cannot be empty."),
        variant: "destructive"
      });
      return;
    }
    
    const validateSkill = (skill: number, label: string) => {
      if (skill < 1 || skill > 10 || isNaN(skill)) {
        toast({
          title: t(`Invalid ${label}`),
          description: t(`${label} must be between 1 and 10.`),
          variant: "destructive"
        });
        return false;
      }
      return true;
    };
    
    if (!validateSkill(offenseSkill, "offense skill") ||
        !validateSkill(defenseSkill, "defense skill") ||
        !validateSkill(ballHandlingSkill, "ball handling skill")) {
      return;
    }
    
    addPlayerMutation.mutate();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("Add New Player")}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <Label htmlFor="player-name" className="block text-sm font-medium text-gray-700 mb-1">
              {t("Name")}
            </Label>
            <Input 
              id="player-name" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={addPlayerMutation.isPending}
              placeholder={t("Enter player name")}
              className="w-full"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <Label htmlFor="offense-rating" className="block text-sm font-medium text-gray-700 mb-1">
                {t("Offense Rating (1-10)")}
              </Label>
              <Input 
                id="offense-rating"
                type="number"
                min="1"
                max="10"
                step="0.1"
                value={offenseSkill}
                onChange={(e) => setOffenseSkill(parseFloat(e.target.value) || 5)}
                disabled={addPlayerMutation.isPending}
              />
            </div>
            <div>
              <Label htmlFor="defense-rating" className="block text-sm font-medium text-gray-700 mb-1">
                {t("Defense Rating (1-10)")}
              </Label>
              <Input 
                id="defense-rating"
                type="number"
                min="1"
                max="10"
                step="0.1"
                value={defenseSkill}
                onChange={(e) => setDefenseSkill(parseFloat(e.target.value) || 5)}
                disabled={addPlayerMutation.isPending}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <Label htmlFor="ball-handling" className="block text-sm font-medium text-gray-700 mb-1">
                {t("Ball Handling (1-10)")}
              </Label>
              <Input 
                id="ball-handling"
                type="number"
                min="1"
                max="10"
                step="0.1"
                value={ballHandlingSkill}
                onChange={(e) => setBallHandlingSkill(parseFloat(e.target.value) || 5)}
                disabled={addPlayerMutation.isPending}
              />
            </div>
            <div>
              <Label htmlFor="overall-rating" className="block text-sm font-medium text-gray-700 mb-1">
                {t("Overall Rating")}
              </Label>
              <Input 
                id="overall-rating"
                type="number"
                value={overallSkill}
                className="bg-gray-100"
                disabled
              />
            </div>
          </div>
          
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={addPlayerMutation.isPending}
            >
              {t("Cancel")}
            </Button>
            <Button 
              type="submit"
              disabled={addPlayerMutation.isPending}
            >
              {addPlayerMutation.isPending ? t("Adding...") : t("Add Player")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}