import * as vscode from "vscode";
import {
  generateUseResources,
  getUseLines,
  retrieveWorkspacePath,
} from "./runners/snippetRunner";
import RepoParser from "./RepoParser";
import { Agent } from "https";
import { AxiosUtils } from "./utils/axiosUtils";
import axios, { AxiosRequestConfig, AxiosInstance } from "axios";
import GlobalConstant from "./GlobalConstant";
import {removeLinebreaks, removeComments} from './utils/codeUtils';


export class ConstantsRecommender {

  public async provideRecommendation(
    document: string,
    uriFsPath: string
  ): Promise<vscode.CompletionItem[]> {
    let constants: string[] = [];
    constants = constants.concat(this.provideConstantsFromLocalScriptFile(document));
    constants = constants.concat(
      await this.provideConstantsFromRepos(document, uriFsPath)
    );
    constants = constants.concat(await this.provideConstantsfromGlobalRepos());
    let vsCompletionItems: vscode.CompletionItem[] = [];
    for (let stringCompletion of constants) {
      let item = new vscode.CompletionItem(stringCompletion);
      item.insertText = "%" + stringCompletion + "%";
      item.kind = vscode.CompletionItemKind.Constant;
      item.sortText = "AAACCC";  
      vsCompletionItems.push(item);
      item.detail = "Constant"
    }

    let variables:string[] =[];
    variables = variables.concat(this.provideLocalVariables(document));
    for (let stringCompletion of variables) {
      let item = new vscode.CompletionItem(stringCompletion);
      item.insertText = "§" + stringCompletion + "§";
      item.kind = vscode.CompletionItemKind.Variable;
      item.sortText = "AAADDD";  
      vsCompletionItems.push(item);
      item.detail = "Storage variable"
    }
    return vsCompletionItems;
  }

  /**
   * This method provides only the names of the variables that were defined locally
   * within the mateo script 
   * (No check for the storage in backend or variables that were defined in repositories)
   * @param document The currently edited mateo script file.
   */
  private provideLocalVariables(document: string){
    let localVariables: string[] = [];
    let lines: string[] = this.extractLines(document);
    for (let line = 0; line < lines.length; line++) {
      let currentLine: string = lines[line];
      if (this.containsVariableDefinition(currentLine)) {
        localVariables.push(this.extractVariableRecommendation(currentLine));
      }
    }
    return localVariables;
  }

  private async provideConstantsfromGlobalRepos():Promise<string[]>{
    let config = vscode.workspace.getConfiguration("mateo");
    let queryParams: AxiosRequestConfig = {
      auth: await AxiosUtils.getAxiosAuth(),
      httpsAgent: new Agent({
        rejectUnauthorized: config.rejectUnauthorized,
      }),
      params: {},
    };
    let constants: GlobalConstant[] = [];

    await axios
      .get(config.mateoHostUrl + "/api/repository/constants", queryParams)
      .then(function (response: any) {
        constants = response.data;
      })
      .catch(function (error: any) {
        console.log("Error during execution: " + error.response.data);
      })
      .then(undefined, (err) => {
        console.log("Something went wrong: " + err);
      });

      let globalConstants:string[] = [];
      for(let constant of constants){
        globalConstants.push(constant.key);
      }
      return globalConstants;
  }

  private async provideConstantsFromRepos(
    document: string,
    uriFsPath: string
  ): Promise<string[]> {
    let linesContainingUse: string[] = getUseLines(document);
    let usedReposSourceCodePromise = generateUseResources(
      linesContainingUse,
      "",
      retrieveWorkspacePath(uriFsPath)
    );
    let usedReposSourceCode: string = RepoParser.removeFirstLine(
      await usedReposSourceCodePromise
    );
    
    usedReposSourceCode = removeComments(removeLinebreaks(usedReposSourceCode));
    let repoSourceCodeLines: string[] = usedReposSourceCode.split(/\r?\n/);
    let repoConstants: string[] = [];
    for (
      let lineIndex = 0;
      lineIndex < repoSourceCodeLines.length;
      lineIndex++
    ) {
      let currentLine: string = repoSourceCodeLines[lineIndex];
      if (this.containsConstantDefinition(currentLine)) {
        repoConstants.push(this.extractConstantRecommendation(currentLine));
      }
    }
    return repoConstants;
  }

  private provideConstantsFromLocalScriptFile(document: string): string[] {
    let localConstants: string[] = [];
    let lines: string[] = this.extractLines(document);
    for (let line = 0; line < lines.length; line++) {
      let currentLine: string = lines[line];
      if (this.containsConstantDefinition(currentLine)) {
        localConstants.push(this.extractConstantRecommendation(currentLine));
      }
    }
    return localConstants;
  }

  private containsConstantDefinition(line: string): boolean {
    return line.includes("const ") && line.includes("="); 
  }

  private containsVariableDefinition(line:string): boolean{
    return line.includes("set ") && line.includes("=");
  }

  private extractConstantRecommendation(line: string): string {
    return line
      .substring(line.indexOf("const ") + "const ".length, line.indexOf("="))
      .trim();
  }
  private extractVariableRecommendation(line: string): string {
    return line
      .substring(line.indexOf("set ") + "set ".length, line.indexOf("="))
      .trim();
  }
  private extractLines(text: string): string[] {
    return text.split("\n");
  }
}
