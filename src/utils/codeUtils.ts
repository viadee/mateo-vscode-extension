import { EPROTO } from 'constants';
import * as vscode from 'vscode';


export const getSelectedCode = () => {
    let textEditor = vscode.window.activeTextEditor;
    if (!textEditor) {
        return "";
    }

    let selections = textEditor.selections;
    selections.sort((s1, s2) => {
        return s1.start.line - s2.start.line;
    });
    let text : string = "";
    selections.forEach((selection) => {
        text += textEditor?.document.getText(selection)
        text += "\n";
    });

    if (textEditor.selection.isEmpty) {
        text = textEditor.document.lineAt(textEditor.selection.start.line).text;
    }
    return text;
};

export const getFileName = () => {
    let textEditor = vscode.window.activeTextEditor;
    if (!textEditor) {
        return "";
    }
    return textEditor.document.fileName.trim();
}

/**
 * Returns the substring from the beginning of the document until the position where the caret is.
 * @param document The document to be trimmed.
 * @param position Indicates the position (line and character) of the caret within the document.
 * @returns The substring of the document until where the caret is.
 */
export const cutUntilCaret = (document:vscode.TextDocument, position: vscode.Position) => {
    let scriptUntilCaret: string = "";
    for (let row = 0; row < position.line; row++) {
      scriptUntilCaret += document.lineAt(row).text + "\n";
    }
    scriptUntilCaret += document
      .lineAt(position)
      .text.substring(0, position.character);
    return scriptUntilCaret;
}

/**
 * Removes mateo-script specific linebreaks that are indicated by the backslash character \.
 * Also removes whitespaces that succeed such a backslash character. 
 * @param text A (snippet of) mateo script whose line breaks should be removed.
 * @returns A semantically equivalent mateo script that does not contain any backslash character.
 */
export const removeLinebreaks = (text: string) => {
    return text.split(/\\\s*/).join("");

}
const removeSingleLineStrings = (text: string) => {
  let textWithoutSingleLineComments = "";
  for (let line of text.split("\n")) {
    textWithoutSingleLineComments += "\n";
    if (line.includes("#")) {
      textWithoutSingleLineComments += line.substring(0, line.indexOf("#"));
    } else {
      textWithoutSingleLineComments += line;
    }
  }
  return textWithoutSingleLineComments;
};

export const removeComments = (text: string) => {
    // this regex matches any string enclosed by three quotation marks 
    // (corresponding to multiline comments in mateo script)
    // e.g. occurences of strings like: """ This is \n a comment \n """ 
    text = removeSingleLineStrings(text);
    return text.split(/\"\"\"(\s|.)*?\"\"\"/).join("\n");
}

export const getStartLine = () => {
    let textEditor = vscode.window.activeTextEditor;
    if (!textEditor) {
        return "";
    }
    return textEditor.selection.start.line;
}

export const getWorkspaceFolderUnixStyle = () => {
    let textEditor = vscode.window.activeTextEditor;
    if (!textEditor) {
        return "";
    }

    let workspaceFolder: vscode.WorkspaceFolder | undefined = vscode.workspace.getWorkspaceFolder(textEditor.document.uri);

    if (workspaceFolder === undefined) {
        let wsFolder = textEditor.document.uri.fsPath;
        let wsPath = (wsFolder).replace(/\\/g, '/');
        return wsPath.substring(0, wsPath.lastIndexOf('/'));        
    }

    let workspacePath : string = (workspaceFolder?.uri.fsPath || '').replace(/\\/g, '/');
    return workspacePath;
}

export const isElementInOpenSQLCommandsArray = (pArray: [string, vscode.Range][] = [], searchedConnectionName: string) => {
    for(let i = 0; i < pArray.length ; i++) {
        if(pArray[i][0] == searchedConnectionName) {
            return true;
        }
    }
    return false;
}

//if the input string has both leading and trailing quotation marks, remove them
export const trimQuotationMarks = (input: string):string => {
    if (input.match(/^"(.*)"$/)) { // check if the string starts and ends with a quotation mark
        return input.replace(/^"(.*)"$/, '$1'); // remove the quotation marks
      } else {
        return input;
      }
};