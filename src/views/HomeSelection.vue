<!-- src/views/HomeSelection.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import NavigationHeader from '../components/NavigationHeader.vue';
import { listChampionships } from '../services/dataLoader';
import { Trophy, Users, Settings, Database, Plus, Search } from 'lucide-vue-next';

interface ChampionshipOption {
  id: string;
  name: string;
  season: string;
  type: 'liga' | 'copa';
}

const championships = ref<ChampionshipOption[]>([]);
const router = useRouter();

onMounted(async () => {
  const list = await listChampionships();
  championships.value = list as ChampionshipOption[];
});

</script>

<template>
  <div class="min-h-screen bg-slate-900 text-slate-100">    
    <NavigationHeader />
    <header class="text-center mb-12">
      <div class="flex justify-center mb-6">
        <div class="bg-blue-600 p-4 rounded-2xl shadow-lg shadow-blue-500/20">
          <Trophy class="w-12 h-12 text-white" />
        </div>
      </div>
      <h1 class="text-4xl md:text-5xl font-black uppercase tracking-tighter bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent">
        Football Simulator
      </h1>
      <p class="text-slate-400 mt-2 text-lg">Sistema de simulação tática e estatística de futebol</p>
    </header>
    <div class="max-w-6xl mx-auto">
      <!-- Main Actions Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        <!-- Card 1: Campeonatos -->
        <div 
          class="bg-slate-800 rounded-2xl border border-slate-700 p-6 hover:bg-slate-750 transition-all cursor-pointer group"
          @click="() => $router.push('/championships')"
        >
          <div class="flex items-center gap-4 mb-4">
            <div class="bg-blue-600/20 p-3 rounded-xl group-hover:bg-blue-600/30 transition-colors">
              <Trophy class="w-6 h-6 text-blue-400 group-hover:text-blue-300" />
            </div>
            <h2 class="text-xl font-bold">Campeonatos</h2>
          </div>
          <p class="text-slate-400 text-sm">
            Gerencie campeonatos existentes, crie novos ou edite configurações antes de simular
          </p>
          <div class="mt-4 flex items-center gap-2 text-blue-400 text-sm font-medium">
            <span>Ver todos</span>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
            </svg>
          </div>
        </div>

        <!-- Card 2: Times -->
        <div 
          class="bg-slate-800 rounded-2xl border border-slate-700 p-6 hover:bg-slate-750 transition-all cursor-pointer group"
          @click="() => $router.push('/teams')"
        >
          <div class="flex items-center gap-4 mb-4">
            <div class="bg-green-600/20 p-3 rounded-xl group-hover:bg-green-600/30 transition-colors">
              <Users class="w-6 h-6 text-green-400 group-hover:text-green-300" />
            </div>
            <h2 class="text-xl font-bold">Times</h2>
          </div>
          <p class="text-slate-400 text-sm">
            Explore todos os times disponíveis, visualize elencos completos e dados dos estádios
          </p>
          <div class="mt-4 flex items-center gap-2 text-green-400 text-sm font-medium">
            <span>Ver todos</span>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
            </svg>
          </div>
        </div>

        <!-- Card 3: Atletas -->
        <div 
          class="bg-slate-800 rounded-2xl border border-slate-700 p-6 hover:bg-slate-750 transition-all cursor-pointer group"
          @click="() => $router.push('/players')"
        >
          <div class="flex items-center gap-4 mb-4">
            <div class="bg-orange-600/20 p-3 rounded-xl group-hover:bg-orange-600/30 transition-colors">
              <Search class="w-6 h-6 text-orange-400 group-hover:text-orange-300" />
            </div>
            <h2 class="text-xl font-bold">Atletas</h2>
          </div>
          <p class="text-slate-400 text-sm">
            Gerencie e edite todos os jogadores dos times, ajustando overall, posição e atributos
          </p>
          <div class="mt-4 flex items-center gap-2 text-orange-400 text-sm font-medium">
            <span>Gerenciar</span>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
            </svg>
          </div>
        </div>

        <!-- Card 4: Base de Dados -->
        <div 
          class="bg-slate-800 rounded-2xl border border-slate-700 p-6 hover:bg-slate-750 transition-all cursor-pointer group"
          @click="() => $router.push('/database')"
        >
          <div class="flex items-center gap-4 mb-4">
            <div class="bg-amber-600/20 p-3 rounded-xl group-hover:bg-amber-600/30 transition-colors">
              <Database class="w-6 h-6 text-amber-400 group-hover:text-amber-300" />
            </div>
            <h2 class="text-xl font-bold">Base de Dados</h2>
          </div>
          <p class="text-slate-400 text-sm">
            Gerencie sua base de dados, atualize informações e verifique integridade dos registros
          </p>
          <div class="mt-4 flex items-center gap-2 text-amber-400 text-sm font-medium">
            <span>Explorar</span>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
            </svg>
          </div>
        </div>

        <!-- Card 5: Novo Campeonato -->
        <div 
          class="bg-slate-800 rounded-2xl border border-slate-700 p-6 hover:bg-slate-750 transition-all cursor-pointer group"
          @click="() => $router.push('/championships/new')"
        >
          <div class="flex items-center gap-4 mb-4">
            <div class="bg-emerald-600/20 p-3 rounded-xl group-hover:bg-emerald-600/30 transition-colors">
              <Plus class="w-6 h-6 text-emerald-400 group-hover:text-emerald-300" />
            </div>
            <h2 class="text-xl font-bold">Novo Campeonato</h2>
          </div>
          <p class="text-slate-400 text-sm">
            Crie um novo campeonato personalizado com suas próprias regras e participantes
          </p>
          <div class="mt-4 flex items-center gap-2 text-emerald-400 text-sm font-medium">
            <span>Criar</span>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
            </svg>
          </div>
        </div>

        <!-- Card 6: Configurações -->
        <div 
          class="bg-slate-800 rounded-2xl border border-slate-700 p-6 hover:bg-slate-750 transition-all cursor-pointer group"
          @click="() => $router.push('/settings')"
        >
          <div class="flex items-center gap-4 mb-4">
            <div class="bg-purple-600/20 p-3 rounded-xl group-hover:bg-purple-600/30 transition-colors">
              <Settings class="w-6 h-6 text-purple-400 group-hover:text-purple-300" />
            </div>
            <h2 class="text-xl font-bold">Configurações</h2>
          </div>
          <p class="text-slate-400 text-sm">
            Ajuste parâmetros do motor de simulação, regras de competição e preferências do sistema
          </p>
          <div class="mt-4 flex items-center gap-2 text-purple-400 text-sm font-medium">
            <span>Gerenciar</span>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
            </svg>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bg-slate-750 {
  background-color: #334155;
}
</style>