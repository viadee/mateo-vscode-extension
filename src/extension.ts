import axios, { AxiosRequestConfig } from 'axios';
import { Agent } from 'https';
import * as vscode from 'vscode';
import { commandRecommendations } from './commandRecommendations';
import { ExtensionDataHolder } from './extensionDataHolder';
import { CommandAlternativeName } from './commandAlternativeName';
import * as constantExtractor from './runners/constantExtractor';
import * as abortScriptRuns from './runners/abortScriptRuns';
import * as fullScriptRunner from './runners/fullScriptRunner';
import * as backendRefresher from './runners/backendRefresher';
import * as scriptValidator from './runners/scriptValidator';
import * as singleCommandRunner from './runners/singleCommandRunner';
import * as snippetExecutor from './runners/snippetRunner';
import * as bpLinter from './runners/bpLinter';
import { AxiosUtils } from './utils/axiosUtils';

// use ChromeExample.mrepo
const USE_PATTERN: string = "(?<Intro>^\\s*use\\s+)(?<Name>[^*&%\\s]+)\\s*$"
const USE_PATTERN_SPACE: string = "(?<Intro>^\\s*use\\s+\")(?<Name>[^*&%\"]+\\.mrepo)\"\\s*$"

// use ChromeExample.mrepo as repo
const USE_AS_PATTERN: string = "(?<Intro>^\\s*use\\s+)(?<Name>[^*&%\\s]+)\\s+as\\s+(?<Details>[^*&%\\s\\.]+)\\s*"
const USE_AS_PATTERN_SPACE: string = "(?<Intro>^\\s*use\\s+\")(?<Name>[^*&%\"]+\\.mrepo)\"\\s+as\\s+(?<Details>[^*&%\\s\\.]+)\\s*"

const BREAKPOINT_PATTERN: string = "\\s*breakpoint\\(\\)\\s*"
const IF_PATTERN: string = "^(\\s*)if\\s?(?:\\((.*)\\))?:\\s*$"
const IF_NOT_PATTERN: string = "^(\\s*)if[n|N]ot\\s?(?:\\(.*\\))?:\\s*$";
const THEN_PATTERN: string = "^(\\s*)then\\s*:\\s*";
const ELSEIF_PATTERN: string = "^(\\s*)else[i|I]f\\s*:\\s*";
const ELSE_PATTERN: string = "^(\\s*)else\\s*:\\s*";
const WHILE_PATTERN: string = "^(\\s*)while\\s*\\((.*)\\)\\s*:\\s*";
const WHILE_NOT_PATTERN: string = "^(\\s*)while[n|N]ot\\s*\\((.*)\\)\\s*:\\s*";
const DO_PATTERN: string = "^(\\s*)do\\s*:\\s*";
const FOR_PATTERN: string = "(\\s*)for\\s*\\((.*)\\):\\s*";

// case Zu Blogbeitrag navigieren(Message):
const CASE_SUITE_PATTERN: string = "(?<Intro>(\\s*)(?:case|process|testcase)\\s+)(?<Name>[a-zA-Z0-9äÄöÖüÜß\\s\\-_]+)\\((?<Details>.*)\\)\\s*:\\s*";

// case Zu Blogbeitrag navigieren:
const CASE_SUITE_WITHOUT_ARGS_PATTERN: string = "(?<Intro>(\\s*)(?:case|process|testcase)\\s+)(?<Name>[a-zA-Z0-9äÄöÖüÜß\\s\\-_]+):\\s*";

// step MateoRepoStep2(Message):
const STEP_SUITE_PATTERN: string = "(?<Intro>(\\s*)(?:step)\\s+)(?<Name>[a-zA-Z0-9äÄöÖüÜß\\s\\-_\\.]+)\\((?<Details>.*)\\)\\s*:\\s*";

// step MateoRepoStep2:
const STEP_SUITE_WITHOUT_ARGS_PATTERN: string = "(?<Intro>(\\s*)(?:step)\\s+)(?<Name>[a-zA-Z0-9äÄöÖüÜß\\s\\-_\\.]+):\\s*";

