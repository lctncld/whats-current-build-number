(function() {
  'use strict';

  class Versions {
    constructor() {
      this.store = [];
    }

    add(config) {
      config = config || {};
      let appVersionStored = this.store.some(e => e.app === config.app);
      this.store = appVersionStored
        ? this.store.map(e => e.app !== config.app ? e : config)
        : [...this.store, config];
    }
  }
  module.exports = Versions;

})();