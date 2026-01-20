// src/services/copaFixtureGenerator.ts
import { Team, Match, ChampionshipPhase, Group } from '../core/types';
import { v4 as uuidv4 } from 'uuid';
import { calculateCopaStructure } from './copaStructureCalculator';

/**
 * Converte um número de times para a fase correspondente do mata-mata
 */
const getPhaseFromTeamCount = (teamCount: number): ChampionshipPhase => {
  if (teamCount >= 32) return 'round_32'; // 32 times = 16 partidas
  if (teamCount >= 16) return 'round_16'; // 16 times = 8 partidas
  if (teamCount >= 8) return 'quarters';  // 8 times = 4 partidas
  if (teamCount >= 4) return 'semis';      // 4 times = 2 partidas
  return 'final';                         // 2 times = 1 partidas (semifinais) ou 2 times = 1 partida (final)
};

/**
 * Gera a estrutura completa de uma copa com fase de grupos e mata-mata
 * @param teams - Array de times participantes
 * @param hasThirdPlaceMatch - Define se terá jogo de 3º lugar
 * @param customConfig - Configurações personalizadas para estrutura
 * @returns Array de partidas organizadas por fases
 */
export const generateCopaFixture = (
  teams: Team[],
  hasThirdPlaceMatch: boolean = true,
  customConfig: any = {}
): { matches: Match[], groups: Group[], structure: any } => {
  // 1. CALCULA ESTRUTURA DA COPA
  const structure = calculateCopaStructure(teams, {
    ...customConfig,
    // Força configuração específica para 12 times
    qualifiedPerGroup: customConfig.qualifiedPerGroup || (teams.length === 12 ? 4 : 2)
  });
  
  const { groups, qualifiedPerGroup, totalQualified, initialKnockoutPhase } = structure;
  
  const matches: Match[] = [];
  let matchIdCounter = 1;
  let roundCounter = 1;

  // 2. GERA FASE DE GRUPOS
  groups.forEach(group => {
    // Gera partidas do grupo usando algoritmo Round-Robin
const groupTeams = group.teamIds;
const totalTeams = groupTeams.length;

// Se for número ímpar, adiciona um "bye" (time fictício)
let teams = [...groupTeams];
if (totalTeams % 2 !== 0) {
  teams.push('BYE'); // Time fictício para equilibrar
}

// Cria as rodadas
const rounds = [];
for (let round = 0; round < teams.length - 1; round++) {
  const currentRound = [];
  for (let i = 0; i < teams.length / 2; i++) {
    const home = teams[i];
    const away = teams[teams.length - 1 - i];
    
    // Não agende partidas com "BYE"
    if (home !== 'BYE' && away !== 'BYE') {
      currentRound.push([home, away]);
    }
  }
  rounds.push(currentRound);
  
  // Rotaciona os times (mantendo o primeiro fixo)
  const last = teams.pop();
  teams.splice(1, 0, last);
}

// Adiciona as partidas ao array matches
rounds.forEach((roundMatches, roundIndex) => {
  roundMatches.forEach(([home, away]) => {
    matches.push({
      id: `group-${group.id}-${matchIdCounter++}`,
      homeTeamId: home,
      awayTeamId: away,
      homeScore: 0,
      awayScore: 0,
      status: 'scheduled',
      round: roundIndex + 1, // Rodada começa em 1
      events: [],
      phase: 'groups',
      group: group.id
    });
  });
});
  });

  roundCounter++;

  // 3. PREPARA ESTRUTURA PARA MATA-MATA
  // Determina quantas fases eliminatórias teremos
  const knockoutPhases: ChampionshipPhase[] = [];
  
  let currentTeams = totalQualified;
  let currentPhase: ChampionshipPhase = initialKnockoutPhase;
  
  console.log('Estrutura da copa:', {
    totalTeams: teams.length,
    groups: groups.length,
    teamsPerGroup: groups[0].teamIds.length,
    qualifiedPerGroup,
    totalQualified,
    initialKnockoutPhase
  });

// Define as fases do mata-mata com base no número de classificados

    if (totalQualified >= 32) {
      knockoutPhases.push('round_32'); // 32 times → 16 partidas
    }

    if (totalQualified >= 16) {
      knockoutPhases.push('round_16'); // 16 times → 8 partidas
    }

    if (totalQualified >= 8) {
      knockoutPhases.push('quarters'); // 8 times → 4 partidas
    }

    if (totalQualified >= 4) {
      knockoutPhases.push('semis'); // 4 times → 2 partidas
    }

    if (totalQualified >= 2) {
      knockoutPhases.push('final'); // 2 times → 1 partida
    }

  // 4. CRIA CHAVEAMENTO DO MATA-MATA
  const createKnockoutStructure = () => {
  const bracketMatches: Match[] = [];
  let bracketId = 1;
  let currentRound = roundCounter;
  
  // Cria fases do mata-mata
  for (let i = 0; i < knockoutPhases.length; i++) {
    const phase = knockoutPhases[i];
    const nextPhase = knockoutPhases[i + 1];
    const teamsInPhase = totalQualified / Math.pow(2, i);
    const matchesInPhase = Math.floor(teamsInPhase / 2);
    let matchCounter = 1
    
    console.log(`Fase ${phase}: ${matchesInPhase} partidas, rodada ${currentRound}`);
    
    for (let j = 0; j < matchesInPhase; j++) {
      const matchId = `ko-${phase}-${matchCounter++}`;
      const nextMatchId = nextPhase ? `ko-${nextPhase}-${Math.floor(j/2) + 1}` : undefined;
      
      const match: Match = {
        id: matchId,
        homeTeamId: null,
        awayTeamId: null,
        homeScore: 0,
        awayScore: 0,
        status: 'scheduled',
        round: currentRound,
        events: [],
        phase: phase,
        nextMatchId: nextMatchId
      };
      
      // Define path para próximas fases (home/away)
      if (nextPhase) {
        match.path = j % 2 === 0 ? 'home' : 'away';
      }
      
      bracketMatches.push(match);
    }
    
    currentRound++;
  }

  // Adiciona jogo de 3º lugar se necessário e se tiver fase de semifinais
  if (hasThirdPlaceMatch && knockoutPhases.includes('semis')) {
    bracketMatches.push({
      id: `ko-third-1`,
      homeTeamId: null,
      awayTeamId: null,
      homeScore: 0,
      awayScore: 0,
      status: 'scheduled',
      round: currentRound - 1, // Mesma rodada da final
      events: [],
      phase: 'third',
    });
  }

  return bracketMatches;
};

  // Adiciona partidas do mata-mata
  const knockoutMatches = createKnockoutStructure();
  matches.push(...knockoutMatches);

  return {
    matches,
    groups,
    structure
  };
};

