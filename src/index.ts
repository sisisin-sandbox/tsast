/// <reference path="../typings/tsd.d.ts" />
'use strict';

import * as fs from 'fs';
import * as path from 'path';

import * as mkdirp from 'mkdirp';
import * as recursiveReaddir from 'recursive-readdir';
import * as ts from 'typescript';

const srcDir = 'sample';
const distDir = 'dist';

function readFileAsync(fileName: string) { return new Promise<Buffer>(resolve => fs.readFile(fileName, (err, data) => resolve(data))); }
function writeFileAsync(fileName: string, data: string) {
  const dir = path.dirname(fileName);
  mkdirp(dir, (err, made) => {
    return new Promise<Buffer>(resolve => fs.writeFile(fileName, data, (err) => resolve()));
  });
}
function getTargetDirList() { return new Promise<string[]>(resolve => recursiveReaddir(srcDir, ['*.json'], (err: any, files: string[]) => resolve(files))); }

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

function removeNamespace(file: ts.SourceFile): ts.SourceFile {
  let updated: ts.SourceFile;

  ts.forEachChild(file, node => {
    switch (node.kind) {
      case ts.SyntaxKind.ModuleDeclaration:
        const b = node.getChildAt(2, file).getFullText(file);
        updated = changeText(file, b.replace(/\s*{([\s\S]*)}/m, '$1'), node);
        break;
      default:
        break;
    }
  });
  return updated;
}


async function updateAll(cb: (file: ts.SourceFile) => ts.SourceFile) {
  console.log('===================================================================')
  const files = await getTargetDirList();
  files.forEach(updaterFactory(cb));
}

function updaterFactory(cb: (file: ts.SourceFile) => ts.SourceFile) {
  return async (filePath: string) => {
    const src = await readFileAsync(filePath);
    const fileName = path.basename(filePath);
    const file = ts.createSourceFile(fileName, src.toString(), ts.ScriptTarget.ES5, true);
    const updated = cb(file);
    const distPath = path.resolve(path.dirname(filePath).replace(srcDir, distDir), fileName);

    writeFileAsync(distPath, updated.getFullText());
  };
}

// updateAll(removeNamespace);

const update = updaterFactory(file => {
  let updated: ts.SourceFile;

  function recursive(node: ts.Node): boolean {
    // console.log(node.kind, node.getFullText());
    switch (node.kind) {
      case ts.SyntaxKind.TypeReference:
        console.log(node);
      case ts.SyntaxKind.ClassDeclaration:

      default:
        break;
    }
    return ts.forEachChild(node, recursive);
  }

  ts.forEachChild(file, recursive);
  return file;
});
update('./sample/d/s2.ts');
