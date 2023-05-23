import * as vscode from 'vscode';
import * as codeUtils from '../utils/codeUtils';
 
const decorationErrorType = vscode.window.createTextEditorDecorationType({
    textDecoration: 'underline dotted red',
    overviewRulerColor: 'red',
    overviewRulerLane: vscode.OverviewRulerLane.Left
});

const decorationWarningType = vscode.window.createTextEditorDecorationType({
    textDecoration: 'underline dotted orange',
    overviewRulerColor: 'orange',
    overviewRulerLane: vscode.OverviewRulerLane.Left
});

const decorationInfoType = vscode.window.createTextEditorDecorationType({
    textDecoration: 'underline dotted yellow',
    overviewRulerColor: 'yellow',
    overviewRulerLane: vscode.OverviewRulerLane.Left
});

let arrErrorDecorations: vscode.DecorationOptions[] = [];
let arrWarningDecorations: vscode.DecorationOptions[] = [];
let arrInfoDecorations: vscode.DecorationOptions[] = [];


export const lintBP = vscode.commands.registerCommand('extension.mateo.lintBP', async () => {
    decorate();
}); 

const decorate = async function() {
    const activeEditor = vscode.window.activeTextEditor;
    if(!activeEditor) {
        return
    }
    let sourceCode = activeEditor.document.getText();
    const sourceCodeArr = sourceCode.split('\n');

    arrErrorDecorations = [];
    arrWarningDecorations = [];
    arrInfoDecorations = [];

    if (vscode.workspace.getConfiguration('mateo').bestPracticesLinter.CheckForCorrectNamingOfConstants) {
        bpConstantsNamingConvention(sourceCodeArr);
    }
    if(vscode.workspace.getConfiguration('mateo').bestPracticesLinter.CheckForCorrectNamingOfVariables) {
        bpVariablesNamingConvention(sourceCodeArr);
    }
    if(vscode.workspace.getConfiguration('mateo').bestPracticesLinter.CommentCommandBeforeControlStructure) {
        bpCommentBeforeControlStructure(activeEditor, sourceCodeArr);
    }
    if(vscode.workspace.getConfiguration('mateo').bestPracticesLinter.CorrectSQLCommandsOrder) {
        bpOrderOfSqlCommands(activeEditor, sourceCodeArr);
    }

    activeEditor.setDecorations(decorationErrorType, arrErrorDecorations);
    activeEditor.setDecorations(decorationWarningType, arrWarningDecorations);
    activeEditor.setDecorations(decorationInfoType, arrInfoDecorations);
}

function bpConstantsNamingConvention(sourceCodeArr: string[]) {

/*  Die Funktion prüft die Benennung von Konstanten: Es sollten nur Großbuchstaben, Zahlen und die Zeichen '-' und '_' genutzt werden.
 */
    const regConstantDeclarationActual = new RegExp("^\\s*const\\s+(?<ConstantName>[a-zA-Z0-9\\-_]+)\\s*=[\\s\\S]*")
    const regConstantDeclarationTarget = new RegExp("^\\s*const\\s+(?<ConstantName>[A-Z0-9\\-_]+)\\s*=[\\s\\S]*")
    const regIgnoreLine = new RegExp(".*(#NoLinter|#NOLINTER)\\r?$")


    for (let line = 0; line < sourceCodeArr.length; line++) {
    
        if (
            regConstantDeclarationActual.test(sourceCodeArr[line]) == true &&   // es wurde eine Deklaration einer Konstante mithilfe der const-Anweisung in der aktuellen Zeile erkannt
            regConstantDeclarationTarget.test(sourceCodeArr[line]) == false &&  // der Name der Variable entspricht nicht der Konvention
            regIgnoreLine.test(sourceCodeArr[line]) == false) {                 // die Zeile soll nicht ignoriert werden

            let match = sourceCodeArr[line].match(regConstantDeclarationActual)
            let matchConstantName = sourceCodeArr[line].match(match!.groups!.ConstantName)
            let beginPos = matchConstantName!.index
            let endPos = beginPos! + matchConstantName![0].length

            let range = new vscode.Range(
                new vscode.Position(line, beginPos!),
                new vscode.Position(line, endPos));
            
            let markdown = new vscode.MarkdownString('## Best Practice Linter \n');
            markdown.appendMarkdown('Die Bezeichnung einer Konstante sollte nur Großbuchstaben, Zahlen und die Zeichen \"-\" oder \"_\" enthalten! \n \n');
            markdown.appendMarkdown('Diese Regel kann mit dem Kommentar \"#NoLinter\" oder \"#NOLINTER\" in dieser Zeile ignoriert werden. \n \n');
            let decoration = { range, hoverMessage: markdown };

            arrWarningDecorations.push(decoration);
        }
    }
}

