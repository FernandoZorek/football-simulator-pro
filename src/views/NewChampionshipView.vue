<!-- src/views/NewChampionshipView.vue -->
<script setup lang="ts">
import { ref, onMounted, nextTick, computed, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { Plus, Trophy, Users, Settings, ArrowLeft, Save, Download, Upload, Search, Edit3 } from 'lucide-vue-next';
import { useTeamsStore } from '../store/teams';
import { useChampionshipsStore } from '../store/championships';
import { ChampionshipConfig } from '../core/types';
import { loadChampionship } from '../services/dataLoader';

const router = useRouter();
const route = useRoute();
const teamsStore = useTeamsStore();
const championshipsStore = useChampionshipsStore();

// Verifica se é edição ou criação
const isEditing = computed(() => !!route.params.id);
const pageTitle = computed(() => isEditing.value ? 'Editar Campeonato' : 'Novo Campeonato');

// Dados do campeonato
const newChampionship = ref<ChampionshipConfig>({
  id: '',
  name: '',
  season: new Date().getFullYear().toString(),
  type: 'liga',
  settings: {
    pointsWin: 3,
    pointsDraw: 1,
    hasPlayoffs: false
  },
  teamIds: []
});

// Times disponíveis
const availableTeams = ref<any[]>([]);
const selectedTeams = ref<string[]>([]);
const loading = ref(true);
const searchQuery = ref('');

// Carrega times e dados do campeonato (se for edição)
onMounted(async () => {
  try {
    await teamsStore.loadFromFiles();
    await nextTick();
    
    const sortedTeams = teamsStore.teams
      .map(team => ({ ...team, selected: false }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));
    availableTeams.value = sortedTeams;
    
    if (isEditing.value) {
      const championshipId = route.params.id as string;
      
      // Tenta da memória primeiro
      const memoryChamp = championshipsStore.customChampionships.find(c => c.id === championshipId);
      if (memoryChamp) {
        // Normaliza teamIds
        const teamIds = Array.isArray(memoryChamp.teamIds) 
          ? memoryChamp.teamIds 
          : [];
        
        newChampionship.value = {
          ...memoryChamp,
          settings: {
            pointsWin: memoryChamp.settings?.pointsWin || 3,
            pointsDraw: memoryChamp.settings?.pointsDraw || 1,
            hasPlayoffs: memoryChamp.settings?.hasPlayoffs || false
          },
          teamIds: teamIds
        };
        selectedTeams.value = [...teamIds];
      } else {
        // Dos arquivos
        try {
          const fileChamp = await loadChampionship(championshipId);
          const teamIds = fileChamp.teams.map(t => t.id);
          
          newChampionship.value = {
            id: fileChamp.id,
            name: fileChamp.name,
            season: fileChamp.season,
            type: 'liga',
            settings: {
              pointsWin: fileChamp.settings?.pointsWin || 3,
              pointsDraw: fileChamp.settings?.pointsDraw || 1,
              hasPlayoffs: fileChamp.settings?.hasPlayoffs || false
            },
            teamIds: teamIds
          };
          selectedTeams.value = [...teamIds];
        } catch (error) {
          console.error('Erro ao carregar campeonato:', error);
          router.push('/championships');
        }
      }
    }
  } catch (error) {
    console.error('Erro ao carregar dados:', error);
    router.push('/championships');
  } finally {
    loading.value = false;
  }
});

// Filtra times pela busca
const filteredTeams = computed(() => {
  if (!searchQuery.value.trim()) {
    return availableTeams.value;
  }
  
  const query = searchQuery.value.toLowerCase().trim();
  return availableTeams.value.filter(team => 
    team.name.toLowerCase().includes(query) || 
    team.shortName.toLowerCase().includes(query)
  );
});

// Seleciona/desceleciona time
const toggleTeamSelection = (teamId: string) => {
  const index = selectedTeams.value.indexOf(teamId);
  if (index === -1) {
    selectedTeams.value.push(teamId);
  } else {
    selectedTeams.value.splice(index, 1);
  }
};

// Verifica se time está selecionado
const isTeamSelected = (teamId: string) => {
  return selectedTeams.value.includes(teamId);
};

// Gera ID único (apenas para novos campeonatos)
const generateId = () => {
  if (!newChampionship.value.name || isEditing.value) return newChampionship.value.id;
  return newChampionship.value.name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '') + '-' + newChampionship.value.season;
};

// Validação
const isValid = computed(() => {
  return (
    newChampionship.value.name.trim() !== '' &&
    newChampionship.value.season.trim() !== '' &&
    selectedTeams.value.length >= 2
  );
});