// set MATEO_URL2 = "https://mateo-web.de/"
const SET_VARIABLE_PATTERN: string = "(?<Intro>\\s*set\\s+)(?<Name>[a-zA-Z0-9\\-_]+)\\s*=\\s*[\"|'](?<Details>.*)[\"|']\\s*";

// set break = getTextFromElementWeb(BY_CRITERIA = "id", ELEMENT_NAME = "breakpoint")
const SET_COMMAND_VARIABLE_PATTERN: string = "(?<Intro>\\s*set\\s)(?<Name>[a-zA-Z0-9\\-_]+)\\s*=\\s*(?<Details>([a-z][a-zA-Z0-9\\s\\-_]*)\\((.*))\\)\\s*"

// const XPATH_COOKIES_AKZEPTIEREN = "//button[@aria-label="Akzeptieren"]"
const CONSTANT_PATTERN: string = "(?<Intro>\\s*const\\s+)(?<Name>[a-zA-Z0-9\\-_]+)\\s*=\\s*[\"|'](?<Details>.*)[\"|']\\s*";

const QUALIFIED_REFERENCE_PATTERN: string = "^(\\s*)([\\wÄÖÜäöüß\\s\\-]+)\\.([a-zäöüA-ZÄÖÜ]+[\\wÄÖÜäöüß\\s\\-]*)\\((.*)\\)\\s*";
const GENERAL_REFERENCE_PATTERN: string = "^\\s*([a-zäöüA-ZÄÖÜ]+[\\wÄÖÜäöüß\\s\\-]*)\\((.*)\\)\\s*";
const COMMAND_PATTERN: string = "(\\s+)([a-z][a-zA-Z0-9\\s\\-_]*)\\(((?:.|\\n)*)\\)\\s*";
const COMMAND_WITHOUT_ARGS_PATTERN: string = "(\\s+)([a-z][a-zA-Z0-9\\s\\-_]*)\\s*$";
const COMMAND_SET_PATTERN: string = "\\s*set\\s([a-zA-Z0-9\\-_]+)\\s*=\\s*([a-z][a-zA-Z0-9\\s\\-_]*)\\((.*)\\)\\s*";
const OPTION_PATTERN: string = "\\s*option\\s([a-zA-Z0-9\\-_]+)\\s{0,1}=\\s{0,1}\"(.*)\"";

