// src/store/championship.ts
import { defineStore } from 'pinia';
import type { Championship, Match } from '../core/types';
import { generateFixture } from '../services/fixtureGenerator';
import { simulateMatch } from '../core/engine/simulator';

interface ChampionshipState {
  data: Championship | null;
  matches: Match[];
}

export const useChampionshipStore = defineStore('championship', {
  state: () => ({
    // ✅ Agora armazena múltiplos campeonatos por ID
    championships: {} as Record<string, ChampionshipState>,
    currentChampionshipId: null as string | null,
  }),

  getters: {
    // ✅ Retorna a simulação do campeonato atual
    currentChampionship(state) {
      if (!state.currentChampionshipId) return null;
      return state.championships[state.currentChampionshipId] || null;
    },
    
    // ✅ Standings do campeonato atual
    standings(state) {
      const current = this.currentChampionship;
      if (!current?.data) return [];

      const hasFinishedMatches = current.matches.some(m => m.status === 'finished');
      const table = new Map<string, {
        team: any;
        points: number;
        win: number;
        draw: number;
        loss: number;
        goalsFor: number;
        goalsAgainst: number;
        goalDifference: number;
      }>();

      for (const team of current.data.teams) {
        table.set(team.id, {
          team,
          points: 0,
          win: 0,
          draw: 0,
          loss: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDifference: 0,
        });
      }

      if (hasFinishedMatches) {
        for (const match of current.matches) {
          if (match.status !== 'finished') continue;

          const home = table.get(match.homeTeamId)!;
          const away = table.get(match.awayTeamId)!;

          home.goalsFor += match.homeScore;
          home.goalsAgainst += match.awayScore;
          away.goalsFor += match.awayScore;
          away.goalsAgainst += match.homeScore;

          if (match.homeScore > match.awayScore) {
            home.points += current.data.settings.pointsWin;
            home.win++;
            away.loss++;
          } else if (match.homeScore < match.awayScore) {
            away.points += current.data.settings.pointsWin;
            away.win++;
            home.loss++;
          } else {
            home.points += current.data.settings.pointsDraw;
            away.points += current.data.settings.pointsDraw;
            home.draw++;
            away.draw++;
          }
        }

        const entries = Array.from(table.values());
        for (const entry of entries) {
          entry.goalDifference = entry.goalsFor - entry.goalsAgainst;
        }

        return entries.sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
          return b.goalsFor - a.goalsFor;
        });
      } else {
        const entries = Array.from(table.values());
        return entries.sort((a, b) => a.team.name.localeCompare(b.team.name, 'pt-BR', { sensitivity: 'base' }));
      }
    },
    
    // ✅ Rodadas do campeonato atual
    allRounds(state) {
      const current = this.currentChampionship;
      if (!current?.data?.teams.length) return [];
      const n = current.data.teams.length;
      const totalRounds = (n - 1) * 2;
      return Array.from({ length: totalRounds }, (_, i) => i + 1);
    },
    
    // ✅ Matches do campeonato atual
    matches(state) {
      return this.currentChampionship?.matches || [];
    },
    
    // ✅ Dados do campeonato atual
    data(state) {
      return this.currentChampionship?.data || null;
    }
  },

  actions: {
    // ✅ Carrega ou inicializa um campeonato específico
    loadChampionship(championship: Championship) {
      if (!championship.id) {
        console.error('Campeonato sem ID:', championship);
        return;
      }
      
      // Se não existe, inicializa
      if (!this.championships[championship.id]) {
        this.championships[championship.id] = {
          data: championship,
          matches: generateFixture(championship.teams)
        };
      } else {
        // Atualiza os dados do time (para edições)
        this.championships[championship.id].data = championship;
      }
      
      this.currentChampionshipId = championship.id;
    },

    // ✅ Simula rodada do campeonato atual
    simulateRound(round: number) {
      if (!this.currentChampionshipId || !this.currentChampionship?.data) return;
      
      const currentState = this.championships[this.currentChampionshipId];
      const matchesInRound = currentState.matches.filter(m => m.round === round && m.status === 'scheduled');
      
      for (const match of matchesInRound) {
        const homeTeam = currentState.data.teams.find(t => t.id === match.homeTeamId);
        const awayTeam = currentState.data.teams.find(t => t.id === match.awayTeamId);
        if (homeTeam && awayTeam) {
          const result = simulateMatch(homeTeam, awayTeam, round);
          const updatedMatch = { ...match, ...result };
          const index = currentState.matches.findIndex(m => m.id === match.id);
          if (index !== -1) {
            currentState.matches[index] = updatedMatch;
          }
        }
      }
    },
    
    // ✅ Reinicia simulação do campeonato atual
    resetSimulation() {
      if (!this.currentChampionshipId || !this.currentChampionship?.data) return;
      
      this.championships[this.currentChampionshipId].matches = 
        generateFixture(this.currentChampionship.data.teams);
    },
    
    // ✅ Limpa todas as simulações
    clearAllSimulations() {
      this.championships = {};
      this.currentChampionshipId = null;
    }
  },
  
  // ✅ Persistência para todo o estado
  persist: true
});