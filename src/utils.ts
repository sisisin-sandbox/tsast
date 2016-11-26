import * as fs from 'fs';
import * as path from 'path';

import * as mkdirp from 'mkdirp';
import * as recursiveReaddir from 'recursive-readdir';
import * as ts from 'typescript';
import {importBuilder} from './import-builder';

export const constant = {
  tsconfigPath: '../sample/tsconfig.json',
  typeMapDistPath: './dist/type-map.json',
  tsProjectDir: 'sample',
  srcDir: 'sample',
  collectDir: 'sample2',
  distDir: 'out'
};
const {srcDir, distDir, tsconfigPath, typeMapDistPath} = constant;

export function readFileAsync(fileName: string) { return new Promise<Buffer>(resolve => fs.readFile(fileName, (err, data) => resolve(data))); }
export function writeFileAsync(fileName: string, data: string) {
  const dir = path.dirname(fileName);
  return new Promise<Buffer>((resolve, reject) => {
    mkdirp(dir, (err, made) => {
      if (err) reject(err);
      fs.writeFile(fileName, data, (err) => err ? reject(err) : resolve());
    });
  });
}
export function getTargetDirList(target: string) { return new Promise<string[]>(resolve => recursiveReaddir(target, ['*.json'], (err: any, files: string[]) => resolve(files))); }

function changeText(
  sourceFile: ts.SourceFile,
  updateText: string,
  node: ts.Node
): ts.SourceFile {
  var start = node.getFullStart();  // ASTのノードの開始地点
  var end = node.getEnd();  // ASTのノードの終了地点
  var oldText = sourceFile.text;  // 元のソースコード
  var pre = oldText.substring(0, start);  // 書き換える領域の前のコード
  var post = oldText.substring(end);  // 書き換える領域の後のコード
  var newText = pre + updateText + post;  // 書き換え後のコード全体

  var textChangeRange: ts.TextChangeRange = {
    span: {
      start: start,
      length: (end - start)
    },
    newLength: (updateText.length)
  }

  return sourceFile.update(newText, textChangeRange);
}

export async function removeNamespace(file: ts.SourceFile) {
  let updated: ts.SourceFile;
  const importStatement = importBuilder(file);
  ts.forEachChild(file, node => {
    switch (node.kind) {
      case ts.SyntaxKind.ModuleDeclaration:
        const b = node.getChildAt(2, file).getFullText(file);
        updated = changeText(file, importStatement + '\n' + b.replace(/\s*{([\s\S]*)}/m, '$1'), node);
        break;
      default:
        break;
    }
  });
  return updated;
}


export async function updateAll(cb: (file: ts.SourceFile) => Promise<ts.SourceFile>) {
  console.log('===================================================================')
  const files = await getTargetDirList(srcDir);
  files.forEach(updaterFactory(cb));
}

export function updaterFactory(cb: (file: ts.SourceFile) => Promise<ts.SourceFile>) {
  return async (filePath: string) => {
    try {
      const src = await readFileAsync(filePath);
      const fileName = path.basename(filePath);
      const file = ts.createSourceFile(filePath, src.toString(), ts.ScriptTarget.ES5, true);
      const updated = await cb(file);
      const distPath = path.resolve(path.dirname(filePath).replace(srcDir, distDir), fileName);
      writeFileAsync(distPath, updated.getFullText());

    } catch (error) {
      console.log(error)
    }
  };
}
