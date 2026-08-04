/**
 * Scans a set of fixtures to identify scheduling resource overlaps:
 * 1. Double-booked venues
 * 2. Teams/Districts scheduled to play in multiple places simultaneously
 */
export function detectConflicts(fixtures) {
  const warnings = [];
  
  // Sort fixtures by start time for faster scanning
  const sorted = [...fixtures].sort((a, b) => new Date(a.scheduled_at || a.startTime) - new Date(b.scheduled_at || b.startTime));
  
  for (let i = 0; i < sorted.length; i++) {
    const m1 = sorted[i];
    const m1Start = new Date(m1.scheduled_at || m1.startTime);
    const m1Duration = m1.duration || m1.duration_minutes || 10;
    const m1End = new Date(m1Start.getTime() + m1Duration * 60000);
    
    for (let j = i + 1; j < sorted.length; j++) {
      const m2 = sorted[j];
      const m2Start = new Date(m2.scheduled_at || m2.startTime);
      const m2Duration = m2.duration || m2.duration_minutes || 10;
      
      // If m2 starts after m1 ends, no overlap (since list is sorted by start time)
      if (m2Start >= m1End) break;
      
      const m2End = new Date(m2Start.getTime() + m2Duration * 60000);
      
      // Time overlap exists! Check resource conflicts:
      
      // 1. Venue conflict
      const venue1 = m1.venue_id || m1.venue;
      const venue2 = m2.venue_id || m2.venue;
      if (venue1 && venue2 && venue1 === venue2) {
        const venueName = m1.venue_name || m1.venue;
        const timeStr = m1Start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        warnings.push({
          type: 'venue',
          message: `Venue "${venueName}" is double-booked for both "${m1.sport_name || m1.sport}" and "${m2.sport_name || m2.sport}" at ${timeStr}.`,
          matchA: m1,
          matchB: m2
        });
      }
      
      // 2. Team conflict
      const teamA1 = m1.team_a_id || m1.team_a;
      const teamB1 = m1.team_b_id || m1.team_b;
      const teamA2 = m2.team_a_id || m2.team_a;
      const teamB2 = m2.team_b_id || m2.team_b;
      
      const teams1 = [teamA1, teamB1].filter(Boolean);
      const teams2 = [teamA2, teamB2].filter(Boolean);
      
      const commonTeams = teams1.filter(t => teams2.includes(t));
      if (commonTeams.length > 0) {
        const teamName = commonTeams[0] === teamA1 ? (m1.team_a_name || m1.team_a) : (m1.team_b_name || m1.team_b);
        const timeStr = m1Start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        warnings.push({
          type: 'team',
          message: `Team "${teamName}" is scheduled to play concurrent matches at ${timeStr} in both "${m1.sport_name || m1.sport}" and "${m2.sport_name || m2.sport}".`,
          matchA: m1,
          matchB: m2
        });
      }
    }
  }
  
  return warnings;
}
