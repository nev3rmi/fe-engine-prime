import type { Socket } from "socket.io-client";

/**
 * Performance optimization utilities for Socket.io real-time features
 */

// Event throttling map to track last emission times
const throttleMap = new Map<string, number>();

// Event debouncing map to track timeout handlers
const debounceMap = new Map<string, NodeJS.Timeout>();

// Connection pool for managing multiple socket instances
class SocketConnectionPool {
  private static instance: SocketConnectionPool;
  private pools: Map<string, Socket[]> = new Map();
  private maxPoolSize = 5;
  private currentPool = "default";

  static getInstance(): SocketConnectionPool {
    if (!SocketConnectionPool.instance) {
      SocketConnectionPool.instance = new SocketConnectionPool();
    }
    return SocketConnectionPool.instance;
  }

  setMaxPoolSize(size: number): void {
    this.maxPoolSize = size;
  }

  addSocket(socket: Socket, poolName = "default"): void {
    if (!this.pools.has(poolName)) {
      this.pools.set(poolName, []);
    }

    const pool = this.pools.get(poolName)!;
    if (pool.length < this.maxPoolSize) {
      pool.push(socket);
    }
  }

  removeSocket(socket: Socket, poolName = "default"): void {
    const pool = this.pools.get(poolName);
    if (pool) {
      const index = pool.indexOf(socket);
      if (index > -1) {
        pool.splice(index, 1);
      }
    }
  }

  getSocket(poolName = "default"): Socket | null {
    const pool = this.pools.get(poolName);
    return pool && pool.length > 0 ? pool[0] || null : null;
  }

  getPoolSize(poolName = "default"): number {
    const pool = this.pools.get(poolName);
    return pool ? pool.length : 0;
  }

  getAllPools(): Map<string, Socket[]> {
    return new Map(this.pools);
  }
}

/**
 * Throttle socket events to prevent spamming
 */
export const throttleEvent = <T extends any[]>(
  socket: Socket | null,
  eventName: string,
  args: T,
  delay = 1000
): boolean => {
  if (!socket) {
    return false;
  }

  const key = `${socket.id}_${eventName}`;
  const now = Date.now();
  const lastEmission = throttleMap.get(key) || 0;

  if (now - lastEmission >= delay) {
    socket.emit(eventName, ...args);
    throttleMap.set(key, now);
    return true;
  }

  return false;
};

/**
 * Debounce socket events to batch rapid calls
 */
export const debounceEvent = <T extends any[]>(
  socket: Socket | null,
  eventName: string,
  args: T,
  delay = 300
): void => {
  if (!socket) {
    return;
  }

  const key = `${socket.id}_${eventName}`;

  // Clear existing timeout
  const existingTimeout = debounceMap.get(key);
  if (existingTimeout) {
    clearTimeout(existingTimeout);
  }

  // Set new timeout
  const timeout = setTimeout(() => {
    socket.emit(eventName, ...args);
    debounceMap.delete(key);
  }, delay);

  debounceMap.set(key, timeout);
};

/**
 * Batch multiple events into a single emission
 */
export class EventBatcher {
  private batches = new Map<string, any[]>();
  private timers = new Map<string, NodeJS.Timeout>();
  private socket: Socket | null;

  constructor(socket: Socket | null) {
    this.socket = socket;
  }

  add(eventName: string, data: any, maxBatchSize = 10, flushDelay = 100): void {
    if (!this.socket) {
      return;
    }

    if (!this.batches.has(eventName)) {
      this.batches.set(eventName, []);
    }

    const batch = this.batches.get(eventName)!;
    batch.push(data);

    // Flush if batch is full
    if (batch.length >= maxBatchSize) {
      this.flush(eventName);
      return;
    }

    // Set up timer to flush after delay
    if (!this.timers.has(eventName)) {
      const timer = setTimeout(() => {
        this.flush(eventName);
      }, flushDelay);
      this.timers.set(eventName, timer);
    }
  }

  flush(eventName: string): void {
    const batch = this.batches.get(eventName);
    const timer = this.timers.get(eventName);

    if (batch && batch.length > 0 && this.socket) {
      this.socket.emit(`${eventName}_batch`, batch);
      this.batches.set(eventName, []);
    }

    if (timer) {
      clearTimeout(timer);
      this.timers.delete(eventName);
    }
  }

  flushAll(): void {
    for (const eventName of this.batches.keys()) {
      this.flush(eventName);
    }
  }

  cleanup(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.batches.clear();
    this.timers.clear();
  }
}

/**
 * Connection quality monitor
 */
export class ConnectionQualityMonitor {
  private socket: Socket | null;
  private pingHistory: number[] = [];
  private maxHistorySize = 10;
  private qualityThresholds = {
    excellent: 50, // < 50ms
    good: 100, // < 100ms
    fair: 200, // < 200ms
    poor: 500, // < 500ms
    // > 500ms = very poor
  };

