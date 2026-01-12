<!-- src/components/TeamModal.vue -->
<script setup lang="ts">
defineProps<{
  modelValue: boolean;
  team: any;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

const close = () => {
  emit('update:modelValue', false);
};
</script>

<template>
  <teleport to="body" v-if="modelValue && team">
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      @click="close"
    >
      <div
        class="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        @click.stop
      >
        <div class="bg-slate-900 p-6 border-b border-slate-700 flex items-start gap-6">
          <div
            class="w-20 h-20 rounded-lg bg-white flex items-center justify-center overflow-hidden border border-slate-600"
          >
            <img
              v-if="team.logo"
              :src="team.logo"
              :alt="team.name"
              class="w-full h-full object-contain"
            />
          </div>
          <div>
            <h2 class="text-2xl font-bold text-white">{{ team.name }}</h2>
            <p class="text-slate-400">
              {{ team.formation }} •
              {{ team.players.filter(p => !p.isReserve).length }} titulares
            </p>
          </div>
          <button
            @click="close"
            class="ml-auto text-slate-400 hover:text-white text-2xl font-bold"
          >
            &times;
          </button>
        </div>

        <div class="flex flex-col md:flex-row flex-1 overflow-hidden">
          <div class="w-full md:w-1/2 border-r border-slate-700 overflow-y-auto p-4">
            <h3 class="font-bold text-slate-300 mb-4 uppercase text-sm">Elenco</h3>
            <div class="space-y-3">
              <div
                v-for="player in team.players"
                :key="player.id"
                class="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-700/50"
              >
                <div class="w-10 h-10 rounded-full bg-slate-700 overflow-hidden flex-shrink-0">
                  <img
                    v-if="player.photo"
                    :src="player.photo"
                    :alt="player.name"
                    class="w-full h-full object-cover"
                  />
                  <span
                    v-else
                    class="w-full h-full flex items-center justify-center text-[8px] text-white font-bold"
                  >
                    {{ player.name.charAt(0) }}
                  </span>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="font-medium text-white text-sm truncate">{{ player.name }}</p>
                  <p class="text-[10px] text-slate-500">
                    {{ player.position }} • {{ player.age }} anos • {{ player.overall }} OV
                  </p>
                </div>
                <span
                  v-if="player.isReserve"
                  class="bg-slate-700 text-[10px] px-2 py-0.5 rounded-full text-slate-400"
                >
                  Reserva
                </span>
              </div>
            </div>
          </div>

          <div v-if="team.venue" class="w-full md:w-1/2 p-4 overflow-y-auto">
            <h3 class="font-bold text-slate-300 mb-4 uppercase text-sm">Estádio</h3>
            <img
              v-if="team.venue.image"
              :src="team.venue.image"
              :alt="`Estádio ${team.venue.name}`"
              class="w-full h-32 object-cover rounded-lg mb-3"
            />
            <div>
              <h4 class="font-bold text-white text-lg">{{ team.venue.name }}</h4>
              <p class="text-slate-400">{{ team.venue.city }}</p>
              <p class="text-slate-500 text-sm mt-1">{{ team.venue.address }}</p>
            </div>
            <div class="grid grid-cols-2 gap-3 pt-4">
              <div class="bg-slate-900/50 p-3 rounded-lg">
                <p class="text-[10px] text-slate-500 uppercase">Capacidade</p>
                <p class="font-bold text-white text-sm">
                  {{ team.venue.capacity.toLocaleString('pt-BR') }}
                </p>
              </div>
              <div class="bg-slate-900/50 p-3 rounded-lg">
                <p class="text-[10px] text-slate-500 uppercase">Superfície</p>
                <p class="font-bold text-white text-sm">
                  {{ team.venue.surface === 'grass' ? 'Gramado natural' : 'Sintético' }}
                </p>
              </div>
            </div>
          </div>

          <div v-else class="w-full md:w-1/2 p-4 flex items-center justify-center">
            <p class="text-slate-500">Nenhum estádio registrado.</p>
          </div>
        </div>
      </div>
    </div>
  </teleport>
</template>