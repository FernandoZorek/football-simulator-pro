import { Team, TeamSectors } from '../types';
import { calculateTeamSectors } from './simulator';

export const calculateTeamOverall = (team: Team): number => {
  const sectors = calculateTeamSectors(team);
  
  // Peso dos setores (você pode ajustar)
  const weightedOverall = (
    sectors.attack * 0.4 +      // Ataque tem mais peso
    sectors.midfield * 0.3 +    // Meio-campo
    sectors.defense * 0.2 +     // Defesa  
    sectors.goalkeeping * 0.1   // Goleiro
  );
  
  return Math.round(weightedOverall);
};

// Também exporta os setores detalhados
export const getTeamSectorsWithOverall = (team: Team): {
  overall: number;
  sectors: TeamSectors;
} => {
  const sectors = calculateTeamSectors(team);
  const overall = calculateTeamOverall(team);
  return { overall, sectors };
};