# Guía de Deployment y Verificación en Celo Mainnet

Esta guía detalla los pasos para desplegar y verificar el contrato `CrosswordBoard` en la red Celo Mainnet.

## 1. Prerrequisitos

Asegúrate de tener lo siguiente configurado en tu archivo `.env`:

```bash
# Tu clave privada (debe tener CELO real para gas)
PRIVATE_KEY=tu_clave_privada_aqui

# API Key de CeloScan (Regístrate en celoscan.io)
CELOSCAN_API_KEY=tu_api_key_aqui
```

> **Nota Importante**: Asegúrate de que la cuenta asociada a `PRIVATE_KEY` tenga suficientes tokens CELO para cubrir el costo del gas en Mainnet.

## 2. Configuración de Hardhat

Verifica que tu `hardhat.config.ts` tenga la configuración correcta para `celo` (Mainnet). Ya debería estar configurado así:

```typescript
    celo: {
      url: "https://forno.celo.org",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 42220,
    },
```

Y la configuración de Etherscan para la verificación:

```typescript
    etherscan: {
        apiKey: process.env.CELOSCAN_API_KEY,
        customChains: [
            {
                network: "celo",
                chainId: 42220,
                urls: {
                    apiURL: "https://api.etherscan.io/v2/api",
                    browserURL: "https://celoscan.io/",
                },
            },
            // ...
        ]
    },
```

## 3. Deployment en Mainnet

Para desplegar el contrato en Mainnet, ejecuta el siguiente comando. Esto usará Hardhat Ignition con el módulo que ya tenemos.

```bash
npx hardhat ignition deploy ignition/modules/CrosswordBoard.ts --network celo --parameters ignition/parameters.json
```

> Si no tienes un archivo `parameters.json` específico, puedes omitir `--parameters` si los valores por defecto en el módulo son correctos, o crear uno si necesitas cambiar el `initialOwner`.

El comando te pedirá confirmación. Una vez confirmado, verás la dirección del contrato desplegado.

**Ejemplo de salida:**

```
Deployed Addresses

CrosswordModule#CrosswordBoard - 0x... (Tu Nueva Dirección Mainnet)
```

## 4. Verificación en Mainnet

Una vez desplegado, espera unos minutos para que el explorador indexe el contrato. Luego ejecuta el comando de verificación.

Reemplaza `DIRECCION_DEL_CONTRATO` con la dirección que obtuviste en el paso anterior y `DIRECCION_OWNER` con la dirección que usaste como `initialOwner` (generalmente tu address si no especificaste otra).

```bash
npx hardhat verify --network celo DIRECCION_DEL_CONTRATO "DIRECCION_OWNER"
```

### Ejemplo:

```bash
npx hardhat verify --network celo 0x123...abc "0xYourWalletAddress"
```

## 5. Solución de Problemas Comunes

### Error: "Invalid API Key"

Si recibes este error, asegúrate de que tu `CELOSCAN_API_KEY` en el archivo `.env` sea válida y corresponda a una cuenta en [celoscan.io](https://celoscan.io/). A veces las keys de testnet funcionan en mainnet, pero es mejor verificar.

### Error: "Bytecode does not match"

Esto sucede si el código local ha cambiado desde el deployment. Asegúrate de no modificar ningún archivo `.sol` entre el deployment y la verificación.

### Verificación Manual (Si falla la automática)

1. Genera el archivo aplanado:
   ```bash
   npx hardhat flatten contracts/CrosswordBoard.sol > CrosswordBoard-Mainnet.sol
   ```
2. Ve a [CeloScan Mainnet](https://celoscan.io/).
3. Busca tu contrato por su dirección.
4. Ve a la pestaña **Contract** -> **Verify and Publish**.
5. Selecciona:
   - **Compiler Type**: Solidity (Single file)
   - **Compiler Version**: v0.8.28 (o la que aparezca en tu hardhat config)
   - **License**: MIT
6. Pega el contenido de `CrosswordBoard-Mainnet.sol`.
7. Asegúrate de que "Optimization" esté en **Yes** y Runs en **200** (según tu config).
8. Pega los argumentos del constructor codificados en ABI si es necesario (Hardhat verify suele imprimirlos si falla).

## 6. Actualización del Frontend

Una vez verificado:

1. Copia el nuevo ABI y la dirección.
2. Crea o actualiza el archivo `apps/contracts/web/contracts/mainnet-deployment.json` (similar a `sepolia-deployment.json` pero para mainnet).
3. Actualiza tu aplicación web para apuntar a la dirección de Mainnet cuando esté en modo producción.
