import { describe, test, expect } from 'vitest';
import { BloqueMemoria } from '../../../src/modelos/BloqueMemoria';
import { DatoInvalidoError } from '../../../src/errores/DatoInvalidoError';
import { OperacionMemoriaInvalidaError } from '../../../src/errores/OperacionMemoriaInvalidaError';

// RF04: un bloque tiene inicio, tamaño y proceso asignado o condición de libre
describe('BloqueMemoria - creación', () => {
    // Sin pid el bloque está libre; fin = inicio + tamaño
    test('Debe crearse libre por defecto con inicio, tamaño y fin', () => {
        const bloque = new BloqueMemoria(0, 1024);

        expect(bloque.inicio).toBe(0);
        expect(bloque.tamanio).toBe(1024);
        expect(bloque.fin).toBe(1024);
        expect(bloque.pid).toBeNull();
        expect(bloque.libre).toBe(true);
    });

    // Con pid el bloque está ocupado por ese proceso
    test('Debe poder crearse ocupado por un proceso', () => {
        const bloque = new BloqueMemoria(100, 50, 7);

        expect(bloque.pid).toBe(7);
        expect(bloque.libre).toBe(false);
    });

    // El inicio puede ser 0 pero no negativo; el tamaño y el pid deben ser positivos
    test.each([
        [-1, 100, null],
        [0, 0, null],
        [0, -5, null],
        [0, 100, 0],
    ])('Debe rechazar datos inválidos (inicio=%d, tamaño=%d, pid=%s)', (inicio, tamanio, pid) => {
        expect(() => new BloqueMemoria(inicio, tamanio, pid)).toThrow(DatoInvalidoError);
    });

    // Inmutable: no se pueden cambiar el tamaño ni el pid desde afuera
    test('No debe permitir modificar sus datos desde afuera', () => {
        const bloque = new BloqueMemoria(0, 100);

        expect(Reflect.set(bloque, 'tamanio', 1)).toBe(false);
        expect(Reflect.set(bloque, 'pid', 3)).toBe(false);
        expect(bloque.tamanio).toBe(100);
        expect(bloque.libre).toBe(true);
    });
});

// RF04: asignación contigua dentro de un bloque
describe('BloqueMemoria - asignar', () => {
    // Caso mínimo "Asignación y espera": partición parcial (se divide el bloque)
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

    // Caso mínimo "Asignación y espera": ajuste exacto, sin bloques de tamaño 0
    test('Ajuste exacto: no genera un bloque de tamaño cero', () => {
        const bloque = new BloqueMemoria(200, 100);

        const { ocupado, restante } = bloque.asignar(2, 100);

        expect(ocupado.tamanio).toBe(100);
        expect(restante).toBeNull();
    });

    // Asignar devuelve bloques nuevos: el original queda igual
    test('El bloque original no cambia (inmutabilidad)', () => {
        const bloque = new BloqueMemoria(0, 1024);

        bloque.asignar(1, 300);

        expect(bloque.libre).toBe(true);
        expect(bloque.tamanio).toBe(1024);
    });

    // Un bloque ocupado no se puede volver a asignar
    test('No debe asignar un bloque ocupado', () => {
        const bloque = new BloqueMemoria(0, 100, 1);

        expect(() => bloque.asignar(2, 50)).toThrow(OperacionMemoriaInvalidaError);
    });

    // No se puede pedir más de lo que mide el bloque
    test('No debe asignar más memoria de la que tiene el bloque', () => {
        const bloque = new BloqueMemoria(0, 100);

        expect(() => bloque.asignar(1, 101)).toThrow(OperacionMemoriaInvalidaError);
    });

    // La cantidad pedida debe ser un entero positivo
    test('Debe rechazar una cantidad solicitada inválida', () => {
        const bloque = new BloqueMemoria(0, 100);

        expect(() => bloque.asignar(1, 0)).toThrow(DatoInvalidoError);
    });
});

// RF05: liberación de un bloque
describe('BloqueMemoria - liberar', () => {
    // Liberar devuelve el mismo tramo de memoria, ahora libre
    test('Debe devolver el mismo tramo libre', () => {
        const bloque = new BloqueMemoria(300, 200, 4);

        const libre = bloque.liberar();

        expect(libre.inicio).toBe(300);
        expect(libre.tamanio).toBe(200);
        expect(libre.libre).toBe(true);
    });

    // No se puede liberar dos veces
    test('No debe liberar un bloque que ya está libre', () => {
        const bloque = new BloqueMemoria(0, 100);

        expect(() => bloque.liberar()).toThrow(OperacionMemoriaInvalidaError);
    });
});

// RF05: coalescencia de dos bloques
describe('BloqueMemoria - fusionarCon', () => {
    // Dos bloques libres pegados se unen en uno que suma sus tamaños
    test('Debe unir dos bloques libres contiguos en uno solo', () => {
        const izquierdo = new BloqueMemoria(0, 100);
        const derecho = new BloqueMemoria(100, 300);

        const fusionado = izquierdo.fusionarCon(derecho);

        expect(fusionado.inicio).toBe(0);
        expect(fusionado.tamanio).toBe(400);
        expect(fusionado.libre).toBe(true);
    });

    // Solo se fusionan bloques libres (la coalescencia no mueve procesos)
    test('No debe fusionar si alguno está ocupado', () => {
        const libre = new BloqueMemoria(0, 100);
        const ocupado = new BloqueMemoria(100, 100, 1);

        expect(() => libre.fusionarCon(ocupado)).toThrow(OperacionMemoriaInvalidaError);
        expect(() => ocupado.fusionarCon(libre)).toThrow(OperacionMemoriaInvalidaError);
    });

    // Solo se fusionan bloques pegados: si hay algo en el medio, no
    test('No debe fusionar bloques que no son contiguos', () => {
        const primero = new BloqueMemoria(0, 100);
        const lejano = new BloqueMemoria(200, 100);

        expect(() => primero.fusionarCon(lejano)).toThrow(OperacionMemoriaInvalidaError);
    });
});
