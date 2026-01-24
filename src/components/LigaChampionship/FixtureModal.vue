<!-- src/components/FixtureModal.vue -->
<script setup lang="ts">
import { computed } from 'vue';
import type { Match } from '../../core/types';
import { ListOrdered } from 'lucide-vue-next';

const props = defineProps<{
  matches: Match[];
  modelValue: boolean;
  onGetTeamName: (teamId: string) => string;
  onGetTeamLogo: (teamId: string) => string | undefined;
  onGetTeamShortName: (teamId: string) => string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

const close = () => {
  emit('update:modelValue', false);
};

const groupedMatches = computed(() => {
  const groups: Record<number, Match[]> = {};

  props.matches.forEach(match => {
    if (!groups[match.round]) {
      groups[match.round] = [];
    }
    groups[match.round].push(match);
  });

  return Object.entries(groups)
    .map(([round, matches]) => ({
      round: Number(round),
      matches: matches.sort((a, b) => a.id.localeCompare(b.id)),
    }))
    .sort((a, b) => a.round - b.round);
});

function generateMatchDateTime(round: number, matchIndex: number): string {
  const baseDate = new Date('2026-05-16T12:00:00');
  const roundOffsetDays = (round - 1) * 7;

  let dayOfWeekOffset = 5;
  let time = '16:00';

  // 📅 Distribuição realista
  if (matchIndex === 0) {
    dayOfWeekOffset = 5; // sábado
    time = '16:00';
  } else if (matchIndex === 1) {
    dayOfWeekOffset = 0; // domingo
    time = '16:00';
  } else if (matchIndex === 2) {
    dayOfWeekOffset = 5; // sábado
    time = '18:00';
  } else if (matchIndex === 3) {
    dayOfWeekOffset = 0; // domingo
    time = '18:00';
  } else if (matchIndex === 4) {
    dayOfWeekOffset = 4; // sexta-feira
    time = '21:00';
  } else if (matchIndex === 5) {
    dayOfWeekOffset = 3; // quinta
    time = '19:00';
  } else if (matchIndex === 6) {
    dayOfWeekOffset = 3; // quarta
    time = '21:00';
  } else {
    const extraIndex = matchIndex - 7;
    const days = [5, 0, 5, 0, 4, 3, 3];
    const times = ['16:00', '16:00', '18:00', '18:00', '21:00', '19:00', '21:00'];
    dayOfWeekOffset = days[extraIndex % days.length];
    time = times[extraIndex % times.length];
  }

  const startDate = new Date(baseDate);
  startDate.setDate(baseDate.getDate() - baseDate.getDay() + 6);

  const roundDate = new Date(startDate);
  roundDate.setDate(startDate.getDate() + roundOffsetDays);

  const currentDay = roundDate.getDay();
  const daysUntilTarget = (dayOfWeekOffset - currentDay + 7) % 7;
  roundDate.setDate(roundDate.getDate() + daysUntilTarget);

  const formatter = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  });

  const parts = formatter.formatToParts(roundDate);
  const weekday = parts.find(p => p.type === 'weekday')?.value || '';
  const day = parts.find(p => p.type === 'day')?.value || '';
  const month = parts.find(p => p.type === 'month')?.value || '';
  const cleanWeekday = weekday.replace('.', '');

  return `${cleanWeekday}, ${day}/${month} • ${time}`;
}
</script>

<template>
  <teleport to="body" v-if="modelValue">
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      @click="close"
    >
      <div
        class="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        @click.stop
      >
        <div class="bg-slate-900 p-6 border-b border-slate-700 flex items-center justify-between">
          <h2 class="text-xl font-bold text-white flex items-center gap-2">
            <ListOrdered :size="20" />
            Tabela de Jogos
          </h2>
          <button
            @click="close"
            class="text-slate-400 hover:text-white text-2xl font-bold"
          >
            &times;
          </button>
        </div>

        <div class="overflow-y-auto p-4 max-h-[70vh]">
            <div v-for="group in groupedMatches" :key="group.round" class="mb-8">
                <h3 class="text-lg font-bold text-slate-300 mb-4 pb-2 border-b border-slate-700">
                Rodada {{ group.round }}
                </h3>
                
                <div class="grid gap-4">
                <div
                    v-for="(match, idx) in group.matches"
                    :key="match.id"
                    class="bg-slate-900/60 rounded-xl p-4 border border-slate-700 hover:border-slate-600 transition-colors"
                >
                    <!-- Data e horário -->
                    <div class="text-xs text-slate-500 mb-3 flex justify-between">
                    <span>{{ generateMatchDateTime(group.round, idx) }}</span>
                    <span v-if="match.status === 'finished'" class="text-green-400 font-medium">Finalizado</span>
                    <span v-else class="text-amber-400">Agendado</span>
                    </div>

                    <!-- Times e placar -->
                    <div class="flex items-center justify-between">
                    <!-- Time da casa -->
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-md bg-white flex items-center justify-center overflow-hidden border border-slate-600">
                        <img
                            v-if="props.onGetTeamLogo(match.homeTeamId)"
                            :src="props.onGetTeamLogo(match.homeTeamId)"
                            :alt="props.onGetTeamName(match.homeTeamId)"
                            class="w-full h-full object-contain"
                            @error="() => {}"
                        />
                        <span v-else class="text-[9px] font-bold text-slate-700">
                            {{ props.onGetTeamShortName(match.homeTeamId) }}
                        </span>
                        </div>
                        <span class="text-sm font-medium text-white">
                        {{ props.onGetTeamName(match.homeTeamId) }}
                        </span>
                    </div>

                    <!-- Placar ou VS -->
                    <div class="flex flex-col items-center mx-2">
                        <div v-if="match.status === 'finished'" class="flex items-baseline gap-1">
                        <span class="text-lg font-black text-white">{{ match.homeScore }}</span>
                        <span class="text-slate-500 mx-1">x</span>
                        <span class="text-lg font-black text-white">{{ match.awayScore }}</span>
                        </div>
                        <div v-else class="text-slate-600 font-medium">VS</div>
                    </div>

                    <!-- Time visitante -->
                    <div class="flex items-center gap-3 flex-row-reverse">
                        <div class="w-10 h-10 rounded-md bg-white flex items-center justify-center overflow-hidden border border-slate-600">
                        <img
                            v-if="props.onGetTeamLogo(match.awayTeamId)"
                            :src="props.onGetTeamLogo(match.awayTeamId)"
                            :alt="props.onGetTeamName(match.awayTeamId)"
                            class="w-full h-full object-contain"
                            @error="() => {}"
                        />
                        <span v-else class="text-[9px] font-bold text-slate-700">
                            {{ props.onGetTeamShortName(match.awayTeamId) }}
                        </span>
                        </div>
                        <span class="text-sm font-medium text-white">
                        {{ props.onGetTeamName(match.awayTeamId) }}
                        </span>
                    </div>
                    </div>
                </div>
                </div>
            </div>

            <p v-if="groupedMatches.length === 0" class="text-center text-slate-500 py-8">
                Nenhum jogo gerado.
            </p>
            </div>
      </div>
    </div>
  </teleport>
</template>