// Salva campeonato em memória
const saveToMemory = () => {
  if (!isValid.value) return;
  
  // Atualiza ID apenas para novos campeonatos
  if (!isEditing.value) {
    newChampionship.value.id = generateId();
  }
  
  newChampionship.value.teamIds = [...selectedTeams.value];
  
  championshipsStore.addChampionship(newChampionship.value);

    console.log('Salvando campeonato no store (championshipsStore):', {
    id: newChampionship.value.id,
    name: newChampionship.value.name,
    type: newChampionship.value.type,
    hasType: 'type' in newChampionship.value
  });
  
  const action = isEditing.value ? 'atualizado' : 'salvo';
  alert(`✅ Campeonato ${action} em memória!`);
  router.push('/championships');
};

// Baixa arquivo JSON
const downloadFile = () => {
  if (!isValid.value) return;
  
  // Atualiza ID apenas para novos campeonatos
  if (!isEditing.value) {
    newChampionship.value.id = generateId();
  }
  
  newChampionship.value.teamIds = [...selectedTeams.value];
  
  const blob = new Blob([JSON.stringify(newChampionship.value, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `championship-${newChampionship.value.id}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  alert('✅ Arquivo baixado com sucesso!');
};

// Importa campeonato de arquivo
const importChampionshipFile = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const content = e.target?.result as string;
      const importedChampionship = JSON.parse(content);
      
      // Validação básica
      if (!importedChampionship.id || !importedChampionship.name || !Array.isArray(importedChampionship.teamIds)) {
        throw new Error('Arquivo inválido: estrutura de campeonato incorreta');
      }
      
      // Atualiza o formulário com os dados importados
      newChampionship.value = {
        id: importedChampionship.id,
        name: importedChampionship.name,
        season: importedChampionship.season || new Date().getFullYear().toString(),
        type: importedChampionship.type || 'liga',
        settings: {
          pointsWin: importedChampionship.settings?.pointsWin || 3,
          pointsDraw: importedChampionship.settings?.pointsDraw || 1,
          hasPlayoffs: importedChampionship.settings?.hasPlayoffs || false
        },
        teamIds: importedChampionship.teamIds
      };
      
      // Atualiza seleção de times
      selectedTeams.value = [...importedChampionship.teamIds];
      
      alert('✅ Campeonato importado com sucesso! Revise as configurações antes de salvar.');
    } catch (error) {
      console.error('Erro ao importar campeonato:', error);
      alert(`❌ Erro ao importar: ${(error as Error).message}`);
    }
  };
  
  reader.onerror = () => {
    alert('❌ Erro ao ler o arquivo');
  };
  
  reader.readAsText(file);
  target.value = ''; // Reseta o input
};

// Volta para tela anterior
const goBack = () => {
  router.push('/championships');
};

// Métodos auxiliares
const addAllTeams = () => {
  selectedTeams.value = availableTeams.value.map(team => team.id);
};

const removeAllTeams = () => {
  selectedTeams.value = [];
};
</script>

<template>
  <div class="min-h-screen bg-slate-900 text-slate-100">    
    <NavigationHeader />
    <div class="max-w-6xl mx-auto">
      <!-- Header -->
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div class="flex items-center gap-4">
          <button 
            @click="goBack"
            class="md:hidden p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            <ArrowLeft class="w-5 h-5" />
          </button>
          <div :class="`p-3 rounded-2xl shadow-lg ${
            isEditing ? 'bg-purple-600 shadow-purple-500/20' : 'bg-emerald-600 shadow-emerald-500/20'
          }`">
            <component 
              :is="isEditing ? Edit3 : Plus" 
              class="w-8 h-8 text-white" 
            />
          </div>
          <div>
            <h1 class="text-3xl font-black uppercase tracking-tighter">{{ pageTitle }}</h1>
            <p class="text-slate-400 mt-1">
              {{ isEditing ? 'Modifique as configurações do campeonato existente' : 'Crie ou importe um campeonato personalizado' }}
            </p>
          </div>
        </div>
        
        <!-- Botão de importação -->
        <label class="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-white font-medium flex items-center gap-2 cursor-pointer transition-colors">
          <Upload class="w-4 h-4" />
          <input 
            type="file" 
            accept=".json" 
            @change="importChampionshipFile"
            class="hidden"
          />
          Importar Campeonato
        </label>
      </div>

      <div v-if="loading" class="text-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto"></div>
        <p class="text-slate-400 mt-2">Carregando dados...</p>
      </div>

      <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <!-- Formulário de Configuração -->
        <div class="bg-slate-800 rounded-2xl border border-slate-700 p-6">
          <h2 class="text-xl font-bold mb-6 flex items-center gap-2">
            <Trophy class="w-5 h-5 text-emerald-400" />
            Configuração Básica
          </h2>
          
          <div class="space-y-6">
            <div>
              <label class="block text-sm font-medium text-slate-300 mb-2">
                Nome do Campeonato *
              </label>
              <input
                v-model="newChampionship.name"
                type="text"
                placeholder="Ex: Campeonato Paulista"
                class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                @input="newChampionship.id = generateId()"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-slate-300 mb-2">
                Temporada *
              </label>
              <input
                v-model="newChampionship.season"
                type="text"
                placeholder="Ex: 2024"
                class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-slate-300 mb-2">
                Tipo de Competição *
              </label>
              <select
                v-model="newChampionship.type"
                class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="liga">Liga (Pontos Corridos)</option>
                <option value="copa">Copa (Mata-Mata)</option>
                <option value="groups">Grupos + Eliminatórias</option>
              </select>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-slate-300 mb-2">
                  Pontos por Vitória
                </label>
                <input
                  v-model.number="newChampionship.settings.pointsWin"
                  type="number"
                  min="1"
                  max="10"
                  class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              
              <div>
                <label class="block text-sm font-medium text-slate-300 mb-2">
                  Pontos por Empate
                </label>
                <input
                  v-model.number="newChampionship.settings.pointsDraw"
                  type="number"
                  min="0"
                  max="5"
                  class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
            
            <div class="flex items-center gap-3">
              <input
                v-model="newChampionship.settings.hasPlayoffs"
                type="checkbox"
                id="playoffs"
                class="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500"
              />
              <label for="playoffs" class="text-sm font-medium text-slate-300">
                Ativar Playoffs nas Finais
              </label>
            </div>
          </div>
        </div>

        <!-- Seleção de Times -->
        <div class="bg-slate-800 rounded-2xl border border-slate-700 p-6">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-bold flex items-center gap-2">
              <Users class="w-5 h-5 text-blue-400" />
              Participantes
            </h2>
            <div class="text-sm text-slate-400">
              {{ selectedTeams.length }} times selecionados
            </div>
          </div>
          
          <!-- Barra de busca -->
          <div class="relative mb-4">
            <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Buscar time..."
              class="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <!-- Ações rápidas -->
          <div class="flex gap-2 mb-4">
            <button
              @click="addAllTeams"
              class="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded-lg transition-colors"
            >
              Adicionar Todos
            </button>
            <button
              @click="removeAllTeams"
              class="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded-lg transition-colors"
            >
              Remover Todos
            </button>
          </div>
          
          <!-- Lista de times -->
          <div class="max-h-80 overflow-y-auto space-y-2">
            <div
              v-for="team in filteredTeams"
              :key="team.id"
              class="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-700/50 cursor-pointer"
              @click="toggleTeamSelection(team.id)"
            >
              <div class="w-8 h-8 rounded-md bg-white flex items-center justify-center overflow-hidden border border-slate-600">
                <img
                  v-if="team.logo"
                  :src="team.logo"
                  :alt="team.name"
                  class="w-full h-full object-contain"
                />
                <span v-else class="text-xs font-bold text-slate-600">{{ team.shortName }}</span>
              </div>
              <span class="font-medium text-white">{{ team.name }}</span>
              <div class="ml-auto">
                <div v-if="isTeamSelected(team.id)" class="w-4 h-4 bg-emerald-500 rounded-full"></div>
                <div v-else class="w-4 h-4 border-2 border-slate-600 rounded-full"></div>
              </div>
            </div>
            
            <div v-if="filteredTeams.length === 0" class="text-center py-4 text-slate-500">
              Nenhum time encontrado
            </div>
          </div>
          
          <!-- Notificação de times ímpares -->
          <div v-if="selectedTeams.length > 0 && selectedTeams.length % 2 !== 0 && newChampionship.type === 'liga'" 
               class="mt-4 p-3 bg-amber-900/30 border-l-4 border-amber-500 rounded-lg">
            <p class="text-amber-300 text-sm">
              ⚠️ Para ligas (pontos corridos), recomenda-se número par de times para gerar fixture completo.
              Atualmente você tem {{ selectedTeams.length }} times selecionados.
            </p>
          </div>
        </div>
      </div>

      <!-- Botões de ação -->
      <div class="flex gap-4 mt-8 justify-end">
        <button
          @click="goBack"
          class="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors"
        >
          Cancelar
        </button>
        <button
          @click="downloadFile"
          class="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
        >
          <Download class="w-4 h-4" />
          Baixar Arquivo
        </button>
        <button
          @click="saveToMemory"
          :disabled="!isValid"
          class="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
        >
          <Save class="w-4 h-4" />
          {{ isEditing ? 'Atualizar Campeonato' : 'Salvar Campeonato' }}
        </button>
      </div>
    </div>
  </div>
</template>