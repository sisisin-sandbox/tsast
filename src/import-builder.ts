import * as path from 'path';
import * as ts from 'typescript';

export function importBuilder(file: ts.SourceFile) {
  const declarationMap = require('../out/type-map.json');
  const typeRefs = getTypeRefs(file, declarationMap);
  return createImport(file.fileName, typeRefs);
}

function getTypeRefs(n: ts.SourceFile, declarationMap: { [key: string]: string }) {
  const typeRefMap = new Map<string, Set<string>>();
  const targetFileName = n.fileName;

  ts.forEachChild(n, visit);
  return typeRefMap;

  function visit(node: ts.Node) {
    switch (node.kind) {
      case ts.SyntaxKind.TypeReference:
        setTypeRefMap((<ts.TypeReferenceNode>node).typeName.getText());
        break;
      case ts.SyntaxKind.HeritageClause:
        setTypeRefMap(getIdentifierFromHeritageClause(node).getText());
        break;
    }
    ts.forEachChild(node, visit);
  }
  function setTypeRefMap(typeName: string) {
    const fileName = declarationMap[typeName];
    if (!fileName) return;
    if (targetFileName === fileName) return;

    const typeRefSet = typeRefMap.get(fileName);

    if (typeRefSet) {
      typeRefSet.add(typeName)
      typeRefMap.set(fileName, typeRefSet)
    } else {
      typeRefMap.set(fileName, new Set().add(typeName));
    }
  }
}

function getIdentifierFromHeritageClause(n: ts.Node) {
  let idt: ts.Identifier;
  ts.forEachChild(n, visit);
  return idt;
  function visit(node: ts.Node) {
    switch (node.kind) {
      case ts.SyntaxKind.Identifier:
        idt = <ts.Identifier>node;
        break;

      default:
        ts.forEachChild(node, visit);
        break;
    }
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
