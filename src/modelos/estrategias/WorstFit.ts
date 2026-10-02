import { EstrategiaAsignacionBase } from './EstrategiaAsignacionBase';
import { BloqueMemoria } from '../BloqueMemoria';

// Peor ajuste: el bloque suficiente de MAYOR tamaño (deja el hueco más grande)
export class WorstFit extends EstrategiaAsignacionBase {
    public override readonly nombre = 'Worst-Fit';

    protected override esMejor(candidato: BloqueMemoria, elegido: BloqueMemoria): boolean {
        return candidato.tamanio > elegido.tamanio;
    }
}
