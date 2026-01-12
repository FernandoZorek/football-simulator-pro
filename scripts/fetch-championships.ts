// scripts/fetch-championships.ts
import dotenv from 'dotenv';
dotenv.config();

import { writeFile, mkdir, access } from 'fs/promises';
import { constants } from 'fs';
import { join } from 'path';

// Tipos
interface ApiFootballTeam {
  team: {
    id: number;
    name: string;
    code: string | null;
    logo: string;
  };
  venue: {
    id: number;
    name: string;
    address: string;
    city: string;
    capacity: number;
    surface: 'grass' | 'artificial';
    image: string;
  } | null;
}

interface ApiFootballPlayer {
  name: string;
  age: number | null;
  position: string;
  photo: string;
}

interface ApiFootballSquad {
  team: { id: number; name: string; logo: string };
  players: ApiFootballPlayer[];
}

// Configuração: liste os campeonatos que deseja baixar
const CHAMPIONSHIPS_TO_FETCH = [
  // NACIONAIS
  // { leagueId: 71, season: '2024', name: 'Campeonato Brasileiro Série A' },
  // { leagueId: 72, season: '2024', name: 'Campeonato Brasileiro Série B' },
  // { leagueId: 73, season: '2024', name: 'Campeonato Brasileiro Série C' },
  { leagueId: 74, season: '2025', name: 'Campeonato Brasileiro Série D' },
  { leagueId: 75, season: '2025', name: 'Copa do Brasil' },

  // ESTADUAIS
  { leagueId: 151, season: '2025', name: 'Campeonato Paranaense' },
  { leagueId: 142, season: '2025', name: 'Campeonato Paulista' },
  { leagueId: 139, season: '2025', name: 'Campeonato Carioca' },
];

const API_KEY = process.env.VITE_API_FOOTBALL_KEY;
if (!API_KEY) {
  throw new Error('❌ VITE_API_FOOTBALL_KEY não definida no ambiente.');
}

const BASE_URL = 'https://v3.football.api-sports.io';

// -----------------------
// Funções auxiliares
// -----------------------

