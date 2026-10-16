import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Safe instantiation of jsPDF
const createPdf = (orientation = 'portrait') => {
  if (typeof jsPDF === 'function') {
    return new jsPDF(orientation, 'mm', 'a4');
  }
  if (jsPDF && typeof jsPDF.default === 'function') {
    return new jsPDF.default(orientation, 'mm', 'a4');
  }
  return new jsPDF(orientation, 'mm', 'a4');
};

// Safe autoTable runner
const runAutoTable = (doc, options) => {
  if (typeof autoTable === 'function') {
    autoTable(doc, options);
  } else if (autoTable && typeof autoTable.default === 'function') {
    autoTable.default(doc, options);
  } else if (typeof doc.autoTable === 'function') {
    doc.autoTable(options);
  } else {
    throw new Error('autoTable plugin unavailable');
  }
};

// CSV Export Utility
export const downloadCSV = (filename, headers, rows) => {
  const escapeCell = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const csvContent = [
    headers.map(escapeCell).join(','),
    ...rows.map(row => row.map(escapeCell).join(','))
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Standard Header & Footer
const drawReportHeader = (doc, orgName, eventTitle, reportTitle, subhead = '') => {
  const dateStr = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  // Top Accent Bar
  doc.setFillColor(37, 99, 235); // Blue-600
  doc.rect(0, 0, 210, 5, 'F');

  // Org Name
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42); // Slate-900
  doc.text(orgName || 'Sports Fixture Manager', 14, 18);

  // Event Title
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105); // Slate-600
  doc.text(eventTitle || 'Tournament Championship', 14, 25);

  // Report Title Box
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59); // Slate-800
  doc.text(reportTitle.toUpperCase(), 14, 34);

  if (subhead) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(subhead, 14, 39);
  }

  // Date Generated
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184); // Slate-400
  doc.text(`Generated: ${dateStr}`, 196, 34, { align: 'right' });
};

const drawSignOffBlock = (doc, startY) => {
  const pageHeight = doc.internal.pageSize.height;
  let y = startY + 15;
  if (y > pageHeight - 35) {
    doc.addPage();
    y = 30;
  }

  doc.setDrawColor(203, 213, 225); // Slate-300
  doc.setLineWidth(0.5);

  // Line 1: Tournament Director
  doc.line(14, y + 10, 85, y + 10);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('TOURNAMENT DIRECTOR SIGNATURE', 14, y + 15);
  doc.setFont('helvetica', 'normal');
  doc.text('Date: ________________________', 14, y + 20);

  // Line 2: Head of Sports / Convenor
  doc.line(125, y + 10, 196, y + 10);
  doc.setFont('helvetica', 'bold');
  doc.text('HEAD OF SPORTS / ADJUDICATOR', 125, y + 15);
  doc.setFont('helvetica', 'normal');
  doc.text('Date: ________________________', 125, y + 20);
};

// -------------------------------------------------------------
// 1. OVERALL CHAMPIONSHIP SHIELD REPORT
// -------------------------------------------------------------
export const exportOverallShieldPDF = ({ logData, settings }) => {
  if (!logData || !logData.leaderboard || logData.leaderboard.length === 0) {
    alert('No standings data available for Overall Shield report.');
    return;
  }

  const doc = createPdf();
  const orgName = settings?.org_name || 'FixtureGrid';
  const eventTitle = settings?.event_title || 'Tournament Championship';

  drawReportHeader(doc, orgName, eventTitle, 'Official Overall Championship Shield Standings', 'Combined Aggregate Points Across All Sporting Disciplines');

  // Top Champion Banner
  const champion = logData.leaderboard[0];
  if (champion) {
    doc.setFillColor(239, 246, 255); // Blue-50
    doc.setDrawColor(191, 219, 254); // Blue-200
    doc.roundedRect(14, 43, 182, 18, 3, 3, 'FD');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 58, 138); // Blue-900
    doc.text(`TOURNAMENT CHAMPION: ${champion.name || champion.code} (${champion.total_points} PTS)`, 20, 52);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(37, 99, 235);
    doc.text(`Official aggregate shield winner for ${eventTitle}`, 20, 57);
  }

  // Table
  const headers = ['Rank', 'Team / House', 'Code', 'Gold 1st', 'Silver 2nd', 'Bronze 3rd', 'Total Points'];
  const rows = logData.leaderboard.map((item, idx) => [
    idx === 0 ? '1st [C]' : `${idx + 1}`,
    item.name || item.code,
    item.code,
    item.gold_count || item.first_places || 0,
    item.silver_count || item.second_places || 0,
    item.bronze_count || item.third_places || 0,
    item.total_points
  ]);

  runAutoTable(doc, {
    startY: 66,
    head: [headers],
    body: rows,
    theme: 'striped',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9
    },
    styles: { fontSize: 8.5, cellPadding: 3 },
    columnStyles: {
      0: { halign: 'center', fontStyle: 'bold', width: 20 },
      2: { halign: 'center' },
      3: { halign: 'center' },
      4: { halign: 'center' },
      5: { halign: 'center' },
      6: { halign: 'center', fontStyle: 'bold' }
    }
  });

  drawSignOffBlock(doc, doc.lastAutoTable?.finalY || 180);
  doc.save(`${(eventTitle).toLowerCase().replace(/[^a-z0-9]/g, '-')}-overall-shield.pdf`);
};

