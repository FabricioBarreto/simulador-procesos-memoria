import { describe, test, expect } from 'vitest';
import { Proceso } from '../../../src/modelos/Proceso';
import { EstadoProceso } from '../../../src/modelos/EstadoProceso';
import { DatoInvalidoError } from '../../../src/errores/DatoInvalidoError';
import { TransicionInvalidaError } from '../../../src/errores/TransicionInvalidaError';
import { OperacionInvalidaError } from '../../../src/errores/OperacionInvalidaError';
import { EventoESInvalidoError } from '../../../src/errores/EventoESInvalidoError';
import { EventoES } from '../../../src/modelos/EventoES';

describe('Proceso - creación', () => {
    test('Debe crearse en estado Nuevo con sus datos y la CPU restante completa', () => {
        const proceso = new Proceso(1, 100, 5);

        expect(proceso.pid).toBe(1);
        expect(proceso.memoriaRequerida).toBe(100);
        expect(proceso.cpuTotal).toBe(5);
        expect(proceso.cpuRestante).toBe(5);
        expect(proceso.estado).toBe(EstadoProceso.Nuevo);
        expect(proceso.quantumConsumido).toBe(0);
    });

    test.each([
        [0, 100, 5],
        [-1, 100, 5],
        [1, 0, 5],
        [1, 2.5, 5],
        [1, 100, 0],
        [1, 100, -3],
    ])('Debe rechazar datos inválidos (pid=%d, memoria=%d, cpu=%d)', (pid, memoria, cpu) => {
        expect(() => new Proceso(pid, memoria, cpu)).toThrow(DatoInvalidoError);
    });
});

describe('Proceso - doble encapsulamiento', () => {
    test('No debe permitir modificar el estado desde afuera', () => {
        const proceso = new Proceso(1, 100, 5);

        const modificado = Reflect.set(proceso, 'estado', EstadoProceso.Terminado);

        expect(modificado).toBe(false);
        expect(proceso.estado).toBe(EstadoProceso.Nuevo);
    });

    test('No debe permitir modificar la CPU restante desde afuera', () => {
        const proceso = new Proceso(1, 100, 5);

        const modificado = Reflect.set(proceso, 'cpuRestante', 0);

        expect(modificado).toBe(false);
        expect(proceso.cpuRestante).toBe(5);
    });
});

describe('Proceso - transiciones válidas', () => {
    test('admitir lleva de Nuevo a Listo', () => {
        const proceso = new Proceso(1, 100, 5);

        proceso.admitir();

        expect(proceso.estado).toBe(EstadoProceso.Listo);
    });

    test('esperarMemoria lleva de Nuevo a Esperando Memoria y luego puede admitirse', () => {
        const proceso = new Proceso(1, 100, 5);

        proceso.esperarMemoria();
        expect(proceso.estado).toBe(EstadoProceso.EsperandoMemoria);

        proceso.admitir();
        expect(proceso.estado).toBe(EstadoProceso.Listo);
    });

    test('despachar lleva de Listo a Ejecutando con el quantum en cero', () => {
        const proceso = new Proceso(1, 100, 5);
        proceso.admitir();

        proceso.despachar();

        expect(proceso.estado).toBe(EstadoProceso.Ejecutando);
        expect(proceso.quantumConsumido).toBe(0);
    });

    test('expulsar lleva de Ejecutando a Listo', () => {
        const proceso = new Proceso(1, 100, 5);
        proceso.admitir();
        proceso.despachar();

        proceso.expulsar();

        expect(proceso.estado).toBe(EstadoProceso.Listo);
    });
});

