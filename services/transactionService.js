class TransactionService {
  constructor() {
    this.transactions = [];
    this.maxTransactions = 1000; // Keep last 1000 transactions
  }

  createTransaction(symbol, price, state) {
    if (!['buy', 'sell'].includes(state.toLowerCase())) {
      throw new Error('State must be "buy" or "sell"');
    }

    const transaction = {
      id: this.generateId(),
      symbol: symbol || 'GOLD',
      price: parseFloat(price) || 0,
      state: state.toLowerCase(),
      dateTime: new Date().toISOString()
    };

    this.transactions.unshift(transaction); // Add to beginning
    
    // Keep only last maxTransactions
    if (this.transactions.length > this.maxTransactions) {
      this.transactions = this.transactions.slice(0, this.maxTransactions);
    }

    return transaction;
  }

  getAllTransactions(limit = null) {
    if (limit) {
      return this.transactions.slice(0, limit);
    }
    return this.transactions;
  }

  getTransactionById(id) {
    return this.transactions.find(t => t.id === id);
  }

  generateId() {
    return `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // For testing: create multiple transactions
  createBulkTransactions(count, symbol = 'GOLD') {
    const transactions = [];
    for (let i = 0; i < count; i++) {
      const price = 64000 + Math.random() * 1000;
      const state = Math.random() > 0.5 ? 'buy' : 'sell';
      transactions.push(this.createTransaction(symbol, price, state));
    }
    return transactions;
  }
}

module.exports = new TransactionService();

