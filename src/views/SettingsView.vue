<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Settings, Sliders, Trophy, Users, Database, ArrowLeft, Save, RotateCcw } from 'lucide-vue-next';
import { useTeamsStore } from '../store/teams';

const router = useRouter();
const teamsStore = useTeamsStore();

// Configurações do motor de simulação
const simulationConfig = ref({
  homeAdvantage: parseFloat(localStorage.getItem('homeAdvantage') || '1.10'),
  randomness: parseFloat(localStorage.getItem('randomness') || '0.20'),
  minGoals: parseInt(localStorage.getItem('minGoals') || '0'),
  maxGoals: parseInt(localStorage.getItem('maxGoals') || '5'),
  formationImpact: parseFloat(localStorage.getItem('formationImpact') || '0.10'),
  trendImpact: parseFloat(localStorage.getItem('trendImpact') || '0.05'),
});

// Regras de competição
const competitionRules = ref({
  pointsWin: parseInt(localStorage.getItem('pointsWin') || '3'),
  pointsDraw: parseInt(localStorage.getItem('pointsDraw') || '1'),
  hasPlayoffs: localStorage.getItem('hasPlayoffs') === 'true',
  relegationZones: parseInt(localStorage.getItem('relegationZones') || '4'),
});

// Preferências do sistema
const systemPreferences = ref({
  language: localStorage.getItem('language') || 'pt-BR',
  darkMode: localStorage.getItem('darkMode') !== 'false',
  autoSave: localStorage.getItem('autoSave') !== 'false',
  confirmActions: localStorage.getItem('confirmActions') !== 'false',
});

const stats = ref({
  totalTeams: 0,
  totalPlayers: 0,
  lastBackup: localStorage.getItem('lastBackup') || 'Nunca'
});

onMounted(() => {
  updateStats();
});

const updateStats = () => {
  stats.value.totalTeams = teamsStore.teams.length;
  stats.value.totalPlayers = teamsStore.teams.reduce((total, team) => total + team.players.length, 0);
};

// Salva configuração
const saveConfig = () => {
  // Motor de simulação
  localStorage.setItem('homeAdvantage', simulationConfig.value.homeAdvantage.toString());
  localStorage.setItem('randomness', simulationConfig.value.randomness.toString());
  localStorage.setItem('minGoalBase', simulationConfig.value.minGoals.toString());
  localStorage.setItem('maxGoalBase', simulationConfig.value.maxGoals.toString());
  localStorage.setItem('formationImpact', '0.10'); // ou torne configurável
  localStorage.setItem('trendImpact', '0.05'); // ou torne configurável
  
  // Regras de competição
  localStorage.setItem('pointsWin', competitionRules.value.pointsWin.toString());
  localStorage.setItem('pointsDraw', competitionRules.value.pointsDraw.toString());
  localStorage.setItem('hasPlayoffs', competitionRules.value.hasPlayoffs.toString());
  localStorage.setItem('relegationZones', competitionRules.value.relegationZones.toString());
  
  // Preferências
  localStorage.setItem('language', systemPreferences.value.language);
  localStorage.setItem('darkMode', systemPreferences.value.darkMode.toString());
  localStorage.setItem('autoSave', systemPreferences.value.autoSave.toString());
  localStorage.setItem('confirmActions', systemPreferences.value.confirmActions.toString());
  
  alert('✅ Configurações salvas com sucesso!');
};

const resetConfig = () => {
  if (confirm('⚠️ Deseja restaurar todas as configurações para os valores padrão?')) {
    simulationConfig.value = {
      homeAdvantage: 1.10,
      randomness: 0.20,
      minGoals: 0,
      maxGoals: 5,
    };
    
    competitionRules.value = {
      pointsWin: 3,
      pointsDraw: 1,
      hasPlayoffs: false,
      relegationZones: 4,
    };
    
    systemPreferences.value = {
      language: 'pt-BR',
      darkMode: true,
      autoSave: true,
      confirmActions: true,
    };
    
    localStorage.removeItem('homeAdvantage');
    localStorage.removeItem('randomness');
    localStorage.removeItem('minGoals');
    localStorage.removeItem('maxGoals');
    localStorage.removeItem('pointsWin');
    localStorage.removeItem('pointsDraw');
    localStorage.removeItem('hasPlayoffs');
    localStorage.removeItem('relegationZones');
    localStorage.removeItem('language');
    localStorage.removeItem('darkMode');
    localStorage.removeItem('autoSave');
    localStorage.removeItem('confirmActions');
    
    alert('✅ Configurações restauradas para os valores padrão!');
  }
};

const goBack = () => {
  router.push('/');
};

const applyToSimulator = () => {
  (window as any).VITE_HOME_ADVANTAGE = simulationConfig.value.homeAdvantage;
  (window as any).VITE_RANDOMNESS = simulationConfig.value.randomness;
  
  alert('✅ Configurações aplicadas ao motor de simulação!');
};
</script>

