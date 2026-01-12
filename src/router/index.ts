// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router';
import HomeSelection from '../views/HomeSelection.vue';
import LigaChampionship from '../views/LigaChampionship.vue';
import CopaChampionship from '../views/CopaChampionship.vue';

const routes = [
  { path: '/', component: HomeSelection },
  { path: '/liga/:id', component: LigaChampionship, props: true },
  { path: '/copa/:id', component: CopaChampionship, props: true },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});