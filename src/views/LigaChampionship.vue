<!-- src/views/LigaChampionship.vue -->
<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useChampionshipStore } from '../store/championship';
import type { Team } from '../core/types';
import { generateFixture } from '../services/fixtureGenerator';
import { Trophy, ListOrdered, Calendar } from 'lucide-vue-next';
import { loadChampionship } from '../services/dataLoader';
import { downloadSimulation, importSimulationFromFile } from '../services/dataExport';
import StandingsTable from '../components/Championship/StandingsTable.vue';
import TopScorersSection from '../components/Championship/TopScorersSection.vue';
import RoundResultsSection from '../components/Championship/RoundResultsSection.vue';
import TeamModal from '../components/team/TeamModal.vue';
import FixtureModal from '../components/LigaChampionship/FixtureModal.vue';
import { useTeamsStore } from '../store/teams';

const teamsStore = useTeamsStore(); 

const route = useRoute();
const router = useRouter();
const store = useChampionshipStore();
const championshipId = computed(() => route.params.id as string);
const currentRound = ref(1);
const error = ref<string | null>(null);
const selectedTeam = ref<Team | null>(null);
const isModalOpen = ref(false);
const isFixtureModalOpen = ref(false);
const isTopScorersExpanded = ref(false);
const logoUrl = ref<string | null>(null);
const trophyUrl = ref<string | null>(null);
const allRounds = computed(() => {
  if (!store.data?.teams.length) return [];
  const n = store.data.teams.length;
  const totalRounds = (n - 1) * 2;
  return Array.from({ length: totalRounds }, (_, i) => i + 1);
});

const selectedViewRound = ref(1);

const matchesInSelectedRound = computed(() => {
  return store.matches.filter(m => m.round === selectedViewRound.value);
});

const goToPreviousRound = () => {
  const idx = allRounds.value.indexOf(selectedViewRound.value);
  if (idx > 0) {
    selectedViewRound.value = allRounds.value[idx - 1];
  }
};

const goToNextRound = () => {
  const idx = allRounds.value.indexOf(selectedViewRound.value);
  if (idx < allRounds.value.length - 1) {
    selectedViewRound.value = allRounds.value[idx + 1];
  }
};

watch(championshipId, async (newId, oldId) => {
  if (newId && newId !== oldId) {
    await teamsStore.loadFromFiles();
    await loadSelectedDataset(newId);
    
    const finishedMatches = store.matches.filter(m => m.status === 'finished');
    currentRound.value = finishedMatches.length > 0 
      ? Math.max(...finishedMatches.map(m => m.round)) + 1 
      : 1;
    
    selectedViewRound.value = currentRound.value - 1;
  }
});

const allTopScorers = computed(() => {
  const goalCount: Record<string, { playerId: string; teamId: string; goals: number }> = {};

  store.matches.forEach((match) => {
    match.events.forEach((event) => {
      if (event.type === 'goal' && event.playerId) {
        if (!goalCount[event.playerId]) {
          goalCount[event.playerId] = {
            playerId: event.playerId,
            teamId: event.teamId,
            goals: 0,
          };
        }
        goalCount[event.playerId].goals++;
      }
    });
  });

  const allPlayers = new Map<string, { name: string; photo?: string; teamId: string }>();
  const teamNameMap = new Map<string, string>();

  store.data?.teams.forEach((team) => {
    teamNameMap.set(team.id, team.name);
    team.players.forEach((player) => {
      allPlayers.set(player.id, {
        name: player.name,
        photo: player.photo,
        teamId: team.id,
      });
    });
  });

  return Object.values(goalCount)
    .map((entry) => {
      const playerData = allPlayers.get(entry.playerId);
      const teamName = teamNameMap.get(entry.teamId) || 'Desconhecido';
      return {
        name: playerData?.name || 'Desconhecido',
        team: teamName,
        goals: entry.goals,
        photo: playerData?.photo,
      };
    })
    .sort((a, b) => b.goals - a.goals);
});

const displayedTopScorers = computed(() => {
  return isTopScorersExpanded.value
    ? allTopScorers.value
    : allTopScorers.value.slice(0, 5);
});

const getTeamNameById = (teamId: string): string => {
  return store.data?.teams.find(t => t.id === teamId)?.name || teamId;
};

const getTeamLogoById = (teamId: string) => {
  return store.data?.teams.find(t => t.id === teamId)?.logo;
};

const getTeamShortNameById = (teamId: string) => {
  return store.data?.teams.find(t => t.id === teamId)?.shortName || '??';
};

