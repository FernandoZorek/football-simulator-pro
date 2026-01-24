// src/store/championships.ts
import { defineStore } from 'pinia';
import { Championship } from '../core/types';

export const useChampionshipsStore = defineStore('championships', {
  state: () => ({
    customChampionships: [] as Championship[],
    loading: false,
  }),
  
  persist: true,
  
  actions: {
    addChampionship(championship: Championship) {

        console.log('Adicionando campeonato ao championshipsStore:', {
          id: championship.id,
          name: championship.name,
          type: championship.type,
          hasType: 'type' in championship
        });
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
    
    getChampionshipById(id: string): Championship | undefined {
      return this.customChampionships.find(c => c.id === id);
    }
  }
});