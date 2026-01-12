<!-- src/views/LigaChampionship.vue -->
<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useChampionshipStore } from '../store/championship';
import type { Team } from '../core/types';
import { generateFixture } from '../services/fixtureGenerator';
import { Trophy, ListOrdered, Calendar } from 'lucide-vue-next';
import { loadChampionship } from '../services/dataLoader';

// Componentes
import StandingsTable from '../components/LigaChampionship/StandingsTable.vue';
import TopScorersSection from '../components/LigaChampionship/TopScorersSection.vue';
import RoundResultsSection from '../components/LigaChampionship/RoundResultsSection.vue';
import TeamModal from '../components/LigaChampionship/TeamModal.vue';
import FixtureModal from '../components/LigaChampionship/FixtureModal.vue';


const route = useRoute();
const router = useRouter();
const store = useChampionshipStore();

const championshipId = route.params.id as string;

const currentRound = ref(1);
const error = ref<string | null>(null);
const selectedTeam = ref<Team | null>(null);
const isModalOpen = ref(false);
const isFixtureModalOpen = ref(false);
const isTopScorersExpanded = ref(false);

// --- Rodadas: agora todas as rodadas (1 a 38) ---
const allRounds = computed(() => {
  if (!store.data?.teams.length) return [];
  const n = store.data.teams.length;
  const totalRounds = (n - 1) * 2; // 38 para 20 times
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
  return isTopScorersExpanded.value
    ? allTopScorers.value
    : allTopScorers.value.slice(0, 5);
});

// --- Funções auxiliares ---
const getTeamNameById = (teamId: string): string => {
  return store.data?.teams.find(t => t.id === teamId)?.name || teamId;
};

const getTeamLogoById = (teamId: string) => {
  return store.data?.teams.find(t => t.id === teamId)?.logo;
};

const getTeamShortNameById = (teamId: string) => {
  return store.data?.teams.find(t => t.id === teamId)?.shortName || '??';
};

// --- Ciclo de vida ---
onMounted(async () => {
  if (!championshipId) {
    router.push('/');
    return;
  }
  await loadSelectedDataset(championshipId);
  selectedViewRound.value = 1; // inicia na rodada 1
});

const loadSelectedDataset = async (id: string) => {
  error.value = null;
  try {
    const championship = await loadChampionship(id);
    store.loadChampionship(championship);
    store.matches = generateFixture(championship.teams);
    currentRound.value = 1;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar campeonato';
    console.error(err);
    router.push('/');
  }
};

// --- Ações ---
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
</script>

<template>
  <div class="min-h-screen bg-slate-900 text-slate-100 font-sans p-4 md:p-8">
    <div class="max-w-6xl mx-auto">
      <!-- Cabeçalho -->
      <header
        class="flex flex-col md:flex-row justify-between items-center mb-10 gap-6 bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl"
      >
        <div class="flex items-center gap-4">
          <div class="bg-blue-600 p-3 rounded-lg shadow-lg shadow-blue-500/20">
            <Trophy :size="32" class="text-white" />
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

        <div class="flex gap-3 w-full md:w-auto">
          <button
            @click="handleSimulate"
            :disabled="currentRound > allRounds.length"
            class="group relative flex items-center justify-center gap-2 bg-green-500 hover:bg-green-400 disabled:bg-slate-700 text-slate-900 font-bold py-3 px-6 rounded-xl transition-all shadow-lg hover:shadow-green-500/20 active:scale-95 w-full sm:w-auto"
          >
            <Calendar :size="18" />
            <span>SIMULAR RODADA {{ currentRound }}</span>
            <span class="absolute -top-2 -right-2 bg-white text-[10px] px-1.5 py-0.5 rounded-md shadow-sm">
              LIVE
            </span>
          </button>
          <button
            @click="isFixtureModalOpen = true"
            class="group relative flex items-center justify-center gap-2 bg-purple-500 hover:bg-purple-400 text-slate-900 font-bold py-3 px-6 rounded-xl transition-all shadow-lg hover:shadow-purple-500/20 active:scale-95 w-full sm:w-auto"
          >
            <ListOrdered :size="18" />
            <span>TABELA DE JOGOS</span>
          </button>
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