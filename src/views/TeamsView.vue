<!-- src/views/TeamsView.vue -->
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { Users, Search, Filter, Database, ArrowLeft, Plus } from 'lucide-vue-next';
import { Team } from '../core/types';
import TeamModal from '../components/team/TeamModal.vue';
import CreateTeamModal from '../components/team/CreateTeamModal.vue';
import { useTeamsStore } from '../store/teams';
import { downloadUserData, importUserDataFromFile } from '../services/dataExport';

interface TeamCard extends Team {
  searchMatch: boolean;
}

const teams = ref<TeamCard[]>([]);
const filteredTeams = ref<TeamCard[]>([]);
const loading = ref(true);
const searchQuery = ref('');
const selectedTeam = ref<Team | null>(null);
const isModalOpen = ref(false);
const showCreateTeamModal = ref(false);
const router = useRouter();
const teamsStore = useTeamsStore();

// Estado para novo time
const newTeam = ref({
  name: '',
  shortName: '',
  formation: '4-3-3' as const,
  logo: '',
  venue: {
    name: '',
    city: '',
    address: '',
    capacity: 0,
    surface: 'grass' as const,
    image: ''
  }
});

// Times ordenados alfabeticamente
const sortedTeams = computed(() => {
  return [...teams.value].sort((a, b) => 
    a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
  );
});

// Carrega times do store (com fallback para arquivos)
const loadTeams = async () => {
  loading.value = true;
  try {
    // Carrega do localStorage ou dos arquivos
    await teamsStore.loadFromFiles();
    
    teams.value = teamsStore.teams.map(team => ({
      ...team,
      searchMatch: true
    })).sort((a, b) => 
      a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
    );
    filteredTeams.value = [...teams.value];
  } catch (error) {
    console.error('Erro ao carregar times:', error);
  } finally {
    loading.value = false;
  }
};

// Filtra times
const filterTeams = () => {
  const query = searchQuery.value.toLowerCase().trim();
  
  if (!query) {
    // Quando não há busca, todos os times devem ser exibidos
    teams.value.forEach(team => {
      team.searchMatch = true;
    });
    filteredTeams.value = [...teams.value];
  } else {
    // Quando há busca, atualiza searchMatch para cada time
    teams.value.forEach(team => {
      const matches = team.name.toLowerCase().includes(query) || 
                     team.shortName.toLowerCase().includes(query) ||
                     team.players.some(p => p.name.toLowerCase().includes(query));
      team.searchMatch = matches;
    });
    // Mantém a ordenação alfabética
    filteredTeams.value = [...teams.value].sort((a, b) => 
      a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
    );
  }
};

// Atualiza time no store e na lista local
const updateTeamInStore = (updatedTeam: Team) => {
  teamsStore.updateTeam(updatedTeam);
  
  const localIndex = teams.value.findIndex(t => t.id === updatedTeam.id);
  if (localIndex !== -1) {
    teams.value[localIndex] = { ...updatedTeam, searchMatch: true };
    teams.value.sort((a, b) => 
      a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
    );
    filteredTeams.value = [...teams.value];
  }
  
  selectedTeam.value = updatedTeam;
};

// Cria novo time
// Função para normalizar strings (remove acentos e caracteres especiais)
const normalizeString = (str: string): string => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .toLowerCase()
    .replace(/\s+/g, '-') // Substitui espaços por hífens
    .replace(/[^a-z0-9-]/g, ''); // Remove caracteres especiais
};

const createNewTeam = () => {
  if (!newTeam.value.name.trim()) {
    alert('⚠️ Por favor, preencha o nome do time');
    return;
  }
  
  // ✅ Gera ID único com normalização de acentos
  const teamId = `${normalizeString(newTeam.value.name)}-${Date.now()}`;
  
  const createdTeam = {
    id: teamId,
    name: newTeam.value.name,
    shortName: newTeam.value.shortName || newTeam.value.name.substring(0, 3).toUpperCase(),
    formation: newTeam.value.formation,
    logo: newTeam.value.logo,
    // ✅ CORES PADRÃO
    colors: {
      primary: '#000000',
      secondary: '#ffffff'
    },
    // ✅ METADATA COMPLETA
    metadata: {
      h2hBias: {},
      trend: 0,
      prestige: 1
    },
    venue: newTeam.value.venue,
    players: [] // Time começa sem jogadores
  };
  
  teamsStore.updateTeam(createdTeam);
  
  // Atualiza lista local
  teams.value.push({ ...createdTeam, searchMatch: true });
  teams.value.sort((a, b) => 
    a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
  );
  filteredTeams.value = [...teams.value];
  
  showCreateTeamModal.value = false;
  newTeam.value = {
    name: '',
    shortName: '',
    formation: '4-3-3',
    logo: '',
    venue: {
      name: '',
      city: '',
      address: '',
      capacity: 0,
      surface: 'grass',
      image: ''
    }
  };
  
  alert('✅ Time criado com sucesso!');
};

