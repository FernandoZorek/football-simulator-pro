// src/services/copaStructureCalculator.ts
import { Team, Group } from '../core/types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Configurações padrão para estrutura de copa
 */
const DEFAULT_CONFIG = {
  minTeamsPerGroup: 3,     // Mínimo de times por grupo
  maxTeamsPerGroup: 6,     // Máximo de times por grupo
  qualifiedPerGroup: 2,    // Times classificados por grupo (padrão)
  targetKnockoutStages: [32, 16, 8, 4, 2] as const // Estrutura das fases eliminatórias
};

/**
 * Calcula a estrutura ideal para uma copa com base no número de times
 * @param teams - Array de times participantes
 * @param config - Configurações opcionais
 * @returns Estrutura completa com grupos e fases eliminatórias
 */
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
  
  // 1. VALIDAÇÃO INICIAL
  if (totalTeams < mergedConfig.minTeamsPerGroup) {
    throw new Error(`Número mínimo de times é ${mergedConfig.minTeamsPerGroup}, mas foram fornecidos ${totalTeams}`);
  }

  // 2. REGRAS ESPECÍFICAS PARA NÚMEROS COMUNS DE TIMES
  let idealGroups: number;
  let teamsPerGroup: number;
  
  if (totalTeams === 12) {
    // Caso especial: 12 times = 2 grupos de 6
    idealGroups = 2;
    teamsPerGroup = 6;
  } else if (totalTeams === 16) {
    // 16 times = 4 grupos de 4
    idealGroups = 4;
    teamsPerGroup = 4;
  } else if (totalTeams === 24) {
    // 24 times = 6 grupos de 4
    idealGroups = 6;
    teamsPerGroup = 4;
  } else if (totalTeams === 32) {
    // 32 times = 8 grupos de 4
    idealGroups = 8;
    teamsPerGroup = 4;
  } else {
    // Lógica genérica para outros números
    idealGroups = 1;
    teamsPerGroup = totalTeams;
    
    let bestDiff = Infinity;
    
    // Tenta encontrar o número ideal de grupos
    for (let groups = 1; groups <= Math.min(16, totalTeams); groups++) {
      const teamsPerCurrentGroup = Math.ceil(totalTeams / groups);
      
      if (teamsPerCurrentGroup >= mergedConfig.minTeamsPerGroup && 
          teamsPerCurrentGroup <= mergedConfig.maxTeamsPerGroup) {
        const diff = Math.abs(teamsPerCurrentGroup * groups - totalTeams);
        if (diff < bestDiff) {
          bestDiff = diff;
          idealGroups = groups;
          teamsPerGroup = teamsPerCurrentGroup;
        }
      }
    }
    
    // Se não encontrou configuração ideal, ajusta
    if (bestDiff === Infinity) {
      if (totalTeams <= mergedConfig.maxTeamsPerGroup) {
        idealGroups = 1;
        teamsPerGroup = totalTeams;
      } else {
        idealGroups = Math.ceil(totalTeams / mergedConfig.maxTeamsPerGroup);
        teamsPerGroup = Math.ceil(totalTeams / idealGroups);
        
        // Garante máximo de 16 grupos
        if (idealGroups > 16) {
          idealGroups = 16;
          teamsPerGroup = Math.ceil(totalTeams / 16);
        }
      }
    }
  }

  // 3. CRIA OS GRUPOS
  const groups: Group[] = [];
  const groupNames = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  
  for (let i = 0; i < idealGroups; i++) {
    groups.push({
      id: `group-${uuidv4()}`,
      name: groupNames[i] || `Grupo ${i + 1}`,
      teamIds: []
    });
  }

  // 4. DISTRIBUI OS TIMES NOS GRUPOS (balanceado)
  const sortedTeams = [...teams].sort((a, b) => {
    const avgA = a.players.reduce((sum, p) => sum + p.overall, 0) / a.players.length;
    const avgB = b.players.reduce((sum, p) => sum + p.overall, 0) / b.players.length;
    return avgB - avgA;
  });
  
  for (let i = 0; i < sortedTeams.length; i++) {
    const groupIndex = i % idealGroups;
    groups[groupIndex].teamIds.push(sortedTeams[i].id);
  }

  // 5. CALCULA NÚMERO TOTAL DE CLASSIFICADOS
// Ajuste automático de classificados por grupo
let qualifiedPerGroup = mergedConfig.qualifiedPerGroup;

// Para grupos grandes (mais de 6 times), forçar 2 classificados
if (teamsPerGroup > 6) {
  qualifiedPerGroup = 2;
} else if (teamsPerGroup === 6) {
  // Caso especial: 6 times → 2 ou 3 classificados?
  // Para 12 times (2 grupos), usamos 4 classificados por grupo
  if (totalTeams === 12) {
    qualifiedPerGroup = 4;
  } else {
    qualifiedPerGroup = 2; // Padrão para outros casos
  }
} else if (teamsPerGroup === 5) {
  qualifiedPerGroup = 2;
} else if (teamsPerGroup === 4) {
  qualifiedPerGroup = 2;
} else {
  qualifiedPerGroup = Math.min(2, teamsPerGroup);
}

// Se tiver muitos grupos (ex: 16+), forçar 2 classificados por grupo
if (idealGroups > 10) {
  qualifiedPerGroup = 2;
}
  
  // Força configuração específica para 12 times
  if (totalTeams === 12) {
    qualifiedPerGroup = 4; // 2 grupos de 6 → 4 classificados por grupo = 8 times no mata-mata
  }

  const totalQualified = idealGroups * qualifiedPerGroup;
  
  // 6. DETERMINA ESTRUTURA DAS FASES ELIMINATÓRIAS
  let knockoutStages = [32, 16, 8, 4, 2];
  
  let initialStage = 2;
  for (const stage of knockoutStages) {
    if (stage >= totalQualified) {
      initialStage = stage;
      break;
    }
  }
  
  let initialPhase: ChampionshipPhase;
  
  if (initialStage >= 32) {
    initialPhase = 'round_32';
  } else if (initialStage >= 16) {
    initialPhase = 'round_16';
  } else if (initialStage >= 8) {
    initialPhase = 'quarters';
  } else if (initialStage >= 4) {
    initialPhase = 'semis';
  } else {
    initialPhase = 'final';
  }
  
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