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
        }, function (response: any) {
            ResponseHandler.handleResponseAndOpenInBrowser(response)
            resolve();
        });
}
