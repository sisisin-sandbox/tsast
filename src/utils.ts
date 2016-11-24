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

export async function removeNamespace(file: ts.SourceFile) {
  let updated: ts.SourceFile;
  const declarationMap = await getDeclarationMap();
  const typeRefs = getTypeRefs(file, declarationMap);
  const importStatement = createImport(file.fileName, typeRefs);

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

function getTypeRefs(n: ts.Node, declarationMap: Map<string, string>) {
  const typeRefMap = new Map<string, Set<string>>();

  ts.forEachChild(n, visit);
  return typeRefMap;
  function visit(node: ts.Node) {
    switch (node.kind) {
      case ts.SyntaxKind.TypeReference:
        const typeName = (<ts.TypeReferenceNode>node).typeName.getText();
        const fileName = declarationMap.get(typeName);
        const typeRefSet = typeRefMap.get(fileName);

        if (typeRefSet) {
          typeRefSet.add(typeName)
          typeRefMap.set(fileName, typeRefSet)
        } else {
          typeRefMap.set(fileName, new Set().add(typeName));
        }
        break;

      default:
        // console.log(node.kind, node.getText());

        break;
    }
    ts.forEachChild(node, visit);
  }
}

function createImport(srcFilePath: string, map: Map<string, Set<string>>) {
  return Array.from(map.entries())
    .map(([fileName, typeSet]) => {
      const relativePath = path.relative(path.dirname(srcFilePath), fileName);
      const typeList = Array.from(typeSet).join(', ');
      return `import { ${typeList} } from './${relativePath}';`;
    }).join('\n');
}

export async function updateAll(cb: (file: ts.SourceFile) => Promise<ts.SourceFile>) {
  console.log('===================================================================')
  const files = await getTargetDirList();
  files.forEach(updaterFactory(cb));
}

export function updaterFactory(cb: (file: ts.SourceFile) => Promise<ts.SourceFile>) {
  return async (filePath: string) => {
    const src = await readFileAsync(filePath);
    const fileName = path.basename(filePath);
    const file = ts.createSourceFile(filePath, src.toString(), ts.ScriptTarget.ES5, true);
    const updated = await cb(file);
    const distPath = path.resolve(path.dirname(filePath).replace(srcDir, distDir), fileName);

    writeFileAsync(distPath, updated.getFullText());
  };
}

/**
 * ソース全部洗ってクラス定義を全部納めたMapを返す
 * todo string Enumっぽく使ってるnamespaceの対処(ReportPeriod.tsなど)
 */
export const getDeclarationMap = async () => {
  const files = await getTargetDirList();
  const program = ts.createProgram(files, require('../sample/tsconfig.json'))
  const checker = program.getTypeChecker();
  const classMap = new Map<string, string>();

  for (const sourceFile of program.getSourceFiles()) {
    if (sourceFile.fileName.substr(-5) === '.d.ts') continue;
    createMap(sourceFile);
  }

  return classMap;
  function createMap(sourceFile: ts.SourceFile) {
    const fileName = sourceFile.fileName;
    ts.forEachChild(sourceFile, visit);
    function visit(node: ts.Node) {
      switch (node.kind) {
        case ts.SyntaxKind.ClassDeclaration:
        case ts.SyntaxKind.InterfaceDeclaration:
        case ts.SyntaxKind.FunctionDeclaration:
        case ts.SyntaxKind.VariableDeclaration:
        case ts.SyntaxKind.ModuleDeclaration:

          const identifier = (<ts.ClassDeclaration>node).name;
          classMap.set(identifier.text, fileName);
          break;
      }
      ts.forEachChild(node, visit);
    }
  }
};
