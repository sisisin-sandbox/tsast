/// <reference path="../typings/tsd.d.ts" />

import * as ts from "typescript";
import * as fs from "fs";

interface DocEntry {
  name?: string,
  fileName?: string,
  documentation?: string,
  type?: string,
  constructors?: DocEntry[],
  parameters?: DocEntry[],
  returnType?: string
};

/** Generate documentation for all classes in a set of .ts files */
function generateDocumentation(fileNames: string[], options: ts.CompilerOptions): void {

  // Build a program using the set of root file names in fileNames
  let program = ts.createProgram(fileNames, options);
  // Get the checker, we will use it to find more about classes
  let checker = program.getTypeChecker();
  let output: DocEntry[] = [];

  // Visit every sourceFile in the program    
  for (const sourceFile of program.getSourceFiles()) {
    // Walk the tree to search for classes
    ts.forEachChild(sourceFile, visit);
  }

  // print out the doc
  fs.writeFileSync("dist/classes.json", JSON.stringify(output, undefined, 4));

  return;

  /** visit nodes finding exported classes */
  function visit(node: ts.Node) {
    // Only consider exported nodes
    // if (!isNodeExported(node)) {
    //   // return;
    // }
    console.log(node.getSourceFile().fileName);

    if (node.kind === ts.SyntaxKind.ClassDeclaration) {
      // This is a top level class, get its symbol

      let symbol = checker.getSymbolAtLocation((<ts.ClassDeclaration>node).name);
      console.log(symbol.valueDeclaration.getSourceFile().fileName); // file pathとれた

      output.push(serializeClass(symbol));
      // No need to walk any further, class expressions/inner declarations
      // cannot be exported
    }
    else if (node.kind === ts.SyntaxKind.ModuleDeclaration || node.kind === ts.SyntaxKind.ModuleBlock) {
      // This is a namespace, visit its children

      ts.forEachChild(node, visit);

    }
  }

  /** Serialize a symbol into a json object */
  function serializeSymbol(symbol: ts.Symbol): DocEntry {
    const t = checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration);

    return {
      name: symbol.getName(),
      documentation: ts.displayPartsToString(symbol.getDocumentationComment()),
      type: checker.typeToString(checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration))
    };
  }

  /** Serialize a class symbol infomration */
  function serializeClass(symbol: ts.Symbol) {
    let details = serializeSymbol(symbol);

    // Get the construct signatures
    let constructorType = checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration);
    details.constructors = constructorType.getConstructSignatures().map(serializeSignature);
    return details;
  }

  /** Serialize a signature (call or construct) */
  function serializeSignature(signature: ts.Signature) {
    return {
      parameters: signature.parameters.map(serializeSymbol),
      returnType: checker.typeToString(signature.getReturnType()),
      documentation: ts.displayPartsToString(signature.getDocumentationComment())
    };
  }

  /** True if this is visible outside this file, false otherwise */
  function isNodeExported(node: ts.Node): boolean {
    return (node.flags & ts.NodeFlags.Export) !== 0 || (node.parent && node.parent.kind === ts.SyntaxKind.SourceFile);
  }
}

generateDocumentation(process.argv.slice(2), require('../sample/tsconfig.json'));
