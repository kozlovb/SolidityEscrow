pragma solidity ^0.4.18;

contract Actions {
  enum Action {ERead, EWrite}
  //cast enum to uint to get values
  mapping(uint => bool) public action_map;
  function hasAction(uint _action) public returns (bool) {
    return action_map[_action];  
  }
}

contract Scope {
  enum Scope {EAll, ECompanyA, ECompanyB}
  Scope public scope;  
}

/*Interface for permission contract*/
contract AbstractPermission {
  function isPermitted(Scope, uint /*Action enum*/ ) public returns (bool);
}

/*Example of a simple implementation*/
contract SimplePermissionImpl is AbstractPermission {
  address internal owner;
  //uint here stands for scope
  mapping(uint => Actions) internal permissions;
 
  function isPermitted(Scope _scope, uint/*Action enum*/ _action) public returns (bool) {
     Actions actions = permissions[uint(_scope)];
     return actions.hasAction(_action);
  }
}

contract PermissionsContainer {

  mapping(address => AbstractPermission) internal permissions;
  address internal owner;
  
  function PermissionsContainer() public {
    owner = msg.sender;   
  }

  /*Interface methode exposed for other contracts*/
  function isPermitted(address _agent, uint _action, Scope _scope) external returns (bool) {
    permissions[_agent].isPermitted(_scope, _action);
  }

  //Might be a multi sig
  function add_permission(address _agent, AbstractPermission _permission) public {
    if (owner == msg.sender) {
      permissions[_agent] = _permission;
    }
  } 
 
 //TODO other permission modifiers
}
