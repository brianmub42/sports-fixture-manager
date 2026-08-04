// Fixture Generation Algorithm
// Supports: single round-robin, double round-robin, group stage

/**
 * Generate round-robin pairings using circle method
 * @param {string[]} teams - array of team codes
 * @returns {Array<[string,string]>} - array of [home, away] pairs
 */
export function roundRobin(teams) {
  const n = teams.length;
  if (n % 2 !== 0) teams.push('BYE'); // Add bye if odd number

  const count = teams.length;
  const rounds = count - 1;
  const half = count / 2;
  const schedule = [];

  let playerIndexes = teams.map((_, i) => i).slice(1);

  for (let round = 0; round < rounds; round++) {
    const roundPairs = [];
    const newPlayerIndexes = [0];

    for (let i = 0; i < playerIndexes.length; i++) {
      const current = playerIndexes[i];
      const next = playerIndexes[(i + 1) % playerIndexes.length];

      if (i === 0) {
        roundPairs.push([teams[0], teams[current]]);
        newPlayerIndexes.push(current);
      } else {
        roundPairs.push([teams[current], teams[next]]);
        newPlayerIndexes.push(next);
      }
    }

    schedule.push(...roundPairs);
    playerIndexes = newPlayerIndexes;
  }

  return schedule.filter(p => p[0] !== 'BYE' && p[1] !== 'BYE');
}

/**
 * Generate double round-robin (home + away reversed)
 */
export function doubleRoundRobin(teams) {
  const first = roundRobin(teams);
  const second = first.map(([a, b]) => [b, a]);
  return [...first, ...second];
}

/**
 * Generate group stage pairings
 * @param {string[][]} groups - array of groups, each group is array of team codes
 */
export function groupStage(groups) {
  const allPairs = [];
  groups.forEach((group, groupIdx) => {
    const pairs = roundRobin(group);
    pairs.forEach(p => {
      allPairs.push({ pair: p, group: groupIdx + 1 });
    });
  });
  return allPairs;
}

/**
 * Assign venues in round-robin fashion
 */
export function assignVenues(pairs, venues, concurrent = 1) {
  const rounds = [];
  const venueCount = venues.length;

  for (let i = 0; i < pairs.length; i += concurrent) {
    const round = [];
    for (let j = 0; j < concurrent && i + j < pairs.length; j++) {
      const pair = Array.isArray(pairs[i + j]) ? pairs[i + j] : pairs[i + j].pair;
      const groupInfo = pairs[i + j].group ? `Group ${pairs[i + j].group}` : null;
      round.push({
        pair,
        venue: venues[j % venueCount],
        group: groupInfo
      });
    }
    rounds.push(round);
  }

  return rounds;
}

/**
 * Calculate times for each round
 */
export function calculateTimes(rounds, startDate, durationMinutes, breakMinutes = 0) {
  let currentTime = new Date(startDate);
  const result = [];

  rounds.forEach((round, roundIdx) => {
    const roundResult = [];

    round.forEach(match => {
      const endTime = new Date(currentTime.getTime() + durationMinutes * 60000);

      roundResult.push({
        ...match,
        round: `R${roundIdx + 1}`,
        startTime: new Date(currentTime),
        endTime,
        duration: durationMinutes
      });
    });

    result.push(...roundResult);

    // Advance time for next round
    currentTime = new Date(currentTime.getTime() + (durationMinutes + breakMinutes) * 60000);
  });

  return result;
}

/**
 * Generate playoff / knockout bracket schedule
 */