onMounted(async () => {
  if (!championshipId.value) {
    router.push('/');
    return;
  }
  
  await teamsStore.loadFromFiles();
  await loadSelectedDataset(championshipId.value);
  
  const finishedMatches = store.matches.filter(m => m.status === 'finished');
  currentRound.value = finishedMatches.length > 0 
    ? Math.max(...finishedMatches.map(m => m.round)) + 1 
    : 1;
  
  selectedViewRound.value = currentRound.value - 1;
});

const handleResetSimulation = () => {
  if (!confirm('⚠️ Isso apagará toda a simulação atual e começará do zero. Tem certeza?')) {
    return;
  }
  
  store.resetSimulation();
  currentRound.value = 1;
  selectedViewRound.value = 1;
  alert('✅ Simulação reiniciada!');
};

const loadSelectedDataset = async (id: string) => {
  error.value = null;
  try {
    // 1. Carrega o campeonato original
    const championship = await loadChampionship(id);
    trophyUrl.value = championship.trophy || null;
    logoUrl.value = championship.logo || null;
    
    // 2. Carrega times editados do store persistente
    await teamsStore.loadFromFiles();
    
    // 3. Substitui os times do campeonato pelos times editados (se existirem)
    const syncedTeams = championship.teams.map(originalTeam => {
      const editedTeam = teamsStore.getTeamById(originalTeam.id);
      return editedTeam || originalTeam; // Usa editado se existir, senão usa original
    });
    
    // 4. Atualiza o campeonato com times sincronizados
    const syncedChampionship = {
      ...championship,
      teams: syncedTeams
    };
    
    store.loadChampionship(syncedChampionship);
    store.matches = generateFixture(syncedChampionship.teams);
    currentRound.value = 1;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar campeonato';
    console.error(err);
    router.push('/');
  }
};

const handleSimulate = () => {
  store.simulateRound(currentRound.value);
  const totalRounds = ((store.data?.teams.length || 0) - 1) * 2;
  if (currentRound.value < totalRounds) {
    currentRound.value++;
  }
};

const openTeamModal = (standing: any) => {
  selectedTeam.value = standing.team;
  isModalOpen.value = true;
};

watch(currentRound, (newRound) => {
  selectedViewRound.value = newRound - 1;
});

const handleTeamUpdate = (updatedTeam) => {
  // 1. Atualiza no store de times persistente
  teamsStore.updateTeam(updatedTeam);
  
  // 2. Atualiza no store de campeonato (para simulação atual)
  const teamIndex = store.data?.teams.findIndex(t => t.id === updatedTeam.id);
  if (teamIndex !== -1 && store.data) {
    store.data.teams[teamIndex] = updatedTeam;
  }
  
  selectedTeam.value = updatedTeam;
};


const handleExportSimulation = () => {
  downloadSimulation();
};

const handleImportSimulation = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  
  if (!file) return;
  
  // Validação adicional do arquivo
  if (file.type && !file.type.includes('json')) {
    alert('⚠️ Por favor, selecione um arquivo JSON válido.');
    target.value = '';
    return;
  }
  
  if (file.size > 5 * 1024 * 1024) { // 5MB
    alert('⚠️ Arquivo muito grande. O tamanho máximo é 5MB.');
    target.value = '';
    return;
  }
  
  if (!confirm('⚠️ Isso substituirá toda a simulação atual. Tem certeza?')) {
    target.value = '';
    return;
  }
  
  try {
    await importSimulationFromFile(file);
    alert('✅ Simulação importada com sucesso!');
    
    // Atualiza a rodada atual
    const finishedMatches = store.matches.filter(m => m.status === 'finished');
    if (finishedMatches.length > 0) {
      currentRound.value = Math.max(...finishedMatches.map(m => m.round)) + 1;
    } else {
      currentRound.value = 1;
    }
    
    target.value = '';
  } catch (error) {
    // Mostra erro detalhado no console e mensagem amigável ao usuário
    console.error('Erro detalhado:', error);
    alert(`❌ Falha ao importar simulação:\n${(error as Error).message}`);
    target.value = '';
  }
};
</script>

