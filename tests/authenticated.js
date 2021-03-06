var assert = require('assert');
var nock = require('nock');

var CoinbaseExchange = require('../index.js');

var key = 'key';
var secret = 'secret';
var passphrase = 'passphrase';

var EXCHANGE_API_URL = 'https://api.gdax.com';

var authClient = new CoinbaseExchange.AuthenticatedClient(key, secret, passphrase);

test('._getSignature', function() {
  var method = 'PUT';
  var relativeURI = '/orders';
  var opts = {
    method : 'PUT',
    uri : 'https://api.gdax.com/orders'
  }
  
  var sig = authClient._getSignature(method, relativeURI, opts)

  assert.equal(sig['CB-ACCESS-KEY'], key);
  assert.equal(sig['CB-ACCESS-PASSPHRASE'], passphrase);

  assert(sig['CB-ACCESS-TIMESTAMP'])
  assert(sig['CB-ACCESS-SIGN'])
});

test('get account', function(done) {
  var expectedResponse = {
    "id": "a1b2c3d4",
    "balance": "1.100",
    "holds": "0.100",
    "available": "1.00",
    "currency": "USD" 
  }

  nock(EXCHANGE_API_URL)
      .get('/accounts/test-id')
      .reply(200, expectedResponse);

  authClient.getAccount('test-id', function(err, resp, data) {
    assert.ifError(err);
    assert.deepEqual(data, expectedResponse);

    nock.cleanAll();
    done();
  })
});

test('get accounts', function(done) {
  var expectedResponse = [{
    "id": "a1b2c3d4",
    "balance": "1.100",
    "holds": "0.100",
    "available": "1.00",
    "currency": "USD" 
  }]

  nock(EXCHANGE_API_URL)
      .get('/accounts')
      .reply(200, expectedResponse);

  authClient.getAccounts(function(err, resp, data) {
    assert.ifError(err);
    assert.deepEqual(data, expectedResponse);

    nock.cleanAll();
    done();
  });
});

test('get account history', function(done) {
  var expectedResponse = [ {
    "id": "100",
    "created_at": "2014-11-07T08:19:27.028459Z",
    "amount": "0.001",
    "balance": "239.669",
    "type": "fee",
    "details": {
        "order_id": "d50ec984-77a8-460a-b958-66f114b0de9b",
        "trade_id": "74",
        "product_id": "BTC-USD"
    }
  }];

  nock(EXCHANGE_API_URL)
      .get('/accounts/test-id/ledger')
      .reply(200, expectedResponse);

  authClient.getAccountHistory('test-id', function(err, resp, data) {
    assert.ifError(err);
    assert.deepEqual(data, expectedResponse);

    nock.cleanAll();
    done();
  });
});

test('get account holds', function(done) {
  var expectedResponse = [{
    "id": "82dcd140-c3c7-4507-8de4-2c529cd1a28f",
    "account_id": "e0b3f39a-183d-453e-b754-0c13e5bab0b3",
    "created_at": "2014-11-06T10:34:47.123456Z",
    "updated_at": "2014-11-06T10:40:47.123456Z",
    "amount": "4.23",
    "type": "order",
    "ref": "0a205de4-dd35-4370-a285-fe8fc375a273"
  }];

  nock(EXCHANGE_API_URL)
      .get('/accounts/test-id/holds')
      .reply(200, expectedResponse);

  authClient.getAccountHolds('test-id', function(err, resp, data) {
    assert.ifError(err);
    assert.deepEqual(data, expectedResponse);

    nock.cleanAll();
    done();
  });
});

test('buy order', function(done) {
  var order = {
    size : '10',
    product_id : 'BTC-USD',
    price : '100'
  };

  expectedOrder = order;
  expectedOrder.side = 'buy'

  var expectedResponse = {
    "id": "0428b97b-bec1-429e-a94c-59992926778d"
  }

  nock(EXCHANGE_API_URL)
      .post('/orders', expectedOrder)
      .reply(200, expectedResponse)

  authClient.buy(order, function(err, resp, data) {
    assert.ifError(err);
    assert.deepEqual(data, expectedResponse);

    nock.cleanAll();
    done();
  });
});

test('sell order', function(done) {
  var order = {
    size : '10',
    product_id : 'BTC-USD',
    price : '100'
  };

  expectedOrder = order;
  expectedOrder.side = 'sell'

  var expectedResponse = {
    "id": "0428b97b-bec1-429e-a94c-59992926778d"
  }

  nock(EXCHANGE_API_URL)
      .post('/orders', expectedOrder)
      .reply(200, expectedResponse)

  authClient.sell(order, function(err, resp, data) {
    assert.ifError(err);
    assert.deepEqual(data, expectedResponse);

    nock.cleanAll();
    done();
  });
});

