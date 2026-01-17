<!-- src/components/team/EditTeamModal.vue -->
<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';

const props = defineProps<{
  modelValue: boolean;
  team: any;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'save-team', team: any): void;
}>();

const closeModal = () => {
  emit('update:modelValue', false);
};

// ✅ Inicializa com valores padrão seguros
const editedTeam = ref({
  ...props.team,
  // ✅ Garante que metadata exista
  metadata: {
    h2hBias: props.team.metadata?.h2hBias || {},
    trend: props.team.metadata?.trend || 0,
    prestige: props.team.metadata?.prestige || 1
  },
  // ✅ Garante que venue exista
  venue: props.team.venue || {
    name: '',
    city: '',
    address: '',
    capacity: 0,
    surface: 'grass',
    image: ''
  }
});

// ✅ Opção de jogadores genéricos
const createGenericPlayers = ref(false);

// Validação
const isValid = ref(true);

// Atualiza validação
watch(() => editedTeam.value.name, () => {
  isValid.value = editedTeam.value.name.trim() !== '';
});

// Gera jogadores genéricos baseados na formação
const generateGenericPlayers = (formation: string) => {
  const players = [];
  let playerId = 1;
  
  const positions: Record<string, string[]> = {
    '4-3-3': ['GK', 'CB', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'ST', 'LW', 'RW'],
    '3-5-2': ['GK', 'CB', 'CB', 'CB', 'LWB', 'RWB', 'CDM', 'CM', 'CM', 'ST', 'ST'],
    '5-2-3': ['GK', 'CB', 'CB', 'CB', 'LWB', 'RWB', 'CDM', 'CDM', 'CAM', 'CAM', 'ST'],
    '4-4-2': ['GK', 'CB', 'CB', 'LB', 'RB', 'CM', 'CM', 'RM', 'LM', 'ST', 'ST'],
    '4-2-3-1': ['GK', 'CB', 'CB', 'LB', 'RB', 'CDM', 'CDM', 'CAM', 'LW', 'RW', 'ST'],
    '4-5-1': ['GK', 'CB', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CM', 'LM', 'RM', 'ST'],
    '5-3-2': ['GK', 'CB', 'CB', 'CB', 'LWB', 'RWB', 'CM', 'CM', 'CM', 'ST', 'ST'],
    '3-4-3': ['GK', 'CB', 'CB', 'CB', 'LWB', 'RWB', 'CM', 'CM', 'LW', 'RW', 'ST']
  };
  
  const teamPositions = positions[formation] || positions['4-3-3'];
  
  teamPositions.forEach(pos => {
    const playerName = `${editedTeam.value.name} ${pos} ${playerId}`;
    players.push({
      id: `${editedTeam.value.name.toLowerCase().replace(/\s+/g, '-')}-${pos.toLowerCase()}-${Date.now()}-${playerId}`,
      name: playerName,
      age: Math.floor(Math.random() * 10) + 18,
      position: pos,
      overall: Math.floor(Math.random() * 20) + 60,
      energy: 100,
      isReserve: false,
      photo: ''
    });
    playerId++;
  });
  
  return players;
};

// Salva as edições
const saveTeam = () => {
  if (!isValid.value) return;
  
  const updatedTeam = {
    ...editedTeam.value,
    // ✅ Garante estrutura correta para o simulador
    metadata: {
      h2hBias: editedTeam.value.metadata.h2hBias,
      trend: editedTeam.value.metadata.trend,
      prestige: editedTeam.value.metadata.prestige
    }
  };
  
  // ✅ Adiciona jogadores genéricos se solicitado
  if (createGenericPlayers.value) {
    updatedTeam.players = generateGenericPlayers(editedTeam.value.formation);
  }
  
  emit('save-team', updatedTeam);
  closeModal();
};
</script>

<template>
  <teleport to="body" v-if="modelValue">
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div 
        class="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-md max-h-[90vh] overflow-y-auto"
        @click.stop
      >
        <div class="p-6 border-b border-slate-700 sticky top-0 bg-slate-800/95 backdrop-blur-sm z-10">
          <h3 class="text-xl font-bold text-white">Editar Time</h3>
        </div>
        
        <div class="p-6">
          <div class="space-y-4">
            <div>
              <label class="block text-slate-400 text-sm mb-1">Nome do Time *</label>
              <input
                v-model="editedTeam.name"
                type="text"
                class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label class="block text-slate-400 text-sm mb-1">Sigla</label>
              <input
                v-model="editedTeam.shortName"
                type="text"
                class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label class="block text-slate-400 text-sm mb-1">Formação Tática</label>
              <select
                v-model="editedTeam.formation"
                class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="4-3-3">4-3-3</option>
                <option value="3-5-2">3-5-2</option>
                <option value="5-2-3">5-2-3</option>
                <option value="4-4-2">4-4-2</option>
                <option value="4-2-3-1">4-2-3-1</option>
                <option value="4-5-1">4-5-1</option>
                <option value="5-3-2">5-3-2</option>
                <option value="3-4-3">3-4-3</option>
              </select>
            </div>
            
            <div>
              <label class="block text-slate-400 text-sm mb-1">Logo URL</label>
              <input
                v-model="editedTeam.logo"
                type="text"
                placeholder="https://example.com/logo.png"
                class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <!-- ✅ CAMPOS DE METADATA -->
            <div class="border-t border-slate-700 pt-4">
            <h4 class="font-bold text-slate-300 mb-3">Configurações Avançadas</h4>
            
            <div class="grid grid-cols-2 gap-3">
            <div>
                <label class="block text-slate-400 text-sm mb-1">Tendência</label>
                <input
                v-model.number="editedTeam.metadata.trend"
                type="number"
                step="0.1"
                min="-2"
                max="2"
                class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>
            
            <div>
                <label class="block text-slate-400 text-sm mb-1">Prestígio</label>
                <input
                v-model.number="editedTeam.metadata.prestige"
                type="number"
                min="1"
                max="5"
                class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>
            </div>
        </div>
            
            <!-- ✅ CHECKBOX DE JOGADORES GENÉRICOS -->
            <div class="flex items-center gap-2">
              <input
                v-model="createGenericPlayers"
                type="checkbox"
                id="genericPlayers"
                class="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
              />
              <label for="genericPlayers" class="text-slate-300">
                Criar jogadores genéricos automaticamente
              </label>
            </div>
            
            <div class="border-t border-slate-700 pt-4">
              <h4 class="font-bold text-slate-300 mb-3">Estádio</h4>
              
              <div class="space-y-3">
                <div>
                  <label class="block text-slate-400 text-sm mb-1">Nome</label>
                  <input
                    v-model="editedTeam.venue.name"
                    type="text"
                    class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label class="block text-slate-400 text-sm mb-1">Cidade</label>
                  <input
                    v-model="editedTeam.venue.city"
                    type="text"
                    class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label class="block text-slate-400 text-sm mb-1">Endereço</label>
                  <input
                    v-model="editedTeam.venue.address"
                    type="text"
                    class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-slate-400 text-sm mb-1">Capacidade</label>
                    <input
                      v-model.number="editedTeam.venue.capacity"
                      type="number"
                      min="0"
                      class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label class="block text-slate-400 text-sm mb-1">Superfície</label>
                    <select
                      v-model="editedTeam.venue.surface"
                      class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="grass">Gramado Natural</option>
                      <option value="artificial">Gramado Sintético</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label class="block text-slate-400 text-sm mb-1">Imagem do Estádio URL</label>
                  <input
                    v-model="editedTeam.venue.image"
                    type="text"
                    placeholder="https://example.com/stadium.jpg"
                    class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div class="flex gap-3 pt-4">
            <button
              @click="saveTeam"
              :disabled="!isValid"
              class="flex-1 bg-green-600 hover:bg-green-500 disabled:bg-slate-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Salvar Time
            </button>
            <button
              @click="closeModal"
              class="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  </teleport>
</template>