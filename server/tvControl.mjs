import express from 'express';
import { exec } from 'child_process';
import * as wol from 'wake_on_lan';

const router = express.Router();

router.post('/power', async (req, res) => {
  const { action, ip, mac, port = 8001 } = req.body;

  try {
    if (action === 'on') {
      // Send Wake-on-LAN magic packet
      wol.wake(mac, (error) => {
        if (error) {
          console.error('Error sending WOL packet:', error);
          return res.status(500).json({ error: 'Failed to turn on TV' });
        }
        res.json({ success: true, message: 'TV power on signal sent' });
      });
    } else if (action === 'off') {
      // Use Samsung's TV control protocol to turn off
      const command = `curl --connect-timeout 3 -m 3 -i -X POST "http://${ip}:${port}/api/v2/power" -H "Content-Type: application/json" -d '{"power":"off"}'`;
      
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error('Error turning off TV:', error);
          return res.status(500).json({ error: 'Failed to turn off TV' });
        }
        res.json({ success: true, message: 'TV power off signal sent' });
      });
    } else {
      res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('TV control error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;