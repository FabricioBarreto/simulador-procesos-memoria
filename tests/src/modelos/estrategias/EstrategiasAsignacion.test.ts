import { describe, test, expect } from 'vitest';
import { IEstrategiaAsignacion } from '../../../../src/interfaces/IEstrategiaAsignacion';
import { EstrategiaAsignacionBase } from '../../../../src/modelos/estrategias/EstrategiaAsignacionBase';
import { FirstFit } from '../../../../src/modelos/estrategias/FirstFit';
import { BestFit } from '../../../../src/modelos/estrategias/BestFit';
import { WorstFit } from '../../../../src/modelos/estrategias/WorstFit';
import { BloqueMemoria } from '../../../../src/modelos/BloqueMemoria';
import { DatoInvalidoError } from '../../../../src/errores/DatoInvalidoError';

// Mapa de memoria de ejemplo con tres huecos de distinto tamaño:
// [0-200 libre 200] [200-300 P1] [300-800 libre 500] [800-850 P2] [850-1024 libre 174]
function mapaConTresHuecos(): BloqueMemoria[] {
    return [
        new BloqueMemoria(0, 200),
        new BloqueMemoria(200, 100, 1),
        new BloqueMemoria(300, 500),
        new BloqueMemoria(800, 50, 2),
        new BloqueMemoria(850, 174),
    ];
}

// POLIMORFISMO: las tres políticas se usan a través del mismo contrato.
// Los tests no preguntan qué clase concreta es; solo llaman a elegirBloque()
const estrategias: IEstrategiaAsignacion[] = [new FirstFit(), new BestFit(), new WorstFit()];

describe.each(estrategias)('Contrato común - $nombre', (estrategia) => {
    test('Debe ser una EstrategiaAsignacionBase', () => {
        expect(estrategia).toBeInstanceOf(EstrategiaAsignacionBase);
    });

    test('Debe devolver null si ningún bloque libre alcanza, aunque la suma libre sí alcance', () => {
        // libres: 200 + 500 + 174 = 874, pero ninguno tiene 600
        expect(estrategia.elegirBloque(mapaConTresHuecos(), 600)).toBeNull();
    });

    test('Debe ignorar los bloques ocupados', () => {
        const bloques = [new BloqueMemoria(0, 1000, 1), new BloqueMemoria(1000, 24)];

        expect(estrategia.elegirBloque(bloques, 20)?.inicio).toBe(1000);
    });

    test('Debe aceptar un bloque de tamaño exacto', () => {
        const bloques = [new BloqueMemoria(0, 100)];

        expect(estrategia.elegirBloque(bloques, 100)?.inicio).toBe(0);
    });

    test('Debe devolver null si no hay bloques', () => {
        expect(estrategia.elegirBloque([], 10)).toBeNull();
    });

    test('Debe rechazar una cantidad solicitada inválida', () => {
        expect(() => estrategia.elegirBloque(mapaConTresHuecos(), 0)).toThrow(DatoInvalidoError);
    });

    test('Ante empate de tamaño debe elegir la menor dirección', () => {
        const bloques = [new BloqueMemoria(0, 300), new BloqueMemoria(300, 100, 1), new BloqueMemoria(400, 300)];

        expect(estrategia.elegirBloque(bloques, 100)?.inicio).toBe(0);
    });
});

describe('Cada política elige un bloque distinto con el mismo pedido', () => {
    test('First-Fit elige el primer hueco suficiente por dirección (0, de 200 KB)', () => {
        expect(new FirstFit().elegirBloque(mapaConTresHuecos(), 150)?.inicio).toBe(0);
    });

    test('Best-Fit elige el hueco suficiente más chico (850, de 174 KB)', () => {
        expect(new BestFit().elegirBloque(mapaConTresHuecos(), 150)?.inicio).toBe(850);
    });

    test('Worst-Fit elige el hueco suficiente más grande (300, de 500 KB)', () => {
        expect(new WorstFit().elegirBloque(mapaConTresHuecos(), 150)?.inicio).toBe(300);
    });

    test('First-Fit respeta el orden por dirección aunque los bloques lleguen desordenados', () => {
        const desordenados = mapaConTresHuecos().reverse();

        expect(new FirstFit().elegirBloque(desordenados, 150)?.inicio).toBe(0);
    });

    test('Cada política expone su nombre', () => {
        expect(estrategias.map((e) => e.nombre)).toEqual(['First-Fit', 'Best-Fit', 'Worst-Fit']);
    });
});
