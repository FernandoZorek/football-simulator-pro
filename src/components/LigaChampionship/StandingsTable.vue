<!-- src/components/StandingsTable.vue -->
<script setup lang="ts">
import { ListOrdered } from 'lucide-vue-next';

defineProps<{
  standings: any[];
  onTeamClick: (standing: any) => void;
}>();
</script>

<template>
  <section class="bg-slate-800 rounded-2xl border border-slate-700 shadow-sm overflow-hidden">
    <div class="p-6 border-b border-slate-700 flex items-center gap-2 text-slate-400">
      <ListOrdered :size="18" />
      <h2 class="font-bold uppercase text-sm tracking-wider">Classificação Oficial</h2>
    </div>
    <div class="overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr class="text-slate-500 text-xs uppercase bg-slate-800/50">
            <th class="p-4 text-center w-12">#</th>
            <th class="p-4">Clube</th>
            <th class="p-4 text-center">P</th>
            <th class="p-4 text-center">V</th>
            <th class="p-4 text-center">E</th>
            <th class="p-4 text-center">D</th>
            <th class="p-4 text-center">SG</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-700">
          <tr
            v-for="(team, i) in standings"
            :key="team.id"
            class="hover:bg-slate-700/30 transition-colors group cursor-pointer"
            @click="onTeamClick(team)"
          >
            <td
              class="p-4 text-center font-bold"
              :class="i < 3 ? 'text-blue-400' : 'text-slate-500'"
            >
              {{ i + 1 }}º
            </td>
            <td class="p-4">
              <div class="flex items-center gap-3">
                <div
                  class="w-8 h-8 rounded-md bg-white flex items-center justify-center overflow-hidden border border-slate-600"
                >
                  <img
                    v-if="team.team.logo"
                    :src="team.team.logo"
                    :alt="team.team.name"
                    class="w-full h-full object-contain"
                    @error="team.team.logo = undefined"
                  />
                  <span v-else class="text-xs font-bold text-slate-500">{{ team.team.shortName }}</span>
                </div>
                <span class="font-bold group-hover:text-blue-300 transition-colors">{{
                  team.team.name
                }}</span>
              </div>
            </td>
            <td class="p-4 text-center font-black text-white bg-slate-700/20">
              {{ team.points }}
            </td>
            <td class="p-4 text-center text-slate-400">{{ team.win }}</td>
            <td class="p-4 text-center text-slate-400">{{ team.draw }}</td>
            <td class="p-4 text-center text-slate-400">{{ team.loss }}</td>
            <td
              class="p-4 text-center"
              :class="team.goalDifference > 0 ? 'text-green-400' : 'text-red-400'"
            >
              {{ team.goalDifference >= 0 ? '+' : '' }}{{ team.goalDifference }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>