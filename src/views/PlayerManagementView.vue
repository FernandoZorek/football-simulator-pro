<!-- src/views/PlayerManagementView.vue -->
<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { Users, Search, ArrowLeft, Edit3, Save, Plus, UserPlus } from 'lucide-vue-next';
import { useTeamsStore } from '../store/teams';
import { downloadUserData, importUserDataFromFile } from '../services/dataExport';

const router = useRouter();
const teamsStore = useTeamsStore();

// Estados
const players = ref<any[]>([]);
const filteredPlayers = ref<any[]>([]);
const loading = ref(true);
const searchQuery = ref('');
const selectedTeamFilter = ref<string>(''); // ID do time selecionado
const editingPlayer = ref<any>(null);
const editedPlayer = ref<any>({});

// Estados para transferência e criação
const showTransferModal = ref(false);
const showCreateModal = ref(false);
const playerToTransfer = ref<any>(null);
const newPlayerTeam = ref('');
const creatingPlayer = ref({
  name: '',
  age: 18,
  position: 'ST',
  overall: 60,
  energy: 100,
  isReserve: false,
  photo: '',
  teamId: ''
});

// Times ordenados alfabeticamente
const sortedTeams = computed(() => {
  return [...teamsStore.teams].sort((a, b) => 
    a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
  );
});

// Carrega todos os jogadores
const loadAllPlayers = () => {
  try {
    const allPlayers = teamsStore.teams.flatMap(team => 
      team.players.map(player => ({
        ...player,
        teamId: team.id,
        teamName: team.name,
        teamLogo: team.logo
      }))
    );
    
    // Ordena jogadores alfabeticamente por nome
    players.value = allPlayers.sort((a, b) => 
      a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
    );
    
    // Define o primeiro time como filtro padrão
    if (sortedTeams.value.length > 0) {
      selectedTeamFilter.value = sortedTeams.value[0].id;
    }
    
    applyFilters();
    loading.value = false;
  } catch (error) {
    console.error('Erro ao carregar jogadores:', error);
    loading.value = false;
  }
};

// Aplica filtros (time + busca)
const applyFilters = () => {
  let filtered = [...players.value];
  
  // Filtro por time
  if (selectedTeamFilter.value && selectedTeamFilter.value !== 'all') {
    filtered = filtered.filter(player => player.teamId === selectedTeamFilter.value);
  }
  
  // Filtro por busca
  const query = searchQuery.value.toLowerCase().trim();
  if (query) {
    filtered = filtered.filter(player => 
      player.name.toLowerCase().includes(query) ||
      player.teamName.toLowerCase().includes(query) ||
      player.position.toLowerCase().includes(query)
    );
  }
  
  // Mantém a ordenação alfabética
  filteredPlayers.value = filtered.sort((a, b) => 
    a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
  );
};

// Inicia edição
const startEditing = (player: any) => {
  editingPlayer.value = player.id;
  editedPlayer.value = { ...player };
};

// Salva edição
const saveEdit = () => {
  if (!editingPlayer.value) return;
  
  // Atualiza no store
  const teamIndex = teamsStore.teams.findIndex(t => t.id === editedPlayer.value.teamId);
  if (teamIndex !== -1) {
    const playerIndex = teamsStore.teams[teamIndex].players.findIndex(p => p.id === editedPlayer.value.id);
    if (playerIndex !== -1) {
      teamsStore.teams[teamIndex].players[playerIndex] = { ...editedPlayer.value };
    }
  }
  
  // Atualiza lista local
  const localIndex = players.value.findIndex(p => p.id === editedPlayer.value.id);
  if (localIndex !== -1) {
    players.value[localIndex] = { ...editedPlayer.value };
    // Reordena após atualização
    players.value.sort((a, b) => 
      a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
    );
    applyFilters(); // Reaplica filtros
  }
  
  editingPlayer.value = null;
  editedPlayer.value = {};
};

