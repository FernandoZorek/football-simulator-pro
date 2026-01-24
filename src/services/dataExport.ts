// src/services/dataExport.ts
import { Championship, Team, Match } from '../core/types';
import { useTeamsStore } from '../store/teams';
import { useChampionshipStore } from '../store/championship';
import { useChampionshipsStore } from '../store/championships';

export interface SimulationExport {
  version: string;
  timestamp: string;
  championshipId: string;
  championshipName: string;
  season: string;
  type: 'liga' | 'copa';
  teams: Team[];
  matches: Match[];
  customGroups?: Array<{ name: string; teamIds: string[] }>;
  currentRound: number;
}

export interface UserDataExport {
  version: string;
  timestamp: string;
  teams: Team[];
  customChampionships?: any[]; 
  lastSimulation?: SimulationExport[];
}

// Exporta simulação atual
export const exportCurrentSimulation = (): SimulationExport => {
  const championshipStore = useChampionshipStore();
  const teamsStore = useTeamsStore();
  
  if (!championshipStore.data) {
    throw new Error('Nenhuma simulação ativa');
  }
  
  const syncedTeams = championshipStore.data.teams.map(originalTeam => {
    const editedTeam = teamsStore.getTeamById(originalTeam.id);
    return editedTeam || originalTeam;
  });
  
  return {
    version: '1.0',
    timestamp: new Date().toISOString(),
    championshipId: championshipStore.data.id,
    championshipName: championshipStore.data.name,
    season: championshipStore.data.season,
    type: championshipStore.data.type || 'liga',
    teams: syncedTeams,
    matches: [...championshipStore.matches],
    customGroups: championshipStore.data.customGroups,
    currentRound: championshipStore.matches.reduce((max, match) => 
      match.status === 'finished' ? Math.max(max, match.round) : max, 0
    ) + 1
  };
};

// Importa uma única simulação
export const importSimulation = async (data: SimulationExport): Promise<void> => {
  const championshipStore = useChampionshipStore();
  const teamsStore = useTeamsStore();
  
  if (!data.version || !data.championshipId || !Array.isArray(data.matches)) {
    throw new Error('Arquivo de simulação inválido');
  }
  
  if (data.teams.length === 0) {
    throw new Error('Nenhum time encontrado na simulação');
  }
  
  // ✅ Adiciona/atualiza times da simulação no store
  const existingTeamMap = new Map(teamsStore.teams.map(team => [team.id, team]));
  const mergedTeams = [...teamsStore.teams];
  
  for (const simTeam of data.teams) {
    const existingIndex = mergedTeams.findIndex(t => t.id === simTeam.id);
    if (existingIndex !== -1) {
      // Atualiza time existente com dados da simulação
      mergedTeams[existingIndex] = { ...mergedTeams[existingIndex], ...simTeam };
    } else {
      // Adiciona novo time
      mergedTeams.push(simTeam);
    }
  }
  
  teamsStore.teams = mergedTeams;
  
  // ✅ VALIDAÇÃO: Número ímpar de times
  if (data.teams.length % 2 !== 0) {
    console.warn(`⚠️ Número ímpar de times detectado (${data.teams.length}).`);
    const confirmed = confirm(
      `⚠️ O campeonato tem ${data.teams.length} times (número ímpar).\n` +
      `Isso pode causar problemas na simulação.\n\n` +
      `Deseja continuar mesmo assim?`
    );
    if (!confirmed) {
      throw new Error('Importação cancelada pelo usuário');
    }
  }
  
  // ✅ Cria campeonato com os times da simulação
const championship = {
  id: data.championshipId,
  name: data.championshipName,
  season: data.season,
  type: data.type || 'liga',
  settings: championshipStore.data?.settings || { pointsWin: 3, pointsDraw: 1, hasPlayoffs: false },
  teams: data.teams,
  customGroups: data.customGroups,
};
  
  console.log('championship:', championship.data.type);
  championshipStore.loadChampionship(championship);
  championshipStore.matches = data.matches;
  
  console.log(`Simulação importada: ${data.championshipName} - ${data.teams.length} times`);
  console.log(`Total de times no store: ${teamsStore.teams.length}`);
};

// ✅ Nova função para importar APENAS os times
export const importTeamsOnly = (teams: Team[]): void => {
  const teamsStore = useTeamsStore();
  
  if (!Array.isArray(teams) || teams.length === 0) {
    throw new Error('Nenhum time encontrado para importação');
  }
  
  // ✅ Mescla times existentes com os novos
  const existingTeamMap = new Map(teamsStore.teams.map(team => [team.id, team]));
  const mergedTeams = [...teamsStore.teams];
  
  for (const importedTeam of teams) {
    const existingIndex = mergedTeams.findIndex(t => t.id === importedTeam.id);
    if (existingIndex !== -1) {
      // Atualiza time existente
      mergedTeams[existingIndex] = { ...mergedTeams[existingIndex], ...importedTeam };
    } else {
      // Adiciona novo time
      mergedTeams.push(importedTeam);
    }
  }
  
  teamsStore.teams = mergedTeams;
  console.log(`✅ ${teams.length} times importados. Total no store: ${mergedTeams.length}`);
};

