import { describe, test, expect } from 'vitest';
import { Simulador } from '../../../src/modelos/Simulador';
import { EstadoProceso } from '../../../src/modelos/EstadoProceso';
import { EventoES } from '../../../src/modelos/EventoES';
import { BestFit } from '../../../src/modelos/estrategias/BestFit';
import { DatoInvalidoError } from '../../../src/errores/DatoInvalidoError';
import { RegistroInvalidoError } from '../../../src/errores/RegistroInvalidoError';
import { EventoESInvalidoError } from '../../../src/errores/EventoESInvalidoError';

// Ayuda: avanza N ticks seguidos
function avanzar(simulador: Simulador, ticks: number): void {
    for (let i = 0; i < ticks; i++) {
        simulador.avanzarTick();
    }
}

describe('Simulador - configuración e inicio (RF01)', () => {
    // RF01: configuración de referencia 1024 KB, quantum 2 (y First-Fit por defecto)
    test('Debe iniciar con la configuración de referencia: tick 0, memoria vacía y CPU libre', () => {
        const simulador = new Simulador();

        expect(simulador.tick).toBe(0);
        expect(simulador.memoriaTotal).toBe(1024);
        expect(simulador.quantum).toBe(2);
        expect(simulador.politica).toBe('First-Fit');
        expect(simulador.procesoEnCpu).toBeNull();
        expect(simulador.colaListos).toEqual([]);
        expect(simulador.esperandoMemoria).toEqual([]);
        expect(simulador.bloqueados).toEqual([]);
        expect(simulador.terminados).toEqual([]);
        expect(simulador.mapaMemoria.map((b) => [b.inicio, b.tamanio, b.pid])).toEqual([[0, 1024, null]]);
        expect(simulador.metricas.cambiosContexto).toBe(0);
        expect(simulador.metricas.utilizacionCpu).toBe(0);
    });

    // RF01: memoria, quantum y política son configurables
    test('Debe aceptar memoria, quantum y política personalizados', () => {
        const simulador = new Simulador({ memoriaTotal: 2048, quantum: 3, estrategia: new BestFit() });

        expect(simulador.memoriaTotal).toBe(2048);
        expect(simulador.quantum).toBe(3);
        expect(simulador.politica).toBe('Best-Fit');
    });

    // RF01: configuraciones inválidas se rechazan (el objeto no llega a crearse)
    test.each([
        [{ memoriaTotal: 0 }],
        [{ memoriaTotal: -512 }],
        [{ quantum: 0 }],
        [{ quantum: 1.5 }],
    ])('Debe rechazar la configuración inválida %o', (configuracion) => {
        expect(() => new Simulador(configuracion)).toThrow(DatoInvalidoError);
    });
});

