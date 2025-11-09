// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title CrosswordPrizes
 * @dev Contract to manage prize pools for educational crosswords on Celo
 * Handles token rewards with configurable winners and percentages
 */
contract CrosswordPrizes is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // Role definitions
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    // Events
    event CrosswordCreated(
        bytes32 indexed crosswordId, 
        address indexed token, 
        uint256 prizePool, 
        address creator
    );
    event CrosswordActivated(bytes32 indexed crosswordId, uint256 activationTime);
    event WinnersRegistered(bytes32 indexed crosswordId, address[] winners);
    event PrizeDistributed(
        bytes32 indexed crosswordId, 
        address indexed winner, 
        uint256 amount, 
        uint256 percentage
    );
    event UnclaimedPrizesRecovered(
        bytes32 indexed crosswordId, 
        address indexed token, 
        uint256 amount, 
        address recoveredBy
    );
    event TokenAllowed(address indexed token, bool allowed);

    // Crossword status
    enum CrosswordState {
        Inactive,  // Created but not active
        Active,    // Active for solving
        Solved,    // Solution submitted but not finalized
        Finalized  // Prizes distributed, no further actions
    }

    // Crossword structure
    struct Crossword {
        IERC20 token;
        uint256 totalPrizePool;
        uint256[] winnerPercentages; // In basis points (10000 = 100%)
        address[] winners;
        uint256 activationTime;
        uint256 endTime; // 0 = no deadline
        CrosswordState state;
        bool isFinalized;
        uint256 createdAt;
        mapping(address => bool) hasClaimed; // Track claimed prizes
    }

    // State variables
    mapping(bytes32 => Crossword) public crosswords;
    mapping(address => bool) public allowedTokens;
    uint256 public constant MAX_WINNERS = 10;
    uint256 public constant MAX_PERCENTAGE = 10000; // 100% in basis points
    uint256 public constant MAX_SINGLE_WINNER_PERCENTAGE = 8000; // 80% max per winner
    uint256 public constant MAX_END_TIME = 30 days; // Max 30 days for deadline
    uint256 public constant RECOVERY_WINDOW = 30 days; // Unclaimed prizes recovery window

    /**
     * @dev Constructor - sets up roles and initial admin
     */
    constructor(address initialAdmin) {
        _grantRole(DEFAULT_ADMIN_ROLE, initialAdmin);
        _grantRole(ADMIN_ROLE, initialAdmin);
        _grantRole(OPERATOR_ROLE, initialAdmin);
    }

    /**
     * @dev Create a new crossword with prize pool
     * @param crosswordId Unique identifier for the crossword
     * @param token ERC-20 token address for rewards
     * @param prizePool Total amount of tokens for the prize pool
     * @param winnerPercentages Array of basis points for each winner (e.g., [6000, 4000] = 60%/40%)
     * @param endTime Optional deadline for submissions (0 for no deadline)
     */
    function createCrossword(
        bytes32 crosswordId,
        address token,
        uint256 prizePool,
        uint256[] memory winnerPercentages,
        uint256 endTime
    ) external onlyRole(ADMIN_ROLE) whenNotPaused {
        require(token != address(0), "CrosswordPrizes: token cannot be zero address");
        require(allowedTokens[token], "CrosswordPrizes: token not allowed");
        require(prizePool > 0, "CrosswordPrizes: prize pool must be greater than 0");
        require(winnerPercentages.length > 0, "CrosswordPrizes: winners required");
        require(winnerPercentages.length <= MAX_WINNERS, "CrosswordPrizes: too many winners");
        require(prizePool >= winnerPercentages.length, "CrosswordPrizes: prize pool too small for winners");

        // Validate percentages sum to 10000 (100%) or less
        uint256 totalPercentage = 0;
        for (uint256 i = 0; i < winnerPercentages.length; i++) {
            require(
                winnerPercentages[i] > 0, 
                "CrosswordPrizes: winner percentage must be greater than 0"
            );
            require(
                winnerPercentages[i] <= MAX_SINGLE_WINNER_PERCENTAGE,
                "CrosswordPrizes: single winner percentage too high"
            );
            totalPercentage += winnerPercentages[i];
        }
        require(
            totalPercentage <= MAX_PERCENTAGE, 
            "CrosswordPrizes: total percentage exceeds 100%"
        );

        // Validate endTime
        if (endTime > 0) {
            require(
                endTime <= block.timestamp + MAX_END_TIME,
                "CrosswordPrizes: end time too far in the future"
            );
        }

        // Transfer tokens from admin to contract
        IERC20 tokenContract = IERC20(token);
        tokenContract.safeTransferFrom(_msgSender(), address(this), prizePool);

        Crossword storage crossword = crosswords[crosswordId];
        crossword.token = tokenContract;
        crossword.totalPrizePool = prizePool;
        crossword.winnerPercentages = winnerPercentages;
        crossword.endTime = endTime;
        crossword.state = CrosswordState.Inactive;
        crossword.isFinalized = false;
        crossword.createdAt = block.timestamp;

        emit CrosswordCreated(crosswordId, token, prizePool, _msgSender());
    }

    /**
     * @dev Activate a crossword (make it available for solving)
     * @param crosswordId The ID of the crossword to activate
     */
    function activateCrossword(bytes32 crosswordId) external onlyRole(ADMIN_ROLE) whenNotPaused {
        Crossword storage crossword = crosswords[crosswordId];
        require(crossword.state != CrosswordState.Finalized, "CrosswordPrizes: already finalized");
        require(crossword.state != CrosswordState.Active, "CrosswordPrizes: already active");
        require(address(crossword.token) != address(0), "CrosswordPrizes: crossword not created");

        crossword.state = CrosswordState.Active;
        crossword.activationTime = block.timestamp;

        emit CrosswordActivated(crosswordId, block.timestamp);
    }

    /**
     * @dev Register winners for an active crossword
     * @param crosswordId The ID of the crossword
     * @param winners Array of winner addresses
     */
    function registerWinners(bytes32 crosswordId, address[] memory winners) 
        external 
        onlyRole(ADMIN_ROLE) 
        whenNotPaused
    {
        Crossword storage crossword = crosswords[crosswordId];
        require(crossword.state == CrosswordState.Active, "CrosswordPrizes: crossword not active");
        require(!crossword.isFinalized, "CrosswordPrizes: already finalized");

        // Check if past endTime (if set)
        if (crossword.endTime > 0) {
            require(block.timestamp <= crossword.endTime, "CrosswordPrizes: deadline passed");
        }

        require(
            winners.length == crossword.winnerPercentages.length,
            "CrosswordPrizes: winners count mismatch"
        );
        require(
            winners.length <= MAX_WINNERS,
            "CrosswordPrizes: too many winners"
        );

        // Validate no duplicate or zero addresses
        for (uint256 i = 0; i < winners.length; i++) {
            require(winners[i] != address(0), "CrosswordPrizes: winner address cannot be zero");
            for (uint256 j = 0; j < i; j++) {
                require(winners[i] != winners[j], "CrosswordPrizes: duplicate winner address");
            }
        }

        // Check that the same addresses weren't already registered
        require(crossword.winners.length == 0, "CrosswordPrizes: winners already registered");

        // Clear existing winners first
        delete crossword.winners;
        
        // Add new winners
        for (uint256 i = 0; i < winners.length; i++) {
            crossword.winners.push(winners[i]);
        }

        // Move to Solved state (ready for prize distribution)
        crossword.state = CrosswordState.Solved;

        emit WinnersRegistered(crosswordId, winners);
    }

    /**
     * @dev Distribute prizes to registered winners
     * @param crosswordId The ID of the crossword
     */
    function distributePrizes(bytes32 crosswordId) external onlyRole(ADMIN_ROLE) nonReentrant whenNotPaused {
        Crossword storage crossword = crosswords[crosswordId];
        require(crossword.state == CrosswordState.Solved, "CrosswordPrizes: must be in solved state");
        require(!crossword.isFinalized, "CrosswordPrizes: already finalized");
        require(crossword.winners.length > 0, "CrosswordPrizes: no winners registered");
        require(crossword.winners.length == crossword.winnerPercentages.length, "CrosswordPrizes: winners/percentages mismatch");

        // Check that contract has sufficient balance
        uint256 contractBalance = crossword.token.balanceOf(address(this));
        require(contractBalance >= crossword.totalPrizePool, "CrosswordPrizes: insufficient contract balance");

        uint256 totalDistributed = 0;
        uint256[] memory prizes = new uint256[](crossword.winners.length);

        // Calculate all prizes first to avoid rounding issues
        for (uint256 i = 0; i < crossword.winners.length; i++) {
            // Calculate prize: totalPrizePool * percentage / 10000
            prizes[i] = (crossword.totalPrizePool * crossword.winnerPercentages[i]) / MAX_PERCENTAGE;
            totalDistributed += prizes[i];
        }

        // Validate that total distribution doesn't exceed pool (accounting for rounding)
        require(totalDistributed <= crossword.totalPrizePool, "CrosswordPrizes: distribution exceeds prize pool");

        // Actually transfer tokens
        for (uint256 i = 0; i < crossword.winners.length; i++) {
            if (prizes[i] > 0) {
                crossword.token.safeTransfer(crossword.winners[i], prizes[i]);
                crossword.hasClaimed[crossword.winners[i]] = true;
                emit PrizeDistributed(
                    crosswordId, 
                    crossword.winners[i], 
                    prizes[i], 
                    crossword.winnerPercentages[i]
                );
            }
        }

        // Mark as finalized
        crossword.state = CrosswordState.Finalized;
        crossword.isFinalized = true;
    }

    /**
     * @dev Allow winners to claim their prizes (fallback for distributePrizes issues)
     * @param crosswordId The ID of the crossword
     */
    function claimPrize(bytes32 crosswordId) external nonReentrant whenNotPaused {
        Crossword storage crossword = crosswords[crosswordId];
        require(crossword.state == CrosswordState.Solved || crossword.state == CrosswordState.Finalized, "CrosswordPrizes: prize distribution not ready");
        require(!crossword.hasClaimed[_msgSender()], "CrosswordPrizes: already claimed");
        
        uint256 winnerIndex = getWinnerIndex(crosswordId, _msgSender());
        require(winnerIndex != type(uint256).max, "CrosswordPrizes: not a winner");

        uint256 prizeAmount = (crossword.totalPrizePool * crossword.winnerPercentages[winnerIndex]) / MAX_PERCENTAGE;
        
        require(prizeAmount > 0, "CrosswordPrizes: no prize available");

        // Check that contract has sufficient balance for this claim
        uint256 contractBalance = crossword.token.balanceOf(address(this));
        require(contractBalance >= prizeAmount, "CrosswordPrizes: insufficient contract balance");

        crossword.hasClaimed[_msgSender()] = true;
        crossword.token.safeTransfer(_msgSender(), prizeAmount);

        emit PrizeDistributed(crosswordId, _msgSender(), prizeAmount, crossword.winnerPercentages[winnerIndex]);
    }

    /**
     * @dev Recover unclaimed prizes after recovery window
     * @param crosswordId The ID of the crossword
     */
    function recoverUnclaimedPrizes(bytes32 crosswordId) external onlyRole(ADMIN_ROLE) nonReentrant whenNotPaused {
        Crossword storage crossword = crosswords[crosswordId];
        require(crossword.isFinalized, "CrosswordPrizes: crossword not finalized");
        require(
            block.timestamp >= crossword.activationTime + RECOVERY_WINDOW,
            "CrosswordPrizes: recovery window not elapsed"
        );
        require(crossword.activationTime > 0, "CrosswordPrizes: crossword not activated");

        uint256 remainingBalance = crossword.token.balanceOf(address(this));
        
        // Additional check to ensure we're not recovering more than expected
        // Calculate how much should have been distributed
        uint256 totalExpectedDistributed = 0;
        for (uint256 i = 0; i < crossword.winners.length; i++) {
            uint256 expectedPrize = (crossword.totalPrizePool * crossword.winnerPercentages[i]) / MAX_PERCENTAGE;
            if (!crossword.hasClaimed[crossword.winners[i]]) {
                totalExpectedDistributed += expectedPrize;
            }
        }

        // Only recover what's actually remaining (could be slightly different due to rounding)
        uint256 amountToRecover = remainingBalance > totalExpectedDistributed ? totalExpectedDistributed : remainingBalance;
        
        // Only recover if there's a balance that wasn't distributed
        if (amountToRecover > 0) {
            crossword.token.safeTransfer(_msgSender(), amountToRecover);
            emit UnclaimedPrizesRecovered(crosswordId, address(crossword.token), amountToRecover, _msgSender());
        }
    }

    /**
     * @dev Add/remove allowed tokens for prize pools
     * @param token Token address to update
     * @param allowed Whether the token is allowed
     */
    function setAllowedToken(address token, bool allowed) external onlyRole(DEFAULT_ADMIN_ROLE) {
        allowedTokens[token] = allowed;
        emit TokenAllowed(token, allowed);
    }

    /**
     * @dev Pause function to stop all distributions (alias for emergency pause)
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev Unpause function
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @dev Check if an address is a winner for a specific crossword
     * @param crosswordId The ID of the crossword
     * @param user The address to check
     * @return bool Whether the user is a winner
     */
    function isWinner(bytes32 crosswordId, address user) external view returns (bool) {
        Crossword storage crossword = crosswords[crosswordId];
        for (uint256 i = 0; i < crossword.winners.length; i++) {
            if (crossword.winners[i] == user) {
                return true;
            }
        }
        return false;
    }

    /**
     * @dev Get winner index
     * @param crosswordId The ID of the crossword
     * @param user The address to check
     * @return uint256 Winner index or type(uint256).max if not a winner
     */
    function getWinnerIndex(bytes32 crosswordId, address user) internal view returns (uint256) {
        Crossword storage crossword = crosswords[crosswordId];
        for (uint256 i = 0; i < crossword.winners.length; i++) {
            if (crossword.winners[i] == user) {
                return i;
            }
        }
        return type(uint256).max; // Not found
    }

    /**
     * @dev Get crossword details
     * @param crosswordId The ID of the crossword
     * @return token The token address
     * @return totalPrizePool The total prize pool
     * @return winnerPercentages The percentages for each winner
     * @return winners The addresses of the winners
     * @return activationTime The activation timestamp
     * @return endTime The end time for submissions
     * @return state The current state of the crossword
     * @return isFinalized Whether the crossword is finalized
     */
    function getCrosswordDetails(bytes32 crosswordId) 
        external 
        view 
        returns (
            address token,
            uint256 totalPrizePool,
            uint256[] memory winnerPercentages,
            address[] memory winners,
            uint256 activationTime,
            uint256 endTime,
            CrosswordState state,
            bool isFinalized
        ) 
    {
        Crossword storage crossword = crosswords[crosswordId];
        return (
            address(crossword.token),
            crossword.totalPrizePool,
            crossword.winnerPercentages,
            crossword.winners,
            crossword.activationTime,
            crossword.endTime,
            crossword.state,
            crossword.isFinalized
        );
    }

    /**
     * @dev Internal function to check if contract is paused before sensitive operations
     */
    function _requireNotPaused() internal view virtual override(Pausable) {
        require(!paused(), "CrosswordPrizes: contract is paused");
        super._requireNotPaused();
    }
}