function bpVariablesNamingConvention(sourceCodeArr: string[]) {

/*  Die Funktion prüft die Benennung von Variablen: Diese sollte der lowerCamelCase-Konvention folgen und erlaubt neben einem führenden Klein- auch Großbuchstaben und Zahlen. 
    Der reguläre Ausdruck für die lowerCamelCase Konvention lautet: [a-z]([A-Z0-9]*[a-z][a-z0-9]*[A-Z]|[a-z0-9]*[A-Z][A-Z0-9]*[a-z])[A-Za-z0-9]*
 */
    const regVariableDeclarationActual = new RegExp("^\\s*set\\s+(?<VariableName>[a-zA-Z0-9\\-_]+)\\s*=[\\s\\S]*")
    const regVariableDeclarationTarget = new RegExp("^\\s*set\\s+(?<VariableName>[a-z]([A-Z0-9]*[a-z][a-z0-9]*[A-Z]|[a-z0-9]*[A-Z][A-Z0-9]*[a-z])[A-Za-z0-9]*)\\s*=[\\s\\S]*")
    const regVariableCommandActual = new RegExp("^\\s*setStorageValue\\(.*(?:TARGET_STORAGE_KEY\\s+=\\s+)[\"|'](?<VariableName>[a-zA-Z0-9\\-_]+)[\"|'].*\\)\\s*")
    const regVariableCommandTarget = new RegExp("^\\s*setStorageValue\\(.*(?:TARGET_STORAGE_KEY\\s+=\\s+)[\"|'](?<VariableName>[a-z](?:[A-Z0-9]*[a-z][a-z0-9]*[A-Z]|[a-z0-9]*[A-Z][A-Z0-9]*[a-z])[A-Za-z0-9]*)[\"|'].*\\)\\s*")
    const regIgnoreLine = new RegExp(".*(#NoLinter|#NOLINTER)\\r$")


    for (let line = 0; line < sourceCodeArr.length; line++) {
    
        if (
            regVariableDeclarationActual.test(sourceCodeArr[line]) == true &&   // es wurde eine Deklaration einer Variable mithilfe der set-Anweisung in der aktuellen Zeile erkannt
            regVariableDeclarationTarget.test(sourceCodeArr[line]) == false &&  // der Name der Variable entspricht nicht der Konvention
            regIgnoreLine.test(sourceCodeArr[line]) == false) {                 // die Zeile soll nicht ignoriert werden

            let match = sourceCodeArr[line].match(regVariableDeclarationActual)
            let matchVariableName = sourceCodeArr[line].match(match!.groups!.VariableName)
            let beginPos = matchVariableName!.index
            let endPos = beginPos! + matchVariableName![0].length

            let range = new vscode.Range(
                new vscode.Position(line, beginPos!),
                new vscode.Position(line, endPos));
            
            let markdown = new vscode.MarkdownString('## Best Practice Linter \n');
            markdown.appendMarkdown('Die Bezeichnung einer Variablen sollte der lowerCamelCase-Konvention folgen! \n \n');
            markdown.appendMarkdown('Diese Regel kann mit dem Kommentar \"#NoLinter\" oder \"#NOLINTER\" in dieser Zeile ignoriert werden.');
            let decoration = { range, hoverMessage: markdown };

            arrWarningDecorations.push(decoration);
        }

        else if (
            regVariableCommandActual.test(sourceCodeArr[line]) == true &&   // es wurde eine Deklaration einer Variable mithilfe eines setStorageValue()-Kommandos in der aktuellen Zeile erkannt
            regVariableCommandTarget.test(sourceCodeArr[line]) == false &&  // der Name der Variable entspricht nicht der Konvention
            regIgnoreLine.test(sourceCodeArr[line]) == false) {             // die Zeile soll nicht ignoriert werden

            let match = sourceCodeArr[line].match(regVariableCommandActual)
            let matchVariableName = sourceCodeArr[line].match(match!.groups!.VariableName)
            let beginPos = matchVariableName!.index
            let endPos = beginPos! + matchVariableName![0].length

            let range = new vscode.Range(
                new vscode.Position(line, beginPos!),
                new vscode.Position(line, endPos));
            
            let markdown = new vscode.MarkdownString('## Best Practice Linter \n');
            markdown.appendMarkdown('Die Bezeichnung einer Variablen sollte der lowerCamelCase-Konvention folgen! \n \n');
            markdown.appendMarkdown('Diese Regel kann mit dem Kommentar \"#NoLinter\" oder \"#NOLINTER\" in dieser Zeile ignoriert werden.');
            let decoration = { range, hoverMessage: markdown };

            arrWarningDecorations.push(decoration);
        }
    }
}

