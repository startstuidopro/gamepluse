import { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import { Station, Session, Game, Controller, DeviceType } from '../types';
import { getDatabase } from '../database/db';
import ControllerSelector from './ControllerSelector';
import { PRICING_CONFIG } from '../config/pricing';
import { TVControlService } from '../services/tvControl';
import { sessionService } from '../services/sessionService';
// import { userService } from '../services/userService';

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
      const db = await getDatabase();
      const result = db.exec(`
        SELECT * FROM controllers 
        WHERE status = 'available'
      `);
      
      if (result.length > 0) {
        const data = result[0].values.map(row => ({
          id: Number(row[0]),
          name: String(row[1]),
          type: String(row[2]) as DeviceType,
          status: (String(row[3]) === 'in-use' ? 'in_use' : String(row[3])) as 'available' | 'in_use' | 'maintenance',
          price_per_minute: Number(row[4]),
          color: row[5] ? String(row[5]) : undefined,
          device_id: 0,
          identifier: '',
          last_maintenance: ''
        }));
      
        setAvailableControllers(data);
      } else {
        setAvailableControllers([]);
      }
    } catch (err) {
      setError('Failed to load controllers');
    }
  };

  const checkExistingSession = async () => {
    try {
      // Validate device ID before making the call
      if (typeof station.id !== 'number' || isNaN(station.id)) {
        console.error('Invalid device ID:', station.id);
        return;
      }

      const result = await sessionService.getActiveSession(station.id);
     console.log("session",result);
      if (result.success && result.data) {
        const session = Array.isArray(result.data) ? result.data[0] : result.data;
     
        onUpdateSession(station.id, session);
      } else {
        console.log('No active session found');
      }
    } catch (err) {
      console.error('Error checking existing session:', err);
      setError('Failed to check existing session');
    }
  };


  const handleStartSession = async () => {
    setLoading(true);
    setError(null);
    let db; // Declare db at function level

    // Validate station and device_id
    if (!station?.id || typeof station.id !== 'number') {
      const errorMsg = `Invalid station ID: ${station?.id}. Please select a valid station.`;
      console.error(errorMsg);
      setError(errorMsg);
      setLoading(false);
      return;
    }
    try {
      db = await getDatabase();
      const result = db.exec(`
        SELECT id FROM devices 
        WHERE id = ${station.id}
      `);
      
      if (result.length === 0 || !result[0].values.length) {
        const errorMsg = `Device with ID ${station.id} not found in database`;
        console.error(errorMsg);
        setError(errorMsg);
        setLoading(false);
        return;
      }
    } catch (err) {
      const errorMsg = 'Failed to validate device';
      console.error(errorMsg, err);
      setError(errorMsg);
      setLoading(false);
      return;
    }

    
    try {
      // Ensure we have a valid device_id from the selected station
      const basePrice = calculateBasePrice();
      const discountRate = calculateDiscountRate();
      const finalPrice = basePrice * (1 - discountRate);

      // Validate user ID format
      if (!formData.userId || !/^[1-9]\d*$/.test(formData.userId)) {
        throw new Error('Invalid User ID: Must be a positive numeric value');
      }
      const userId = parseInt(formData.userId);
      
      // Validate user exists
      try {
        const userCheck = await db.exec(`SELECT id, name FROM users WHERE id = ${userId}`);
        if (!userCheck?.[0]?.values?.length) {
          throw new Error(`User ${userId} not found - please verify the ID`);
        }
        const userName = userCheck[0].values[0][1];
        console.log(`Starting session for user: ${userName} (ID: ${userId})`);
      } catch (error) {
        console.error('User validation error:', error);
        throw new Error(`User validation failed: ${error instanceof Error ? error.message : 'Database error'}`);
      }

      // Validate game with enhanced checks
      let gameId: number | undefined;
      if (formData.gameId) {
        const gameIdNumber = parseInt(formData.gameId);
        if (isNaN(gameIdNumber) || gameIdNumber <= 0) {
          throw new Error(`Invalid Game ID: ${formData.gameId} is not a valid numeric identifier`);
        }

        try {
          const gameCheck = await db.exec(`
            SELECT id, name, is_active 
            FROM games 
            WHERE id = ${gameIdNumber}
          `);
          
          if (!gameCheck?.[0]?.values?.length) {
            throw new Error(`Game ${gameIdNumber} not found in database`);
          }
          
          const gameData = gameCheck[0].values[0];
          if (!gameData[2]) { // is_active check
            throw new Error(`Game ${gameData[1]} (ID: ${gameIdNumber}) is not active`);
          }
          
          gameId = gameIdNumber;
          console.log(`Selected game: ${gameData[1]} (ID: ${gameIdNumber})`);
        } catch (error) {
          console.error('Game validation error:', error);
          throw new Error(`Game validation failed: ${error instanceof Error ? error.message : 'Database error'}`);
        }
      }

      // Final validation before session creation
      if (!gameId && games.length > 0) {
        throw new Error('A game selection is required for session startup');
      }

      const sessionData: Omit<Session, 'id' | 'created_at' | 'updated_at'> = {
        device_id: station.id,
        user_id: userId,
        game_id: gameId || undefined,
        start_time: new Date().toISOString(),
        base_price: basePrice,
        discount_rate: discountRate,
        final_price: finalPrice,
        attached_controllers: selectedControllers,
        user_membership_type: formData.userMembershipType,
        created_by: userId
      };

      console.log('Creating session with data:', {
        ...sessionData,
        device_id: station.id,
        base_price: basePrice,
        final_price: finalPrice
      });

      // Get and validate controller IDs
      const controllerIds = selectedControllers.map(c => c.id);
      const validControllerIds = controllerIds.filter((id: number) => typeof id === 'number' && !isNaN(id));
      
      const result = await sessionService.createSession({
        ...sessionData,
        device_id: station.id 
      }, validControllerIds);

      if (result.success && result.data) {
        const sessionResult = await sessionService.getActiveSession(station.id);
        if (sessionResult.success && sessionResult.data) {
          const session = Array.isArray(sessionResult.data) ? sessionResult.data[0] : sessionResult.data;
          onUpdateSession(station.id, session);
          await TVControlService.getInstance().turnOnTV(station);
          onClose();
        }
      } else {
        const errorMsg = result.error || 'Failed to start session';
        console.error('Session creation failed:', errorMsg);
        setError(errorMsg);
        throw new Error(errorMsg); // Re-throw to keep modal open
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to start session';
      console.error('Error in handleStartSession:', errorMsg);
      setError(errorMsg);
      throw err; // Re-throw to keep modal open
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
          <form onSubmit={async (e) => {
            e.preventDefault();
            try {
              await handleStartSession();
              // Only close modal if session creation was successful
              onClose();
            } catch (error) {
              // Keep modal open to show error and allow user to retry
              console.error('Session creation error:', error);
            }
          }} className="space-y-4">
            <div>
              <label htmlFor="userId" className="block text-sm font-medium text-slate-400 mb-1">
                User Name
              </label>
                <input
                  type="number"
                  id="userId"
                  value={formData.userId}
                  onChange={(e) => setFormData({ ...formData, userId: e.target.value.replace(/\D/g, '') })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                  required
                  min="1"
                  placeholder="Enter numeric user ID"
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
                  onChange={(e) => {
                    const selectedGame = games.find(g => g.id.toString() === e.target.value);
                    if (!selectedGame?.is_active) {
                      setError('Selected game is not active');
                      return;
                    }
                    setFormData({ ...formData, gameId: e.target.value });
                  }}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500 appearance-none"
                  required
                >
                  <option value="">Select a game</option>
                  {games.filter(g => g.is_active).map(game => (
                    <option 
                      key={game.id} 
                      value={game.id}
                      className={!game.is_active ? 'text-red-500 line-through' : ''}
                    >
                      {game.name} (${game.price_per_minute.toFixed(2)}/min)
                      {!game.is_active && ' (Inactive)'}
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
