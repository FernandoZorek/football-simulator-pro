import { Team, Player, TeamSectors, Match, FormationType, MatchEvent } from '../types';

// Função auxiliar para obter configurações
const getConfig = (key: string, defaultValue: number): number => {
  const stored = localStorage.getItem(key);
  return stored ? parseFloat(stored) : defaultValue;
};

/**
 * CONFIGURAÇÕES TÉCNICAS (Via localStorage + fallback para variáveis de ambiente)
 */
const HOME_ADVANTAGE = getConfig('homeAdvantage', Number(import.meta.env.VITE_HOME_ADVANTAGE) || 1.10);
const RANDOM_FACTOR = getConfig('randomness', Number(import.meta.env.VITE_RANDOMNESS) || 0.20);
const MIN_GOAL_BASE = getConfig('minGoalBase', Number(import.meta.env.VITE_MIN_GOAL_BASE) || 0.8);
const MAX_GOAL_BASE = getConfig('maxGoalBase', Number(import.meta.env.VITE_MAX_GOAL_BASE) || 1.5);
const FORMATION_IMPACT = getConfig('formationImpact', Number(import.meta.env.VITE_FORMATION_IMPACT) || 0.10);
const TREND_IMPACT = getConfig('trendImpact', Number(import.meta.env.VITE_TREND_IMPACT) || 0.05);



/**
 * MAPA DE BÔNUS DE FORMAÇÃO
 */
const FORMATION_MODIFIERS: Record<FormationType, Partial<TeamSectors>> = {
  '4-3-3': { attack: 1.10, midfield: 1.00, defense: 0.95, goalkeeping: 1.0 },
  '3-5-2': { attack: 0.95, midfield: 1.15, defense: 1.05, goalkeeping: 1.0 },
  '5-2-3': { attack: 1.05, midfield: 0.85, defense: 1.20, goalkeeping: 1.0 },
  '4-4-2': { attack: 1.00, midfield: 1.05, defense: 1.05, goalkeeping: 1.0 },
  '4-2-3-1': { attack: 1.00, midfield: 1.10, defense: 1.00, goalkeeping: 1.0 },
  '4-5-1': { attack: 0.85, midfield: 1.20, defense: 1.10, goalkeeping: 1.0 },
  '5-3-2': { attack: 0.90, midfield: 1.00, defense: 1.25, goalkeeping: 1.0 },
  '3-4-3': { attack: 1.15, midfield: 1.00, defense: 0.90, goalkeeping: 1.0 },
};

/**
 * 1. CÁLCULO DE SETORES
 */
export const calculateTeamSectors = (team: Team): TeamSectors => {
  const starters = team.players.filter(p => !p.isReserve);
  
  const getAvg = (positions: string[]) => {
    const subset = starters.filter(p => positions.includes(p.position));
    return subset.length > 0 
      ? subset.reduce((acc, p) => acc + p.overall, 0) / subset.length 
      : 50;
  };

  const rawSectors: TeamSectors = {
    goalkeeping: getAvg(['GK']),
    defense: getAvg(['CB', 'LB', 'RB']),
    midfield: getAvg(['CDM', 'CM', 'CAM']),
    attack: getAvg(['ST', 'LW', 'RW'])
  };

  const mod = FORMATION_MODIFIERS[team.formation] || {};
  
  // Aplica o impacto configurável
  const applyModifier = (base: number, modValue: number = 1) => {
    const diff = modValue - 1; // ex: 1.10 - 1 = +0.10
    return base * (1 + diff * FORMATION_IMPACT); // se FORMATION_IMPACT=0.5, vira +0.05
  };

  return {
    goalkeeping: applyModifier(rawSectors.goalkeeping, mod.goalkeeping),
    defense: applyModifier(rawSectors.defense, mod.defense),
    midfield: applyModifier(rawSectors.midfield, mod.midfield),
    attack: applyModifier(rawSectors.attack, mod.attack),
  };
};

/**
 * 2. SELEÇÃO DE MARCADOR (Apenas atacantes, com fallback controlado)
 */
