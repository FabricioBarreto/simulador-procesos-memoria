import { BloqueMemoria } from '../modelos/BloqueMemoria';

// Contrato del administrador de memoria contigua (RF04, RF05).
// El simulador va a depender de esta interfaz, no de la clase concreta.
export interface IGestorMemoria {
    readonly memoriaTotal: number;
    readonly politica: string;
    readonly bloques: readonly BloqueMemoria[];
    readonly memoriaOcupada: number;
    readonly memoriaLibreTotal: number;
    readonly mayorBloqueLibre: number;

    asignar(pid: number, tamanio: number): boolean;
    liberar(pid: number): void;
    tieneMemoria(pid: number): boolean;
}
