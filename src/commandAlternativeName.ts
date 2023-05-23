import * as vscode from 'vscode'

export class CommandAlternativeName {

    private commandAlternativeNames = new Map<string, string> ([
        ["checkCheckboxSelectedWeb", "checkElementSelectedWeb"],
        ["checkElementPresentWeb", "checkElementPresent"],
        ["checkElementNotPresent", "checkElementNotPresentWeb"],
        ["waitForElementVisibleWeb", "waitForElementWebVisible"],
        ["moveFilesOlderThan", "moveFile"],
    ]);

    public commandNameHasAlternative (commandName: string) {
        if (this.commandAlternativeNames.get(commandName) !== undefined) {
            return this.commandAlternativeNames.get(commandName);
        } else {
            return commandName;
        }
    }
}