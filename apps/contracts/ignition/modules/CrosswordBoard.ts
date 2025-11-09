// CrosswordBoard deployment module
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const CrosswordBoardModule = buildModule("CrosswordBoardModule", (m) => {
  const initialOwner = m.getParameter("initialOwner", "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"); // Default to first hardhat account

  const crosswordBoard = m.contract("CrosswordBoard", [initialOwner]);

  return { crosswordBoard };
});

export default CrosswordBoardModule;