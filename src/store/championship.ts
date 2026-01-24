// src/store/championship.ts
import { defineStore } from 'pinia';
import { v4 as uuidv4 } from 'uuid';
import type { Championship, Match, ChampionshipPhase, Team, Group } from '../core/types';
import { generateFixture } from '../services/fixtureGenerator';
import { simulateMatch } from '../core/engine/simulator';
import { generateCopaFixture, updateKnockoutTeams } from '../services/copaFixtureGenerator';
import { calculateGroupStandings } from '../core/engine/copaSimulator';
import { calculateCopaStructure } from '../services/copaStructureCalculator';

interface ChampionshipState {
  data: Championship | null;
  matches: Match[];
  customGroups?: Array<{ name: string; teamIds: string[] }>;
}

export const useChampionshipStore = defineStore('championship', {
  state: () => ({
    // Agora armazena múltiplos campeonatos por ID
    championships: {} as Record<string, ChampionshipState>,
    currentChampionshipId: null as string | null,
  }),

  getters: {
    // Retorna a simulação do campeonato atual
    currentChampionship(state) {
      if (!state.currentChampionshipId) return null;
      return state.championships[state.currentChampionshipId] || null;
    },
    
    // Standings do campeonato atual
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
        group?: string;
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
          group: current.data.type === 'copa' ? 
            current.data.groups?.find(g => g.teamIds.includes(team.id))?.id : 
            undefined
        });
      }

      if (hasFinishedMatches) {
        for (const match of current.matches) {
          if (match.status !== 'finished') continue;
          
          const homeTeamId = match.homeTeamId;
          const awayTeamId = match.awayTeamId;
          
          if (!homeTeamId || !awayTeamId) continue;

          const home = table.get(homeTeamId)!;
          const away = table.get(awayTeamId)!;

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
    
    // Standings por grupo (apenas para copas)
    groupStandings(state) {
      const current = this.currentChampionship;
      if (!current?.data || current.data.type !== 'copa' || !current.data.groups) return [];
      
      const standings = calculateGroupStandings(current.data, current.matches);
      const groupedStandings: Record<string, any[]> = {};
      
      standings.forEach(standing => {
        if (!groupedStandings[standing.group]) {
          groupedStandings[standing.group] = [];
        }
        groupedStandings[standing.group].push(standing);
      });
      
      return Object.entries(groupedStandings).map(([groupId, standings]) => {
        const group = current.data!.groups!.find(g => g.id === groupId);
        return {
          group: group ? group.name : groupId,
          standings: standings.sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
            return b.goalsFor - a.goalsFor;
          })
        };
      });
    },
    
    // Rodadas do campeonato atual
    allRounds(state) {
      const current = this.currentChampionship;
      if (!current?.data?.teams.length) return [];
      
      if (current.data.type === 'copa') {
        // Para copas, retorna todas as rodadas existentes
        return Array.from(new Set(current.matches.map(m => m.round))).sort((a, b) => a - b);
      } else {
        // Para ligas, calcula com base no número de times
        const n = current.data.teams.length;
        const totalRounds = (n - 1) * 2;
        return Array.from({ length: totalRounds }, (_, i) => i + 1);
      }
    },
    
    // Matches do campeonato atual
    matches(state) {
      return this.currentChampionship?.matches || [];
    },
    
    // Dados do campeonato atual
    data(state) {
      return this.currentChampionship?.data || null;
    },
    
    // Fase atual do campeonato (para copas)
    currentPhase(state) {
      const current = this.currentChampionship;
      if (!current?.data || current.data.type !== 'copa') return null;
      
      const phases: ChampionshipPhase[] = ['groups', 'round_32', 'round_16', 'quarters', 'semis', 'final'];
      const completedPhases = phases.filter(phase => 
        current.matches.filter(m => m.phase === phase).every(m => m.status === 'finished')
      );
      
      if (completedPhases.length === 0) return 'groups';
      
      const lastCompletedIndex = phases.indexOf(completedPhases[completedPhases.length - 1]);
      return lastCompletedIndex < phases.length - 1 ? phases[lastCompletedIndex + 1] : 'final';
    },
    
    // Número total de fases do campeonato
    totalPhases(state) {
      const current = this.currentChampionship;
      if (!current?.data || current.data.type !== 'copa') return 0;
      
      const phases = ['groups', 'round_32', 'round_16', 'quarters', 'semis', 'final'].filter(phase => 
        current.matches.some(m => m.phase === phase)
      );
      
      return phases.length;
    }
  },

  actions: {
    // Carrega ou inicializa um campeonato específico
    loadChampionship(championship: Championship) {
      if (!championship.id) {
        console.error('Campeonato sem ID:', championship);
        return;
      }
      
      console.log('Carregando campeonato:', championship.name, 'Tipo:', championship.type);
      
      // Se não existe, inicializa
      if (!this.championships[championship.id]) {
        let matches: Match[] = [];
        
      if (championship.type === 'copa') {
        console.log('Gerando fixture para copa com', championship.teams.length, 'times');
        
        if (championship.customGroups && championship.customGroups.length > 0) {
          console.log('Usando grupos personalizados:', championship.customGroups.length, 'grupos');
          
          // 👇 VALIDA E CONVERTE GRUPOS PERSONALIZADOS
          const groups: Group[] = championship.customGroups.map((customGroup, index) => {
            // Filtra apenas teamIds válidos (que existem nos times do campeonato)
            const validTeamIds = customGroup.teamIds.filter(teamId => 
              championship.teams.some(t => t.id === teamId)
            );
            
            if (validTeamIds.length === 0) {
              console.warn(`⚠️ Grupo ${customGroup.name} não tem times válidos.`);
            }
            
            return {
              id: `group-${uuidv4()}`,
              name: customGroup.name,
              teamIds: validTeamIds
            };
          });
          
          // 👇 APLICA A MESMA LÓGICA DE AJUSTE DO RESET!
          let qualifiedPerGroup = championship.settings.qualifiedPerGroup || 2;
          
          // Ajuste automático para casos especiais
          if (championship.teams.length === 12) {
            qualifiedPerGroup = 4; // 2 grupos de 6 → 4 classificados
          } else if (groups.length === 2 && groups[0].teamIds.length >= 5) {
            qualifiedPerGroup = 4; // Caso genérico: 2 grupos grandes
          }
          
          // Atualiza as configurações do campeonato
          championship.settings = {
            ...championship.settings,
            qualifiedPerGroup: qualifiedPerGroup
          };
          
          // 👇 LOG PARA DEBUG
          console.log('Grupos personalizados validados:', groups.map(g => ({
            name: g.name,
            teamCount: g.teamIds.length
          })));
          console.log('qualifiedPerGroup aplicado:', qualifiedPerGroup);
          
          // Usa generateCopaFixture para gerar TUDO
          const fixtureResult = generateCopaFixture(
            championship.teams,
            championship.settings.hasPlayoffs,
            {
              qualifiedPerGroup: qualifiedPerGroup,
              groups: groups
            }
          );
          
          this.championships[championship.id] = {
            championship,
            matches: fixtureResult.matches
          };
        } else {
          // Gera grupos automaticamente
          const copaConfig = {
            minTeamsPerGroup: championship.settings.minTeamsPerGroup || 3,
            maxTeamsPerGroup: championship.settings.maxTeamsPerGroup || 6,
            qualifiedPerGroup: championship.settings.qualifiedPerGroup || 2
          };
          
          const fixtureResult = generateCopaFixture(
            championship.teams,
            championship.settings.hasPlayoffs,
            copaConfig
          );
          
          championship.groups = fixtureResult.groups;
          this.championships[championship.id] = {
            championship,
            matches: fixtureResult.matches
          };
        }
      } else {
          console.log('Gerando fixture para liga com', championship.teams.length, 'times');
          // Gera fixture para liga
          matches = generateFixture(championship.teams);
          console.log('Total de rodadas para liga:', matches.length / (championship.teams.length / 2));
        }
        
        this.championships[championship.id] = {
          data: championship,
          matches
        };
      } else {
        // Atualiza os dados do time (para edições)
        const currentState = this.championships[championship.id];
        
        // Se o tipo mudou, regenera as partidas
        if (currentState.data?.type !== championship.type) {
          console.log('Tipo de campeonato mudou de', currentState.data?.type, 'para', championship.type);
          
          if (championship.type === 'copa') {
            let qualifiedPerGroup = 2;
            
            if (championship.teams.length === 12) {
              qualifiedPerGroup = 4;
            }
            
            const fixtureResult = generateCopaFixture(
              championship.teams,
              championship.settings.hasPlayoffs,
              {
                qualifiedPerGroup: championship.settings.qualifiedPerGroup || qualifiedPerGroup
              }
            );
            
            currentState.matches = fixtureResult.matches;
            championship.groups = fixtureResult.groups;
            championship.settings = {
              ...championship.settings,
              qualifiedPerGroup: fixtureResult.structure.qualifiedPerGroup
            };
          } else {
            currentState.matches = generateFixture(championship.teams);
          }
        }
        
        // Atualiza times se necessário
        const updatedTeams = [...currentState.data!.teams];
        championship.teams.forEach(newTeam => {
          const existingIndex = updatedTeams.findIndex(t => t.id === newTeam.id);
          if (existingIndex !== -1) {
            updatedTeams[existingIndex] = newTeam;
          } else {
            updatedTeams.push(newTeam);
          }
        });

        // ✅ PRESERVA OS GROUPS EXISTENTES
        const preservedGroups = currentState.data!.groups;

        // Atualiza o campeonato mantendo os groups gerados
        currentState.data = {
          ...championship,
          teams: updatedTeams,
          groups: preservedGroups || championship.groups, // Prioriza groups existentes
          settings: {
            ...championship.settings,
            qualifiedPerGroup: currentState.data!.settings.qualifiedPerGroup
          }
        };
        if (championship.customGroups) {
          currentState.customGroups = championship.customGroups;
         }
      }
      
      this.currentChampionshipId = championship.id;
    },

    // Simula rodada do campeonato atual (para ligas)
    simulateRound(round: number) {
      if (!this.currentChampionshipId || !this.currentChampionship?.data) return;
      
      // Para ligas, simula rodada específica
      if (this.currentChampionship.data.type === 'liga' || !this.currentChampionship.data.type) {
        const currentState = this.championships[this.currentChampionshipId];
        const matchesInRound = currentState.matches.filter(m => m.round === round && m.status === 'scheduled');
        
        console.log(`Simulando rodada ${round} para liga. Partidas agendadas:`, matchesInRound.length);
        
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
      }
    },
    
    // Atualiza matches do campeonato atual
    updateMatches(matches: Match[]) {
      if (!this.currentChampionshipId) return;
      const currentState = this.championships[this.currentChampionshipId];
      if (currentState) {
        currentState.matches = matches;
      }
    },
    
    // Atualiza os times classificados para a próxima fase (copas)
    updateQualifiedTeams() {
      if (!this.currentChampionshipId || !this.currentChampionship?.data) return;
      
      const currentState = this.championships[this.currentChampionshipId];
      if (!currentState.data?.groups || currentState.data.type !== 'copa') return;
      
      // Verifica se a fase de grupos está concluída
      const groupMatches = currentState.matches.filter(m => m.phase === 'groups');
      const allGroupsFinished = groupMatches.every(m => m.status === 'finished');
      
      console.log('Verificando fase de grupos:', {
        totalMatches: groupMatches.length,
        finishedMatches: groupMatches.filter(m => m.status === 'finished').length,
        allFinished: allGroupsFinished
      });
      
      if (!allGroupsFinished) {
        console.log('Fase de grupos não concluída. Aguardando conclusão.');
        return;
      }
      
      console.log('Fase de grupos concluída. Calculando classificados...');
      
      // Calcula standings da fase de grupos
      const standings = calculateGroupStandings(currentState.data, groupMatches);
      
      console.log('Standings calculados:', standings);
      
      // Atualiza times classificados para o mata-mata
      const updatedMatches = updateKnockoutTeams(
        currentState.matches,
        standings,
        currentState.data.groups,
        currentState.data.settings.qualifiedPerGroup || 2
      );
      
      console.log('Partidas atualizadas com times classificados:', updatedMatches.filter(m => m.phase !== 'groups').length);
      
      currentState.matches = updatedMatches;
    },
    
    // Reinicia simulação do campeonato atual
    resetSimulation() {
      if (!this.currentChampionshipId || !this.currentChampionship?.data) return;
      
      const currentState = this.championships[this.currentChampionshipId];
      const originalData = { ...currentState.data };
      
      if (originalData.type === 'copa') {
        console.log('Reiniciando simulação de copa');
        
        // 👇 Verifica se há customGroups
        if (originalData.customGroups && originalData.customGroups.length > 0) {
          console.log('Usando customGroups ao reiniciar');
          
          const groups: Group[] = originalData.customGroups.map((customGroup, index) => ({
            id: `group-${uuidv4()}`,
            name: customGroup.name,
            teamIds: customGroup.teamIds
          }));
          
          // 👇 USA generateCopaFixture PARA GERAR TUDO
          const fixtureResult = generateCopaFixture(
            originalData.teams,
            originalData.settings.hasPlayoffs,
            {
              qualifiedPerGroup: originalData.settings.qualifiedPerGroup || 2,
              groups: groups
            }
          );
          
          currentState.matches = fixtureResult.matches;
          currentState.data = {
            ...originalData,
            groups: groups
          };
          
          if (originalData.customGroups) {
            currentState.customGroups = originalData.customGroups;
          }
        } else {
          // 👇 Gera grupos automaticamente (comportamento padrão)
          const copaConfig = {
            minTeamsPerGroup: originalData.settings.minTeamsPerGroup || 3,
            maxTeamsPerGroup: originalData.settings.maxTeamsPerGroup || 6,
            qualifiedPerGroup: originalData.settings.qualifiedPerGroup || 2
          };
          
          const fixtureResult = generateCopaFixture(
            originalData.teams,
            originalData.settings.hasPlayoffs,
            copaConfig
          );
          
          currentState.matches = fixtureResult.matches;
          currentState.data = {
            ...originalData,
            groups: fixtureResult.groups,
            settings: {
              ...originalData.settings,
              qualifiedPerGroup: fixtureResult.structure.qualifiedPerGroup,
              minTeamsPerGroup: fixtureResult.structure.minTeamsPerGroup,
              maxTeamsPerGroup: fixtureResult.structure.maxTeamsPerGroup
            }
          };
        }
      } else {
        console.log('Reiniciando simulação de liga');
        currentState.matches = generateFixture(originalData.teams);
        currentState.data = originalData;
      }
      
      console.log('Simulação reiniciada com sucesso');
    },
    
    // Limpa todas as simulações
    clearAllSimulations() {
      console.log('Limpando todas as simulações');
      this.championships = {};
      this.currentChampionshipId = null;
    }
  },
  
  // Persistência para todo o estado
  persist: true
});

