import { getTargetDirList, constant, readFileAsync, writeFileAsync } from './utils';

const rmExtensionReg = /.ts';$/;
const rmVerbosePath = /^(import.*from ')\.\/\.(.*)$/;

(async () => {
  const files = await getTargetDirList(constant.srcDir);
  for (const file of files) {
    const lines = (await readFileAsync(file)).toString().split('\n');
    const replaced = lines.map(line => {
      const rmExt = line.replace(rmExtensionReg, '\';');
      return rmExt.replace(rmVerbosePath, '$1.$2');
    });

    await writeFileAsync(file, replaced.join('\n'));
  }
})().catch(e => console.log(e));
