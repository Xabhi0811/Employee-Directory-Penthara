import mongoose from 'mongoose';
import logger from '../utils/logger.js';

/**
 * MongoDB Connection Configuration
 * Optimized for production with connection pooling, retry logic, and monitoring
 */

/**
 * Connection Options
 * Optimized for performance and reliability
 */
const connectionOptions = {
  // Connection Pool Settings (OPTIMIZED for high concurrency)
  maxPoolSize: 50,              // Increased from 10 - handle more concurrent requests
  minPoolSize: 5,               // Increased from 2 - maintain warm connections
  
  // Timeout Settings (OPTIMIZED for faster failure detection)
  serverSelectionTimeoutMS: 5000,    // Time to select a server
  socketTimeoutMS: 45000,            // Time to wait for socket operations
  connectTimeoutMS: 10000,           // Time to establish initial connection
  
  // Retry Settings (OPTIMIZED for connection reuse)
  maxIdleTimeMS: 60000,              // Increased to 60s - keep connections alive longer
  heartbeatFrequencyMS: 10000,       // Check server status every 10s
  
  // Write Concern (OPTIMIZED for performance)
  w: process.env.NODE_ENV === 'production' ? 'majority' : 1, // Relaxed in dev
  wtimeoutMS: 2500,                  // Reduced from 5000 - fail faster
  journal: process.env.NODE_ENV === 'production', // Only in production
  
  // Read Preference (OPTIMIZED for load distribution)
  readPreference: 'primaryPreferred', // Read from primary, fallback to secondary
  
  // Auto Index Creation
  autoIndex: process.env.NODE_ENV !== 'production', // Only in development
  
  // Family (IPv4 vs IPv6)
  family: 4,                         // Use IPv4
  
  // Compression (PERFORMANCE BOOST - reduce network bandwidth)
  compressors: ['zlib'],            // Enable compression for data transfer
  zlibCompressionLevel: 6,          // Balance between compression and CPU (1-9)
  
  // Buffer Commands (PERFORMANCE - queue commands during reconnection)
  bufferCommands: true,             // Buffer commands when connection is lost
  // NOTE: `bufferMaxEntries` was removed in Mongoose 8, and `autoEncryption: false`
  // is not a valid driver value. The MongoDB v6 driver now rejects unknown
  // options, so passing either aborts the connection with
  // "option ... is not supported". They are intentionally omitted.
};

/**
 * Connection State
 */
let connectionRetries = 0;
const MAX_RETRIES = 5;
const RETRY_DELAY = 5000; // 5 seconds

/**
 * Connect to MongoDB with retry logic
 */
const connectDB = async () => {
  try {
    // Mongoose connection configuration
    mongoose.set('strictQuery', true);
    
    // Enable Mongoose debug mode in development
    if (process.env.NODE_ENV === 'development') {
      mongoose.set('debug', (collectionName, method, query, doc) => {
        logger.debug('Mongoose Query', {
          collection: collectionName,
          method: method,
          query: query,
        });
      });
    }
    
    // Connect to MongoDB
    const conn = await mongoose.connect(process.env.MONGO_URI, connectionOptions);
    
    logger.info('MongoDB Connected Successfully', {
      host: conn.connection.host,
      name: conn.connection.name,
      port: conn.connection.port,
      readyState: conn.connection.readyState,
    });
    
    // Reset retry counter on successful connection
    connectionRetries = 0;
    
    // Setup connection event listeners
    setupConnectionListeners();
    
    // Start pool monitoring
    startPoolMonitoring();
    
    return conn;
  } catch (error) {
    logger.error('MongoDB Connection Error:', {
      message: error.message,
      code: error.code,
      retries: connectionRetries,
    });
    
    // Retry logic
    if (connectionRetries < MAX_RETRIES) {
      connectionRetries++;
      logger.warn(`Retrying connection in ${RETRY_DELAY / 1000} seconds... (Attempt ${connectionRetries}/${MAX_RETRIES})`);
      
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return connectDB();
    } else {
      logger.error('Max connection retries reached. Exiting...');
      process.exit(1);
    }
  }
};

/**
 * Setup MongoDB Connection Event Listeners
 */
const setupConnectionListeners = () => {
  const connection = mongoose.connection;
  
  // Only setup listeners if not already setup
  if (connection.listenerCount('error') > 0) {
    return; // Already setup
  }
  
  // Error event
  connection.on('error', (err) => {
    logger.error('MongoDB connection error:', {
      message: err.message,
      code: err.code,
    });
  });
  
  // Reconnected event
  connection.on('reconnected', () => {
    logger.info('MongoDB reconnected successfully');
    connectionRetries = 0;
  });
  
  // Reconnect failed event
  connection.on('reconnectFailed', () => {
    logger.error('MongoDB reconnection failed');
  });
};

/**
 * Graceful Shutdown
 * Properly close MongoDB connection
 */
const closeConnection = async () => {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed through app termination');
  } catch (error) {
    logger.error('Error closing MongoDB connection:', error);
    throw error;
  }
};

/**
 * Get Connection Statistics with pool metrics
 */
const getConnectionStats = () => {
  const connection = mongoose.connection;
  
  // Get pool statistics
  const poolStats = {
    poolSize: connection.client?.topology?.s?.pool?.totalConnectionCount || 0,
    availableConnections: connection.client?.topology?.s?.pool?.availableConnectionCount || 0,
    inUseConnections: connection.client?.topology?.s?.pool?.inUseConnectionCount || 0,
    waitingRequests: connection.client?.topology?.s?.pool?.waitQueueSize || 0,
  };
  
  return {
    readyState: connection.readyState,
    name: connection.name,
    host: connection.host,
    port: connection.port,
    models: Object.keys(connection.models),
    collections: Object.keys(connection.collections),
    poolStats,
  };
};

/**
 * Start connection pool monitoring
 * Logs pool statistics periodically
 */
const startPoolMonitoring = () => {
  // Only monitor in production or if explicitly enabled
  if (process.env.MONITOR_DB_POOL === 'true' || process.env.NODE_ENV === 'production') {
    const interval = parseInt(process.env.DB_POOL_MONITOR_INTERVAL) || 60000; // 1 minute default
    
    setInterval(() => {
      const stats = getConnectionStats();
      
      // Log warning if pool is nearly exhausted
      if (stats.poolStats.availableConnections === 0 && stats.poolStats.waitingRequests > 0) {
        logger.warn('Database connection pool exhausted', stats.poolStats);
      } else {
        logger.debug('Database connection pool stats', stats.poolStats);
      }
    }, interval);
    
    logger.info('Database connection pool monitoring started', {
      interval: `${interval / 1000}s`,
    });
  }
};

/**
 * Check if database is healthy
 */
const isHealthy = () => {
  return mongoose.connection.readyState === 1; // 1 = connected
};

/**
 * Ping database
 */
const ping = async () => {
  try {
    await mongoose.connection.db.admin().ping();
    return true;
  } catch (error) {
    logger.error('MongoDB ping failed:', error);
    return false;
  }
};

export default connectDB;
export { closeConnection, getConnectionStats, isHealthy, ping, startPoolMonitoring };