<template>
  <div class="min-h-screen bg-slate-900 text-slate-100">    
    <NavigationHeader />
    <div class="max-w-6xl mx-auto">
      <!-- Header -->
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div class="flex items-center gap-4">
          <button 
            @click="goBack"
            class="md:hidden p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            <ArrowLeft class="w-5 h-5" />
          </button>
          <div class="bg-purple-600 p-3 rounded-2xl shadow-lg shadow-purple-500/20">
            <Settings class="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 class="text-3xl font-black uppercase tracking-tighter">Configurações</h1>
            <p class="text-slate-400 mt-1">Ajuste parâmetros do sistema e preferências</p>
          </div>
        </div>
        
        <div class="flex gap-3">
          <button
            @click="saveConfig"
            class="bg-green-600 hover:bg-green-500 px-4 py-2 rounded-lg text-white font-medium flex items-center gap-2 transition-colors"
          >
            <Save class="w-4 h-4" />
            Salvar Tudo
          </button>
          <button
            @click="resetConfig"
            class="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg text-white font-medium flex items-center gap-2 transition-colors"
          >
            <RotateCcw class="w-4 h-4" />
            Restaurar Padrões
          </button>
        </div>
      </div>

      <!-- System Stats -->
      <div class="bg-slate-800 rounded-2xl border border-slate-700 p-6 mb-8">
        <h2 class="text-xl font-bold mb-4 flex items-center gap-2">
          <Database class="w-5 h-5 text-amber-400" />
          Estatísticas do Sistema
        </h2>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="bg-slate-900/50 p-4 rounded-lg text-center">
            <div class="text-2xl font-bold text-blue-400">{{ stats.totalTeams }}</div>
            <div class="text-sm text-slate-400">Times</div>
          </div>
          <div class="bg-slate-900/50 p-4 rounded-lg text-center">
            <div class="text-2xl font-bold text-green-400">{{ stats.totalPlayers }}</div>
            <div class="text-sm text-slate-400">Jogadores</div>
          </div>
          <div class="bg-slate-900/50 p-4 rounded-lg text-center">
            <div class="text-sm font-bold text-amber-400">{{ stats.lastBackup }}</div>
            <div class="text-sm text-slate-400">Último Backup</div>
          </div>
          <div class="bg-slate-900/50 p-4 rounded-lg text-center">
            <div class="text-sm font-bold text-purple-400">v1.0</div>
            <div class="text-sm text-slate-400">Versão</div>
          </div>
        </div>
      </div>

      <!-- Motor de Simulação -->
      <div class="bg-slate-800 rounded-2xl border border-slate-700 p-6 mb-8">
        <h2 class="text-xl font-bold mb-4 flex items-center gap-2">
          <Sliders class="w-5 h-5 text-blue-400" />
          Motor de Simulação
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label class="block text-sm font-medium text-slate-300 mb-2">
              Vantagem em Casa
              <span class="text-slate-500 text-xs ml-2">({{ simulationConfig.homeAdvantage }})</span>
            </label>
            <input
              v-model.number="simulationConfig.homeAdvantage"
              type="range"
              min="1.0"
              max="1.5"
              step="0.01"
              class="w-full"
            />
            <p class="text-xs text-slate-500 mt-1">Multiplicador para times jogando em casa</p>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-slate-300 mb-2">
              Fator de Aleatoriedade
              <span class="text-slate-500 text-xs ml-2">({{ simulationConfig.randomness }})</span>
            </label>
            <input
              v-model.number="simulationConfig.randomness"
              type="range"
              min="0.0"
              max="0.5"
              step="0.01"
              class="w-full"
            />
            <p class="text-xs text-slate-500 mt-1">Quanto mais alto, mais imprevisível</p>
          </div>


        <!-- Impacto da Formação -->
        <div>
        <label class="block text-sm font-medium text-slate-300 mb-2">
            Impacto da Formação
            <span class="text-slate-500 text-xs ml-2">({{ simulationConfig.formationImpact }})</span>
        </label>
        <input
            v-model.number="simulationConfig.formationImpact"
            type="range"
            min="0.0"
            max="1.0"
            step="0.01"
            class="w-full"
        />
        <p class="text-xs text-slate-500 mt-1">Quanto mais alto, maior o efeito da formação tática</p>
        </div>

        <!-- Impacto da Tendência -->
        <div>
        <label class="block text-sm font-medium text-slate-300 mb-2">
            Impacto da Tendência
            <span class="text-slate-500 text-xs ml-2">({{ simulationConfig.trendImpact }})</span>
        </label>
        <input
            v-model.number="simulationConfig.trendImpact"
            type="range"
            min="0.0"
            max="0.2"
            step="0.01"
            class="w-full"
        />
        <p class="text-xs text-slate-500 mt-1">Influência do momento do time (crise/auge)</p>
        </div>
          
          <!-- Limite Mínimo de Eficiência -->
        <div>
        <label class="block text-sm font-medium text-slate-300 mb-2">
            Eficiência Mínima para Gols
            <span class="text-slate-500 text-xs ml-2">({{ simulationConfig.minGoals }})</span>
        </label>
        <input
            v-model.number="simulationConfig.minGoals"
            type="range"
            min="0.1"
            max="1.2"
            step="0.05"
            class="w-full"
        />
        <p class="text-xs text-slate-500 mt-1">
            Limite mínimo de eficiência para times marcarem gols. 
            Valores mais baixos = mais jogos com poucos gols (0-2). 
            Padrão: 0.8
        </p>
        </div>

        <!-- Limite Máximo de Eficiência -->
        <div>
        <label class="block text-sm font-medium text-slate-300 mb-2">
            Eficiência Máxima para Goleadas
            <span class="text-slate-500 text-xs ml-2">({{ simulationConfig.maxGoals }})</span>
        </label>
        <input
            v-model.number="simulationConfig.maxGoals"
            type="range"
            min="1.0"
            max="2.5"
            step="0.05"
            class="w-full"
        />
        <p class="text-xs text-slate-500 mt-1">
            Limite máximo de eficiência para times marcarem muitos gols. 
            Valores mais altos = mais goleadas e partidas com 3+ gols. 
            Padrão: 1.5
        </p>
        </div>
        </div>
      </div>

      

      <!-- Regras de Competição -->
      <div class="bg-slate-800 rounded-2xl border border-slate-700 p-6 mb-8">
        <h2 class="text-xl font-bold mb-4 flex items-center gap-2">
          <Trophy class="w-5 h-5 text-yellow-400" />
          Regras de Competição
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label class="block text-sm font-medium text-slate-300 mb-2">
              Pontos por Vitória
            </label>
            <input
              v-model.number="competitionRules.pointsWin"
              type="number"
              min="1"
              max="10"
              class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-slate-300 mb-2">
              Pontos por Empate
            </label>
            <input
              v-model.number="competitionRules.pointsDraw"
              type="number"
              min="0"
              max="5"
              class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-slate-300 mb-2">
              Zonas de Rebaixamento
            </label>
            <input
              v-model.number="competitionRules.relegationZones"
              type="number"
              min="0"
              max="10"
              class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
            />
            <p class="text-xs text-slate-500 mt-1">Número de times rebaixados</p>
          </div>
          
          <div class="flex items-center gap-3">
            <input
              v-model="competitionRules.hasPlayoffs"
              type="checkbox"
              id="playoffs"
              class="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
            />
            <label for="playoffs" class="text-sm font-medium text-slate-300">
              Ativar Playoffs
            </label>
          </div>
        </div>
      </div>

      <!-- Preferências do Sistema -->
      <div class="bg-slate-800 rounded-2xl border border-slate-700 p-6">
        <h2 class="text-xl font-bold mb-4 flex items-center gap-2">
          <Users class="w-5 h-5 text-green-400" />
          Preferências do Sistema
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label class="block text-sm font-medium text-slate-300 mb-2">
              Idioma
            </label>
            <select
              v-model="systemPreferences.language"
              class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
            >
              <option value="pt-BR">Português (BR)</option>
              <option value="en-US">English (US)</option>
              <option value="es-ES">Español (ES)</option>
            </select>
          </div>
          
          <div class="flex items-center gap-3">
            <input
              v-model="systemPreferences.darkMode"
              type="checkbox"
              id="darkMode"
              class="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
            />
            <label for="darkMode" class="text-sm font-medium text-slate-300">
              Modo Escuro
            </label>
          </div>
          
          <div class="flex items-center gap-3">
            <input
              v-model="systemPreferences.autoSave"
              type="checkbox"
              id="autoSave"
              class="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
            />
            <label for="autoSave" class="text-sm font-medium text-slate-300">
              Salvar Automaticamente
            </label>
          </div>
          
          <div class="flex items-center gap-3">
            <input
              v-model="systemPreferences.confirmActions"
              type="checkbox"
              id="confirmActions"
              class="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
            />
            <label for="confirmActions" class="text-sm font-medium text-slate-300">
              Confirmar Ações Importantes
            </label>
          </div>
        </div>
      </div>

      <!-- Botões finais -->
      <div class="flex gap-3 mt-8 justify-end">
        <button
          @click="applyToSimulator"
          class="bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-lg text-white font-medium flex items-center gap-2 transition-colors"
        >
          <Sliders class="w-4 h-4" />
          Aplicar ao Simulador
        </button>
        <button
          @click="saveConfig"
          class="bg-green-600 hover:bg-green-500 px-6 py-3 rounded-lg text-white font-medium flex items-center gap-2 transition-colors"
        >
          <Save class="w-4 h-4" />
          Salvar Todas Configurações
        </button>
      </div>
    </div>
  </div>
</template>