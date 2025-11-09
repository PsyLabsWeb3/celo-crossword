"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useSetCrossword, useIsAdmin } from "@/hooks/useContract";
import { LOCAL_CONTRACTS } from "@/lib/contracts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RotateCcw, Save } from "lucide-react";

const DEFAULT_CROSSWORD = {
  gridSize: { rows: 6, cols: 10 },
  clues: [
    {
      number: 1,
      clue: "Popular JavaScript library for building UIs",
      answer: "REACT",
      row: 0,
      col: 0,
      direction: "across",
    },
    {
      number: 5,
      clue: "Programming language from Sun Microsystems",
      answer: "JAVA",
      row: 1,
      col: 6,
      direction: "across",
    },
    { number: 6, clue: "Typed superset of JavaScript", answer: "TYPESCRIPT", row: 3, col: 0, direction: "across" },
    { number: 8, clue: "React function for side effects", answer: "HOOK", row: 5, col: 2, direction: "across" },
    {
      number: 1,
      clue: "Defines paths for navigating between pages",
      answer: "ROUTER",
      row: 0,
      col: 0,
      direction: "down",
    },
    { number: 2, clue: "Static type checking for JavaScript", answer: "TYPE", row: 0, col: 4, direction: "down" },
    { number: 3, clue: "JavaScript XML syntax extension", answer: "JSX", row: 1, col: 6, direction: "down" },
  ],
};

export default function AdminPage() {
  const { address, isConnected } = useAccount();
  const { data: isAdminData, isLoading: isAdminLoading } = useIsAdmin();
  const { setCrossword, isLoading, isSuccess, isError } = useSetCrossword();
  
  const [crosswordData, setCrosswordData] = useState(JSON.stringify(DEFAULT_CROSSWORD, null, 2));
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveCrossword = async () => {
    if (!isConnected) {
      alert("Por favor conecta tu wallet primero");
      return;
    }

    if (!isAdminData) {
      alert("Solo administradores pueden guardar crucigramas");
      return;
    }

    try {
      setIsSaving(true);
      // Generate a random bytes32 id (in a real app, you might use a hash of the content or a timestamp)
      const id = `0x${Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
      
      // Validate that the crossword data is valid JSON
      try {
        JSON.parse(crosswordData);
      } catch (e) {
        alert("El crucigrama no es un JSON válido");
        return;
      }

      // Save crossword data to localStorage as backup
      if (typeof window !== 'undefined') {
        localStorage.setItem("crossword_admin_data", crosswordData);
      }
      
      // Call the contract function
      await setCrossword({
        args: [id as `0x${string}`, crosswordData]
      });
    } catch (error) {
      console.error("Error saving crossword:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToDefault = () => {
    setCrosswordData(JSON.stringify(DEFAULT_CROSSWORD, null, 2));
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-2xl p-8 text-center border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <h2 className="text-2xl font-bold mb-4">Admin Panel</h2>
          <p className="text-lg mb-6">Por favor conecta tu wallet para acceder al panel de administración.</p>
        </Card>
      </div>
    );
  }

  if (isAdminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
          <p className="text-lg font-bold">Verificando permisos de administrador...</p>
        </div>
      </div>
    );
  }

  if (!isAdminData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-2xl p-8 text-center border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <h2 className="text-2xl font-bold mb-4">Acceso Denegado</h2>
          <p className="text-lg mb-6">No tienes permisos de administrador para acceder a esta sección.</p>
          <p className="text-sm text-muted-foreground">Wallet: {address}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 md:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Panel de Administración
          </h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Gestiona los crucigramas para todos los usuarios
          </p>
        </div>

        <Card className="border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <Label htmlFor="crosswordData" className="text-xl font-bold">
                Datos del Crucigrama
              </Label>
              <Button
                variant="outline"
                onClick={handleResetToDefault}
                className="border-4 border-black bg-white font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 hover:bg-white active:bg-white hover:shadow-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Default
              </Button>
            </div>
            <Textarea
              id="crosswordData"
              value={crosswordData}
              onChange={(e) => setCrosswordData(e.target.value)}
              rows={20}
              className="font-mono text-sm border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:ring-0"
              placeholder="Ingresa el JSON del crucigrama aquí..."
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              onClick={handleSaveCrossword}
              disabled={isSaving || isLoading}
              className="flex-1 border-4 border-black bg-primary font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-1 hover:translate-y-1 active:translate-x-1 active:translate-y-1 hover:bg-primary active:bg-primary hover:shadow-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
            >
              {isSaving || isLoading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Guardar en Blockchain
                </>
              )}
            </Button>
          </div>

          {isSuccess && (
            <div className="mt-4 p-3 bg-green-100 border-2 border-green-500 rounded-lg text-green-700 text-center">
              ¡Crucigrama guardado correctamente en la blockchain!
            </div>
          )}

          {isError && (
            <div className="mt-4 p-3 bg-red-100 border-2 border-red-500 rounded-lg text-red-700 text-center">
              Error al guardar el crucigrama. Por favor intenta de nuevo.
            </div>
          )}
        </Card>

        <div className="mt-8 p-4 bg-muted rounded-lg border-2 border-dashed border-gray-300">
          <h3 className="font-bold mb-2">Formato del crucigrama:</h3>
          <ul className="list-disc pl-5 text-sm space-y-1">
            <li><code>gridSize</code>: Define el tamaño del crucigrama ({JSON.stringify({rows: 6, cols: 10})})</li>
            <li><code>clues</code>: Array de pistas con <code>number</code>, <code>clue</code>, <code>answer</code>, <code>row</code>, <code>col</code>, y <code>direction</code></li>
            <li>Las direcciones posibles son <code>"across"</code> y <code>"down"</code></li>
          </ul>
        </div>
      </div>
    </div>
  );
}