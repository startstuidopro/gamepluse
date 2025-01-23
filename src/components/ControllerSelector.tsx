import React from 'react';
import { Controller } from '../types';
import { Gamepad, Plus, X } from 'lucide-react';

interface ControllerSelectorProps {
  availableControllers: Controller[];
  selectedControllers: Controller[];
  onAttach: (controller: Controller) => void;
  onDetach: (controller: Controller) => void;
  maxControllers?: number;
}

export default function ControllerSelector({
  availableControllers,
  selectedControllers,
  onAttach,
  onDetach,
  maxControllers = 2
}: ControllerSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Controllers</h3>
        <span className="text-sm text-slate-400">
          {selectedControllers.length}/{maxControllers} attached
        </span>
      </div>

      {selectedControllers.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-slate-400">Attached Controllers:</h4>
          {selectedControllers.map(controller => (
            <div
              key={controller.id}
              className="flex items-center justify-between bg-purple-500/10 rounded-lg p-3"
            >
              <div className="flex items-center gap-3">
                <Gamepad className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-sm font-medium text-white">{controller.name}</p>
                  <p className="text-xs text-slate-400">${controller.pricePerMinute.toFixed(2)}/min</p>
                </div>
              </div>
              <button
                onClick={() => onDetach(controller)}
                className="p-1 text-slate-400 hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {selectedControllers.length < maxControllers && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-slate-400">Available Controllers:</h4>
          {availableControllers
            .filter(c => !selectedControllers.find(sc => sc.id === c.id))
            .map(controller => (
              <button
                key={controller.id}
                onClick={() => onAttach(controller)}
                className="w-full flex items-center justify-between bg-slate-700 hover:bg-slate-600 rounded-lg p-3 transition"
              >
                <div className="flex items-center gap-3">
                  <Gamepad className="h-5 w-5 text-slate-400" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-white">{controller.name}</p>
                    <p className="text-xs text-slate-400">${controller.pricePerMinute.toFixed(2)}/min</p>
                  </div>
                </div>
                <Plus className="h-4 w-4 text-slate-400" />
              </button>
            ))}
        </div>
      )}
    </div>
  );
}