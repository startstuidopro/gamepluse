const API_BASE = 'http://localhost:3001/api';

export const apiClient = {
  async getStations() {
    const response = await fetch(`${API_BASE}/stations`);
    return await response.json();
  },

  async getProducts() {
    const response = await fetch(`${API_BASE}/products`);
    return await response.json();
  },

  async getDatabaseStatus() {
    try {
      await fetch(`${API_BASE}/health`);
      return { connected: true };
    } catch (error) {
      return { connected: false, error: error.message };
    }
  }
};