export function activate (context: vscode.ExtensionContext) {

    let hoverProvider = vscode.languages.registerHoverProvider('mateo', {
        async provideHover (document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken) {
            let config = vscode.workspace.getConfiguration('mateo')
            let line: vscode.TextLine = document.lineAt(position);
            let beginIndex = line.firstNonWhitespaceCharacterIndex;
            let indexOfBrace = line.text.indexOf("(");
            let commandName = line.text.substr(beginIndex, (indexOfBrace - beginIndex));

            let tooltip: string = "";

            if (line.text.match(USE_PATTERN) || line.text.match(USE_PATTERN_SPACE)
                || line.text.match(USE_AS_PATTERN) || line.text.match(USE_AS_PATTERN_SPACE)) {
                return getChapterMarkdown("Repositories");
            } else if (line.text.match(BREAKPOINT_PATTERN)) {
                return getChapterMarkdown("Breakpoints");
            } else if (line.text.match(IF_PATTERN) || line.text.match(IF_NOT_PATTERN) || line.text.match(THEN_PATTERN)
                || line.text.match(ELSEIF_PATTERN) || line.text.match(ELSE_PATTERN)) {
                return getChapterMarkdown("If-Then-Else Bedingung");
            } else if (line.text.match(WHILE_PATTERN) || line.text.match(WHILE_NOT_PATTERN) || line.text.match(DO_PATTERN)) {
                return getChapterMarkdown("While-Schleife");
            } else if (line.text.match(FOR_PATTERN)) {
                return getChapterMarkdown("For-Schleife");
            } else if (line.text.match(CASE_SUITE_PATTERN) || line.text.match(CASE_SUITE_WITHOUT_ARGS_PATTERN)) {
                return getChapterMarkdown("Falldefinition (case/process)");
            } else if (line.text.match(STEP_SUITE_PATTERN) || line.text.match(STEP_SUITE_WITHOUT_ARGS_PATTERN)) {
                return getChapterMarkdown("Schrittdefinition (step)");
            } else if (line.text.match(CONSTANT_PATTERN)) {
                return getChapterMarkdown("Konstanten");
            } else if (line.text.match(SET_VARIABLE_PATTERN) || line.text.match(SET_COMMAND_VARIABLE_PATTERN)) {
                return getChapterMarkdown("Variable");
            } else if (line.text.match(COMMAND_SET_PATTERN)) {
                return getChapterMarkdown("Variable");
            } else if (line.text.match(OPTION_PATTERN)) {
                return getChapterMarkdown("Option");
            } else if (!line.text.match(BREAKPOINT_PATTERN) && (line.text.match(COMMAND_PATTERN) || line.text.match(COMMAND_WITHOUT_ARGS_PATTERN))) {
                return getCommandMarkdown();
            } else if (line.text.match(QUALIFIED_REFERENCE_PATTERN)) {
                return getChapterMarkdown("Repository mit Alias");
            } else if (line.text.match(GENERAL_REFERENCE_PATTERN)) {
                return getChapterMarkdown("Global oder General Repository");
            } else {
                return new vscode.Hover("");
            }

            async function getCommandMarkdown () {
                let commandAlternativeNames = new CommandAlternativeName();
                commandName = commandAlternativeNames.commandNameHasAlternative(commandName)!;
                let queryParams: AxiosRequestConfig = {
                        auth: await AxiosUtils.getAxiosAuth(),
                        httpsAgent: new Agent({
                            rejectUnauthorized: vscode.workspace.getConfiguration('mateo').rejectUnauthorized
                        }),

                    params: {
                        "markdownFilename": commandName,
                        "subfolder": "COMMANDS"
                    }
                };
                await axios.get(config.mateoHostUrl + '/api/documentation/', queryParams)
                    .then(function (response: any) {
                        tooltip = response.data;
                        // replace all  '>' with new line to avoid markdown quote
                        tooltip = tooltip.split(">").join('\n');
                        console.log("tooltip: " + tooltip);
                    }).catch(function (error: any) {
                        console.log("Error during execution: " + error.response.data);
                    }).then(undefined, err => {
                        console.log("Something went wrong: " + err);
                    });
                return new vscode.Hover(tooltip);
            }

            async function getChapterMarkdown (snippetName: string) {
                let language =
                vscode.workspace.getConfiguration("mateo").snippetLanguage;
              let path = "";
              if (language === "de") {
                path = "de/03a Skripte - mateoScript";
              } else if (language === "en") {
                path = "en/03a Scripts - mateoScript";
              } else {
                vscode.window.showWarningMessage(
                  "Language must be set either to 'en' or 'de'"
                );
                path = "de/03a Skripte - mateoScript";
              }

                let queryParams : AxiosRequestConfig = {
                    auth: await AxiosUtils.getAxiosAuth(),
                    httpsAgent: new Agent({
                        rejectUnauthorized: vscode.workspace.getConfiguration('mateo').rejectUnauthorized
                    }),
                    params:{
                        "snippetName": snippetName,
                        "folderPath": "usermanual/" + path,
                    }
                }
                await axios.get(config.mateoHostUrl + '/api/documentation/snippet', queryParams)
                    .then(function (response: any) {
                        tooltip = response.data;
                    }).catch(function (error: any) {
                        console.log("Error during execution: " + error.response.data);
                    }).then(undefined, err => {
                        console.log("Something went wrong: " + err);
                    });
                return new vscode.Hover(tooltip);
            }
        }
    });

    let validateOnSaveSubscriber = vscode.workspace.onDidSaveTextDocument(function (activeDocument) {
        if (vscode.workspace.getConfiguration('mateo').validateOnSave && vscode.window.activeTextEditor?.document.uri.fsPath.match(/.*\.(mateo|mrepo)$/)) {
            vscode.commands.executeCommand("extension.mateo.validateOnSave");
        }
    });

    const dataHolder = ExtensionDataHolder.getInstance();

    // Create a status bar item
    const mateoStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    mateoStatusBarItem.text = 'mateo: ...';
    mateoStatusBarItem.show();

    // Set URL to check
    const config = vscode.workspace.getConfiguration('mateo')
    const urlToCheckMateoStatus = config.mateoHostUrl + '/api/status';

    async function checkMateoStatusUrl() {
        try {
            // Check if the URL is reachable
            await axios.get(urlToCheckMateoStatus);
            // If reachable, set green indicator
            mateoStatusBarItem.text = `$(circle-large-outline) mateo: Online`;
            mateoStatusBarItem.color = 'green';
        } catch (error) {
            // If not reachable, set red indicator
            mateoStatusBarItem.text = `$(circle-large-outline) mateo: Offline`;
            mateoStatusBarItem.color = 'red';
        }
    }

    // Check the URL at an interval of 10 seconds
    checkMateoStatusUrl();
    setInterval(checkMateoStatusUrl, 10000);

     // Create a status bar item
     const robotStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
     robotStatusBarItem.text = 'URL Check: ...';
     robotStatusBarItem.show();
 
     // Set URL to check
     const urlToCheckRobot = config.mateoHostUrl + '/api/robot/status';
 
     async function checkRobotBridgeUrl() {
         try {
             // Check if the URL is reachable
             await axios.get(urlToCheckRobot);
             // If reachable, set green indicator
             robotStatusBarItem.text = `$(circle-large-outline) RobotBridge: Online`;
             robotStatusBarItem.color = 'green';
         } catch (error) {
             // If not reachable, set red indicator
             robotStatusBarItem.text = `$(circle-large-outline) RobotBridge: Offline`;
             robotStatusBarItem.color = 'red';
         }
     }
 
     // Check the URL at an interval of 10 seconds
     checkRobotBridgeUrl();
     setInterval(checkRobotBridgeUrl, 10000);

    // Push the status bar item to the subscriptions
    context.subscriptions.push(mateoStatusBarItem);
    context.subscriptions.push(robotStatusBarItem);

    context.subscriptions.push(dataHolder.diagnosticCollection);
    context.subscriptions.push(
        commandRecommendations,
        hoverProvider,
        scriptValidator.validate,
        abortScriptRuns.abort,
        bpLinter.lintBP,
        fullScriptRunner.runFullScript,
        backendRefresher.reloadGlobalRepos,
        snippetExecutor.runSnippet,
        constantExtractor.constantExtractor,
        singleCommandRunner.runSingleCommand,
        validateOnSaveSubscriber
    );
    context.subscriptions.push(vscode.languages.registerDocumentSymbolProvider(
        { language: "mateo" }, new MateoDocumentSymbolProvider()
    ));
}

