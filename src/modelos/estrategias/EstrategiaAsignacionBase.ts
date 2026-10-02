import { IEstrategiaAsignacion } from '../../interfaces/IEstrategiaAsignacion';
import { BloqueMemoria } from '../BloqueMemoria';
import { validarEnteroPositivo } from '../../utilidades/validarEnteroPositivo';

// Clase abstracta: reúne lo que las tres políticas hacen igual y deja
// abstracto solo lo que cambia (el criterio para preferir un bloque).
export abstract class EstrategiaAsignacionBase implements IEstrategiaAsignacion {
    public abstract readonly nombre: string;

    // 1) se queda con los bloques libres que alcanzan, ordenados por dirección
    // 2) recorre los candidatos y conserva el "mejor" según cada política
    public elegirBloque(bloques: readonly BloqueMemoria[], tamanio: number): BloqueMemoria | null {
        validarEnteroPositivo('memoria solicitada', tamanio);

        const candidatos = bloques
            .filter((bloque) => bloque.libre && bloque.tamanio >= tamanio)
            .sort((a, b) => a.inicio - b.inicio);

        if (candidatos.length === 0) {
            return null;
        }

        return candidatos.reduce((elegido, candidato) =>
            this.esMejor(candidato, elegido) ? candidato : elegido
        );
    }

    // Devuelve true solo si el candidato es ESTRICTAMENTE mejor que el elegido.
    // Como se recorre en orden de dirección, ante un empate queda el de menor dirección
    protected abstract esMejor(candidato: BloqueMemoria, elegido: BloqueMemoria): boolean;
}
