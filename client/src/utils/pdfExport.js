import jsPDF from 'jspdf';
import 'jspdf-autotable';

const setupPdfDoc = (orgName, eventTitle, reportTitle) => {
  const doc = new jsPDF();
  const today = new Date().toLocaleDateString();

  // Header Title
  doc.setFontSize(18);
  doc.text(orgName || 'Sports Manager', 14, 15);
  
  doc.setFontSize(14);
  doc.setTextColor(100);
  doc.text(eventTitle || 'Tournament Event', 14, 23);

  // Report Title and Date
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text(reportTitle, 14, 33);
  
  doc.setFontSize(10);
  doc.setTextColor(150);
  doc.text(`Generated: ${today}`, 170, 33, { align: 'right' });

  return doc;
};

export const exportFixturesToPDF = (fixtures, settings) => {
  const doc = setupPdfDoc(settings?.org_name, settings?.event_title, 'Match Fixtures & Schedule');

  const tableColumn = ["Time", "Sport", "Venue", "Match", "Score", "Status"];
  const tableRows = [];

  fixtures.forEach(fixture => {
    const time = fixture.time || fixture.scheduled_at || 'TBA';
    const sport = fixture.sport_name;
    const venue = fixture.venue_name;
    const match = `${fixture.team_a_name} vs ${fixture.team_b_name}`;
    const score = fixture.score_a !== null ? `${fixture.score_a} - ${fixture.score_b}` : 'v';
    const status = fixture.status.toUpperCase();

    tableRows.push([time, sport, venue, match, score, status]);
  });

  doc.autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: 38,
    theme: 'grid',
    headStyles: { fillColor: [37, 99, 235] }, // Blue-600
    styles: { fontSize: 9 }
  });

  doc.save('fixtures_schedule.pdf');
};

export const exportStandingsToPDF = (standings, settings, currentSport) => {
  const sportName = currentSport ? `${currentSport} Standings` : 'Overall Standings';
  const doc = setupPdfDoc(settings?.org_name, settings?.event_title, sportName);

  const isPlacement = standings.length > 0 && standings[0].gold !== undefined;

  const tableColumn = isPlacement
    ? ["Rank", "Team", "Events", "1st (Gold)", "2nd (Silver)", "3rd (Bronze)", "Points"]
    : ["Rank", "Team", "Played", "Won", "Draw", "Loss", "GF", "GA", "GD", "Points"];

  const tableRows = standings.map((team, index) => {
    if (isPlacement) {
      return [
        index + 1,
        team.name || team.team_name || team.district_name,
        team.played,
        team.gold || team.won || 0,
        team.silver || 0,
        team.bronze || 0,
        team.points
      ];
    } else {
      const gf = team.goals_for !== undefined ? team.goals_for : (team.pf !== undefined ? team.pf : 0);
      const ga = team.goals_against !== undefined ? team.goals_against : (team.pa !== undefined ? team.pa : 0);
      const gd = team.goal_difference !== undefined ? team.goal_difference : (Number(gf) - Number(ga));
      return [
        index + 1,
        team.name || team.team_name || team.district_name,
        team.played,
        team.won,
        team.drawn,
        team.lost,
        gf,
        ga,
        gd,
        team.points
      ];
    }
  });

  doc.autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: 38,
    theme: 'striped',
    headStyles: { fillColor: [147, 51, 234] }, // Purple-600
    styles: { fontSize: 9 }
  });

  doc.save('tournament_standings.pdf');
};