/**
 * Atualiza os times classificados para a fase eliminatória
 * @param matches - Array de partidas atual
 * @param standings - Standings da fase de grupos
 * @param groups - Configuração dos grupos
 * @param qualifiedPerGroup - Quantos times se classificam por grupo
 * @returns Array de partidas atualizado com os times classificados
 */
export const updateKnockoutTeams = (
  matches: Match[],
  standings: any[],
  groups: Group[],
  qualifiedPerGroup: number
): Match[] => {
  const updatedMatches = [...matches];
  
  // 1. Organiza times classificados por grupo
  const qualifiedTeams: Record<string, string[]> = {};
  
  groups.forEach(group => {
    const groupStandings = standings
      .filter(s => s.group === group.id)
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
        return b.goalsFor - a.goalsFor;
      })
      .slice(0, qualifiedPerGroup); // Pega os N primeiros
    
    qualifiedTeams[group.id] = groupStandings.map(s => s.team.id);
    console.log(`Grupo ${group.name} - Classificados:`, qualifiedTeams[group.id]);
  });

  // 2. Encontra a primeira fase do mata-mata
  const firstKnockoutPhase = ['round_32', 'round_16', 'quarters', 'semis', 'final'].find(phase => 
    updatedMatches.some(m => m.phase === phase)
  );

  if (!firstKnockoutPhase) {
    console.log('Nenhuma fase de mata-mata encontrada');
    return updatedMatches;
  }

  const firstKnockoutMatches = updatedMatches.filter(m => m.phase === firstKnockoutPhase);
  console.log(`Primeira fase do mata-mata: ${firstKnockoutPhase}, ${firstKnockoutMatches.length} partidas`);
  
  // 3. DISTRIBUI OS CLASSIFICADOS NOS CONFRONTOS
  // Lógica de chaveamento para 2 grupos com 4 classificados cada (12 times total)
  if (groups.length === 2 && qualifiedPerGroup === 4) {
    // 👇 CORREÇÃO CRÍTICA: USAR group.id EM VEZ DE group.name[0] 👇
    const groupA = groups[0].id;
    const groupB = groups[1].id;
    
    // Quartas de final - Chaveamento típico:
    // 1A vs 4B, 2A vs 3B, 3A vs 2B, 4A vs 1B
    
    const matchups = [
      { homeGroup: groupA, homePos: 0, awayGroup: groupB, awayPos: 3 },
      { homeGroup: groupA, homePos: 1, awayGroup: groupB, awayPos: 2 },
      { homeGroup: groupA, homePos: 2, awayGroup: groupB, awayPos: 1 },
      { homeGroup: groupA, homePos: 3, awayGroup: groupB, awayPos: 0 }
    ];
    
    matchups.forEach((matchup, idx) => {
      if (idx < firstKnockoutMatches.length) {
        const match = firstKnockoutMatches[idx];
        
        // Verifica se os grupos existem
        if (!qualifiedTeams[matchup.homeGroup] || !qualifiedTeams[matchup.awayGroup]) {
          console.warn(`Grupo ${matchup.homeGroup} ou ${matchup.awayGroup} não encontrado.`);
          return;
        }
        
        // Verifica se as posições existem
        if (qualifiedTeams[matchup.homeGroup][matchup.homePos] && 
            qualifiedTeams[matchup.awayGroup][matchup.awayPos]) {
          match.homeTeamId = qualifiedTeams[matchup.homeGroup][matchup.homePos];
          match.awayTeamId = qualifiedTeams[matchup.awayGroup][matchup.awayPos];
          console.log(`Partida ${match.id}: ${match.homeTeamId} vs ${match.awayTeamId}`);
        } else {
          console.warn(`Times não encontrados para partida ${match.id}:`, {
            homeGroup: matchup.homeGroup,
            homePos: matchup.homePos,
            awayGroup: matchup.awayGroup,
            awayPos: matchup.awayPos
          });
        }
        console.log(`Partida ${match.id} - nextMatchId:`, match.nextMatchId);
      }
    });
    
    return updatedMatches;
  }
  
  // Chaveamento genérico para outras configurações
  // 👇 CORREÇÃO CRÍTICA: USAR group.id EM VEZ DE group.name[0] 👇
  const groupIds = groups.map(g => g.id);
  let matchIndex = 0;
  
  for (let i = 0; i < groupIds.length; i += 2) {
    if (i + 1 >= groupIds.length) break;
    
    const groupA = groupIds[i];
    const groupB = groupIds[i + 1];
    
    // Primeiro confronto: 1º do Grupo A vs 2º do Grupo B
    if (matchIndex < firstKnockoutMatches.length && qualifiedTeams[groupA]?.[0] && qualifiedTeams[groupB]?.[1]) {
      const match = firstKnockoutMatches[matchIndex];
      match.homeTeamId = qualifiedTeams[groupA][0];
      match.awayTeamId = qualifiedTeams[groupB][1];
      matchIndex++;
    }
    
    // Segundo confronto: 1º do Grupo B vs 2º do Grupo A
    if (matchIndex < firstKnockoutMatches.length && qualifiedTeams[groupB]?.[0] && qualifiedTeams[groupA]?.[1]) {
      const match = firstKnockoutMatches[matchIndex];
      match.homeTeamId = qualifiedTeams[groupB][0];
      match.awayTeamId = qualifiedTeams[groupA][1];
      matchIndex++;
    }
  }
  
  return updatedMatches;
};