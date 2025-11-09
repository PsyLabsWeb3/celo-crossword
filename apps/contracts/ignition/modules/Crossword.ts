// This setup uses Hardhat Ignition to manage smart contract deployments for Crossword contracts.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const CrosswordModule = buildModule("CrosswordModule", (m) => {
  const deployer = m.getAccount(0);

  // Deploy CrosswordBoard contract
  const crosswordBoard = m.contract("CrosswordBoard", [deployer]);

  // Deploy CrosswordPrizes contract
  const crosswordPrizes = m.contract("CrosswordPrizes", [deployer]);

  return { crosswordBoard, crosswordPrizes };
});

export default CrosswordModule;