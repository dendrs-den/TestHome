const express = require("express");
const router = express.Router();
const { networkInterfaces } = require('os');


router.get("/getIp", function (req, res) {
  try {
    const nets = networkInterfaces();
    const results = [];

    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            const familyV4Value = typeof net.family === 'string' ? 'IPv4' : 4;
            if (net.family === familyV4Value && !net.internal) {
                const result = {
                    name: name,
                    address: net.address,
                    mac: net.mac,
                    type: net.internal ? 'internal' : 'external'
                };
                results.push(result);
            }
        }
    }

    res.json({ results });
} catch (error) {
    console.error('Error in /getServerIp:', error);
    res.status(500).json({ error: 'Internal server error' });
}
});

module.exports = router;