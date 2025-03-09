'use client';

import { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

// チームの型定義
interface Team {
  id: string;
  name: string;
  created_at: string;
}

interface TeamSelectorProps {
  teams: Team[];
  selectedTeamId: string;
  onTeamChange: (teamId: string) => void;
}

export function TeamSelector({ teams, selectedTeamId, onTeamChange }: TeamSelectorProps) {
  const selectedTeam = teams.find(team => team.id === selectedTeamId) || teams[0];

  return (
    <div className="mb-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="flex items-center gap-2">
            {selectedTeam?.name || 'チームを選択'}
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {teams.map((team) => (
            <DropdownMenuItem 
              key={team.id} 
              onClick={() => onTeamChange(team.id)}
              className={team.id === selectedTeamId ? 'bg-blue-50' : ''}
            >
              {team.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