class CodeSymbolDefinition {

    definitionName: string
    matchRegex: RegExp
    symbolKind: vscode.SymbolKind
    showDetails: boolean
    appropriateParent: (e: vscode.DocumentSymbol[]) => vscode.DocumentSymbol[] | null

    /**
     *
     * @param definitionName description string of this definition
     * @param matchRegex regex the element should match to qualify as an element of this type
     * @param symbolKind type of symbol to display for element
     * @param showDetails Should detail for this symbol be shown
     * @param enable Should this symbol type be used?
     * @param appropriateParent The parent element of this symbol (e.g. the 'case' symbol which is the parent to a 'step' symbol)
     */
    constructor(
        definitionName: string,
        matchRegex: RegExp,
        symbolKind: vscode.SymbolKind,
        showDetails: boolean,
        appropriateParent: (e: vscode.DocumentSymbol[]) => vscode.DocumentSymbol[] | null
    ) {

        this.definitionName = definitionName
        this.matchRegex = matchRegex
        this.symbolKind = symbolKind
        this.showDetails = showDetails
        this.appropriateParent = appropriateParent

    }

    public createCodeSymbol (line: vscode.TextLine, i: number) {
        if (vscode.workspace.getConfiguration('mateo').enableOutline) {
            const result = line.text.match(this.matchRegex)

            if (result) {

                const range = new vscode.Range(
                    new vscode.Position(i, result.groups!.Intro.length),
                    new vscode.Position(i, result.groups!.Intro.length + result.groups!.Name.length)
                )

                let symbolName = result.groups!.Name.trim();
                let symbolDetails = this.showDetails ? result.groups?.Details?.trim() ?? "" : "";

                return new vscode.DocumentSymbol(
                    symbolName,
                    symbolDetails,
                    this.symbolKind,
                    range,
                    range
                )

            }
        }
        return null
    }