// Cancela edição
const cancelEdit = () => {
  editingPlayer.value = null;
  editedPlayer.value = {};
};

// Inicia transferência
const startTransfer = (player: any) => {
  playerToTransfer.value = player;
  newPlayerTeam.value = '';
  showTransferModal.value = true;
};

// Executa transferência
const executeTransfer = () => {
  if (!playerToTransfer.value || !newPlayerTeam.value) return;
  
  // Remove do time atual
  const currentTeamIndex = teamsStore.teams.findIndex(t => t.id === playerToTransfer.value.teamId);
  if (currentTeamIndex !== -1) {
    teamsStore.teams[currentTeamIndex].players = 
      teamsStore.teams[currentTeamIndex].players.filter(p => p.id !== playerToTransfer.value.id);
  }
  
  // Adiciona ao novo time
  const newTeamIndex = teamsStore.teams.findIndex(t => t.id === newPlayerTeam.value);
  if (newTeamIndex !== -1) {
    const transferredPlayer = {
      ...playerToTransfer.value,
      teamId: newPlayerTeam.value,
      teamName: teamsStore.teams[newTeamIndex].name,
      teamLogo: teamsStore.teams[newTeamIndex].logo
    };
    teamsStore.teams[newTeamIndex].players.push(transferredPlayer);
    
    // Atualiza lista local
    const playerIndex = players.value.findIndex(p => p.id === playerToTransfer.value.id);
    if (playerIndex !== -1) {
      players.value[playerIndex] = transferredPlayer;
      // Reordena após transferência
      players.value.sort((a, b) => 
        a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
      );
      applyFilters(); // Reaplica filtros
    }
  }
  
  showTransferModal.value = false;
  playerToTransfer.value = null;
  alert('✅ Jogador transferido com sucesso!');
};

// Inicia criação de novo jogador
const startCreatePlayer = () => {
  creatingPlayer.value = {
    name: '',
    age: 18,
    position: 'ST',
    overall: 60,
    energy: 100,
    isReserve: false,
    photo: '',
    teamId: sortedTeams.value[0]?.id || ''
  };
  showCreateModal.value = true;
};