describe('Simulador - registro de procesos (RF02)', () => {
    // RF02 + RF03: registrar deja el proceso en Nuevo, todavía sin memoria ni cola
    test('Registrar deja el proceso en Nuevo hasta el próximo tick', () => {
        const simulador = new Simulador();

        simulador.registrarProceso(1, 100, 3);

        expect(simulador.consultarProceso(1).estado).toBe(EstadoProceso.Nuevo);
        expect(simulador.colaListos).toEqual([]);
        expect(simulador.mapaMemoria).toHaveLength(1);
    });

    // Caso mínimo "Configuración y registro": PID repetido
    test('Debe rechazar un PID repetido sin modificar los procesos', () => {
        const simulador = new Simulador();
        simulador.registrarProceso(1, 100, 3);

        expect(() => simulador.registrarProceso(1, 50, 2)).toThrow(RegistroInvalidoError);
        expect(simulador.listarProcesos()).toHaveLength(1);
        expect(simulador.consultarProceso(1).memoriaRequerida).toBe(100);
    });

    // Caso mínimo "Configuración y registro": proceso mayor que la memoria total
    test('Debe rechazar un proceso que pide más memoria que la total', () => {
        const simulador = new Simulador({ memoriaTotal: 1024 });

        expect(() => simulador.registrarProceso(1, 1025, 3)).toThrow(RegistroInvalidoError);
        expect(simulador.listarProcesos()).toHaveLength(0);
    });

    // Un proceso que pide EXACTAMENTE toda la memoria sí es válido
    test('Debe aceptar un proceso que pide exactamente toda la memoria', () => {
        const simulador = new Simulador({ memoriaTotal: 1024 });

        simulador.registrarProceso(1, 1024, 3);

        expect(simulador.listarProcesos()).toHaveLength(1);
    });

    // RF02: datos inválidos se rechazan y el simulador no queda con estado parcial
    test.each([
        [0, 100, 3],
        [1, 0, 3],
        [1, 100, 0],
    ])('Debe rechazar datos inválidos (pid=%d, memoria=%d, cpu=%d) sin registrar nada', (pid, memoria, cpu) => {
        const simulador = new Simulador();

        expect(() => simulador.registrarProceso(pid, memoria, cpu)).toThrow(DatoInvalidoError);
        expect(simulador.listarProcesos()).toHaveLength(0);
    });

    // RF08: un evento de E/S inválido también impide el registro
    test('Debe rechazar un evento de E/S que nunca se dispararía, sin registrar el proceso', () => {
        const simulador = new Simulador();

        expect(() => simulador.registrarProceso(1, 100, 3, new EventoES(3, 1))).toThrow(EventoESInvalidoError);
        expect(simulador.listarProcesos()).toHaveLength(0);
    });

    // Consultar un PID que no existe es un error
    test('Debe fallar al consultar un proceso que no existe', () => {
        const simulador = new Simulador();

        expect(() => simulador.consultarProceso(99)).toThrow(RegistroInvalidoError);
    });
});

describe('Simulador - doble encapsulamiento (RF02, RF10)', () => {
    // La vista de un proceso es una copia congelada, sin métodos del dominio
    test('La vista de un proceso no permite modificarlo ni llamar a sus operaciones', () => {
        const simulador = new Simulador();
        simulador.registrarProceso(1, 100, 3);
        const vista = simulador.consultarProceso(1);

        expect(Reflect.set(vista, 'estado', EstadoProceso.Terminado)).toBe(false);
        expect('despachar' in vista).toBe(false);
        expect(simulador.consultarProceso(1).estado).toBe(EstadoProceso.Nuevo);
    });

    // Las colas que se consultan son listas nuevas: modificarlas no afecta al simulador
    test('Las colas consultadas son copias', () => {
        const simulador = new Simulador();
        simulador.registrarProceso(1, 100, 3);
        simulador.registrarProceso(2, 100, 3);
        simulador.avanzarTick();

        (simulador.colaListos as number[]).length = 0;

        expect(simulador.colaListos).toEqual([2]);
    });
});

