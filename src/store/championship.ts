// src/store/championship.ts
import { defineStore } from 'pinia';
import type { Championship, Match } from '../core/types';
import { generateFixture } from '../services/fixtureGenerator';
import { simulateMatch } from '../core/engine/simulator';

export const useChampionshipStore = defineStore('championship', {
  state: () => ({
    data: null as Championship | null,
    matches: [] as Match[],
  }),

  getters: {
    standings(state) {
      if (!state.data) return [];

      // Verifica se há pelo menos uma partida finalizada
      const hasFinishedMatches = state.matches.some(m => m.status === 'finished');

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

      // Inicializa com todos os times
      for (const team of state.data.teams) {
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

      // Só processa resultados se houver jogos finalizados
      if (hasFinishedMatches) {
        for (const match of state.matches) {
          if (match.status !== 'finished') continue;

          const home = table.get(match.homeTeamId)!;
          const away = table.get(match.awayTeamId)!;

          home.goalsFor += match.homeScore;
          home.goalsAgainst += match.awayScore;
          away.goalsFor += match.awayScore;
          away.goalsAgainst += match.homeScore;

          if (match.homeScore > match.awayScore) {
            home.points += state.data.settings.pointsWin;
            home.win++;
            away.loss++;
          } else if (match.homeScore < match.awayScore) {
            away.points += state.data.settings.pointsWin;
            away.win++;
            home.loss++;
          } else {
            home.points += state.data.settings.pointsDraw;
            away.points += state.data.settings.pointsDraw;
            home.draw++;
            away.draw++;
          }
        }

        // Calcula saldo de gols
        const entries = Array.from(table.values());
        for (const entry of entries) {
          entry.goalDifference = entry.goalsFor - entry.goalsAgainst;
        }

        // Ordena por critérios competitivos (pontos, SG, GF)
        return entries.sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
          return b.goalsFor - a.goalsFor;
        });
      } else {
        // 🆕 Nenhum jogo jogado: ordena alfabeticamente pelo nome do time
        const entries = Array.from(table.values());
        return entries.sort((a, b) => a.team.name.localeCompare(b.team.name, 'pt-BR', { sensitivity: 'base' }));
      }
    },
  },

  actions: {
    loadChampionship(championship: Championship) {
      console.log('Carregando campeonato com times:', championship.teams.length);
      this.data = championship;
      this.matches = generateFixture(championship.teams);
    },

    simulateRound(round: number) {
      if (!this.data) return;
      const matchesInRound = this.matches.filter(m => m.round === round && m.status === 'scheduled');
      for (const match of matchesInRound) {
        const homeTeam = this.data.teams.find(t => t.id === match.homeTeamId);
        const awayTeam = this.data.teams.find(t => t.id === match.awayTeamId);
        if (homeTeam && awayTeam) {
          const result = simulateMatch(homeTeam, awayTeam, round);
          Object.assign(match, result);
        }
      }
    },
  },
});