# Simulador de procesos y memoria

[![Tests y cobertura](https://github.com/FabricioBarreto/simulador-procesos-memoria/actions/workflows/tests.yml/badge.svg)](https://github.com/FabricioBarreto/simulador-procesos-memoria/actions/workflows/tests.yml)

Biblioteca de clases en **TypeScript** que simula la gestión de procesos, la asignación de memoria contigua y la planificación de CPU con **Round Robin**. No tiene interfaz gráfica, menú ni `main`: el funcionamiento se demuestra **solo con pruebas automatizadas** (Vitest).

| | |
|---|---|
| **Alumno** | Fabricio Barreto |
| **Carrera** | Ingeniería en Sistemas de Información, 2.º año (UCP, sede Corrientes) |
| **Actividad** | AE2 intercátedra: Paradigmas y Lenguajes de Programación II + Sistemas Operativos |
| **Versión entregada** | tag `v1.0` |

---

## Requisitos

- [Node.js](https://nodejs.org/) **22** o superior (incluye `npm`)
- Git

## Instalación

```bash
git clone https://github.com/FabricioBarreto/simulador-procesos-memoria.git
cd simulador-procesos-memoria
git checkout v1.0        # versión entregada
npm ci                   # instala las versiones exactas del package-lock.json
```

## Comandos

| Comando | Qué hace |
|---|---|
| `npm test` | Corre todos los tests |
| `npm run coverage` | Corre los tests y genera el reporte de cobertura. **Falla si la cobertura de líneas baja del 90%** |
| `npm run typecheck` | Verifica los tipos con TypeScript (modo estricto) |
| `npx vitest run -t "Round Robin"` | Corre solo los tests cuyo nombre contiene el texto indicado |

### Reporte de cobertura

- **Herramienta:** Vitest con el proveedor `@vitest/coverage-v8`.
- **Comando reproducible:** `npm run coverage`.
- **Alcance medido:** todos los archivos de `src/`, aunque ningún test los importe. Se excluye `src/interfaces/`, porque las interfaces solo declaran tipos y no generan código ejecutable.
- **Salida:** una tabla en la terminal y un reporte navegable en `coverage/index.html`.
- **Resultado del commit entregado:** **100%** de líneas, ramas, funciones y sentencias, con 217 tests aprobados.

Además, cada `push` a `main` corre los tests y la cobertura en **GitHub Actions** (`.github/workflows/tests.yml`). El reporte HTML queda como artefacto descargable de cada ejecución.

---

## Estructura

```
src/
├── interfaces/     Contratos: ISimulador, IGestorMemoria, IPlanificador,
│                   IEstrategiaAsignacion, VistaProceso, ConfiguracionSimulacion
├── modelos/        Simulador, Proceso, EstadoProceso, EventoES, BloqueMemoria,
│   │               GestorMemoria, PlanificadorRoundRobin, Metricas
│   └── estrategias/  EstrategiaAsignacionBase (abstracta), FirstFit, BestFit, WorstFit
├── errores/        ErrorDominio (abstracta) y sus 7 subclases
└── utilidades/     validarEnteroPositivo, validarEnteroNoNegativo
tests/
├── src/            Tests unitarios (misma estructura que src/)
└── colaboracion/   Los 8 casos mínimos de la consigna corridos sobre el Simulador
uml/                Diagramas (draw.io editable + PNG)
```

## Diseño en pocas palabras

| Clase | Responsabilidad |
|---|---|
| `Simulador` | Coordina el **orden de las fases** de cada tick. Delega todo el trabajo en sus partes (composición) |
| `Proceso` | Cuida su propio ciclo de vida: el estado solo cambia con operaciones que validan la transición |
| `GestorMemoria` | Mantiene el mapa de bloques contiguo y sin solapamientos; asigna, libera y hace coalescencia |
| `IEstrategiaAsignacion` → `FirstFit`, `BestFit`, `WorstFit` | Elige el bloque libre (**polimorfismo**: se cambia la política sin tocar el gestor) |
| `PlanificadorRoundRobin` | Cola FIFO de Listos, quantum y conteo de cambios de contexto |
| `Metricas` | "Foto" inmutable de las métricas al final de cada tick |
| `BloqueMemoria`, `EventoES` | Objetos de valor inmutables |

**Doble encapsulamiento:** atributos privados (`#`), sin setters, y colecciones devueltas como copias. El simulador nunca entrega un `Proceso` real: devuelve una `VistaProceso` congelada.

### Orden de cada tick (RF06)

1. **Admisión:** los procesos Nuevos y Esperando Memoria intentan conseguir memoria, en orden de registro.
2. **Bloqueados:** baja el temporizador de E/S. Los que llegan a cero vuelven al final de la cola de Listos.
3. **CPU:** Round Robin ejecuta **una** unidad de CPU. Prioridad: finalización > bloqueo por E/S > quantum agotado.
4. **Reloj y métricas:** avanza el tick y se recalculan las métricas.

La memoria que se libera en un tick recién se ofrece en la admisión del tick siguiente.

### Configuración

```ts
const simulador = new Simulador();                     // 1024 KB, quantum 2, First-Fit
const otro = new Simulador({ memoriaTotal: 2048, quantum: 3, estrategia: new BestFit() });

simulador.registrarProceso(1, 300, 5);                 // pid, memoria (KB), CPU (ticks)
simulador.registrarProceso(2, 200, 4, new EventoES(2, 3)); // E/S tras 2 ticks de CPU, dura 3
simulador.avanzarTick();
simulador.finalizarProceso(1);                         // fuerza la liberación (y la coalescencia)
```

---

## Requerimientos → código → tests

| RF | Dónde está | Tests |
|---|---|---|
| RF01 Configurar e iniciar | `Simulador` (constructor) | `Simulador.test.ts`, Caso 1 |
| RF02 Registrar y consultar | `Simulador.registrarProceso`, `consultarProceso`, `Proceso` | `Simulador.test.ts`, `Proceso.test.ts` |
| RF03 Estados y admisión | `Proceso`, `Simulador` (fase de admisión) | `Proceso.test.ts`, Casos 2 y 8 |
| RF04 Memoria contigua | `GestorMemoria`, `BloqueMemoria`, estrategias | `GestorMemoria.test.ts`, `EstrategiasAsignacion.test.ts`, Caso 2 |
| RF05 Liberación y coalescencia | `GestorMemoria.liberar`, `BloqueMemoria.fusionarCon` | `GestorMemoria.test.ts`, Caso 3 |
| RF06 Tick determinista | `Simulador.avanzarTick` | `Simulador.test.ts`, Caso 8 |
| RF07 Round Robin | `PlanificadorRoundRobin` | `PlanificadorRoundRobin.test.ts`, Casos 4 y 5 |
| RF08 Entrada/Salida | `EventoES`, `Proceso.programarES`, fase de bloqueados | `Proceso.test.ts`, Caso 6 |
| RF09 Métricas | `Metricas` | `Metricas.test.ts`, Caso 7 |
| RF10 Estado del sistema | Consultas de `Simulador` (`VistaProceso`, copias) | `Simulador.test.ts`, Caso 8 |

Los "Casos" son los de `tests/colaboracion/CasosMinimos.test.ts`, uno por cada fila de la tabla de casos mínimos de la consigna.

## Diagramas

En `uml/` están los diagramas en formato **draw.io** (editables en [app.diagrams.net](https://app.diagrams.net)) y en **PNG**.
