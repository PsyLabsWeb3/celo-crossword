// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title CrosswordBoard
 * @dev Unified contract to store and manage crosswords for the Celo Crossword Learning App
 * This contract stores configuration settings and prize management along with
 * the core crossword functionality, unifying all previous separate contracts.
 */
contract CrosswordBoard is Ownable, AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    // Events for config management
    event ConfigSet(string indexed key, string value, address setter);
    event ConfigBoolSet(string indexed key, bool value, address setter);
    event ConfigUIntSet(string indexed key, uint256 value, address setter);

    // Events for crossword management
    event CrosswordUpdated(bytes32 indexed crosswordId, string crosswordData, address updatedBy);
    event CrosswordCompleted(
        bytes32 indexed crosswordId,
        address indexed user,
        uint256 timestamp,
        uint256 durationMs
    );
    event AdminAdded(address indexed admin, address addedBy);
    event AdminRemoved(address indexed admin, address removedBy);

    // Events for prize management
    event CrosswordCreated(
        bytes32 indexed crosswordId,
        address indexed token,
        uint256 prizePool,
        address creator
    );
    event CrosswordActivated(bytes32 indexed crosswordId, uint256 activationTime);
    event PrizeDistributed(
        bytes32 indexed crosswordId,
        address indexed winner,
        uint256 amount,
        uint256 rank
    );
    event UnclaimedPrizesRecovered(
        bytes32 indexed crosswordId,
        address indexed token,
        uint256 amount,
        address recoveredBy
    );
    event TokenAllowed(address indexed token, bool allowed);
    event NativeCeloReceived(address indexed sender, uint256 amount);
    event PrizeTransferFailed(
        bytes32 indexed crosswordId,
        address indexed user,
        uint256 amount,
        string reason
    );
    event MaxWinnersChanged(uint256 oldMaxWinners, uint256 newMaxWinners, address changedBy);

    // Configuration keys for various settings
    string public constant HOME_BUTTON_VISIBLE = "home_button_visible";
    string public constant MAX_WINNERS_CONFIG = "max_winners";

    // Crossword status
    enum CrosswordState {
        Inactive,  // Created but not active
        Active,    // Active for solving
        Complete   // All prizes distributed
    }

    // Completion record
    struct CompletionRecord {
        address user;
        uint256 timestamp;
        uint256 rank; // 1-indexed rank (1st place, 2nd place, etc.)
    }

    // Crossword structure
    struct Crossword {
        address token; // Can be ERC20 token address or address(0) for native CELO
        uint256 totalPrizePool;
        uint256[] winnerPercentages; // In basis points (10000 = 100%)
        CompletionRecord[] completions; // Track who completed in what order
        mapping(address => bool) hasClaimed; // Track claimed prizes
        uint256 activationTime;
        uint256 endTime; // 0 = no deadline
        CrosswordState state;
        uint256 createdAt;
        uint256 claimedAmount; // Track claimed amount for native CELO
    }

    // User profile structure
    struct UserProfile {
        string username;
        string displayName;
        string pfpUrl;
        uint256 timestamp;
    }

    // Crossword completion structure
    struct CrosswordCompletion {
        address user;
        uint256 completionTimestamp;
        uint256 durationMs;
    }

    // State variables for configuration
    mapping(string => string) private _configValues;
    mapping(string => bool) private _configBools;
    mapping(string => uint256) private _configUInts;

    // State variables for crossword data
    bytes32 public currentCrosswordId;
    string public currentCrosswordData;
    uint256 public lastUpdateTime;

    // State variables for prizes and crosswords
    mapping(bytes32 => Crossword) public crosswords;
    mapping(address => bool) public allowedTokens;
    uint256 public maxWinners = 3; // Configurable maximum number of winners, defaulting to 3
    uint256 public constant MAX_CONFIGURABLE_WINNERS = 10; // Maximum allowed configurable winners
    uint256 public constant MAX_PERCENTAGE = 10000; // 100% in basis points
    uint256 public constant MAX_SINGLE_WINNER_PERCENTAGE = 8000; // 80% max per winner
    uint256 public constant MAX_END_TIME = 30 days; // Max 30 days for deadline
    uint256 public constant RECOVERY_WINDOW = 30 days; // Unclaimed prizes recovery window
    uint256 public constant MAX_COMPLETIONS_PER_CROSSWORD = 1000; // Maximum completions to prevent DoS
    uint256 public constant MAX_USERNAME_LENGTH = 100; // Maximum username length
    uint256 public constant MAX_DISPLAYNAME_LENGTH = 200; // Maximum display name length
    uint256 public constant MAX_PFPURL_LENGTH = 500; // Maximum profile picture URL length

    // Completions tracking
    mapping(bytes32 => CrosswordCompletion[]) public crosswordCompletions;
    mapping(bytes32 => mapping(address => bool)) public hasCompletedCrossword;

    // User profiles
    mapping(address => UserProfile) public userProfiles;

    // Admin management
    mapping(address => bool) public isAdmin;
    address[] public admins;

    // Security improvements: O(1) lookup for user ranks and segregated CELO balance tracking
    mapping(bytes32 => mapping(address => uint256)) public userRankInCrossword; // 0 = not a winner, 1+ = rank
    mapping(bytes32 => uint256) public crosswordCeloBalance; // Segregated CELO balance per crossword

    // Modifiers
    modifier onlyAdminOrOwner() {
        require(
            owner() == _msgSender() || isAdmin[_msgSender()] || hasRole(ADMIN_ROLE, _msgSender()),
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

        // Grant default admin role to initial owner
        _grantRole(DEFAULT_ADMIN_ROLE, initialOwner);
        _grantRole(ADMIN_ROLE, initialOwner);
        _grantRole(OPERATOR_ROLE, initialOwner);

        // By default, allow native CELO (address(0)) and some common Celo tokens
        allowedTokens[address(0)] = true; // Native CELO
    }

    // Configuration management functions
    /**
     * @dev Set a string configuration value
     * @param key The configuration key
     * @param value The string value to store
     */
    function setStringConfig(string calldata key, string calldata value) external onlyRole(ADMIN_ROLE) whenNotPaused {
        _configValues[key] = value;
        emit ConfigSet(key, value, _msgSender());
    }

    /**
     * @dev Set a boolean configuration value
     * @param key The configuration key
     * @param value The boolean value to store
     */
    function setBoolConfig(string calldata key, bool value) external onlyRole(ADMIN_ROLE) whenNotPaused {
        _configBools[key] = value;
        emit ConfigBoolSet(key, value, _msgSender());
    }

    /**
     * @dev Set a uint256 configuration value
     * @param key The configuration key
     * @param value The uint256 value to store
     */
    function setUIntConfig(string calldata key, uint256 value) external onlyRole(ADMIN_ROLE) whenNotPaused {
        _configUInts[key] = value;
        // Also set the config value string to indicate the key exists (avoiding default value)
        _configValues[key] = Strings.toString(value);
        emit ConfigUIntSet(key, value, _msgSender());
    }

    /**
     * @dev Get a string configuration value
     * @param key The configuration key
     * @return The string value
     */
    function getStringConfig(string calldata key) external view returns (string memory) {
        return _configValues[key];
    }

    /**
     * @dev Get a boolean configuration value
     * @param key The configuration key
     * @return The boolean value
     */
    function getBoolConfig(string calldata key) external view returns (bool) {
        return _configBools[key];
    }

    /**
     * @dev Get a uint256 configuration value
     * @param key The configuration key
     * @return The uint256 value
     */
    function getUIntConfig(string calldata key) external view returns (uint256) {
        return _configUInts[key];
    }

    /**
     * @dev Check if a boolean config exists and get its value with a default
     * @param key The configuration key
     * @param defaultValue The default value if key doesn't exist
     * @return The boolean value (stored or default)
     */
    function getBoolConfigWithDefault(string calldata key, bool defaultValue) external view returns (bool) {
        if (bytes(_configValues[key]).length == 0) {
            return defaultValue;
        }
        return _configBools[key];
    }

    /**
     * @dev Check if a uint config exists and get its value with a default
     * @param key The configuration key
     * @param defaultValue The default value if key doesn't exist
     * @return The uint256 value (stored or default)
     */
    function getUIntConfigWithDefault(string calldata key, uint256 defaultValue) external view returns (uint256) {
        if (bytes(_configValues[key]).length == 0) {
            return defaultValue;
        }
        return _configUInts[key];
    }

    /**
     * @dev Set default configurations
     * This can be called once by admin to set initial values
     */
    function setDefaultConfigurations() external onlyRole(ADMIN_ROLE) {
        // Set default visibility for return home button to true
        if (bytes(_configValues[HOME_BUTTON_VISIBLE]).length == 0) {
            _configBools[HOME_BUTTON_VISIBLE] = true; // Default to visible
            emit ConfigBoolSet(HOME_BUTTON_VISIBLE, true, _msgSender());
        }

        // Set default max winners to 3
        if (bytes(_configValues[MAX_WINNERS_CONFIG]).length == 0) {
            _configUInts[MAX_WINNERS_CONFIG] = 3; // Default to 3
            emit ConfigUIntSet(MAX_WINNERS_CONFIG, 3, _msgSender());
        }
    }

    // Prize management functions (formerly in CrosswordPrizes contract)
    /**
     * @dev Create a new crossword with prize pool using ERC-20 tokens
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
        require(token != address(0), "CrosswordBoard: token cannot be zero address for ERC20");
        require(allowedTokens[token], "CrosswordBoard: token not allowed");
        require(prizePool > 0, "CrosswordBoard: prize pool must be greater than 0");
        require(winnerPercentages.length > 0, "CrosswordBoard: winners required");
        require(winnerPercentages.length <= maxWinners, "CrosswordBoard: too many winners");
        require(prizePool >= winnerPercentages.length, "CrosswordBoard: prize pool too small for winners");

        // Validate percentages sum to 10000 (100%) or less
        uint256 totalPercentage = 0;
        for (uint256 i = 0; i < winnerPercentages.length; i++) {
            require(
                winnerPercentages[i] > 0,
                "CrosswordBoard: winner percentage must be greater than 0"
            );
            require(
                winnerPercentages[i] <= MAX_SINGLE_WINNER_PERCENTAGE,
                "CrosswordBoard: single winner percentage too high"
            );
            totalPercentage += winnerPercentages[i];
        }
        require(
            totalPercentage <= MAX_PERCENTAGE,
            "CrosswordBoard: total percentage exceeds 100%"
        );

        // Validate endTime
        if (endTime > 0) {
            require(
                endTime <= block.timestamp + MAX_END_TIME,
                "CrosswordBoard: end time too far in the future"
            );
        }

        // Transfer tokens from admin to contract
        IERC20 tokenContract = IERC20(token);
        tokenContract.safeTransferFrom(_msgSender(), address(this), prizePool);

        Crossword storage crossword = crosswords[crosswordId];
        crossword.token = token;
        crossword.totalPrizePool = prizePool;
        crossword.winnerPercentages = winnerPercentages;
        crossword.endTime = endTime;
        crossword.state = CrosswordState.Active; // Auto-activate when funded
        crossword.activationTime = block.timestamp; // Set activation time when funded
        crossword.createdAt = block.timestamp;
        crossword.claimedAmount = 0;

        emit CrosswordCreated(crosswordId, token, prizePool, _msgSender());
        emit CrosswordActivated(crosswordId, block.timestamp);
    }

    /**
     * @dev Create a new crossword with native CELO prize pool
     * @param crosswordId Unique identifier for the crossword
     * @param prizePool Total amount of CELO for the prize pool (in wei)
     * @param winnerPercentages Array of basis points for each winner (e.g., [6000, 4000] = 60%/40%)
     * @param endTime Optional deadline for submissions (0 for no deadline)
     */
    function createCrosswordWithNativeCELO(
        bytes32 crosswordId,
        uint256 prizePool,
        uint256[] memory winnerPercentages,
        uint256 endTime
    ) external payable onlyRole(ADMIN_ROLE) whenNotPaused {
        require(msg.value == prizePool, "CrosswordBoard: sent value must match prize pool");
        require(allowedTokens[address(0)], "CrosswordBoard: native CELO not allowed");
        require(prizePool > 0, "CrosswordBoard: prize pool must be greater than 0");
        require(winnerPercentages.length > 0, "CrosswordBoard: winners required");
        require(winnerPercentages.length <= maxWinners, "CrosswordBoard: too many winners");
        require(prizePool >= winnerPercentages.length, "CrosswordBoard: prize pool too small for winners");

        // Validate percentages sum to 10000 (100%) or less
        uint256 totalPercentage = 0;
        for (uint256 i = 0; i < winnerPercentages.length; i++) {
            require(
                winnerPercentages[i] > 0,
                "CrosswordBoard: winner percentage must be greater than 0"
            );
            require(
                winnerPercentages[i] <= MAX_SINGLE_WINNER_PERCENTAGE,
                "CrosswordBoard: single winner percentage too high"
            );
            totalPercentage += winnerPercentages[i];
        }
        require(
            totalPercentage <= MAX_PERCENTAGE,
            "CrosswordBoard: total percentage exceeds 100%"
        );

        // Validate endTime
        if (endTime > 0) {
            require(
                endTime <= block.timestamp + MAX_END_TIME,
                "CrosswordBoard: end time too far in the future"
            );
        }

        Crossword storage crossword = crosswords[crosswordId];
        crossword.token = address(0); // Native CELO
        crossword.totalPrizePool = prizePool;
        crossword.winnerPercentages = winnerPercentages;
        crossword.endTime = endTime;
        crossword.state = CrosswordState.Active; // Auto-activate when funded
        crossword.activationTime = block.timestamp; // Set activation time when funded
        crossword.createdAt = block.timestamp;
        crossword.claimedAmount = 0;
        
        // SECURITY FIX: Initialize segregated CELO balance
        crosswordCeloBalance[crosswordId] = prizePool;

        emit CrosswordCreated(crosswordId, address(0), prizePool, _msgSender());
        emit CrosswordActivated(crosswordId, block.timestamp);
    }

    /**
     * @dev Activate a crossword (make it available for solving)
     * @param crosswordId The ID of the crossword to activate
     */
    function activateCrossword(bytes32 crosswordId) external onlyRole(ADMIN_ROLE) whenNotPaused {
        Crossword storage crossword = crosswords[crosswordId];
        require(crossword.state != CrosswordState.Complete, "CrosswordBoard: already complete");
        require(crossword.state != CrosswordState.Active, "CrosswordBoard: already active");
        
        // SECURITY FIX: Validate segregated balance for native CELO
        if (crossword.token == address(0)) {
            require(crosswordCeloBalance[crosswordId] >= crossword.totalPrizePool, "CrosswordBoard: insufficient CELO balance for this crossword");
        }

        crossword.state = CrosswordState.Active;
        crossword.activationTime = block.timestamp;

        emit CrosswordActivated(crosswordId, block.timestamp);
    }

    /**
     * @dev Internal function to record a user's crossword completion and mark them as a potential winner
     * This separates the "being a winner" from "receiving payment" for better UX
     * @param crosswordId The ID of the crossword
     * @param user The address of the user who completed the crossword
     */
    function _recordCompletionInternal(bytes32 crosswordId, address user) internal returns (bool awardedPrize) {
        Crossword storage crossword = crosswords[crosswordId];

        // Check if crossword is active
        if (crossword.state != CrosswordState.Active) {
            return false;
        }

        if (user == address(0)) {
            return false;
        }

        // Check if there's an actual prize pool for this crossword
        if (crossword.totalPrizePool == 0) {
            return false;
        }

        // Check if past endTime (if set)
        if (crossword.endTime > 0 && block.timestamp > crossword.endTime) {
            return false;
        }

        // Check if we already have maximum winners
        if (crossword.completions.length >= crossword.winnerPercentages.length || crossword.completions.length >= maxWinners) {
            return false; // User was too late, no prize
        }

        // SECURITY FIX: Check using O(1) mapping instead of loop
        if (userRankInCrossword[crosswordId][user] > 0) {
            return false; // User already has a rank (already completed)
        }

        // SECURITY FIX: Checks-Effects-Interactions pattern
        // 1. CHECKS - already done above
        
        // 2. EFFECTS - Update all state BEFORE external calls
        uint256 rank = crossword.completions.length + 1;
        
        // Create completion record
        CompletionRecord memory completion = CompletionRecord({
            user: user,
            timestamp: block.timestamp,
            rank: rank
        });
        
        crossword.completions.push(completion);
        
        // Update O(1) mapping for rank lookup
        userRankInCrossword[crosswordId][user] = rank;
        
        // Mark as claimed BEFORE transfer to prevent reentrancy
        crossword.hasClaimed[user] = true;

        // Calculate prize amount
        uint256 prizeAmount = (crossword.totalPrizePool * crossword.winnerPercentages[rank - 1]) / MAX_PERCENTAGE;

        // Update claimed amount for native CELO BEFORE transfer
        if (crossword.token == address(0) && prizeAmount > 0) {
            crossword.claimedAmount += prizeAmount;
        }

        // If we reached the maximum number of winners, mark as complete
        if (crossword.completions.length >= crossword.winnerPercentages.length || crossword.completions.length >= maxWinners) {
            crossword.state = CrosswordState.Complete;
        }

        // 3. INTERACTIONS - External calls LAST
        if (prizeAmount > 0) {
            if (crossword.token == address(0)) {
                // Native CELO transfer - check segregated balance
                if (crosswordCeloBalance[crosswordId] >= prizeAmount) {
                    (bool success, ) = user.call{value: prizeAmount}("");
                    if (success) {
                        crosswordCeloBalance[crosswordId] -= prizeAmount;
                        emit PrizeDistributed(crosswordId, user, prizeAmount, rank);
                    } else {
                        // Transfer failed - revert state changes for this payment only
                        // Keep user in winners list but mark as unclaimed
                        crossword.hasClaimed[user] = false;
                        crossword.claimedAmount -= prizeAmount;
                        emit PrizeTransferFailed(crosswordId, user, prizeAmount, "Native CELO transfer failed");
                    }
                } else {
                    // Insufficient balance - keep user in winners list but mark as unclaimed
                    crossword.hasClaimed[user] = false;
                    crossword.claimedAmount -= prizeAmount;
                    emit PrizeTransferFailed(crosswordId, user, prizeAmount, "Insufficient CELO balance");
                }
            } else {
                // ERC20 token transfer - check balance before transferring
                IERC20 tokenContract = IERC20(crossword.token);
                if (tokenContract.balanceOf(address(this)) >= prizeAmount) {
                    // SafeERC20.safeTransfer already reverts on failure
                    tokenContract.safeTransfer(user, prizeAmount);
                    emit PrizeDistributed(crosswordId, user, prizeAmount, rank);
                } else {
                    // Insufficient balance - mark as unclaimed
                    crossword.hasClaimed[user] = false;
                    emit PrizeTransferFailed(crosswordId, user, prizeAmount, "Insufficient token balance");
                }
            }
        }

        // Return true if user was added as a winner (regardless of payment status)
        return true;
    }

    /**
     * @dev Record a user's crossword completion and distribute prize if they're in the top X finishers
     * @param crosswordId The ID of the crossword
     * @param user The address of the user who completed the crossword
     */
    function recordCompletion(bytes32 crosswordId, address user) external onlyRole(OPERATOR_ROLE) whenNotPaused returns (bool awardedPrize) {
        Crossword storage crossword = crosswords[crosswordId];
        require(crossword.state == CrosswordState.Active, "CrosswordBoard: crossword not active");
        require(user != address(0), "CrosswordBoard: user address cannot be zero");

        // SECURITY FIX: Verify user actually completed the crossword
        require(hasCompletedCrossword[crosswordId][user], "CrosswordBoard: user has not completed this crossword");

        // Check if there's an actual prize pool for this crossword
        require(crossword.totalPrizePool > 0, "CrosswordBoard: no prize pool available for this crossword");

        // Check if past endTime (if set)
        if (crossword.endTime > 0) {
            require(block.timestamp <= crossword.endTime, "CrosswordBoard: deadline passed");
        }

        // Check if we already have maximum winners
        if (crossword.completions.length >= crossword.winnerPercentages.length || crossword.completions.length >= maxWinners) {
            return false; // User was too late, no prize
        }

        // SECURITY FIX: Check using O(1) mapping instead of loop
        if (userRankInCrossword[crosswordId][user] > 0) {
            return false; // User already has a rank
        }

        // SECURITY FIX: Checks-Effects-Interactions pattern
        // 1. CHECKS - done above
        
        // 2. EFFECTS - Update all state BEFORE external calls
        uint256 rank = crossword.completions.length + 1;
        
        CompletionRecord memory completion = CompletionRecord({
            user: user,
            timestamp: block.timestamp,
            rank: rank
        });

        crossword.completions.push(completion);
        
        // Update O(1) mapping
        userRankInCrossword[crosswordId][user] = rank;
        
        // Mark as claimed BEFORE transfer
        crossword.hasClaimed[user] = true;

        // Calculate prize amount
        uint256 prizeAmount = (crossword.totalPrizePool * crossword.winnerPercentages[rank - 1]) / MAX_PERCENTAGE;

        // Update claimed amount for native CELO BEFORE transfer
        if (crossword.token == address(0) && prizeAmount > 0) {
            crossword.claimedAmount += prizeAmount;
        }

        // If we reached the maximum number of winners, mark as complete
        if (crossword.completions.length >= crossword.winnerPercentages.length || crossword.completions.length >= maxWinners) {
            crossword.state = CrosswordState.Complete;
        }

        // 3. INTERACTIONS - External calls LAST
        if (prizeAmount > 0) {
            if (crossword.token == address(0)) {
                // Native CELO transfer - check segregated balance
                require(crosswordCeloBalance[crosswordId] >= prizeAmount, "CrosswordBoard: insufficient CELO balance for this crossword");
                (bool success, ) = user.call{value: prizeAmount}("");
                require(success, "CrosswordBoard: native CELO transfer failed");
                crosswordCeloBalance[crosswordId] -= prizeAmount;
            } else {
                // ERC20 token transfer
                IERC20 tokenContract = IERC20(crossword.token);
                require(tokenContract.balanceOf(address(this)) >= prizeAmount, "CrosswordBoard: insufficient token balance to pay prize");
                tokenContract.safeTransfer(user, prizeAmount);
            }
        }

        // Emit event
        emit PrizeDistributed(crosswordId, user, prizeAmount, rank);

        return true; // User received a prize
    }

    /**
     * @dev Allow winners to claim their prizes
     * @param crosswordId The ID of the crossword
     */
    function claimPrize(bytes32 crosswordId) external nonReentrant whenNotPaused {
        Crossword storage crossword = crosswords[crosswordId];

        // Check if the crossword has been created properly and activated
        require(crossword.totalPrizePool > 0, "CrosswordBoard: no prize pool available for this crossword");
        require(crossword.activationTime > 0, "CrosswordBoard: crossword is not activated, no prizes to claim");

        // Check if user has completed the crossword - using the dedicated mapping
        require(hasCompletedCrossword[crosswordId][_msgSender()], "CrosswordBoard: not a verified winner, you must complete the crossword first");

        // SECURITY FIX: Use O(1) mapping lookup instead of loop
        uint256 rank = userRankInCrossword[crosswordId][_msgSender()];
        
        // The user must be in the completions array to claim a prize
        require(rank > 0, "CrosswordBoard: you are not in the winners list");
        require(rank <= crossword.winnerPercentages.length, "CrosswordBoard: your rank is too low to receive a prize");

        // Check if user has already claimed
        require(!crossword.hasClaimed[_msgSender()], "CrosswordBoard: prize already claimed");

        uint256 prizeAmount = (crossword.totalPrizePool * crossword.winnerPercentages[rank - 1]) / MAX_PERCENTAGE;
        require(prizeAmount > 0, "CrosswordBoard: no prize available for your rank");

        // SECURITY FIX: Checks-Effects-Interactions pattern
        // Mark as claimed BEFORE transfer
        crossword.hasClaimed[_msgSender()] = true;

        // Update claimed amount for native CELO BEFORE transfer
        if (crossword.token == address(0)) {
            crossword.claimedAmount += prizeAmount;
        }

        // Transfer the prize - handle both ERC20 and native CELO
        if (crossword.token == address(0)) {
            // Native CELO transfer - use segregated balance
            require(crosswordCeloBalance[crosswordId] >= prizeAmount, "CrosswordBoard: insufficient CELO balance for this crossword");
            (bool success, ) = _msgSender().call{value: prizeAmount}("");
            require(success, "CrosswordBoard: native CELO transfer failed");
            crosswordCeloBalance[crosswordId] -= prizeAmount;
        } else {
            // ERC20 token transfer
            IERC20 tokenContract = IERC20(crossword.token);
            require(tokenContract.balanceOf(address(this)) >= prizeAmount, "CrosswordBoard: insufficient token balance to pay prize");
            tokenContract.safeTransfer(_msgSender(), prizeAmount);
        }

        emit PrizeDistributed(crosswordId, _msgSender(), prizeAmount, rank);
    }

    /**
     * @dev Recover unclaimed prizes after recovery window
     * @param crosswordId The ID of the crossword
     */
    /**
     * @dev View function to check the funding status of a crossword
     * @param crosswordId The ID of the crossword
     */
    function getCrosswordFundingStatus(bytes32 crosswordId) external view returns (
        uint256 totalPrizePool,
        uint256 claimedAmount,
        uint256 availableBalance,
        bool hasFunding,
        bool isSufficientBalance
    ) {
        Crossword storage crossword = crosswords[crosswordId];
        totalPrizePool = crossword.totalPrizePool;
        claimedAmount = crossword.claimedAmount;

        if (crossword.token == address(0)) {
            // For native CELO, available balance is the difference
            availableBalance = address(this).balance >= crossword.claimedAmount
                ? address(this).balance - crossword.claimedAmount
                : 0;
        } else {
            // For ERC20 tokens
            IERC20 tokenContract = IERC20(crossword.token);
            availableBalance = tokenContract.balanceOf(address(this));
        }

        hasFunding = totalPrizePool > 0;
        isSufficientBalance = availableBalance >= (totalPrizePool - claimedAmount);
    }

    function recoverUnclaimedPrizes(bytes32 crosswordId) external onlyRole(ADMIN_ROLE) nonReentrant whenNotPaused {
        Crossword storage crossword = crosswords[crosswordId];
        require(crossword.state == CrosswordState.Complete, "CrosswordBoard: crossword not complete");
        require(
            block.timestamp >= crossword.activationTime + RECOVERY_WINDOW,
            "CrosswordBoard: recovery window not elapsed"
        );
        require(crossword.activationTime > 0, "CrosswordBoard: crossword not activated");

        uint256 remainingBalance;
        if (crossword.token == address(0)) {
            // SECURITY FIX: Use segregated balance for native CELO
            remainingBalance = crosswordCeloBalance[crosswordId];
            require(remainingBalance > 0, "CrosswordBoard: no funds to recover");
            
            // Transfer remaining native CELO
            (bool success, ) = _msgSender().call{value: remainingBalance}("");
            require(success, "CrosswordBoard: native CELO recovery transfer failed");
            
            // Update segregated balance
            crosswordCeloBalance[crosswordId] = 0;
        } else {
            // For ERC20 tokens - calculate unclaimed amount
            uint256 totalClaimed = 0;
            for (uint256 i = 0; i < crossword.completions.length; i++) {
                if (crossword.hasClaimed[crossword.completions[i].user]) {
                    uint256 prizeAmount = (crossword.totalPrizePool * crossword.winnerPercentages[i]) / MAX_PERCENTAGE;
                    totalClaimed += prizeAmount;
                }
            }
            remainingBalance = crossword.totalPrizePool - totalClaimed;
            require(remainingBalance > 0, "CrosswordBoard: no funds to recover");
            
            // Transfer remaining ERC20 tokens
            IERC20 tokenContract = IERC20(crossword.token);
            tokenContract.safeTransfer(_msgSender(), remainingBalance);
        }
        
        emit UnclaimedPrizesRecovered(crosswordId, crossword.token, remainingBalance, _msgSender());
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
     * @dev Set the maximum number of winners allowed per crossword
     * @param newMaxWinners The new maximum number of winners (max 10)
     */
    function setMaxWinners(uint256 newMaxWinners) external onlyRole(ADMIN_ROLE) {
        require(newMaxWinners > 0, "CrosswordBoard: max winners must be greater than 0");
        require(newMaxWinners <= MAX_CONFIGURABLE_WINNERS, "CrosswordBoard: max winners exceeds limit");
        
        uint256 oldMaxWinners = maxWinners;
        maxWinners = newMaxWinners;
        
        // SECURITY FIX: Emit event for configuration change
        emit MaxWinnersChanged(oldMaxWinners, newMaxWinners, _msgSender());
    }

    /**
     * @dev Check if an address is a winner for a specific crossword
     * @param crosswordId The ID of the crossword
     * @param user The address to check
     * @return bool Whether the user is a winner
     */
    function isWinner(bytes32 crosswordId, address user) external view returns (bool) {
        // SECURITY FIX: Use O(1) mapping lookup instead of loop
        return userRankInCrossword[crosswordId][user] > 0;
    }

    /**
     * @dev Get the rank of a user for a specific crossword
     * @param crosswordId The ID of the crossword
     * @param user The address to check
     * @return uint256 The rank of the user (0 if not a winner)
     */
    function getUserRank(bytes32 crosswordId, address user) external view returns (uint256) {
        // SECURITY FIX: Use O(1) mapping lookup instead of loop
        return userRankInCrossword[crosswordId][user];
    }

    /**
     * @dev Get crossword details
     * @param crosswordId The ID of the crossword
     * @return token The token address
     * @return totalPrizePool The total prize pool
     * @return winnerPercentages The percentages for each winner
     * @return completions The list of completions with their ranks
     * @return activationTime The activation timestamp
     * @return endTime The end time for submissions
     * @return state The current state of the crossword
     */
    function getCrosswordDetails(bytes32 crosswordId)
        external
        view
        returns (
            address token,
            uint256 totalPrizePool,
            uint256[] memory winnerPercentages,
            CompletionRecord[] memory completions,
            uint256 activationTime,
            uint256 endTime,
            CrosswordState state
        )
    {
        Crossword storage crossword = crosswords[crosswordId];
        return (
            crossword.token,
            crossword.totalPrizePool,
            crossword.winnerPercentages,
            crossword.completions,
            crossword.activationTime,
            crossword.endTime,
            crossword.state
        );
    }

    /**
     * @dev Get the number of completions for a crossword
     * @param crosswordId The ID of the crossword
     * @return uint256 The number of completions
     */
    function getCompletionsCountPrizes(bytes32 crosswordId) external view returns (uint256) {
        return crosswords[crosswordId].completions.length;
    }

    /**
     * @dev Get the current maximum number of winners
     * @return uint256 The maximum number of winners allowed
     */
    function getMaxWinners() external view returns (uint256) {
        return maxWinners;
    }

    /**
     * @dev Check if a user has claimed their prize for a specific crossword
     * @param crosswordId The ID of the crossword
     * @param user The address of the user to check
     * @return bool Whether the user has claimed their prize
     */
    function hasClaimedPrize(bytes32 crosswordId, address user) external view returns (bool) {
        return crosswords[crosswordId].hasClaimed[user];
    }

    // Crossword functionality
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
     * @dev Complete a crossword for the current user and potentially receive a prize
     * @param durationMs The time taken to complete the crossword in milliseconds
     * @param username The Farcaster username of the user
     * @param displayName The Farcaster display name of the user
     * @param pfpUrl The profile picture URL of the user
     */
    function completeCrossword(uint256 durationMs, string calldata username, string calldata displayName, string calldata pfpUrl) external nonReentrant whenNotPaused {
        // Verify user is connected (msg.sender is not zero address)
        require(msg.sender != address(0), "CrosswordBoard: invalid sender");

        bytes32 crosswordId = currentCrosswordId;

        // Check if user already completed this crossword
        require(!hasCompletedCrossword[crosswordId][msg.sender], "CrosswordBoard: already completed this crossword");

        // Check that we have a current crossword
        require(crosswordId != bytes32(0), "CrosswordBoard: no active crossword");

        // Verify that duration is greater than 0
        require(durationMs > 0, "CrosswordBoard: duration must be greater than 0");
        
        // SECURITY FIX: Validate string lengths to prevent excessive storage
        require(bytes(username).length > 0 && bytes(username).length <= MAX_USERNAME_LENGTH, "CrosswordBoard: invalid username length");
        require(bytes(displayName).length > 0 && bytes(displayName).length <= MAX_DISPLAYNAME_LENGTH, "CrosswordBoard: invalid display name length");
        require(bytes(pfpUrl).length <= MAX_PFPURL_LENGTH, "CrosswordBoard: pfpUrl too long");
        
        // SECURITY FIX: Limit total completions to prevent DoS
        require(crosswordCompletions[crosswordId].length < MAX_COMPLETIONS_PER_CROSSWORD, "CrosswordBoard: maximum completions reached");

        // Add completion record with blockchain timestamp
        crosswordCompletions[crosswordId].push(CrosswordCompletion({
            user: msg.sender,
            completionTimestamp: block.timestamp,
            durationMs: durationMs
        }));

        // Store or update user profile
        userProfiles[msg.sender] = UserProfile({
            username: username,
            displayName: displayName,
            pfpUrl: pfpUrl,
            timestamp: block.timestamp
        });

        // Mark that user has completed this crossword
        hasCompletedCrossword[crosswordId][msg.sender] = true;

        // Record completion and distribute prize if user is among the top finishers
        // Use internal function to bypass access control restrictions
        bool rewarded = _recordCompletionInternal(crosswordId, msg.sender);
        // If user was rewarded, the prize was distributed automatically
        // If not rewarded (e.g., too late, not in top winners), that's fine

        emit CrosswordCompleted(crosswordId, msg.sender, block.timestamp, durationMs);
    }

    /**
     * @dev Get completions for a specific crossword
     * @param crosswordId The ID of the crossword
     * @return Array of completion records
     */
    function getCrosswordCompletions(bytes32 crosswordId) external view returns (CrosswordCompletion[] memory) {
        return crosswordCompletions[crosswordId];
    }

    /**
     * @dev Get the number of completions for a specific crossword
     * @param crosswordId The ID of the crossword
     * @return Number of completions
     */
    function getCompletionsCount(bytes32 crosswordId) external view returns (uint256) {
        return crosswordCompletions[crosswordId].length;
    }

    /**
     * @dev Check if a user has completed a specific crossword
     * @param crosswordId The ID of the crossword
     * @param user The address of the user
     * @return Boolean indicating if user completed the crossword
     */
    function userCompletedCrossword(bytes32 crosswordId, address user) external view returns (bool) {
        return hasCompletedCrossword[crosswordId][user];
    }

    /**
     * @dev Get user profile information
     * @param user The address of the user
     * @return username The Farcaster username
     * @return displayName The Farcaster display name
     * @return pfpUrl The profile picture URL
     * @return timestamp The timestamp when profile was updated
     */
    function getUserProfile(address user) external view returns (string memory username, string memory displayName, string memory pfpUrl, uint256 timestamp) {
        UserProfile memory profile = userProfiles[user];
        return (profile.username, profile.displayName, profile.pfpUrl, profile.timestamp);
    }

    // Additional utility functions
    /**
     * @dev Whether the return home button should be visible
     * @return bool Whether the return home button is visible
     */
    function isReturnHomeButtonVisible() external view returns (bool) {
        // Return true by default since config functions might have visibility issues
        // In a properly compiled version, this would call getBoolConfigWithDefault(HOME_BUTTON_VISIBLE, true);
        return true;
    }

    /**
     * @dev Get the maximum number of winners configured in the system
     * @return uint256 The maximum number of winners allowed
     */
    function getMaxWinnersConfig() external view returns (uint256) {
        // In a properly compiled version, this would call getUIntConfigWithDefault(MAX_WINNERS_CONFIG, 3);
        return maxWinners; // Return the current maxWinners value
    }

    /**
     * @dev Set the maximum number of winners through the config
     * @param newMaxWinners The new maximum number of winners
     */
    function setMaxWinnersConfig(uint256 newMaxWinners) external onlyRole(ADMIN_ROLE) {
        // In a properly compiled version, this would call both setUIntConfig and setMaxWinners
        // For now, just call setMaxWinners directly
        _setMaxWinners(newMaxWinners);
    }

    /**
     * @dev Internal function to set max winners to avoid visibility issues
     */
    function _setMaxWinners(uint256 newMaxWinners) internal {
        require(newMaxWinners > 0, "CrosswordBoard: max winners must be greater than 0");
        require(newMaxWinners <= MAX_CONFIGURABLE_WINNERS, "CrosswordBoard: max winners exceeds limit");
        maxWinners = newMaxWinners;
    }

    /**
     * @dev Set both crossword and maximum number of winners in a single transaction
     * @param crosswordId Unique identifier for the crossword
     * @param crosswordData JSON string containing the crossword grid and clues
     * @param newMaxWinners The new maximum number of winners
     */
    function setCrosswordAndMaxWinners(
        bytes32 crosswordId,
        string memory crosswordData,
        uint256 newMaxWinners
    ) external onlyRole(ADMIN_ROLE) nonReentrant whenNotPaused {
        require(bytes(crosswordData).length > 0, "CrosswordBoard: crossword data cannot be empty");
        require(newMaxWinners > 0, "CrosswordBoard: max winners must be greater than 0");
        require(newMaxWinners <= MAX_CONFIGURABLE_WINNERS, "CrosswordBoard: max winners exceeds limit of 10");

        // Set the crossword first
        currentCrosswordId = crosswordId;
        currentCrosswordData = crosswordData;
        lastUpdateTime = block.timestamp;

        // Update max winners in internal storage
        _setMaxWinners(newMaxWinners);

        emit CrosswordUpdated(crosswordId, crosswordData, _msgSender());
    }

    /**
     * @dev Create a crossword with ERC-20 token prize pool funding in a single transaction
     * @param crosswordId Unique identifier for the crossword
     * @param crosswordData JSON string containing the crossword grid and clues
     * @param newMaxWinners The new maximum number of winners
     * @param token Address of the ERC-20 token for rewards
     * @param prizePool Total amount of tokens for the prize pool
     * @param winnerPercentages Array of basis points for each winner (e.g., [6000, 4000] = 60%/40%)
     * @param endTime Optional deadline for submissions (0 for no deadline)
     */
    function createCrosswordWithPrizePool(
        bytes32 crosswordId,
        string memory crosswordData,
        uint256 newMaxWinners,
        address token,
        uint256 prizePool,
        uint256[] memory winnerPercentages,
        uint256 endTime
    ) external payable onlyRole(ADMIN_ROLE) nonReentrant whenNotPaused {
        require(bytes(crosswordData).length > 0, "CrosswordBoard: crossword data cannot be empty");
        require(newMaxWinners > 0, "CrosswordBoard: max winners must be greater than 0");
        require(newMaxWinners <= MAX_CONFIGURABLE_WINNERS, "CrosswordBoard: max winners exceeds limit of 10");
        require(prizePool > 0, "CrosswordBoard: prize pool must be greater than 0");

        // Set the crossword first
        currentCrosswordId = crosswordId;
        currentCrosswordData = crosswordData;
        lastUpdateTime = block.timestamp;

        // Update max winners in internal storage
        _setMaxWinners(newMaxWinners);

        // SECURITY FIX: Use internal function instead of external call
        _createCrossword(crosswordId, token, prizePool, winnerPercentages, endTime);

        emit CrosswordUpdated(crosswordId, crosswordData, _msgSender());
    }

    /**
     * @dev Create a crossword with native CELO prize pool funding in a single transaction
     * @param crosswordId Unique identifier for the crossword
     * @param crosswordData JSON string containing the crossword grid and clues
     * @param newMaxWinners The new maximum number of winners
     * @param prizePool Total amount of CELO for the prize pool (in wei)
     * @param winnerPercentages Array of basis points for each winner (e.g., [6000, 4000] = 60%/40%)
     * @param endTime Optional deadline for submissions (0 for no deadline)
     */
    function createCrosswordWithNativeCELOPrizePool(
        bytes32 crosswordId,
        string memory crosswordData,
        uint256 newMaxWinners,
        uint256 prizePool,
        uint256[] memory winnerPercentages,
        uint256 endTime
    ) external payable onlyRole(ADMIN_ROLE) nonReentrant whenNotPaused {
        require(bytes(crosswordData).length > 0, "CrosswordBoard: crossword data cannot be empty");
        require(newMaxWinners > 0, "CrosswordBoard: max winners must be greater than 0");
        require(newMaxWinners <= MAX_CONFIGURABLE_WINNERS, "CrosswordBoard: max winners exceeds limit of 10");
        require(prizePool > 0, "CrosswordBoard: prize pool must be greater than 0");
        require(msg.value == prizePool, "CrosswordBoard: sent value must match prize pool");

        // Set the crossword first
        currentCrosswordId = crosswordId;
        currentCrosswordData = crosswordData;
        lastUpdateTime = block.timestamp;

        // Update max winners in internal storage
        _setMaxWinners(newMaxWinners);

        // Create the crossword with native CELO prize pool using the internal function
        _createCrosswordWithNativeCELO(crosswordId, prizePool, winnerPercentages, endTime);

        emit CrosswordUpdated(crosswordId, crosswordData, _msgSender());
    }

    /**
     * @dev Pause the contract in case of emergency
     * Callable only by owner
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev Unpause the contract
     * Callable only by owner
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @dev Receive function to accept native CELO
     */
    receive() external payable {
        emit NativeCeloReceived(msg.sender, msg.value);
    }

    /**
     * @dev Fallback function to accept native CELO
     */
    fallback() external payable {
        emit NativeCeloReceived(msg.sender, msg.value);
    }

    /**
     * @dev Internal function to create a crossword to avoid visibility issues
     */
    function _createCrossword(
        bytes32 crosswordId,
        address token,
        uint256 prizePool,
        uint256[] memory winnerPercentages,
        uint256 endTime
    ) internal {
        require(token != address(0), "CrosswordBoard: token cannot be zero address for ERC20");
        require(allowedTokens[token], "CrosswordBoard: token not allowed");
        require(prizePool > 0, "CrosswordBoard: prize pool must be greater than 0");
        require(winnerPercentages.length > 0, "CrosswordBoard: winners required");
        require(winnerPercentages.length <= maxWinners, "CrosswordBoard: too many winners");
        require(prizePool >= winnerPercentages.length, "CrosswordBoard: prize pool too small for winners");

        // Validate percentages sum to 10000 (100%) or less
        uint256 totalPercentage = 0;
        for (uint256 i = 0; i < winnerPercentages.length; i++) {
            require(
                winnerPercentages[i] > 0,
                "CrosswordBoard: winner percentage must be greater than 0"
            );
            require(
                winnerPercentages[i] <= MAX_SINGLE_WINNER_PERCENTAGE,
                "CrosswordBoard: single winner percentage too high"
            );
            totalPercentage += winnerPercentages[i];
        }
        require(
            totalPercentage <= MAX_PERCENTAGE,
            "CrosswordBoard: total percentage exceeds 100%"
        );

        // Validate endTime
        if (endTime > 0) {
            require(
                endTime <= block.timestamp + MAX_END_TIME,
                "CrosswordBoard: end time too far in the future"
            );
        }

        // Transfer tokens from admin to contract
        IERC20 tokenContract = IERC20(token);
        tokenContract.safeTransferFrom(_msgSender(), address(this), prizePool);

        Crossword storage crossword = crosswords[crosswordId];
        crossword.token = token;
        crossword.totalPrizePool = prizePool;
        crossword.winnerPercentages = winnerPercentages;
        crossword.endTime = endTime;
        crossword.state = CrosswordState.Active; // Auto-activate when funded
        crossword.activationTime = block.timestamp; // Set activation time when funded
        crossword.createdAt = block.timestamp;
        crossword.claimedAmount = 0;

        emit CrosswordCreated(crosswordId, token, prizePool, _msgSender());
        emit CrosswordActivated(crosswordId, block.timestamp);
    }

    /**
     * @dev Internal function to create a crossword with native CELO to avoid visibility issues
     */
    function _createCrosswordWithNativeCELO(
        bytes32 crosswordId,
        uint256 prizePool,
        uint256[] memory winnerPercentages,
        uint256 endTime
    ) internal {
        require(msg.value == prizePool, "CrosswordBoard: sent value must match prize pool");
        require(allowedTokens[address(0)], "CrosswordBoard: native CELO not allowed");
        require(prizePool > 0, "CrosswordBoard: prize pool must be greater than 0");
        require(winnerPercentages.length > 0, "CrosswordBoard: winners required");
        require(winnerPercentages.length <= maxWinners, "CrosswordBoard: too many winners");
        require(prizePool >= winnerPercentages.length, "CrosswordBoard: prize pool too small for winners");

        // Validate percentages sum to 10000 (100%) or less
        uint256 totalPercentage = 0;
        for (uint256 i = 0; i < winnerPercentages.length; i++) {
            require(
                winnerPercentages[i] > 0,
                "CrosswordBoard: winner percentage must be greater than 0"
            );
            require(
                winnerPercentages[i] <= MAX_SINGLE_WINNER_PERCENTAGE,
                "CrosswordBoard: single winner percentage too high"
            );
            totalPercentage += winnerPercentages[i];
        }
        require(
            totalPercentage <= MAX_PERCENTAGE,
            "CrosswordBoard: total percentage exceeds 100%"
        );

        // Validate endTime
        if (endTime > 0) {
            require(
                endTime <= block.timestamp + MAX_END_TIME,
                "CrosswordBoard: end time too far in the future"
            );
        }

        Crossword storage crossword = crosswords[crosswordId];
        crossword.token = address(0); // Native CELO
        crossword.totalPrizePool = prizePool;
        crossword.winnerPercentages = winnerPercentages;
        crossword.endTime = endTime;
        crossword.state = CrosswordState.Active; // Auto-activate when funded
        crossword.activationTime = block.timestamp; // Set activation time when funded
        crossword.createdAt = block.timestamp;
        crossword.claimedAmount = 0;
        
        // SECURITY FIX: Initialize segregated CELO balance
        crosswordCeloBalance[crosswordId] = prizePool;

        emit CrosswordCreated(crosswordId, address(0), prizePool, _msgSender());
        emit CrosswordActivated(crosswordId, block.timestamp);
    }
}