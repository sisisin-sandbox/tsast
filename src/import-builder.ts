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
        const typeName = (<ts.TypeReferenceNode>node).typeName.getText();
        const fileName = declarationMap[typeName];
        if (!fileName) break;
        if (targetFileName === fileName) break;

        const typeRefSet = typeRefMap.get(fileName);

        if (typeRefSet) {
          typeRefSet.add(typeName)
          typeRefMap.set(fileName, typeRefSet)
        } else {
          typeRefMap.set(fileName, new Set().add(typeName));
        }
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
