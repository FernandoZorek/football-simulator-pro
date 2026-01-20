import { Championship, Match, ChampionshipPhase, Team } from '../../core/types';
import { simulateMatch } from './simulator';
import { updateKnockoutTeams } from '../../services/copaFixtureGenerator';

/**
 * Simula uma fase específica da copa
 * @param championship - Dados do campeonato
 * @param matches - Partidas a serem simuladas
 * @param currentPhase - Fase atual da simulação
 * @returns Partidas atualizadas com resultados
 */
export const simulateCopaPhase = (
  championship: Championship,
  matches: Match[],
  currentPhase: ChampionshipPhase
): Match[] => {
  const updatedMatches = [...matches];
  
  if (currentPhase === 'groups') {
    // Filtra todas as partidas agendadas da fase de grupos
    const scheduledMatches = matches.filter(m => 
      m.phase === 'groups' && m.status === 'scheduled'
    );
    
    // Se não houver partidas agendadas, retorna sem alterar
    if (scheduledMatches.length === 0) {
      console.log('✅ Nenhuma partida agendada para simular');
      return updatedMatches;
    }
    
    // Encontra a menor rodada ainda pendente
    const nextRound = Math.min(...scheduledMatches.map(m => m.round));
    
    console.log(`✅ Simulando rodada ${nextRound} da fase de grupos`);
    
    // Filtra apenas as partidas dessa rodada
    const roundMatches = scheduledMatches.filter(m => m.round === nextRound);
    
    // Simula cada partida da rodada
    roundMatches.forEach(match => {
      const homeTeam = championship.teams.find(t => t.id === match.homeTeamId);
      const awayTeam = championship.teams.find(t => t.id === match.awayTeamId);

        // ✅ Proteção crítica
        if (!homeTeam || !awayTeam) {
            console.error(`❌ Partida ${match.id} tem time(s) inválido(s):`, {
            homeTeamId: match.homeTeamId,
            awayTeamId: match.awayTeamId,
            homeTeamExists: !!homeTeam,
            awayTeamExists: !!awayTeam
            });
            return; // Pula esta partida
        }
      
      if (homeTeam && awayTeam) {
        const result = simulateMatch(homeTeam, awayTeam, match.round);
        const matchIndex = updatedMatches.findIndex(m => m.id === match.id);
        if (matchIndex !== -1) {
          updatedMatches[matchIndex] = {
            ...updatedMatches[matchIndex],
            ...result,
            status: 'finished'
          };
        }
      }
    });
  } else {
    // Para fases eliminatórias: simula todas as partidas agendadas da fase
    const phaseMatches = matches.filter(m => m.phase === currentPhase && m.status === 'scheduled');
    
    phaseMatches.forEach(match => {
      const homeTeam = championship.teams.find(t => t.id === match.homeTeamId);
      const awayTeam = championship.teams.find(t => t.id === match.awayTeamId);
      
      if (homeTeam && awayTeam) {
        let result = simulateMatch(homeTeam, awayTeam, match.round);
        
        // Trata empates na fase eliminatória com pênaltis decisivos
        if (result.homeScore === result.awayScore) {
        let homePenalties = 0;
        let awayPenalties = 0;
        let round = 0;
        const maxRounds = 15; // Limite para evitar loop infinito

        // Simula rodadas de pênaltis até desempatar
        while (homePenalties === awayPenalties && round < maxRounds) {
            round++;
            
            // Probabilidade realista: ~75% de acerto por penalidade
            const homeSuccess = Math.random() > 0.20; // 80% de chance de acertar
            const awaySuccess = Math.random() > 0.25; // 75% de chance de acertar
            
            if (homeSuccess) homePenalties++;
            if (awaySuccess) awayPenalties++;
        }

        // Se ainda estiver empate após maxRounds, forçar desempate aleatório
        if (homePenalties === awayPenalties) {
            if (Math.random() > 0.5) {
            homePenalties++;
            } else {
            awayPenalties++;
            }
        }

        result = {
            ...result,
            penaltyScore: {
            home: homePenalties,
            away: awayPenalties
            }
        };

        console.log(`🎯 Pênaltis: ${homePenalties} - ${awayPenalties} (rodadas: ${round})`);
        }
        
        const matchIndex = updatedMatches.findIndex(m => m.id === match.id);
        if (matchIndex !== -1) {
          updatedMatches[matchIndex] = {
            ...updatedMatches[matchIndex],
            ...result,
            status: 'finished'
          };
        }
      }
    });
  }
  
  return updatedMatches;
};

