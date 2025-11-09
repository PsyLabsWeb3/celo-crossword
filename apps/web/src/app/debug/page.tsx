"use client"

import { useAccount } from "wagmi";
import { useAdminStatus } from "@/hooks/useContract";

export default function DebugPage() {
  const { address, isConnected, chain } = useAccount();
  const { 
    isBoardAdmin, 
    isPrizesAdmin, 
    isDefaultAdmin, 
    isLoading, 
    allResults 
  } = useAdminStatus();

  if (!isConnected) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold">Admin Debug Page</h1>
        <p>Por favor conecta tu wallet.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold">Admin Debug Page</h1>
        <p>Verificando permisos de administrador...</p>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Admin Debug Page</h1>
      
      <div className="mb-6 p-4 border rounded bg-gray-50">
        <h2 className="text-xl font-semibold mb-2">Wallet Info</h2>
        <p><strong>Address:</strong> {address}</p>
        <p><strong>Chain:</strong> {chain?.name} (ID: {chain?.id})</p>
      </div>

      <div className="mb-6 p-4 border rounded bg-gray-50">
        <h2 className="text-xl font-semibold mb-2">Contract Results</h2>
        <p><strong>Board Admin (isAdminAddress):</strong> {allResults.boardAdmin ? 'true' : 'false'}</p>
        <p><strong>Prizes Admin (ADMIN_ROLE):</strong> {allResults.prizesAdmin ? 'true' : 'false'}</p>
        <p><strong>Prizes Default Admin:</strong> {allResults.defaultAdmin ? 'true' : 'false'}</p>
      </div>

      <div className="mb-6 p-4 border rounded bg-blue-50">
        <h2 className="text-xl font-semibold mb-2">Admin Status</h2>
        <p><strong>Is Board Admin:</strong> {isBoardAdmin ? 'YES' : 'NO'}</p>
        <p><strong>Is Prizes Admin:</strong> {isPrizesAdmin ? 'YES' : 'NO'}</p>
        <p><strong>Is Default Admin:</strong> {isDefaultAdmin ? 'YES' : 'NO'}</p>
        <p><strong>Overall Admin:</strong> {(isBoardAdmin || isPrizesAdmin || isDefaultAdmin) ? 'YES' : 'NO'}</p>
      </div>

      <div className="p-4 border rounded bg-yellow-50">
        <h2 className="text-xl font-semibold mb-2">Information</h2>
        <p>This page shows the detailed admin status verification.</p>
        <p>For a user to be an admin, any of the following needs to be true:</p>
        <ul className="list-disc pl-6 mt-2">
          <li>isAdminAddress() returns true on CrosswordBoard contract</li>
          <li>hasRole(ADMIN_ROLE) returns true on CrosswordPrizes contract</li>
          <li>hasRole(DEFAULT_ADMIN_ROLE) returns true on CrosswordPrizes contract</li>
        </ul>
      </div>
    </div>
  );
}