test('get product orderbook', function(done) {

  nock(EXCHANGE_API_URL)
    .get('/products/BTC-USD/book?level=3')
    .reply(200,  {
      asks : [],
      bids: []
    });

  authClient.getProductOrderBook({level : 3}, 'BTC-USD', function(err, resp, data) {
    assert(data);
    done();
  });
}) 

test('cancel all orders', function(done) {
  // nock three requests to delete /orders

  var cancelledOrdersOne = [
    'deleted-id-1',
    'deleted-id-2',
    'deleted-id-3',
    'deleted-id-4'
  ];

  var cancelledOrdersTwo = [
    'deleted-id-5',
    'deleted-id-6',
    'deleted-id-7',
    'deleted-id-8'
  ];

  var totalExpectedDeleted = cancelledOrdersOne.concat(cancelledOrdersTwo);

  // first list of Id's that just got cancelled
  nock(EXCHANGE_API_URL)
  .delete('/orders')
  .reply(200, cancelledOrdersOne);

  // second list of Id's that just got cancelled
  nock(EXCHANGE_API_URL)
  .delete('/orders')
  .reply(200, cancelledOrdersTwo);

  // return empty array signalling the completion of all
  // orders having been cancelled
  nock(EXCHANGE_API_URL)
  .delete('/orders')
  .reply(200, []);

  authClient.cancelAllOrders(function(err, resp, totalDeletedOrders) {
    assert.ifError(err);
    assert.deepEqual(totalDeletedOrders, totalExpectedDeleted);

    nock.cleanAll();
    done();
  });
});

test('should require orderID for cancelOrder', function(done) {
  authClient.cancelOrder(function(err, resp, data) {
    assert(err);
    done();
  });
});

test('get orders', function(done) {
  var expectedResponse = [{
    "id": "d50ec984-77a8-460a-b958-66f114b0de9b",
    "size": "3.0",
    "price": "100.23",
    "product_id": "BTC-USD",
    "status": "open",
    "filled_size": "1.23",
    "fill_fees": "0.001",
    "settled": false,
    "side": "buy",
    "created_at": "2014-11-14T06:39:55.189376Z"
  }];

  nock(EXCHANGE_API_URL)
      .get('/orders')
      .reply(200, expectedResponse)

  authClient.getOrders(function(err, resp, data) {
    assert.ifError(err);
    assert.deepEqual(data, expectedResponse);

    nock.cleanAll();
    done();
  });
});

test('should require orderID for getOrder', function(done) {
  authClient.getOrder(function(err, resp, data) {
    assert(err);
    done();
  });
});

test('get fills', function(done) {
  var expectedResponse = [{
    "trade_id": 74,
    "product_id": "BTC-USD",
    "price": "10.00",
    "size": "0.01",
    "order_id": "d50ec984-77a8-460a-b958-66f114b0de9b",
    "created_at": "2014-11-07T22:19:28.578544Z",
    "liquidity": "T",
    "fee": "0.00025",
    "settled": true,
    "side": "buy"
  }];

  nock(EXCHANGE_API_URL)
      .get('/fills')
      .reply(200, expectedResponse);


  authClient.getFills(function(err, resp, data) {
    assert.ifError(err);
    assert.deepEqual(data, expectedResponse);

    nock.cleanAll();
    done();
  });
});

test('deposit', function(done) {
  var transfer = {
    "amount" : 10480,
    "coinbase_account_id": 'test-id' 
  }

  expectedTransfer = transfer;
  expectedTransfer.type = 'deposit';

  nock(EXCHANGE_API_URL)
      .post('/transfers', expectedTransfer)
      .reply(200, {});

  authClient.deposit(transfer, function(err, resp, data) {
    assert.ifError(err);

    nock.cleanAll();
    done();
  });
});

test('withdraw', function(done) {
  var transfer = {
    "amount" : 10480,
    "coinbase_account_id": 'test-id' 
  }

  expectedTransfer = transfer;
  expectedTransfer.type = 'withdraw';

  nock(EXCHANGE_API_URL)
      .post('/transfers', expectedTransfer)
      .reply(200, {});

  authClient.withdraw(transfer, function(err, resp, data) {
    assert.ifError(err);

    nock.cleanAll();
    done();
  });
});



test('cancel all should be able to handle errors', function(done) {
  nock(EXCHANGE_API_URL)
  .delete('/orders')
  .reply(404, null);

  authClient.cancelAllOrders(function(err, resp, totalExpectedDeleted) {
    assert(err);

    nock.cleanAll();
    done();
  });
});
