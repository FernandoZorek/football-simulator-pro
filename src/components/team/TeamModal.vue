<!-- src/components/team/TeamModal.vue -->
<script setup lang="ts">
import { ref, computed } from 'vue';
import { getTeamSectorsWithOverall } from '../../core/engine/teamUtils';
import EditTeamModal from './EditTeamModal.vue';

const props = defineProps<{
  modelValue: boolean;
  team: any;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'update:team', value: any): void;
}>();

const close = () => {
  emit('update:modelValue', false);
};

const starters = computed(() => 
  props.team?.players.filter((p: any) => !p.isReserve) || []
);
const reserves = computed(() => 
  props.team?.players.filter((p: any) => p.isReserve) || []
);

const editingPlayer = ref<any>(null);
const editedPlayer = ref<any>({});
const isEditingTeam = ref(false);
const editedTeam = ref<any>({});
const playerToDelete = ref<string | null>(null);

const startEditingTeam = () => {
  isEditingTeam.value = true;
  editedTeam.value = { ...props.team };
  
  if (!editedTeam.value.venue) {
    editedTeam.value.venue = {
      name: '',
      city: '',
      address: '',
      capacity: 0,
      surface: 'grass',
      image: ''
    };
  }
};

const startEditing = (player: any) => {
  editingPlayer.value = player.id;
  editedPlayer.value = { ...player };
};

const saveEdit = () => {
  if (!editingPlayer.value) return;
  
  const updatedPlayers = props.team.players.map((p: any) => 
    p.id === editingPlayer.value ? editedPlayer.value : p
  );
  
  const updatedTeam = {
    ...props.team,
    players: updatedPlayers
  };
  
  emit('update:team', updatedTeam);
  editingPlayer.value = null;
  editedPlayer.value = {};
};

const cancelEdit = () => {
  editingPlayer.value = null;
  editedPlayer.value = {};
};

// Função para alternar status de reserva
const toggleReserveStatus = (playerId: string) => {
  const updatedPlayers = props.team.players.map((p: any) => {
    if (p.id === playerId) {
      return { ...p, isReserve: !p.isReserve };
    }
    return p;
  });
  
  const updatedTeam = {
    ...props.team,
    players: updatedPlayers
  };
  
  emit('update:team', updatedTeam);
};

const confirmDeletePlayer = (playerId: string) => {
  playerToDelete.value = playerId;
};

const deletePlayer = () => {
  if (!playerToDelete.value) return;
  
  const updatedPlayers = props.team.players.filter((p: any) => p.id !== playerToDelete.value);
  
  const updatedTeam = {
    ...props.team,
    players: updatedPlayers
  };
  
  emit('update:team', updatedTeam);
  playerToDelete.value = null;
};

const cancelDelete = () => {
  playerToDelete.value = null;
};

const teamStats = computed(() => {
  if (!props.team) return { overall: 0, sectors: { attack: 0, midfield: 0, defense: 0, goalkeeping: 0 } };
  return getTeamSectorsWithOverall(props.team);
});

const showEditTeamModal = ref(false);

const handleSaveTeam = (updatedTeam: any) => {
  emit('update:team', updatedTeam);
  showEditTeamModal.value = false;
};
</script>