export const exportOverallShieldCSV = ({ logData, settings }) => {
  if (!logData || !logData.leaderboard || logData.leaderboard.length === 0) return;
  const headers = ['Rank', 'Team', 'Code', 'Gold 1st', 'Silver 2nd', 'Bronze 3rd', 'Total Points'];
  const rows = logData.leaderboard.map((item, idx) => [
    idx + 1,
    item.name || item.code,
    item.code,
    item.gold_count || item.first_places || 0,
    item.silver_count || item.second_places || 0,
    item.bronze_count || item.third_places || 0,
    item.total_points
  ]);
  downloadCSV('overall-championship-shield', headers, rows);
};

// -------------------------------------------------------------
// 2. COMPLETE MATCH FIXTURES & RESULTS DOSSIER
// -------------------------------------------------------------
export const exportMatchResultsPDF = ({ fixtures, settings, filterSport = 'All' }) => {
  if (!fixtures || fixtures.length === 0) {
    alert('No fixtures available to export.');
    return;
  }

  const doc = createPdf();
  const orgName = settings?.org_name || 'FixtureGrid';
  const eventTitle = settings?.event_title || 'Tournament Championship';
  const subhead = filterSport !== 'All' ? `Sport Code: ${filterSport}` : 'All Completed & Scheduled Sporting Matches';

  drawReportHeader(doc, orgName, eventTitle, 'Official Match Results & Fixtures Dossier', subhead);

  const displayList = filterSport !== 'All' 
    ? fixtures.filter(f => (f.sport_name || f.sport) === filterSport)
    : fixtures;

  const headers = ['#', 'Round', 'Date / Time', 'Sport', 'Venue', 'Matchup', 'Score', 'Status'];
  const rows = displayList.map((f, idx) => {
    let timeStr = 'TBA';
    if (f.scheduled_at) {
      try {
        const d = new Date(f.scheduled_at);
        timeStr = d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
                  d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } catch {}
    }

    const matchup = `${f.team_a_name || f.team_a || 'TBD'} vs ${f.team_b_name || f.team_b || 'TBD'}`;
    const score = f.score_a !== null && f.score_b !== null ? `${f.score_a} - ${f.score_b}` : 'vs';

    return [
      idx + 1,
      f.round || `R${idx + 1}`,
      timeStr,
      f.sport_name || f.sport || '-',
      f.venue_name || f.venue || '-',
      matchup,
      score,
      (f.status || 'upcoming').toUpperCase()
    ];
  });

  runAutoTable(doc, {
    startY: 44,
    head: [headers],
    body: rows,
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 8 },
    styles: { fontSize: 7.5, cellPadding: 2.2 },
    columnStyles: {
      0: { halign: 'center', width: 10 },
      1: { halign: 'center', width: 22 },
      2: { width: 28 },
      3: { width: 22 },
      4: { width: 22 },
      6: { halign: 'center', fontStyle: 'bold', width: 16 },
      7: { halign: 'center', width: 18 }
    }
  });

  drawSignOffBlock(doc, doc.lastAutoTable?.finalY || 180);
  doc.save(`${(eventTitle).toLowerCase().replace(/[^a-z0-9]/g, '-')}-match-results.pdf`);
};