/**
 * Atualiza a próxima fase com os classificados
 * @param championship - Dados do campeonato
 * @param matches - Partidas atualizadas
 * @param currentPhase - Fase que acabou de ser simulada
 * @param nextPhase - Próxima fase a ser preparada
 * @returns Partidas atualizadas com os times classificados
 */
export const prepareNextPhase = (
  championship: Championship,
  matches: Match[],
  currentPhase: ChampionshipPhase,
  nextPhase: ChampionshipPhase
): Match[] => {
  const updatedMatches = [...matches];
  
  console.log(`🔄 Preparando transição de ${currentPhase} para ${nextPhase}`);
  
  // 1. Fase de grupos -> mata-mata
  if (currentPhase === 'groups' && ['round_32', 'round_16', 'quarters'].includes(nextPhase)) {
    console.log('📊 Calculando standings da fase de grupos...');
    const standings = calculateGroupStandings(championship, matches.filter(m => m.phase === 'groups'));
    
    console.log('🔄 Atualizando times classificados para o mata-mata...');
    return updateKnockoutTeams(updatedMatches, standings, championship.groups || []);
  }

  // Para decisão de 3º lugar
    if (nextPhase === 'third') {
        const thirdPlaceMatch = updatedMatches.find(m => m.phase === 'third');
        if (!thirdPlaceMatch) return updatedMatches;
        
        const semiMatches = matches.filter(m => m.phase === 'semis' && m.status === 'finished');
        
        if (semiMatches.length === 2) {
            const losers = semiMatches.map(m => {
            if (m.penaltyScore) {
                return m.penaltyScore.home > m.penaltyScore.away ? m.awayTeamId : m.homeTeamId;
            }
            return m.homeScore > m.awayScore ? m.awayTeamId : m.homeTeamId;
            });
            
            thirdPlaceMatch.homeTeamId = losers[0];
            thirdPlaceMatch.awayTeamId = losers[1];
            console.log(`🥉 Terceiro lugar: ${losers[0]} vs ${losers[1]}`);
        }
    }
  
  // 2. Fases eliminatórias subsequentes
  const currentPhaseMatches = matches.filter(m => m.phase === currentPhase && m.status === 'finished');
  const nextPhaseMatches = updatedMatches.filter(m => m.phase === nextPhase);
  
  console.log(`📋 Partidas concluídas em ${currentPhase}:`, currentPhaseMatches.length);
  console.log(`📋 Partidas disponíveis em ${nextPhase}:`, nextPhaseMatches.length);
  
  // Log detalhado das partidas concluídas
  currentPhaseMatches.forEach(match => {
    console.log(`🏆 Partida concluída: ${match.id} - ${match.homeTeamId} vs ${match.awayTeamId} (${match.homeScore}-${match.awayScore})`);
    if (match.penaltyScore) {
      console.log(`   🥅 Pênaltis: ${match.penaltyScore.home}-${match.penaltyScore.away}`);
    }
  });
  
  // Log detalhado das próximas partidas
  nextPhaseMatches.forEach(match => {
    console.log(`➡️ Próxima partida: ${match.id} - ${match.homeTeamId || 'null'} vs ${match.awayTeamId || 'null'} (nextMatchId: ${match.nextMatchId}, path: ${match.path})`);
  });
  
  currentPhaseMatches.forEach(match => {
    console.log(`✅ Partida ${match.id} - nextMatchId: ${match.nextMatchId}`);
    if (!match.nextMatchId) {
      console.warn(`⚠️ Partida ${match.id} não tem nextMatchId definido`);
      return;
    }
    
    const nextMatch = updatedMatches.find(m => m.id === match.nextMatchId);
    if (!nextMatch) {
      console.warn(`⚠️ Partida ${match.nextMatchId} não encontrada`);
      return;
    }
    
    // Determina o vencedor
    let winnerId: string | null = null;
    
    if (match.penaltyScore) {
      winnerId = match.penaltyScore.home > match.penaltyScore.away 
        ? match.homeTeamId 
        : match.awayTeamId;
    } else {
      winnerId = match.homeScore > match.awayScore 
        ? match.homeTeamId 
        : match.awayTeamId;
    }
    
    if (!winnerId) {
      console.warn(`⚠️ Vencedor não determinado para partida ${match.id}`);
      return;
    }
    
    // Define se o time entra como mandante ou visitante no próximo jogo
    const path = match.path || 'home';
    
    if (path === 'home') {
      nextMatch.homeTeamId = winnerId;
      console.log(`✅ ${winnerId} avança para ${nextMatch.id} como MANDANTE`);
    } else if (path === 'away') {
      nextMatch.awayTeamId = winnerId;
      console.log(`✅ ${winnerId} avança para ${nextMatch.id} como VISITANTE`);
    }
    
    // Para decisão de 3º lugar
    if (nextMatch.phase === 'semis' && nextMatch.id.includes('third')) {
      const thirdPlaceMatch = nextMatch;
      const semiMatches = matches.filter(m => m.phase === 'semis' && m.status === 'finished');
      
      if (semiMatches.length === 2) {
        const losers = semiMatches.map(m => {
          if (m.penaltyScore) {
            return m.penaltyScore.home > m.penaltyScore.away ? m.awayTeamId : m.homeTeamId;
          }
          return m.homeScore > m.awayScore ? m.awayTeamId : m.homeTeamId;
        });
        
        thirdPlaceMatch.homeTeamId = losers[0];
        thirdPlaceMatch.awayTeamId = losers[1];
        console.log(`🥉 Terceiro lugar: ${losers[0]} vs ${losers[1]}`);
      }
    }
  });
  
  // Log final do estado das partidas da próxima fase
  console.log(`🎯 Estado final das partidas de ${nextPhase}:`);
  updatedMatches
    .filter(m => m.phase === nextPhase)
    .forEach(match => {
      console.log(`   ${match.id}: ${match.homeTeamId || 'null'} vs ${match.awayTeamId || 'null'}`);
    });
  
  return updatedMatches;
};

