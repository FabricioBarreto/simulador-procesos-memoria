import { describe, test, expect } from 'vitest';
import { Simulador } from '../../src/modelos/Simulador';
import { EstadoProceso } from '../../src/modelos/EstadoProceso';
import { EventoES } from '../../src/modelos/EventoES';
import { IEstrategiaAsignacion } from '../../src/interfaces/IEstrategiaAsignacion';
import { FirstFit } from '../../src/modelos/estrategias/FirstFit';
import { BestFit } from '../../src/modelos/estrategias/BestFit';
import { WorstFit } from '../../src/modelos/estrategias/WorstFit';
import { DatoInvalidoError } from '../../src/errores/DatoInvalidoError';
import { RegistroInvalidoError } from '../../src/errores/RegistroInvalidoError';

// =============================================================================
// PRUEBAS DE COLABORACIÓN: los 8 "Casos mínimos de verificación" de la consigna,
// corridos de punta a punta sobre el Simulador. A diferencia de los tests
// unitarios, acá trabajan juntos Simulador + GestorMemoria + PlanificadorRoundRobin
// + Proceso + Metricas, y se verifica el ORDEN de las fases de cada tick.
// =============================================================================

// ---------- Ayudas ----------

// Resumen del mapa de memoria: [inicio, tamaño, pid] por bloque
function mapa(simulador: Simulador): (number | null)[][] {
    return simulador.mapaMemoria.map((b) => [b.inicio, b.tamanio, b.pid]);
}

// Avanza un tick y devuelve el PID que consumió CPU en ese tick (o null).
// Se detecta comparando la CPU restante de cada proceso antes y después
function tickYQuienEjecuto(simulador: Simulador): number | null {
    const antes = new Map(simulador.listarProcesos().map((p) => [p.pid, p.cpuRestante]));

    simulador.avanzarTick();

    const ejecutado = simulador.listarProcesos().find((p) => p.cpuRestante < (antes.get(p.pid) ?? 0));
    return ejecutado?.pid ?? null;
}

// Avanza N ticks y devuelve la traza de quién usó la CPU en cada uno
function traza(simulador: Simulador, ticks: number): (number | null)[] {
    const resultado: (number | null)[] = [];

    for (let i = 0; i < ticks; i++) {
        resultado.push(tickYQuienEjecuto(simulador));
    }

    return resultado;
}

// Invariantes del sistema (RF05, RF10): se pueden chequear en cualquier tick
function verificarInvariantes(simulador: Simulador): void {
    // Memoria: bloques contiguos, sin solapamientos, que suman el total
    let direccion = 0;
    for (const bloque of simulador.mapaMemoria) {
        expect(bloque.inicio).toBe(direccion);
        direccion = bloque.fin;
    }
    expect(direccion).toBe(simulador.memoriaTotal);

    // Memoria: nunca quedan dos bloques libres juntos (siempre se fusionan)
    const bloques = simulador.mapaMemoria;
    for (let i = 1; i < bloques.length; i++) {
        expect(bloques[i - 1].libre && bloques[i].libre).toBe(false);
    }

    // Colas: ningún proceso aparece dos veces ni en dos lugares a la vez
    const enCpu = simulador.procesoEnCpu === null ? [] : [simulador.procesoEnCpu];
    const ubicados = [...enCpu, ...simulador.colaListos, ...simulador.bloqueados, ...simulador.esperandoMemoria];
    expect(new Set(ubicados).size).toBe(ubicados.length);

    // CPU: como máximo un proceso Ejecutando
    const ejecutando = simulador.listarProcesos().filter((p) => p.estado === EstadoProceso.Ejecutando);
    expect(ejecutando.length).toBeLessThanOrEqual(1);

    // Memoria y estados: tienen bloque exactamente los Listos, Ejecutando y Bloqueados
    for (const proceso of simulador.listarProcesos()) {
        const cantidadBloques = simulador.mapaMemoria.filter((b) => b.pid === proceso.pid).length;
        const debeTenerMemoria = [EstadoProceso.Listo, EstadoProceso.Ejecutando, EstadoProceso.Bloqueado]
            .includes(proceso.estado);
        expect(cantidadBloques).toBe(debeTenerMemoria ? 1 : 0);
    }
}