// Exporta todos os dados do usuário (incluindo TODAS as simulações em memória)
// Exporta todos os dados do usuário (incluindo campeonatos personalizados e simulações)
export const exportUserData = (): UserDataExport => {
  const teamsStore = useTeamsStore();
  const championshipStore = useChampionshipStore();
  const championshipsStore = useChampionshipsStore(); // ✅
  
  const userData: UserDataExport = {
    version: '1.0',
    timestamp: new Date().toISOString(),
    teams: [...teamsStore.teams]
  };
  
  // ✅ EXPORTA CAMPEONATOS PERSONALIZADOS
  if (championshipsStore.customChampionships.length > 0) {
    userData.customChampionships = [...championshipsStore.customChampionships];
  }
  
  // ✅ EXPORTA TODAS AS SIMULAÇÕES EM MEMÓRIA
  if (championshipStore.championships) {
    const allSimulations: SimulationExport[] = [];
    
    for (const [champId, champState] of Object.entries(championshipStore.championships)) {
      if (champState.data && champState.matches.length > 0) {
        try {
          const syncedTeams = champState.data.teams.map(originalTeam => {
            const editedTeam = teamsStore.getTeamById(originalTeam.id);
            return editedTeam || originalTeam;
          });
          
          const simulationData: SimulationExport = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            championshipId: champId,
            championshipName: champState.data.name,
            season: champState.data.season,
            teams: syncedTeams,
            matches: [...champState.matches],
            currentRound: champState.matches.reduce((max, match) => 
              match.status === 'finished' ? Math.max(max, match.round) : max, 0
            ) + 1
          };
          
          allSimulations.push(simulationData);
        } catch (error) {
          console.warn(`⚠️ Não foi possível exportar simulação ${champId}:`, error);
        }
      }
    }
    
    if (allSimulations.length > 0) {
      userData.lastSimulation = allSimulations;
    }
  }
  
  return userData;
};

// Funções de importação atualizadas
export const importUserDataFromFile = (file: File): Promise<void> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        
        if (!data.version || !Array.isArray(data.teams)) {
          throw new Error('Arquivo não contém dados de usuário válidos');
        }
        
        // ✅ IMPORTA PRIMEIRO os times do nível raiz
        importTeamsOnly(data.teams);
        
        // ✅ IMPORTA CAMPEONATOS PERSONALIZADOS
        if (data.customChampionships && Array.isArray(data.customChampionships)) {
          const championshipsStore = useChampionshipsStore();
          championshipsStore.customChampionships = [...data.customChampionships];
          console.log(`✅ ${data.customChampionships.length} campeonatos personalizados importados`);
        }
        
        // ✅ IMPORTA SIMULAÇÕES
        if (data.lastSimulation && Array.isArray(data.lastSimulation)) {
          if (data.lastSimulation.length > 0) {
            console.log(`Importando ${data.lastSimulation.length} simulações...`);
            importSimulation(data.lastSimulation[0]);
            
            // Importa demais em background
            for (let i = 1; i < data.lastSimulation.length; i++) {
              setTimeout(() => {
                try {
                  importSimulation(data.lastSimulation![i]);
                } catch (error) {
                  console.error(`Erro ao importar simulação ${i}:`, error);
                }
              }, 0);
            }
          }
        }
        
        resolve();
      } catch (error) {
        console.error('Erro na importação:', error);
        reject(new Error(`Erro ao processar o arquivo: ${(error as Error).message}`));
      }
    };
    reader.onerror = () => reject(new Error('Erro ao ler o arquivo'));
    reader.readAsText(file);
  });
};

// Funções de download
export const downloadSimulation = (): void => {
  const data = exportCurrentSimulation();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${data.championshipName.replace(/\s+/g, '-')}-${data.season}-simulacao.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const downloadUserData = (): void => {
  const data = exportUserData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `football-simulator-completo-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const importSimulationFromFile = (file: File): Promise<void> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        
        if (!content || typeof content !== 'string') {
          throw new Error('Arquivo vazio ou inválido');
        }
        
        let data;
        try {
          data = JSON.parse(content);
        } catch (parseError) {
          throw new Error(`JSON inválido: ${parseError.message}`);
        }
        
        if (!data || typeof data !== 'object') {
          throw new Error('Arquivo não contém um objeto JSON válido');
        }
        
        if (!data.version) {
          throw new Error('Arquivo não é uma simulação válida (falta "version")');
        }
        
        if (!data.championshipId) {
          throw new Error('Arquivo não contém dados de campeonato válidos');
        }
        
        if (!Array.isArray(data.matches)) {
          throw new Error('Dados de partidas inválidos ou ausentes');
        }
        
        if (!Array.isArray(data.teams)) {
          throw new Error('Dados de times inválidos ou ausentes');
        }
        
        importSimulation(data);
        resolve();
      } catch (error) {
        console.error('Erro detalhado na importação:', error);
        reject(new Error(`Erro ao processar o arquivo de simulação: ${(error as Error).message}`));
      }
    };
    reader.onerror = () => {
      console.error('Erro ao ler arquivo:', reader.error);
      reject(new Error('Erro ao ler o arquivo. Tente novamente.'));
    };
    reader.readAsText(file);
  });
};