async function fetchApi<T>(url: string): Promise<T> {
  console.log(`📡 Requisitando: ${url}`);
  const res = await fetch(`${BASE_URL}${url}`, {
    headers: {
      'x-apisports-key': API_KEY,
      'Accept': 'application/json',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Erro na API (${res.status}): ${text}`);
  }

  const data = await res.json();
  return data.response as T;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function mapPosition(position: string): string {
  const map: Record<string, string> = {
    "Goalkeeper": "GK",
    "Defender": "CB",
    "Midfielder": "CM",
    "Attacker": "ST",
    "Left-Back": "LB",
    "Right-Back": "RB",
    "Central Midfield": "CM",
    "Attacking Midfield": "CAM",
    "Left Winger": "LW",
    "Right Winger": "RW",
    "Centre-Forward": "ST",
    "Second Striker": "ST",
  };
  return map[position] || "CM";
}

function estimateOverall(age: number, position: string): number {
  let base = 75;
  if (age < 22) base += 5;
  if (age > 30) base -= 5;
  if (position === "GK") base += 2;
  if (["ST", "CAM", "RW", "LW"].includes(position)) base += 3;
  return Math.max(65, Math.min(90, Math.round(base)));
}

function estimateFormation(players: any[]): string {
  const pos = players.map((p: any) => p.position);
  const def = pos.filter((p: string) => ["CB", "LB", "RB"].includes(p)).length;
  const mid = pos.filter((p: string) => ["CM", "CAM", "RW", "LW"].includes(p)).length;
  const att = pos.filter((p: string) => ["ST"].includes(p)).length;

  if (def === 3 && mid === 5 && att === 2) return "3-5-2";
  if (def === 4 && mid === 4 && att === 2) return "4-4-2";
  if (def === 4 && mid === 2 && att === 3) return "4-2-3-1";
  return "4-3-3";
}

// -----------------------
// Função principal
// -----------------------

async function fetchChampionship(leagueId: number, season: string, name: string) {
  console.log(`\n📥 Baixando campeonato: ${name} (${season}) - Liga ID: ${leagueId}`);

  const teams: ApiFootballTeam[] = await fetchApi(`/teams?league=${leagueId}&season=${season}`);

  if (!teams.length) {
    console.warn(`⚠️ Nenhum time encontrado para liga ${leagueId}, temporada ${season}`);
    return;
  }

  const teamOutputDir = join(process.cwd(), 'src', 'core', 'data', 'teams');
  await mkdir(teamOutputDir, { recursive: true });

  const teamIds: number[] = [];

  for (let i = 0; i < teams.length; i++) {
    const teamEntry = teams[i];
    const { id: teamId, name: teamName, code, logo } = teamEntry.team;
    const venue = teamEntry.venue;

    // ✅ Verifica se o time já foi baixado
    const teamPath = join(teamOutputDir, `${teamId}.json`);
    let teamExists = false;
    try {
      await access(teamPath, constants.F_OK);
      teamExists = true;
      console.log(`⏭️  Time já existe: ${teamName} (${teamId})`);
    } catch {
      // Arquivo não existe → prossegue com download
    }

    if (teamExists) {
      teamIds.push(teamId);
      continue;
    }

    // ⏳ Respeita o limite de taxa da API (1 req/s)
    if (i > 0) {
      console.log(`⏳ Aguardando 6s (rate limit)...`);
      await sleep(6100);
    }

    // Dentro do loop de times, após verificar se já existe...

    try {
      const squadList: ApiFootballSquad[] = await fetchApi(`/players/squads?team=${teamId}`);
      let players: any[] = [];

      if (!squadList || squadList.length === 0 || !squadList[0]?.players?.length) {
        console.warn(`⚠️ Elenco vazio para time ID ${teamId} (${teamName}). Gerando dados mocados.`);
        players = generateMockPlayers(teamId, teamName);
      } else {
        const squad = squadList[0];
        players = squad.players.map((p, idx) => {
          const cleanName = p.name
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9]/g, '')
            .toLowerCase()
            .substring(0, 10) || 'player';

          const playerId = `${teamId}-${cleanName}`;

          return {
            id: playerId,
            name: p.name,
            age: p.age || 25,
            position: mapPosition(p.position),
            overall: estimateOverall(p.age || 25, p.position),
            energy: 90,
            isReserve: idx >= 11,
            photo: p.photo?.trim() || undefined,
          };
        });
      }

      const teamCode = (code || teamName.substring(0, 3)).toUpperCase();

      const teamData = {
        id: teamId.toString(),
        name: teamName,
        shortName: teamCode,
        colors: { primary: "#333333", secondary: "#ffffff" },
        formation: estimateFormation(players),
        metadata: {
          h2hBias: {},
          trend: Math.random() * 0.5 + 0.75,
          prestige: 4,
        },
        logo: logo?.trim() || undefined,
        venue: venue ? {
          id: venue.id,
          name: venue.name,
          address: venue.address,
          city: venue.city,
          capacity: venue.capacity,
          surface: venue.surface,
          image: venue?.image?.trim() || undefined,
        } : undefined,
        players,
      };

      await writeFile(teamPath, JSON.stringify(teamData, null, 2), 'utf-8');
      console.log(`✅ Salvo time: ${teamName} → ${teamId}.json (${players.length} jogadores)`);
      teamIds.push(teamId);
    } catch (err) {
      // ❌ Se falhar total, cria time com dados mocados
      console.error(`❌ Erro ao baixar elenco de ${teamName}. Criando com dados padrão.`);
      const mockPlayers = generateMockPlayers(teamId, teamName);
      const teamCode = (code || teamName.substring(0, 3)).toUpperCase();

      const teamData = {
        id: teamId.toString(),
        name: teamName,
        shortName: teamCode,
        colors: { primary: "#333333", secondary: "#ffffff" },
        formation: "4-3-3",
        metadata: {
          h2hBias: {},
          trend: 0.8,
          prestige: 3,
        },
        logo: logo?.trim() || undefined,
        venue: venue ? {
          id: venue.id,
          name: venue.name,
          address: venue.address,
          city: venue.city,
          capacity: venue.capacity,
          surface: venue.surface,
          image: venue?.image?.trim() || undefined,
        } : undefined,
        players: mockPlayers,
      };

      await writeFile(teamPath, JSON.stringify(teamData, null, 2), 'utf-8');
      console.log(`✅ Salvo time com dados MOCKADOS: ${teamName} → ${teamId}.json`);
      teamIds.push(teamId);
    }
  }

  // Salva o arquivo do campeonato
  const championshipData = {
    id: `${leagueId}-${season}`,
    name,
    season,
    teamIds: teamIds.map(id => id.toString()),
    settings: {
      pointsWin: 3,
      pointsDraw: 1,
      hasPlayoffs: false,
    },
  };

  const champOutputDir = join(process.cwd(), 'src', 'core', 'data', 'championships');
  await mkdir(champOutputDir, { recursive: true });
  const champPath = join(champOutputDir, `${leagueId}-${season}.json`);
  await writeFile(champPath, JSON.stringify(championshipData, null, 2), 'utf-8');

  console.log(`\n🎉 Campeonato salvo: ${champPath}`);
}

// -----------------------
// Execução
// -----------------------

async function main() {
  for (const champ of CHAMPIONSHIPS_TO_FETCH) {
    await fetchChampionship(champ.leagueId, champ.season, champ.name);
    console.log('\n' + '='.repeat(60) + '\n');
  }
  console.log('✅ Todos os campeonatos processados!');
}

main().catch(err => {
  console.error('💥 Erro fatal:', err);
  process.exit(1);
});

function generateMockPlayers(teamId: number, teamName: string): any[] {
  const positions = ['GK', 'CB', 'CB', 'LB', 'RB', 'CM', 'CM', 'CAM', 'LW', 'RW', 'ST'];
  const reservePositions = ['GK', 'CB', 'CM', 'CAM', 'LW', 'ST', 'ST'];
  
  const allPositions = [...positions, ...reservePositions];
  const players = [];

  for (let i = 0; i < allPositions.length; i++) {
    const isReserve = i >= 11;
    const position = allPositions[i];
    const age = Math.floor(Math.random() * 12) + 18;
    const name = `${teamName.split(' ')[0]} ${i + 1}`;
    const cleanName = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toLowerCase()
      .substring(0, 10) || 'player';

    players.push({
      id: `${teamId}-${cleanName}`,
      name,
      age,
      position,
      overall: estimateOverall(age, position),
      energy: 90,
      isReserve,
      photo: undefined,
    });
  }

  return players;
}