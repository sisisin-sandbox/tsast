/// <reference path="../typings/tsd.d.ts" />
'use strict';

import {getDeclarationMap, updateAll, removeNamespace, updaterFactory} from './utils';
(async () => {
  // const m = await getDeclarationMap();
  // console.log(m.entries());
})().catch(e => console.log(e));

updateAll(removeNamespace);
// updaterFactory(removeNamespace)('./sample/s1.ts');