<template>
  <teleport to="body" v-if="modelValue && team">
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      @click="close"
    >
      <div
        class="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
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
            <span class="text-slate-400">
              {{ team.formation }} • {{ starters.length }} titulares • {{ reserves.length }} reservas
            </span>
          </div>
          <div class="ml-auto text-center">
            <div class="bg-slate-900 border-l pl-6 border-r pr-6 border-slate-700 flex items-start gap-6">
              <div class="ml-auto text-center">
                <div class="pt-6 text-2xl font-bold text-yellow-400">{{ teamStats.overall }}</div>
                <div class="text-xs text-slate-500">Overall</div>
              </div>
              <div class="grid grid-cols-2 gap-3 bg-slate-900/50 rounded-lg">
                <div class="text-center">
                  <div class="font-bold text-red-400">{{ Math.round(teamStats.sectors.attack) }}</div>
                  <div class="text-[10px] text-slate-500">ATAQUE</div>
                </div>
                <div class="text-center">
                  <div class="font-bold text-blue-400">{{ Math.round(teamStats.sectors.midfield) }}</div>
                  <div class="text-[10px] text-slate-500">MEIO</div>
                </div>
                <div class="text-center">
                  <div class="font-bold text-green-400">{{ Math.round(teamStats.sectors.defense) }}</div>
                  <div class="text-[10px] text-slate-500">DEFESA</div>
                </div>
                <div class="text-center">
                  <div class="font-bold text-purple-400">{{ Math.round(teamStats.sectors.goalkeeping) }}</div>
                  <div class="text-[10px] text-slate-500">GOLEIRO</div>
                </div>
              </div>
            </div>
          </div>
          <button
            @click="close"
            class="ml-auto text-slate-400 hover:text-white text-2xl font-bold"
          >
            &times;
          </button>
        </div>

        <div class="flex flex-col md:flex-row flex-1 overflow-hidden">
          <!-- Titulares -->
          <div class="w-full md:w-1/2 border-r border-slate-700 overflow-y-auto p-4">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-bold text-slate-300 uppercase text-sm">Titulares ({{ starters.length }})</h3>
              <span class="px-2 py-1 bg-green-600/20 text-green-400 text-xs rounded-full">
                {{ starters.length }}/11
              </span>
            </div>
            <div class="space-y-3">
              <div
                v-for="player in starters"
                :key="player.id"
                class="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-700/50 group"
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
                <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    @click="startEditing(player)"
                    class="p-1 text-blue-400 hover:text-blue-300 rounded"
                    title="Editar jogador"
                  >
                    ✏️
                  </button>
                  <button
                    @click="toggleReserveStatus(player.id)"
                    class="p-1 text-amber-400 hover:text-amber-300 rounded"
                    title="Mover para reservas"
                  >
                    ⬇️
                  </button>
                  <!-- ✅ Botão de exclusão -->
                  <button
                    @click="confirmDeletePlayer(player.id)"
                    class="p-1 text-red-400 hover:text-red-300 rounded"
                    title="Excluir jogador"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Reservas -->
          <div class="w-full md:w-1/2 border-r border-slate-700 overflow-y-auto p-4">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-bold text-slate-300 uppercase text-sm">Reservas ({{ reserves.length }})</h3>
            </div>
            <div class="space-y-3">
              <div
                v-for="player in reserves"
                :key="player.id"
                class="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-700/50 group"
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
                <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    @click="startEditing(player)"
                    class="p-1 text-blue-400 hover:text-blue-300 rounded"
                    title="Editar jogador"
                  >
                    ✏️
                  </button>
                  <button
                    @click="toggleReserveStatus(player.id)"
                    class="p-1 text-green-400 hover:text-green-300 rounded"
                    title="Mover para titulares"
                  >
                    ⬆️
                  </button>
                  <!-- ✅ Botão de exclusão -->
                  <button
                    @click="confirmDeletePlayer(player.id)"
                    class="p-1 text-red-400 hover:text-red-300 rounded"
                    title="Excluir jogador"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Estádio -->
          <div v-if="team.venue" class="w-full md:w-1/3 p-4 overflow-y-auto">
            <div class="flex justify-between items-center mb-4">
              <h3 class="font-bold text-slate-300 uppercase text-sm">Estádio</h3>
              <button
                @click="showEditTeamModal = true"
                class="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
              >
                ✏️ Editar Time
              </button>
            </div>
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
                  {{ team.venue.capacity ? team.venue.capacity.toLocaleString('pt-BR') : 'N/A' }}
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

          <div v-else class="w-full md:w-1/3 p-4 flex items-center justify-center">
            <div class="text-center">
              <p class="text-slate-500 mb-3">Nenhum estádio registrado.</p>
              <button
                @click="startEditingTeam"
                class="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1 mx-auto"
              >
                ✏️ Adicionar Estádio
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de Edição de Jogador -->
    <div v-if="editingPlayer" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div class="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-md p-6" @click.stop>
        <h3 class="text-xl font-bold text-white mb-4">Editar Jogador</h3>
        
        <div class="space-y-4">
          <div>
            <label class="block text-slate-400 text-sm mb-1">Nome</label>
            <input
              v-model="editedPlayer.name"
              type="text"
              class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-slate-400 text-sm mb-1">Idade</label>
              <input
                v-model.number="editedPlayer.age"
                type="number"
                min="16"
                max="45"
                class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label class="block text-slate-400 text-sm mb-1">Overall</label>
              <input
                v-model.number="editedPlayer.overall"
                type="number"
                min="50"
                max="99"
                class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div>
            <label class="block text-slate-400 text-sm mb-1">Posição</label>
            <select
              v-model="editedPlayer.position"
              class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="GK">Goleiro (GK)</option>
              <option value="CB">Zagueiro (CB)</option>
              <option value="LB">Lateral Esquerdo (LB)</option>
              <option value="RB">Lateral Direito (RB)</option>
              <option value="CDM">Volante (CDM)</option>
              <option value="CM">Meia Central (CM)</option>
              <option value="CAM">Meia Atacante (CAM)</option>
              <option value="ST">Centroavante (ST)</option>
              <option value="LW">Ponta Esquerda (LW)</option>
              <option value="RW">Ponta Direita (RW)</option>
            </select>
          </div>
          
          <div>
            <label class="block text-slate-400 text-sm mb-1">Energia</label>
            <input
              v-model.number="editedPlayer.energy"
              type="number"
              min="0"
              max="100"
              class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <div class="flex gap-3 mt-6">
          <button
            @click="saveEdit"
            class="flex-1 bg-green-600 hover:bg-green-500 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Salvar
          </button>
          <button
            @click="cancelEdit"
            class="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>

    <!-- Modal de Edição do Time -->
      <EditTeamModal 
        v-model="showEditTeamModal"
        :team="team"
        @save-team="handleSaveTeam"
      />

    <!-- Modal de Confirmação de Exclusão -->
    <div v-if="playerToDelete" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div class="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-md p-6" @click.stop>
        <h3 class="text-xl font-bold text-white mb-4">Confirmar Exclusão</h3>
        <p class="text-slate-300 mb-6">
          Tem certeza que deseja excluir este jogador? Esta ação não pode ser desfeita.
        </p>
        <div class="flex gap-3">
          <button
            @click="deletePlayer"
            class="flex-1 bg-red-600 hover:bg-red-500 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Excluir
          </button>
          <button
            @click="cancelDelete"
            class="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  </teleport>
</template>