export const exportMatchResultsCSV = ({ fixtures }) => {
  if (!fixtures || fixtures.length === 0) return;
  const headers = ['Fixture ID', 'Round', 'Scheduled Time', 'Sport', 'Venue', 'Team A', 'Team B', 'Score A', 'Score B', 'Winner', 'Status'];
  const rows = fixtures.map(f => [
    f.id,
    f.round || '',
    f.scheduled_at || '',
    f.sport_name || f.sport || '',
    f.venue_name || f.venue || '',
    f.team_a_name || f.team_a || '',
    f.team_b_name || f.team_b || '',
    f.score_a !== null ? f.score_a : '',
    f.score_b !== null ? f.score_b : '',
    f.winner_name || f.winner_id || '',
    f.status || ''
  ]);
  downloadCSV('match-fixtures-results', headers, rows);
};

// -------------------------------------------------------------
// 3. SPORT-BY-SPORT STANDINGS & LEAGUE TABLES
// -------------------------------------------------------------
export const exportSportStandingsPDF = ({ sportsWithStandings, settings }) => {
  if (!sportsWithStandings || sportsWithStandings.length === 0) {
    alert('No sport standings available to export.');
    return;
  }

  const doc = createPdf();
  const orgName = settings?.org_name || 'FixtureGrid';
  const eventTitle = settings?.event_title || 'Tournament Championship';

  drawReportHeader(doc, orgName, eventTitle, 'Official Sport Standings & League Tables', 'Division Tables Across All Registered Sports');

  let currentY = 44;

  sportsWithStandings.forEach((sportItem, sportIndex) => {
    if (sportIndex > 0) {
      if (currentY > 210) {
        doc.addPage();
        currentY = 20;
      } else {
        currentY += 8;
      }
    }

    // Sport Title Header
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 99, 235);
    doc.text(`Sport: ${sportItem.sportName}`, 14, currentY);
    currentY += 4;

    const headers = ['Rank', 'Team', 'P', 'W', 'D', 'L', 'PF', 'PA', 'Diff', 'Pts'];
    const rows = (sportItem.standings || []).map((row, idx) => [
      `${idx + 1}`,
      row.name || row.code,
      row.played ?? 0,
      row.won ?? 0,
      row.drawn ?? 0,
      row.lost ?? 0,
      row.pf ?? 0,
      row.pa ?? 0,
      (row.pf ?? 0) - (row.pa ?? 0),
      row.points ?? row.pts ?? 0
    ]);

    runAutoTable(doc, {
      startY: currentY,
      head: [headers],
      body: rows,
      theme: 'striped',
      headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontSize: 8 },
      styles: { fontSize: 7.5, cellPadding: 2 },
      columnStyles: {
        0: { halign: 'center', width: 12 },
        1: { fontStyle: 'bold' },
        2: { halign: 'center', width: 10 },
        3: { halign: 'center', width: 10 },
        4: { halign: 'center', width: 10 },
        5: { halign: 'center', width: 10 },
        6: { halign: 'center', width: 12 },
        7: { halign: 'center', width: 12 },
        8: { halign: 'center', width: 12 },
        9: { halign: 'center', fontStyle: 'bold', width: 14 }
      }
    });

    currentY = doc.lastAutoTable?.finalY || currentY + 30;
  });

  drawSignOffBlock(doc, currentY);
  doc.save(`${(eventTitle).toLowerCase().replace(/[^a-z0-9]/g, '-')}-sport-standings.pdf`);
};

export const exportSportStandingsCSV = ({ sportsWithStandings }) => {
  if (!sportsWithStandings || sportsWithStandings.length === 0) return;
  const headers = ['Sport', 'Rank', 'Team', 'Played', 'Won', 'Drawn', 'Lost', 'Points For', 'Points Against', 'Diff', 'Total Points'];
  const rows = [];
  sportsWithStandings.forEach(sp => {
    (sp.standings || []).forEach((row, idx) => {
      rows.push([
        sp.sportName,
        idx + 1,
        row.name || row.code,
        row.played ?? 0,
        row.won ?? 0,
        row.drawn ?? 0,
        row.lost ?? 0,
        row.pf ?? 0,
        row.pa ?? 0,
        (row.pf ?? 0) - (row.pa ?? 0),
        row.points ?? row.pts ?? 0
      ]);
    });
  });
  downloadCSV('sport-standings-tables', headers, rows);
};

