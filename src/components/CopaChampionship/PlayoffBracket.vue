<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Match, Team, ChampionshipPhase } from '../../core/types';
import MatchCard from './MatchCard.vue';
import { Trophy } from 'lucide-vue-next';

const props = defineProps<{
  phase: ChampionshipPhase;
  matches: Match[];
  teams: Team[];
  onGetTeamName: (teamId: string) => string;
  onGetTeamLogo: (teamId: string) => string | undefined;
  onGetTeamShortName: (teamId: string) => string;
}>();

const expandedPhases = ref<Record<ChampionshipPhase, boolean>>({
  round_32: false,
  round_16: false,
  quarters: false,
  third: false,
  semis: false,
  final: false
});

const togglePhase = (phase: ChampionshipPhase) => {
  expandedPhases.value[phase] = !expandedPhases.value[phase];
};

const getPhaseMatches = (phase: ChampionshipPhase) => {
  return props.matches.filter(m => m.phase === phase).sort((a, b) => a.round - b.round);
};

const getTeamById = (teamId: string | null) => {
  return teamId ? props.teams.find(t => t.id === teamId) : null;
};

const formatMatchResult = (match: Match) => {
  if (match.status !== 'finished') return 'vs';
  
  let result = `${match.homeScore} - ${match.awayScore}`;
  
  if (match.penaltyScore) {
    result += ` (${match.penaltyScore.home} - ${match.penaltyScore.away} pên.)`;
  }
  
  return result;
};

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
  <div class="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
    <div class="bg-slate-700 px-4 py-3 border-b border-slate-600 flex items-center justify-between">
      <h2 class="font-bold text-xl flex items-center gap-2">
        <svg v-if="phase === 'final'" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
        Fase {{ phase === 'round_32' ? 'Desesseisavos' : phase === 'round_16' ? 'Oitavas' : phase === 'quarters' ? 'Quartas' : phase === 'semis' ? 'Semifinais' : 'Final' }}
      </h2>
      <button 
        v-if="phase !== 'final'" 
        @click="togglePhase(phase)"
        class="text-slate-300 hover:text-white transition-colors"
      >
        {{ expandedPhases[phase] ? 'Ocultar' : 'Ver todos' }}
      </button>
    </div>
    
    <div class="p-4">
      <div class="space-y-6">
        <!-- Desesseisavos de Final -->
        <div v-if="phase === 'round_32' || expandedPhases['round_32']">
          <h3 class="font-bold mb-3 text-slate-300">Desesseisavos de Final</h3>
          <div class="space-y-3">
            <div 
              v-for="match in getPhaseMatches('round_32')" 
              :key="match.id"
              class="bg-slate-800 rounded-lg p-3 border border-slate-700"
            >
              <MatchCard 
                :match="match" 
                :teams="teams" 
                :on-get-team-name="onGetTeamName"
                :on-get-team-logo="onGetTeamLogo"
                :get-winner="getWinner"
              />
            </div>
          </div>
        </div>


        <!-- Oitavas de Final -->
        <div v-if="(phase === 'round_16' && !expandedPhases['round_32']) || expandedPhases['round_16']">
          <h3 class="font-bold mb-3 text-slate-300">Oitavas de Final</h3>
          <div class="space-y-3">
            <div 
              v-for="match in getPhaseMatches('round_16')" 
              :key="match.id"
              class="bg-slate-800 rounded-lg p-3 border border-slate-700"
            >
              <MatchCard 
                :match="match" 
                :teams="teams" 
                :on-get-team-name="onGetTeamName"
                :on-get-team-logo="onGetTeamLogo"
                :get-winner="getWinner"
              />
            </div>
          </div>
        </div>
        
        <!-- Quartas de Final -->
        <div v-if="(phase === 'quarters' && !expandedPhases['round_16']) || expandedPhases['quarters']">
          <h3 class="font-bold mb-3 text-slate-300">Quartas de Final</h3>
          <div class="space-y-3">
            <div 
              v-for="match in getPhaseMatches('quarters')" 
              :key="match.id"
              class="bg-slate-800 rounded-lg p-3 border border-slate-700"
            >
              <MatchCard 
                :match="match" 
                :teams="teams" 
                :on-get-team-name="onGetTeamName"
                :on-get-team-logo="onGetTeamLogo"
                :get-winner="getWinner"
              />
            </div>
          </div>
        </div>
        
        <!-- Semifinais -->
        <div v-if="(phase === 'semis' && !expandedPhases['quarters']) || expandedPhases['semis']">
          <h3 class="font-bold mb-3 text-slate-300">Semifinais</h3>
          <div class="space-y-3">
            <div 
              v-for="match in getPhaseMatches('semis').filter(m => !m.id.includes('third'))" 
              :key="match.id"
              class="bg-slate-800 rounded-lg p-3 border border-slate-700"
            >
              <MatchCard 
                :match="match" 
                :teams="teams" 
                :on-get-team-name="onGetTeamName"
                :on-get-team-logo="onGetTeamLogo"
                :get-winner="getWinner"
              />
            </div>
          </div>
          
          <!-- Disputa de 3º lugar -->
          <div v-if="getPhaseMatches('semis').some(m => m.id.includes('third'))" class="mt-6">
            <h3 class="font-bold mb-3 text-slate-300">Disputa de 3º Lugar</h3>
            <div 
              v-for="match in getPhaseMatches('semis').filter(m => m.id.includes('third'))" 
              :key="match.id"
              class="bg-slate-800 rounded-lg p-3 border border-slate-700"
            >
              <MatchCard 
                :match="match" 
                :teams="teams" 
                :on-get-team-name="onGetTeamName"
                :on-get-team-logo="onGetTeamLogo"
                :get-winner="getWinner"
              />
            </div>
          </div>
        </div>
        
        <!-- Final -->
        <div v-if="phase === 'final' || expandedPhases['final']">
          <div class="bg-gradient-to-r from-amber-500 to-yellow-600 rounded-xl p-6 text-center mb-8">
            <Trophy class="w-12 h-12 mx-auto text-white mb-2" />
            <h3 class="text-2xl font-bold text-white">GRANDE FINAL</h3>
          </div>
          
          <div 
            v-for="match in getPhaseMatches('final')" 
            :key="match.id"
            class="bg-slate-800 rounded-lg p-4 border-2 border-yellow-500/50"
          >
            <MatchCard 
              :match="match" 
              :teams="teams" 
              :on-get-team-name="onGetTeamName"
              :on-get-team-logo="onGetTeamLogo"
              :get-winner="getWinner"
              is-final
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.match-card {
  transition: all 0.2s ease;
}
.match-card:hover {
  transform: translateX(4px);
  border-color: theme('colors.blue.500');
}
.match-card.finished {
  opacity: 0.9;
}
.match-card.finished:hover {
  opacity: 1;
}
</style>