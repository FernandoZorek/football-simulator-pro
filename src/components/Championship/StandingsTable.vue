<script setup lang="ts">
import { computed } from 'vue';
import { useChampionshipStore } from '../../store/championship';
import { ListOrdered } from 'lucide-vue-next';
const store = useChampionshipStore();



const props = defineProps<{
  standings: any[];
  onTeamClick: (standing: any) => void;
  showGroup?: boolean;
}>();

const getGroupName = (groupId: string): string => {
  if (!store.data?.groups) return '-';
  
  const group = store.data.groups.find(g => g.id === groupId);
  return group ? group.name : '-';
};


// Agrupa standings por grupo (apenas para copas)
const groupedStandings = computed(() => {
  if (!props.showGroup) return null;
  
  const groups: Record<string, any[]> = {};
  props.standings.forEach(standing => {
    const groupId = standing.group || 'default';
    if (!groups[groupId]) groups[groupId] = [];
    groups[groupId].push(standing);
  });
  
  // Ordena os grupos alfabeticamente pelo nome
  return Object.entries(groups)
    .map(([groupId, standings]) => {
      const group = props.standings.find(s => s.group === groupId)?.group;
      return { groupId, group, standings };
    })
    .sort((a, b) => (a.group || '').localeCompare(b.group || ''));
});
</script>

<template>
  <!-- Loop por grupos (copa) ou única tabela (liga) -->
  <div v-for="groupData in (groupedStandings || [{ groupId: 'all', group: null, standings: standings }])" :key="groupData.groupId">
    <section class="bg-slate-800 rounded-2xl border border-slate-700 shadow-sm overflow-hidden mb-6 last:mb-8">
      <!-- Cabeçalho do grupo (apenas para copas) -->
      <div v-if="showGroup" class="p-4 bg-slate-700/50 border-b border-slate-700 flex items-center gap-2">
        <h3 class="font-bold text-slate-200">Grupo </h3>
        <div class="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
          {{ groupData.group ? getGroupName(groupData.group) :'?' }}
        </div>
      </div>
      
      <!-- Cabeçalho da tabela (comum para ambos) -->
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="text-slate-500 text-xs uppercase bg-slate-800/50">
              <th class="p-3 text-center w-10">#</th>
              <th class="p-3">Clube</th>
              <th class="p-3 text-center">P</th>
              <!-- Coluna "J" (jogos) apenas para copas -->
              <th v-if="showGroup" class="p-3 text-center">J</th>
              <th class="p-3 text-center">V</th>
              <th class="p-3 text-center">E</th>
              <th class="p-3 text-center">D</th>
              <th class="p-3 text-center">SG</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-700">
            <tr
              v-for="(team, i) in groupData.standings"
              :key="team.id"
              class="hover:bg-slate-700/30 transition-colors group cursor-pointer"
              @click="onTeamClick(team)"
            >
              <td class="p-3 text-center font-bold text-slate-300">
                {{ i + 1 }}º
              </td>
              <td class="p-3">
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
              <td class="p-3 text-center font-black text-white bg-slate-700/20">
                {{ team.points }}
              </td>
              <!-- Coluna "J" (jogos) apenas para copas -->
              <td v-if="showGroup" class="p-3 text-center text-slate-400">
                {{
                  team.win + team.draw + team.loss
                }}
              </td>
              <td class="p-3 text-center text-green-400">{{ team.win }}</td>
              <td class="p-3 text-center text-yellow-400">{{ team.draw }}</td>
              <td class="p-3 text-center text-red-400">{{ team.loss }}</td>
              <td
                class="p-3 text-center"
                :class="team.goalDifference > 0 ? 'text-green-400' : 'text-red-400'"
              >
                {{ team.goalDifference >= 0 ? '+' : '' }}{{ team.goalDifference }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>