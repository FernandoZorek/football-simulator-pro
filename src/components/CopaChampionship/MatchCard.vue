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
const winnerId = computed(() => (props.getWinner ? props.getWinner(props.match) : null));
const isHomeWinner = computed(() => winnerId.value === props.match.homeTeamId);
const isAwayWinner = computed(() => winnerId.value === props.match.awayTeamId);

const getTeamName = (teamId: string | null) => (!teamId ? '' : props.onGetTeamName(teamId));
</script>

<template>
  <div 
    class="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-800/50 border border-slate-700 w-[90px]"
    :class="{ 'border-yellow-500/50': isFinal }"
  >
    <div class="flex justify-center py-1">
      <div 
        v-if="homeTeam?.logo" 
        class="w-12 h-12 rounded-full bg-white flex items-center justify-center overflow-hidden relative group"
        :title="getTeamName(match.homeTeamId)"
      >
        <img :src="homeTeam.logo" alt="" class="w-full h-full object-contain">
        <span 
          class="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10"
        >
          {{ getTeamName(match.homeTeamId) }}
        </span>
      </div>
      <div v-else class="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 text-sm">?</div>
    </div>
    <div class="text-center text-[14px] font-mono my-1">
      <span 
        v-if="match.status === 'finished'" 
        :class="{ 'text-green-400 font-bold': isHomeWinner }"
      >
        {{ match.homeScore }}
      </span>
      <span v-else class="text-slate-400">–</span>
      <span class="text-slate-500 mx-1">x</span>
      <span 
        v-if="match.status === 'finished'" 
        :class="{ 'text-green-400 font-bold': isAwayWinner }"
      >
        {{ match.awayScore }}
      </span>
      <span v-else class="text-slate-400">–</span>
      <div 
        v-if="match.penaltyScore" 
        class="text-slate-400 mt-1 text-[10px]"
      >
        ({{ match.penaltyScore.home }} - {{ match.penaltyScore.away }} pên.)
      </div>
    </div>
    <div class="flex justify-center py-1">
      <div 
        v-if="awayTeam?.logo" 
        class="w-12 h-12 rounded-full bg-white flex items-center justify-center overflow-hidden relative group"
        :title="getTeamName(match.awayTeamId)"
      >
        <img :src="awayTeam.logo" alt="" class="w-full h-full object-contain">
        <span 
          class="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10"
        >
          {{ getTeamName(match.awayTeamId) }}
        </span>
      </div>
      <div v-else class="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 text-sm">?</div>
    </div>
  </div>
</template>