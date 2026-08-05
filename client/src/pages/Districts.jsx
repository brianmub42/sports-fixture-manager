import { useState, useEffect, useRef } from 'react';
import { useDistrictSchedule, useDistricts } from '../hooks/useFixtures.js';
import SportTag from '../components/SportTag.jsx';
import TeamPill from '../components/TeamPill.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { uploadApi } from '../api.js';
import { useQueryClient } from '@tanstack/react-query';
import { Upload, Image as ImageIcon } from 'lucide-react';

export default function Districts() {
  const { data: districtList, isLoading: districtsLoading } = useDistricts();
  const [selected, setSelected] = useState('');
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

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

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      await uploadApi.uploadLogo(currentDistrict.code, file);
      // Invalidate queries to refresh the logo everywhere
      queryClient.invalidateQueries({ queryKey: ['districts'] });
      queryClient.invalidateQueries({ queryKey: ['fixtures'] });
      queryClient.invalidateQueries({ queryKey: ['districtSchedule', currentDistrict.code] });
    } catch (err) {
      alert('Failed to upload logo: ' + (err.response?.data?.error || err.message));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

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

      <div className="k-card mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative group shrink-0">
            {currentDistrict.logo_url ? (
              <img src={currentDistrict.logo_url} alt={currentDistrict.name} className="w-16 h-16 rounded-xl object-cover bg-gray-50 dark:bg-gray-800" />
            ) : (
              <div 
                className="w-16 h-16 rounded-xl flex items-center justify-center text-white text-xl font-bold shadow-sm"
                style={{ backgroundColor: currentDistrict.color || '#2563eb' }}
              >
                {currentDistrict.code}
              </div>
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold">{currentDistrict.name}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Team / District Profile</p>
          </div>
        </div>
        
        {isAdmin && (
          <div>
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleLogoUpload}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="k-btn bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center gap-2 text-sm disabled:opacity-50"
            >
              <Upload size={14} className={uploading ? 'animate-bounce' : ''} />
              <span className="hidden sm:inline">{uploading ? 'Uploading...' : 'Change Logo'}</span>
            </button>
          </div>
        )}
      </div>

      <div className="k-card">
        <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
          <ImageIcon size={16} />
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
              const opponentLogo = f.team_a_code === selected ? f.team_b_logo : f.team_a_logo;
              const isAll = f.team_b_name === 'All Districts';
              return (
                <div key={f.id} className="flex items-center gap-3 py-2 border-b border-gray-100 dark:border-gray-800/50 text-sm">
                  <span className="w-20 text-xs text-gray-400">{f.time || f.scheduled_at?.slice(11, 16)}</span>
                  <span className="w-24 font-medium">{f.sport_name}</span>
                  <span className="w-24 text-gray-500">{f.venue_name}</span>
                  <span className="flex-1">
                    {isAll ? 'All Districts' : (
                      <TeamPill code={opponent} name={opponentName} color={opponentColor} logoUrl={opponentLogo} />
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
