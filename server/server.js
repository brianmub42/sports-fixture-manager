import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";

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
import superadminRoutes from './routes/superadmin.js';
import { tenantMiddleware } from './middleware/tenant.js';
import { billingMiddleware } from './middleware/billing.js';
import { query } from './db.js';
import publicRoutes from './routes/public.js';
import './db-patch.js';
import { startBillingReminderCron } from './lib/billing-scheduler.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173' }
});

// Configure Socket.io Redis adapter for multi-instance PM2 clustering
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redisOptions = {
  url: redisUrl,
  socket: {
    reconnectStrategy: (retries) => {
      // If Redis is not available, fail fast and do not retry infinitely in the background
      if (retries >= 1) {
        return false; // Return false to stop reconnecting
      }
      return 500;
    }
  }
};
const pubClient = createClient(redisOptions);
const subClient = pubClient.duplicate();

pubClient.on('error', (err) => console.error('Redis Pub Client Error:', err));
subClient.on('error', (err) => console.error('Redis Sub Client Error:', err));

let isRedisConnected = false;
console.log(`Connecting to Redis at ${redisUrl}...`);
try {
  // Wait up to 1.5 seconds for Redis connection to resolve
  await Promise.race([
    Promise.all([pubClient.connect(), subClient.connect()]),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Redis connection timeout')), 1500))
  ]);
  io.adapter(createAdapter(pubClient, subClient));
  console.log('Socket.io Redis adapter initialized successfully');
  isRedisConnected = true;
} catch (err) {
  console.warn('⚠️ Redis connection failed or timed out. Falling back to in-memory Socket.io adapter.', err.message);
}

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  req.io = io;
  req.redisClient = isRedisConnected ? pubClient : {
    get: async () => null,
    set: async () => null,
    del: async () => null
  };
  next();
});

// Spectator Public Routes (Structurally exempt from headers & billing checks)
app.use('/api/public', publicRoutes);

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
app.use('/api/superadmin', superadminRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('join-venue', (venue) => socket.join(`venue-${venue}`));
  
  socket.on('join-tenant', async (orgIdOrSlug) => {
    if (!orgIdOrSlug) return;
    let orgId = orgIdOrSlug;
    if (isNaN(orgIdOrSlug)) {
      try {
        const orgRes = await query('SELECT id FROM organizations WHERE slug = $1', [orgIdOrSlug]);
        if (orgRes.rows.length > 0) {
          orgId = orgRes.rows[0].id;
        }
      } catch (err) {
        console.error('Error resolving socket tenant slug in join-tenant:', err);
      }
    }
    socket.join(`tenant-${orgId}`);
    socket.join(`tenant-${orgIdOrSlug}`);
    console.log(`Client ${socket.id} joined tenant-${orgId} (slug/ID: ${orgIdOrSlug})`);
  });

  socket.on('join-event', async (data) => {
    if (data && (data.tenantId || data.tenantSlug)) {
      let tenantId = data.tenantId;
      if (!tenantId && data.tenantSlug) {
        try {
          const orgRes = await query('SELECT id FROM organizations WHERE slug = $1', [data.tenantSlug]);
          if (orgRes.rows.length > 0) {
            tenantId = orgRes.rows[0].id;
          }
        } catch (err) {
          console.error('Error resolving socket tenant slug in join-event:', err);
        }
      }
      
      if (tenantId) {
        const eventId = data.eventId || 'all';
        const customRoom = `tenant:${tenantId}:event:${eventId}`;
        socket.join(customRoom);
        // Automatically join the standard broadcast room so they get real-time score updates
        socket.join(`tenant-${tenantId}`);
        console.log(`Client ${socket.id} joined spectator event room: ${customRoom} (aliased to tenant-${tenantId})`);
      }
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
  // Start proactive billing reminders cron job
  startBillingReminderCron();
});

export { io };
