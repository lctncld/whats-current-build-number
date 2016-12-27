(function() {
  'use strict';

  class Versions {
    constructor() {
      this.store = [];
    }

    add(config) {
      config = config || {};
      let appVersionStored = this.store.some(e => e.app === config.app);
      let store = appVersionStored
        ? this.store.map(e => e.app !== config.app ? e : config)
        : [...this.store, config];
      this.store = store.sort(function(a, b) {
        return b.date - a.date;
      });
    }
  }
  module.exports = Versions;

})();