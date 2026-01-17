// src/store/championships.ts
import { defineStore } from 'pinia';
import { ChampionshipConfig } from '../core/types';

export const useChampionshipsStore = defineStore('championships', {
  state: () => ({
    customChampionships: [] as ChampionshipConfig[],
    loading: false,
  }),
  
  persist: true,
  
  actions: {
    addChampionship(championship: ChampionshipConfig) {
      // Verifica se já existe
      const exists = this.customChampionships.find(c => c.id === championship.id);
      if (exists) {
        // Atualiza existente
        const index = this.customChampionships.findIndex(c => c.id === championship.id);
        this.customChampionships[index] = championship;
      } else {
        // Adiciona novo
        this.customChampionships.push(championship);
      }
    },
    
    removeChampionship(id: string) {
      this.customChampionships = this.customChampionships.filter(c => c.id !== id);
    },
    
    getChampionshipById(id: string): ChampionshipConfig | undefined {
      return this.customChampionships.find(c => c.id === id);
    }
  }
});