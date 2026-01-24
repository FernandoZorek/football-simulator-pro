<!-- src/components/NavigationHeader.vue -->
<script setup lang="ts">
import { useRouter } from 'vue-router';
import { Trophy, Users, Settings, Database, Plus, Search, Play } from 'lucide-vue-next';
import { ref, onMounted, watch } from 'vue';
import { useChampionshipStore } from '../store/championship';

const router = useRouter();
const championshipStore = useChampionshipStore();
const activeSimulations = ref<{ id: string; name: string; season: string }[]>([]);
const showSimulationsMenu = ref(false);

const navigateTo = (path: string) => {
  router.push(path);
};

const loadActiveSimulations = () => {
  activeSimulations.value = Object.entries(championshipStore.championships)
    .map(([id, champState]) => ({
      id,
      name: champState.data?.name || 'Campeonato sem nome',
      type: champState.data?.type || 'liga',
      season: champState.data?.season || 'Sem temporada'
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));
};

const clearAllSimulations = () => {
  if (confirm('⚠️ Tem certeza que deseja limpar todas as simulações ativas?\n\nEssa ação não pode ser desfeita e apagará todos os progressos das simulações salvas.')) {
    championshipStore.clearAllSimulations();
    showSimulationsMenu.value = false;
    alert('✅ Todas as simulações foram limpas com sucesso!');
  }
};

onMounted(() => {
  loadActiveSimulations();
});

watch(
  () => Object.keys(championshipStore.championships).length,
  () => {
    loadActiveSimulations();
  }
);
</script>

<template>
  <header class="bg-slate-800/90 backdrop-blur-md border-b border-slate-700 sticky top-0 z-40 mb-8">
    <div class="max-w-7xl mx-auto px-4 md:px-8 py-3">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <div class="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-500/20">
            <Trophy class="w-6 h-6 text-white" />
          </div>
          <h1 
            class="text-xl font-black uppercase tracking-tighter bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent cursor-pointer"
            @click="navigateTo('/')"
          >
            Football Simulator
          </h1>
        </div>
        
        <nav class="flex flex-wrap items-center gap-2 relative">
          <button
            @click="navigateTo('/championships')"
            class="px-3 py-1.5 text-sm rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1"
            title="Campeonatos"
          >
            <Trophy class="w-4 h-4" />
            <span class="hidden sm:inline">Campeonatos</span>
          </button>
          
          <button
            @click="navigateTo('/teams')"
            class="px-3 py-1.5 text-sm rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1"
            title="Times"
          >
            <Users class="w-4 h-4" />
            <span class="hidden sm:inline">Times</span>
          </button>
          
          <button
            @click="navigateTo('/players')"
            class="px-3 py-1.5 text-sm rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1"
            title="Atletas"
          >
            <Search class="w-4 h-4" />
            <span class="hidden sm:inline">Atletas</span>
          </button>
          
          <button
            @click="navigateTo('/settings')"
            class="px-3 py-1.5 text-sm rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1"
            title="Configurações"
          >
            <Settings class="w-4 h-4" />
            <span class="hidden sm:inline">Configurações</span>
          </button>
          
          <div class="relative" v-if="activeSimulations.length > 0">
            <button
              @click="showSimulationsMenu = !showSimulationsMenu"
              class="px-3 py-1.5 text-sm rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1"
              title="Simulações Ativas"
            >
              <Play class="w-4 h-4" />
              <span class="hidden sm:inline">Simulações</span>
              <svg 
                :class="`w-3 h-3 ml-1 transition-transform ${showSimulationsMenu ? 'rotate-180' : ''}`" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            <div 
              v-show="showSimulationsMenu"
              class="absolute right-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50"
              @click.outside="showSimulationsMenu = false"
            >
              <div class="p-2 border-b border-slate-700">
                <h3 class="text-xs font-semibold text-slate-400 uppercase tracking-wide">Simulações Ativas</h3>
              </div>
              <div class="max-h-60 overflow-y-auto">
                <button
                  v-for="sim in activeSimulations"
                  :key="sim.id"
                  @click="() => { navigateTo(`/${sim.type}/${sim.id}`); showSimulationsMenu = false; }"
                  class="w-full text-left px-3 py-2 hover:bg-slate-700/50 transition-colors group"
                >
                  <div class="font-medium text-white text-sm">{{ sim.name }}</div>
                  <div class="text-xs text-slate-400">Temporada {{ sim.season }}</div>
                </button>
              </div>
              <div class="p-2 border-t border-slate-700">
                <button
                  @click="clearAllSimulations"
                  class="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors"
                >
                  Limpar Todas
                </button>
              </div>
            </div>
          </div>
        </nav>
      </div>
    </div>
  </header>
</template>

<style scoped>
[v-cloak] {
  display: none;
}
</style>