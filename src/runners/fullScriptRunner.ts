import * as vscode from 'vscode';
import * as codeUtils from '../utils/codeUtils';
import axios, { AxiosRequestConfig } from 'axios';
import { AxiosUtils } from '../utils/axiosUtils';
import * as logger from '../logger';
import { ResponseHandler } from '../responseHandler';
import { Agent } from 'https';

export const runFullScript = vscode.commands.registerCommand('extension.mateo.runFullScript', async () => {
    logger.showOutput()

    let textEditor = vscode.window.activeTextEditor;
    if (!textEditor) {
        return "";
    }

    let config = vscode.workspace.getConfiguration('mateo')
    let fileName = codeUtils.getFileName();
    //vscode.window.showInformationMessage("Running '" + fileName + "' on: " + config.mateoHostUrl)
    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "Running '" + fileName + "' on: " + config.mateoHostUrl,
        cancellable: false
    }, (progress, token) => {
        return new Promise(resolve => {
            runScript(resolve, fileName, config.mateoHostUrl);

        })
    }
    );
});

async function runScript(resolve: any, fileName: string, host: string) {

    let queryParams: AxiosRequestConfig = {
        auth: await AxiosUtils.getAxiosAuth(),
        httpsAgent: new Agent({
            rejectUnauthorized: vscode.workspace.getConfiguration('mateo').rejectUnauthorized
        })
    }

    let filenameEncoded = encodeURIComponent(fileName);
    logger.info("filenameEncoded: " + filenameEncoded)
    axios.post(host + '/run/filename/json?filename=' + filenameEncoded, {}, queryParams)
        .then(function (response: any) {
            ResponseHandler.handleResponseAndOpenInBrowser(response)
            resolve();
        }).catch(function (error: any) {
            if (error.response && error.response.data) {
                logger.info(error.response.data);
                if (error.response.data.xmlFilepath) {
                    const reportFilename: string = error.response.data.xmlFilepath.slice(0, error.response.data.xmlFilepath.length - 3) + "html"
                    logger.info("Opening report: " + reportFilename)
                    vscode.env.openExternal(vscode.Uri.file(reportFilename));
                    vscode.window.showErrorMessage("Result: " + error.response.data.testSetResults.default.longDescription)
                } else {
                    // parsing error
                    vscode.window.showErrorMessage("Execution failed: " + error.response.data)
                }
            } else {
                vscode.window.showErrorMessage("Failed to connect to mateo. mateo not running?")
            }
            resolve();
        });
}
