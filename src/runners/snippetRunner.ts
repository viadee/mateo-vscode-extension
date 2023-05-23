import * as vscode from 'vscode';
import * as codeUtils from '../utils/codeUtils';
import * as logger from '../logger';
import { ExtensionDataHolder } from '../extensionDataHolder';
import { AxiosUtils } from '../utils/axiosUtils';
import axios, { AxiosBasicCredentials } from 'axios';
import { ResponseHandler } from '../responseHandler'
import { Agent } from 'https';
import { TextDocument } from 'vscode';

const dataHolder = ExtensionDataHolder.getInstance();

export const runSnippet = vscode.commands.registerCommand('extension.mateo.runSnippet', async () => {
    logger.showOutput()

    let code = codeUtils.getSelectedCode();
    if (code === '') {
        return;
    }

    let textEditor = vscode.window.activeTextEditor;
    if (!textEditor) {
        return "";
    }

    code = await generateSnippet(textEditor, codeUtils.getFileName, code);


    // send validation request
    logger.info("Running: " + code)
    dataHolder.diagnosticCollection.clear();

    vscode.window.showInformationMessage("Running snippet...");
    let config = vscode.workspace.getConfiguration('mateo')

    axios.post(config.mateoHostUrl + '/dsl/execute', code,
        {
            auth: await AxiosUtils.getAxiosAuth(),
            httpsAgent: new Agent({
                rejectUnauthorized: vscode.workspace.getConfiguration('mateo').rejectUnauthorized
            }),
            timeout: 10000,
            headers: {
                'Content-Type': 'text/plain'
            }
        })
        .then(function (response: any) {
            // handle success
            logger.info("StatusCode: " + response.status)
            ResponseHandler.handleResponseAndOpenInBrowser(response);
        })
        .catch(function (error: any) {
            // handle error
            let status = error.response.status;
            if (status == 409 || status == 412 || status == 400) {
                ResponseHandler.handleResponseAndOpenInBrowser(error.response);
            } else {
                ResponseHandler.handleValidationErrors(error.response.data, codeUtils.getFileName())
            }
        });
});


async function generateSnippet(textEditor: vscode.TextEditor, getFileName: () => string, code: string) {
    let workspacePath = retrieveWorkspacePath(textEditor.document.uri.fsPath);

    let fileNameUnixStyle: string = getFileName().replace(/\\/g, '/');
    let fileFromSub: string = fileNameUnixStyle.replace(workspacePath + '/', '');

    code = ">>>RESOURCE " + fileFromSub + "\n" + code;

    code = trimQuotationMarksInUseLines(code)
    let useLines: string[] = getUseLines(code);

    code = await generateUseResources(useLines, code, workspacePath);
    return code;
}

export function retrieveWorkspacePath(workspaceFolder: string) {
    let workspacePath = (workspaceFolder).replace(/\\/g, '/');
    return workspacePath.substring(0, workspacePath.lastIndexOf('/'));
}

export async function generateUseResources(useLines: string[], code: string, workspacePath: string) {
    for (let line in useLines) {
        let match = useLines[line].match(/\t*use\s+([^*&%\s]+).*/);
        if (match) {
            let filename = match[1];
            filename = codeUtils.trimQuotationMarks(filename);
            code += ">>>NEW_FILE\n";
            code += ">>>RESOURCE " + filename + "\n";
            let document = await vscode.workspace.openTextDocument(vscode.Uri.file(workspacePath + "/" + filename));
            let text = document.getText();
            logger.info("Use code: " + text);

            text = trimQuotationMarksInUseLines(text)
            let innerUseLines: string[] = getUseLines(text);

            code += text.concat("\n");

            code = await generateUseResources(innerUseLines, code, workspacePath);
        }
    }
    return code;
}

export function getUseLines(text: string): string[] {
    text = trimQuotationMarksInUseLines(text)
    let codeLineArray: string[] = text.split('\n');
    // gather .mrepo files content
    return codeLineArray.filter(function (row) {
        return /^\s*use\s+([^*&%\s]+).*/.test(row);
    });
}
  
export function trimQuotationMarksInUseLines(text: string): string {
    const lines = text.split(/\r?\n/);
    const outputLines = lines.map(line => {
        return line.replace(/^use "([^"]+)"(?: as ([^ ]+))?$/, (match, p1, p2) => {
            if (p2) {
              return `use ${p1} as ${p2}`;
            } else {
              return `use ${p1}`;
            }
          });
    });
    let outputText = outputLines.join('\n');
    return outputText;


    
}