// =============================================================================
// Caso 1: Configuración y registro
// Estado inicial correcto; rechazo de parámetros inválidos, PID repetidos
// y procesos mayores que la memoria.
// =============================================================================
describe('Caso 1 - Configuración y registro', () => {
    test('Estado inicial: tick 0, un único bloque libre, CPU libre, colas vacías y métricas en cero', () => {
        const simulador = new Simulador({ memoriaTotal: 1024, quantum: 2 });

        expect(simulador.tick).toBe(0);
        expect(mapa(simulador)).toEqual([[0, 1024, null]]);
        expect(simulador.procesoEnCpu).toBeNull();
        expect(simulador.colaListos).toEqual([]);
        expect(simulador.metricas.utilizacionCpu).toBe(0);
        expect(simulador.metricas.cambiosContexto).toBe(0);
    });

    test('Rechaza parámetros inválidos, PID repetidos y procesos mayores que la memoria', () => {
        expect(() => new Simulador({ quantum: 0 })).toThrow(DatoInvalidoError);
        expect(() => new Simulador({ memoriaTotal: -1 })).toThrow(DatoInvalidoError);

        const simulador = new Simulador({ memoriaTotal: 1024 });
        simulador.registrarProceso(1, 100, 3);

        expect(() => simulador.registrarProceso(1, 100, 3)).toThrow(RegistroInvalidoError);
        expect(() => simulador.registrarProceso(2, 2000, 3)).toThrow(RegistroInvalidoError);
        expect(() => simulador.registrarProceso(3, 100, -1)).toThrow(DatoInvalidoError);
        expect(simulador.listarProcesos().map((p) => p.pid)).toEqual([1]);
    });
});

// =============================================================================
// Caso 2: Asignación y espera
// Partición parcial, ajuste exacto, selección según política, fracaso sin
// modificación y posterior admisión al liberarse memoria.
// =============================================================================
describe('Caso 2 - Asignación y espera', () => {
    test('Partición parcial y ajuste exacto', () => {
        const simulador = new Simulador({ memoriaTotal: 1000, quantum: 10 });
        simulador.registrarProceso(1, 400, 5); // partición parcial: sobran 600
        simulador.registrarProceso(2, 600, 5); // ajuste exacto en el resto

        simulador.avanzarTick();

        expect(mapa(simulador)).toEqual([[0, 400, 1], [400, 600, 2]]);
    });

    test('Fracaso sin modificación y admisión recién en el tick siguiente a la liberación', () => {
        const simulador = new Simulador({ memoriaTotal: 1000, quantum: 2 });
        simulador.registrarProceso(1, 600, 1);
        simulador.registrarProceso(2, 600, 2);

        // Tick 1: P1 entra; P2 no entra y la memoria NO se modifica por su intento.
        // P1 ejecuta su única unidad y termina: libera la memoria al final del tick
        simulador.avanzarTick();
        expect(simulador.esperandoMemoria).toEqual([2]);
        expect(simulador.terminados).toEqual([1]);
        expect(mapa(simulador)).toEqual([[0, 1000, null]]);

        // Tick 2: en la fase de admisión P2 por fin consigue memoria
        simulador.avanzarTick();
        expect(simulador.esperandoMemoria).toEqual([]);
        expect(mapa(simulador)).toEqual([[0, 600, 2], [600, 400, null]]);
    });

    // Polimorfismo: el MISMO escenario con las tres políticas.
    // Se arman huecos de 200, 500 y 174 KB y llega un proceso de 150 KB
    test.each([
        ['First-Fit', 0, new FirstFit()],
        ['Best-Fit', 850, new BestFit()],
        ['Worst-Fit', 300, new WorstFit()],
    ] as [string, number, IEstrategiaAsignacion][])(
        'Selección según política: con %s el proceso de 150 KB va a la dirección %i',
        (_nombre, direccionEsperada, estrategia) => {
            const simulador = new Simulador({ memoriaTotal: 1024, quantum: 2, estrategia });
            simulador.registrarProceso(1, 200, 1);  // [0-200]    termina en el tick 1
            simulador.registrarProceso(2, 100, 20); // [200-300]  sigue vivo
            simulador.registrarProceso(3, 500, 1);  // [300-800]  termina en el tick 4
            simulador.registrarProceso(4, 50, 20);  // [800-850]  sigue vivo

            for (let i = 0; i < 4; i++) {
                simulador.avanzarTick();
            }
            expect(simulador.terminados).toEqual([1, 3]);

            simulador.registrarProceso(9, 150, 5);
            simulador.avanzarTick();

            const bloque = simulador.mapaMemoria.find((b) => b.pid === 9);
            expect(bloque?.inicio).toBe(direccionEsperada);
        }
    );
});

