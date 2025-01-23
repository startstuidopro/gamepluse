import { Device } from '../types';

interface TVControlConfig {
  ip: string;
  mac: string;
  port?: number;
}

const TV_CONFIGS: Record<string, TVControlConfig> = {
  'Station 1': { ip: '192.168.1.101', mac: 'AA:BB:CC:DD:EE:FF' },
  'Station 2': { ip: '192.168.1.102', mac: 'AA:BB:CC:DD:EE:GG' },
  // Add more TV configurations as needed
};

export class TVControlService {
  private static instance: TVControlService;
  
  private constructor() {}

  static getInstance(): TVControlService {
    if (!this.instance) {
      this.instance = new TVControlService();
    }
    return this.instance;
  }

  async turnOnTV(station: Device): Promise<void> {
    const config = TV_CONFIGS[station.location];
    if (!config) {
      console.error(`No TV configuration found for station: ${station.location}`);
      return;
    }

    try {
      const response = await fetch('/api/tv/power', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'on',
          ip: config.ip,
          mac: config.mac,
          port: config.port || 8001
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to turn on TV: ${response.statusText}`);
      }

      console.log(`TV turned on for station: ${station.location}`);
    } catch (error) {
      console.error('Error controlling TV:', error);
      throw new Error('Failed to control TV. Please check the connection.');
    }
  }

  async turnOffTV(station: Device): Promise<void> {
    const config = TV_CONFIGS[station.location];
    if (!config) {
      console.error(`No TV configuration found for station: ${station.location}`);
      return;
    }

    try {
      const response = await fetch('/api/tv/power', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'off',
          ip: config.ip,
          mac: config.mac,
          port: config.port || 8001
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to turn off TV: ${response.statusText}`);
      }

      console.log(`TV turned off for station: ${station.location}`);
    } catch (error) {
      console.error('Error controlling TV:', error);
      throw new Error('Failed to control TV. Please check the connection.');
    }
  }
}