function bpCommentBeforeControlStructure(editor: vscode.TextEditor, sourceCodeArr: string[]) {

    /*  Diese Funktion überprüft, ob ein Comment()-Kommando vor einer Kontrollstruktur steht.
        Hintergrund: Laut den Testern (Hannes & Sven) ist es gute Praxis, da man so einem Fach'ler kurz informiert, 
        welche Funktion die Kontrollstruktur an dieser Stelle erfüllt.
     */

    const regControlStructure = new RegExp("^\\s*\\b(?:if|if[n|N]ot|while|while[n|N]ot|for)\\b\\s*(?:\\((.*)\\))?\\s*:\\s*")
    const regCommentCommand = new RegExp("^\\s*(?:comment|#|\"\"\"\\s*\\r$)")
    const regIgnoreLine = new RegExp(".*(#NoLinter|#NOLINTER)\\r$")

    for (let line = 0; line < sourceCodeArr.length; line++) {

        if (
            regControlStructure.test(sourceCodeArr[line]) == true &&    // es wurde der Beginn einer Kontrollstruktur in der aktuellen Zeile erkannt
            regCommentCommand.test(sourceCodeArr[line-1]) == false &&   // in der vorangegangenen Zeile befindet sich kein Kommentar 
            regIgnoreLine.test(sourceCodeArr[line]) == false) {

            let beginPos = editor.document.lineAt(line).firstNonWhitespaceCharacterIndex;
            let endPos = editor.document.lineAt(line).text.length

            let range = new vscode.Range(
                new vscode.Position(line, beginPos),
                new vscode.Position(line, endPos));
            
            let markdown = new vscode.MarkdownString('## Best Practice Linter \n');                    
            markdown.appendMarkdown('Vor einer Kontrollstruktur sollte ein Kommentar oder ein **comment()**-Kommando stehen, in dem der Grund für eine Fallunterscheidung kurz erklärt wird. \n \n');
            markdown.appendMarkdown('Diese Regel kann mit dem Kommentar \"#NoLinter\" oder \"#NOLINTER\" in dieser Zeile ignoriert werden.');
            let decoration = { range, hoverMessage: markdown };

            arrWarningDecorations.push(decoration);
        }
    }
}

