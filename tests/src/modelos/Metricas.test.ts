import { describe, test, expect } from 'vitest';
import { Metricas } from '../../../src/modelos/Metricas';
import { GestorMemoria } from '../../../src/modelos/GestorMemoria';
import { FirstFit } from '../../../src/modelos/estrategias/FirstFit';
import { DatoInvalidoError } from '../../../src/errores/DatoInvalidoError';

// Ayuda: memoria de 1000 KB con huecos NO contiguos de 100 y 300 KB
// [libre 100][P2 200][libre 300][P4 400]
function memoriaConHuecos100y300(): GestorMemoria {
    const gestor = new GestorMemoria(1000, new FirstFit());
    gestor.asignar(1, 100);
    gestor.asignar(2, 200);
    gestor.asignar(3, 300);
    gestor.asignar(4, 400);
    gestor.liberar(1);
    gestor.liberar(3);
    return gestor;
}

describe('Metricas - casos mínimos de la consigna (RF09)', () => {
    // Caso mínimo "Métricas y límites": tick 0. Memoria vacía y CPU sin uso:
    // la utilización de CPU es 0% por definición y no hay fragmentación
    test('En el tick 0 todo está en cero', () => {
        const metricas = new Metricas(new GestorMemoria(1024, new FirstFit()), 0, 0, 0);

        expect(metricas.ocupacionMemoria).toBe(0);
        expect(metricas.utilizacionCpu).toBe(0);
        expect(metricas.cambiosContexto).toBe(0);
        expect(metricas.memoriaLibreTotal).toBe(1024);
        expect(metricas.mayorBloqueLibre).toBe(1024);
        expect(metricas.fragmentacionExterna).toBe(0);
    });

    // Caso mínimo "Métricas y límites": huecos de 100 y 300 KB.
    // Libre total 400, mayor hueco 300 → fragmentación = 100 × (1 − 300/400) = 25%
    test('Huecos de 100 y 300 KB: libre 400, mayor 300 y fragmentación 25%', () => {
        const metricas = new Metricas(memoriaConHuecos100y300(), 10, 10, 0);

        expect(metricas.memoriaLibreTotal).toBe(400);
        expect(metricas.mayorBloqueLibre).toBe(300);
        expect(metricas.fragmentacionExterna).toBe(25);
        expect(metricas.ocupacionMemoria).toBe(60);
    });

    // Caso mínimo "Métricas y límites": memoria llena. Sin memoria libre la
    // fragmentación es 0% (se evita dividir por cero) y la ocupación es 100%
    test('Memoria llena: ocupación 100%, sin memoria libre y fragmentación 0%', () => {
        const gestor = new GestorMemoria(1024, new FirstFit());
        gestor.asignar(1, 1024);

        const metricas = new Metricas(gestor, 1, 1, 0);

        expect(metricas.ocupacionMemoria).toBe(100);
        expect(metricas.memoriaLibreTotal).toBe(0);
        expect(metricas.mayorBloqueLibre).toBe(0);
        expect(metricas.fragmentacionExterna).toBe(0);
    });
});

describe('Metricas - utilización de CPU y cambios de contexto', () => {
    // Utilización = 100 × ticks con CPU ocupada / ticks transcurridos
    test('3 ticks ocupados de 4 transcurridos dan 75% de utilización', () => {
        const metricas = new Metricas(new GestorMemoria(1024, new FirstFit()), 4, 3, 2);

        expect(metricas.utilizacionCpu).toBe(75);
        expect(metricas.cambiosContexto).toBe(2);
    });

    // Los porcentajes no se redondean (la consigna mide "antes del redondeo")
    test('Los porcentajes se devuelven sin redondear', () => {
        const metricas = new Metricas(new GestorMemoria(1024, new FirstFit()), 3, 1, 0);

        expect(metricas.utilizacionCpu).toBeCloseTo(33.333, 3);
    });
});

describe('Metricas - es una foto inmutable', () => {
    // Las métricas de un tick no cambian si después la memoria cambia
    test('No cambian aunque la memoria se modifique después de calcularlas', () => {
        const gestor = new GestorMemoria(1024, new FirstFit());
        const metricas = new Metricas(gestor, 0, 0, 0);

        gestor.asignar(1, 512);

        expect(metricas.ocupacionMemoria).toBe(0);
        expect(metricas.memoriaLibreTotal).toBe(1024);
    });

    // Doble encapsulamiento: no se pueden pisar los valores desde afuera
    test('No permite modificar sus valores desde afuera', () => {
        const metricas = new Metricas(new GestorMemoria(1024, new FirstFit()), 0, 0, 0);

        expect(Reflect.set(metricas, 'utilizacionCpu', 100)).toBe(false);
        expect(metricas.utilizacionCpu).toBe(0);
    });
});

describe('Metricas - validaciones', () => {
    // Los contadores no pueden ser negativos ni decimales
    test.each([
        [-1, 0, 0],
        [0, -1, 0],
        [0, 0, -1],
        [1.5, 0, 0],
    ])('Debe rechazar contadores inválidos (ticks=%d, ocupados=%d, cambios=%d)', (ticks, ocupados, cambios) => {
        const gestor = new GestorMemoria(1024, new FirstFit());

        expect(() => new Metricas(gestor, ticks, ocupados, cambios)).toThrow(DatoInvalidoError);
    });

    // No puede haber más ticks con CPU ocupada que ticks transcurridos
    test('Debe rechazar más ticks ocupados que ticks transcurridos', () => {
        const gestor = new GestorMemoria(1024, new FirstFit());

        expect(() => new Metricas(gestor, 2, 3, 0)).toThrow(DatoInvalidoError);
    });
});
