/**
 * Multi-Sport Scoring Engine
 * Modular calculator for Standard Points, Sets & Games (Tennis),
 * Bonus Points (Rugby), Cricket (Runs, Wickets, NRR), and Placement rankings.
 */

/**
 * Calculates standings table for a list of teams and completed fixtures according to sport scoring rules.
 * @param {object} params
 * @param {Array} params.teams - list of team objects { id, code, name, color, logo_url }
 * @param {Array} params.fixtures - list of completed fixture objects { team_a_id, team_b_id, score_a, score_b, score_details, winner_id, status }
 * @param {object} params.sport - sport object { scoring_system, scoring_rules, win_points, draw_points }
 * @returns {Array} sorted standings rows
 */
export function calculateStandings({ teams, fixtures, sport }) {
  const system = sport.scoring_system || 'standard_points';
  const rules = sport.scoring_rules || {};

  switch (system) {
    case 'sets_games':
      return calculateSetsGamesStandings({ teams, fixtures, rules });
    case 'bonus_points':
      return calculateBonusPointsStandings({ teams, fixtures, rules, defaultWin: sport.win_points, defaultDraw: sport.draw_points });
    case 'cricket_runs':
      return calculateCricketStandings({ teams, fixtures, rules });
    case 'standard_points':
    default:
      return calculateStandardPointsStandings({ teams, fixtures, winPts: sport.win_points || 3, drawPts: sport.draw_points || 1 });
  }
}

/**
 * 1. Standard Points Standings (Soccer, Basketball, etc.)
 */
export function calculateStandardPointsStandings({ teams, fixtures, winPts = 3, drawPts = 1 }) {
  const table = {};
  teams.forEach(t => {
    table[t.id] = {
      ...t,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      pf: 0,
      pa: 0,
      diff: 0,
      points: 0
    };
  });

  fixtures.forEach(f => {
    const a = table[f.team_a_id];
    const b = table[f.team_b_id];
    if (!a || !b) return;

    a.played += 1;
    b.played += 1;
    a.pf += f.score_a || 0;
    a.pa += f.score_b || 0;
    b.pf += f.score_b || 0;
    b.pa += f.score_a || 0;

    if (f.score_a > f.score_b || f.winner_id === f.team_a_id) {
      a.won += 1;
      a.points += winPts;
      b.lost += 1;
    } else if (f.score_b > f.score_a || f.winner_id === f.team_b_id) {
      b.won += 1;
      b.points += winPts;
      a.lost += 1;
    } else {
      a.drawn += 1;
      b.drawn += 1;
      a.points += drawPts;
      b.points += drawPts;
    }
  });

  return Object.values(table).map(t => ({
    ...t,
    diff: t.pf - t.pa
  })).sort((a, b) => b.points - a.points || b.diff - a.diff || b.pf - a.pf || a.code.localeCompare(b.code));
}

/**
 * 2. Tennis (Sets & Games) Standings
 */
