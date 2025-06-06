import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Pagination } from "@/components/ui/pagination";
import { PlayerCard } from "@/components/ui/player-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, UserPlus } from "lucide-react";
import { Player } from "@shared/schema";
import { EditPlayerModal } from "@/components/players/edit-player-modal";
import { AddPlayerModal } from "@/components/players/add-player-modal";
import { DeletePlayerModal } from "@/components/players/delete-player-modal";
import { usePlayers, usePlayersWithStats } from "@/lib/hooks/use-players";
import { useLanguage } from "@/components/ui/language-provider";

export function PlayersList() {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [deletingPlayer, setDeletingPlayer] = useState<Player | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  // Use the stats endpoint to get accurate game statistics
  const { data: players, isLoading } = usePlayersWithStats();
  
  // Filter players by search term
  const filteredPlayers = players?.filter(player => 
    player.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Pagination
  const playersPerPage = 5;
  const totalPages = Math.ceil((filteredPlayers?.length || 0) / playersPerPage);
  const paginatedPlayers = filteredPlayers?.slice(
    (currentPage - 1) * playersPerPage,
    currentPage * playersPerPage
  );
  
  const handleEditClick = (player: Player) => {
    setEditingPlayer(player);
    setIsEditModalOpen(true);
  };
  
  const handleDeleteClick = (player: Player) => {
    setDeletingPlayer(player);
    setIsDeleteModalOpen(true);
  };
  
  if (isLoading) {
    return (
      <div className="bg-white shadow rounded-lg overflow-hidden mb-6 animate-pulse">
        <div className="border-b border-gray-200 px-4 py-5 sm:px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="h-5 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
          <div className="mt-3 sm:mt-0">
            <div className="h-10 bg-gray-200 rounded w-40"></div>
          </div>
        </div>
        
        <ul className="divide-y divide-gray-200">
          {[...Array(5)].map((_, i) => (
            <li key={i} className="px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                  <div className="ml-4">
                    <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-20"></div>
                  </div>
                </div>
                <div className="h-6 w-14 bg-gray-200 rounded"></div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4">
                {[...Array(4)].map((_, j) => (
                  <div key={j}>
                    <div className="flex justify-between mb-1">
                      <div className="h-3 bg-gray-200 rounded w-16"></div>
                      <div className="h-3 bg-gray-200 rounded w-6"></div>
                    </div>
                    <div className="h-2 bg-gray-200 rounded w-full"></div>
                  </div>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  
  return (
    <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
      <div className="border-b border-gray-200 px-4 py-5 sm:px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-medium leading-6 text-gray-900">{t("Players")}</h3>
          <p className="mt-1 text-sm text-gray-500">{t("Total")}: {players?.length || 0} {t("players")}</p>
        </div>
        <div className="mt-3 sm:mt-0 flex space-x-3">
          <div className="relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <Input 
              type="text"
              id="player-search"
              placeholder={t("Search players")}
              className="pl-10"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1); // Reset to first page on search
              }}
            />
          </div>
          <Button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center space-x-1"
          >
            <UserPlus className="h-4 w-4 mr-1" />
            {t("Add Player")}
          </Button>
        </div>
      </div>
      
      {paginatedPlayers?.length === 0 ? (
        <div className="px-4 py-5 sm:p-6 text-center text-gray-500">
          {t("No players found matching")} "{searchTerm}".
        </div>
      ) : (
        <>
          <ul className="divide-y divide-gray-200">
            {paginatedPlayers?.map(player => (
              <PlayerCard 
                key={player.id} 
                player={player} 
                onEditClick={() => handleEditClick(player)}
                onDeleteClick={() => handleDeleteClick(player)}
              />
            ))}
          </ul>
          
          {totalPages > 1 && (
            <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
              <nav className="flex justify-between">
                <div className="w-0 flex-1 flex">
                  <button 
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed" 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(page => Math.max(page - 1, 1))}
                  >
                    {t("Previous")}
                  </button>
                </div>
                <div className="hidden md:flex">
                  <span className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-500">
                    {t("Page")} {currentPage} {t("of")} {totalPages}
                  </span>
                </div>
                <div className="w-0 flex-1 flex justify-end">
                  <button 
                    className="ml-3 inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(page => Math.min(page + 1, totalPages))}
                  >
                    {t("Next")}
                  </button>
                </div>
              </nav>
            </div>
          )}
        </>
      )}
      
      {/* Edit Player Modal */}
      <EditPlayerModal 
        player={editingPlayer}
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
      />
      
      {/* Add Player Modal */}
      <AddPlayerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
      
      {/* Delete Player Modal */}
      <DeletePlayerModal
        player={deletingPlayer}
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
      />
    </div>
  );
}
