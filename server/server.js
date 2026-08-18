import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';

import fixtureRoutes from './routes/fixtures.js';
import scoreRoutes from './routes/scores.js';
import standingsRoutes from './routes/standings.js';
import uploadRoutes from './routes/upload.js';
import generateRoutes from './routes/generate.js';
import teamRoutes from './routes/teams.js';
import settingsRoutes from './routes/settings.js';
import organizationRoutes from './routes/organizations.js';
import authRoutes from './routes/auth.js';
import analyticsRoutes from './routes/analytics.js';
import venueRoutes from './routes/venues.js';
import athleticsRoutes from './routes/athletics.js';
import sportRoutes from './routes/sports.js';
import { tenantMiddleware } from './middleware/tenant.js';
import { billingMiddleware } from './middleware/billing.js';
import './db-patch.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173' }
});

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  req.io = io;
  next();
});
app.use(tenantMiddleware);
app.use(billingMiddleware);

// Routes
app.use('/uploads', express.static('uploads'));
app.use('/api/fixtures', fixtureRoutes);
app.use('/api/scores', scoreRoutes);
app.use('/api/standings', standingsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/generate', generateRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/venues', venueRoutes);
app.use('/api/athletics', athleticsRoutes);
app.use('/api/sports', sportRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('join-venue', (venue) => socket.join(`venue-${venue}`));
  socket.on('join-tenant', (orgId) => {
    if (orgId) {
      socket.join(`tenant-${orgId}`);
      console.log(`Client ${socket.id} joined tenant-${orgId}`);
    }
  });
  
  socket.on('timer-update', (data) => {
    if (data.orgId) {
      socket.to(`tenant-${data.orgId}`).emit('timer-update', data);
    } else {
      socket.broadcast.emit('timer-update', data);
    }
  });

  socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export { io };
