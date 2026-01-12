<!-- src/components/TopScorersSection.vue -->
<script setup lang="ts">
defineProps<{
  displayedScorers: any[];
  allScorersLength: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
}>();
</script>

<template>
  <section class="bg-slate-800 rounded-2xl border border-slate-700 p-6 shadow-sm">
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-2 text-yellow-500">
        <span class="text-xl">⚽</span>
        <h2 class="font-bold uppercase text-sm">Top Goleadores</h2>
      </div>
      <button
        v-if="allScorersLength > 5"
        @click="onToggleExpand"
        class="text-xs text-slate-400 hover:text-white transition-colors"
      >
        {{ isExpanded ? 'Ver menos' : 'Ver todos' }}
      </button>
    </div>
    <div class="space-y-4">
      <div
        v-for="(player, i) in displayedScorers"
        :key="i"
        class="flex justify-between items-center group"
      >
        <div class="flex items-center gap-3">
          <div class="w-6 h-6 rounded-full bg-slate-700 overflow-hidden flex items-center justify-center">
            <img
              v-if="player.photo"
              :src="player.photo"
              :alt="player.name"
              class="w-full h-full object-cover"
              @error="player.photo = undefined"
            />
            <span v-else class="text-[8px] text-white font-bold">{{ player.name.charAt(0) }}</span>
          </div>
          <div>
            <p class="font-bold text-sm leading-none mb-1">{{ player.name }}</p>
            <p class="text-[10px] uppercase text-slate-500 font-medium">
              {{ player.team }}
            </p>
          </div>
        </div>
        <span
          class="bg-slate-700 px-3 py-1 rounded-full text-xs font-black text-white group-hover:bg-blue-600 transition-colors"
        >
          {{ player.goals }} Gols
        </span>
      </div>
      <p v-if="allScorersLength === 0" class="text-center text-slate-500 text-xs py-4">
        Aguardando início dos jogos...
      </p>
    </div>
  </section>
</template>