// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router';
import HomeSelection from '../views/HomeSelection.vue';
import ChampionshipSelection from '../views/ChampionshipSelection.vue';
import LigaChampionship from '../views/LigaChampionship.vue';
import CopaChampionship from '../views/CopaChampionship.vue';
import TeamsView from '../views/TeamsView.vue';
import SettingsView from '../views/SettingsView.vue';
import NewChampionshipView from '../views/NewChampionshipView.vue';
import PlayerManagementView from '../views/PlayerManagementView.vue';

const routes = [
  { path: '/', component: HomeSelection },
  { path: '/teams', component: TeamsView },
  { path: '/settings', component: SettingsView },
  { path: '/players', component: PlayerManagementView },
  { path: '/championships', component: ChampionshipSelection, props: true },
  { path: '/championships/new', component: NewChampionshipView },
  { path: '/championships/edit/:id', component: NewChampionshipView },
  { path: '/liga/:id', component: LigaChampionship, props: true },
  { path: '/copa/:id', component: CopaChampionship, props: true },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});