describe('Simulador - fases de cada tick (RF06)', () => {
    // Fase 1 + fase 3 en el mismo tick: P1 se admite y ejecuta su primera unidad de CPU
    test('En el primer tick admite el proceso, le asigna memoria y lo ejecuta', () => {
        const simulador = new Simulador();
        simulador.registrarProceso(1, 100, 3);

        simulador.avanzarTick();

        expect(simulador.tick).toBe(1);
        expect(simulador.procesoEnCpu).toBe(1);
        expect(simulador.consultarProceso(1).cpuRestante).toBe(2);
        expect(simulador.mapaMemoria.map((b) => [b.inicio, b.tamanio, b.pid])).toEqual([[0, 100, 1], [100, 924, null]]);
    });

    // RF03: si no hay bloque suficiente queda Esperando Memoria, sin frenar a los que sí entran
    test('Un proceso que no entra queda Esperando Memoria sin impedir que otros sean admitidos', () => {
        const simulador = new Simulador({ memoriaTotal: 1000 });
        simulador.registrarProceso(1, 700, 5);
        simulador.registrarProceso(2, 500, 5); // no entra: quedan 300
        simulador.registrarProceso(3, 200, 5); // sí entra

        simulador.avanzarTick();

        expect(simulador.esperandoMemoria).toEqual([2]);
        expect(simulador.consultarProceso(3).estado).toBe(EstadoProceso.Listo);
        expect(simulador.colaListos).toEqual([3]);
    });

    // RF03: se reintenta en cada tick; mientras no haya hueco suficiente sigue esperando
    test('Sigue Esperando Memoria en los ticks siguientes mientras no haya hueco suficiente', () => {
        const simulador = new Simulador({ memoriaTotal: 1000 });
        simulador.registrarProceso(1, 700, 5);
        simulador.registrarProceso(2, 500, 5);

        avanzar(simulador, 3);

        expect(simulador.esperandoMemoria).toEqual([2]);
        expect(simulador.consultarProceso(2).estado).toBe(EstadoProceso.EsperandoMemoria);
    });

    // RF05 + RF07: al terminar se libera la memoria (con coalescencia) en ese mismo tick
    test('Al terminar un proceso se libera su memoria en el mismo tick', () => {
        const simulador = new Simulador();
        simulador.registrarProceso(1, 100, 1);

        simulador.avanzarTick();

        expect(simulador.terminados).toEqual([1]);
        expect(simulador.procesoEnCpu).toBeNull();
        expect(simulador.mapaMemoria.map((b) => [b.inicio, b.tamanio, b.pid])).toEqual([[0, 1024, null]]);
    });

    // RF08: el proceso bloqueado conserva su memoria y no ocupa la CPU
    test('Un proceso bloqueado conserva su memoria y queda en la lista de bloqueados', () => {
        const simulador = new Simulador();
        simulador.registrarProceso(1, 100, 4, new EventoES(1, 2));

        simulador.avanzarTick();

        expect(simulador.bloqueados).toEqual([1]);
        expect(simulador.procesoEnCpu).toBeNull();
        expect(simulador.mapaMemoria[0].pid).toBe(1);
    });

    // RF08: el temporizador baja recién en los ticks POSTERIORES al bloqueo.
    // Al llegar a cero vuelve al final de Listos y puede ejecutarse en ese mismo tick
    test('Al vencer el bloqueo vuelve a Listos y se ejecuta en ese mismo tick', () => {
        const simulador = new Simulador();
        simulador.registrarProceso(1, 100, 4, new EventoES(1, 2));

        simulador.avanzarTick(); // tick 1: ejecuta 1 unidad y se bloquea (bloqueo = 2)
        expect(simulador.consultarProceso(1).bloqueoRestante).toBe(2);

        simulador.avanzarTick(); // tick 2: el bloqueo baja a 1, CPU libre
        expect(simulador.consultarProceso(1).bloqueoRestante).toBe(1);
        expect(simulador.procesoEnCpu).toBeNull();

        simulador.avanzarTick(); // tick 3: el bloqueo llega a 0, vuelve a Listos y ejecuta
        expect(simulador.bloqueados).toEqual([]);
        expect(simulador.procesoEnCpu).toBe(1);
        expect(simulador.consultarProceso(1).cpuRestante).toBe(2);
    });

    // RF09: las métricas se recalculan al final de cada tick
    test('Las métricas se recalculan al final de cada tick', () => {
        const simulador = new Simulador({ memoriaTotal: 1000 });
        simulador.registrarProceso(1, 250, 1);

        simulador.avanzarTick(); // tick 1: P1 ejecuta y termina
        simulador.avanzarTick(); // tick 2: CPU libre

        expect(simulador.metricas.utilizacionCpu).toBe(50);
        expect(simulador.metricas.ocupacionMemoria).toBe(0);
    });

    // Sin procesos, el reloj avanza igual y la CPU queda ociosa
    test('Sin procesos el reloj avanza y la utilización de CPU es 0%', () => {
        const simulador = new Simulador();

        avanzar(simulador, 3);

        expect(simulador.tick).toBe(3);
        expect(simulador.metricas.utilizacionCpu).toBe(0);
    });
});
