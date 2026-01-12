// src/services/dataLoader.ts
import type { Championship, Team } from '../core/types';

// Carrega todos os campeonatos e times via Vite glob (build-time)
const championshipModules = import.meta.glob('../core/data/championships/*.json', { eager: true });
const teamModules = import.meta.glob('../core/data/teams/*.json', { eager: true });

// Tipos auxiliares
interface RawChampionship {
  id: string;
  name: string;
  season: string;
  teamIds: string[];
  type: 'liga' | 'copa';
  settings: {
    pointsWin: number;
    pointsDraw: number;
    hasPlayoffs: boolean;
  };
}

// Lista campeonatos para o dropdown
export async function listChampionships() {
  const list = [];
  for (const path in championshipModules) {
    const mod = championshipModules[path] as { default: RawChampionship };
    const champ = mod.default;
    list.push({
      id: champ.id,
      name: champ.name,
      season: champ.season,
      type: champ.type || 'liga',
    });
  }
  return list;
}

// Carrega um campeonato completo com times
export async function loadChampionship(id: string): Promise<Championship> {
  // 1. Encontra campeonato
  let rawChamp: RawChampionship | undefined;
  for (const path in championshipModules) {
    const mod = championshipModules[path] as { default: RawChampionship };
    if (mod.default.id === id) {
      rawChamp = mod.default;
      break;
    }
  }

  if (!rawChamp) {
    throw new Error(`Campeonato não encontrado: ${id}`);
  }

  // 2. Carrega times por ID
  const teams: Team[] = [];
  const teamIdSet = new Set(rawChamp.teamIds);

  for (const path in teamModules) {
    const mod = teamModules[path] as { default: Team };
    const team = mod.default;
    if (teamIdSet.has(team.id)) {
      teams.push(team);
    }
  }

  // 3. Valida se todos os times foram encontrados
  const loadedIds = new Set(teams.map(t => t.id));
  const missing = rawChamp.teamIds.find(id => !loadedIds.has(id));
  if (missing) {
    throw new Error(`Time com ID ${missing} não encontrado em src/data/teams/`);
  }

  // 4. Retorna campeonato completo
  return {
    id: rawChamp.id,
    name: rawChamp.name,
    season: rawChamp.season,
    settings: rawChamp.settings,
    teams,
  };
}