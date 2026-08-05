import { useState, useEffect } from 'react';
import { useTimers } from '../contexts/TimerContext.jsx';
import { Clock } from 'lucide-react';

export default function MatchTimerDisplay({ fixtureId, defaultMinutes = 10, className = "" }) {
  const { timers } = useTimers();
  const timerState = timers[fixtureId];

  const [localTime, setLocalTime] = useState(defaultMinutes * 60);

  useEffect(() => {
    if (timerState) {
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

  const mins = Math.floor(localTime / 60).toString().padStart(2, '0');
  const secs = (localTime % 60).toString().padStart(2, '0');
  const isLowTime = localTime <= 60 && localTime > 0;

  if (!timerState) return null;

  return (
    <div className={`flex items-center justify-center gap-2 font-mono font-bold tracking-tighter ${isLowTime ? 'text-red-500 animate-pulse' : 'text-amber-400'} ${className}`}>
      <Clock size={20} className={isLowTime ? 'animate-bounce' : ''} />
      {mins}:{secs}
    </div>
  );
}
