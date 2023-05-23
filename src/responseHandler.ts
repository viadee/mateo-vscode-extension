import * as logger from './logger';
import * as vscode from 'vscode';
import * as codeUtils from './utils/codeUtils'
import { ExtensionDataHolder } from './extensionDataHolder';

export class ResponseHandler {

    private static dataHolder: ExtensionDataHolder = ExtensionDataHolder.getInstance();

    public static async handleResponseAndOpenInBrowser(response: any) {
        if (vscode.workspace.getConfiguration('mateo').openWebReport) {
            let reportWebUrl = vscode.workspace.getConfiguration('mateo').mateoHostUrl + "/frontend/#/report"
            vscode.env.openExternal(vscode.Uri.parse(reportWebUrl));

        }
        else if (response.data.xmlFilepath) {
            const reportFilename: string = response.data.xmlFilepath.slice(0, response.data.xmlFilepath.length - 3) + "html"
            logger.info("Opening report: " + reportFilename)
            vscode.env.openExternal(vscode.Uri.file(reportFilename));
            vscode.window.showInformationMessage("Result: " + response.data.testSetResults.default.longDescription)
        }
        if (response.data?.parserErrors) {
            ResponseHandler.handleValidationErrors(response.data.parserErrors, codeUtils.getFileName());
        }
    }

    public static handleValidationErrors = function (errorData: any, scriptFileName: string) {
        logger.info("ErrorData: " + JSON.stringify(errorData));
        logger.info("ScriptFileName: " + scriptFileName);
        let diagnosticMap: Map<string, vscode.Diagnostic[]> = new Map();
        for (const [key, val] of Object.entries(errorData)) {
            let filename = key.substring(0, key.lastIndexOf(":"));
            let lineNumber = + key.substring(key.lastIndexOf(":") + 1);
            let errorText: string = val as string;
            let canonicalFile = vscode.Uri.file(filename).toString();
            let range = new vscode.Range(lineNumber - 1, 0, lineNumber - 1, 100);
            let diagnostics = diagnosticMap.get(canonicalFile);
            if (!diagnostics) { diagnostics = []; }
            diagnostics.push(new vscode.Diagnostic(range, errorText, vscode.DiagnosticSeverity.Error));
            diagnosticMap.set(canonicalFile, diagnostics);
        }
        diagnosticMap.forEach((diags, file) => {
            ResponseHandler.dataHolder.diagnosticCollection.set(vscode.Uri.parse(file), diags);
        });
        if (Object.keys(errorData).length > 0) {
            vscode.window.showWarningMessage("Found validation errors")
            vscode.commands.executeCommand("workbench.actions.view.problems")
        }
    }
}