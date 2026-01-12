# ⚽ Football Simulator 2026

Simulador tático de futebol focado em profundidade estatística, permitindo a criação de campeonatos personalizados, gestão de elencos e simulações baseadas em dados reais.

---

![ScreenShot](https://repository-images.githubusercontent.com/1132846400/e9caa823-d729-4bb9-ba32-11ba94260f63)

## 📂 Estrutura do Projeto

```
bash
src/
├── core/
│   ├── data/           # Dados dos campeonatos e times
│   │   ├── championships/
│   │   └── teams/
│   ├── engine/         # Lógica de simulação (Simulator Engine)
│   └── types.ts        # Definições de Tipos TypeScript
├── services/           # Carregamento de dados e geração de fixtures
├── store/              # Estado global (Pinia)
├── components/         # Componentes de UI reutilizáveis
├── views/              # Telas principais (Liga, Copa, Dashboard)
├── router/             # Configuração de rotas Vue Router
└── ...
```

---

## ⚙️ Configuração Técnica

### 🌐 Variáveis de Ambiente (.env)
O simulador é altamente customizável. De acordo com as diretrizes do projeto, você deve utilizar variáveis de ambiente para definir provedores e versões de IA. Copie o arquivo .env.example para .env e ajuste:
```
bash
| Variável | Padrão | Descrição |
| :--- | :--- | :--- |
| VITE_LLM_PROVIDER | openai | Provedor de LLM (ex: openai, anthropic, local) |
| VITE_LLM_VERSION | gpt-4o | Versão do modelo para narração/análise |
| VITE_HOME_ADVANTAGE | 1.10 | Bônus ofensivo para jogos em casa (1.10 = +10%) |
| VITE_RANDOM_FACTOR | 0.20 | Fator de aleatoriedade nos gols (0.20 = ±20%) |
| VITE_MIN_GOAL_BASE | 0.8 | Limiar mínimo para gols (raridade de marcação) |
| VITE_MAX_GOAL_BASE | 1.5 | Limiar para alta probabilidade de goleada |
| VITE_TREND_IMPACT | 0.05 | Influência da tendência (momentum) nos gols |
```
---

## 🛠️ Modelagem de Dados

### 1. Configuração de Times (src/core/data/teams/*.json)
```
bash
| Campo | Descrição | Dica de Realismo |
| :--- | :--- | :--- |
| formation | Formação tática | Use formações reais (ex: 4-3-3, 4-2-3-1) |
| players[].overall | Qualidade (65–90) | Baseie em ratings reais (ex: Craque = 90) |
| metadata.trend | Tendência (0.7–1.3) | Em ascensão: >1.0; em crise: <1.0 |
| metadata.h2hBias | Viés contra rivais | Ex: Fla vs Pal -> "pal": 1.2 (vantagem >1.0), desvantage <1.0, usar entre 0.8 e 1.3 |
| venue.capacity | Capacidade estádio | Afeta atmosfera e bônus futuro |
```

### 2. Configuração de Campeonatos (src/core/data/championships/*.json)
Exemplo: brasileirao-2026.json.
IMPORTANTE: Todos os teamIds devem corresponder exatamente aos nomes dos arquivos na pasta de times.

---

## 🧠 Simulador: Como Funciona

A lógica de simulação em src/core/engine/simulator.ts processa cada partida considerando:

* Setores do Time: Cálculo de força por ataque, meio, defesa e gol com base na formação.
* Vantagem Local: Aplicação do bônus configurado em VITE_HOME_ADVANTAGE.
* H2H & Momentum: Cruzamento do viés histórico (h2hBias) e fase atual (trend).
* Aleatoriedade: O fator randômico garante que o favorito nem sempre vença.
* Goleadores: Atribuição de gols a jogadores reais com base no overall e posição.

---

## 🏗️ Como Adicionar um Novo Campeonato

1. Crie os arquivos JSON dos times em src/core/data/teams/
2. Crie o arquivo do campeonato em src/core/data/championships/
3. Inclua todos os teamIds no arquivo do campeonato.
4. Recarregue a página: o novo campeonato aparecerá na tela inicial.

Dica: Use o comando abaixo para buscar times via Football-API e gerar arquivos automaticamente (requer chave de API no .env).
```
bash
 tsx scripts/fetch-championships.ts
 ```

---

## 📈 Dicas para Mais Realismo

* Elenco: Inclua 18 a 23 jogadores por time, usando isReserve: true para reservas.
* Overall: Goleiros: +2; Atacantes de elite: +3; Jogadores >35 anos: -5.
* Formações: O sistema aplica modificadores (ex: 3-5-2 fortalece o meio-campo).
* Tendência: Times em má fase: trend: 0.75; em boa fase: trend: 1.15.

---

## ▶️ Como Executar

Comandos de terminal para inicialização:
```
bash
npm install
cp .env.example .env
npm run dev
npm run build
```
---

## 📜 Licença e Créditos

* Licença: MIT
* Dados: Football-API (dados reais de times e jogadores)
* Ícones: Lucide
* Base Tecnológica: Vue.js, Pinia e Tailwind CSS

---
⚽ Bom jogo! Simule o futuro do futebol com profundidade tática e estatística.