<template>
  <div class="min-h-screen bg-slate-900 text-slate-100">    
    <NavigationHeader />
    <div class="max-w-6xl mx-auto">
      <!-- Cabeçalho -->
      <header
        class="flex flex-col md:flex-row justify-between items-center mb-10 gap-6 bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl"
      >
        <div class="flex items-center gap-4">
          <div class="w-[200px] h-[140px] bg-white rounded-lg flex items-center justify-center overflow-hidden" v-if="logoUrl">           
            <img
              :src="logoUrl"
              alt="Logo"
              class="w-full h-full object-cover"
            />
          </div>
          <div class="flex items-center gap-4" v-else>
            <div class="bg-blue-600 p-3 rounded-lg shadow-lg shadow-blue-500/20">
              <Trophy :size="64" class="text-white" />
            </div>
            <div>
              <h1 class="text-2xl md:text-3xl font-black uppercase tracking-tighter">
                {{ store.data?.name || 'Carregando...' }}
              </h1>
              <p class="text-slate-400 font-medium">
                Temporada {{ store.data?.season }} • Ida e Volta ({{ allRounds.length }} rodadas)
              </p>
            </div>
          </div>
                <button
        @click="handleResetSimulation"
        class="bg-amber-600 hover:bg-amber-500 px-4 py-2 rounded-lg text-white font-medium flex items-center gap-2 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Reiniciar Simulação
      </button>
        </div>

        <div class="flex gap-3 w-full md:w-auto">
          <button
            @click="handleExportSimulation"
            class="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-white font-medium flex items-center gap-2 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Exportar Simulação
          </button>
          
          <label class="bg-green-600 hover:bg-green-500 px-4 py-2 rounded-lg text-white font-medium flex items-center gap-2 cursor-pointer transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l-3-3m3 3V10" />
            </svg>
            <input 
              type="file" 
              accept=".json" 
              @change="handleImportSimulation"
              class="hidden"
            />
            Importar Simulação
          </label>
        </div>
      </header>

      <!-- Conteúdo principal -->
      <main class="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div class="lg:col-span-8">
          <StandingsTable
            :standings="store.standings"
            @team-click="openTeamModal"
          />
        </div>

        <aside class="lg:col-span-4 space-y-8">
          <section class="bg-slate-800 rounded-2xl border border-slate-700 p-6 shadow-sm">
            <div class="items-center justify-between mb-6 ml-auto text-center">
                <button
                  @click="handleSimulate"
                  :disabled="currentRound > allRounds.length"
                  class="ml-auto mr-auto text-center mb-6 group relative flex items-center justify-center gap-2 bg-green-500 hover:bg-green-400 disabled:bg-slate-700 text-slate-900 font-bold py-3 px-6 rounded-xl transition-all shadow-lg hover:shadow-green-500/20 active:scale-95 w-full sm:w-auto"
                  >
                    <Calendar :size="18" />
                    <span>SIMULAR RODADA {{ currentRound }}</span>
                    <span class="absolute -top-2 -right-2 bg-white text-[10px] px-1.5 py-0.5 rounded-md shadow-sm">
                      LIVE
                    </span>
                </button>
          <button
            @click="isFixtureModalOpen = true"
            class="ml-auto mr-auto text-center group relative flex items-center justify-center gap-2 bg-purple-500 hover:bg-purple-400 text-slate-900 font-bold py-3 px-6 rounded-xl transition-all shadow-lg hover:shadow-purple-500/20 active:scale-95 w-full sm:w-auto"
          >
            <ListOrdered :size="18" />
            <span>TABELA DE JOGOS</span>
          </button>

            </div>
          </section>  
          <TopScorersSection
            :displayed-scorers="displayedTopScorers"
            :all-scorers-length="allTopScorers.length"
            :is-expanded="isTopScorersExpanded"
            @toggle-expand="isTopScorersExpanded = !isTopScorersExpanded"
          />

          <RoundResultsSection
            :finished-rounds="allRounds"
            :selected-round="selectedViewRound"
            :matches-in-selected-round="matchesInSelectedRound"
            :get-team-name="getTeamNameById"
            @on-previous="goToPreviousRound"
            @on-next="goToNextRound"
          />
        </aside>
      </main>

      <!-- Erro -->
      <div v-if="error" class="mt-6 bg-red-500/20 border border-red-500 text-red-500 p-4 rounded-lg">
        ❌ {{ error }}
      </div>
    </div>

    <!-- Modais -->
    <TeamModal
      v-model="isModalOpen"
      :team="selectedTeam"
      @update:team="handleTeamUpdate"
    />
    <FixtureModal
      v-model="isFixtureModalOpen"
      :matches="store.matches"
      :on-get-team-name="getTeamNameById"
      :on-get-team-logo="getTeamLogoById"
      :on-get-team-short-name="getTeamShortNameById"
    />
  </div>
</template>

<style scoped>
tr:nth-child(-n+3) td:first-child {
  position: relative;
}
</style>