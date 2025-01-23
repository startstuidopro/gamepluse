import React from 'react';
import { Clock, DollarSign, User, Gamepad2 } from 'lucide-react';
import { Session } from '../types';

interface SessionSummaryProps {
  session: Session;
}

export default function SessionSummary({ session }: SessionSummaryProps) {
  const startTime = new Date(session.startTime);
  const endTime = new Date(session.endTime!);
  const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000); // in seconds

  const formatTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="mt-4 p-4 bg-slate-700/50 rounded-lg space-y-2 border border-slate-600">
      <h4 className="text-white font-medium mb-3">Last Session Summary</h4>
      
      <div className="flex items-center gap-2 text-slate-300">
        <User className="h-4 w-4" />
        <span>User: {session.userId}</span>
      </div>

      <div className="flex items-center gap-2 text-slate-300">
        <Clock className="h-4 w-4" />
        <span>Duration: {formatTime(duration)}</span>
      </div>

      <div className="flex items-center gap-2 text-slate-300">
        <Gamepad2 className="h-4 w-4" />
        <span>Game: {session.game?.name}</span>
      </div>

      <div className="flex items-center gap-2 text-green-400 font-medium">
        <DollarSign className="h-4 w-4" />
        <span>Total Cost: ${session.totalAmount?.toFixed(2)}</span>
      </div>

      {session.userMembershipType === 'premium' && (
        <div className="text-xs text-purple-400">
          Premium discount applied: {(session.discountRate * 100)}% off
        </div>
      )}
    </div>
  );
}