export function generatePlayoff({
  teams,
  startDate,
  durationMinutes,
  breakMinutes = 0,
  venues,
  concurrent = 1
}) {
  const count = teams.length;
  const venueCount = venues.length;
  const matches = [];

  const addMinutes = (date, mins) => new Date(new Date(date).getTime() + mins * 60000);

  if (count <= 4) {
    // 4 teams: Semi-finals + Final
    // Pad to 4 if needed
    const t = [...teams];
    while (t.length < 4) t.push(null);

    const semi1 = {
      pair: [t[0], t[3]],
      round: 'Semi-final 1',
      venue: venues[0 % venueCount],
      notes: 'source: team_a=Semi-final 1, team_b=' // placeholder
    };
    const semi2 = {
      pair: [t[1], t[2]],
      round: 'Semi-final 2',
      venue: venues[1 % venueCount],
      notes: 'source: team_a=Semi-final 2, team_b='
    };

    const finalMatch = {
      pair: [null, null],
      round: 'Final',
      venue: venues[0 % venueCount],
      notes: 'source: team_a=Semi-final 1, team_b=Semi-final 2'
    };

    // Schedule Semis (Round 1)
    let currentTime = new Date(startDate);
    const semis = [semi1, semi2];
    semis.forEach((match, idx) => {
      const offset = Math.floor(idx / concurrent);
      const matchTime = addMinutes(currentTime, offset * (durationMinutes + breakMinutes));
      matches.push({
        ...match,
        startTime: matchTime,
        endTime: addMinutes(matchTime, durationMinutes),
        duration: durationMinutes
      });
    });

    // Schedule Final (Round 2) after Semis complete
    const maxSemiEnd = new Date(Math.max(...matches.map(m => m.endTime.getTime())));
    const finalTime = addMinutes(maxSemiEnd, breakMinutes);
    matches.push({
      ...finalMatch,
      startTime: finalTime,
      endTime: addMinutes(finalTime, durationMinutes),
      duration: durationMinutes
    });

  } else {
    // 8 teams: Quarter-finals + Semi-finals + Final
    const t = [...teams];
    while (t.length < 8) t.push(null);

    const qf1 = { pair: [t[0], t[7]], round: 'Quarter-final 1', venue: venues[0 % venueCount] };
    const qf2 = { pair: [t[3], t[4]], round: 'Quarter-final 2', venue: venues[1 % venueCount] };
    const qf3 = { pair: [t[1], t[6]], round: 'Quarter-final 3', venue: venues[2 % venueCount] };
    const qf4 = { pair: [t[2], t[5]], round: 'Quarter-final 4', venue: venues[3 % venueCount] };

    const semi1 = {
      pair: [null, null],
      round: 'Semi-final 1',
      venue: venues[0 % venueCount],
      notes: 'source: team_a=Quarter-final 1, team_b=Quarter-final 2'
    };
    const semi2 = {
      pair: [null, null],
      round: 'Semi-final 2',
      venue: venues[1 % venueCount],
      notes: 'source: team_a=Quarter-final 3, team_b=Quarter-final 4'
    };

    const finalMatch = {
      pair: [null, null],
      round: 'Final',
      venue: venues[0 % venueCount],
      notes: 'source: team_a=Semi-final 1, team_b=Semi-final 2'
    };

    // Schedule Quarters (Round 1)
    let currentTime = new Date(startDate);
    const quarters = [qf1, qf2, qf3, qf4];
    quarters.forEach((match, idx) => {
      const offset = Math.floor(idx / concurrent);
      const matchTime = addMinutes(currentTime, offset * (durationMinutes + breakMinutes));
      matches.push({
        ...match,
        startTime: matchTime,
        endTime: addMinutes(matchTime, durationMinutes),
        duration: durationMinutes
      });
    });

    // Schedule Semis (Round 2)
    const maxQfEnd = new Date(Math.max(...matches.map(m => m.endTime.getTime())));
    const semiTimeBase = addMinutes(maxQfEnd, breakMinutes);
    const semis = [semi1, semi2];
    const semiMatches = [];
    semis.forEach((match, idx) => {
      const offset = Math.floor(idx / concurrent);
      const matchTime = addMinutes(semiTimeBase, offset * (durationMinutes + breakMinutes));
      semiMatches.push({
        ...match,
        startTime: matchTime,
        endTime: addMinutes(matchTime, durationMinutes),
        duration: durationMinutes
      });
    });
    matches.push(...semiMatches);

    // Schedule Final (Round 3)
    const maxSemiEnd = new Date(Math.max(...semiMatches.map(m => m.endTime.getTime())));
    const finalTime = addMinutes(maxSemiEnd, breakMinutes);
    matches.push({
      ...finalMatch,
      startTime: finalTime,
      endTime: addMinutes(finalTime, durationMinutes),
      duration: durationMinutes
    });
  }

  return matches;
}

/**
 * Main generation function
 */
export function generateSchedule({
  teams,
  startDate,
  durationMinutes,
  breakMinutes = 0,
  format = 'single', // 'single', 'double', 'group', 'playoff'
  venues,
  concurrent = 1,
  groups = null // for group stage: [['ZAM','BAR','HAL'], ['SHA','TEH','TOW']]
}) {
  let scheduled;

  if (format === 'playoff') {
    scheduled = generatePlayoff({
      teams,
      startDate,
      durationMinutes,
      breakMinutes,
      venues,
      concurrent
    });
  } else {
    let pairs;
    if (format === 'group' && groups) {
      pairs = groupStage(groups);
    } else if (format === 'double') {
      pairs = doubleRoundRobin(teams);
    } else {
      pairs = roundRobin(teams);
    }

    const rounds = assignVenues(pairs, venues, concurrent);
    scheduled = calculateTimes(rounds, startDate, durationMinutes, breakMinutes);
  }

  return scheduled;
}