// Cria novo jogador
const createPlayer = () => {
  if (!creatingPlayer.value.name.trim() || !creatingPlayer.value.teamId) {
    alert('⚠️ Preencha o nome do jogador e selecione um time');
    return;
  }
  
  // Gera ID único
  const playerId = `${creatingPlayer.value.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
  
  const newPlayer = {
    id: playerId,
    name: creatingPlayer.value.name,
    age: creatingPlayer.value.age,
    position: creatingPlayer.value.position,
    overall: creatingPlayer.value.overall,
    energy: creatingPlayer.value.energy,
    isReserve: creatingPlayer.value.isReserve,
    photo: creatingPlayer.value.photo
  };
  
  // Adiciona ao time selecionado
  const teamIndex = teamsStore.teams.findIndex(t => t.id === creatingPlayer.value.teamId);
  if (teamIndex !== -1) {
    teamsStore.teams[teamIndex].players.push(newPlayer);
    
    // Atualiza lista local
    const fullPlayer = {
      ...newPlayer,
      teamId: creatingPlayer.value.teamId,
      teamName: teamsStore.teams[teamIndex].name,
      teamLogo: teamsStore.teams[teamIndex].logo
    };
    players.value.push(fullPlayer);
    // Reordena após criação
    players.value.sort((a, b) => 
      a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
    );
    applyFilters(); // Reaplica filtros
  }
  
  showCreateModal.value = false;
  alert('✅ Jogador criado com sucesso!');
};

// Volta para tela anterior
const goBack = () => {
  router.push('/');
};

// Watchers para reagir às mudanças
watch(searchQuery, () => {
  applyFilters();
});

watch(selectedTeamFilter, () => {
  applyFilters();
});

onMounted(() => {
  loadAllPlayers();
});

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
    loadAllPlayers(); // Recarrega a lista de jogadores
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
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div class="flex items-center gap-4">
          <button 
            @click="goBack"
            class="md:hidden p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            <ArrowLeft class="w-5 h-5" />
          </button>
          <div class="bg-orange-600 p-3 rounded-2xl shadow-lg shadow-orange-500/20">
            <Users class="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 class="text-3xl font-black uppercase tracking-tighter">Editar Atletas</h1>
            <p class="text-slate-400 mt-1">{{ filteredPlayers.length }} jogadores encontrados</p>
          </div>
        </div>
        
        <div class="flex gap-3 w-full md:w-auto flex-wrap">
          <!-- Filtro por time -->
          <select
            v-model="selectedTeamFilter"
            class="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500 min-w-[180px]"
          >
            <option value="all">Todos os Times</option>
            <option
              v-for="team in sortedTeams"
              :key="team.id"
              :value="team.id"
            >
              {{ team.name }}
            </option>
          </select>
          
          <div class="relative flex-1 md:flex-none w-full md:w-64">
            <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Buscar jogador ou posição..."
              class="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          
          <button
            @click="startCreatePlayer"
            class="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-lg text-white font-medium flex items-center gap-2 transition-colors whitespace-nowrap"
          >
            <Plus class="w-4 h-4" />
            Novo Jogador
          </button>

           <!-- Botões de exportação/importação -->
        <button
          @click="handleExport"
          class="bg-blue-600 hover:bg-blue-500 px-3 py-2 rounded-lg text-white font-medium flex items-center gap-1 transition-colors"
          title="Exportar dados"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </button>
        
        <label 
          class="bg-green-600 hover:bg-green-500 px-3 py-2 rounded-lg text-white font-medium flex items-center gap-1 cursor-pointer transition-colors" 
          title="Importar Dados"
        >
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

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
        <p class="text-slate-400">Carregando jogadores...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredPlayers.length === 0" class="text-center py-12">
        <Users class="w-16 h-16 text-slate-600 mx-auto mb-4" />
        <h3 class="text-xl font-bold text-slate-300 mb-2">Nenhum jogador encontrado</h3>
        <p class="text-slate-500">Tente ajustar seus filtros</p>
        <button
          @click="startCreatePlayer"
          class="mt-4 bg-emerald-600 hover:bg-emerald-500 px-6 py-2 rounded-lg text-white font-medium"
        >
          Criar Novo Jogador
        </button>
      </div>

      <!-- Players Grid -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <div
          v-for="player in filteredPlayers"
          :key="player.id"
          class="bg-slate-800 hover:bg-slate-750 rounded-2xl border border-slate-700 p-6 transition-all"
        >
          <!-- Player Header -->
          <div class="flex items-center gap-4 mb-4">
            <div class="w-12 h-12 rounded-full bg-slate-700 overflow-hidden flex-shrink-0">
              <img
                v-if="player.photo"
                :src="player.photo"
                :alt="player.name"
                class="w-full h-full object-cover"
              />
              <span
                v-else
                class="w-full h-full flex items-center justify-center text-xs text-white font-bold"
              >
                {{ player.name.charAt(0) }}
              </span>
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="font-bold text-white text-lg truncate">{{ player.name }}</h3>
              <p class="text-slate-400 text-sm">{{ player.position }}</p>
              <div class="flex items-center gap-2 mt-1">
                <img
                  v-if="player.teamLogo"
                  :src="player.teamLogo"
                  :alt="player.teamName"
                  class="w-5 h-5 rounded-sm"
                />
                <span class="text-xs text-slate-500 truncate">{{ player.teamName }}</span>
              </div>
            </div>
          </div>

          <!-- Player Stats -->
          <div class="grid grid-cols-2 gap-3 mb-4">
            <div class="bg-slate-900/50 p-2 rounded-lg text-center">
              <div class="text-xs text-slate-500 uppercase">Overall</div>
              <div class="font-bold text-white">{{ player.overall }}</div>
            </div>
            <div class="bg-slate-900/50 p-2 rounded-lg text-center">
              <div class="text-xs text-slate-500 uppercase">Idade</div>
              <div class="font-bold text-white">{{ player.age }}</div>
            </div>
          </div>

          <!-- Status -->
          <div class="text-sm text-slate-400 mb-4">
            <span :class="`px-2 py-1 rounded-full text-xs ${
              player.isReserve ? 'bg-amber-600/20 text-amber-400' : 'bg-green-600/20 text-green-400'
            }`">
              {{ player.isReserve ? 'Reserva' : 'Titular' }}
            </span>
          </div>

          <!-- Action Buttons -->
          <div class="flex gap-2">
            <button
              @click="startEditing(player)"
              class="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-medium py-2 px-2 rounded-lg transition-colors flex items-center justify-center gap-1 text-xs"
            >
              <Edit3 class="w-3 h-3" />
              Editar
            </button>
            <button
              @click="startTransfer(player)"
              class="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 px-2 rounded-lg transition-colors flex items-center justify-center gap-1 text-xs"
            >
              <UserPlus class="w-3 h-3" />
              Transferir
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de Edição -->
    <teleport to="body" v-if="editingPlayer">
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <div class="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-md p-6" @click.stop>
          <h3 class="text-xl font-bold text-white mb-4">Editar Jogador</h3>
          
          <div class="space-y-4">
            <div>
              <label class="block text-slate-400 text-sm mb-1">Nome</label>
              <input
                v-model="editedPlayer.name"
                type="text"
                class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-slate-400 text-sm mb-1">Idade</label>
                <input
                  v-model.number="editedPlayer.age"
                  type="number"
                  min="16"
                  max="45"
                  class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              
              <div>
                <label class="block text-slate-400 text-sm mb-1">Overall</label>
                <input
                  v-model.number="editedPlayer.overall"
                  type="number"
                  min="50"
                  max="99"
                  class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
            
            <div>
              <label class="block text-slate-400 text-sm mb-1">Posição</label>
              <select
                v-model="editedPlayer.position"
                class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="GK">Goleiro (GK)</option>
                <option value="CB">Zagueiro (CB)</option>
                <option value="LB">Lateral Esquerdo (LB)</option>
                <option value="RB">Lateral Direito (RB)</option>
                <option value="CDM">Volante (CDM)</option>
                <option value="CM">Meia Central (CM)</option>
                <option value="CAM">Meia Atacante (CAM)</option>
                <option value="ST">Centroavante (ST)</option>
                <option value="LW">Ponta Esquerda (LW)</option>
                <option value="RW">Ponta Direita (RW)</option>
              </select>
            </div>
            
            <div>
              <label class="block text-slate-400 text-sm mb-1">Energia</label>
              <input
                v-model.number="editedPlayer.energy"
                type="number"
                min="0"
                max="100"
                class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            
            <div class="flex items-center gap-2">
              <input
                v-model="editedPlayer.isReserve"
                type="checkbox"
                id="isReserve"
                class="w-5 h-5 text-orange-600 rounded focus:ring-orange-500"
              />
              <label for="isReserve" class="text-slate-300">É reserva?</label>
            </div>
          </div>
          
          <div class="flex gap-3 mt-6">
            <button
              @click="saveEdit"
              class="flex-1 bg-green-600 hover:bg-green-500 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Save class="w-4 h-4" />
              Salvar
            </button>
            <button
              @click="cancelEdit"
              class="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </teleport>

    <!-- Modal de Transferência -->
    <teleport to="body" v-if="showTransferModal">
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <div class="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-md p-6" @click.stop>
          <h3 class="text-xl font-bold text-white mb-4">Transferir Jogador</h3>
          
          <div v-if="playerToTransfer" class="mb-4">
            <p class="text-slate-300 mb-2">
              Transferir <span class="font-bold text-white">{{ playerToTransfer.name }}</span>
              do time <span class="font-bold text-orange-400">{{ playerToTransfer.teamName }}</span>
            </p>
          </div>
          
          <div class="space-y-4">
            <div>
              <label class="block text-slate-400 text-sm mb-1">Novo Time</label>
              <select
                v-model="newPlayerTeam"
                class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione um time</option>
                <option
                  v-for="team in sortedTeams"
                  :key="team.id"
                  :value="team.id"
                  :disabled="team.id === playerToTransfer?.teamId"
                >
                  {{ team.name }}
                </option>
              </select>
            </div>
          </div>
          
          <div class="flex gap-3 mt-6">
            <button
              @click="executeTransfer"
              :disabled="!newPlayerTeam"
              class="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <UserPlus class="w-4 h-4" />
              Transferir
            </button>
            <button
              @click="showTransferModal = false"
              class="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </teleport>

    <!-- Modal de Criação -->
    <teleport to="body" v-if="showCreateModal">
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <div class="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-md p-6" @click.stop>
          <h3 class="text-xl font-bold text-white mb-4">Criar Novo Jogador</h3>
          
          <div class="space-y-4">
            <div>
              <label class="block text-slate-400 text-sm mb-1">Nome</label>
              <input
                v-model="creatingPlayer.name"
                type="text"
                placeholder="Ex: João Silva"
                class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-slate-400 text-sm mb-1">Idade</label>
                <input
                  v-model.number="creatingPlayer.age"
                  type="number"
                  min="16"
                  max="45"
                  class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              
              <div>
                <label class="block text-slate-400 text-sm mb-1">Overall</label>
                <input
                  v-model.number="creatingPlayer.overall"
                  type="number"
                  min="50"
                  max="99"
                  class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
            
            <div>
              <label class="block text-slate-400 text-sm mb-1">Posição</label>
              <select
                v-model="creatingPlayer.position"
                class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="GK">Goleiro (GK)</option>
                <option value="CB">Zagueiro (CB)</option>
                <option value="LB">Lateral Esquerdo (LB)</option>
                <option value="RB">Lateral Direito (RB)</option>
                <option value="CDM">Volante (CDM)</option>
                <option value="CM">Meia Central (CM)</option>
                <option value="CAM">Meia Atacante (CAM)</option>
                <option value="ST">Centroavante (ST)</option>
                <option value="LW">Ponta Esquerda (LW)</option>
                <option value="RW">Ponta Direita (RW)</option>
              </select>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-slate-400 text-sm mb-1">Energia</label>
                <input
                  v-model.number="creatingPlayer.energy"
                  type="number"
                  min="0"
                  max="100"
                  class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              
              <div>
                <label class="block text-slate-400 text-sm mb-1">Time</label>
                <select
                  v-model="creatingPlayer.teamId"
                  class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Selecione um time</option>
                  <option
                    v-for="team in sortedTeams"
                    :key="team.id"
                    :value="team.id"
                  >
                    {{ team.name }}
                  </option>
                </select>
              </div>
            </div>
            
            <div>
              <label class="block text-slate-400 text-sm mb-1">Foto URL (opcional)</label>
              <input
                v-model="creatingPlayer.photo"
                type="text"
                placeholder="https://example.com/player.jpg"
                class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            
            <div class="flex items-center gap-2">
              <input
                v-model="creatingPlayer.isReserve"
                type="checkbox"
                id="createIsReserve"
                class="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500"
              />
              <label for="createIsReserve" class="text-slate-300">Iniciar como reserva?</label>
            </div>
          </div>
          
          <div class="flex gap-3 mt-6">
            <button
              @click="createPlayer"
              class="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Plus class="w-4 h-4" />
              Criar Jogador
            </button>
            <button
              @click="showCreateModal = false"
              class="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </teleport>
  </div>
</template>

<style scoped>
.bg-slate-750 {
  background-color: #334155;
}
</style>