// =============================================================================
// Caso 3: Coalescencia
// Fusión con vecino izquierdo, derecho y ambos; al liberar todos los procesos
// queda un único bloque libre del tamaño total.
// =============================================================================
describe('Caso 3 - Coalescencia', () => {
    // Memoria 1000 con 4 procesos de 250: [P1][P2][P3][P4], quantum 1.
    // Con CPU [3, 1, 2, 4] terminan en el orden P2, P3, P1, P4
    test('Fusión con el vecino izquierdo, con el derecho y al final un único bloque', () => {
        const simulador = new Simulador({ memoriaTotal: 1000, quantum: 1 });
        [[1, 3], [2, 1], [3, 2], [4, 4]].forEach(([pid, cpu]) => simulador.registrarProceso(pid, 250, cpu));

        // Tick 2: termina P2 → hueco aislado en 250
        traza(simulador, 2);
        expect(mapa(simulador)).toEqual([[0, 250, 1], [250, 250, null], [500, 250, 3], [750, 250, 4]]);

        // Tick 6: termina P3 → su bloque se fusiona con el hueco de su IZQUIERDA
        traza(simulador, 4);
        expect(mapa(simulador)).toEqual([[0, 250, 1], [250, 500, null], [750, 250, 4]]);

        // Tick 8: termina P1 → su bloque se fusiona con el hueco de su DERECHA
        traza(simulador, 2);
        expect(mapa(simulador)).toEqual([[0, 750, null], [750, 250, 4]]);

        // Termina P4 → queda un único bloque libre del tamaño total
        traza(simulador, 2);
        expect(simulador.terminados).toEqual([1, 2, 3, 4]);
        expect(mapa(simulador)).toEqual([[0, 1000, null]]);
    });

    // Con CPU [1, 3, 1, 5] terminan P1 y P3 antes que P2:
    // al terminar P2 tiene huecos a ambos lados y se fusionan los tres
    test('Fusión con ambos vecinos a la vez', () => {
        const simulador = new Simulador({ memoriaTotal: 1000, quantum: 1 });
        [[1, 1], [2, 3], [3, 1], [4, 5]].forEach(([pid, cpu]) => simulador.registrarProceso(pid, 250, cpu));

        traza(simulador, 3); // terminan P1 (tick 1) y P3 (tick 3)
        expect(mapa(simulador)).toEqual([[0, 250, null], [250, 250, 2], [500, 250, null], [750, 250, 4]]);

        traza(simulador, 4); // termina P2 (tick 7)
        expect(mapa(simulador)).toEqual([[0, 750, null], [750, 250, 4]]);
    });
});

