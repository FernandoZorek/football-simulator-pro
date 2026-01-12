export interface ApiFootballPlayer {
  name: string;
  age: number;
  number: number | null;
  position: string;
  photo: string;
}

export interface ApiFootballSquad {
  team: {
    id: number;
    name: string;
    logo: string;
  };
  players: ApiFootballPlayer[];
}

// Função para pausar (rate limiting)
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function fetchBrazilianTeamsAndPlayers(): Promise<{ teams: any[] }> {
  const API_KEY = import.meta.env.VITE_API_FOOTBALL_KEY;

  if (!API_KEY) {
    throw new Error("VITE_API_FOOTBALL_KEY não configurada no .env");
  }

  const leagueId = 71; // Brasileirão Série A
  const season = "2024"; // Única temporada disponível no plano gratuito

  // 1. Buscar times da liga
  const teamsRes = await fetch(
    `https://v3.football.api-sports.io/teams?league=${leagueId}&season=${season}`,
    {
      headers: {
        "x-apisports-key": API_KEY,
        "Accept": "application/json",
      },
    }
  );

  if (!teamsRes.ok) {
    const text = await teamsRes.text();
    throw new Error(`Erro ao buscar times: ${teamsRes.status} - ${text}`);
  }

  const teamsData = await teamsRes.json();

  if (!teamsData.response?.length) {
    throw new Error("Nenhum time retornado pela API.");
  }

  const teams = teamsData.response;
  const processedTeams = [];

  // 2. Buscar elenco de cada time com delay (1s entre requisições)
  for (let i = 0; i < teams.length; i++) {
    const teamEntry = teams[i];
    const team = teamEntry.team;
    const venue = teamEntry.venue;
    const teamName = team.name;
    const teamCode = (team.code || team.name.substring(0, 3)).toUpperCase();
    const teamId = team.id;

    // Aguarda 1 segundo antes de cada requisição (rate limit)
    if (i > 0) await sleep(6100);

    const squadRes = await fetch(
      `https://v3.football.api-sports.io/players/squads?team=${teamId}`,
      {
        headers: {
          "x-apisports-key": API_KEY,
          "Accept": "application/json",
        },
      }
    );

    if (!squadRes.ok) {
      console.warn(`⚠️ Falha ao carregar elenco de ${teamName} (status: ${squadRes.status})`);
      continue;
    }

    const squadData = await squadRes.json();
    const squadList = squadData.response as ApiFootballSquad[];

    if (!squadList || squadList.length === 0) {
      console.warn(`Elenco vazio para ${teamName}`);
      continue;
    }

    const squad = squadList[0];
    const players = squad.players.map((p, index) => {
      const cleanName = p.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]/g, '')
        .toLowerCase()
        .substring(0, 10) || 'player';

      const playerId = `${teamCode.toLowerCase()}-${cleanName}`;

      return {
        id: playerId,
        name: p.name,
        age: p.age || 25,
        position: mapPosition(p.position),
        overall: estimateOverall(p.age || 25, p.position),
        energy: 100,
        isReserve: index >= 11,
        photo: p.photo,
      };
    });

    processedTeams.push({
      id: teamId,
      name: teamName,
      shortName: teamCode,
      colors: getTeamColors(teamName),
      formation: estimateFormation(players),
      metadata: {
        h2hBias: {},
        trend: Math.random() * 0.5 + 0.75,
        prestige: 4,
      },
      logo: team.logo,
      venue: venue ? {
        id: venue.id,
        name: venue.name,
        address: venue.address,
        city: venue.city,
        capacity: venue.capacity,
        surface: venue.surface as 'grass' | 'artificial',
        image: venue.image,
      } : undefined,
      players,
    });

    console.log(`✅ Processado: ${teamName} (${players.length} jogadores)`);
  }

  if (processedTeams.length < 10) {
    console.warn(`⚠️ Apenas ${processedTeams.length} times carregados.`);
  }

  return { teams: processedTeams };
}

// Funções auxiliares (iguais, mas atualizadas)
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
  const pos = players.map(p => p.position);
  const def = pos.filter(p => ["CB", "LB", "RB"].includes(p)).length;
  const mid = pos.filter(p => ["CM", "CAM", "RW", "LW"].includes(p)).length;
  const att = pos.filter(p => ["ST"].includes(p)).length;

  if (def === 3 && mid === 5 && att === 2) return "3-5-2";
  if (def === 4 && mid === 4 && att === 2) return "4-4-2";
  if (def === 4 && mid === 2 && att === 3) return "4-2-3-1";
  return "4-3-3";
}

function getTeamColors(teamName: string): { primary: string; secondary: string } {
  const colors: Record<string, { primary: string; secondary: string }> = {
    "Flamengo": { primary: "#ff0000", secondary: "#000000" },
    "Palmeiras": { primary: "#008000", secondary: "#ffffff" },
    "Corinthians": { primary: "#000000", secondary: "#ffffff" },
    "São Paulo": { primary: "#ff0000", secondary: "#ffffff" },
    "Botafogo": { primary: "#000000", secondary: "#ffffff" },
    "Grêmio": { primary: "#0000ff", secondary: "#ffffff" },
    "Internacional": { primary: "#ff0000", secondary: "#0000ff" },
    "Atlético Mineiro": { primary: "#0000ff", secondary: "#ffffff" },
    "Vasco da Gama": { primary: "#000000", secondary: "#ffffff" },
    "Fluminense": { primary: "#0000ff", secondary: "#ffffff" },
    "Cruzeiro": { primary: "#0000ff", secondary: "#ffffff" },
    "Bahia": { primary: "#008000", secondary: "#ffffff" },
    "Fortaleza": { primary: "#0000ff", secondary: "#ffffff" },
    "Cuiabá": { primary: "#ff0000", secondary: "#ffffff" },
    "Red Bull Bragantino": { primary: "#ff0000", secondary: "#ffffff" },
    "Santos": { primary: "#000000", secondary: "#ffffff" },
    "Athletico Paranaense": { primary: "#ff0000", secondary: "#000000" },
    "Vitória": { primary: "#ff0000", secondary: "#ffffff" },
    "Juventude": { primary: "#008000", secondary: "#ffffff" },
    "Criciúma": { primary: "#ff0000", secondary: "#ffffff" },
  };
  return colors[teamName] || { primary: "#333", secondary: "#fff" };
}