// -------------------------------------------------------------
// 4. ATHLETICS & AQUATICS MEET RESULTS DOSSIER
// -------------------------------------------------------------
export const exportAthleticsMeetPDF = ({ events, settings }) => {
  if (!events || events.length === 0) {
    alert('No athletics or aquatics events available to export.');
    return;
  }

  const doc = createPdf();
  const orgName = settings?.org_name || 'FixtureGrid';
  const eventTitle = settings?.event_title || 'Tournament Championship';

  drawReportHeader(doc, orgName, eventTitle, 'Official Athletics & Aquatics Meet Results Bulletin', 'Track, Field, Swimming & Placement Event Records');

  let currentY = 44;

  events.forEach((ev, evIndex) => {
    if (evIndex > 0) {
      if (currentY > 215) {
        doc.addPage();
        currentY = 20;
      } else {
        currentY += 8;
      }
    }

    // Event title banner
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    const catText = ev.category ? `(${ev.category})` : '';
    doc.text(`Event: ${ev.name} ${catText} — Status: ${(ev.status || 'upcoming').toUpperCase()}`, 14, currentY);
    currentY += 4;

    const headers = ['Placement', 'Athlete', 'Team / House', 'Result (Time/Dist)', 'Points Awarded'];
    const rows = (ev.results || []).map(r => {
      let resultText = '-';
      if (r.time_ms) {
        const totalSec = Math.floor(r.time_ms / 1000);
        const mins = Math.floor(totalSec / 60);
        const secs = totalSec % 60;
        const millis = Math.floor((r.time_ms % 1000) / 10);
        resultText = mins > 0 
          ? `${mins}:${String(secs).padStart(2, '0')}.${String(millis).padStart(2, '0')}`
          : `${secs}.${String(millis).padStart(2, '0')}s`;
      } else if (r.distance_m) {
        resultText = `${r.distance_m}m`;
      }

      let placeStr = r.placement ? `${r.placement}${r.placement === 1 ? 'st' : r.placement === 2 ? 'nd' : r.placement === 3 ? 'rd' : 'th'}` : '-';
      if (r.placement === 1) placeStr = '1st [Gold]';

      return [
        placeStr,
        r.athlete_name || '-',
        r.team_name || r.team_code || '-',
        resultText,
        r.points ? `+${r.points} pts` : '0 pts'
      ];
    });

    runAutoTable(doc, {
      startY: currentY,
      head: [headers],
      body: rows.length > 0 ? rows : [['-', 'No results logged yet', '-', '-', '-']],
      theme: 'grid',
      headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontSize: 8 },
      styles: { fontSize: 7.5, cellPadding: 2 },
      columnStyles: {
        0: { halign: 'center', fontStyle: 'bold', width: 25 },
        3: { halign: 'center', width: 35 },
        4: { halign: 'center', fontStyle: 'bold', width: 30 }
      }
    });

    currentY = doc.lastAutoTable?.finalY || currentY + 25;
  });

  drawSignOffBlock(doc, currentY);
  doc.save(`${(eventTitle).toLowerCase().replace(/[^a-z0-9]/g, '-')}-athletics-bulletin.pdf`);
};

export const exportAthleticsMeetCSV = ({ events }) => {
  if (!events || events.length === 0) return;
  const headers = ['Event Name', 'Category', 'Status', 'Placement', 'Athlete', 'Team', 'Time (ms)', 'Distance (m)', 'Points'];
  const rows = [];
  events.forEach(ev => {
    (ev.results || []).forEach(r => {
      rows.push([
        ev.name,
        ev.category || '',
        ev.status || '',
        r.placement || '',
        r.athlete_name || '',
        r.team_name || r.team_code || '',
        r.time_ms || '',
        r.distance_m || '',
        r.points || 0
      ]);
    });
  });
  downloadCSV('athletics-aquatics-results', headers, rows);
};