describe('Proceso - transiciones inválidas', () => {
    test('No debe despacharse un proceso que todavía no fue admitido', () => {
        const proceso = new Proceso(1, 100, 5);

        expect(() => proceso.despachar()).toThrow(TransicionInvalidaError);
        expect(proceso.estado).toBe(EstadoProceso.Nuevo);
    });

    test('No debe admitirse dos veces', () => {
        const proceso = new Proceso(1, 100, 5);
        proceso.admitir();

        expect(() => proceso.admitir()).toThrow(TransicionInvalidaError);
        expect(proceso.estado).toBe(EstadoProceso.Listo);
    });

    test('No debe expulsarse un proceso que no está ejecutando', () => {
        const proceso = new Proceso(1, 100, 5);
        proceso.admitir();

        expect(() => proceso.expulsar()).toThrow(TransicionInvalidaError);
    });

    test('No debe pasar a Esperando Memoria si ya fue admitido', () => {
        const proceso = new Proceso(1, 100, 5);
        proceso.admitir();

        expect(() => proceso.esperarMemoria()).toThrow(TransicionInvalidaError);
    });
});

// Ayuda para los tests: deja un proceso nuevo en estado Ejecutando
function procesoEjecutando(cpu: number): Proceso {
    const proceso = new Proceso(1, 100, cpu);
    proceso.admitir();
    proceso.despachar();
    return proceso;
}

describe('Proceso - ejecución de CPU', () => {
    test('ejecutarTick reduce la CPU restante y suma al quantum consumido', () => {
        const proceso = procesoEjecutando(5);

        proceso.ejecutarTick();

        expect(proceso.cpuRestante).toBe(4);
        expect(proceso.cpuConsumida).toBe(1);
        expect(proceso.quantumConsumido).toBe(1);
        expect(proceso.estado).toBe(EstadoProceso.Ejecutando);
    });

    test('Debe terminar en el mismo tick en que la CPU restante llega a cero', () => {
        const proceso = procesoEjecutando(2);

        proceso.ejecutarTick();
        proceso.ejecutarTick();

        expect(proceso.cpuRestante).toBe(0);
        expect(proceso.estado).toBe(EstadoProceso.Terminado);
    });

    test('despachar reinicia el quantum consumido en una nueva ráfaga', () => {
        const proceso = procesoEjecutando(5);
        proceso.ejecutarTick();
        proceso.ejecutarTick();
        proceso.expulsar();

        proceso.despachar();

        expect(proceso.quantumConsumido).toBe(0);
        expect(proceso.cpuRestante).toBe(3);
    });

    test('renovarQuantum reinicia el quantum sin cambiar de estado', () => {
        const proceso = procesoEjecutando(5);
        proceso.ejecutarTick();
        proceso.ejecutarTick();

        proceso.renovarQuantum();

        expect(proceso.quantumConsumido).toBe(0);
        expect(proceso.estado).toBe(EstadoProceso.Ejecutando);
    });

    test('No debe ejecutar un tick si no está Ejecutando', () => {
        const proceso = new Proceso(1, 100, 5);
        proceso.admitir();

        expect(() => proceso.ejecutarTick()).toThrow(OperacionInvalidaError);
        expect(proceso.cpuRestante).toBe(5);
    });

    test('No debe renovar el quantum si no está Ejecutando', () => {
        const proceso = new Proceso(1, 100, 5);

        expect(() => proceso.renovarQuantum()).toThrow(OperacionInvalidaError);
    });

    test('Un proceso Terminado no vuelve a las colas ni ejecuta', () => {
        const proceso = procesoEjecutando(1);
        proceso.ejecutarTick();

        expect(() => proceso.admitir()).toThrow(TransicionInvalidaError);
        expect(() => proceso.despachar()).toThrow(TransicionInvalidaError);
        expect(() => proceso.ejecutarTick()).toThrow(OperacionInvalidaError);
        expect(proceso.estado).toBe(EstadoProceso.Terminado);
    });
});

