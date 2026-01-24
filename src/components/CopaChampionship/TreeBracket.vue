<script setup lang="ts">
import { computed } from 'vue';
import type { ChampionshipPhase, Match, Team } from '../../core/types';
import MatchCard from './MatchCard.vue';
import MatchPlaceholder from './MatchPlaceholder.vue';
import { Trophy } from 'lucide-vue-next';

const props = defineProps<{
  matches: Match[];
  teams: Team[];
  onGetTeamName: (teamId: string) => string;
  onGetTeamLogo?: (teamId: string) => string | undefined;
  getWinner: (match: Match) => string | null;
  trophyUrl: string | null;
  availablePhases: ChampionshipPhase[];
}>();

const phases = props.availablePhases.filter(p => p !== 'groups');
const matchesByPhase = computed(() => {
  const result: Record<string, { left: Match[]; right: Match[] }> = {};
  for (const phase of phases) {
    const phaseMatches = props.matches.filter(m => m.phase === phase);
    const middle = Math.ceil(phaseMatches.length / 2);
    result[phase] = {
      left: phaseMatches.slice(0, middle),
      right: phaseMatches.slice(middle),
    };
  }
  return result;
});

function generatePlaceholders(current: Match[], phase: string, side: 'left' | 'right'): Match[] {
  if (current.length > 0) return current;

  const index = phases.indexOf(phase);
  const prevPhase = phases[index - 1];
  const prevMatches = matchesByPhase.value[prevPhase]?.[side] || [];

  const count = Math.max(prevMatches.length / 2, 1);
  return Array.from({ length: count }).map((_, i) => ({
    id: `placeholder-${phase}-${side}-${i}`,
    homeTeamId: '',
    awayTeamId: '',
    homeScore: null,
    awayScore: null,
    phase,
  })) as unknown as Match[];
};

const fullBracket = computed(() => {
  const result: Record<string, { left: Match[]; right: Match[] }> = {};
  for (const phase of phases) {
    result[phase] = {
      left: generatePlaceholders(matchesByPhase.value[phase]?.left || [], phase, 'left'),
      right: generatePlaceholders(matchesByPhase.value[phase]?.right || [], phase, 'right'),
    };
  }
  return result;
});

</script>

<template>
  <div class="flex justify-center items-start gap-12 p-8 bg-slate-900 rounded-2xl border border-slate-700">
    <!-- Chave A -->
    <div class="flex gap-6">
      <div
        v-for="(phase, i) in phases.filter(p => p !== 'final')"
        :key="'left-' + phase"
        class="flex flex-col items-center"
        :class="{
          'mt-t1': i === 0,
          'mt-t2': i === 1,
          'mt-t3': i === 2,
          'mt-t4': i === 3,
        }"
      >
        <div class="text-slate-400 text-xs font-semibold mb-2 uppercase">
          {{ phase === 'round_32' ? '16 avos' :
             phase === 'round_16' ? 'Oitavas' :
             phase === 'quarters' ? 'Quartas' :
             'Semis' }}
        </div>

        <div class="flex flex-col gap-4 items-center">
          <template v-for="match in fullBracket[phase].left" :key="match.id">
            <MatchCard
              v-if="match.homeTeamId && match.awayTeamId"
              :match="match"
              :teams="teams"
              :on-get-team-name="onGetTeamName"
              :on-get-team-logo="onGetTeamLogo"
              :get-winner="getWinner"
              class="match-card"
            />
            <MatchPlaceholder v-else />
          </template>
        </div>
      </div>
    </div>

    <!-- Final central -->
    <div class="flex flex-col justify-center items-center mt-t2">
      <div class="w-[100px] h-[100px] rounded-full bg-white flex items-center justify-center overflow-hidden mb-4" v-if="trophyUrl">  
        <img
          v-if="props.trophyUrl"
          :src="props.trophyUrl"
          alt="Troféu"
          class="w-full h-full object-cover"
        />
      </div>
      <div class="w-[100px] h-[100px] rounded-full bg-yellow-400 flex items-center justify-center overflow-hidden mb-4" v-else>
        <Trophy :size="64" class="text-black" />
      </div>
      <div class="text-slate-400 text-xs font-semibold mb-2 uppercase">Final</div>
      <template v-for="match in fullBracket.final.left" :key="match.id">
        <div
          v-if="match.homeTeamId && match.awayTeamId"
          class="match-card border-yellow-400"
        >
          <MatchCard
            :match="match"
            :teams="teams"
            :on-get-team-name="onGetTeamName"
            :on-get-team-logo="onGetTeamLogo"
            :get-winner="getWinner"
          />
        </div>
        <MatchPlaceholder v-else />
      </template>
    </div>

    <!-- Chave B -->
    <div class="flex gap-6 flex-row-reverse">
      <div
        v-for="(phase, i) in phases.filter(p => p !== 'final')"
        :key="'right-' + phase"
        class="flex flex-col items-center"
        :class="{
          'mt-t1': i === 0,
          'mt-t2': i === 1,
          'mt-t3': i === 2,
          'mt-t4': i === 3,
        }"
      >
        <div class="text-slate-400 text-xs font-semibold mb-2 uppercase">
          {{ phase === 'round_32' ? '16 avos' :
             phase === 'round_16' ? 'Oitavas' :
             phase === 'quarters' ? 'Quartas' :
             'Semis' }}
        </div>

        <div class="flex flex-col gap-4 items-center">
          <template v-for="match in fullBracket[phase].right" :key="match.id">
            <MatchCard
              v-if="match.homeTeamId && match.awayTeamId"
              :match="match"
              :teams="teams"
              :on-get-team-name="onGetTeamName"
              :on-get-team-logo="onGetTeamLogo"
              :get-winner="getWinner"
              class="match-card"
            />
            <MatchPlaceholder v-else />
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.match-card {  
  min-height: 122px;
  justify-content: space-between;
  background-color: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 6px;
  transition: all 0.2s ease;
}
.match-card:hover {
  transform: translateY(-2px);
  border-color: #3b82f6;
}
.mt-t1 {
  margin-top: 10px;
}
.mt-t2 {
  margin-top: 100px;
}
.mt-t3 {
  margin-top: 245px;
}
.mt-t4 {
  margin-top: 330px;
}
</style>
