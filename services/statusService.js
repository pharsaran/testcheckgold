class StatusService {
  constructor() {
    this.statuses = {
      spot: 'online',
      gold9999: 'online',
      gold9650: 'online'
    };
  }

  initialize() {
    // Initialize with default online status
    this.statuses = {
      spot: 'online',
      gold9999: 'online',
      gold9650: 'online'
    };
  }

  getAllStatuses() {
    return this.statuses;
  }

  getStatus(priceType) {
    return this.statuses[priceType] || 'online';
  }

  updateStatus(priceType, status) {
    if (['online', 'pause', 'stop'].includes(status)) {
      this.statuses[priceType] = status;
      return this.statuses;
    }
    throw new Error('Invalid status. Must be online, pause, or stop');
  }

  updateStatuses(states) {
    if (!Array.isArray(states)) {
      throw new Error('States must be an array');
    }

    states.forEach(state => {
      const { priceType, status } = state;
      if (priceType && status) {
        this.updateStatus(priceType, status);
      }
    });

    return this.statuses;
  }
}

module.exports = new StatusService();

