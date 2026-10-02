import { BloqueMemoria } from '../modelos/BloqueMemoria';

// Contrato común de las políticas de asignación contigua (RF04).
// El gestor de memoria depende de esta interfaz y no de una política concreta:
// así se puede cambiar First-Fit por Best-Fit o Worst-Fit sin tocar el gestor.
export interface IEstrategiaAsignacion {
    readonly nombre: string;

    // Devuelve el bloque libre elegido o null si ninguno alcanza
    elegirBloque(bloques: readonly BloqueMemoria[], tamanio: number): BloqueMemoria | null;
}
