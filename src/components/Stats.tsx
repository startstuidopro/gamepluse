import React from 'react';
import { Users, Clock, DollarSign, Power } from 'lucide-react';

export default function Stats() {
  const stats = [
    {
      title: 'Active Sessions',
      value: '8',
      icon: Users,
      color: 'text-green-500',
      bg: 'bg-green-500/10',
    },
    {
      title: 'Average Session',
      value: '2.5h',
      icon: Clock,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
    {
      title: "Today's Revenue",
      value: '$580',
      icon: DollarSign,
      color: 'text-yellow-500',
      bg: 'bg-yellow-500/10',
    },
    {
      title: 'Available Stations',
      value: '4',
      icon: Power,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((stat) => (
        <div key={stat.title} className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className={`p-2 rounded-lg ${stat.bg}`}>
              <stat.icon className={`h-6 w-6 ${stat.color}`} />
            </div>
            <span className="text-slate-400 text-sm">{stat.title}</span>
          </div>
          <p className="text-3xl font-bold text-white">{stat.value}</p>
        </div>
      ))}
    </div>
  );
}