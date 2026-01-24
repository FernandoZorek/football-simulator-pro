<script setup lang="ts">
import { computed } from 'vue';
import type { Match, Team, ChampionshipPhase } from '../../core/types';
import TreeBracket from './TreeBracket.vue';

const props = defineProps<{
  phase: ChampionshipPhase;
  matches: Match[];
  teams: Team[];
  trophyUrl: string | null;
  availablePhases: ChampionshipPhase[];
  onGetTeamName: (teamId: string) => string;
  onGetTeamLogo: (teamId: string) => string | undefined;
  onGetTeamShortName: (teamId: string) => string;
}>();

const currentPhaseMatches = computed(() => {
  return props.matches.filter(m => m.phase === props.phase);
});

const getWinner = (match: Match) => {
  if (match.status !== 'finished') return null;
  
  if (match.penaltyScore) {
    return match.penaltyScore.home > match.penaltyScore.away 
      ? match.homeTeamId 
      : match.awayTeamId;
  }
  
  return match.homeScore > match.awayScore 
    ? match.homeTeamId 
    : match.awayTeamId;
};
</script>
<template>
  <div class="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden w-full">
    <div class="bg-slate-700 px-4 py-3 border-b border-slate-600">
      <h2 class="font-bold text-xl text-center">
        {{ phase === 'round_32' ? 'Desesseisavos' : 
           phase === 'round_16' ? 'Oitavas' : 
           phase === 'quarters' ? 'Quartas' : 
           phase === 'semis' ? 'Semifinais' : 'Final' }}
      </h2>
    </div>
    
    <div class="p-4">
      <TreeBracket 
        :matches="currentPhaseMatches" 
        :teams="teams"
        :on-get-team-name="onGetTeamName"
        :on-get-team-logo="onGetTeamLogo"
        :get-winner="getWinner"
        :phase="phase"
        :trophyUrl="trophyUrl"
        :availablePhases="availablePhases"
      />
    </div>
  </div>
</template>