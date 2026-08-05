import { useState, useEffect } from 'react';
import { useTimers } from '../contexts/TimerContext.jsx';
import { Play, Pause, RotateCcw } from 'lucide-react';

export default function MatchTimerControl({ fixtureId, defaultMinutes = 10 }) {
  const { timers, broadcastTimer } = useTimers();
  const timerState = timers[fixtureId];

  const [localTime, setLocalTime] = useState(defaultMinutes * 60);

  useEffect(() => {
    if (timerState) {
      // Calculate elapsed time since last sync if it is running
      let time = timerState.timeRemaining;
      if (timerState.isRunning) {
        const elapsed = Math.floor((Date.now() - timerState.updatedAt) / 1000);
        time = Math.max(0, time - elapsed);
      }
      setLocalTime(time);
    }
  }, [timerState]);

  useEffect(() => {
    if (timerState?.isRunning && localTime > 0) {
      const interval = setInterval(() => {
        setLocalTime(t => Math.max(0, t - 1));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timerState?.isRunning, localTime]);

  const toggleTimer = () => {
    const isRunning = !timerState?.isRunning;
    broadcastTimer(fixtureId, localTime, isRunning);
  };

  const resetTimer = () => {
    broadcastTimer(fixtureId, defaultMinutes * 60, false);
  };

  const mins = Math.floor(localTime / 60).toString().padStart(2, '0');
  const secs = (localTime % 60).toString().padStart(2, '0');

  return (
    <div className="flex flex-col items-center gap-2 bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 w-full mt-4">
      <div className="font-mono text-3xl font-bold tracking-tighter">
        {mins}:{secs}
      </div>
      <div className="flex gap-2">
        <button 
          onClick={toggleTimer}
          className={`flex items-center gap-1 px-3 py-1.5 rounded font-medium text-xs text-white ${timerState?.isRunning ? 'bg-amber-500 hover:bg-amber-600' : 'bg-green-500 hover:bg-green-600'}`}
        >
          {timerState?.isRunning ? <><Pause size={14} /> Pause</> : <><Play size={14} /> Start</>}
        </button>
        <button 
          onClick={resetTimer}
          className="flex items-center gap-1 px-3 py-1.5 rounded font-medium text-xs bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
        >
          <RotateCcw size={14} /> Reset
        </button>
      </div>
    </div>
  );
}
