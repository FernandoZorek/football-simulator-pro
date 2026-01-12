import { Championship } from '../types';
import { fetchBrazilianTeamsAndPlayers } from '../../services/apiFootball';

export async function fetchBrasileirao2026(): Promise<Championship> {
  const { teams } = await fetchBrazilianTeamsAndPlayers();

  return {
    id: 'br-2026',
    name: 'Liga Brasileira 2026',
    season: '2026',
    type: 'liga',
    settings: {
      pointsWin: 3,
      pointsDraw: 1,
      hasPlayoffs: false,
    },
    teams,
  };
}