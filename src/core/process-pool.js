/**
 * Process Pool Manager for aegntic-hive-mcp
 * Implements process pooling to reduce Node.js instance proliferation
 * Part of Claude Code Heavy (ccheavy) optimization
 */

const { EventEmitter } = require('events');
const cluster = require('cluster');
const os = require('os');

class ProcessPool extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.maxProcesses = options.maxProcesses || Math.min(5, os.cpus().length);
    this.processRotation = options.processRotation !== false;
    this.healthCheckInterval = options.healthCheckInterval || 30000;
    this.maxMemoryUsage = options.maxMemoryUsage || 500 * 1024 * 1024; // 500MB
    
    this.processes = new Map();
    this.currentProcess = 0;
    this.taskQueue = [];
    this.isInitialized = false;
    
    this.stats = {
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      processRestarts: 0,
      avgResponseTime: 0
    };
    
    this.initialize();
  }
  
  async initialize() {
    if (this.isInitialized) return;
    
    console.log(`[ProcessPool] Initializing with ${this.maxProcesses} processes`);
    
    // Create worker processes
    for (let i = 0; i < this.maxProcesses; i++) {
      await this.createWorker(i);
    }
    
    // Start health monitoring
    setInterval(() => this.performHealthCheck(), this.healthCheckInterval);
    
    this.isInitialized = true;
    this.emit('initialized');
    
    console.log(`[ProcessPool] Initialized successfully with ${this.processes.size} workers`);
  }
  
  async createWorker(id) {
    const worker = cluster.fork({
      WORKER_ID: id,
      WORKER_TYPE: 'mcp-server'
    });
    
    const workerInfo = {
      id,
      worker,
      busy: false,
      tasks: 0,
      startTime: Date.now(),
      lastActivity: Date.now(),
      memoryUsage: 0,
      healthy: true
    };
    
    worker.on('message', (message) => {
      this.handleWorkerMessage(id, message);
    });
    
    worker.on('exit', (code, signal) => {
      console.log(`[ProcessPool] Worker ${id} exited with code ${code}, signal ${signal}`);
      this.processes.delete(id);
      
      if (!worker.exitedAfterDisconnect) {
        // Unexpected exit, restart worker
        console.log(`[ProcessPool] Restarting worker ${id}`);
        this.stats.processRestarts++;
        setTimeout(() => this.createWorker(id), 1000);
      }
    });
    
    worker.on('error', (error) => {
      console.error(`[ProcessPool] Worker ${id} error:`, error);
      workerInfo.healthy = false;
    });
    
    this.processes.set(id, workerInfo);
    
    return new Promise((resolve) => {
      worker.once('online', () => {
        console.log(`[ProcessPool] Worker ${id} is online`);
        resolve();
      });
    });
  }
  
  handleWorkerMessage(workerId, message) {
    const workerInfo = this.processes.get(workerId);
    if (!workerInfo) return;
    
    switch (message.type) {
      case 'task-complete':
        workerInfo.busy = false;
        workerInfo.tasks++;
        workerInfo.lastActivity = Date.now();
        this.stats.completedTasks++;
        this.emit('task-complete', { workerId, result: message.result });
        this.processNextTask();
        break;
        
      case 'task-error':
        workerInfo.busy = false;
        workerInfo.lastActivity = Date.now();
        this.stats.failedTasks++;
        this.emit('task-error', { workerId, error: message.error });
        this.processNextTask();
        break;
        
      case 'health-update':
        workerInfo.memoryUsage = message.memoryUsage;
        workerInfo.healthy = message.healthy;
        break;
        
      case 'ready':
        workerInfo.busy = false;
        this.processNextTask();
        break;
    }
  }
  
  async executeTask(task) {
    return new Promise((resolve, reject) => {
      const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const taskWithCallback = {
        ...task,
        id: taskId,
        resolve,
        reject,
        startTime: Date.now()
      };
      
      this.taskQueue.push(taskWithCallback);
      this.stats.totalTasks++;
      this.processNextTask();
    });
  }
  
  processNextTask() {
    if (this.taskQueue.length === 0) return;
    
    const availableWorker = this.getAvailableWorker();
    if (!availableWorker) return;
    
    const task = this.taskQueue.shift();
    const workerInfo = this.processes.get(availableWorker);
    
    workerInfo.busy = true;
    workerInfo.lastActivity = Date.now();
    
    // Set up timeout for task
    const timeout = setTimeout(() => {
      task.reject(new Error(`Task ${task.id} timed out`));
      workerInfo.busy = false;
      this.stats.failedTasks++;
    }, task.timeout || 30000);
    
    // Listen for task completion
    const onComplete = ({ workerId, result }) => {
      if (workerId === availableWorker) {
        clearTimeout(timeout);
        this.removeListener('task-complete', onComplete);
        this.removeListener('task-error', onError);
        
        const responseTime = Date.now() - task.startTime;
        this.updateAvgResponseTime(responseTime);
        
        task.resolve(result);
      }
    };
    
    const onError = ({ workerId, error }) => {
      if (workerId === availableWorker) {
        clearTimeout(timeout);
        this.removeListener('task-complete', onComplete);
        this.removeListener('task-error', onError);
        task.reject(error);
      }
    };
    
    this.on('task-complete', onComplete);
    this.on('task-error', onError);
    
    // Send task to worker
    workerInfo.worker.send({
      type: 'execute-task',
      task: {
        id: task.id,
        operation: task.operation,
        params: task.params,
        timeout: task.timeout
      }
    });
  }
  
  getAvailableWorker() {
    // Find least busy healthy worker
    let selectedWorker = null;
    let minTasks = Infinity;
    
    for (const [id, info] of this.processes) {
      if (!info.busy && info.healthy && info.tasks < minTasks) {
        minTasks = info.tasks;
        selectedWorker = id;
      }
    }
    
    // If using round-robin and no specific preference
    if (!selectedWorker && this.processRotation) {
      const workers = Array.from(this.processes.keys()).filter(id => {
        const info = this.processes.get(id);
        return !info.busy && info.healthy;
      });
      
      if (workers.length > 0) {
        selectedWorker = workers[this.currentProcess % workers.length];
        this.currentProcess++;
      }
    }
    
    return selectedWorker;
  }
  
  performHealthCheck() {
    console.log('[ProcessPool] Performing health check...');
    
    for (const [id, info] of this.processes) {
      // Check memory usage
      if (info.memoryUsage > this.maxMemoryUsage) {
        console.warn(`[ProcessPool] Worker ${id} exceeding memory limit: ${info.memoryUsage} bytes`);
        this.restartWorker(id);
        continue;
      }
      
      // Check if worker is stuck (no activity for too long)
      const inactiveTime = Date.now() - info.lastActivity;
      if (inactiveTime > 300000) { // 5 minutes
        console.warn(`[ProcessPool] Worker ${id} appears stuck, restarting`);
        this.restartWorker(id);
        continue;
      }
      
      // Send health check ping
      info.worker.send({ type: 'health-check' });
    }
    
    this.logStats();
  }
  
  async restartWorker(id) {
    const info = this.processes.get(id);
    if (!info) return;
    
    console.log(`[ProcessPool] Restarting worker ${id}`);
    
    // Gracefully shutdown worker
    info.worker.disconnect();
    
    // Wait a bit then force kill if needed
    setTimeout(() => {
      if (!info.worker.isDead()) {
        info.worker.kill('SIGTERM');
      }
    }, 5000);
    
    // Remove from processes map
    this.processes.delete(id);
    
    // Create new worker
    await this.createWorker(id);
    this.stats.processRestarts++;
  }
  
  updateAvgResponseTime(responseTime) {
    const alpha = 0.1; // Exponential moving average factor
    this.stats.avgResponseTime = this.stats.avgResponseTime === 0 
      ? responseTime 
      : (alpha * responseTime) + ((1 - alpha) * this.stats.avgResponseTime);
  }
  
  logStats() {
    const activeWorkers = Array.from(this.processes.values()).filter(w => w.healthy).length;
    const busyWorkers = Array.from(this.processes.values()).filter(w => w.busy).length;
    
    console.log('[ProcessPool] Statistics:', {
      activeWorkers,
      busyWorkers,
      queueLength: this.taskQueue.length,
      totalTasks: this.stats.totalTasks,
      completedTasks: this.stats.completedTasks,
      failedTasks: this.stats.failedTasks,
      processRestarts: this.stats.processRestarts,
      avgResponseTime: Math.round(this.stats.avgResponseTime),
      successRate: this.stats.totalTasks > 0 
        ? Math.round((this.stats.completedTasks / this.stats.totalTasks) * 100) 
        : 0
    });
  }
  
  async shutdown() {
    console.log('[ProcessPool] Shutting down...');
    
    // Stop accepting new tasks
    this.taskQueue = [];
    
    // Gracefully shutdown all workers
    const shutdownPromises = [];
    for (const [id, info] of this.processes) {
      shutdownPromises.push(new Promise((resolve) => {
        info.worker.once('exit', resolve);
        info.worker.disconnect();
        
        // Force kill after timeout
        setTimeout(() => {
          if (!info.worker.isDead()) {
            info.worker.kill('SIGTERM');
          }
        }, 5000);
      }));
    }
    
    await Promise.all(shutdownPromises);
    console.log('[ProcessPool] Shutdown complete');
  }
  
  getStats() {
    return {
      ...this.stats,
      activeWorkers: Array.from(this.processes.values()).filter(w => w.healthy).length,
      busyWorkers: Array.from(this.processes.values()).filter(w => w.busy).length,
      queueLength: this.taskQueue.length
    };
  }
}

module.exports = ProcessPool;