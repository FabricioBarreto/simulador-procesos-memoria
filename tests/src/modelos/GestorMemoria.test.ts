import { describe, test, expect } from 'vitest';
import { GestorMemoria } from '../../../src/modelos/GestorMemoria';
import { BloqueMemoria } from '../../../src/modelos/BloqueMemoria';
import { FirstFit } from '../../../src/modelos/estrategias/FirstFit';
import { BestFit } from '../../../src/modelos/estrategias/BestFit';
import { WorstFit } from '../../../src/modelos/estrategias/WorstFit';
import { DatoInvalidoError } from '../../../src/errores/DatoInvalidoError';
import { OperacionMemoriaInvalidaError } from '../../../src/errores/OperacionMemoriaInvalidaError';

// Ayuda: resumen legible del mapa de memoria, [inicio, tamaño, pid] por bloque
function mapa(gestor: GestorMemoria): (number | null)[][] {
    return gestor.bloques.map((b) => [b.inicio, b.tamanio, b.pid]);
}

// Ayuda: verifica el invariante de la memoria. Cada bloque empieza donde
// termina el anterior (sin huecos ni solapamientos) y en total suman la memoria
function verificarContinuidad(gestor: GestorMemoria): void {
    let direccionEsperada = 0;

    for (const bloque of gestor.bloques) {
        expect(bloque.inicio).toBe(direccionEsperada);
        direccionEsperada = bloque.fin;
    }

    expect(direccionEsperada).toBe(gestor.memoriaTotal);
}

describe('GestorMemoria - estado inicial (RF01)', () => {
    // RF01: al iniciar hay un único bloque libre que abarca toda la memoria
    test('Debe arrancar con un único bloque libre de toda la memoria', () => {
        const gestor = new GestorMemoria(1024, new FirstFit());

        expect(mapa(gestor)).toEqual([[0, 1024, null]]);
        expect(gestor.memoriaLibreTotal).toBe(1024);
        expect(gestor.memoriaOcupada).toBe(0);
        expect(gestor.mayorBloqueLibre).toBe(1024);
        expect(gestor.politica).toBe('First-Fit');
    });

    // RF01: la memoria total debe ser un entero positivo
    test.each([0, -1, 10.5])('Debe rechazar una memoria total inválida (%d)', (total) => {
        expect(() => new GestorMemoria(total, new FirstFit())).toThrow(DatoInvalidoError);
    });
});

describe('GestorMemoria - asignar (RF04)', () => {
    // Caso mínimo "Asignación y espera": partición parcial
    test('Partición parcial: divide el bloque y deja el resto libre', () => {
        const gestor = new GestorMemoria(1024, new FirstFit());

        expect(gestor.asignar(1, 300)).toBe(true);

        expect(mapa(gestor)).toEqual([[0, 300, 1], [300, 724, null]]);
        expect(gestor.tieneMemoria(1)).toBe(true);
        verificarContinuidad(gestor);
    });

    // Caso mínimo "Asignación y espera": ajuste exacto (y además memoria llena)
    test('Ajuste exacto: no genera bloques de tamaño cero', () => {
        const gestor = new GestorMemoria(1024, new FirstFit());

        gestor.asignar(1, 1024);

        expect(mapa(gestor)).toEqual([[0, 1024, 1]]);
        expect(gestor.memoriaLibreTotal).toBe(0);
        expect(gestor.mayorBloqueLibre).toBe(0);
    });

    // Caso mínimo "Asignación y espera": fracaso sin modificación.
    // Es fragmentación externa: hay 200 KB libres, pero en dos huecos de 100
    test('Si ningún hueco alcanza falla sin modificar los bloques, aunque la suma libre alcance', () => {
        const gestor = new GestorMemoria(1000, new FirstFit());
        gestor.asignar(1, 100);
        gestor.asignar(2, 300);
        gestor.asignar(3, 100);
        gestor.asignar(4, 500);
        gestor.liberar(1);
        gestor.liberar(3);
        const antes = mapa(gestor);

        // libres: 100 + 100 = 200, pero ningún hueco tiene 150
        expect(gestor.asignar(5, 150)).toBe(false);

        expect(mapa(gestor)).toEqual(antes);
        expect(gestor.tieneMemoria(5)).toBe(false);
    });

    // Un proceso tiene como máximo un bloque asignado
    test('No debe asignar dos veces memoria al mismo proceso', () => {
        const gestor = new GestorMemoria(1024, new FirstFit());
        gestor.asignar(1, 100);

        expect(() => gestor.asignar(1, 50)).toThrow(OperacionMemoriaInvalidaError);
    });

    // Doble encapsulamiento (RF10): el mapa que se devuelve es una copia
    test('No debe permitir modificar la lista de bloques desde afuera', () => {
        const gestor = new GestorMemoria(1024, new FirstFit());
        const copia = gestor.bloques as BloqueMemoria[];

        copia.pop();

        expect(gestor.bloques).toHaveLength(1);
    });
});

