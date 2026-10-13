import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Helper to instantiate jsPDF safely across bundler variations
const createPdf = () => {
  if (typeof jsPDF === 'function') {
    return new jsPDF();
  }
  if (jsPDF && typeof jsPDF.default === 'function') {
    return new jsPDF.default();
  }
  return new jsPDF();
};

const setupPdfDoc = (orgName, eventTitle, reportTitle) => {
  const doc = createPdf();
  const today = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  // Header Title
  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59); // Slate-800
  doc.text(orgName || 'Sports Manager', 14, 15);
  
  doc.setFontSize(13);
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.text(eventTitle || 'Tournament Event', 14, 23);

  // Report Title and Date
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42); // Slate-900
  doc.text(reportTitle, 14, 32);
  
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184); // Slate-400
  doc.text(`Generated: ${today}`, 196, 32, { align: 'right' });

  return doc;
};

// Safe wrapper for autoTable
const renderTable = (doc, options) => {
  if (typeof autoTable === 'function') {
    autoTable(doc, options);
  } else if (autoTable && typeof autoTable.default === 'function') {
    autoTable.default(doc, options);
  } else if (typeof doc.autoTable === 'function') {
    doc.autoTable(options);
  } else {
    throw new Error('AutoTable plugin could not be initialized');
  }
};

export const exportFixturesToPDF = (fixtures, settings) => {
  if (!fixtures || fixtures.length === 0) {
    alert('No fixtures available to export.');
    return;
  }

  try {
    const doc = setupPdfDoc(settings?.org_name, settings?.event_title, 'Match Fixtures & Official Schedule');

    const tableColumn = ["#", "Round", "Time", "Sport", "Venue", "Matchup / Event", "Score", "Status"];
    const tableRows = [];

    fixtures.forEach((fixture, index) => {
      let formattedTime = 'TBA';
      if (fixture.scheduled_at) {
        try {
          const d = new Date(fixture.scheduled_at);
          formattedTime = d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + 
                          d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch {
          formattedTime = String(fixture.scheduled_at).substring(0, 16);
        }
      } else if (fixture.time) {
        formattedTime = String(fixture.time);
      }

      const round = fixture.round || `R${index + 1}`;
      const sport = fixture.sport_name || fixture.sport || 'General';
      const venue = fixture.venue_name || fixture.venue || 'TBA';
      
      const matchup = fixture.team_b_name
        ? `${fixture.team_a_name || fixture.team_a || 'TBD'} vs ${fixture.team_b_name || fixture.team_b || 'TBD'}`
        : (fixture.team_a_name || fixture.name || fixture.team_a || 'Event');

      const score = fixture.score_a !== null && fixture.score_a !== undefined
        ? `${fixture.score_a} - ${fixture.score_b ?? 0}`
        : (fixture.status === 'completed' ? 'Done' : 'vs');

      const status = (fixture.status || 'upcoming').toUpperCase();

      tableRows.push([index + 1, round, formattedTime, sport, venue, matchup, score, status]);
    });

    renderTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 37,
      theme: 'grid',
      headStyles: { 
        fillColor: [37, 99, 235], // Blue-600
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: 'bold'
      },
      styles: { 
        fontSize: 8.5,
        cellPadding: 2.5
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252] // Slate-50
      }
    });

    const filename = `${(settings?.org_name || 'fixtures').toLowerCase().replace(/\s+/g, '_')}_schedule.pdf`;
    doc.save(filename);
  } catch (err) {
    console.error('Failed to export PDF:', err);
    alert('Failed to generate PDF: ' + (err.message || 'Unknown error'));
  }
};

export const exportFixturesToCSV = (fixtures, settings) => {
  if (!fixtures || fixtures.length === 0) {
    alert('No fixtures available to export.');
    return;
  }

  try {
    const headers = ['#', 'Round', 'Scheduled Time', 'Sport', 'Venue', 'Team A', 'Team B', 'Score A', 'Score B', 'Status'];
    const rows = fixtures.map((f, i) => {
      let timeStr = f.scheduled_at ? new Date(f.scheduled_at).toLocaleString() : (f.time || '');
      return [
        i + 1,
        `"${f.round || ''}"`,
        `"${timeStr}"`,
        `"${f.sport_name || f.sport || ''}"`,
        `"${f.venue_name || f.venue || ''}"`,
        `"${f.team_a_name || f.team_a || ''}"`,
        `"${f.team_b_name || f.team_b || ''}"`,
        f.score_a !== null && f.score_a !== undefined ? f.score_a : '',
        f.score_b !== null && f.score_b !== undefined ? f.score_b : '',
        `"${f.status || 'upcoming'}"`
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const filename = `${(settings?.org_name || 'fixtures').toLowerCase().replace(/\s+/g, '_')}_schedule.csv`;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error('Failed to export CSV:', err);
    alert('Failed to export CSV: ' + err.message);
  }
};

export const exportStandingsToPDF = (standings, settings, currentSport) => {
  if (!standings || standings.length === 0) {
    alert('No standings available to export.');
    return;
  }

  try {
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

    renderTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 37,
      theme: 'striped',
      headStyles: { 
        fillColor: [147, 51, 234], // Purple-600
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: 'bold'
      },
      styles: { 
        fontSize: 8.5,
        cellPadding: 2.5
      }
    });

    const filename = `${(currentSport || 'tournament').toLowerCase().replace(/\s+/g, '_')}_standings.pdf`;
    doc.save(filename);
  } catch (err) {
    console.error('Failed to export Standings PDF:', err);
    alert('Failed to generate Standings PDF: ' + (err.message || 'Unknown error'));
  }
};
