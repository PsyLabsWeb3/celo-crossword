// CrosswordPrizes deployment module
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const CrosswordPrizesModule = buildModule("CrosswordPrizesModule", (m) => {
  const initialAdmin = m.getParameter("initialAdmin", "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"); // Default to first hardhat account

  const crosswordPrizes = m.contract("CrosswordPrizes", [initialAdmin]);

  return { crosswordPrizes };
});

export default CrosswordPrizesModule;