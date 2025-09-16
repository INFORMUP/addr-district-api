const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

const lookupRoutes = require('./routes/lookup');
const healthRoutes = require('./routes/health');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
        }
    }
}));
app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api', lookupRoutes);
app.use('/health', healthRoutes);

app.get('/', (req, res) => {
  res.json({
    name: 'Address District Lookup API',
    description: 'API to lookup district numbers and representatives for addresses in Allegheny County',
    version: '1.0.0',
    endpoints: {
      'GET /api/lookup': 'Lookup districts for an address',
      'GET /health': 'Health check endpoint'
    }
  });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Address District API running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});