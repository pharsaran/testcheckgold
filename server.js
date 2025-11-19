const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const priceService = require('./services/priceService');
const statusService = require('./services/statusService');
const transactionService = require('./services/transactionService');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.get('/api/prices', async (req, res) => {
  try {
    const prices = await priceService.getAllPrices();
    res.json(prices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/status', (req, res) => {
  try {
    const statuses = statusService.getAllStatuses();
    res.json(statuses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/status', (req, res) => {
  try {
    const { states } = req.body;
    const updatedStatuses = statusService.updateStatuses(states);
    
    // If status is 'stop', set price to 0 immediately
    let hasStopStatus = false;
    states.forEach(state => {
      const { priceType, status } = state;
      if (status === 'stop' && priceType) {
        hasStopStatus = true;
        priceService.updatePrice(priceType, 0, 0);
        console.log(`Setting ${priceType} price to 0 due to stop status`);
      }
    });
    
    // Broadcast price updates if any status changed to stop
    if (hasStopStatus) {
      const prices = priceService.getAllPricesSync();
      console.log('Broadcasting price update after stop:', {
        spot: prices.spot,
        gold9999: prices.gold9999,
        gold9650: prices.gold9650
      });
      io.emit('priceUpdate', prices);
    }
    
    // Broadcast status update to all clients
    io.emit('statusUpdate', updatedStatuses);
    
    res.json({ success: true, statuses: updatedStatuses });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/transactions', (req, res) => {
  try {
    const transactions = transactionService.getAllTransactions();
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/transactions', (req, res) => {
  try {
    const { symbol, price, state } = req.body;
    const transaction = transactionService.createTransaction(symbol, price, state);
    
    // Broadcast new transaction to all clients
    io.emit('newTransaction', transaction);
    
    res.json({ success: true, transaction });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// WebSocket connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Send initial data
  socket.emit('initialData', {
    prices: priceService.getAllPricesSync(),
    statuses: statusService.getAllStatuses(),
    transactions: transactionService.getAllTransactions()
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Start price update interval
let priceUpdateInterval;
const startPriceUpdates = () => {
  priceUpdateInterval = setInterval(async () => {
    try {
      const statuses = statusService.getAllStatuses();
      
      // Handle Gold Traders prices together (same source)
      if (statuses.gold9999 === 'online' || statuses.gold9650 === 'online') {
        // Fetch both at once since they come from the same page
        await priceService.fetchAndUpdatePrice('gold9999');
      } else if (statuses.gold9999 === 'stop') {
        // Ensure price stays at 0 if status is stop
        priceService.updatePrice('gold9999', 0, 0);
      } else if (statuses.gold9650 === 'stop') {
        // Ensure price stays at 0 if status is stop
        priceService.updatePrice('gold9650', 0, 0);
      }
      // If pause, do nothing (keep current price)
      
      // Handle Gold Spot separately
      if (statuses.spot === 'stop') {
        // Ensure price stays at 0 if status is stop
        priceService.updatePrice('spot', 0, 0);
      } else if (statuses.spot === 'online') {
        await priceService.fetchAndUpdatePrice('spot');
      }
      
      // Broadcast price updates to all clients
      const prices = priceService.getAllPricesSync();
      io.emit('priceUpdate', prices);
      
    } catch (error) {
      console.error('Error updating prices:', error);
    }
  }, 10000); // Update every 10 seconds
};

// Initialize and start
(async () => {
  try {
    // Initialize status service
    statusService.initialize();
    
    // Fetch initial prices
    await priceService.fetchAllPrices();
    
    // Start price update loop
    startPriceUpdates();
    
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`WebSocket server ready for real-time updates`);
    });
  } catch (error) {
    console.error('Failed to initialize server:', error);
    process.exit(1);
  }
})();

module.exports = { app, server, io };

