// src/main.ts
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';

import { router } from './router'; // 👈 importa o router
import App from './App.vue';      // 👈 agora App.vue é o container com <router-view />
import './style.css';

const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);

const app = createApp(App);

app.use(pinia);
app.use(router); // 👈 adiciona o router
app.mount('#app');