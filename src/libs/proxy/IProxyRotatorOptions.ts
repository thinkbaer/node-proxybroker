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
  };

  /**
   * Debug options
   */
  debug?: {

    activeList?: boolean;

  };
}

export const DEFAULT_ROTATOR_OPTIONS: IProxyRotatorOptions = {
  fetchSize: 50,
  parallel: 100,
  reuse: 10,
  request: {
    timeout: 2000
  },
  debug: {
    activeList: false
  }
};

export const K_ROTATOR = 'rotator';
