// src/services/dataLoader.ts
import type { Championship, Team } from '../core/types';
import { useChampionshipsStore } from '../store/championships';
import { useTeamsStore } from '../store/teams';

// Carrega dos arquivos estáticos (build-time)
const championshipModules = import.meta.glob('../core/data/championships/*.json', { eager: true });
const teamModules = import.meta.glob('../core/data/teams/*.json', { eager: true });

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

// Lista campeonatos de AMBAS as fontes
export async function listChampionships() {
  const list = [];
  
  // 1. Campeonatos dos arquivos
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
  
  // 2. Campeonatos da memória
  const championshipsStore = useChampionshipsStore();
  await new Promise(resolve => setTimeout(resolve, 0)); // Aguarda store
  
  for (const champ of championshipsStore.customChampionships) {
    list.push({
      id: champ.id,
      name: champ.name,
      season: champ.season,
      type: champ.type || 'liga',
    });
  }
  
  // 3. Remove duplicatas (prioriza memória)
  const unique = new Map();
  list.forEach(item => {
    if (!unique.has(item.id)) {
      unique.set(item.id, item);
    }
  });
  
  return Array.from(unique.values());
}

// Carrega campeonato de AMBAS as fontes (times + campeonatos)
export async function loadChampionship(id: string): Promise<Championship> {
  // 1. Primeiro tenta da memória
  const championshipsStore = useChampionshipsStore();
  const teamsStore = useTeamsStore(); // ✅
  
  await new Promise(resolve => setTimeout(resolve, 0));
  
  // ✅ Carrega times do store persistente
  await teamsStore.loadFromFiles();
  
  const memoryChamp = championshipsStore.customChampionships.find(c => c.id === id);
  if (memoryChamp) {
    // ✅ Carrega times de AMBAS as fontes (memória + arquivos)
    const teams: Team[] = [];
    const teamIdSet = new Set(memoryChamp.teamIds);
    
    // Primeiro tenta do store de times (memória)
    for (const teamId of memoryChamp.teamIds) {
      const teamFromStore = teamsStore.getTeamById(teamId);
      if (teamFromStore) {
        teams.push(teamFromStore);
      }
    }
    
    // Depois tenta dos arquivos estáticos (fallback)
    if (teams.length < memoryChamp.teamIds.length) {
      const loadedIds = new Set(teams.map(t => t.id));
      
      for (const path in teamModules) {
        const mod = teamModules[path] as { default: Team };
        const team = mod.default;
        if (teamIdSet.has(team.id) && !loadedIds.has(team.id)) {
          teams.push(team);
        }
      }
    }
    
    // Validação final
    const loadedIds = new Set(teams.map(t => t.id));
    const missing = memoryChamp.teamIds.find(tid => !loadedIds.has(tid));
    if (missing) {
      throw new Error(`Time com ID ${missing} não encontrado`);
    }
    
    return {
      id: memoryChamp.id,
      name: memoryChamp.name,
      season: memoryChamp.season,
      type: memoryChamp.type,
      settings: memoryChamp.settings,
      teams,
    };
  }
  
  // 2. Fallback: dos arquivos
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

  // Carrega times dos arquivos
  const teams: Team[] = [];
  const teamIdSet = new Set(rawChamp.teamIds);

  for (const path in teamModules) {
    const mod = teamModules[path] as { default: Team };
    const team = mod.default;
    if (teamIdSet.has(team.id)) {
      teams.push(team);
    }
  }

  const loadedIds = new Set(teams.map(t => t.id));
  const missing = rawChamp.teamIds.find(id => !loadedIds.has(id));
  if (missing) {
    throw new Error(`Time com ID ${missing} não encontrado em src/data/teams/`);
  }

  return {
    id: rawChamp.id,
    name: rawChamp.name,
    season: rawChamp.season,
    settings: rawChamp.settings,
    teams,
  } as Championship;
}