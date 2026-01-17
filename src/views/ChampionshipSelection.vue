<!-- src/views/ChampionshipSelection.vue -->
<script setup lang="ts">
import { ref, onMounted, nextTick, computed } from 'vue';
import { useRouter } from 'vue-router';
import { Trophy, Users, Settings, Database, Plus, Search, Edit3, Trash2, ArrowLeft } from 'lucide-vue-next';
import { useChampionshipsStore } from '../store/championships';
import { loadChampionship } from '../services/dataLoader';
import { downloadUserData, importUserDataFromFile } from '../services/dataExport';

interface ChampionshipOption {
  id: string;
  name: string;
  season: string;
  type: 'liga' | 'copa';
  source: 'file' | 'memory';
}

const championships = ref<ChampionshipOption[]>([]);
const filteredChampionships = ref<ChampionshipOption[]>([]);
const loading = ref(true);
const searchQuery = ref('');
const router = useRouter();
const championshipsStore = useChampionshipsStore();

// Carrega campeonatos de AMBAS as fontes
const loadChampionships = async () => {
  loading.value = true;
  try {
    const allChampionships: ChampionshipOption[] = [];
    
    // 1. Carrega dos arquivos estáticos
    try {
      const fileModules = import.meta.glob('../core/data/championships/*.json', { eager: true });
      
      for (const [path, module] of Object.entries(fileModules)) {
        const champ = (module as { default: any }).default;
        allChampionships.push({
          id: champ.id,
          name: champ.name,
          season: champ.season,
          type: champ.type === 'liga' ? 'liga' : 'copa',
          source: 'file'
        });
      }
    } catch (error) {
      console.error('Erro ao carregar campeonatos dos arquivos:', error);
    }
    
    // 2. Carrega dos salvos em memória
    try {
      await nextTick();
      
      const memoryChampionships = championshipsStore.customChampionships.map(champ => ({
        id: champ.id,
        name: champ.name,
        season: champ.season,
        type: champ.type === 'liga' ? 'liga' : 'copa',
        source: 'memory'
      }));
      
      allChampionships.push(...memoryChampionships);
    } catch (error) {
      console.error('Erro ao carregar campeonatos da memória:', error);
    }
    
    // 3. Remove duplicatas (prioriza memória)
    const uniqueChampionships = new Map<string, ChampionshipOption>();
    allChampionships.forEach(champ => {
      if (!uniqueChampionships.has(champ.id) || champ.source === 'memory') {
        uniqueChampionships.set(champ.id, champ);
      }
    });
    
    championships.value = Array.from(uniqueChampionships.values()).sort((a, b) => 
      a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
    );
    filteredChampionships.value = [...championships.value];
  } catch (error) {
    console.error('Erro ao carregar campeonatos:', error);
  } finally {
    loading.value = false;
  }
};

// Interface simplificada
interface ChampionshipOption {
  id: string;
  name: string;
  season: string;
  type: 'liga' | 'copa';
  source: 'file' | 'memory';
}

// Função de filtro simplificada
const filterChampionships = () => {
  const query = searchQuery.value.toLowerCase().trim();
  
  if (!query) {
    filteredChampionships.value = [...championships.value];
  } else {
    filteredChampionships.value = championships.value.filter(champ => 
      champ.name.toLowerCase().includes(query) || 
      champ.season.includes(query)
    ).sort((a, b) => 
      a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
    );
  }
};

onMounted(() => {
  loadChampionships();
});

const selectChampionship = (champ: ChampionshipOption) => {
  if (champ.type === 'liga') {
    router.push(`/liga/${champ.id}`);
  } else if (champ.type === 'copa') {
    router.push(`/copa/${champ.id}`);
  }
};

const editChampionship = (champ: ChampionshipOption) => {
  if (champ.source === 'file') {
    loadChampionship(champ.id)
      .then(fullChampionship => {
        const copyId = `${champ.id}-copy-${Date.now()}`;
        const copiedChampionship = {
          id: copyId,
          name: `${champ.name} (Cópia)`,
          season: champ.season,
          type: champ.type,
          settings: fullChampionship.settings || {
            pointsWin: 3,
            pointsDraw: 1,
            hasPlayoffs: false
          },
          teamIds: fullChampionship.teams.map(team => team.id),
          source: 'memory' as const
        };
        
        championshipsStore.addChampionship(copiedChampionship);
        router.push(`/championships/edit/${copyId}`);
      })
      .catch(error => {
        console.error('Erro ao carregar campeonato para cópia:', error);
        alert('❌ Erro ao criar cópia do campeonato');
      });
  } else {
    router.push(`/championships/edit/${champ.id}`);
  }
};

const deleteChampionship = (champ: ChampionshipOption) => {
  if (champ.source !== 'memory') {
    alert('⚠️ Apenas campeonatos salvos em memória podem ser excluídos.');
    return;
  }
  
  if (confirm(`Tem certeza que deseja excluir "${champ.name}"?`)) {
    championshipsStore.removeChampionship(champ.id);
    loadChampionships(); // Recarrega a lista
    alert('✅ Campeonato excluído com sucesso!');
  }
};