/**
 * Calcula os standings da fase de grupos
 */
export const calculateGroupStandings = (
  championship: Championship,
  matches: Match[]
): any[] => {
  const standings: any[] = [];
  
  championship.groups?.forEach(group => {
    const groupStandings: any = {};
    
    // Inicializa standings para cada time do grupo
    group.teamIds.forEach(teamId => {
      groupStandings[teamId] = {
        team: championship.teams.find(t => t.id === teamId),
        points: 0,
        win: 0,
        draw: 0,
        loss: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        group: group.id
      };
    });
    
    // Processa resultados dos jogos
    matches
      .filter(m => m.group === group.id && m.status === 'finished')
      .forEach(match => {
        const home = groupStandings[match.homeTeamId!];
        const away = groupStandings[match.awayTeamId!];
        
        home.goalsFor += match.homeScore;
        home.goalsAgainst += match.awayScore;
        away.goalsFor += match.awayScore;
        away.goalsAgainst += match.homeScore;
        
        if (match.homeScore > match.awayScore) {
          home.points += championship.settings.pointsWin;
          home.win++;
          away.loss++;
        } else if (match.homeScore < match.awayScore) {
          away.points += championship.settings.pointsWin;
          away.win++;
          home.loss++;
        } else {
          home.points += championship.settings.pointsDraw;
          away.points += championship.settings.pointsDraw;
          home.draw++;
          away.draw++;
        }
      });
    
    // Calcula saldo de gols e converte para array
    Object.values(groupStandings).forEach((standing: any) => {
      standing.goalDifference = standing.goalsFor - standing.goalsAgainst;
      standings.push(standing);
    });
  });
  
  return standings;
};

/**
 * Verifica se uma fase foi concluída
 */
export const isPhaseCompleted = (matches: Match[], phase: ChampionshipPhase): boolean => {
  const phaseMatches = matches.filter(m => m.phase === phase);
  return phaseMatches.every(m => m.status === 'finished');
};

export { updateKnockoutTeams };