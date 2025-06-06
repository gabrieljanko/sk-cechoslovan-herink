import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation } from "@tanstack/react-query";
import { Player } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/components/ui/language-provider";

interface DeletePlayerModalProps {
  player: Player | null;
  isOpen: boolean;
  onClose: () => void;
}

export function DeletePlayerModal({ player, isOpen, onClose }: DeletePlayerModalProps) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [confirmationText, setConfirmationText] = useState("");
  const [error, setError] = useState<string | null>(null);
  
  const deletePlayerMutation = useMutation({
    mutationFn: async () => {
      if (!player) return;
      
      return apiRequest(
        "DELETE", 
        `/api/players/${player.id}?confirmationCode=SKCechoslovan`, 
        undefined
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/players'] });
      toast({
        title: t("Player deleted"),
        description: t("The player has been successfully deleted."),
      });
      handleClose();
      // Refresh page to show updated player list
      setTimeout(() => {
        window.location.reload();
      }, 500);
    },
    onError: (error: any) => {
      toast({
        title: t("Error"),
        description: error.message || t("Failed to delete player"),
        variant: "destructive"
      });
    }
  });
  
  const handleClose = () => {
    setConfirmationText("");
    setError(null);
    onClose();
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (confirmationText !== "SKCechoslovan") {
      setError(t("Please enter the exact confirmation text 'SKCechoslovan' to confirm deletion."));
      return;
    }
    
    deletePlayerMutation.mutate();
  };
  
  if (!player) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-red-600">
            {t("Delete Player")}
          </DialogTitle>
          <DialogDescription>
            {t("You are about to delete")} <strong className="font-bold">{player.name}</strong>. {t("This action cannot be undone. All player statistics and registrations will be permanently removed from the system.")}
          </DialogDescription>
        </DialogHeader>
        
        <div className="bg-red-50 border border-red-200 rounded-md p-3 mt-4">
          <p className="text-sm text-red-800">
            {t("To confirm deletion, please type")} <span className="font-mono font-semibold">SKCechoslovan</span> {t("in the field below.")}
          </p>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="mt-4">
            <Label htmlFor="confirmation-text" className="text-sm font-medium text-gray-700 mb-1">
              {t("Confirmation Text")}
            </Label>
            <Input
              id="confirmation-text"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              placeholder="SKCechoslovan"
              disabled={deletePlayerMutation.isPending}
              className={error ? "border-red-500" : ""}
            />
            {error && (
              <div className="mt-1 text-xs text-red-600">
                {error}
              </div>
            )}
          </div>
          
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={deletePlayerMutation.isPending}
            >
              {t("Cancel")}
            </Button>
            <Button 
              type="submit" 
              className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
              disabled={deletePlayerMutation.isPending || confirmationText !== "SKCechoslovan"}
            >
              {deletePlayerMutation.isPending 
                ? t("Deleting...") 
                : t("Delete Player")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}