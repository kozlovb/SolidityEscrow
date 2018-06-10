//Run ganache-cli --accounts=20


var sleep = require('system-sleep');
var price =            10000000000000000000;
var escrow_fee =        1000000000000000000;
var initial_balance = 100000000000000000000;
var tolerate =                     10000000;
//gas                                5000000;

function setUpContract(seller, buyer, escrow, price, escrow_fee) {
  Web3 = require('web3')
  web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"))
  var fs = require('fs');
  var code = fs.readFileSync('Escrow.sol').toString()
  var solc = require('solc')
  var compiledCode = solc.compile(code)
  var abiDefinition = JSON.parse(compiledCode.contracts[':EscrowContract'].interface)
  var EscrowContract = web3.eth.contract(abiDefinition)
  var byteCode = compiledCode.contracts[':EscrowContract'].bytecode
  var deployedContract = EscrowContract.new(price, escrow_fee,web3.eth.accounts[seller],web3.eth.accounts[buyer],{data:byteCode, from: web3.eth.accounts[escrow], gas: 5000000})
  //var sleep = require('system-sleep');
  //otherwise ganache doesnt work
  sleep(5*1000);
  var contractInstance = EscrowContract.at(deployedContract.address)
  return contractInstance;
}

function setUp(iter) {
  var seller = iter + 1;
  var buyer = iter + 2;
  var escrow = iter + 3;
  contract = setUpContract(seller, buyer, escrow, price, escrow_fee);
  return [seller, buyer, escrow, contract];
}

function checkResults(seller, buyer, escrow, results) {
  //var tolerate = 100000;
  // web3.fromWei
  var seller_balance = web3.eth.getBalance(web3.eth.accounts[seller]).toNumber(); 
  var buyer_balance = web3.eth.getBalance(web3.eth.accounts[buyer]).toNumber();
  var escrow_balance = web3.eth.getBalance(web3.eth.accounts[escrow]).toNumber();
  var passed = true;
  if(seller_balance > results[0] + tolerate || seller_balance < results[0] - tolerate) 
  {
    console.log("ERROR Sellers balance is %d", seller_balance, " should be %d", results[0]);
    passed = false;
  } 
  if(buyer_balance > results[1] + tolerate || buyer_balance < results[1] - tolerate)
  {
    console.log("ERROR Buyer balance is %d", buyer_balance, " should be %d", results[1]);
    passed = false;
  }
  if(escrow_balance > results[2] + tolerate || escrow_balance < results[2] - tolerate)
  {
    console.log("ERROR Escrow balance is %d", escrow_balance, " should be %d", results[2]);
    passed = false;
  }
  if(passed)
  console.log("Passed");
}

function test_normal_flow(iter) {
  console.log("TEST normal flow");
  var setUpRes = setUp(iter);
  var seller = setUpRes[0];
  var buyer = setUpRes[1];
  var escrow = setUpRes[2];
  var contractInstance = setUpRes[3]; 
  contractInstance.sellerDepositEscrowFee({from: web3.eth.accounts[seller], value: escrow_fee});
  contractInstance.buyerDepositMoney({from: web3.eth.accounts[buyer], value: price});
  contractInstance.buyerApproves({from: web3.eth.accounts[buyer]});
 // balance seller - 100.99999999999995 balance buyer - 98.99999999999995 balance escrow - 99.9999999999991
  checkResults(seller, buyer, escrow,[initial_balance + price, initial_balance-price, initial_balance ] );  
  return iter + 3;
}

function test_seller_cancels(iter) {
  console.log("TEST seller_cancels");
  var setUpRes = setUp(iter);
  var seller = setUpRes[0];
  var buyer = setUpRes[1];
  var escrow = setUpRes[2];
  var contractInstance = setUpRes[3];
  contractInstance.sellerDepositEscrowFee({from: web3.eth.accounts[seller], value: escrow_fee})
  contractInstance.cancelContract({from: web3.eth.accounts[seller]})
  var seller_balance = web3.fromWei(web3.eth.getBalance(web3.eth.accounts[seller]).toNumber());
  var buyer_balance = web3.fromWei(web3.eth.getBalance(web3.eth.accounts[buyer]).toNumber());
  var escrow_balance = web3.fromWei(web3.eth.getBalance(web3.eth.accounts[escrow]).toNumber());
  // balance seller - 99.99999999999985 balance buyer - 100  balance escrow - 99.9999999999991
  checkResults(seller, buyer, escrow, [initial_balance, initial_balance, initial_balance ] );  
  return iter + 3;
}

function test_buyer_gets_money_back(iter) {
  console.log("TEST buyer gets money back");
  var setUpRes = setUp(iter);
  var seller = setUpRes[0];
  var buyer = setUpRes[1];
  var escrow = setUpRes[2];
  var contractInstance = setUpRes[3];
  contractInstance.sellerDepositEscrowFee({from: web3.eth.accounts[seller], value: escrow_fee})
  contractInstance.buyerDepositMoney({from: web3.eth.accounts[buyer], value: price})
  contractInstance.requestArbitrage({from: web3.eth.accounts[buyer]})
  contractInstance.escrowArbitrage(true, {from: web3.eth.accounts[escrow]})
  checkResults(seller, buyer, escrow, [initial_balance - escrow_fee, initial_balance, initial_balance + escrow_fee ] );  
  return iter + 3;
}

function test_buyer_never_approves(iter) 
{
  console.log("TEST buyer never approves");
  var setUpRes = setUp(iter);
  var seller = setUpRes[0];
  var buyer = setUpRes[1];
  var escrow = setUpRes[2];
  var contractInstance = setUpRes[3];
  contractInstance.sellerDepositEscrowFee({from: web3.eth.accounts[seller], value: escrow_fee})
  contractInstance.buyerDepositMoney({from: web3.eth.accounts[buyer], value: price})
  contractInstance.requestArbitrage({from: web3.eth.accounts[seller]})
  contractInstance.escrowArbitrage(false, {from: web3.eth.accounts[escrow]})
  checkResults(seller, buyer, escrow, [initial_balance + price - escrow_fee, initial_balance - price, initial_balance + escrow_fee ] );
  return iter+3;
}
var arrTests = [test_normal_flow, test_seller_cancels, test_buyer_gets_money_back , test_buyer_never_approves];
//execute tests

var iter = 0;
for (var i = 0; i < arrTests.length; i++) {
    iter = arrTests[i](iter);
}

