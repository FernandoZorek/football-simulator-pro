<!-- src/components/LigaChampionship/MatchCard.vue -->
<script setup lang="ts">
import { computed } from 'vue';
import type { Match, Team } from '../../core/types';

const props = defineProps<{
  match: Match;
  teams: Team[];
  onGetTeamName: (teamId: string) => string;
  onGetTeamLogo?: (teamId: string) => string | undefined;
  getWinner?: (match: Match) => string | null;
  isFinal?: boolean;
}>();

const homeTeam = computed(() => props.teams.find(t => t.id === props.match.homeTeamId));
const awayTeam = computed(() => props.teams.find(t => t.id === props.match.awayTeamId));

const winnerId = computed(() => {
  return props.getWinner ? props.getWinner(props.match) : null;
});

const isHomeWinner = computed(() => winnerId.value === props.match.homeTeamId);
const isAwayWinner = computed(() => winnerId.value === props.match.awayTeamId);
</script>

<template>
  <div 
    class="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700"
    :class="{ 'border-yellow-500/50': isFinal }"
  >
    <!-- Time Mandante -->
    <div class="flex items-center gap-2 min-w-0">
      <div 
        v-if="homeTeam?.logo" 
        class="w-6 h-6 rounded-full bg-white flex items-center justify-center overflow-hidden"
      >
        <img :src="homeTeam.logo" alt="" class="w-full h-full object-contain">
      </div>
      <span 
        class="font-medium truncate"
        :class="{ 'text-green-400 font-bold': isHomeWinner && match.status === 'finished' }"
      >
        {{ onGetTeamName(match.homeTeamId || '') }}
      </span>
    </div>

    <!-- Resultado -->
    <div class="text-center min-w-[80px]">
      <div v-if="match.status === 'finished'" class="font-bold text-lg">
        {{ match.homeScore }} - {{ match.awayScore }}
      </div>
      <div v-else class="text-slate-400">vs</div>
      
      <!-- Pênaltis -->
      <div 
        v-if="match.penaltyScore" 
        class="text-xs text-slate-400 mt-1"
      >
        ({{ match.penaltyScore.home }} - {{ match.penaltyScore.away }} pên.)
      </div>
    </div>

    <!-- Time Visitante -->
    <div class="flex items-center gap-2 min-w-0">
      <span 
        class="font-medium truncate text-right"
        :class="{ 'text-green-400 font-bold': isAwayWinner && match.status === 'finished' }"
      >
        {{ onGetTeamName(match.awayTeamId || '') }}
      </span>
      <div 
        v-if="awayTeam?.logo" 
        class="w-6 h-6 rounded-full bg-white flex items-center justify-center overflow-hidden"
      >
        <img :src="awayTeam.logo" alt="" class="w-full h-full object-contain">
      </div>
    </div>
  </div>
</template>