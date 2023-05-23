import * as vscode from 'vscode'

export class ExtensionDataHolder {

    private static instance : ExtensionDataHolder

    private constructor() {}

    public static getInstance(): ExtensionDataHolder {
        if (!ExtensionDataHolder.instance) {
            ExtensionDataHolder.instance = new ExtensionDataHolder();
        }
        return ExtensionDataHolder.instance;
    }

    diagnosticCollection : vscode.DiagnosticCollection = vscode.languages.createDiagnosticCollection('mateo');
}