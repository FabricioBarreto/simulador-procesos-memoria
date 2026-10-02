import { EstrategiaAsignacionBase } from './EstrategiaAsignacionBase';

// Primer ajuste: el primer bloque suficiente por dirección.
// Ningún candidato posterior es "mejor" que el primero que se encontró
export class FirstFit extends EstrategiaAsignacionBase {
    public override readonly nombre = 'First-Fit';

    protected override esMejor(): boolean {
        return false;
    }
}