describe('GestorMemoria - la política se elige al construirlo (polimorfismo)', () => {
    // Ayuda: deja tres huecos libres, [0-200] de 200, [300-800] de 500 y [850-1024] de 174
    function gestorConTresHuecos(gestor: GestorMemoria): GestorMemoria {
        gestor.asignar(1, 200);
        gestor.asignar(2, 100);
        gestor.asignar(3, 500);
        gestor.asignar(4, 50);
        gestor.liberar(1);
        gestor.liberar(3);
        return gestor;
    }

    // Caso mínimo "Asignación y espera": selección según política.
    // Mismo pedido y mismo mapa: cambia solo la estrategia que recibe el gestor
    test.each([
        ['First-Fit', 0, new FirstFit()],
        ['Best-Fit', 850, new BestFit()],
        ['Worst-Fit', 300, new WorstFit()],
    ])('Con %s el proceso de 150 KB queda en la dirección %i', (_nombre, direccion, estrategia) => {
        const gestor = gestorConTresHuecos(new GestorMemoria(1024, estrategia));

        gestor.asignar(9, 150);

        const bloque = gestor.bloques.find((b) => b.pid === 9);
        expect(bloque?.inicio).toBe(direccion);
        verificarContinuidad(gestor);
    });
});

describe('GestorMemoria - liberar y coalescencia (RF05)', () => {
    // Ayuda: memoria de 1000 con cuatro procesos de 250, [P1][P2][P3][P4]
    function gestorLleno(): GestorMemoria {
        const gestor = new GestorMemoria(1000, new FirstFit());
        [1, 2, 3, 4].forEach((pid) => gestor.asignar(pid, 250));
        return gestor;
    }

    // Sin vecinos libres no hay nada para fusionar
    test('Liberar sin vecinos libres deja un hueco aislado', () => {
        const gestor = gestorLleno();

        gestor.liberar(2);

        expect(mapa(gestor)).toEqual([[0, 250, 1], [250, 250, null], [500, 250, 3], [750, 250, 4]]);
        expect(gestor.tieneMemoria(2)).toBe(false);
    });

    // Caso mínimo "Coalescencia": fusión con el vecino izquierdo
    test('Fusión con el vecino izquierdo', () => {
        const gestor = gestorLleno();
        gestor.liberar(1);

        gestor.liberar(2);

        expect(mapa(gestor)).toEqual([[0, 500, null], [500, 250, 3], [750, 250, 4]]);
    });

    // Caso mínimo "Coalescencia": fusión con el vecino derecho
    test('Fusión con el vecino derecho', () => {
        const gestor = gestorLleno();
        gestor.liberar(3);

        gestor.liberar(2);

        expect(mapa(gestor)).toEqual([[0, 250, 1], [250, 500, null], [750, 250, 4]]);
    });

    // Caso mínimo "Coalescencia": fusión con ambos vecinos a la vez
    test('Fusión con ambos vecinos', () => {
        const gestor = gestorLleno();
        gestor.liberar(1);
        gestor.liberar(3);

        gestor.liberar(2);

        expect(mapa(gestor)).toEqual([[0, 750, null], [750, 250, 4]]);
        verificarContinuidad(gestor);
    });

    // Caso mínimo "Coalescencia": al liberar todo vuelve a quedar un único bloque
    test('Al liberar todos los procesos queda un único bloque libre del tamaño total', () => {
        const gestor = gestorLleno();

        [3, 1, 4, 2].forEach((pid) => gestor.liberar(pid));

        expect(mapa(gestor)).toEqual([[0, 1000, null]]);
    });

    // RF05: coalescencia no es compactación, los procesos no se mueven de lugar
    test('La coalescencia no mueve los bloques ocupados (no es compactación)', () => {
        const gestor = gestorLleno();

        gestor.liberar(1);
        gestor.liberar(3);

        expect(gestor.bloques.find((b) => b.pid === 2)?.inicio).toBe(250);
        expect(gestor.bloques.find((b) => b.pid === 4)?.inicio).toBe(750);
    });

    // No se puede liberar memoria de un proceso que no la tiene
    test('No debe liberar un proceso sin memoria asignada', () => {
        const gestor = gestorLleno();

        expect(() => gestor.liberar(99)).toThrow(OperacionMemoriaInvalidaError);
    });
});

describe('GestorMemoria - valores para métricas', () => {
    // Caso mínimo "Métricas y límites": huecos no contiguos de 100 y 300 KB.
    // La fragmentación (25%) se calcula en el paso de Métricas con estos valores
    test('Huecos no contiguos de 100 y 300 KB: libre total 400 y mayor hueco 300', () => {
        const gestor = new GestorMemoria(1000, new FirstFit());
        gestor.asignar(1, 100);
        gestor.asignar(2, 200);
        gestor.asignar(3, 300);
        gestor.asignar(4, 400);
        gestor.liberar(1);
        gestor.liberar(3);

        expect(gestor.memoriaLibreTotal).toBe(400);
        expect(gestor.mayorBloqueLibre).toBe(300);
        expect(gestor.memoriaOcupada).toBe(600);
    });
});
