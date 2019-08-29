/**
 *
 * TODO config rotation log cleanup and statistics
 */
export interface IProxyRotatorOptions {

  /**
   * Concurrent queue processes
   */
  parallel?: number;

  /**
   * Fetch size of ip addresses from
   */
  fetchSize?: number;

  /**
   * Reuse definies the blocking of use of a proxy after it was used
   */
  reuse?: number;


  /**
   * Healtcheck request options
   */
  request?: {

    /**
     * Timeout for proxy rotator request to check a proxy
     */
    timeout?: number;

    /**
     * Over running proxy server
     */
    overProxyServer?: boolean;
  };

  /**
   * Debug options
   */
  debug?: {

    activeList?: boolean;

  };

  /**
   * fetch proxies on startup
   */
  fillAtStartup?: boolean;

  /**
   * Remove entries from active list after an period of time with a special offset
   */
  cleanup?: {

    /**
     * Inactivity time offset in s
     */
    timeOffset?: number;

    /**
     * Repetation time in s
     */
    interval?: number;
  };


  /**
   * Minimun active list
   */
  minActive?: number;
}

export const DEFAULT_ROTATOR_OPTIONS: IProxyRotatorOptions = {
    fetchSize: 100,
    parallel: 100,
    reuse: 10,
    request: {
      timeout: 2000,
      overProxyServer: true
    },
    debug: {
      activeList: false
    },
    fillAtStartup: false,
    cleanup: {
      timeOffset: 3600,
      interval: 600
    },
    minActive: 50
  }
;

export const K_ROTATOR = 'rotator';