const navigateTo = (path: string) => {
  router.push(path);
};

const goBack = () => {
  router.push('/');
};

const handleExport = () => {
  downloadUserData();
};

const handleImportFile = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  
  if (!file) return;
  
  if (!confirm('⚠️ Isso substituirá todos os seus dados atuais. Tem certeza?')) {
    target.value = '';
    return;
  }
  
  try {
    await importUserDataFromFile(file);
    alert('✅ Dados importados com sucesso!');
    loadChampionships(); // Recarrega a lista de campeonatos
    target.value = '';
  } catch (error) {
    alert(`❌ Erro ao importar: ${(error as Error).message}`);
    console.error(error);
  }
};
</script>

<template>
  <div class="min-h-screen bg-slate-900 text-slate-100">    
    <NavigationHeader />
    <div class="max-w-7xl mx-auto p-4 md:p-8">
      <!-- Header -->
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div class="flex items-center gap-4">
          <button 
            @click="goBack"
            class="md:hidden p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            <ArrowLeft class="w-5 h-5" />
          </button>
          <div class="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-500/20">
            <Trophy class="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 class="text-3xl font-black uppercase tracking-tighter">Campeonatos</h1>
            <p class="text-slate-400 mt-1">{{ championships.length }} campeonatos disponíveis</p>
          </div>
        </div>
        
        <div class="flex items-center gap-3 w-full md:w-auto">
          <div class="relative flex-1 md:flex-none">
            <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              v-model="searchQuery"
              @input="filterChampionships"
              type="text"
              placeholder="Buscar campeonato ou temporada..."
              class="w-full md:w-64 pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <button 
            @click="navigateTo('/championships/new')"
            class="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-lg text-white font-medium flex items-center gap-2 transition-colors whitespace-nowrap"
          >
            <Plus class="w-4 h-4" />
            Novo Campeonato
          </button>

          <!-- Botões de exportação/importação -->
          <div class="flex gap-3">
            <button
              @click="handleExport"
              class="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-white font-medium flex items-center gap-2 transition-colors"
              title="Exportar dados"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>
            
            <label class="bg-green-600 hover:bg-green-500 px-4 py-3 rounded-lg text-white font-medium flex items-center gap-2 cursor-pointer transition-colors" title="Importar Dados">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
              <input 
                type="file" 
                accept=".json" 
                @change="handleImportFile"
                class="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p class="text-slate-400">Carregando campeonatos...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredChampionships.length === 0" class="text-center py-12">
        <Trophy class="w-16 h-16 text-slate-600 mx-auto mb-4" />
        <h3 class="text-xl font-bold text-slate-300 mb-2">Nenhum campeonato encontrado</h3>
        <p class="text-slate-500">Tente ajustar sua busca ou crie novos campeonatos</p>
        <button
          @click="navigateTo('/championships/new')"
          class="mt-4 bg-emerald-600 hover:bg-emerald-500 px-6 py-2 rounded-lg text-white font-medium"
        >
          Criar Primeiro Campeonato
        </button>
      </div>

      <!-- Championships Grid -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <div
          v-for="champ in filteredChampionships"
          :key="champ.id"
          class="bg-slate-800 hover:bg-slate-750 rounded-2xl border border-slate-700 p-6 cursor-pointer transition-all group relative"
          @click="selectChampionship(champ)"
        >
          <!-- Badge de origem -->
          <div class="absolute top-2 right-2">
            <span 
              :class="`text-[10px] px-2 py-1 rounded-full ${
                champ.source === 'memory' 
                  ? 'bg-purple-600/20 text-purple-400' 
                  : 'bg-slate-700 text-slate-400'
              }`"
            >
              {{ champ.source === 'memory' ? 'Personalizado' : 'Padrão' }}
            </span>
          </div>
          
          <div class="font-bold text-lg mb-2">{{ champ.name }}</div>
          <div class="text-slate-400 text-sm mb-4">
            Temporada {{ champ.season }}
          </div>
          
          <div class="flex items-center justify-between mb-3">
            <span class="text-xs px-2 py-1 bg-slate-700 rounded-full">
              {{ champ.type === 'liga' ? 'Liga' : 'Copa' }}
            </span>
            <div class="flex items-center gap-2 text-blue-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
              <span>Simular</span>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </div>
          </div>
          
          <!-- Botões de ação -->
          <div class="flex gap-2 mt-3">
            <button
              @click.stop="editChampionship(champ)"
              class="flex-1 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 text-xs py-1.5 rounded-lg transition-colors"
            >
              <Edit3 class="w-3 h-3 inline mr-1" />
              Editar
            </button>
            
            <button
              @click.stop="deleteChampionship(champ)"
              :disabled="champ.source !== 'memory'"
              :class="`flex-1 text-xs py-1.5 rounded-lg transition-colors ${
                champ.source === 'memory'
                  ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }`"
            >
              <Trash2 class="w-3 h-3 inline mr-1" />
              Excluir
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bg-slate-750 {
  background-color: #334155;
}
</style>