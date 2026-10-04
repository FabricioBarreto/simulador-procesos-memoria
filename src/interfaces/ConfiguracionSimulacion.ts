import { IEstrategiaAsignacion } from './IEstrategiaAsignacion';

// Parámetros configurables de la simulación (RF01).
// Todos son opcionales: por defecto 1024 KB, quantum 2 y First-Fit
export interface ConfiguracionSimulacion {
    readonly memoriaTotal?: number;
    readonly quantum?: number;
    readonly estrategia?: IEstrategiaAsignacion;
}
