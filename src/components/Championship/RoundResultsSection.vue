<!-- src/components/RoundResultsSection.vue -->
<script setup lang="ts">
defineProps<{
  finishedRounds: number[];
  selectedRound: number;
  matchesInSelectedRound: any[];
  getTeamName: (id: string) => string;
}>();

defineEmits<{
  (e: 'onPrevious'): void;
  (e: 'onNext'): void;
}>();
</script>

<template>
  <section class="bg-slate-800 rounded-2xl border border-slate-700 p-6 shadow-sm">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <h2 class="font-bold text-slate-400 uppercase text-xs">Resultados por Rodada</h2>

      <div v-if="finishedRounds.length > 1" class="flex items-center gap-2">
        <button
          @click="$emit('onPrevious')"
          :disabled="finishedRounds.indexOf(selectedRound) === 0"
          class="p-1.5 rounded border border-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
          :class="finishedRounds.indexOf(selectedRound) === 0 ? 'text-slate-500' : 'text-slate-300 hover:text-white'"
        >
          ←
        </button>

        <span class="text-sm font-medium text-slate-200">
          Rodada {{ selectedRound }}
        </span>

        <button
          @click="$emit('onNext')"
          :disabled="finishedRounds.indexOf(selectedRound) === finishedRounds.length - 1"
          class="p-1.5 rounded border border-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
          :class="finishedRounds.indexOf(selectedRound) === finishedRounds.length - 1 ? 'text-slate-500' : 'text-slate-300 hover:text-white'"
        >
          →
        </button>
      </div>
      <div v-else class="text-sm font-medium text-slate-200">
        Rodada {{ selectedRound }}
      </div>
    </div>
    <div v-if="matchesInSelectedRound.length === 0" class="text-center text-slate-500 text-xs italic py-4">
      Nenhum jogo nesta rodada.
    </div>
    <div v-else class="space-y-6">
      <div
        v-for="match in matchesInSelectedRound"
        :key="match.id"
        class="bg-slate-900/50 p-4 rounded-xl border border-slate-700"
      >
        <div class="flex justify-between items-center mb-3">
          <span class="font-bold text-xs">{{ getTeamName(match.homeTeamId) }}</span>
          <div v-if="match.status === 'finished'" class="flex items-center gap-2">
            <span class="text-xl font-black text-white">{{ match.homeScore }}</span>
            <span class="text-slate-600 text-xs">x</span>
            <span class="text-xl font-black text-white">{{ match.awayScore }}</span>
          </div>
          <div v-else class="text-slate-500 text-xs italic">
            Agendado
          </div>
          <span class="font-bold text-xs">{{ getTeamName(match.awayTeamId) }}</span>
        </div>

        <!-- Eventos (só se finalizado) -->
        <div v-if="match.status === 'finished'" class="border-t border-slate-700/50 pt-2">
          <div
            v-for="event in match.events"
            :key="`${match.id}-${event.minute}`"
            class="flex items-center gap-2 text-[10px] text-slate-400 italic"
          >
            <span class="text-blue-500">{{ event.minute }}'</span>
            <span>⚽ {{ event.playerName }} ({{ getTeamName(event.teamId) }})</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>