  constructor(socket: Socket | null) {
    this.socket = socket;
    this.startMonitoring();
  }

  private startMonitoring(): void {
    if (!this.socket) {
      return;
    }

    // Monitor ping/pong for latency
    this.socket.on("pong", (latency: number) => {
      this.pingHistory.push(latency);

      // Keep only recent history
      if (this.pingHistory.length > this.maxHistorySize) {
        this.pingHistory.shift();
      }
    });

    // Send ping every 10 seconds
    setInterval(() => {
      if (this.socket?.connected) {
        const start = Date.now();
        this.socket.emit("ping", start);
      }
    }, 10000);
  }

  getAverageLatency(): number {
    if (this.pingHistory.length === 0) {
      return 0;
    }
    return this.pingHistory.reduce((sum, ping) => sum + ping, 0) / this.pingHistory.length;
  }

  getLatestLatency(): number {
    return this.pingHistory[this.pingHistory.length - 1] || 0;
  }

  getConnectionQuality(): "excellent" | "good" | "fair" | "poor" | "very poor" {
    const avgLatency = this.getAverageLatency();

    if (avgLatency < this.qualityThresholds.excellent) {
      return "excellent";
    }
    if (avgLatency < this.qualityThresholds.good) {
      return "good";
    }
    if (avgLatency < this.qualityThresholds.fair) {
      return "fair";
    }
    if (avgLatency < this.qualityThresholds.poor) {
      return "poor";
    }
    return "very poor";
  }

  getQualityScore(): number {
    const quality = this.getConnectionQuality();
    switch (quality) {
      case "excellent":
        return 5;
      case "good":
        return 4;
      case "fair":
        return 3;
      case "poor":
        return 2;
      case "very poor":
        return 1;
      default:
        return 0;
    }
  }

  shouldReduceFrequency(): boolean {
    return this.getQualityScore() <= 2; // Poor or very poor
  }

  getRecommendedPollingInterval(): number {
    const quality = this.getConnectionQuality();
    switch (quality) {
      case "excellent":
        return 1000; // 1 second
      case "good":
        return 2000; // 2 seconds
      case "fair":
        return 3000; // 3 seconds
      case "poor":
        return 5000; // 5 seconds
      case "very poor":
        return 10000; // 10 seconds
      default:
        return 5000;
    }
  }
}

/**
 * Adaptive event frequency controller
 */
export class AdaptiveEventController {
  private socket: Socket | null;
  private monitor: ConnectionQualityMonitor;
  private eventIntervals = new Map<string, NodeJS.Timeout>();
  private eventFrequencies = new Map<string, number>();
  private defaultFrequencies = new Map<string, number>();

  constructor(socket: Socket | null) {
    this.socket = socket;
    this.monitor = new ConnectionQualityMonitor(socket);
  }

  setDefaultFrequency(eventName: string, intervalMs: number): void {
    this.defaultFrequencies.set(eventName, intervalMs);
    this.eventFrequencies.set(eventName, intervalMs);
  }

  startAdaptiveEvent(eventName: string, callback: () => void): void {
    if (!this.socket) {
      return;
    }

    const frequency = this.eventFrequencies.get(eventName) || 5000;

    const interval = setInterval(() => {
      if (this.socket?.connected) {
        callback();
        this.adaptFrequency(eventName);
      }
    }, frequency);

    this.eventIntervals.set(eventName, interval);
  }

  stopAdaptiveEvent(eventName: string): void {
    const interval = this.eventIntervals.get(eventName);
    if (interval) {
      clearInterval(interval);
      this.eventIntervals.delete(eventName);
    }
  }

  private adaptFrequency(eventName: string): void {
    const quality = this.monitor.getConnectionQuality();
    const defaultFreq = this.defaultFrequencies.get(eventName) || 5000;
    let newFrequency = defaultFreq;

    switch (quality) {
      case "excellent":
        newFrequency = defaultFreq * 0.8; // 20% faster
        break;
      case "good":
        newFrequency = defaultFreq; // Normal speed
        break;
      case "fair":
        newFrequency = defaultFreq * 1.5; // 50% slower
        break;
      case "poor":
        newFrequency = defaultFreq * 2; // 100% slower
        break;
      case "very poor":
        newFrequency = defaultFreq * 3; // 200% slower
        break;
    }

    // Only restart if frequency changed significantly
    if (Math.abs(newFrequency - this.eventFrequencies.get(eventName)!) > 1000) {
      this.eventFrequencies.set(eventName, newFrequency);
      this.stopAdaptiveEvent(eventName);
      // Note: You would need to restart with new frequency - this is a simplified example
    }
  }

  cleanup(): void {
    for (const interval of this.eventIntervals.values()) {
      clearInterval(interval);
    }
    this.eventIntervals.clear();
  }
}

/**
 * Memory-efficient event listener manager
 */
export class EventListenerManager {
  private socket: Socket | null;
  private listeners = new Map<string, Set<Function>>();
  private onceListeners = new Map<string, Set<Function>>();