// Função auxiliar para gerar partidas de grupos personalizados
const generateGroupMatches = (groups: Group[], teams: Team[]): Match[] => {
  const matches: Match[] = [];
  let matchIdCounter = 1;
  let roundCounter = 1;
  
  groups.forEach(group => {
    // Gera partidas do grupo usando algoritmo Round-Robin
    const groupTeams = group.teamIds;
    const totalTeams = groupTeams.length;
    
    if (totalTeams < 2) return;
    
    // Se for número ímpar, adiciona um "bye"
    let teams = [...groupTeams];
    if (totalTeams % 2 !== 0) {
      teams.push('BYE');
    }
    
    // Cria as rodadas
    const rounds = [];
    for (let round = 0; round < teams.length - 1; round++) {
      const currentRound = [];
      for (let i = 0; i < teams.length / 2; i++) {
        const home = teams[i];
        const away = teams[teams.length - 1 - i];
        if (home !== 'BYE' && away !== 'BYE') {
          currentRound.push([home, away]);
        }
      }
      rounds.push(currentRound);
      const last = teams.pop();
      teams.splice(1, 0, last);
    }
    
    // Adiciona as partidas
    rounds.forEach((roundMatches, roundIndex) => {
      roundMatches.forEach(([home, away]) => {
        matches.push({
          id: `group-${group.id}-${matchIdCounter++}`,
          homeTeamId: home,
          awayTeamId: away,
          homeScore: 0,
          awayScore: 0,
          status: 'scheduled',
          round: roundIndex + 1,
          events: [],
          phase: 'groups',
          group: group.id
        });
      });
    });
  });
  
  return matches;
};
