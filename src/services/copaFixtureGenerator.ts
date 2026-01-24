// src/services/copaStructureCalculator.ts
import { calculateCopaStructure } from "./copaStructureCalculator";

/**
 * Gera a estrutura completa de uma copa com fase de grupos e mata-mata
 * @param teams - Array de times participantes
 * @param hasThirdPlaceMatch - Define se terá jogo de 3º lugar
 * @param customConfig - Configurações personalizadas (incluindo groups)
 * @returns Array de partidas organizadas por fases
 */
export const generateCopaFixture = (
  teams: Team[],
  hasThirdPlaceMatch: boolean = true,
  customConfig: {
    qualifiedPerGroup?: number;
    groups?: Group[]; // 👈 Nova opção para grupos personalizados
  } = {}
): { matches: Match[], groups: Group[], structure: any } => {
  
  let groups: Group[];
  let qualifiedPerGroup: number;
  let totalQualified: number;
  let initialKnockoutPhase: ChampionshipPhase;
  let knockoutStages: number[];

  if (customConfig.groups && customConfig.groups.length > 0) {
    // Usa grupos personalizados
    console.log('Usando grupos personalizados fornecidos:', customConfig.groups.length);
    groups = customConfig.groups;
    qualifiedPerGroup = customConfig.qualifiedPerGroup || 2;
    totalQualified = groups.reduce((sum, group) => sum + Math.min(group.teamIds.length, qualifiedPerGroup), 0);
    
    // Calcula estrutura do mata-mata com base no total de classificados
    let stage = 2;
    if (totalQualified >= 32) stage = 32;
    else if (totalQualified >= 16) stage = 16;
    else if (totalQualified >= 8) stage = 8;
    else if (totalQualified >= 4) stage = 4;
    
    knockoutStages = [32, 16, 8, 4, 2].filter(s => s >= stage);
    
    if (stage >= 32) initialKnockoutPhase = 'round_32';
    else if (stage >= 16) initialKnockoutPhase = 'round_16';
    else if (stage >= 8) initialKnockoutPhase = 'quarters';
    else if (stage >= 4) initialKnockoutPhase = 'semis';
    else initialKnockoutPhase = 'final';
  } else {
    // Usa lógica original (calcula grupos automaticamente)
    const structure = calculateCopaStructure(teams, customConfig);
    groups = structure.groups;
    qualifiedPerGroup = structure.qualifiedPerGroup;
    totalQualified = structure.totalQualified;
    initialKnockoutPhase = structure.initialKnockoutPhase;
    knockoutStages = structure.knockoutStages;
  }

  const matches: Match[] = [];
  let matchIdCounter = 1;
  let roundCounter = 1;

  // 2. GERA FASE DE GRUPOS (usando os grupos fornecidos ou gerados)
  groups.forEach(group => {
    // Gera partidas do grupo usando algoritmo Round-Robin
    const groupTeams = group.teamIds;
    const totalTeams = groupTeams.length;

    if (totalTeams < 2) return;

    // Se for número ímpar, adiciona um "bye" (time fictício)
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
          round: roundIndex + 1,
          events: [],
          phase: 'groups',
          group: group.id
        });
      });
    });
  });

  roundCounter = Math.max(...matches.map(m => m.round), 0) + 1;

  // 3. PREPARA ESTRUTURA PARA MATA-MATA
  const knockoutPhases: ChampionshipPhase[] = [];
    
  // Define as fases do mata-mata com base no número de classificados
  if (totalQualified >= 32) {
    knockoutPhases.push('round_32');
  }
  if (totalQualified >= 16) {
    knockoutPhases.push('round_16');
  }
  if (totalQualified >= 8) {
    knockoutPhases.push('quarters');
  }
  if (totalQualified >= 4) {
    knockoutPhases.push('semis');
  }
  if (totalQualified >= 2) {
    knockoutPhases.push('final');
  }

  // 4. CRIA CHAVEAMENTO DO MATA-MATA (com IDs consistentes)
  const phaseMatches: Record<ChampionshipPhase, Match[]> = {} as any;
  
  for (const phase of knockoutPhases) {
    phaseMatches[phase] = [];
  }
  
  // Calcula o número de partidas por fase
  let teamsInCurrentPhase = totalQualified;
  let currentRound = roundCounter;
  
  for (const phase of knockoutPhases) {
    const matchesInPhase = Math.floor(teamsInCurrentPhase / 2);
    for (let j = 0; j < matchesInPhase; j++) {
      const match: Match = {
        id: `ko-${phase}-${j + 1}`,
        homeTeamId: null,
        awayTeamId: null,
        homeScore: 0,
        awayScore: 0,
        status: 'scheduled',
        round: currentRound,
        events: [],
        phase: phase,
        nextMatchId: undefined,
        path: undefined
      };
      phaseMatches[phase].push(match);
    }
    teamsInCurrentPhase = matchesInPhase;
    currentRound++;
  }
  
  // Define nextMatchId e path com suporte a DUAS CHAVES
  for (let i = 0; i < knockoutPhases.length - 1; i++) {
    const currentPhase = knockoutPhases[i];
    const nextPhase = knockoutPhases[i + 1];
    const currentMatches = phaseMatches[currentPhase];
    const nextMatches = phaseMatches[nextPhase];

    for (let j = 0; j < currentMatches.length; j++) {
      const match = currentMatches[j];
      const nextMatchIndex = Math.floor(j / 2);

      if (nextMatchIndex >= nextMatches.length) continue;

      const nextMatch = nextMatches[nextMatchIndex];

      match.nextMatchId = nextMatch.id;
      match.path = j % 2 === 0 ? 'home' : 'away';
      if (match.bracketSide) {
        if (!nextMatch.bracketSide) {
          nextMatch.bracketSide = match.bracketSide;
        } 
      } else {      
          match.bracketSide = j < currentMatches.length / 2 ? 'left' : 'right';
      }
    }
  }
  
  
  // Adiciona jogo de 3º lugar se necessário
  if (hasThirdPlaceMatch && knockoutPhases.includes('semis')) {
    const thirdMatch: Match = {
      id: `ko-third-1`,
      homeTeamId: null,
      awayTeamId: null,
      homeScore: 0,
      awayScore: 0,
      status: 'scheduled',
      round: currentRound - 1, // Mesma rodada da final
      events: [],
      phase: 'third',
      nextMatchId: undefined,
      path: undefined
    };
    matches.push(thirdMatch);
  }

  // Achata o array de partidas do mata-mata
  for (const phase of knockoutPhases) {
    matches.push(...phaseMatches[phase]);
  }

  return {
    matches,
    groups,
    structure: {
      qualifiedPerGroup,
      totalQualified,
      initialKnockoutPhase,
      knockoutStages
    }
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
      .slice(0, qualifiedPerGroup);
    
    qualifiedTeams[group.id] = groupStandings.map(s => s.team.id);
    console.log(`Grupo ${group.name} - Classificados:`, qualifiedTeams[group.id]);
  });

  // 2. Encontra a primeira fase do mata-mata
  const firstKnockoutPhase = ['round_32', 'round_16', 'quarters', 'semis', 'final'].find(phase => 
    updatedMatches.some(m => m.phase === phase)
  );

  if (!firstKnockoutPhase) {    
    console.log('Nenhuma fase de mata-mata encontrada');    
    console.log('------------------------------------');    
    console.log(updatedMatches);
    console.log('------------------------------------');
    return updatedMatches;
  }

  // 3. PREENCHE OS JOGOS DA PRIMEIRA FASE DO MATA-MATA COM BASE EM TODOS OS GRUPOS
  const firstKnockoutMatches = updatedMatches.filter(m => m.phase === firstKnockoutPhase);
  console.log(`Primeira fase do mata-mata: ${firstKnockoutPhase}, ${firstKnockoutMatches.length} partidas`);

  // Garante que todos os jogos tenham bracketSide definido
  firstKnockoutMatches.forEach((match, idx) => {
    if (!match.bracketSide) {
      match.bracketSide = idx < firstKnockoutMatches.length / 2 ? 'left' : 'right';
    }
  });

  // Organiza os times classificados em uma lista única, ordenada por grupo e posição
  const allQualifiedTeams: string[] = [];
  groups.forEach(group => {
    const groupStandings = standings
      .filter(s => s.group === group.id)
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
        return b.goalsFor - a.goalsFor;
      })
      .slice(0, qualifiedPerGroup);

    groupStandings.forEach(s => {
      allQualifiedTeams.push(s.team.id);
    });
  });

  // Distribui os times nos jogos da primeira fase
  for (let i = 0; i < firstKnockoutMatches.length; i++) {
    const match = firstKnockoutMatches[i];
    
    // Se já tiver times definidos, pula
    if (match.homeTeamId && match.awayTeamId) continue;

    // Atribui times sequencialmente
    const homeIndex = i * 2;
    const awayIndex = i * 2 + 1;

    if (homeIndex < allQualifiedTeams.length) {
      match.homeTeamId = allQualifiedTeams[homeIndex];
    }

    if (awayIndex < allQualifiedTeams.length) {
      match.awayTeamId = allQualifiedTeams[awayIndex];
    }

    // Define bracketSide se ainda não estiver definido
    if (!match.bracketSide) {
      match.bracketSide = i < firstKnockoutMatches.length / 2 ? 'left' : 'right';
    }

    console.log(`Partida ${match.id}: ${match.homeTeamId} vs ${match.awayTeamId} (${match.bracketSide})`);
  }

  return updatedMatches;
};