export function calculateSetsGamesStandings({ teams, fixtures, rules = {} }) {
  const winPts = rules.win_points !== undefined ? rules.win_points : 2;
  const lossPts = rules.loss_points !== undefined ? rules.loss_points : 0;

  const table = {};
  teams.forEach(t => {
    table[t.id] = {
      ...t,
      played: 0,
      won: 0,
      lost: 0,
      sets_won: 0,
      sets_lost: 0,
      sets_diff: 0,
      games_won: 0,
      games_lost: 0,
      games_diff: 0,
      points: 0
    };
  });

  fixtures.forEach(f => {
    const a = table[f.team_a_id];
    const b = table[f.team_b_id];
    if (!a || !b) return;

    a.played += 1;
    b.played += 1;

    const details = f.score_details || {};
    let setsA = details.sets_a;
    let setsB = details.sets_b;
    let gamesA = details.games_a || 0;
    let gamesB = details.games_b || 0;

    // Parse sets array if provided: e.g. [[6, 4], [7, 6]]
    if (Array.isArray(details.sets)) {
      setsA = 0;
      setsB = 0;
      gamesA = 0;
      gamesB = 0;
      details.sets.forEach(([gA, gB]) => {
        gamesA += gA || 0;
        gamesB += gB || 0;
        if (gA > gB) setsA++;
        else if (gB > gA) setsB++;
      });
    }

    // Fallback to top-level score if sets not broken down
    if (setsA === undefined || setsB === undefined) {
      setsA = f.score_a || 0;
      setsB = f.score_b || 0;
    }

    a.sets_won += setsA;
    a.sets_lost += setsB;
    b.sets_won += setsB;
    b.sets_lost += setsA;

    a.games_won += gamesA;
    a.games_lost += gamesB;
    b.games_won += gamesB;
    b.games_lost += gamesA;

    if (setsA > setsB || f.winner_id === f.team_a_id) {
      a.won += 1;
      a.points += winPts;
      b.lost += 1;
      b.points += lossPts;
    } else if (setsB > setsA || f.winner_id === f.team_b_id) {
      b.won += 1;
      b.points += winPts;
      a.lost += 1;
      a.points += lossPts;
    }
  });

  return Object.values(table).map(t => ({
    ...t,
    sets_diff: t.sets_won - t.sets_lost,
    games_diff: t.games_won - t.games_lost
  })).sort((a, b) => b.points - a.points || b.sets_diff - a.sets_diff || b.games_diff - a.games_diff || a.code.localeCompare(b.code));
}

/**
 * 3. Rugby Bonus Points Standings
 */
export function calculateBonusPointsStandings({ teams, fixtures, rules = {}, defaultWin = 4, defaultDraw = 2 }) {
  const winPts = rules.win_points !== undefined ? rules.win_points : defaultWin;
  const drawPts = rules.draw_points !== undefined ? rules.draw_points : defaultDraw;
  const tryBonusThreshold = rules.try_bonus_threshold || 4;
  const losingBonusMargin = rules.losing_bonus_margin || 7;

  const table = {};
  teams.forEach(t => {
    table[t.id] = {
      ...t,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      pf: 0,
      pa: 0,
      diff: 0,
      tries_for: 0,
      try_bonus: 0,
      losing_bonus: 0,
      bonus_points: 0,
      points: 0
    };
  });

  fixtures.forEach(f => {
    const a = table[f.team_a_id];
    const b = table[f.team_b_id];
    if (!a || !b) return;

    a.played += 1;
    b.played += 1;

    const scoreA = f.score_a || 0;
    const scoreB = f.score_b || 0;
    a.pf += scoreA;
    a.pa += scoreB;
    b.pf += scoreB;
    b.pa += scoreA;

    const details = f.score_details || {};
    const triesA = details.tries_a !== undefined ? details.tries_a : (details.triesA || 0);
    const triesB = details.tries_b !== undefined ? details.tries_b : (details.triesB || 0);

    a.tries_for += triesA;
    b.tries_for += triesB;

    // Bonus points evaluation
    let bonusA = details.bonus_a || 0;
    let bonusB = details.bonus_b || 0;

    // Try bonus (+1 for 4+ tries)
    if (triesA >= tryBonusThreshold) {
      a.try_bonus += 1;
      bonusA += 1;
    }
    if (triesB >= tryBonusThreshold) {
      b.try_bonus += 1;
      bonusB += 1;
    }

    if (scoreA > scoreB || f.winner_id === f.team_a_id) {
      a.won += 1;
      a.points += winPts;
      b.lost += 1;

      // Losing bonus (+1 if lost by 7 or fewer points)
      if (scoreA - scoreB <= losingBonusMargin && scoreA - scoreB > 0) {
        b.losing_bonus += 1;
        bonusB += 1;
      }
    } else if (scoreB > scoreA || f.winner_id === f.team_b_id) {
      b.won += 1;
      b.points += winPts;
      a.lost += 1;

      if (scoreB - scoreA <= losingBonusMargin && scoreB - scoreA > 0) {
        a.losing_bonus += 1;
        bonusA += 1;
      }
    } else {
      a.drawn += 1;
      b.drawn += 1;
      a.points += drawPts;
      b.points += drawPts;
    }

    a.bonus_points += bonusA;
    a.points += bonusA;
    b.bonus_points += bonusB;
    b.points += bonusB;
  });

  return Object.values(table).map(t => ({
    ...t,
    diff: t.pf - t.pa
  })).sort((a, b) => b.points - a.points || b.diff - a.diff || b.tries_for - a.tries_for || a.code.localeCompare(b.code));
}