// -------------------------------------------------------------
// 5. TOP SCORERS & MVP HONORS REPORT
// -------------------------------------------------------------
export const exportTopScorersPDF = ({ scorers, settings }) => {
  if (!scorers || scorers.length === 0) {
    alert('No player scoring statistics available to export.');
    return;
  }

  const doc = createPdf();
  const orgName = settings?.org_name || 'FixtureGrid';
  const eventTitle = settings?.event_title || 'Tournament Championship';

  drawReportHeader(doc, orgName, eventTitle, 'Official Player Scoring Honors & Golden Boot Leaders', 'Top Individual Performers Ranked by Points / Goals');

  const headers = ['Rank', 'Player Name', 'Jersey #', 'Team / House', 'Sport', 'Matches Logged', 'Points / Goals'];
  const rows = scorers.map((s, idx) => [
    idx === 0 ? '1st [Golden Boot]' : `${idx + 1}`,
    s.player_name || s.name || 'Athlete',
    s.jersey_number || '-',
    s.team_name || s.team_code || '-',
    s.sport_name || '-',
    s.matches_played || '-',
    s.total_points || s.points || 0
  ]);

  runAutoTable(doc, {
    startY: 44,
    head: [headers],
    body: rows,
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 8.5 },
    styles: { fontSize: 8, cellPadding: 2.5 },
    columnStyles: {
      0: { halign: 'center', fontStyle: 'bold', width: 35 },
      2: { halign: 'center', width: 20 },
      5: { halign: 'center', width: 28 },
      6: { halign: 'center', fontStyle: 'bold', width: 28 }
    }
  });

  drawSignOffBlock(doc, doc.lastAutoTable?.finalY || 180);
  doc.save(`${(eventTitle).toLowerCase().replace(/[^a-z0-9]/g, '-')}-top-scorers.pdf`);
};

export const exportTopScorersCSV = ({ scorers }) => {
  if (!scorers || scorers.length === 0) return;
  const headers = ['Rank', 'Player Name', 'Jersey #', 'Team', 'Sport', 'Total Points / Goals'];
  const rows = scorers.map((s, idx) => [
    idx + 1,
    s.player_name || s.name || '',
    s.jersey_number || '',
    s.team_name || s.team_code || '',
    s.sport_name || '',
    s.total_points || s.points || 0
  ]);
  downloadCSV('top-scorers-honors', headers, rows);
};

// -------------------------------------------------------------
// 6. SCOREKEEPER AUDIT TRAIL
// -------------------------------------------------------------
export const exportAuditTrailCSV = ({ logs }) => {
  if (!logs || logs.length === 0) {
    alert('No scorekeeper audit logs available.');
    return;
  }
  const headers = ['Timestamp', 'Sport', 'Round', 'Matchup', 'Previous Score', 'Updated Score', 'Official Name', 'Official Email'];
  const rows = logs.map(l => [
    l.changed_at ? new Date(l.changed_at).toISOString() : '',
    l.sport_name || '',
    l.round || '',
    `${l.team_a_name || ''} vs ${l.team_b_name || ''}`,
    `${l.old_score_a ?? '-'} - ${l.old_score_b ?? '-'}`,
    `${l.new_score_a ?? '-'} - ${l.new_score_b ?? '-'}`,
    l.changed_by_name || '',
    l.changed_by_email || ''
  ]);
  downloadCSV('scorekeeper-audit-log', headers, rows);
};

