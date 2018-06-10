pragma solidity ^0.4.18;

contract EscrowContract {

  enum State {EInitial, EEscrowFeePaid, EBuyerPaidPurchuase, EArbitrageRequested}

  address public seller;
  address public buyer;
  address public escrow;
  uint public escrowAmount;
  uint public purchuasePrice;
  State state;

  event EEscrowFeeDeposit(address);
  event EBuyerPaid(address);
  event EArbitrageRequested(address);
  
  function EscrowContract(uint _purchuasePrice, uint _escrowAmount, address _seller, address _buyer) public {
    require(_escrowAmount > 0 && _purchuasePrice > _escrowAmount && _seller != 0x0 && _buyer != 0x0);
    escrow = msg.sender;
    purchuasePrice = _purchuasePrice;
    escrowAmount = _escrowAmount;
    seller = _seller;
    buyer = _buyer;
    state = State.EInitial;
  }

  function sellerDepositEscrowFee() public payable {
    require(msg.sender == seller && msg.value == escrowAmount && state == State.EInitial);
    state = State.EEscrowFeePaid;
    emit EEscrowFeeDeposit(seller); 
  }
  
  function buyerDepositMoney() public payable {
    require(msg.sender == buyer && msg.value == purchuasePrice && state == State.EEscrowFeePaid);
    state = State.EBuyerPaidPurchuase;
    emit EBuyerPaid(buyer);
  }
  
  function buyerApproves() public {
    if (msg.sender == buyer) {
      //seller alo gets escrow amount back
      selfdestruct(seller);
    }
  }
  
  function cancelContract() public {
    if (msg.sender ==  seller && state == State.EEscrowFeePaid) {
      selfdestruct(seller);
    }
  }

  function requestArbitrage() public {
    if ((msg.sender == buyer || msg.sender == seller) && state == State.EBuyerPaidPurchuase) {
      state = State.EArbitrageRequested;
      emit EArbitrageRequested(msg.sender);
    }
  }

  function escrowArbitrage (bool toBuyer) public {
    if (msg.sender == escrow && state == State.EArbitrageRequested) {
      escrow.send(escrowAmount);
      if (toBuyer) {
        selfdestruct(buyer);
      }
      else {
        selfdestruct(seller);
      }
    }
  }
  
  function getState() constant public returns (uint) {
    return uint(state); 
  } 

  function getBalance() constant public returns(uint) {
    return this.balance;
  }
}
