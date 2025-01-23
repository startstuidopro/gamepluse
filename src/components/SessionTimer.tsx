import { useState, useEffect } from 'react';
import { Clock, DollarSign } from 'lucide-react';
import { Session } from '../types';

interface SessionTimerProps {
  session: Session;
}

export default function SessionTimer({ session }: SessionTimerProps) {
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [currentCost, setCurrentCost] = useState<number>(0);

  useEffect(() => {
    const startTime = new Date(session.start_time).getTime();
    
    const updateTimer = () => {
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000); // elapsed seconds
      setElapsedTime(elapsed);
      
      // Calculate cost based on elapsed minutes and base price
      const elapsedMinutes = elapsed / 60;
      const cost = elapsedMinutes * session.base_price * (1 - session.discount_rate);
      setCurrentCost(cost);
    };

    // Update immediately and then every second
    updateTimer();
    const intervalId = setInterval(updateTimer, 1000);

    return () => clearInterval(intervalId);
  }, [session]);

  const formatTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-slate-300">
        <Clock className="h-4 w-4" />
        <span>Time Elapsed: {formatTime(elapsedTime)}</span>
      </div>
      <div className="flex items-center gap-2 text-green-400">
        <DollarSign className="h-4 w-4" />
        <span>Current Cost: ${currentCost.toFixed(2)}</span>
      </div>
      {session.discount_rate > 0 && (
        <div className="text-xs text-purple-400">
          Discount applied: {(session.discount_rate * 100)}% off
        </div>
      )}
    </div>
  );
}