  constructor(socket: Socket | null) {
    this.socket = socket;
  }

  on(eventName: string, callback: Function): void {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());

      // Add single listener to socket that manages all callbacks
      this.socket?.on(eventName, (...args: any[]) => {
        const callbacks = this.listeners.get(eventName);
        if (callbacks) {
          for (const callback of callbacks) {
            try {
              callback(...args);
            } catch (error) {
              console.error(`Error in event listener for ${eventName}:`, error);
            }
          }
        }
      });
    }

    this.listeners.get(eventName)!.add(callback);
  }

  once(eventName: string, callback: Function): void {
    if (!this.onceListeners.has(eventName)) {
      this.onceListeners.set(eventName, new Set());
    }

    const wrappedCallback = (...args: any[]) => {
      try {
        callback(...args);
      } catch (error) {
        console.error(`Error in once event listener for ${eventName}:`, error);
      } finally {
        this.off(eventName, wrappedCallback);
      }
    };

    this.on(eventName, wrappedCallback);
    this.onceListeners.get(eventName)!.add(callback);
  }

  off(eventName: string, callback?: Function): void {
    if (callback) {
      const callbacks = this.listeners.get(eventName);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.socket?.off(eventName);
          this.listeners.delete(eventName);
        }
      }
    } else {
      // Remove all listeners for this event
      this.socket?.off(eventName);
      this.listeners.delete(eventName);
      this.onceListeners.delete(eventName);
    }
  }

  removeAllListeners(): void {
    for (const eventName of this.listeners.keys()) {
      this.socket?.off(eventName);
    }
    this.listeners.clear();
    this.onceListeners.clear();
  }

  getListenerCount(eventName: string): number {
    const callbacks = this.listeners.get(eventName);
    return callbacks ? callbacks.size : 0;
  }

  getTotalListenerCount(): number {
    let total = 0;
    for (const callbacks of this.listeners.values()) {
      total += callbacks.size;
    }
    return total;
  }
}

/**
 * Cleanup utility to prevent memory leaks
 */
export const cleanupSocketResources = (socket: Socket | null): void => {
  if (!socket) {
    return;
  }

  // Clear all throttle entries for this socket
  if (socket.id) {
    for (const [key] of throttleMap.entries()) {
      if (key.startsWith(socket.id)) {
        throttleMap.delete(key);
      }
    }
  }

  // Clear all debounce entries for this socket
  if (socket.id) {
    for (const [key, timeout] of debounceMap.entries()) {
      if (key.startsWith(socket.id)) {
        clearTimeout(timeout);
        debounceMap.delete(key);
      }
    }
  }
};

/**
 * Performance metrics collector
 */
export class PerformanceMetricsCollector {
  private metrics = {
    totalEvents: 0,
    throttledEvents: 0,
    debouncedEvents: 0,
    batchedEvents: 0,
    errorCount: 0,
    lastError: null as Error | null,
    connectionDrops: 0,
    reconnects: 0,
    averageLatency: 0,
    messagesSent: 0,
    messagesReceived: 0,
  };

  recordEvent(
    type:
      | "throttled"
      | "debounced"
      | "batched"
      | "error"
      | "connection_drop"
      | "reconnect"
      | "message_sent"
      | "message_received"
  ): void {
    this.metrics.totalEvents++;

    switch (type) {
      case "throttled":
        this.metrics.throttledEvents++;
        break;
      case "debounced":
        this.metrics.debouncedEvents++;
        break;
      case "batched":
        this.metrics.batchedEvents++;
        break;
      case "error":
        this.metrics.errorCount++;
        break;
      case "connection_drop":
        this.metrics.connectionDrops++;
        break;
      case "reconnect":
        this.metrics.reconnects++;
        break;
      case "message_sent":
        this.metrics.messagesSent++;
        break;
      case "message_received":
        this.metrics.messagesReceived++;
        break;
    }
  }

  recordError(error: Error): void {
    this.recordEvent("error");
    this.metrics.lastError = error;
  }

  recordLatency(latency: number): void {
    // Simple moving average
    this.metrics.averageLatency = (this.metrics.averageLatency + latency) / 2;
  }

  getMetrics() {
    return { ...this.metrics };
  }

  reset(): void {
    this.metrics = {
      totalEvents: 0,
      throttledEvents: 0,
      debouncedEvents: 0,
      batchedEvents: 0,
      errorCount: 0,
      lastError: null,
      connectionDrops: 0,
      reconnects: 0,
      averageLatency: 0,
      messagesSent: 0,
      messagesReceived: 0,
    };
  }
}

// Export singleton instances
export const connectionPool = SocketConnectionPool.getInstance();
export const metricsCollector = new PerformanceMetricsCollector();

// Global cleanup function
export const globalCleanup = (): void => {
  throttleMap.clear();

  for (const timeout of debounceMap.values()) {
    clearTimeout(timeout);
  }
  debounceMap.clear();

  metricsCollector.reset();
};