// -------------------------------------------------------------
// 7. INDIVIDUAL SCHOOL DELEGATION REPORT CARD
// -------------------------------------------------------------
export const exportTeamDelegationPDF = ({ team, fixtures, athleticsEvents, logData, settings }) => {
  if (!team) return;
  const doc = createPdf();
  const orgName = settings?.org_name || 'FixtureGrid';
  const eventTitle = settings?.event_title || 'Tournament Championship';

  drawReportHeader(doc, orgName, eventTitle, `Official Delegation Performance Dossier: ${team.name} (${team.code})`, 'Comprehensive School Report Card Across All Sporting Disciplines');

  // Match Fixtures stats
  const teamFixtures = (fixtures || []).filter(f => 
    f.team_a_id === team.id || 
    f.team_b_id === team.id || 
    (f.team_a_code && team.code && f.team_a_code.toUpperCase() === team.code.toUpperCase()) || 
    (f.team_b_code && team.code && f.team_b_code.toUpperCase() === team.code.toUpperCase())
  );
  const played = teamFixtures.filter(f => f.status === 'completed' || f.status === 'draw');
  const won = played.filter(f => f.winner_id === team.id);
  const drawn = played.filter(f => f.status === 'draw');
  const lost = played.filter(f => f.winner_id && f.winner_id !== team.id);

  // Athletics / Swimming Meet Results
  const teamAthleticsResults = [];
  (athleticsEvents || []).forEach(ev => {
    (ev.results || []).forEach(r => {
      const matchTeam = (r.team_id && r.team_id === team.id) || 
                         (r.team_code && team.code && r.team_code.toUpperCase() === team.code.toUpperCase()) ||
                         (r.team_name && team.name && r.team_name.toLowerCase() === team.name.toLowerCase());
      if (matchTeam) {
        teamAthleticsResults.push({
          eventName: ev.name || 'Event',
          category: ev.category || '',
          sportName: ev.sport_name || 'Athletics/Aquatics',
          athleteName: r.athlete_name || 'Team Entry',
          placement: r.placement,
          time_ms: r.time_ms,
          distance_m: r.distance_m,
          points: r.points || 0
        });
      }
    });
  });

  const goldCount = teamAthleticsResults.filter(r => r.placement === 1).length;
  const silverCount = teamAthleticsResults.filter(r => r.placement === 2).length;
  const bronzeCount = teamAthleticsResults.filter(r => r.placement === 3).length;
  const totalPlacementPts = teamAthleticsResults.reduce((acc, r) => acc + (Number(r.points) || 0), 0);

  // Overall Standings info
  const teamOverall = (logData?.leaderboard || logData || []).find(l => 
    (l.code && team.code && l.code.toUpperCase() === team.code.toUpperCase()) ||
    (l.id && l.id === team.id) ||
    (l.name && team.name && l.name.toLowerCase() === team.name.toLowerCase())
  );

  const totalPoints = teamOverall ? (teamOverall.total ?? teamOverall.total_points ?? teamOverall.points ?? totalPlacementPts) : totalPlacementPts;
  const overallRank = teamOverall?.rank || ((logData?.leaderboard || logData || []).indexOf(teamOverall) >= 0 ? (logData?.leaderboard || logData || []).indexOf(teamOverall) + 1 : null);

  const hasMatches = teamFixtures.length > 0;
  const hasPlacements = teamAthleticsResults.length > 0;

  // Header Summary Card
  doc.setFillColor(248, 250, 252); // Slate-50
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.roundedRect(14, 43, 182, 22, 2, 2, 'FD');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  const rankStr = overallRank ? `Rank #${overallRank} — ` : '';
  doc.text(`Championship Standing: ${rankStr}${totalPoints} Total Points Accumulated`, 20, 51);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);

  let summaryLine = '';
  if (hasPlacements && !hasMatches) {
    summaryLine = `Events Contested: ${teamAthleticsResults.length}   |   Gold: ${goldCount} [1st]   |   Silver: ${silverCount} [2nd]   |   Bronze: ${bronzeCount} [3rd]`;
  } else if (hasMatches && !hasPlacements) {
    summaryLine = `Matches Contested: ${played.length}   |   Won: ${won.length}   |   Drawn: ${drawn.length}   |   Lost: ${lost.length}`;
  } else {
    summaryLine = `Matches: ${played.length} (W:${won.length} D:${drawn.length} L:${lost.length})   |   Events: ${teamAthleticsResults.length} (🥇${goldCount} 🥈${silverCount} 🥉${bronzeCount})`;
  }
  doc.text(summaryLine, 20, 59);

  let currentY = 70;

  // 1. Athletics & Swimming Meet Results Section (if available)
  if (hasPlacements) {
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Athletics & Aquatics Meet Performance Bulletin', 14, currentY);
    currentY += 4;

    const athHeaders = ['#', 'Event / Race', 'Cat', 'Competitor / Athlete', 'Place', 'Result (Time/Dist)', 'Points'];
    const athRows = teamAthleticsResults.map((r, idx) => {
      let resultText = '-';
      if (r.time_ms) {
        const totalSec = Math.floor(r.time_ms / 1000);
        const mins = Math.floor(totalSec / 60);
        const secs = totalSec % 60;
        const millis = Math.floor((r.time_ms % 1000) / 10);
        resultText = mins > 0 
          ? `${mins}:${String(secs).padStart(2, '0')}.${String(millis).padStart(2, '0')}`
          : `${secs}.${String(millis).padStart(2, '0')}s`;
      } else if (r.distance_m) {
        resultText = `${r.distance_m}m`;
      }

      let placeStr = r.placement ? `${r.placement}${r.placement === 1 ? 'st' : r.placement === 2 ? 'nd' : r.placement === 3 ? 'rd' : 'th'}` : '-';
      if (r.placement === 1) placeStr = '1st [Gold]';
      else if (r.placement === 2) placeStr = '2nd [Silver]';
      else if (r.placement === 3) placeStr = '3rd [Bronze]';

      return [
        idx + 1,
        r.eventName,
        r.category || '-',
        r.athleteName,
        placeStr,
        resultText,
        r.points ? `+${r.points} pts` : '0 pts'
      ];
    });

    runAutoTable(doc, {
      startY: currentY,
      head: [athHeaders],
      body: athRows,
      theme: 'grid',
      headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontSize: 8 },
      styles: { fontSize: 7.5, cellPadding: 2 },
      columnStyles: {
        0: { halign: 'center', width: 10 },
        4: { halign: 'center', fontStyle: 'bold', width: 25 },
        5: { halign: 'center', width: 28 },
        6: { halign: 'center', fontStyle: 'bold', width: 22 }
      }
    });

    currentY = (doc.lastAutoTable?.finalY || currentY + 30) + 10;
  }

  // 2. Ball / Match Sports Fixtures Section (if available)
  if (hasMatches || !hasPlacements) {
    if (currentY > 220) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Tournament Match Schedule & Official Results', 14, currentY);
    currentY += 4;

    const headers = ['#', 'Sport', 'Round', 'Opponent', 'Result', 'Final Score', 'Venue'];
    const rows = teamFixtures.map((f, idx) => {
      const isTeamA = f.team_a_id === team.id || (f.team_a_code && team.code && f.team_a_code.toUpperCase() === team.code.toUpperCase());
      const opponent = isTeamA ? (f.team_b_name || f.team_b) : (f.team_a_name || f.team_a);
      const myScore = isTeamA ? f.score_a : f.score_b;
      const oppScore = isTeamA ? f.score_b : f.score_a;

      let result = 'Scheduled';
      if (f.status === 'completed' || f.status === 'draw') {
        if (f.winner_id === team.id) result = 'WIN';
        else if (f.status === 'draw') result = 'DRAW';
        else result = 'LOSS';
      }

      const scoreStr = myScore !== null && oppScore !== null ? `${myScore} - ${oppScore}` : 'vs';

      return [
        idx + 1,
        f.sport_name || f.sport || '-',
        f.round || '-',
        opponent || '-',
        result,
        scoreStr,
        f.venue_name || f.venue || '-'
      ];
    });

    runAutoTable(doc, {
      startY: currentY,
      head: [headers],
      body: rows.length > 0 ? rows : [['-', 'No match fixtures recorded for this team', '-', '-', '-', '-', '-']],
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 8 },
      styles: { fontSize: 7.5, cellPadding: 2.2 },
      columnStyles: {
        0: { halign: 'center', width: 10 },
        4: { halign: 'center', fontStyle: 'bold', width: 20 },
        5: { halign: 'center', fontStyle: 'bold', width: 22 }
      }
    });

    currentY = doc.lastAutoTable?.finalY || currentY + 30;
  }

  drawSignOffBlock(doc, currentY);
  doc.save(`${(team.code || team.name || 'team').toLowerCase().replace(/[^a-z0-9]/g, '-')}-delegation-dossier.pdf`);
};

