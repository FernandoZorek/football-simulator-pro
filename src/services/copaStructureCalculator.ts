// src/services/copaStructureCalculator.ts
import { Team, Group, ChampionshipPhase } from '../core/types';
import { v4 as uuidv4 } from 'uuid';

const DEFAULT_CONFIG = {
  minTeamsPerGroup: 3,
  maxTeamsPerGroup: 6,
  qualifiedPerGroup: 2,
  targetKnockoutStages: [32, 16, 8, 4, 2] as const
};

export const calculateCopaStructure = (
  teams: Team[], 
  config: Partial<typeof DEFAULT_CONFIG> & { qualifiedPerGroup?: number } = {}
) => {
  const mergedConfig = { 
    ...DEFAULT_CONFIG, 
    qualifiedPerGroup: config.qualifiedPerGroup || DEFAULT_CONFIG.qualifiedPerGroup,
    ...config 
  };
  
  const totalTeams = teams.length;
  
  // Validação inicial
  if (totalTeams < mergedConfig.minTeamsPerGroup) {
    throw new Error(`Número mínimo de times é ${mergedConfig.minTeamsPerGroup}, mas foram fornecidos ${totalTeams}`);
  }

  // Casos especiais para números comuns
  let idealGroups: number;
  let teamsPerGroup: number;
  
  if (totalTeams === 12) {
    idealGroups = 2;
    teamsPerGroup = 6;
  } else if (totalTeams === 16) {
    idealGroups = 4;
    teamsPerGroup = 4;
  } else if (totalTeams === 24) {
    idealGroups = 6;
    teamsPerGroup = 4;
  } else if (totalTeams === 32) {
    idealGroups = 8;
    teamsPerGroup = 4;
  } else {
    // Lógica genérica que respeita as configurações do usuário
    const minPerGroup = mergedConfig.minTeamsPerGroup;
    const maxPerGroup = mergedConfig.maxTeamsPerGroup;
    
    // Calcula o número ideal de grupos
    idealGroups = Math.ceil(totalTeams / maxPerGroup);
    
    // Ajusta se necessário
    if (idealGroups === 0) idealGroups = 1;
    if (idealGroups > 16) idealGroups = 16;
    
    teamsPerGroup = Math.ceil(totalTeams / idealGroups);
    
    // Verifica se ultrapassa os limites
    if (teamsPerGroup < minPerGroup) {
      teamsPerGroup = minPerGroup;
      idealGroups = Math.ceil(totalTeams / teamsPerGroup);
    }
    
    if (teamsPerGroup > maxPerGroup) {
      teamsPerGroup = maxPerGroup;
      idealGroups = Math.ceil(totalTeams / teamsPerGroup);
    }
    
    // Garante máximo de 16 grupos
    if (idealGroups > 16) {
      idealGroups = 16;
      teamsPerGroup = Math.ceil(totalTeams / 16);
    }
  }

  // Cria os grupos
  const groups: Group[] = [];
  const groupNames = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  
  for (let i = 0; i < idealGroups; i++) {
    groups.push({
      id: `group-${uuidv4()}`,
      name: groupNames[i] || `Grupo ${i + 1}`,
      teamIds: []
    });
  }

  // Distribui os times (ordem balanceada)
  const sortedTeams = [...teams].sort((a, b) => {
    const avgA = a.players.reduce((sum, p) => sum + p.overall, 0) / a.players.length;
    const avgB = b.players.reduce((sum, p) => sum + p.overall, 0) / b.players.length;
    return avgB - avgA;
  });
  
  for (let i = 0; i < sortedTeams.length; i++) {
    const groupIndex = i % idealGroups;
    // ✅ Proteção segura
    if (groups[groupIndex]) {
      groups[groupIndex].teamIds.push(sortedTeams[i].id);
    }
  }

  // Calcula classificados
  let qualifiedPerGroup = mergedConfig.qualifiedPerGroup;
  let totalQualified = 0;

  if (groups && groups.length > 0) {
    // Se houver grupos personalizados, use-os para calcular o número de classificados
    totalQualified = groups.reduce((sum, group) => sum + Math.min(group.teamIds.length, qualifiedPerGroup), 0);
  } else {
    totalQualified = idealGroups * qualifiedPerGroup;
  }
  
  // Determina fases eliminatórias
  let knockoutStages = [32, 16, 8, 4, 2];
  let initialStage = 2;
  
  for (const stage of knockoutStages) {
    if (stage >= totalQualified) {
      initialStage = stage;
      break;
    }
  }
  
  let initialPhase: ChampionshipPhase;
  if (initialStage >= 32) initialPhase = 'round_32';
  else if (initialStage >= 16) initialPhase = 'round_16';
  else if (initialStage >= 8) initialPhase = 'quarters';
  else if (initialStage >= 4) initialPhase = 'semis';
  else initialPhase = 'final';
  
  const relevantStages = knockoutStages.filter(stage => stage >= initialStage);
  
  return {
    groups,
    qualifiedPerGroup,
    totalQualified,
    initialKnockoutStage: initialStage,
    initialKnockoutPhase: initialPhase,
    knockoutStages: relevantStages,
    config: mergedConfig
  };
};