// =============================================================================
// Caso 4: Round Robin
// Con memoria suficiente, Q = 2, P1 con CPU 3 y P2 con CPU 2:
// ejecución P1, P1, P2, P2, P1; un cambio de contexto según RF09.
// =============================================================================
describe('Caso 4 - Round Robin', () => {
    test('Q=2, P1(CPU 3) y P2(CPU 2): se ejecuta P1, P1, P2, P2, P1 con 1 cambio de contexto', () => {
        const simulador = new Simulador({ memoriaTotal: 1024, quantum: 2 });
        simulador.registrarProceso(1, 100, 3);
        simulador.registrarProceso(2, 100, 2);

        expect(traza(simulador, 5)).toEqual([1, 1, 2, 2, 1]);
        expect(simulador.metricas.cambiosContexto).toBe(1);
        expect(simulador.terminados).toEqual([1, 2]);
    });
});

// =============================================================================
// Caso 5: Quantum y finalización
// Un único proceso renueva quantum sin cambio de contexto.
// Finalizar en el límite de quantum no lo reencola.
// =============================================================================
describe('Caso 5 - Quantum y finalización', () => {
    test('Un único proceso renueva el quantum sin cambio de contexto', () => {
        const simulador = new Simulador({ quantum: 2 });
        simulador.registrarProceso(1, 100, 5);

        expect(traza(simulador, 5)).toEqual([1, 1, 1, 1, 1]);
        expect(simulador.metricas.cambiosContexto).toBe(0);
    });

    test('Finalizar en el límite del quantum no reencola al proceso', () => {
        const simulador = new Simulador({ quantum: 2 });
        simulador.registrarProceso(1, 100, 2);
        simulador.registrarProceso(2, 100, 2);

        traza(simulador, 2);

        expect(simulador.terminados).toEqual([1]);
        expect(simulador.colaListos).toEqual([2]);
        expect(simulador.metricas.cambiosContexto).toBe(0);
    });
});

// =============================================================================
// Caso 6: Bloqueo por E/S
// Bloquear, conservar memoria, dejar de consumir CPU y retornar a Listos al
// vencer el temporizador; verificar el contador de contexto.
// =============================================================================
describe('Caso 6 - Bloqueo por E/S', () => {
    test('Se bloquea, conserva la memoria, no consume CPU y vuelve a Listos al vencer', () => {
        const simulador = new Simulador({ memoriaTotal: 1024, quantum: 2 });
        simulador.registrarProceso(1, 300, 4, new EventoES(1, 2)); // E/S después de 1 tick de CPU, dura 2
        simulador.registrarProceso(2, 200, 3);

        // Tick 1: P1 ejecuta 1 unidad y se bloquea → 1 cambio de contexto
        expect(tickYQuienEjecuto(simulador)).toBe(1);
        expect(simulador.bloqueados).toEqual([1]);
        expect(simulador.mapaMemoria.find((b) => b.pid === 1)?.tamanio).toBe(300);
        expect(simulador.metricas.cambiosContexto).toBe(1);

        // Tick 2: ejecuta P2; P1 sigue bloqueado y no consume CPU
        expect(tickYQuienEjecuto(simulador)).toBe(2);
        expect(simulador.consultarProceso(1).cpuRestante).toBe(3);
        expect(simulador.consultarProceso(1).bloqueoRestante).toBe(1);

        // Tick 3: vence el bloqueo → P1 vuelve al FINAL de Listos. P2 agota su
        // quantum con P1 esperando → es expulsado (2do cambio de contexto)
        expect(tickYQuienEjecuto(simulador)).toBe(2);
        expect(simulador.bloqueados).toEqual([]);
        expect(simulador.colaListos).toEqual([1, 2]);
        expect(simulador.metricas.cambiosContexto).toBe(2);

        // Tick 4: P1 vuelve a la CPU
        expect(tickYQuienEjecuto(simulador)).toBe(1);
    });
});

