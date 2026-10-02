import { EstrategiaAsignacionBase } from './EstrategiaAsignacionBase';
import { BloqueMemoria } from '../BloqueMemoria';

// Mejor ajuste: el bloque suficiente de MENOR tamaño (deja el hueco más chico)
export class BestFit extends EstrategiaAsignacionBase {
    public override readonly nombre = 'Best-Fit';

    protected override esMejor(candidato: BloqueMemoria, elegido: BloqueMemoria): boolean {
        return candidato.tamanio < elegido.tamanio;
    }
}
