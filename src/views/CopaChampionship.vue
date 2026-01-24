<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useChampionshipStore } from '../store/championship';
import type { Team, ChampionshipPhase } from '../core/types';
import { Trophy, ListOrdered, Calendar, Users } from 'lucide-vue-next';
import { loadChampionship } from '../services/dataLoader';
import { 
  downloadSimulation, 
  importSimulationFromFile 
} from '../services/dataExport';
import { useTeamsStore } from '../store/teams';
import PlayoffBracket from '../components/CopaChampionship/PlayoffBracket.vue';
import RoundResultsSection from '../components/Championship/RoundResultsSection.vue';
import TeamModal from '../components/team/TeamModal.vue';
import FixtureModal from '../components/LigaChampionship/FixtureModal.vue';
import { simulateCopaPhase, prepareNextPhase, isPhaseCompleted } from '../core/engine/copaSimulator';
import { calculateGroupStandings, updateKnockoutTeams } from '../core/engine/copaSimulator';
import StandingsTable from '../components/Championship/StandingsTable.vue';
import TopScorersSection from '../components/Championship/TopScorersSection.vue';

const teamsStore = useTeamsStore();
const route = useRoute();
const router = useRouter();
const store = useChampionshipStore();

const championshipId = computed(() => route.params.id as string);
const currentPhase = ref<ChampionshipPhase>('groups');
const error = ref<string | null>(null);
const selectedTeam = ref<Team | null>(null);
const isModalOpen = ref(false);
const isFixtureModalOpen = ref(false);
const selectedViewRound = ref(1);
const isTopScorersExpanded = ref(false);
const trophyUrl = ref<string | null>(null);
const logoUrl = ref<string | null>(null);

// --- Fases disponíveis ---
const availablePhases = computed(() => {
  if (!store.data) return [];
  
  const phases: ChampionshipPhase[] = ['groups'];
  
  // Determina fases com base no número real de classificados
  const totalTeams = store.data.teams.length;
  let qualifiedPerGroup = store.data.settings.qualifiedPerGroup || 2;
  
  // Ajuste especial para 12 times
  if (totalTeams === 12) {
    qualifiedPerGroup = 4;
  }
  
  const numGroups = store.data.groups?.length || 1;
  const totalQualified = numGroups * qualifiedPerGroup;

  // Define fases reais com base em totalQualified
  if (totalQualified >= 32) {
    phases.push('round_32', 'round_16', 'quarters', 'semis', 'final');
  } else if (totalQualified >= 16) {
    phases.push('round_16', 'quarters', 'semis', 'final');
  } else if (totalQualified >= 8) {
    phases.push('quarters', 'semis', 'final');
  } else if (totalQualified >= 4) {
    phases.push('semis', 'final');
  } else {
    phases.push('final');
  }

  return phases;
});

// --- Partidas da fase atual ---
const currentPhaseMatches = computed(() => {
  return store.matches.filter(m => m.phase === currentPhase.value);
});

// --- Partidas da rodada selecionada ---
const matchesInSelectedRound = computed(() => {
  return store.matches.filter(m => m.round === selectedViewRound.value);
});

const allRounds = computed(() => {
  if (!store.data) return [];
  return Array.from(new Set(store.matches.map(m => m.round))).sort((a, b) => a - b);
});

// --- Top Goleadores ---
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
  return allTopScorers.value.slice(0, 5);
});

// --- Funções auxiliares ---
const getTeamNameById = (teamId: string | null | undefined): string => {
  if (!teamId) return 'Time Desconhecidos';
  const team = store.data?.teams.find(t => t.id === teamId);
  return team?.name || `Time ID: ${teamId}`;
};

const getTeamLogoById = (teamId: string | null | undefined) => {
  if (!teamId) return undefined;
  return store.data?.teams.find(t => t.id === teamId)?.logo;
};

const getTeamShortNameById = (teamId: string | null | undefined) => {
  if (!teamId) return '??';
  return store.data?.teams.find(t => t.id === teamId)?.shortName || '??';
};

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

// --- Carregamento inicial ---
onMounted(async () => {
  if (!championshipId.value) {
    router.push('/');
    return;
  }
  
  await teamsStore.loadFromFiles();
  await loadSelectedDataset(championshipId.value);

  if (store.data && store.matches.length === 0) {
    console.log('⚠️ Campeonato carregado sem partidas. Forçando reset...');
    store.resetSimulation();
  }
  
  syncComponentStateWithSimulation();
  syncPhaseStatusWithSimulation();
  console.log('####currentPhase',currentPhase);
  console.log('#####store.data', store.data);
});

watch(championshipId, async (newId, oldId) => {
  if (newId && newId !== oldId) {
    await teamsStore.loadFromFiles();
    await loadSelectedDataset(newId);
    syncComponentStateWithSimulation(); 
  }
});