const pickScorer = (team: Team): Player => {
  // 1. Filtra titulares (não reservas)
  const starters = team.players.filter(p => !p.isReserve);

  // 2. Define grupos de prioridade
  const attackers = starters.filter(p => ['ST', 'LW', 'RW'].includes(p.position));
  const midfielders = starters.filter(p => ['CAM', 'CM'].includes(p.position));
  
  // 3. Escolhe o grupo ativo
  let candidatePool: Player[] = [];

  if (attackers.length > 0) {
    candidatePool = attackers;
  } else if (midfielders.length > 0) {
    candidatePool = midfielders;
  } else {
    // Fallback extremo: qualquer não-defensor (exclui GK, CB, LB, RB, CDM)
    candidatePool = starters.filter(p => 
      !['GK', 'CB', 'LB', 'RB', 'CDM'].includes(p.position)
    );
  }

  // 4. Se ainda estiver vazio, usa qualquer um (último recurso)
  if (candidatePool.length === 0) {
    candidatePool = starters;
  }

  // 5. Escolhe com peso baseado no overall (jogadores melhores têm mais chance)
  const totalWeight = candidatePool.reduce((sum, p) => sum + p.overall, 0);
  let random = Math.random() * totalWeight;
  
  for (const player of candidatePool) {
    random -= player.overall;
    if (random <= 0) {
      return player;
    }
  }

  // Fallback final (nunca deve acontecer)
  return candidatePool[0];
};

/**
 * 3. GERAÇÃO DE EVENTOS DA PARTIDA
 */
export const generateMatchEvents = (home: Team, away: Team, homeScore: number, awayScore: number): MatchEvent[] => {
  const events: MatchEvent[] = [];


  const addGoals = (team: Team, score: number) => {
    if (!team || !team.players || team.players.length === 0) {
      console.warn('⚠️ Tentativa de adicionar gols a um time inválido ou sem jogadores:', team);
      return;
    }

    for (let i = 0; i < score; i++) {
      const scorer = pickScorer(team);
      events.push({
        minute: Math.floor(Math.random() * 90) + 1,
        type: 'goal',
        playerId: scorer.id,
        teamId: team.id,
        playerName: scorer.name
      });
    }
  };

  addGoals(home, homeScore);
  addGoals(away, awayScore);

  return events.sort((a, b) => a.minute - b.minute);
};

/**
 * 4. LÓGICA DE PROBABILIDADE DE GOLS
 */
const calculateGoals = (
  attackPower: number,
  defensePower: number,
  trend: number
): number => {
  // Eficiência relativa
  const efficiency = (attackPower / defensePower) * (1 + (trend * TREND_IMPACT));
  
  // Fator de sorte/aleatoriedade
  const luck = 1 + (Math.random() * RANDOM_FACTOR * 2 - RANDOM_FACTOR);
  
  const finalStrength = efficiency * luck;

  // Agora usamos limites configuráveis
  if (finalStrength > MAX_GOAL_BASE) return Math.floor(Math.random() * 5);
  if (finalStrength > 1.2) return Math.floor(Math.random() * 4);
  if (finalStrength > MIN_GOAL_BASE) return Math.floor(Math.random() * 3);
  return Math.floor(Math.random() * 2);
};

/**
 * 5. SIMULADOR DE PARTIDA (PONTO DE ENTRADA)
 */
export const simulateMatch = (home: Team, away: Team, round: number): Partial<Match> => {
  const homeSectors = calculateTeamSectors(home);
  const awaySectors = calculateTeamSectors(away);

  let homeFinalAttack = homeSectors.attack * HOME_ADVANTAGE;
  let homeFinalMid = homeSectors.midfield * HOME_ADVANTAGE;
  
  if (home.metadata?.h2hBias[away.id]) {
    homeFinalAttack *= home.metadata.h2hBias[away.id];
  }

  const homeScore = calculateGoals(
    (homeFinalAttack * 0.7 + homeFinalMid * 0.3),
    (awaySectors.defense * 0.8 + awaySectors.goalkeeping * 0.2),
    home.metadata?.trend
  );

  const awayScore = calculateGoals(
    (awaySectors.attack * 0.7 + awaySectors.midfield * 0.3),
    (homeSectors.defense * 0.8 + homeSectors.goalkeeping * 0.2),
    away.metadata?.trend
  );

  // GERAÇÃO DOS EVENTOS (MARCADORES)
  const events = generateMatchEvents(home, away, homeScore, awayScore);

  return {
    homeScore,
    awayScore,
    status: 'finished',
    round,
    events
  };
};