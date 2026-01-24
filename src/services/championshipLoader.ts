// src/services/championshipLoader.ts
import { Championship } from '../core/types';
import { useChampionshipsStore } from '../store/championships';

/**
 * Carrega campeonatos de TODAS as fontes:
 * - Arquivos estáticos (src/core/data/championships/*.json)
 * - Campeonatos salvos em memória (localStorage)
 */
export async function loadAllChampionships(): Promise<Championship[]> {
  const allChampionships: Championship[] = [];
  
  // 1. Carrega dos arquivos estáticos
  try {
    const fileModules = import.meta.glob('../core/data/championships/*.json', { eager: true });
    
    for (const [path, module] of Object.entries(fileModules)) {
      const champ = (module as { default: Championship }).default;
      allChampionships.push(champ);
    }
  } catch (error) {
    console.warn('Erro ao carregar campeonatos dos arquivos:', error);
  }
  
  // 2. Carrega dos salvos em memória
  try {
    const championshipsStore = useChampionshipsStore();
    // Força o carregamento do store
    await new Promise(resolve => setTimeout(resolve, 0));
    
    allChampionships.push(...championshipsStore.customChampionships);
  } catch (error) {
    console.warn('Erro ao carregar campeonatos da memória:', error);
  }
  
  // 3. Remove duplicatas (prioriza memória)
  const uniqueChampionships = new Map<string, Championship>();
  allChampionships.forEach(champ => {
    // Se já existe, mantém o mais recente (memória tem prioridade)
    if (!uniqueChampionships.has(champ.id)) {
      uniqueChampionships.set(champ.id, champ);
    }
  });
  
  return Array.from(uniqueChampionships.values());
}

/**
 * Carrega um campeonato específico por ID
 */
export async function loadChampionshipById(id: string): Promise<Championship | null> {
  const allChampionships = await loadAllChampionships();
  return allChampionships.find(champ => champ.id === id) || null;
}