// --- Próxima rodada a ser simulada ---
const nextGroupRound = computed(() => {
  if (currentPhase.value !== 'groups' || !store.data) return null;
  
  const scheduledRounds = Array.from(
    new Set(
      store.matches
        .filter(m => m.phase === 'groups' && m.status === 'scheduled')
        .map(m => m.round)
    )
  ).sort((a, b) => a - b);
  
  return scheduledRounds.length > 0 ? scheduledRounds[0] : null;
});

const loadSelectedDataset = async (id: string) => {
  error.value = null;
  try {
    
    // 1. Carrega o campeonato original
    const championship = await loadChampionship(id);
    
    // 2. Carrega times editados do store persistente
    await teamsStore.loadFromFiles();
    
    // 3. Sincroniza times (garante que todos os times do campeonato existam no store)
    const syncedTeams = championship.teams.map(originalTeam => {
      const editedTeam = teamsStore.getTeamById(originalTeam.id);
      return editedTeam || originalTeam; // Usa editado se existir, senão usa original
    });
    
    // 4. Garante que todos os times estejam no teamsStore
    for (const team of syncedTeams) {
      teamsStore.updateTeam(team);
    }
    
    trophyUrl.value = championship.trophy || null;
    logoUrl.value = championship.logo || null;
    // 5. Atualiza o campeonato com times sincronizados
    const syncedChampionship = {
      ...championship,
      teams: syncedTeams,
      settings: {
    ...championship.settings,
    // 👇 Lê as configurações de copa do campeonato original (se existirem)
    minTeamsPerGroup: championship.settings.minTeamsPerGroup || 
                     (championship.type === 'copa' ? 3 : undefined),
    maxTeamsPerGroup: championship.settings.maxTeamsPerGroup || 
                     (championship.type === 'copa' ? 6 : undefined),
    qualifiedPerGroup: championship.settings.qualifiedPerGroup || 
                     (championship.type === 'copa' ? 2 : undefined)
      },
    customGroups: championship.customGroups
    };

    console.log('Times sincronizados:', syncedTeams.map(t => ({ id: t.id, name: t.name })));

    store.loadChampionship(syncedChampionship);

  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar campeonato';
    console.error(err);
    router.push('/');
  }
};

// --- Ações de simulação ---
const handleSimulatePhase = () => {
  if (!store.data) return;

  console.log(`🔄 Simulando fase: ${currentPhase.value}`);

  // Simula a próxima rodada da fase de grupos (ou toda a fase eliminatória)
  const updatedMatches = simulateCopaPhase(store.data, store.matches, currentPhase.value);
  store.updateMatches(updatedMatches);

  // Verifica se a fase foi totalmente concluída
  if (isPhaseCompleted(updatedMatches, currentPhase.value)) {
    phaseSimulationStatus.value[currentPhase.value] = 'completed';
    console.log(`✅ Fase ${currentPhase.value} concluída. Aguardando avanço manual.`);
  } else {
    console.log(`⚠️ Fase ${currentPhase.value} ainda não concluída.`);
  }

  // Atualiza a rodada selecionada
  const finishedMatches = updatedMatches.filter(m => m.status === 'finished');
  if (finishedMatches.length > 0) {
    selectedViewRound.value = Math.max(...finishedMatches.map(m => m.round));
  }
};

const handleResetSimulation = () => {
  if (!confirm('⚠️ Isso apagará toda a simulação atual e começará do zero. Tem certeza?')) {
    return;
  }
  
  store.resetSimulation();
  
  // 🔁 RESETAR ESTADO LOCAL
  currentPhase.value = 'groups';
  selectedViewRound.value = 1;
  phaseSimulationStatus.value = {
    groups: 'pending',
    round_32: 'pending',
    round_16: 'pending',
    quarters: 'pending',
    semis: 'pending',
    final: 'pending'
  };

  alert('✅ Simulação reiniciada!');
};

// --- Ações de UI ---
const openTeamModal = (team: Team) => {
  selectedTeam.value = team;
  isModalOpen.value = true;
};

