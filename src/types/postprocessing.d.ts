declare module 'postprocessing' {
  // Definiciones mínimas para que TS compile.
  // En runtime se usa la implementación real del paquete.

  export enum BlendFunction {
    NORMAL,
  }

  // Clase base de effects. No necesitamos una firma completa: basta con
  // que exista el símbolo para poder extenderla.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export class Effect {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(name: string, fragmentShader: string, options?: any)
  }
}


