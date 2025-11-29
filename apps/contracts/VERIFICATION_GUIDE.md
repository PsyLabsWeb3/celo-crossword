# Guía de Verificación del Contrato

## ✅ Deployment Exitoso

Tu contrato ha sido desplegado exitosamente en Celo Sepolia:

**Nueva Dirección del Contrato**: `0x6e15f23e7f410E250BD221cdB2FB43840354C908`

**Constructor Argument**: `0x66299C18c60CE709777Ec79C73b131cE2634f58e`

## ⚠️ Problema con la API Key

La verificación automática está fallando porque la API key de CeloScan no es válida o ha expirado.

Error: `Invalid API Key (#err2)|CELO1`

## Solución: Obtener una Nueva API Key de CeloScan

### Paso 1: Crear Cuenta en CeloScan

1. Ve a https://celoscan.io/register
2. Crea una cuenta o inicia sesión si ya tienes una

### Paso 2: Generar API Key

1. Una vez logueado, ve a https://celoscan.io/myapikey
2. Click en "Add" para crear una nueva API key
3. Dale un nombre descriptivo (ej: "Crossword Contract Verification")
4. Copia la API key generada

### Paso 3: Actualizar el .env

Actualiza tu archivo `.env` con la nueva API key:

```bash
CELOSCAN_API_KEY=TU_NUEVA_API_KEY_AQUI
```

### Paso 4: Verificar el Contrato

Una vez actualizada la API key, ejecuta:

```bash
cd /Users/brito/crossword-app/celo-crossword/apps/contracts
npx hardhat verify --network celoSepolia 0x6e15f23e7f410E250BD221cdB2FB43840354C908 "0x66299C18c60CE709777Ec79C73b131cE2634f58e"
```

## Alternativa: Verificación Manual

Si prefieres verificar manualmente sin esperar la API key:

### 1. Aplanar el Contrato

```bash
npx hardhat flatten contracts/CrosswordBoard.sol > flattened.sol
```

### 2. Ir a CeloScan

Ve a: https://sepolia.celoscan.io/address/0x6e15f23e7f410E250BD221cdB2FB43840354C908#code

### 3. Click en "Verify and Publish"

### 4. Completar el Formulario

- **Compiler Type**: Solidity (Single file)
- **Compiler Version**: v0.8.28+commit.7893614a
- **Open Source License Type**: MIT
- **Optimization**: Yes
- **Runs**: 200
- **Enter the Solidity Contract Code**: Pega el contenido de `flattened.sol`

### 5. Constructor Arguments (ABI-encoded)

```
0x00000000000000000000000066299c18c60ce709777ec79c73b131ce2634f58e
```

### 6. Submit

Click en "Verify and Publish"

## Próximos Pasos Después de la Verificación

Una vez verificado el contrato, necesitarás actualizar tu frontend para usar la nueva dirección:

1. **Actualizar el archivo de deployment**:

   - Archivo: `/Users/brito/crossword-app/celo-crossword/apps/contracts/web/contracts/sepolia-deployment.json`
   - Cambiar la dirección a: `0x6e15f23e7f410E250BD221cdB2FB43840354C908`

2. **Actualizar cualquier configuración en el frontend** que use la dirección del contrato

3. **Probar la integración** con la nueva dirección

## Información del Deployment

- **Red**: Celo Sepolia Testnet
- **Chain ID**: 11142220
- **Dirección del Contrato**: `0x6e15f23e7f410E250BD221cdB2FB43840354C908`
- **Dirección del Owner**: `0x66299C18c60CE709777Ec79C73b131cE2634f58e`
- **Compiler**: v0.8.28+commit.7893614a
- **Optimization**: Enabled (200 runs)
- **Deployment Method**: Hardhat Ignition

## Ver el Contrato en CeloScan

Puedes ver tu contrato desplegado aquí:
https://sepolia.celoscan.io/address/0x6e15f23e7f410E250BD221cdB2FB43840354C908

Una vez verificado, podrás ver el código fuente y interactuar con el contrato directamente desde CeloScan.
