import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/components/ui/language-provider";
import { ChevronDown, X } from "lucide-react";
import qr50Image from "@assets/qr-50.jpg";
import qr100Image from "@assets/qr-100.jpg";
import qr200Image from "@assets/qr-200.jpg";

export function ManualPenaltySelector() {
  const { t } = useLanguage();
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);

  const getQRImage = (amount: number) => {
    switch (amount) {
      case 50:
        return qr50Image;
      case 100:
        return qr100Image;
      case 200:
        return qr200Image;
      default:
        return qr50Image;
    }
  };

  const handlePenaltySelect = (amount: number) => {
    setSelectedAmount(amount);
    setShowQRModal(true);
  };

  const handleCloseModal = () => {
    setShowQRModal(false);
    setSelectedAmount(null);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="sm"
            className="mb-3 text-xs"
          >
            {t("Show QR for penalties")}
            <ChevronDown className="h-3 w-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => handlePenaltySelect(50)}>
            50 CZK
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handlePenaltySelect(100)}>
            100 CZK
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handlePenaltySelect(200)}>
            200 CZK
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* QR Code Modal */}
      <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
        <DialogContent className="max-w-md mx-auto">
          <DialogHeader className="relative">
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0"
              onClick={handleCloseModal}
            >
              <X className="h-4 w-4" />
            </Button>
            <DialogTitle className="text-center">
              {t("Payment QR Code")}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col items-center space-y-4">
            {selectedAmount && (
              <img 
                src={getQRImage(selectedAmount)} 
                alt={`QR Code for ${selectedAmount} CZK payment`}
                className="w-full max-w-sm rounded-lg"
              />
            )}
            
            <div className="text-center space-y-2">
              <p className="text-lg font-semibold">{selectedAmount} CZK</p>
              <p className="text-sm text-gray-600">
                {t("Scan the QR code with your banking app to pay the penalty")}
              </p>
            </div>

            <Button 
              onClick={handleCloseModal}
              className="w-full mt-6"
            >
              {t("Done")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}