import { describe, test, expect } from 'vitest';
import { BloqueMemoria } from '../../../src/modelos/BloqueMemoria';
import { DatoInvalidoError } from '../../../src/errores/DatoInvalidoError';
import { OperacionMemoriaInvalidaError } from '../../../src/errores/OperacionMemoriaInvalidaError';

describe('BloqueMemoria - creación', () => {
    test('Debe crearse libre por defecto con inicio, tamaño y fin', () => {
        const bloque = new BloqueMemoria(0, 1024);

        expect(bloque.inicio).toBe(0);
        expect(bloque.tamanio).toBe(1024);
        expect(bloque.fin).toBe(1024);
        expect(bloque.pid).toBeNull();
        expect(bloque.libre).toBe(true);
    });

    test('Debe poder crearse ocupado por un proceso', () => {
        const bloque = new BloqueMemoria(100, 50, 7);

        expect(bloque.pid).toBe(7);
        expect(bloque.libre).toBe(false);
    });

    test.each([
        [-1, 100, null],
        [0, 0, null],
        [0, -5, null],
        [0, 100, 0],
    ])('Debe rechazar datos inválidos (inicio=%d, tamaño=%d, pid=%s)', (inicio, tamanio, pid) => {
        expect(() => new BloqueMemoria(inicio, tamanio, pid)).toThrow(DatoInvalidoError);
    });

    test('No debe permitir modificar sus datos desde afuera', () => {
        const bloque = new BloqueMemoria(0, 100);

        expect(Reflect.set(bloque, 'tamanio', 1)).toBe(false);
        expect(Reflect.set(bloque, 'pid', 3)).toBe(false);
        expect(bloque.tamanio).toBe(100);
        expect(bloque.libre).toBe(true);
    });
});

describe('BloqueMemoria - asignar', () => {
    test('Partición parcial: ocupa el principio y deja un bloque libre con el resto', () => {
        const bloque = new BloqueMemoria(0, 1024);

        const { ocupado, restante } = bloque.asignar(1, 300);

        expect(ocupado.inicio).toBe(0);
        expect(ocupado.tamanio).toBe(300);
        expect(ocupado.pid).toBe(1);
        expect(restante?.inicio).toBe(300);
        expect(restante?.tamanio).toBe(724);
        expect(restante?.libre).toBe(true);
    });

    test('Ajuste exacto: no genera un bloque de tamaño cero', () => {
        const bloque = new BloqueMemoria(200, 100);

        const { ocupado, restante } = bloque.asignar(2, 100);

        expect(ocupado.tamanio).toBe(100);
        expect(restante).toBeNull();
    });

    test('El bloque original no cambia (inmutabilidad)', () => {
        const bloque = new BloqueMemoria(0, 1024);

        bloque.asignar(1, 300);

        expect(bloque.libre).toBe(true);
        expect(bloque.tamanio).toBe(1024);
    });

    test('No debe asignar un bloque ocupado', () => {
        const bloque = new BloqueMemoria(0, 100, 1);

        expect(() => bloque.asignar(2, 50)).toThrow(OperacionMemoriaInvalidaError);
    });

    test('No debe asignar más memoria de la que tiene el bloque', () => {
        const bloque = new BloqueMemoria(0, 100);

        expect(() => bloque.asignar(1, 101)).toThrow(OperacionMemoriaInvalidaError);
    });

    test('Debe rechazar una cantidad solicitada inválida', () => {
        const bloque = new BloqueMemoria(0, 100);

        expect(() => bloque.asignar(1, 0)).toThrow(DatoInvalidoError);
    });
});

describe('BloqueMemoria - liberar', () => {
    test('Debe devolver el mismo tramo libre', () => {
        const bloque = new BloqueMemoria(300, 200, 4);

        const libre = bloque.liberar();

        expect(libre.inicio).toBe(300);
        expect(libre.tamanio).toBe(200);
        expect(libre.libre).toBe(true);
    });

    test('No debe liberar un bloque que ya está libre', () => {
        const bloque = new BloqueMemoria(0, 100);

        expect(() => bloque.liberar()).toThrow(OperacionMemoriaInvalidaError);
    });
});

describe('BloqueMemoria - fusionarCon', () => {
    test('Debe unir dos bloques libres contiguos en uno solo', () => {
        const izquierdo = new BloqueMemoria(0, 100);
        const derecho = new BloqueMemoria(100, 300);

        const fusionado = izquierdo.fusionarCon(derecho);

        expect(fusionado.inicio).toBe(0);
        expect(fusionado.tamanio).toBe(400);
        expect(fusionado.libre).toBe(true);
    });

    test('No debe fusionar si alguno está ocupado', () => {
        const libre = new BloqueMemoria(0, 100);
        const ocupado = new BloqueMemoria(100, 100, 1);

        expect(() => libre.fusionarCon(ocupado)).toThrow(OperacionMemoriaInvalidaError);
        expect(() => ocupado.fusionarCon(libre)).toThrow(OperacionMemoriaInvalidaError);
    });

    test('No debe fusionar bloques que no son contiguos', () => {
        const primero = new BloqueMemoria(0, 100);
        const lejano = new BloqueMemoria(200, 100);

        expect(() => primero.fusionarCon(lejano)).toThrow(OperacionMemoriaInvalidaError);
    });
});
