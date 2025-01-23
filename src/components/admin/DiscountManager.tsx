import React, { useState } from 'react';
import { Percent, Save } from 'lucide-react';

interface DiscountRates {
  premium: {
    devices: number;
    games: number;
    controllers: number;
  };
}

export default function DiscountManager() {
  const [discountRates, setDiscountRates] = useState<DiscountRates>({
    premium: {
      devices: 20,
      games: 15,
      controllers: 10
    }
  });

  const handleSave = () => {
    // In a real app, save to backend
    localStorage.setItem('discountRates', JSON.stringify(discountRates));
    alert('Discount rates saved successfully!');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Discount Management</h2>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition"
        >
          <Save className="h-5 w-5" />
          Save Changes
        </button>
      </div>

      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center gap-2 mb-6">
          <Percent className="h-6 w-6 text-purple-500" />
          <h3 className="text-xl font-bold text-white">Premium Membership Discounts</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Device Rental Discount (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={discountRates.premium.devices}
              onChange={e => setDiscountRates({
                ...discountRates,
                premium: {
                  ...discountRates.premium,
                  devices: Number(e.target.value)
                }
              })}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Game Rental Discount (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={discountRates.premium.games}
              onChange={e => setDiscountRates({
                ...discountRates,
                premium: {
                  ...discountRates.premium,
                  games: Number(e.target.value)
                }
              })}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Controller Rental Discount (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={discountRates.premium.controllers}
              onChange={e => setDiscountRates({
                ...discountRates,
                premium: {
                  ...discountRates.premium,
                  controllers: Number(e.target.value)
                }
              })}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        <div className="mt-6 p-4 bg-purple-500/10 rounded-lg">
          <h4 className="text-white font-medium mb-2">Preview</h4>
          <div className="space-y-1 text-sm text-slate-400">
            <p>Premium members get:</p>
            <ul className="list-disc list-inside">
              <li>{discountRates.premium.devices}% off device rentals</li>
              <li>{discountRates.premium.games}% off game rentals</li>
              <li>{discountRates.premium.controllers}% off controller rentals</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}