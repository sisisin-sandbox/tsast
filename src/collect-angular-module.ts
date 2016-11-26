import * as fs from 'fs';
import * as path from 'path';

import {constant, getTargetDirList, writeFileAsync, readFileAsync} from './utils';
import {buildTypeRefsFromModule} from './import-builder';
const {collectDir, distDir} = constant;
const appModule = path.resolve(distDir, 'appModule.ts');

const reg = /^.*(angular\.module.*$)/g;
(async () => {
  let moduleStatement: string[] = [];
  const files = await getTargetDirList(collectDir);
  for (const file of files) {
    const lines = (await readFileAsync(file)).toString().split('\n');
    if (lines.filter(line => reg.test(line)).length === 0) continue;

    moduleStatement.push(lines.find(line => reg.test(line)));
    await writeFileAsync(file, lines.filter(line => !reg.test(line)).join('\n'));
  }
  await writeFileAsync(appModule, moduleStatement.join('\n'));
  const importStatement = await buildTypeRefsFromModule(appModule);
  await writeFileAsync(appModule, `${importStatement}

${moduleStatement.join('\n')}`)
})().catch(e => console.log(e));
