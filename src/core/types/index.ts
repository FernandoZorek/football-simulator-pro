/**
 * POSIÇÕES PADRÕES
 * Mapeadas para facilitar o cálculo por setores do campo.
 */
export type PlayerPosition = 
  | 'GK'                // Goleiro
  | 'CB' | 'LB' | 'RB'  // Zagueiro, Lat. Esquerdo, Lat. Direito
  | 'CDM' | 'CM' | 'CAM' // Volante, Meia Central, Meia Atacante
  | 'ST' | 'LW' | 'RW';  // Centroavante, Ponta Esquerda, Ponta Direita

/**
 * FORMAÇÕES TÁTICAS
 * A string define o nome, e o motor usará isso para bônus/penalidades.
 */
export type FormationType = 
  | '4-4-2' | '4-3-3' | '3-5-2' | '4-5-1' 
  | '5-3-2' | '4-2-3-1' | '5-2-3' | '3-4-3';

/**
 * FASES DO CAMPEONATO
 */
export type ChampionshipPhase = 
  | 'groups' 
  | 'round_32' 
  | 'round_16' 
  | 'quarters' 
  | 'semis' 
  | 'third' 
  | 'final';

// ────────────────────────────────────────
// ENTIDADES BÁSICAS
// ────────────────────────────────────────

export interface Player {
  id: string;
  name: string;
  age: number;
  position: PlayerPosition;
  overall: number;
  energy: number; // 0 a 100 (para simular cansaço)
  isReserve: boolean;
  photo?: string; // URL ou caminho da foto do jogador
}

/**
 * ESTATÍSTICAS DE SETOR
 * Calculadas pelo motor com base na escalação e formação.
 */
export interface TeamSectors {
  attack: number;
  midfield: number;
  defense: number;
  goalkeeping: number;
}

/**
 * ENTIDADE DE TIME
 */
export interface Team {
  id: string;
  name: string;
  shortName: string; // Ex: "FLA"
  formation: FormationType;
  players: Player[];
  logo?: string; // URL ou caminho do escudo
  metadata: {
    h2hBias: Record<string, number>; // Vantagem contra IDs específicos
    trend: number;    // -1 (crise) a 1 (auge)
    prestige: number; // 1 a 5 estrelas (influencia público/pressão)
  };
  stats?: TeamSectors; // Calculado em runtime
}

// ────────────────────────────────────────
// PARTIDAS E EVENTOS
// ────────────────────────────────────────

export interface MatchEvent {
  minute: number;
  type: 'goal' | 'yellow_card' | 'red_card' | 'injury';
  playerId: string;
  teamId: string;
  playerName?: string; // Facilitar exibição sem buscar no array de times
}

export interface Match {
  id: string;
  // No mata-mata, os IDs podem ser nulos até a fase anterior acabar
  homeTeamId: string | null; 
  awayTeamId: string | null;
  homeScore: number;
  awayScore: number;
  status: 'scheduled' | 'playing' | 'finished';
  round: number;
  events: MatchEvent[];
  
  // Controle de Copa
  phase: ChampionshipPhase;
  group?: string; // Ex: 'A'
  
  // Placar de Pênaltis (Obrigatório para desempate no mata-mata)
  penaltyScore?: {
    home: number;
    away: number;
  };

  // Identificadores para progressão automática
  nextMatchId?: string;
  path?: 'home' | 'away';
  bracketSide?: 'left' | 'right';
}

// ────────────────────────────────────────
// GRUPOS (COPAS)
// ────────────────────────────────────────

export interface Group {
  id: string;
  name: string; // Ex: "Grupo A"
  teamIds: string[]; // IDs dos times que pertencem a este grupo
}

// ────────────────────────────────────────
// CONFIGURAÇÕES DE CAMPEONATO
// ────────────────────────────────────────

export interface ChampionshipSettings {
  minTeamsPerGroup: number | undefined;
  maxTeamsPerGroup: number | undefined;
  qualifiedPerGroup: number | undefined;
  pointsWin: number;
  pointsDraw: number;
  hasPlayoffs: boolean;
  isTwoLegged: boolean;
}

export interface CopaSettings {
  hasGroups?: boolean;
  minTeamsPerGroup?: number;
  maxTeamsPerGroup?: number;
  qualifiedPerGroup?: number;
  matchupType?: string; // ex: 'within_group', 'cross_groups'
  autoAssignGroups?: boolean;
}

// ────────────────────────────────────────
// CAMPEONATO
// ────────────────────────────────────────

export interface Championship {
  id: string;
  name: string;
  season: string;
  type: 'liga' | 'copa';
  teams: Team[];
  
  // Metadados visuais
  logo?: string;
  trophy?: string;

  // Configurações
  settings: ChampionshipSettings;
  copaSettings?: CopaSettings; // apenas relevante se type === 'copa'

  // Estrutura de grupos (copa)
  customGroups?: Array<{ name: string; teamIds: string[] }>;
  groups?: Group[];

  // Estado da simulação (não faz parte do campeonato original)
  currentPhase?: ChampionshipPhase;
}

// ────────────────────────────────────────
// CONFIGURAÇÃO GLOBAL DA SIMULAÇÃO
// ────────────────────────────────────────

export interface SimulationConfig {
  homeAdvantage: number;
  randomness: number;
  minGoalBase: number;
  maxGoalBase: number;
  formationImpact: number;
  trendImpact: number;
}