describe('Proceso - Entrada/Salida (RF08)', () => {
    test('Debe bloquearse al llegar a los ticks de CPU indicados y conservar su CPU restante', () => {
        const proceso = new Proceso(1, 100, 5);
        proceso.programarES(new EventoES(2, 3));
        proceso.admitir();
        proceso.despachar();

        proceso.ejecutarTick();
        expect(proceso.estado).toBe(EstadoProceso.Ejecutando);

        proceso.ejecutarTick();
        expect(proceso.estado).toBe(EstadoProceso.Bloqueado);
        expect(proceso.cpuRestante).toBe(3);
        expect(proceso.bloqueoRestante).toBe(3);
        expect(proceso.tieneEventoES).toBe(false);
    });

    test('avanzarBloqueo baja el temporizador y vuelve a Listo al llegar a cero', () => {
        const proceso = procesoEjecutando(5);
        proceso.programarES(new EventoES(1, 2));
        proceso.ejecutarTick();

        proceso.avanzarBloqueo();
        expect(proceso.estado).toBe(EstadoProceso.Bloqueado);
        expect(proceso.bloqueoRestante).toBe(1);

        proceso.avanzarBloqueo();
        expect(proceso.estado).toBe(EstadoProceso.Listo);
        expect(proceso.bloqueoRestante).toBe(0);
    });

    test('Durante el bloqueo no consume CPU', () => {
        const proceso = procesoEjecutando(5);
        proceso.programarES(new EventoES(1, 2));
        proceso.ejecutarTick();

        expect(() => proceso.ejecutarTick()).toThrow(OperacionInvalidaError);
        expect(proceso.cpuRestante).toBe(4);
    });

    test('El evento se dispara una sola vez: al volver sigue ejecutando hasta terminar', () => {
        const proceso = procesoEjecutando(3);
        proceso.programarES(new EventoES(1, 1));
        proceso.ejecutarTick();
        proceso.avanzarBloqueo();
        proceso.despachar();

        proceso.ejecutarTick();
        proceso.ejecutarTick();

        expect(proceso.estado).toBe(EstadoProceso.Terminado);
    });

    test('Debe rechazar un evento que nunca llegaría a dispararse porque el proceso termina antes', () => {
        const proceso = new Proceso(1, 100, 3);

        expect(() => proceso.programarES(new EventoES(3, 2))).toThrow(EventoESInvalidoError);
        expect(proceso.tieneEventoES).toBe(false);
    });

    test('Debe rechazar un evento en un punto de CPU que ya pasó', () => {
        const proceso = procesoEjecutando(5);
        proceso.ejecutarTick();
        proceso.ejecutarTick();

        expect(() => proceso.programarES(new EventoES(2, 1))).toThrow(EventoESInvalidoError);
    });

    test('Debe rechazar un segundo evento si ya tiene uno programado', () => {
        const proceso = new Proceso(1, 100, 5);
        proceso.programarES(new EventoES(2, 1));

        expect(() => proceso.programarES(new EventoES(3, 1))).toThrow(EventoESInvalidoError);
    });

    test('No debe avanzar el bloqueo si no está Bloqueado', () => {
        const proceso = new Proceso(1, 100, 5);

        expect(() => proceso.avanzarBloqueo()).toThrow(OperacionInvalidaError);
    });
});

describe('Proceso - finalización forzada (defensa)', () => {
    // Se puede terminar a la fuerza desde cualquier estado que no sea Terminado
    test.each([
        ['Nuevo', (p: Proceso) => p],
        ['Esperando Memoria', (p: Proceso) => { p.esperarMemoria(); return p; }],
        ['Listo', (p: Proceso) => { p.admitir(); return p; }],
        ['Ejecutando', (p: Proceso) => { p.admitir(); p.despachar(); return p; }],
    ])('Desde %s pasa a Terminado', (_estado, preparar) => {
        const proceso = preparar(new Proceso(1, 100, 5));

        proceso.finalizar();

        expect(proceso.estado).toBe(EstadoProceso.Terminado);
    });

    // Desde Bloqueado: además se limpia el temporizador de E/S
    test('Desde Bloqueado pasa a Terminado y limpia el bloqueo', () => {
        const proceso = procesoEjecutando(5);
        proceso.programarES(new EventoES(1, 3));
        proceso.ejecutarTick();

        proceso.finalizar();

        expect(proceso.estado).toBe(EstadoProceso.Terminado);
        expect(proceso.bloqueoRestante).toBe(0);
    });

    // Un proceso ya terminado no se puede volver a terminar
    test('No se puede finalizar un proceso que ya terminó', () => {
        const proceso = procesoEjecutando(1);
        proceso.ejecutarTick();

        expect(() => proceso.finalizar()).toThrow(TransicionInvalidaError);
    });
});