function bpOrderOfSqlCommands(editor: vscode.TextEditor, sourceCodeArr: string[]) {

/*  Diese Funktion überprüft die richtige Reihenfolge der SQL-Befehle und die Übereinstimmung von openSQL()- und closeSQL()-Kommandos.
    Ein SQL-Befehl (nicht gemeint: openSQL() und closeSQL()) muss während einer passenden, aktiven Datenbankverbindung aufgebaut werden.
    Außerdem muss zu jedem openSQL()- ein übereinstimmender closeSQL()-Befehl existieren. Ansonsten werden die openSql()-Befehle, zu denen
    am Ende des Testskriptes noch offene Datenbankverbindungen bestehen, mit Codedekorationen versehen.
 */
    var arrOpenSqlCommands: [string, vscode.Range][] = [];

    const regOpenSqlCommand = new RegExp("^\\s*openSql\\(.*CONNECTION_NAME\\s*=\\s*[\"|'](?<ConnectionName>[a-zA-Z0-9\\s\\-_]+)[\"|'].*\\)")
    const regOtherSqlCommand = new RegExp("^\\s*(?:compareChangeSql|executeSql|loadCsvSql|querySql)\\(.*CONNECTION_NAME\\s*=\\s*[\"|'](?<ConnectionName>[a-zA-Z0-9\\s\\-_]+)[\"|'].*\\)")
    const regCloseSqlCommand = new RegExp("^\\s*closeSql\\(.*CONNECTION_NAME\\s*=\\s*[\"|'](?<ConnectionName>[a-zA-Z0-9\\s\\-_]+)[\"|'].*\\)")

    for (let line = 0; line < sourceCodeArr.length; line++) {

        if (regOpenSqlCommand.test(sourceCodeArr[line]) == true) {
        // es wurde ein openSql()-Kommando in der aktuellen Zeile erkannt

            let match = sourceCodeArr[line].match(regOpenSqlCommand)

            let beginPos = editor.document.lineAt(line).firstNonWhitespaceCharacterIndex;
            let endPos = editor.document.lineAt(line).text.length
            let range = new vscode.Range(
                new vscode.Position(line, beginPos),
                new vscode.Position(line, endPos));

            if(codeUtils.isElementInOpenSQLCommandsArray(arrOpenSqlCommands, match![1])) {
            // es existiert bereits eine Verbindung mit dem aktuellen CONNECTION_NAME-Parameter
                let markdown = new vscode.MarkdownString('## Best Practice Linter \n');
                markdown.appendMarkdown('Es besteht bereits eine aktive Datenbankverbindung mit dem CONNECTION_NAME '+match![1]+'.');
                let decoration = { range, hoverMessage: markdown };

                arrErrorDecorations.push(decoration);
            }
            else {
            // es besteht noch keine aktive Datenverbindung mit dem übergebenen Wert des Parameters CONNECTION_NAME
                let openSqlCommandInfo: [string, vscode.Range] = [match![1] , range];
                arrOpenSqlCommands.push(openSqlCommandInfo);
            }
        }
        else if (regCloseSqlCommand.test(sourceCodeArr[line]) == true) {
            // es wurde ein closeSql()-Befehl in der aktuellen Zeile erkannt

            let match = sourceCodeArr[line].match(regCloseSqlCommand)

            if (codeUtils.isElementInOpenSQLCommandsArray(arrOpenSqlCommands, match![1])) {
            // es gibt eine passende, aktive Datenverbindung zum closeSql()-Befehl, die geschlossen werden kann
                arrOpenSqlCommands.forEach(function(element, index) {
                    if(element[0] == match![1]) {
                        arrOpenSqlCommands.splice(index, 1);
                    }
                })
            }
            else {
            // es besteht keine aktive Datenbankverbindung zu der das closeSql()-Kommando passt
                let beginPos = editor.document.lineAt(line).firstNonWhitespaceCharacterIndex;
                let endPos = editor.document.lineAt(line).text.length

                let range = new vscode.Range(
                    new vscode.Position(line, beginPos),
                    new vscode.Position(line, endPos));
                
                let markdown = new vscode.MarkdownString('## Best Practice Linter \n');
                markdown.appendMarkdown('Es besteht keine passende, aktive Datenbankverbindung, die geschlossen werden kann.');
                let decoration = { range, hoverMessage: markdown };

                arrErrorDecorations.push(decoration);
            }
        }
        else if (regOtherSqlCommand.test(sourceCodeArr[line]) == true) {
        // es wurde ein ausführender SQL-Befehl in der aktuellen Zeile erkannt
            let match = sourceCodeArr[line].match(regOtherSqlCommand)

            if(!codeUtils.isElementInOpenSQLCommandsArray(arrOpenSqlCommands, match![1])) {
            // es gibt keine passende, aktive Datenbankverbindung auf der das Kommando angewandt werden kann
                let beginPos = editor.document.lineAt(line).firstNonWhitespaceCharacterIndex;
                let endPos = editor.document.lineAt(line).text.length
    
                let range = new vscode.Range(
                    new vscode.Position(line, beginPos),
                    new vscode.Position(line, endPos));

                let markdown = new vscode.MarkdownString('## Best Practice Linter \n');
                markdown.appendMarkdown('Dieses SQL-Kommando soll auf eine Datenbank ausgeführt werden, zu der keine aktive Verbindung besteht.')
                let decoration = { range, hoverMessage: markdown };

                arrErrorDecorations.push(decoration);
            }
        }
    }

    while(arrOpenSqlCommands.length > 0) {
    // für jedes verbleibende Element im Array, wird eine Fehlermeldung erstellt
        let markdown = new vscode.MarkdownString('## Best Practice Linter \n');
        markdown.appendMarkdown('Das openSql()-Kommando mit dem CONNECTION_NAME '+arrOpenSqlCommands[0][0]+' wurde nicht geschlossen.')
        let decoration = {range: arrOpenSqlCommands[0][1], hoverMessage: markdown}
        arrErrorDecorations.push(decoration)

        arrOpenSqlCommands.splice(0, 1);
    }
}