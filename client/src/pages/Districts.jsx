import { useState, useEffect } from 'react';
import { useDistrictSchedule, useDistricts } from '../hooks/useFixtures.js';
import SportTag from '../components/SportTag.jsx';

export default function Districts() {
  const { data: districtList, isLoading: districtsLoading } = useDistricts();
  const [selected, setSelected] = useState('');

  // Automatically select the first district when loaded
  useEffect(() => {
    if (districtList && districtList.length > 0 && !selected) {
      setSelected(districtList[0].code);
    }
  }, [districtList, selected]);

  const { data: schedule, isLoading: scheduleLoading } = useDistrictSchedule(selected);

  if (districtsLoading) {
    return <div className="text-center py-8 text-gray-400">Loading teams...</div>;
  }

  if (!districtList || districtList.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        No teams found. Go to the Generator page to create fixtures and register teams.
      </div>
    );
  }

  const currentDistrict = districtList.find(d => d.code === selected) || districtList[0];

  return (
    <div>
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="mb-4 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
      >
        {districtList.map(d => (
          <option key={d.code} value={d.code}>{d.name} ({d.code})</option>
        ))}
      </select>

      <div className="k-card">
        <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
          {currentDistrict.name} ({selected}) — Personal Schedule
        </div>
        {scheduleLoading ? (
          <div className="text-center py-8 text-gray-400">Loading schedule...</div>
        ) : (
          <div className="max-h-[500px] overflow-y-auto pr-2 space-y-1">
            {schedule?.map(f => {
              const opponent = f.team_a_code === selected ? f.team_b_code : f.team_a_code;
              const opponentName = f.team_a_code === selected ? f.team_b_name : f.team_a_name;
              const opponentColor = f.team_a_code === selected ? f.team_b_color : f.team_a_color;
              const isAll = f.team_b_name === 'All Districts';
              return (
                <div key={f.id} className="flex items-center gap-3 py-2 border-b border-gray-100 dark:border-gray-800/50 text-sm">
                  <span className="w-20 text-xs text-gray-400">{f.time || f.scheduled_at?.slice(11, 16)}</span>
                  <span className="w-24 font-medium">{f.sport_name}</span>
                  <span className="w-24 text-gray-500">{f.venue_name}</span>
                  <span className="flex-1">
                    {isAll ? 'All Districts' : (
                      <span className="inline-flex items-center gap-1.5">
                        <span 
                          style={{ backgroundColor: opponentColor || '#6b7280' }}
                          className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                        >
                          {opponent}
                        </span>
                        {opponentName}
                      </span>
                    )}
                  </span>
                  {f.notes && <span className="text-xs text-gray-400">{f.notes}</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
