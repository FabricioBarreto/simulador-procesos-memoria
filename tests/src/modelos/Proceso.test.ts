import { describe, test, expect } from 'vitest';
import { Proceso } from '../../../src/modelos/Proceso';
import { EstadoProceso } from '../../../src/modelos/EstadoProceso';
import { DatoInvalidoError } from '../../../src/errores/DatoInvalidoError';
import { TransicionInvalidaError } from '../../../src/errores/TransicionInvalidaError';

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
