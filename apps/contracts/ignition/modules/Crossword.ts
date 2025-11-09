// Combined Crossword deployment module
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const CrosswordModule = buildModule("CrosswordModule", (m) => {
  const initialOwner = m.getParameter("initialOwner", "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"); // Default to first hardhat account

  // Deploy CrosswordBoard contract
  const crosswordBoard = m.contract("CrosswordBoard", [initialOwner]);

  // Deploy CrosswordPrizes contract
  const crosswordPrizes = m.contract("CrosswordPrizes", [initialOwner]);

  return { crosswordBoard, crosswordPrizes };
});

export default CrosswordModule;