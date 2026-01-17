// src/store/teams.ts
import { defineStore } from 'pinia';
import { Team } from '../core/types';

export const useTeamsStore = defineStore('teams', {
  state: () => ({
    teams: [] as Team[],
    loading: false,
  }),
  
  persist: true, // ← Salva no localStorage com chave 'teams'
  
  actions: {
    // Carrega times dos arquivos estáticos (fallback)
    async loadFromFiles() {
      if (this.teams.length > 0) return; // Já tem dados
      
      try {
        const teamModules = import.meta.glob('../core/data/teams/*.json', { eager: true });
        const loadedTeams: Team[] = [];
        
        for (const [path, module] of Object.entries(teamModules)) {
          const team = (module as { default: Team }).default;
          loadedTeams.push(team);
        }
        
        this.teams = loadedTeams;
      } catch (error) {
        console.error('Erro ao carregar times dos arquivos:', error);
      }
    },
    
    // Atualiza ou adiciona um time
    updateTeam(updatedTeam: Team) {
      const index = this.teams.findIndex(t => t.id === updatedTeam.id);
      if (index !== -1) {
        this.teams[index] = updatedTeam;
      } else {
        this.teams.push(updatedTeam);
      }
    },
    
    // Busca time por ID
    getTeamById(id: string): Team | undefined {
      return this.teams.find(t => t.id === id);
    }
  }
});