const handleTeamUpdate = (updatedTeam: Team) => {
  teamsStore.updateTeam(updatedTeam);
  
  // Atualiza no store de campeonato
  if (store.data) {
    const teamIndex = store.data.teams.findIndex(t => t.id === updatedTeam.id);
    if (teamIndex !== -1) {
      store.data.teams[teamIndex] = updatedTeam;
    }
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
  
  if (file.type && !file.type.includes('json')) {
    alert('⚠️ Por favor, selecione um arquivo JSON válido.');
    target.value = '';
    return;
  }
  
  if (file.size > 5 * 1024 * 1024) {
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
    
    // Determina fase atual baseado nos resultados
    const completedPhases = availablePhases.value.filter(phase => 
      isPhaseCompleted(store.matches, phase)
    );
    
    if (completedPhases.length > 0) {
      const lastCompletedIndex = availablePhases.value.indexOf(completedPhases[completedPhases.length - 1]);
      currentPhase.value = lastCompletedIndex < availablePhases.value.length - 1
        ? availablePhases.value[lastCompletedIndex + 1]
        : 'final';
    } else {
      currentPhase.value = 'groups';
    }
    
    // Atualiza rodada selecionada
    const finishedMatches = store.matches.filter(m => m.status === 'finished');
    if (finishedMatches.length > 0) {
      selectedViewRound.value = Math.max(...finishedMatches.map(m => m.round));
    } else {
      selectedViewRound.value = 1;
    }
    
    target.value = '';
  } catch (error) {
    console.error('Erro detalhado:', error);
    alert(`❌ Falha ao importar simulação:\n${(error as Error).message}`);
    target.value = '';
  }
};

const phaseSimulationStatus = ref<Record<ChampionshipPhase, 'pending' | 'completed'>>({
  groups: 'pending',
  round_32: 'pending',
  round_16: 'pending',
  quarters: 'pending',
  semis: 'pending',
  final: 'pending',
  third: 'pending'
});

const handleAdvanceToNextPhase = () => {  
  const currentIndex = availablePhases.value.indexOf(currentPhase.value);
  const nextPhase = availablePhases.value[currentIndex + 1];

  if (nextPhase) {
    let nextUpdatedMatches = store.matches;

    if (currentPhase.value === 'groups') {
      const standings = calculateGroupStandings(store.data!, store.matches.filter(m => m.phase === 'groups'));
      nextUpdatedMatches = updateKnockoutTeams(
        store.matches,
        standings,
        store.data!.groups || [],
        store.data!.settings.qualifiedPerGroup || 2
      );
    } else {
      nextUpdatedMatches = prepareNextPhase(
        store.data!,
        store.matches,
        currentPhase.value,
        nextPhase
      );
    }

    store.updateMatches(nextUpdatedMatches);
    currentPhase.value = nextPhase;
    phaseSimulationStatus.value[nextPhase] = 'pending';
  }
};

watch(() => store.data, (newData) => {
  if (newData) {
    currentPhase.value = 'groups';
    selectedViewRound.value = 1;
    phaseSimulationStatus.value = {
      groups: 'pending',
      round_32: 'pending',
      round_16: 'pending',
      quarters: 'pending',
      semis: 'pending',
      final: 'pending'
    };
  }
});

const syncComponentStateWithSimulation = () => {
  if (!store.data) return;
  if (store.matches.length === 0 || store.matches.every(m => m.status === 'scheduled')) {
    currentPhase.value = 'groups';
    phaseSimulationStatus.value.groups = 'pending';
    selectedViewRound.value = 1;
    return;
  }
  
  const completedPhases = availablePhases.value.filter(phase => 
    isPhaseCompleted(store.matches, phase)
  );
  
  if (completedPhases.length > 0) {
    const lastCompletedIndex = availablePhases.value.indexOf(completedPhases[completedPhases.length - 1]);
    currentPhase.value = lastCompletedIndex < availablePhases.value.length - 1
      ? availablePhases.value[lastCompletedIndex + 1]
      : 'final';
    
    if (isPhaseCompleted(store.matches, currentPhase.value)) {
      phaseSimulationStatus.value[currentPhase.value] = 'completed';
    } else {
      phaseSimulationStatus.value[currentPhase.value] = 'pending';
    }
  } else {
    currentPhase.value = 'groups';
    phaseSimulationStatus.value.groups = 'pending';
  }

  const finishedMatches = store.matches.filter(m => m.status === 'finished');
  if (finishedMatches.length > 0) {
    selectedViewRound.value = Math.max(...finishedMatches.map(m => m.round));
  } else {
    selectedViewRound.value = 1;
  }

  console.log('🔄 Estado do componente sincronizado com a simulação');
  console.log('Fase atual:', currentPhase.value);
  console.log('Rodada selecionada:', selectedViewRound.value);
};


const syncPhaseStatusWithSimulation = () => {
  if (!store.data) return;
  
  availablePhases.value.forEach(phase => {
    if (isPhaseCompleted(store.matches, phase)) {
      phaseSimulationStatus.value[phase] = 'completed';
    } else {
      phaseSimulationStatus.value[phase] = 'pending';
    }
  });
};
</script>

<template>
  <div class="min-h-screen bg-slate-900 text-slate-100">    
    <NavigationHeader />
    <div class="max-w-6xl mx-auto">
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
                Temporada {{ store.data?.season }} • Copa
              </p>
            </div>
          </div>
        </div>

        <div class="flex gap-3 w-full md:w-auto">
          <button
            @click="handleResetSimulation"
            class="bg-amber-600 hover:bg-amber-500 px-4 py-2 rounded-lg text-white font-medium flex items-center gap-2 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reiniciar Simulação
          </button>
          
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

      <div class="mb-8 flex flex-wrap gap-3 justify-center md:justify-start">
        <button
          v-for="phase in availablePhases"
          :key="phase"
          @click="currentPhase = phase"
          :class="[
            'px-4 py-2 rounded-lg font-medium transition-colors',
            currentPhase === phase
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          ]"
        >
          {{ phase === 'groups' ? 'Fase de Grupos' : phase === 'round_32' ? 'Desesseisavos' : phase === 'round_16' ? 'Oitavas' : phase === 'quarters' ? 'Quartas' : phase === 'semis' ? 'Semifinais' : `${phase.toUpperCase()}` }}
        </button>
        <button
          v-if="phaseSimulationStatus[currentPhase] === 'pending'"
          @click="handleSimulatePhase"
          :disabled="currentPhase === 'final' && isPhaseCompleted(store.matches, 'final')"
          class="group relative flex flex-col items-center justify-center gap-2 bg-green-500 hover:bg-green-400 text-slate-900 font-bold py-3 px-8 rounded-xl transition-all shadow-lg hover:shadow-green-500/20 active:scale-95"
        >
          <div class="flex items-center gap-2">
            <Calendar :size="18" />
            <span>SIMULAR RESULTADOS</span>
          </div>
          <div v-if="currentPhase === 'groups' && nextGroupRound" class="text-xs bg-white/20 px-2 py-1 rounded-full mt-1">
            Próxima rodada: {{ nextGroupRound }}
          </div>
          <span v-else-if="currentPhase === 'groups'" class="text-xs bg-yellow-500/20 px-2 py-1 rounded-full mt-1 text-yellow-300">
            Fase concluída
          </span>
          <span class="absolute -top-2 -right-2 bg-white text-[10px] px-1.5 py-0.5 rounded-md shadow-sm">LIVE</span>
        </button>

        <button
          v-else
          @click="handleAdvanceToNextPhase"
          :disabled="!isPhaseCompleted(store.matches, currentPhase)"
          class="group relative flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-400 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg hover:shadow-blue-500/20 active:scale-95"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
          <span>IR PARA PRÓXIMA FASE</span>
        </button>
      </div>

    <main class="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8">
      <div>
        <StandingsTable
          v-if="currentPhase === 'groups' && store.data"
          :standings="store.standings"
          @team-click="openTeamModal"
          :show-group="true"
        />
      </div>
      <div class="space-y-8"  v-if="['groups'].includes(currentPhase)">
        <div class="bg-slate-800 rounded-2xl border border-slate-700 p-6">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-bold flex items-center gap-2">
              <Calendar :size="20" />
              Rodada {{ selectedViewRound }}
            </h2>
            <div class="flex gap-2">
              <button
                @click="goToPreviousRound"
                :disabled="selectedViewRound === Math.min(...allRounds)"
                class="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50"
              >
                ←
              </button>
              <button
                @click="goToNextRound"
                :disabled="selectedViewRound === Math.max(...allRounds)"
                class="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50"
              >
                →
              </button>
              </div>
            </div>
          
            <RoundResultsSection
              :finished-rounds="allRounds"
              :selected-round="selectedViewRound"
              :matches-in-selected-round="matchesInSelectedRound"
              :get-team-name="getTeamNameById"
              @on-previous="goToPreviousRound"
              @on-next="goToNextRound"
              hide-navigation
            />
          </div>

          <TopScorersSection
            :displayed-scorers="isTopScorersExpanded ? allTopScorers : displayedTopScorers"
            :all-scorers-length="allTopScorers.length"
            :is-expanded="isTopScorersExpanded"
            @toggle-expand="isTopScorersExpanded = !isTopScorersExpanded"
          />
        </div>
      </main>

      <PlayoffBracket
        v-if="['round_32', 'round_16', 'quarters', 'semis', 'final'].includes(currentPhase)"
        :phase="currentPhase"
        :matches="store.matches"
        :teams="store.data?.teams || []"
        :trophyUrl="trophyUrl"
        :availablePhases="availablePhases"
        :on-get-team-name="getTeamNameById"
        :on-get-team-logo="getTeamLogoById"
        :on-get-team-short-name="getTeamShortNameById"
      />

      <div v-if="error" class="mt-6 bg-red-500/20 border border-red-500 text-red-500 p-4 rounded-lg">
        ❌ {{ error }}
      </div>
    </div>

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