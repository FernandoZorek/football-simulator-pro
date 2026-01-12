<!-- src/views/HomeSelection.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { listChampionships } from '../services/dataLoader';

interface ChampionshipOption {
  id: string;
  name: string;
  season: string;
  type: 'liga' | 'copa';
}

const championships = ref<ChampionshipOption[]>([]);
const router = useRouter();

onMounted(async () => {
  const list = await listChampionships();
  // Supondo que você atualizou listChampionships() para incluir 'type'
  championships.value = list as ChampionshipOption[];
});

const selectChampionship = (champ: ChampionshipOption) => {
  if (champ.type === 'liga') {
    router.push(`/liga/${champ.id}`);
  } else if (champ.type === 'copa') {
    router.push(`/copa/${champ.id}`);
  }
};
</script>

<template>
  <div class="min-h-screen bg-slate-900 text-slate-100 p-8">
    <div class="max-w-3xl mx-auto text-center">
      <h1 class="text-3xl font-bold mb-8">Escolha um Campeonato</h1>
      <div class="grid gap-4">
        <button
          v-for="champ in championships"
          :key="champ.id"
          @click="selectChampionship(champ)"
          class="bg-slate-800 hover:bg-slate-700 p-6 rounded-xl border border-slate-600 text-left transition"
        >
          <div class="font-bold text-lg">{{ champ.name }}</div>
          <div class="text-slate-400 text-sm">
            Temporada {{ champ.season }} • {{ champ.type === 'liga' ? 'Liga (pontos corridos)' : 'Copa (mata-mata)' }}
          </div>
        </button>
      </div>
    </div>
  </div>
</template>