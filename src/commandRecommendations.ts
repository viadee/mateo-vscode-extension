import * as vscode from 'vscode';
import * as fs from 'fs';
import { AxiosUtils } from "./utils/axiosUtils";
import axios, { AxiosRequestConfig, AxiosInstance } from "axios";
import { Agent } from "https";
import * as path from 'path';

const EXTENSION_STORAGE_DIR = 'extension-storage';
const JSON_FILE_NAME = 'commands.json';
const JSON_FILE_PATH = path.join(__dirname, EXTENSION_STORAGE_DIR, JSON_FILE_NAME);

const SIXTEEN_SPACES = '                ';

const EXTENSION_BLACKLIST: string[] = [
    "for",
    "if",
    "ifNot",
    "elseIf",
    "while",
    "whileNot"
];

const EXTENSION_END_BLACKLIST: string[] = [
    "endIf",
    "endFor",
    "endWhile",
    "reference"
];

const EXTENSION_NO_PARAM_BLACKLIST: string[] = [
    "then",
    "else",
    "do"
];

// Create the JsonCommands instance with the path to the JSON file

interface JsonParameter {
    name: string;
    description?: string;
    mandatory: boolean;
}

interface JsonCommand {
    name: string;
    description?: string;
    parameters: JsonParameter[];
}

class JsonCommands {
    private commands: JsonCommand[] = [];
    private dataLoaded: boolean = false;

    constructor() {}

    public async loadCommandsFromUrl(jsonUrl: string, queryParams : AxiosRequestConfig) {
        if (this.dataLoaded) {
            // Data already loaded, skip fetching
            return;
        }

        try {
            console.log("Fetching available commands from: " + jsonUrl)
            const response = await axios.get(jsonUrl, queryParams);
            this.commands = response.data.commands;
            this.dataLoaded = true;
            this.saveJsonToLocal(JSON_FILE_PATH, response.data);
        } catch (error) {
            console.error('Error fetching JSON data:', error);
            await this.loadCommandsFromLocal(JSON_FILE_PATH);
        }
    }


    private async saveJsonToLocal(filePath: string, data: any) {
        try {
            await vscode.workspace.fs.createDirectory(vscode.Uri.file(path.dirname(filePath)));
            await vscode.workspace.fs.writeFile(vscode.Uri.file(filePath), Buffer.from(JSON.stringify(data)));
        } catch (error) {
            console.error('Error saving JSON data locally:', error);
        }
    }

    private async loadCommandsFromLocal(filePath: string) {
        try {
            console.log("Fetching available commands from path: " + filePath)
            const fileUri = vscode.Uri.file(filePath);
            const fileData = await vscode.workspace.fs.readFile(fileUri);
            const parsedData = JSON.parse(fileData.toString());
            this.commands = parsedData.commands;
            this.dataLoaded = true;
        } catch (error) {
            console.error('Error loading JSON data from local file:', error);
        }
    }

    private isBlacklisted(cmd: string): boolean {
        return EXTENSION_BLACKLIST.some(blacklisted => blacklisted.toLowerCase() === cmd.toLowerCase());
    }

    private isEndBlacklisted(cmd: string): boolean {
        return EXTENSION_END_BLACKLIST.some(blacklisted => blacklisted.toLowerCase() === cmd.toLowerCase());
    }

    private isNoParamBlacklisted(cmd: string): boolean {
        return EXTENSION_NO_PARAM_BLACKLIST.some(blacklisted => blacklisted.toLowerCase() === cmd.toLowerCase());
    }

    public createCommandCompletionItems(document: vscode.TextDocument, position: vscode.Position): vscode.CompletionItem[] {
        let items: vscode.CompletionItem[] = [];
        const line = document.lineAt(position);
        const beginIndex = line.firstNonWhitespaceCharacterIndex;
        const indexOfBrace = line.text.indexOf("(");
        const linePrefix = line.text.substr(beginIndex, indexOfBrace + 1);

        for (const command of this.commands) {
            if (this.isEndBlacklisted(command.name)) continue;

            if (new RegExp(`.*\\s*${command.name}\\s*\\(.*`).test(linePrefix)) {
                for (const param of command.parameters) {
                    if (param.name !== '') {
                        const completionItem = new vscode.CompletionItem(param.name);
                        completionItem.kind = vscode.CompletionItemKind.Field;
                        completionItem.insertText = new vscode.SnippetString(`${param.name} = "\${1}"`);
                        const documentation = param.description ? param.description.replace(/"/g, "'") : 'No documentation';
                        completionItem.documentation = new vscode.MarkdownString(documentation.replace(/\r/g, '').replace(/\n/g, ''));
                        items.push(completionItem);
                    }
                }
            }

            if (/^\s+(?!case|step|process|testcase)\w+/.test(line.text) && position.character <= (indexOfBrace > 0 ? indexOfBrace : position.character)) {
                const commandCompletion = new vscode.CompletionItem(command.name);
                commandCompletion.kind = vscode.CompletionItemKind.Function;
                commandCompletion.insertText = new vscode.SnippetString(command.name);

                if (!this.isNoParamBlacklisted(command.name)) {
                    commandCompletion.insertText.appendText('(');
                    let counter = 1;
                    let first = true;
                    for (const param of command.parameters) {
                        if (param.name !== '' && param.mandatory) {
                            if (!first) {
                                commandCompletion.insertText.appendText(', ');
                            } else {
                                first = false;
                            }
                            commandCompletion.insertText.appendText(`${param.name} = "\${${counter}}"`);
                            counter++;
                        }
                    }
                    commandCompletion.insertText.appendText(')');
                }

                if (this.isBlacklisted(command.name) || this.isNoParamBlacklisted(command.name)) {
                    commandCompletion.insertText.appendText(':');
                }

                const description = command.description ? command.description.replace(/'/g, "\"").replace(/\n/g, "").replace(/\r/g, "") : "Keine Dokumentation des Kommandos vorhanden.";
                commandCompletion.documentation = new vscode.MarkdownString(description);
                items.push(commandCompletion);
            }
        }

        return items;
    }
}


const jsonCommands = new JsonCommands();


// Register the command recommendations provider
export const commandRecommendations = vscode.languages.registerCompletionItemProvider(
    'mateo',
    {
        async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
            let config = vscode.workspace.getConfiguration("mateo");
            let queryParams: AxiosRequestConfig = {
                auth: await AxiosUtils.getAxiosAuth(),
                httpsAgent: new Agent({
                  rejectUnauthorized: config.rejectUnauthorized,
                }),
                params: {},
              };
            // Load commands from the given URL before providing completion items
            await jsonCommands.loadCommandsFromUrl(config.mateoHostUrl + "/api/commands/all", queryParams);
            return jsonCommands.createCommandCompletionItems(document, position);
        }
    },
    '.' // Trigger completion on typing '.'
);
