import * as vscode from 'vscode';
import * as codeUtils from '../utils/codeUtils';
import * as logger from '../logger';
import { ExtensionDataHolder } from '../extensionDataHolder';
import { AxiosUtils } from '../utils/axiosUtils';
import {ResponseHandler} from '../responseHandler';
import axios, { AxiosBasicCredentials } from 'axios';
import { AxiosRequestConfig } from 'axios';
import {Agent} from 'https';

const dataHolder = ExtensionDataHolder.getInstance();


export const validate = vscode.commands.registerCommand('extension.mateo.validate', async () => {
    // determine mode from selection (snippet/complete file)
    validateScript();
});

let validateOnSave = vscode.commands.registerCommand('extension.mateo.validateOnSave', async() => {
    validateScript();
});    

const validateScript = async function() {
    logger.showOutput()

    let textEditor = vscode.window.activeTextEditor;
    if (!textEditor) {
        return "";
    }

    // send validation request
    logger.info("Validating: " + textEditor.document.fileName)
    dataHolder.diagnosticCollection.clear();

    vscode.window.showInformationMessage("Validating file " + textEditor.document.fileName);
    let config = vscode.workspace.getConfiguration('mateo')
    let queryParams : AxiosRequestConfig = {
        auth: await AxiosUtils.getAxiosAuth(),
        httpsAgent: new Agent({
            rejectUnauthorized: vscode.workspace.getConfiguration('mateo').rejectUnauthorized
        })
    }

    axios.post(config.mateoHostUrl + '/dsl/validateFile?filename=' + encodeURIComponent(textEditor.document.fileName),{},queryParams)
        .then(function (response: any) { 
            // handle success
            logger.info("StatusCode: " + response.status)
            const errorData = response.data;
            if(errorData && Object.keys(errorData).length > 0) {
                ResponseHandler.handleValidationErrors(errorData,codeUtils.getFileName());
            } else {
                vscode.window.showInformationMessage("No validation errors.");
            }
        })
        .catch(function (error: any) {
            // handle error
            let filename = vscode.Uri.file(codeUtils.getFileName()).toString();
            let diagnostics = []
            let range = new vscode.Range(0, 0, 0, 100);
            if (error.response === undefined) {
                AxiosUtils.password = undefined
                vscode.window.showErrorMessage("Was not able to validate! mateo not running?")
            } else {
                vscode.window.showWarningMessage("Had validation errors")
                diagnostics.push(new vscode.Diagnostic(range, error.response.data, vscode.DiagnosticSeverity.Error))
                dataHolder.diagnosticCollection.set(vscode.Uri.parse(filename), diagnostics);
            }
        });
};
