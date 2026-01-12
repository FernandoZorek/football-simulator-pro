// src/core/data/index.ts
import { listChampionships } from '../../services/dataLoader';

export interface DataOption {
  id: string;
  label: string;
}

// Será preenchido após initialize()
export const DATA_OPTIONS: DataOption[] = [];

export async function initializeDataOptions() {
  try {
    const championships = await listChampionships();
    DATA_OPTIONS.splice(0); // limpa
    DATA_OPTIONS.push(
      ...championships.map(champ => ({
        id: champ.id,
        label: `${champ.name} ${champ.season}`,
      }))
    );
  } catch (err) {
    console.error('Erro ao inicializar campeonatos:', err);
  }
}