import * as vscode from 'vscode';
import * as logger from '../logger';
import { AxiosUtils } from '../utils/axiosUtils';
import axios, { AxiosBasicCredentials } from 'axios';
import {Agent} from 'https';
import { AxiosRequestConfig } from 'axios';
   
export const abort = vscode.commands.registerCommand('extension.mateo.abort', async () => {
    abortScripts();
}); 

const abortScripts = async function() {
    logger.showOutput()

    let textEditor = vscode.window.activeTextEditor;
    if (!textEditor) {
        return "";
    }

    // send abort request
    logger.info("Send abort request")

    vscode.window.showInformationMessage("Abort script runs");
    let config = vscode.workspace.getConfiguration('mateo')
    let queryParams : AxiosRequestConfig = {
        auth: await AxiosUtils.getAxiosAuth(),
        httpsAgent: new Agent({
            rejectUnauthorized: vscode.workspace.getConfiguration('mateo').rejectUnauthorized
        })
    }
    axios.get(config.mateoHostUrl + '/api/abort/all-runs', queryParams)
        .then(function (response: any) { 
            // handle success
            logger.info("StatusCode: " + response.status)            
            vscode.window.showInformationMessage("Scripts aborted");
        })
        .catch(function (error: any) {
            // handle error
            if (error.response === undefined) {
                AxiosUtils.password = undefined
                vscode.window.showErrorMessage("Was not able to abort! mateo not running?")
            } else {
                vscode.window.showWarningMessage("Failed to abort scripts")
            }
        });
};
