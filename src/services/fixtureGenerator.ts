// src/services/fixtureGenerator.ts
import { Team, Match } from '../core/types';

export const generateFixture = (teams: Team[]): Match[] => {
  if (teams.length % 2 !== 0) {
    throw new Error('Número de times deve ser par para gerar fixture de ida e volta.');
  }

  const totalTeams = teams.length;
  const roundsPerTurn = totalTeams - 1; // 19 rodadas por turno
  const totalRounds = roundsPerTurn * 2; // 38 rodadas
  const half = totalTeams / 2;

  console.log("📅 Rodadas:", totalRounds, " | Times:", totalTeams);

  const matches: Match[] = [];
  const teamIds = teams.map(t => t.id);

  // --- Primeiro turno (ida) ---
  let currentTeamIds = [...teamIds];
  for (let round = 1; round <= roundsPerTurn; round++) {
    for (let i = 0; i < half; i++) {
      const home = currentTeamIds[i];
      const away = currentTeamIds[totalTeams - 1 - i];

      matches.push({
        id: `m-${round}-${i}`,
        homeTeamId: home,
        awayTeamId: away,
        homeScore: 0,
        awayScore: 0,
        status: 'scheduled',
        round,
        events: [],
        phase: 'groups'
      });
    }
    // Rotaciona (exceto o primeiro)
    currentTeamIds.splice(1, 0, currentTeamIds.pop()!);
  }

  // --- Segundo turno (volta) ---
  // Reutiliza os pares do primeiro turno, mas com mando invertido
  for (let round = roundsPerTurn + 1; round <= totalRounds; round++) {
    const firstTurnRound = round - roundsPerTurn; // rodada correspondente no primeiro turno
    const firstTurnMatches = matches.filter(m => m.round === firstTurnRound);

    firstTurnMatches.forEach((match, idx) => {
      return matches.push({
        id: `m-${round}-${idx}`,
        homeTeamId: match.awayTeamId, // ⬅️ INVERTE O MANDO
        awayTeamId: match.homeTeamId,
        homeScore: 0,
        awayScore: 0,
        status: 'scheduled',
        round,
        events: [],
        phase: 'groups'
      });
    });
  }

  // Remove duplicatas (seguro)
  const seen = new Set<string>();
  return matches.filter(m => {
    const key = `${m.homeTeamId}-${m.awayTeamId}-${m.round}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};