/**
 * 4. Cricket Standings with Net Run Rate (NRR)
 */
export function calculateCricketStandings({ teams, fixtures, rules = {} }) {
  const winPts = rules.win_points !== undefined ? rules.win_points : 2;
  const tiePts = rules.tie_points !== undefined ? rules.tie_points : 1;

  const table = {};
  teams.forEach(t => {
    table[t.id] = {
      ...t,
      played: 0,
      won: 0,
      tied: 0,
      lost: 0,
      runs_for: 0,
      overs_faced: 0,
      runs_against: 0,
      overs_bowled: 0,
      nrr: 0.000,
      points: 0
    };
  });

  // Convert decimal overs (e.g. 5.2 = 5 overs + 2 balls) to fractional overs for accurate NRR math
  const oversToDecimal = (ov) => {
    if (!ov) return 0;
    const completed = Math.floor(ov);
    const balls = Math.round((ov - completed) * 10);
    return completed + (balls / 6);
  };

  fixtures.forEach(f => {
    const a = table[f.team_a_id];
    const b = table[f.team_b_id];
    if (!a || !b) return;

    a.played += 1;
    b.played += 1;

    const details = f.score_details || {};
    const runsA = details.runs_a !== undefined ? details.runs_a : (f.score_a || 0);
    const runsB = details.runs_b !== undefined ? details.runs_b : (f.score_b || 0);
    const oversA = details.overs_a !== undefined ? details.overs_a : (rules.default_overs || 6);
    const oversB = details.overs_b !== undefined ? details.overs_b : (rules.default_overs || 6);

    const decOversA = oversToDecimal(oversA);
    const decOversB = oversToDecimal(oversB);

    a.runs_for += runsA;
    a.overs_faced += decOversA;
    a.runs_against += runsB;
    a.overs_bowled += decOversB;

    b.runs_for += runsB;
    b.overs_faced += decOversB;
    b.runs_against += runsA;
    b.overs_bowled += decOversA;

    if (runsA > runsB || f.winner_id === f.team_a_id) {
      a.won += 1;
      a.points += winPts;
      b.lost += 1;
    } else if (runsB > runsA || f.winner_id === f.team_b_id) {
      b.won += 1;
      b.points += winPts;
      a.lost += 1;
    } else {
      a.tied += 1;
      b.tied += 1;
      a.points += tiePts;
      b.points += tiePts;
    }
  });

  // Compute NRR = (Runs For / Overs Faced) - (Runs Against / Overs Bowled)
  return Object.values(table).map(t => {
    let runRateFor = t.overs_faced > 0 ? t.runs_for / t.overs_faced : 0;
    let runRateAgainst = t.overs_bowled > 0 ? t.runs_against / t.overs_bowled : 0;
    let nrr = runRateFor - runRateAgainst;

    return {
      ...t,
      nrr: Number(nrr.toFixed(3)),
      nrr_formatted: (nrr >= 0 ? '+' : '') + nrr.toFixed(3)
    };
  }).sort((a, b) => b.points - a.points || b.nrr - a.nrr || b.runs_for - a.runs_for || a.code.localeCompare(b.code));
}
