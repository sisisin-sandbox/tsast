/// <reference path="../typings/tsd.d.ts" />
'use strict';

import {updateAll, removeNamespace, updaterFactory} from './utils';
import {createTypeMap} from './create-type-map';
(async () => {
  await updateAll(removeNamespace);
})().catch(e => console.log(e));
// updaterFactory(removeNamespace)('./sample/s1.ts');
