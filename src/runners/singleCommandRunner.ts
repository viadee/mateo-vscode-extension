import * as vscode from 'vscode';
import * as codeUtils from '../utils/codeUtils';
import axios, { AxiosRequestConfig } from 'axios';
import * as logger from '../logger';
import { Agent } from 'https';
import { AxiosUtils } from '../utils/axiosUtils';


export const runSingleCommand = vscode.commands.registerCommand('extension.mateo.runSingleCommand', async () => {
    logger.showOutput()
    logger.info(vscode.window.activeTextEditor?.document.fileName || "");

    let code = codeUtils.getSelectedCode();
    if (code === '') {
        return;
    }

    let textEditor = vscode.window.activeTextEditor;
    if (!textEditor) {
        return "";
    }

    let baseDir: string | undefined = vscode.window.activeTextEditor?.document.fileName;

    let codeSplit = code.split(/(?:\r)?\n/);
    //vscode.window.showInformationMessage("Running '" + fileName + "' on: " + config.mateoHostUrl)

    await executeLineByLine(codeSplit, baseDir);

});

async function executeLineByLine(lines: Array<string> | undefined, baseDir: string | undefined) {
    if (lines === undefined || lines.length == 0) {
        return;
    }

    let codeLine = lines[0];

    let COMMAND_PATTERN: string = "^(\\s*)([a-z][a-zA-Z0-9\\s\\-_]*)\\((.*)\\)\\s*";
    let STEP_PATTERN: string = "^(\\s*)([A-Z][a-zA-Z0-9\\s\\-_]*)\\((.*)\\)\\s*";
    let REF_STEP_PATTERN: string = "^(\\s*)([a-zA-Z0-9\\s\\-_]*)\\.([A-Z][a-zA-Z0-9\\s\\-_]*)\\((.*)\\)\\s*";
    let PARAMETER_VALUES_PATTERN = /,(?=([^"]*"[^"]*")*[^"]*$)/;


    let commandName: string | undefined;
    let commandParameters: any = {};
    let codeLineMatch = codeLine.match(COMMAND_PATTERN);

    let config = vscode.workspace.getConfiguration('mateo')

    if (codeLineMatch) {
        commandName = codeLineMatch[2]

        let paramSplit = codeLineMatch[3].split(PARAMETER_VALUES_PATTERN);
        paramSplit.forEach(param => {
            let paramKey = param.substring(0, param.indexOf('=')).trim()
            let paramValue = param.substring(param.indexOf('=') + 1).trim().substring(1)
            paramValue = paramValue.substring(0, paramValue.length - 1)
            commandParameters[paramKey] = paramValue
        });

        let commandObject = {
            "localizedCommandName": commandName,
            "commandParameters": commandParameters
        }

        let queryParams: AxiosRequestConfig = {
            auth: await AxiosUtils.getAxiosAuth(),
            httpsAgent: new Agent({
                rejectUnauthorized: vscode.workspace.getConfiguration('mateo').rejectUnauthorized
            }),
        }

        logger.info("Executing: " + JSON.stringify(commandObject))
        
        let filenameEncoded = encodeURIComponent(baseDir + "");

        axios.post(config.mateoHostUrl + '/command?fileName=' + filenameEncoded, commandObject, queryParams)
            .then(function (response: any) {
                logger.info("Result: " + response.data)
                lines.shift();
                executeLineByLine(lines, vscode.window.activeTextEditor?.document.fileName || "");
            }).catch(function (error: any) {
                logger.info("Error during execution: " + error.response.data)
                vscode.window.showWarningMessage(error.response.data + " [ " + codeLine.trim() + " ]");
            }).then(undefined, err => {
                logger.info("Something went wrong: " + err)
            });
    } else {
        if (codeLine.match(STEP_PATTERN) || codeLine.match(REF_STEP_PATTERN)) {
            vscode.window.showErrorMessage("Steps cannot be executed via 'execute command(s)'. To execute steps, please use 'execute snippet'");
        } else {
            vscode.window.showErrorMessage("Command could not be executed. Please make sure that it is a valid mateo command");
        }
        logger.info("ERROR: Command could not be executed. Please note error message");
        lines.shift();
        executeLineByLine(lines, baseDir);
    }


}