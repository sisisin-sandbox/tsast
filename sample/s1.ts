namespace app {
  'use strict';

  export class S1 {
    constructor(s2: S2, sx: Sx) { }
  }
  export function hoge() { }
  export namespace s5 { }
  export interface S3 { };
  export namespace S3 {
    export const s7: S3 = '1';
    export const s8: S3 = '2';
  }

  class Sx { }
  export interface IS { }
  export class S9 { }
}
