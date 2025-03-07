import { AuthConfig } from './types.js';
import { AuthenticationManager } from './authentication.js';
import { logger, logError } from './utils/logger.js';

/**
 * Perform a health check on the Twitter MCP server
 */
export async function performHealthCheck(authConfig: AuthConfig): Promise<{
  status: 'healthy' | 'unhealthy';
  details: Record<string, any>;
}> {
  const details: Record<string, any> = {
    timestamp: new Date().toISOString(),
    components: {}
  };
  let isHealthy = true;

  try {
    // Check if we can authenticate
    const authManager = AuthenticationManager.getInstance();
    
    try {
      const scraper = await authManager.getScraper(authConfig);
      
      // Check if we're logged in
      const loggedIn = await scraper.isLoggedIn();
      details.components.authentication = { 
        status: loggedIn ? 'healthy' : 'unhealthy',
        message: loggedIn ? 'Successfully authenticated' : 'Not authenticated'
      };
      
      if (!loggedIn) {
        isHealthy = false;
      }
      
      // Check if we can fetch trends (basic API call)
      try {
        if (scraper.getTrends) {
          const trends = await scraper.getTrends();
          details.components.api = { 
            status: 'healthy', 
            message: 'API is accessible',
            trendsCount: trends.length 
          };
        } else {
          // If getTrends is not available, try a different API call
          const profile = await scraper.getProfile('twitter');
          details.components.api = { 
            status: 'healthy', 
            message: 'API is accessible',
            profileCheck: !!profile
          };
        }
      } catch (error) {
        details.components.api = { 
          status: 'unhealthy', 
          message: 'API is not accessible',
          error: error instanceof Error ? error.message : String(error)
        };
        isHealthy = false;
        logError('Health check API error', error);
      }
    } catch (error) {
      details.components.authentication = { 
        status: 'unhealthy',
        message: 'Authentication failed',
        error: error instanceof Error ? error.message : String(error)
      };
      isHealthy = false;
      logError('Health check authentication error', error);
    }
    
    // Check memory usage
    const memoryUsage = process.memoryUsage();
    details.components.memory = {
      status: 'healthy',
      message: 'Memory usage is normal',
      usage: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`
      }
    };
    
    // Overall status
    details.status = isHealthy ? 'healthy' : 'unhealthy';
    
    logger.info('Health check completed', { isHealthy, details });
    
    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      details
    };
  } catch (error) {
    logError('Health check failed with unexpected error', error);
    
    return {
      status: 'unhealthy',
      details: {
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    };
  }
} 