import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/ui/language-provider";
import { X } from "lucide-react";
import qr50Image from "@assets/qr-50.jpg";
import qr100Image from "@assets/qr-100.jpg";
import qr200Image from "@assets/qr-200.jpg";

interface PenaltyPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  gameDate: Date;
  withdrawalTime: Date;
}

export function PenaltyPaymentModal({ 
  isOpen, 
  onClose, 
  amount, 
  gameDate, 
  withdrawalTime 
}: PenaltyPaymentModalProps) {
  const { t } = useLanguage();
  const [showQRCode, setShowQRCode] = useState(false);

  const getQRImage = () => {
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

  const formatGameDate = (date: Date) => {
    return new Intl.DateTimeFormat('cs-CZ', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (showQRCode) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md mx-auto">
          <DialogHeader className="relative">
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0"
              onClick={() => setShowQRCode(false)}
            >
              <X className="h-4 w-4" />
            </Button>
            <DialogTitle className="text-center">
              {t("Payment QR Code")}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col items-center space-y-4">
            <img 
              src={getQRImage()} 
              alt={`QR Code for ${amount} CZK payment`}
              className="w-full max-w-sm rounded-lg"
            />
            
            <div className="text-center space-y-2">
              <p className="text-lg font-semibold">{amount} CZK</p>
              <p className="text-sm text-gray-600">
                {t("Scan the QR code with your banking app to pay the penalty")}
              </p>
            </div>

            <div className="flex space-x-3 mt-6">
              <Button 
                variant="outline" 
                onClick={() => setShowQRCode(false)}
                className="flex-1"
              >
                {t("Back")}
              </Button>
              <Button 
                onClick={onClose}
                className="flex-1"
              >
                {t("Done")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-lg font-semibold">
            {t("Thanks for withdrawing!")}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600">
              {t("Game")}: {formatGameDate(gameDate)}
            </p>
            <p className="text-base">
              {t("Based on withdrawal timing, the penalty is")} <span className="font-bold">{amount} CZK</span>.
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 text-center">
              {t("Do you want to pay the penalty now?")}
            </p>
          </div>

          <div className="flex space-x-3">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="flex-1"
            >
              {t("No, later")}
            </Button>
            <Button 
              onClick={() => setShowQRCode(true)}
              className="flex-1"
            >
              {t("Yes, pay now")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}