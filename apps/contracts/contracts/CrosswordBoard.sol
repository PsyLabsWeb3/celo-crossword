// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title CrosswordBoard
 * @dev Contract to store and manage crosswords for the Celo Crossword Learning App
 * This contract stores the current crossword data and manages admin access
 */
contract CrosswordBoard is Ownable, ReentrancyGuard, Pausable {
    // Events
    event CrosswordUpdated(bytes32 indexed crosswordId, string crosswordData, address updatedBy);
    event AdminAdded(address indexed admin, address addedBy);
    event AdminRemoved(address indexed admin, address removedBy);

    // State variables
    bytes32 public currentCrosswordId;
    string public currentCrosswordData;
    uint256 public lastUpdateTime;

    // Admin management
    mapping(address => bool) public isAdmin;
    address[] public admins;

    // Modifiers
    modifier onlyAdminOrOwner() {
        require(
            owner() == _msgSender() || isAdmin[_msgSender()], 
            "CrosswordBoard: caller is not the owner or an admin"
        );
        _;
    }

    /**
     * @dev Constructor - sets deployer as owner and first admin
     */
    constructor(address initialOwner) Ownable(initialOwner) {
        isAdmin[initialOwner] = true;
        admins.push(initialOwner);
    }

    /**
     * @dev Set a new crossword for all users to see
     * @param crosswordId Unique identifier for the crossword
     * @param crosswordData JSON string containing the crossword grid and clues
     */
    function setCrossword(bytes32 crosswordId, string memory crosswordData) 
        external 
        onlyAdminOrOwner 
        nonReentrant 
        whenNotPaused
    {
        require(bytes(crosswordData).length > 0, "CrosswordBoard: crossword data cannot be empty");
        
        currentCrosswordId = crosswordId;
        currentCrosswordData = crosswordData;
        lastUpdateTime = block.timestamp;

        emit CrosswordUpdated(crosswordId, crosswordData, _msgSender());
    }

    /**
     * @dev Get the current crossword data
     * @return crosswordId The ID of the current crossword
     * @return crosswordData The JSON string of the current crossword
     * @return updatedAt The timestamp when the crossword was last updated
     */
    function getCurrentCrossword() 
        external 
        view 
        returns (
            bytes32 crosswordId,
            string memory crosswordData,
            uint256 updatedAt
        ) 
    {
        return (
            currentCrosswordId,
            currentCrosswordData,
            lastUpdateTime
        );
    }

    /**
     * @dev Add a new admin
     * @param newAdmin Address to add as admin
     */
    function addAdmin(address newAdmin) external onlyOwner {
        require(newAdmin != address(0), "CrosswordBoard: admin address cannot be zero");
        require(!isAdmin[newAdmin], "CrosswordBoard: admin already exists");

        isAdmin[newAdmin] = true;
        admins.push(newAdmin);

        emit AdminAdded(newAdmin, _msgSender());
    }

    /**
     * @dev Remove an admin
     * @param adminToRemove Address to remove from admins
     */
    function removeAdmin(address adminToRemove) external onlyOwner {
        require(isAdmin[adminToRemove], "CrosswordBoard: admin does not exist");
        require(adminToRemove != owner(), "CrosswordBoard: cannot remove owner");

        isAdmin[adminToRemove] = false;
        
        // Remove from admins array
        for (uint256 i = 0; i < admins.length; i++) {
            if (admins[i] == adminToRemove) {
                admins[i] = admins[admins.length - 1];
                admins.pop();
                break;
            }
        }

        emit AdminRemoved(adminToRemove, _msgSender());
    }

    /**
     * @dev Get all admin addresses
     * @return Array of admin addresses
     */
    function getAdmins() external view returns (address[] memory) {
        return admins;
    }

    /**
     * @dev Check if an address is an admin
     * @param addr Address to check
     * @return bool True if the address is an admin
     */
    function isAdminAddress(address addr) external view returns (bool) {
        return isAdmin[addr];
    }

    /**
     * @dev Emergency function to clear crossword data if needed
     * Callable only by owner for emergency purposes
     */
    function emergencyClearCrossword() external onlyOwner {
        currentCrosswordId = bytes32(0);
        currentCrosswordData = "";
        lastUpdateTime = block.timestamp;
    }

    /**
     * @dev Pause the contract in case of emergency
     * Callable only by owner
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause the contract
     * Callable only by owner
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Internal function to check if contract is paused before sensitive operations
     */
    function _requireNotPaused() internal view virtual override(Pausable) {
        require(!paused(), "CrosswordBoard: contract is paused");
        super._requireNotPaused();
    }
}