// =============================================================================
// Caso 7: Métricas y límites
// Huecos no contiguos de 100 y 300 KB: libre total 400, mayor hueco 300 y
// fragmentación 25%. Probar memoria llena y tick 0.
// =============================================================================
describe('Caso 7 - Métricas y límites', () => {
    test('Huecos de 100 y 300 KB: libre 400, mayor 300 y fragmentación 25%', () => {
        const simulador = new Simulador({ memoriaTotal: 1000, quantum: 1 });
        simulador.registrarProceso(1, 100, 1);  // termina en el tick 1
        simulador.registrarProceso(2, 200, 10);
        simulador.registrarProceso(3, 300, 1);  // termina en el tick 3
        simulador.registrarProceso(4, 400, 10);

        traza(simulador, 3);

        expect(mapa(simulador)).toEqual([[0, 100, null], [100, 200, 2], [300, 300, null], [600, 400, 4]]);
        expect(simulador.metricas.memoriaLibreTotal).toBe(400);
        expect(simulador.metricas.mayorBloqueLibre).toBe(300);
        expect(simulador.metricas.fragmentacionExterna).toBe(25);
        expect(simulador.metricas.ocupacionMemoria).toBe(60);
        expect(simulador.metricas.utilizacionCpu).toBe(100);
    });

    test('Memoria llena: ocupación 100% y fragmentación 0%', () => {
        const simulador = new Simulador({ memoriaTotal: 1000 });
        simulador.registrarProceso(1, 1000, 5);

        simulador.avanzarTick();

        expect(simulador.metricas.ocupacionMemoria).toBe(100);
        expect(simulador.metricas.memoriaLibreTotal).toBe(0);
        expect(simulador.metricas.fragmentacionExterna).toBe(0);
    });

    test('Tick 0: utilización de CPU 0% y sin fragmentación', () => {
        const simulador = new Simulador();

        expect(simulador.metricas.utilizacionCpu).toBe(0);
        expect(simulador.metricas.fragmentacionExterna).toBe(0);
        expect(simulador.metricas.ocupacionMemoria).toBe(0);
    });
});

// =============================================================================
// Caso 8: Orden e invariantes
// Una liberación al final del tick habilita admisión en el siguiente.
// Sin duplicados, solapamientos ni dos procesos en CPU.
// =============================================================================
describe('Caso 8 - Orden e invariantes', () => {
    test('La memoria liberada al final de un tick recién se usa en la admisión del siguiente', () => {
        const simulador = new Simulador({ memoriaTotal: 500, quantum: 2 });
        simulador.registrarProceso(1, 500, 1);
        simulador.registrarProceso(2, 500, 1);

        simulador.avanzarTick(); // P1 entra, ejecuta y termina; P2 no entró en ESTE tick
        expect(simulador.consultarProceso(2).estado).toBe(EstadoProceso.EsperandoMemoria);
        expect(simulador.procesoEnCpu).toBeNull();

        simulador.avanzarTick(); // ahora sí: P2 se admite en la fase 1 del tick 2
        expect(simulador.terminados).toEqual([1, 2]);
    });

    // Escenario mixto (espera de memoria, E/S, expulsiones y finalizaciones):
    // en TODOS los ticks se cumplen los invariantes del sistema
    test('En cada tick de un escenario mixto se cumplen todos los invariantes', () => {
        const simulador = new Simulador({ memoriaTotal: 1000, quantum: 2, estrategia: new BestFit() });
        simulador.registrarProceso(1, 300, 4, new EventoES(2, 2));
        simulador.registrarProceso(2, 500, 3);
        simulador.registrarProceso(3, 400, 2);              // espera memoria al principio
        simulador.registrarProceso(4, 150, 5, new EventoES(1, 3));
        simulador.registrarProceso(5, 50, 1);

        for (let i = 0; i < 30; i++) {
            verificarInvariantes(simulador);
            simulador.avanzarTick();
        }

        verificarInvariantes(simulador);
        expect([...simulador.terminados].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);
        expect(mapa(simulador)).toEqual([[0, 1000, null]]);
    });
});
