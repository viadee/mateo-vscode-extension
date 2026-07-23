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
    code = deleteLastMultiLineBreak(code);

    if (code === '') {
        return;
    }

    let textEditor = vscode.window.activeTextEditor;
    if (!textEditor) {
        return "";
    }

    let baseDir: string | undefined = vscode.window.activeTextEditor?.document.fileName;

    let codeSplit = splitLines(code);
    //vscode.window.showInformationMessage("Running '" + fileName + "' on: " + config.mateoHostUrl)

    await executeLineByLine(codeSplit, baseDir);
});

function splitLines(code: string): string[] {
    let START_MULTILINE_PATTERN = new RegExp(/\s*=\s*\"{3}\s*$/);
    let multilineFound: boolean = false;
    let codeSplit = code.split(/(?:\r)?\n/);
    let result: string[] = [];
    let multiLineStartLevel: number = 0;
    codeSplit = removeBackslashLineBreaks(codeSplit);
    for (let i = 0; i < codeSplit.length; i++) {
        if (multilineFound) {
            if (isEndOfMultiLineString(multiLineStartLevel, codeSplit[i])) {
                result.push(deleteLastMultiLineBreak(result.pop()!));
                codeSplit[i] = codeSplit[i].trimStart().replaceAll(/"""/g, '"');
                multilineFound = false;
            } else if (isInterimEndOfMultiLineString(multiLineStartLevel, codeSplit[i])) {
                result.push(deleteLastMultiLineBreak(result.pop()!));
                codeSplit[i] = codeSplit[i].trim().replaceAll(/"""/g, '"');
            } else {
                codeSplit[i] = codeSplit[i] + "\n";
            }
            codeSplit[i] = result.pop() + codeSplit[i];
        }
        if (START_MULTILINE_PATTERN.test(codeSplit[i])) {
            multiLineStartLevel = getLevelFromLine(codeSplit[i]);
            codeSplit[i] = codeSplit[i].trimEnd().replaceAll(/"""/g, '"');
            multilineFound = true;
        }
        result.push(codeSplit[i]);
    }
    return result;
}

function deleteLastMultiLineBreak(line: string):string{
    let indexOfLastMultiLineBreak = line.lastIndexOf("\n");
    if (indexOfLastMultiLineBreak >= 0){
        return line.substring(0,indexOfLastMultiLineBreak);
    }else{
        return line;
    }
}

function removeBackslashLineBreaks(lines: string[]): string[] {
    let result: string[] = [];
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].endsWith("\\")) {
            lines[i] = lines[i].substring(0, lines[i].length - 1);
            lines[i + 1] = lines[i] + lines[i + 1];
        } else {
            result.push(lines[i]);
        }
    }
    return result;
}

function isEndOfMultiLineString(multiLineStartLevel: number, line: string): boolean {
    let END_COMMAND_MULTILINE_PATTERN = new RegExp(/\s*\"{3}.*\):?\s*$/);
    let LINE_BREAK_MULTILINE_PATTERN = new RegExp(/\s*\"{3}(.*)(\\\s*)$/);
    return multiLineStartLevel == getLevelFromLine(line) && (
        END_COMMAND_MULTILINE_PATTERN.test(line) || LINE_BREAK_MULTILINE_PATTERN.test(line))
}

function isInterimEndOfMultiLineString(multiLineStartLevel: number, line: string): boolean {
    let INTERIM_END_MULTILINE_PATTERN = RegExp(/\s*\"{3}.*/);
    return multiLineStartLevel == getLevelFromLine(line) && INTERIM_END_MULTILINE_PATTERN.test(line);
}

function getLevelFromLine(line: string): number {
    let TAB_WIDTH = 4;
    let level: number = 0;
    let leave: boolean = false;
    for (let i = 0; i < line.length; i++) {
        switch (line.charCodeAt(i)) {
            case 9:
                level = level + TAB_WIDTH;
                break;
            case 32:
            case 160:
            case 8192:
            case 8193:
            case 8194:
            case 8195:
            case 8196:
            case 8197:
            case 8198:
            case 8199:
            case 8120:
            case 8201:
            case 8239:
            case 8287:
            case 12288:
                level = level + 1;
                break;
            default:
                leave = true;
                break;
        }
        if (leave) {
            break;
        }
    }
    if (!leave) {
        level = 0;
    }
    return level / TAB_WIDTH + (level % TAB_WIDTH > 0 ? 1 : 0);
}

async function executeLineByLine(lines: Array<string> | undefined, baseDir: string | undefined) {
    if (lines === undefined || lines.length == 0) {
        return;
    }

    let codeLine = lines[0];

    let COMMAND_PATTERN: string = "^(\\s*)([a-z][a-zA-Z0-9\\s\\-_]*)\\(((.|\n)*)\\)\\s*";
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