const openTeamDetails = (team: Team) => {
  selectedTeam.value = team;
  isModalOpen.value = true;
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
    loadTeams();
    target.value = '';
  } catch (error) {
    alert(`❌ Erro ao importar: ${(error as Error).message}`);
    console.error(error);
  }
};

onMounted(() => {
  loadTeams();
});

const handleCreateTeam = (createdTeam: any) => {
  teamsStore.updateTeam(createdTeam);
  
  teams.value.push({ ...createdTeam, searchMatch: true });
  teams.value.sort((a, b) => 
    a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
  );
  filteredTeams.value = [...teams.value];
  
  alert('✅ Time criado com sucesso!');
};
</script>

<template>
  <div class="min-h-screen bg-slate-900 text-slate-100">    
    <NavigationHeader />
    <div class="max-w-7xl mx-auto">
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div class="flex items-center gap-4">
          <button 
            @click="goBack"
            class="md:hidden p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            <ArrowLeft class="w-5 h-5" />
          </button>
          <div class="bg-green-600 p-3 rounded-2xl shadow-lg shadow-green-500/20">
            <Users class="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 class="text-3xl font-black uppercase tracking-tighter">Times</h1>
            <p class="text-slate-400 mt-1">{{ teams.length }} times disponíveis</p>
          </div>
        </div>
        
        <div class="flex items-center gap-3 w-full md:w-auto">
          <div class="relative flex-1 md:flex-none">
            <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              v-model="searchQuery"
              @input="filterTeams"
              type="text"
              placeholder="Buscar time ou jogador..."
              class="w-full md:w-64 pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          
          <button 
            @click="showCreateTeamModal = true"
            class="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-lg text-white font-medium flex items-center gap-2 transition-colors whitespace-nowrap"
          >
            <Plus class="w-4 h-4" />
            Novo Time
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
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
        <p class="text-slate-400">Carregando times...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredTeams.length === 0" class="text-center py-12">
        <Database class="w-16 h-16 text-slate-600 mx-auto mb-4" />
        <h3 class="text-xl font-bold text-slate-300 mb-2">Nenhum time encontrado</h3>
        <p class="text-slate-500">Tente ajustar sua busca ou crie novos times</p>
        <button
          @click="showCreateTeamModal = true"
          class="mt-4 bg-emerald-600 hover:bg-emerald-500 px-6 py-2 rounded-lg text-white font-medium"
        >
          Criar Primeiro Time
        </button>
      </div>

      <!-- Teams Grid -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <div
          v-for="team in sortedTeams"
          v-show="team.searchMatch"
          :key="team.id"
          @click="openTeamDetails(team)"
          class="bg-slate-800 hover:bg-slate-750 rounded-2xl border border-slate-700 p-6 cursor-pointer transition-all group"
        >
          <!-- Team Header -->
          <div class="flex items-center gap-4 mb-4">
            <div class="w-12 h-12 rounded-lg bg-white flex items-center justify-center overflow-hidden border border-slate-600">
              <img
                v-if="team.logo"
                :src="team.logo"
                :alt="team.name"
                class="w-full h-full object-contain"
              />
              <span v-else class="text-xs font-bold text-slate-600">{{ team.shortName }}</span>
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="font-bold text-white text-lg truncate">{{ team.name }}</h3>
              <p class="text-slate-400 text-sm">{{ team.formation }}</p>
            </div>
          </div>

          <!-- Team Stats -->
          <div class="grid grid-cols-2 gap-3 mb-4">
            <div class="bg-slate-900/50 p-2 rounded-lg text-center">
              <div class="text-xs text-slate-500 uppercase">Jogadores</div>
              <div class="font-bold text-white">{{ team.players.length }}</div>
            </div>
            <div class="bg-slate-900/50 p-2 rounded-lg text-center">
              <div class="text-xs text-slate-500 uppercase">Titulares</div>
              <div class="font-bold text-white">{{ team.players.filter(p => !p.isReserve).length }}</div>
            </div>
          </div>

          <!-- Stadium Info -->
          <div v-if="team.venue" class="text-sm text-slate-400">
            <div class="font-medium">{{ team.venue.name }}</div>
            <div class="text-xs">{{ team.venue.city }} • {{ team.venue.capacity?.toLocaleString('pt-BR') }} pessoas</div>
          </div>

          <!-- View Button -->
          <div class="mt-4 text-center">
            <button class="text-green-400 hover:text-green-300 text-sm font-medium flex items-center justify-center gap-1 mx-auto">
              <span>Ver detalhes</span>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Team Modal -->
      <TeamModal 
          v-model="isModalOpen" 
          :team="selectedTeam"
          @update:team="updateTeamInStore"
      />
      
      <!-- Create Team Modal -->
      <CreateTeamModal 
      v-model="showCreateTeamModal" 
      @create-team="handleCreateTeam"
      />
    </div>
  </div>
</template>

<style scoped>
.bg-slate-750 {
  background-color: #334155;
}
</style>