import * as ts from 'typescript';
import {getTargetDirList, writeFileAsync, constant} from './utils';
const {typeMapDistPath, tsconfigPath, tsProjectDir} = constant;
const tsconfig = require(tsconfigPath);

/**
 * ソース全部洗ってクラス定義を全部納めたMapを返す
 * todo string Enumっぽく使ってるnamespaceの対処(ReportPeriod.tsなど)
 */
const getDeclarationMap = async () => {
  const files = await getTargetDirList(tsProjectDir);
  const program = ts.createProgram(files, tsconfig);
  const checker = program.getTypeChecker();
  let classMap: { [key: string]: string } = {};

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
          if (!hasExport(node)) break;

          const identifier = (<ts.ClassDeclaration>node).name;
          classMap[identifier.text] = fileName;
          break;

        case ts.SyntaxKind.VariableStatement:
          (<ts.VariableStatement>node).declarationList.declarations
            .forEach((vd, i) => {
              const identifier = <ts.Identifier>(<ts.VariableDeclaration>vd).name;
              classMap[identifier.text] = fileName;
            });

          break;
      }
      ts.forEachChild(node, visit);
    }
  }
};

function hasExport(n: ts.Node) {
  if (!n.modifiers) return false;
  return n.modifiers.filter(m => m.kind === ts.SyntaxKind.ExportKeyword).length > 0;
}

export async function createTypeMap() {
  const declarationMap = await getDeclarationMap();
  writeFileAsync(typeMapDistPath, JSON.stringify(declarationMap, null, ' '));
}

createTypeMap();