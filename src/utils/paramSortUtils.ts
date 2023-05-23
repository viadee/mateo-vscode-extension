import * as vscode from "vscode";

export class ParamSortUtils {
    public static sortParams(items: vscode.CompletionItem[]): vscode.CompletionItem[]  {
        for(let item of items) {
            if(item.kind === vscode.CompletionItemKind.Field) {
                item.sortText = "AAABBB";
            }
        }
        return items;
    }
}