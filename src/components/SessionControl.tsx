import { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import { Station, Session, Game, Controller } from '../types';
import ControllerSelector from './ControllerSelector';
import { PRICING_CONFIG } from '../config/pricing';
import { TVControlService } from '../services/tvControl';
import { sessionService } from '../services/sessionService';
import { userService } from '../services/userService';

interface SessionControlProps {
  station: Station;
  onClose: () => void;
  onUpdateSession: (stationId: number, session: Session | undefined) => void;
  games: Game[];
}

export default function SessionControl({ station, onClose, onUpdateSession, games }: SessionControlProps) {
  const [formData, setFormData] = useState({
    userId: '',
    gameId: '',
    userMembershipType: 'standard' as 'standard' | 'premium'
  });

  const [availableControllers, setAvailableControllers] = useState<Controller[]>([]);
  const [selectedControllers, setSelectedControllers] = useState<Controller[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAvailableControllers();
    checkExistingSession();
  }, [station.id]);

  const loadAvailableControllers = async () => {
    try {
      const result = await fetch('/api/controllers/available');
      const data = await result.json();
      setAvailableControllers(data);
    } catch (err) {
      setError('Failed to load controllers');
    }
  };

  const checkExistingSession = async () => {
    try {
      const result = await sessionService.getActiveSession(station.id);
      if (result.success && result.data) {
        const session = Array.isArray(result.data) ? result.data[0] : result.data;
        onUpdateSession(station.id, session);
      }
    } catch (err) {
      setError('Failed to check existing session');
    }
  };


  const handleStartSession = async () => {
    setLoading(true);
    setError(null);

    try {
      const basePrice = calculateBasePrice();
      const discountRate = calculateDiscountRate();
      const finalPrice = basePrice * (1 - discountRate);

      const sessionData = {
        device_id: station.id,
        user_id: parseInt(formData.userId),
        game_id: parseInt(formData.gameId),
        start_time: new Date().toISOString(),
        base_price: basePrice,
        discount_rate: discountRate,
        final_price: finalPrice
      };

      const controllerIds = selectedControllers.map(c => c.id);
      const result = await sessionService.createSession(sessionData as any, controllerIds);

      if (result.success && result.data) {
        const sessionResult = await sessionService.getActiveSession(station.id);
        if (sessionResult.success && sessionResult.data) {
          const session = Array.isArray(sessionResult.data) ? sessionResult.data[0] : sessionResult.data;
          onUpdateSession(station.id, session);
          await TVControlService.getInstance().turnOnTV(station);
          onClose();
        }
      } else {
        setError(result.error || 'Failed to start session');
      }
    } catch (err) {
      setError('Failed to start session');
    } finally {
      setLoading(false);
    }
  };

  const calculateBasePrice = () => {
    const game = games.find(g => g.id === parseInt(formData.gameId));
    const controllersPrice = selectedControllers.reduce((sum, c) => sum + (c.price_per_minute || 0), 0);
    return (game?.price_per_minute || 0) + controllersPrice;
  };

  const calculateDiscountRate = () => {
    return formData.userMembershipType === 'premium' ? PRICING_CONFIG.premiumDiscount : 0;
  };

  const tvService = TVControlService.getInstance();

  useEffect(() => {
    if (station.current_session?.attached_controllers) {
      setSelectedControllers(station.current_session.attached_controllers);
    }
  }, [station.current_session]);

  const handleEndSession = async () => {
    setError(null);
    setLoading(true);

    try {
      if (station.current_session) {
        // Turn off the TV
        await tvService.turnOffTV(station);

        const endTime = new Date().toISOString();
        const startTime = new Date(station.current_session.start_time).getTime();
        const endTimeMs = new Date(endTime).getTime();
        const minutesElapsed = Math.floor((endTimeMs - startTime) / 1000 / 60);
        const totalAmount = minutesElapsed * station.price_per_minute;

        const endedSession: Session = {
          ...station.current_session,
          end_time: endTime,
          total_amount: totalAmount,
        };

        onUpdateSession(station.id, undefined);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to end session');
    } finally {
      setLoading(false);
    }
  };

  const handleAttachController = (controller: Controller) => {
    if (selectedControllers.length >= 2) {
      alert('Maximum 2 controllers allowed');
      return;
    }

    const updatedControllers = [...selectedControllers, controller];
    setSelectedControllers(updatedControllers);

    if (station.current_session) {
      const basePrice = calculateBasePrice();
      const discountedPrice = calculateDiscountedPrice(basePrice, station.current_session.user_membership_type);

      const updatedSession: Session = {
        ...station.current_session,
        attached_controllers: updatedControllers,
        final_price: discountedPrice,
        base_price: basePrice
      };
      onUpdateSession(station.id, updatedSession);
    }
  };

  const handleDetachController = (controller: Controller) => {
    const updatedControllers = selectedControllers.filter(c => c.id !== controller.id);
    setSelectedControllers(updatedControllers);

    if (station.current_session) {
      const basePrice = calculateBasePrice();
      const discountedPrice = calculateDiscountedPrice(basePrice, station.current_session.user_membership_type);

      const updatedSession: Session = {
        ...station.current_session,
        attached_controllers: updatedControllers,
        final_price: discountedPrice,
        base_price: basePrice
      };
      onUpdateSession(station.id, updatedSession);
    }
  };

  const calculateDiscountedPrice = (basePrice: number, membershipType: 'standard' | 'premium' | undefined): number => {
    if (membershipType === 'premium') {
      return basePrice * (1 - PRICING_CONFIG.premiumDiscount);
    }
    return basePrice;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">
            {station.status === 'available' ? 'Start Session' : 'End Session'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X className="h-6 w-6" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {station.status === 'available' ? (
          <form onSubmit={(e) => handleStartSession()} className="space-y-4">
            <div>
              <label htmlFor="userId" className="block text-sm font-medium text-slate-400 mb-1">
                User Name
              </label>
              <input
                type="text"
                id="userId"
                value={formData.userId}
                onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                required
              />
            </div>

            <div>
              <label htmlFor="membershipType" className="block text-sm font-medium text-slate-400 mb-1">
                Membership Type
              </label>
              <select
                id="membershipType"
                value={formData.userMembershipType}
                onChange={(e) => setFormData({ ...formData, userMembershipType: e.target.value as 'standard' | 'premium' })}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
              >
                <option value="standard">Standard</option>
                <option value="premium">Premium (20% off)</option>
              </select>
            </div>

            <div>
              <label htmlFor="game" className="block text-sm font-medium text-slate-400 mb-1">
                Game
              </label>
              <div className="relative">
                <select
                  id="game"
                  value={formData.gameId}
                  onChange={(e) => setFormData({ ...formData, gameId: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500 appearance-none"
                  required
                >
                  <option value="">Select a game</option>
                  {games.map(game => (
                    <option key={game.id} value={game.id}>
                      {game.name} (${game.price_per_minute.toFixed(2)}/min)
                    </option>
                  ))}
                </select>
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <ControllerSelector
              availableControllers={availableControllers}
              selectedControllers={selectedControllers}
              onAttach={handleAttachController}
              onDetach={handleDetachController}
            />

            {formData.gameId && (
              <div className="space-y-1 text-sm text-slate-400">
                <div>Device: ${station.price_per_minute.toFixed(2)}/min</div>
                <div>Game: ${games.find(g => g.id.toString() === formData.gameId)?.price_per_minute.toFixed(2)}/min</div>
                {selectedControllers.length > 0 && (
                  <div>Controllers: ${selectedControllers.reduce((sum, c) => sum + c.price_per_minute, 0).toFixed(2)}/min</div>
                )}
                <div className="pt-2 border-t border-slate-700">
                  <div>Base Price: ${calculateBasePrice().toFixed(2)}/min</div>
                  {formData.userMembershipType === 'premium' && (
                    <div className="text-green-400">Premium Discount: {PRICING_CONFIG.premiumDiscount * 100}% off</div>
                  )}
                  <div className="font-bold text-white">
                    Final Price: ${calculateDiscountedPrice(calculateBasePrice(), formData.userMembershipType).toFixed(2)}/min
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full ${
                loading 
                  ? 'bg-slate-700 cursor-not-allowed' 
                  : 'bg-green-600 hover:bg-green-700'
              } text-white py-2 px-4 rounded-lg transition flex items-center justify-center gap-2`}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                  Starting Session...
                </>
              ) : (
                'Start Session'
              )}
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            {station.current_session && (
              <>
                <div className="space-y-2">
                  <p className="text-slate-400">
                    User: <span className="text-white">{station.current_session.user_id}</span>
                  </p>
                  <p className="text-slate-400">
                    Membership: <span className="text-white capitalize">{station.current_session.user_membership_type}</span>
                    {station.current_session.user_membership_type === 'premium' && (
                      <span className="text-green-400 ml-2">({PRICING_CONFIG.premiumDiscount * 100}% off)</span>
                    )}
                  </p>
                  <p className="text-slate-400">
                    Game: <span className="text-white">{station.current_session.game?.name}</span>
                  </p>
                  <p className="text-slate-400">
                    Started: <span className="text-white">
                      {new Date(station.current_session.start_time).toLocaleString()}
                    </span>
                  </p>
                  <p className="text-slate-400">
                    Base Price: <span className="text-white">
                      ${station.current_session.base_price.toFixed(2)}/min
                    </span>
                  </p>
                  <p className="text-slate-400">
                    Final Price: <span className="text-white">
                      ${station.current_session.final_price.toFixed(2)}/min
                    </span>
                  </p>
                </div>

                <ControllerSelector
                  availableControllers={availableControllers}
                  selectedControllers={selectedControllers}
                  onAttach={handleAttachController}
                  onDetach={handleDetachController}
                />

                <button
                  onClick={handleEndSession}
                  disabled={loading}
                  className={`w-full ${
                    loading 
                      ? 'bg-slate-700 cursor-not-allowed' 
                      : 'bg-red-600 hover:bg-red-700'
                  } text-white py-2 px-4 rounded-lg transition flex items-center justify-center gap-2`}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                      Ending Session...
                    </>
                  ) : (
                    'End Session'
                  )}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}