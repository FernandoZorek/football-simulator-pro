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
 * ATRIBUTOS DE JOGADOR
 */
export interface Player {
  id: string;
  name: string;
  age: number;
  position: PlayerPosition;
  overall: number;
  energy: number; // 0 a 100 (para simular cansaço)
  isReserve: boolean;
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
  colors: {
    primary: string;
    secondary: string;
  };
  formation: FormationType;
  players: Player[];
  
  // Metadados de "Dor" do usuário (Histórico/Contexto)
  metadata: {
    h2hBias: Record<string, number>; // Vantagem contra IDs específicos
    trend: number;    // -1 (crise) a 1 (auge)
    prestige: number; // 1 a 5 estrelas (influencia público/pressão)
  };

  stats?: TeamSectors; // Calculado em runtime
}

/**
 * ESTRUTURA DE PARTIDA
 */
export interface Match {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  status: 'scheduled' | 'playing' | 'finished';
  round: number;
  events: MatchEvent[];
}

export interface MatchEvent {
  minute: number;
  type: 'goal' | 'yellow_card' | 'red_card' | 'injury';
  playerId: string;
  teamId: string;
}

/**
 * ESTRUTURA DO CAMPEONATO (JSON que o usuário sobe)
 */
export interface Championship {
  id: string;
  name: string;
  season: string;
  teams: Team[];  
  type: 'liga' | 'copa';
  settings: {
    pointsWin: number;
    pointsDraw: number;
    hasPlayoffs: boolean;
  };
}