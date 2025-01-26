const NodeCache = require('node-cache');
const winston = require('winston');

/**
* @typedef {Object} RateLimitConfig
* @property {number} maxRequests - Maximum number of requests allowed within duration
* @property {number} duration - Time window in seconds
* @property {string} [keyPrefix=''] - Prefix for rate limit keys
*/

/**
* @typedef {Object} ProgressStage
* @property {string} name - Name of the stage
* @property {number} weight - Relative weight of this stage in overall progress
* @property {string} message - Message to display for this stage
*/

/**
* Utility class for handling rate limiting, progress tracking, and caching
* @example
* const util = new UtilityManager({
*   maxRequests: 10,
*   duration: 3600,
*   keyPrefix: 'channel',
*   retryAttempts: 3,
*   retryDelay: 1000
* });
*/
class UtilityManager {
/**
* @param {Object} config Configuration object
* @param {number} config.maxRequests Maximum requests per duration
* @param {number} config.duration Duration in seconds
* @param {string} [config.keyPrefix=''] Prefix for rate limit keys
* @param {number} [config.retryAttempts=3] Number of retry attempts
* @param {number} [config.retryDelay=1000] Delay between retries in ms
* @param {number} [config.cacheExpiry=3600] Cache expiry in seconds
*/
constructor({
    maxRequests,
    duration,
    keyPrefix = '',
    retryAttempts = 3,
    retryDelay = 1000,
    cacheExpiry = 3600
}) {
    this.rateLimit = {
    maxRequests,
    duration,
    keyPrefix
    };
    this.retryConfig = {
    attempts: retryAttempts,
    delay: retryDelay
    };
    this.cache = new NodeCache({ stdTTL: cacheExpiry });
    this.logger = winston.createLogger({
    level: 'info',
    format: winston.format.simple(),
    transports: [new winston.transports.Console()]
    });
}

/**
* Check if rate limit is exceeded
* @param {string} identifier Unique identifier for rate limit (e.g., channelId)
* @returns {Promise<boolean>} True if rate limit is not exceeded
*/
async checkRateLimit(identifier) {
    const key = `${this.rateLimit.keyPrefix}:${identifier}`;
    const current = this.cache.get(key) || 0;

    if (current >= this.rateLimit.maxRequests) {
    return false;
    }

    this.cache.set(key, current + 1, this.rateLimit.duration);
    return true;
}

/**
* Progress tracker for multi-stage operations
* @param {ProgressStage[]} stages Array of progress stages
* @returns {Object} Progress tracking methods
*/
createProgressTracker(stages) {
    const totalWeight = stages.reduce((sum, stage) => sum + stage.weight, 0);
    let currentStage = 0;
    let stageProgress = 0;

    return {
    /**
    * Update progress of current stage
    * @param {number} progress Progress percentage of current stage (0-100)
    */
    updateProgress: (progress) => {
        stageProgress = Math.min(100, Math.max(0, progress));
        const overallProgress = this.calculateOverallProgress(
        stages,
        currentStage,
        stageProgress,
        totalWeight
        );
        return {
        stage: stages[currentStage].name,
        message: stages[currentStage].message,
        stageProgress,
        overallProgress
        };
    },
    
    /**
    * Move to next stage
    */
    nextStage: () => {
        currentStage = Math.min(currentStage + 1, stages.length - 1);
        stageProgress = 0;
        return stages[currentStage];
    }
    };
}

/**
* Execute function with retry logic
* @param {Function} fn Function to execute
* @param {Object} [options] Retry options
* @returns {Promise<any>}
*/
async withRetry(fn, options = {}) {
    const attempts = options.attempts || this.retryConfig.attempts;
    const delay = options.delay || this.retryConfig.delay;

    for (let i = 0; i < attempts; i++) {
    try {
        return await fn();
    } catch (error) {
        if (i === attempts - 1) throw error;
        await this.sleep(delay * Math.pow(2, i));
        this.logger.warn(`Retry attempt ${i + 1} after error: ${error.message}`);
    }
    }
}

/**
* Calculate overall progress across all stages
* @private
*/
calculateOverallProgress(stages, currentStage, stageProgress, totalWeight) {
    let progress = 0;
    
    for (let i = 0; i < stages.length; i++) {
    if (i < currentStage) {
        progress += (stages[i].weight / totalWeight) * 100;
    } else if (i === currentStage) {
        progress += (stages[i].weight / totalWeight) * (stageProgress / 100);
    }
    }
    
    return Math.round(progress);
}

/**
* Sleep for specified duration
* @private
*/
sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
* Cache get/set wrapper with timeout
* @param {string} key Cache key
* @param {Function} fn Function to generate value if not cached
* @param {number} [ttl] Time to live in seconds
*/
async getCached(key, fn, ttl) {
    const cached = this.cache.get(key);
    if (cached !== undefined) return cached;

    const value = await fn();
    this.cache.set(key, value, ttl);
    return value;
}
}

module.exports = UtilityManager;