    public getSymbolKind () {
        return this.symbolKind
    }

    public getAppropriateParent (symbols: vscode.DocumentSymbol[]): vscode.DocumentSymbol[] | null {
        return this.appropriateParent(symbols)
    }
}

class MateoDocumentSymbolProvider implements vscode.DocumentSymbolProvider {

    public provideDocumentSymbols (document: vscode.TextDocument, token: vscode.CancellationToken): Thenable<vscode.DocumentSymbol[]> {

        // TODO: Maybe add references to storage variables and constants that are being used?
        //       Might be tricky if constants contain storage variables etc...?
        //       Also: Multiple references in one line
        //       Also: Needs to be a set, not a list
        //             But then, how do we do "range"? Should be possible to reference same thing multiple times!
        //       Also: Do a separate parsing run for this, since it's not "line starts with"
        //"§.*?§|AVAILABLE_STORAGE_KEYS": vscode.SymbolKind.Variable,
        //"%.*?%": vscode.SymbolKind.Variable

        const codeSymbolDefinitions: CodeSymbolDefinition[] = [

            // imports
            new CodeSymbolDefinition(
                "USE_AS_PATTERN",
                new RegExp(USE_AS_PATTERN, "i"),
                vscode.SymbolKind.Interface,
                true,
                (symbols: vscode.DocumentSymbol[]) => { return symbols }
            ),

            // imports
            new CodeSymbolDefinition(
                "USE_AS_PATTERN_SPACE",
                new RegExp(USE_AS_PATTERN_SPACE, "i"),
                vscode.SymbolKind.Interface,
                true,
                (symbols: vscode.DocumentSymbol[]) => { return symbols }
            ),

            // imports
            new CodeSymbolDefinition(
                "USE_PATTERN",
                new RegExp(USE_PATTERN, "i"),
                vscode.SymbolKind.Interface,
                false,
                (symbols: vscode.DocumentSymbol[]) => { return symbols }
            ),

            // imports
            new CodeSymbolDefinition(
                "USE_PATTERN_SPACE",
                new RegExp(USE_PATTERN_SPACE, "i"),
                vscode.SymbolKind.Interface,
                false,
                (symbols: vscode.DocumentSymbol[]) => { return symbols }
            ),

            // Constants
            new CodeSymbolDefinition(
                "CONSTANT_PATTERN",
                new RegExp(CONSTANT_PATTERN, "i"),
                vscode.SymbolKind.Constant,
                true,
                (symbols: vscode.DocumentSymbol[]) => { return symbols }
            ),

            // Variable
            new CodeSymbolDefinition(
                "SET_VARIABLE_PATTERN",
                new RegExp(SET_VARIABLE_PATTERN, "i"),
                vscode.SymbolKind.Variable,
                true,
                getSymbolDepthTwo()
            ),

            // Variable Command
            new CodeSymbolDefinition(
                "SET_COMMAND_VARIABLE_PATTERN",
                new RegExp(SET_COMMAND_VARIABLE_PATTERN, "i"),
                vscode.SymbolKind.Variable,
                true,
                getSymbolDepthTwo()
            ),

            // Cases
            new CodeSymbolDefinition(
                "CASE_SUITE_PATTERN",
                new RegExp(CASE_SUITE_PATTERN, "i"),
                vscode.SymbolKind.Class,
                true,
                (symbols: vscode.DocumentSymbol[]) => { return symbols }
            ),

            // Cases No Args
            new CodeSymbolDefinition(
                "CASE_SUITE_WITHOUT_ARGS_PATTERN",
                new RegExp(CASE_SUITE_WITHOUT_ARGS_PATTERN, "i"),
                vscode.SymbolKind.Class,
                false,
                (symbols: vscode.DocumentSymbol[]) => { return symbols }
            ),

            // Steps
            new CodeSymbolDefinition(
                "STEP_SUITE_PATTERN",
                new RegExp(STEP_SUITE_PATTERN, "i"),
                vscode.SymbolKind.Method,
                false,
                getStepSymbol()
            ),

            // Steps without args
            new CodeSymbolDefinition(
                "STEP_SUITE_WITHOUT_ARGS_PATTERN",
                new RegExp(STEP_SUITE_WITHOUT_ARGS_PATTERN, "i"),
                vscode.SymbolKind.Method,
                false, // no details available
                getStepSymbol()
            )
        ]

        return new Promise((resolve, reject) => {
            var symbols: vscode.DocumentSymbol[] = [];

            for (var i = 0; i < document.lineCount; i++) {

                var line = document.lineAt(i);

                codeSymbolDefinitions.forEach(codeSymbolDefinition => {

                    const result = codeSymbolDefinition.createCodeSymbol(line, i)

                    if (result) {
                        codeSymbolDefinition.getAppropriateParent(symbols)?.push(result)
                    }

                });

            }
            resolve(symbols);
        });

        function getSymbolDepthTwo (): (e: vscode.DocumentSymbol[]) => vscode.DocumentSymbol[] | null {
            return (symbols: vscode.DocumentSymbol[]) => {
                if (symbols.length > 0) {

                    const potentialParent: vscode.DocumentSymbol = symbols[symbols.length - 1];

                    // TODO: Re-implement codeSymbolDefinitions using subclasses of `CodeSymbolDefintion` instead of passing in "parent determination functions".
                    //       That way, we could point to `CaseCodeSymbolDefintion.getSymbolKind()` here instead of hardcoding `vscode.SymbolKind.<X>`
                    // TODO: rewrite this: Essentially this is level two of a depth search written manually.
                    if (potentialParent.kind == vscode.SymbolKind.Class) {

                        const potentialParent2: vscode.DocumentSymbol = potentialParent.children[potentialParent.children.length - 1];

                        if (potentialParent2) {
                            return potentialParent2.kind == vscode.SymbolKind.Method ? potentialParent2.children : symbols;
                        }
                        else {
                            return symbols;
                        }
                    }
                    else {
                        return potentialParent.kind == vscode.SymbolKind.Method ? potentialParent.children : symbols;
                    }
                } else {
                    return symbols;
                }
            };
        }

        function getStepSymbol (): (e: vscode.DocumentSymbol[]) => vscode.DocumentSymbol[] | null {
            return (symbols: vscode.DocumentSymbol[]) => {

                if (symbols.length > 0) {

                    const potentialParent = symbols[symbols.length - 1];

                    // TODO: Re-implement codeSymbolDefinitions using subclasses of `CodeSymbolDefintion` instead of passing in "parent determination functions".
                    //       That way, we could point to `CaseCodeSymbolDefintion.getSymbolKind()` here instead of hardcoding `vscode.SymbolKind.Class`
                    return potentialParent.kind == vscode.SymbolKind.Class ? potentialParent.children : symbols;
                }
                else {
                    return symbols;
                }
            };
        }
    }
}