// -------------------------------------------------------------
// 8. MASTER ALL-IN-ONE POST-TOURNAMENT PACK (Combined PDF)
// -------------------------------------------------------------
export const exportMasterTournamentPack = ({ settings, logData, fixtures, sportsWithStandings, athleticsEvents, topScorers }) => {
  const doc = createPdf();
  const orgName = settings?.org_name || 'FixtureGrid';
  const eventTitle = settings?.event_title || 'Tournament Championship';

  // PAGE 1: Executive Summary & Overall Championship
  drawReportHeader(doc, orgName, eventTitle, 'Official Post-Tournament Master Dossier', 'Volume 1: Complete Executive Results, League Standings & Records');

  const champion = logData?.leaderboard?.[0];
  if (champion) {
    doc.setFillColor(239, 246, 255);
    doc.setDrawColor(191, 219, 254);
    doc.roundedRect(14, 43, 182, 18, 3, 3, 'FD');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 58, 138);
    doc.text(`TOURNAMENT CHAMPION: ${champion.name || champion.code} (${champion.total_points} PTS)`, 20, 52);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(37, 99, 235);
    doc.text(`Official aggregate shield winner across all sporting codes`, 20, 57);
  }

  if (logData?.leaderboard?.length > 0) {
    const shieldHeaders = ['Rank', 'Team / House', 'Code', 'Gold 1st', 'Silver 2nd', 'Bronze 3rd', 'Total Points'];
    const shieldRows = logData.leaderboard.map((item, idx) => [
      idx === 0 ? '1st [C]' : `${idx + 1}`,
      item.name || item.code,
      item.code,
      item.gold_count || item.first_places || 0,
      item.silver_count || item.second_places || 0,
      item.bronze_count || item.third_places || 0,
      item.total_points
    ]);

    runAutoTable(doc, {
      startY: 66,
      head: [shieldHeaders],
      body: shieldRows,
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 8.5 },
      styles: { fontSize: 8, cellPadding: 2.2 }
    });
  }

  // PAGE 2: Sport League Standings
  if (sportsWithStandings && sportsWithStandings.length > 0) {
    doc.addPage();
    drawReportHeader(doc, orgName, eventTitle, 'Section II: Sport-by-Sport League Tables');

    let currentY = 44;
    sportsWithStandings.forEach((sp, idx) => {
      if (idx > 0 && currentY > 210) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(37, 99, 235);
      doc.text(`Sport: ${sp.sportName}`, 14, currentY);
      currentY += 4;

      const spHeaders = ['Rank', 'Team', 'P', 'W', 'D', 'L', 'PF', 'PA', 'Diff', 'Pts'];
      const spRows = (sp.standings || []).map((row, rIdx) => [
        `${rIdx + 1}`,
        row.name || row.code,
        row.played ?? 0,
        row.won ?? 0,
        row.drawn ?? 0,
        row.lost ?? 0,
        row.pf ?? 0,
        row.pa ?? 0,
        (row.pf ?? 0) - (row.pa ?? 0),
        row.points ?? row.pts ?? 0
      ]);

      runAutoTable(doc, {
        startY: currentY,
        head: [spHeaders],
        body: spRows,
        theme: 'striped',
        headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontSize: 7.5 },
        styles: { fontSize: 7, cellPadding: 1.8 }
      });

      currentY = doc.lastAutoTable?.finalY + 8;
    });
  }

  // PAGE 3: Match Fixtures Ledger
  if (fixtures && fixtures.length > 0) {
    doc.addPage();
    drawReportHeader(doc, orgName, eventTitle, 'Section III: Complete Match Fixtures & Scores');

    const fixHeaders = ['#', 'Round', 'Sport', 'Venue', 'Matchup', 'Score', 'Status'];
    const fixRows = fixtures.map((f, idx) => [
      idx + 1,
      f.round || `R${idx + 1}`,
      f.sport_name || f.sport || '-',
      f.venue_name || f.venue || '-',
      `${f.team_a_name || f.team_a || 'TBD'} vs ${f.team_b_name || f.team_b || 'TBD'}`,
      f.score_a !== null && f.score_b !== null ? `${f.score_a} - ${f.score_b}` : 'vs',
      (f.status || 'upcoming').toUpperCase()
    ]);

    runAutoTable(doc, {
      startY: 44,
      head: [fixHeaders],
      body: fixRows,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 7.5 },
      styles: { fontSize: 7, cellPadding: 2 }
    });
  }

  // Final Sign-off on last page
  drawSignOffBlock(doc, doc.lastAutoTable?.finalY || 180);

  doc.save(`${(eventTitle).toLowerCase().replace(/[^a-z0-9]/g, '-')}-master-tournament-pack.pdf`);
};
