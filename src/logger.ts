import * as vscode from 'vscode';

let outputChannel = vscode.window.createOutputChannel('mateo');

export function showOutput() {
    outputChannel.show(true)

}

export function info(msg : string) {
    console.log(new Date().toLocaleString() + ": " + msg)
    outputChannel.appendLine(new Date().toLocaleString() + ": " + msg)
}
