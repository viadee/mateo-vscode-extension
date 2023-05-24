import {
  generateUseResources,
  getUseLines,
  retrieveWorkspacePath,
} from "./runners/snippetRunner";
import * as vscode from "vscode";
import axios, { AxiosRequestConfig } from "axios";
import RepositoryModel from "./RepositoryModel";
import { Agent } from "https";
import { AxiosUtils } from "./utils/axiosUtils";
import RepoParser from "./RepoParser";
import { StepRecommendationsBuffer } from "./StepRecommendationsBuffer";
import AliasPriorities from "./AliasPriorities";
import RepositoryProcessor from "./utils/RepositoryProcessor";
import { Nullable } from "./utils/Nullable";

/**
 * Parses and provides access to the repositories.
 * */
export default class RepoStepRecommender {
  private static instance: RepoStepRecommender;
  /**
   * The hash code of the global repositories that are currently buffered (and used for making recommendations).
   */
  private lastReposHash: number = 0;

  /**
   * The aliases that were defined for the repositories in the current document.
   */
  private aliasPriorities: AliasPriorities[] = [];

  /**
   * The keyword to define an alias for a repo in mateo scripts.
   */
  private INCLUDE_WITH_ALIAS_FLAG: string = " as ";

  /**
   * The keyword to indicate that a repository is being used.
   */
  private INCLUDE_FLAG: string = "use";

  /**
   * The empty string represents the key for repositories for which no alias was defined.
   */
  private KEY_OF_GENERAL_REPOS: string = "";

  /**
   * Extracts recommendations from both the local and the global repositories.
   */
  private stepRecommendationsBuffer: StepRecommendationsBuffer =
    new StepRecommendationsBuffer();
  /**
   * Keep this singleton's constructor private.
   */
  private constructor() {}

  public async provideRecommendation(
    document: string,
    uriFsPath: string
  ): Promise<vscode.CompletionItem[]> {
    await this.initializeGlobalRepos();
    this.bufferAliases(document);
    this.bufferLocalRepos(document, uriFsPath);

    // Steps from the repositories loaded from the backend.
    let completionItems = this.completionItemsForGlobalRepos(document);
    // Steps from local repositories as defined in the mateo script.
    if (!this.isBlankLine(this.getLastLine(document))) {
      completionItems = completionItems.concat(
        this.completionItemsForLocalRepos(this.getLastLine(document))
      );
    }
    // Recommendations for alias names.
    let aliases = this.completionItemsForAlias(document);
    completionItems = completionItems.concat(aliases);
    return completionItems;
  }

  private getLastLine(text: string): string {
    let lines = text.split("\n");
    return lines[lines.length - 1];
  }

  private completionItemsForAlias(document: string): vscode.CompletionItem[] {
    let completionItems: vscode.CompletionItem[] = [];
    let aliasesContainingText: string[] = this.filterMatchingAliases(
      this.allDefinedAliasNames(),
      this.getLastLine(document).trim()
    );
    for (let alias of aliasesContainingText) {
      let completionItem = new vscode.CompletionItem(alias);
      completionItem.kind = vscode.CompletionItemKind.Class;
      completionItem.detail = "Alias for repository";
      completionItem.sortText = "AAAAAA";
      completionItems.push(completionItem);
    }
    return completionItems;
  }

  private completionItemsForLocalRepos(
    lastLine: string
  ): vscode.CompletionItem[] {
    let completionItems: vscode.CompletionItem[] = [];
    let keyForDesiredRepo: string | undefined =
      this.getDesiredRepoKey(lastLine);
    if (keyForDesiredRepo !== undefined) {
      let aliasWithPriorizedRepos = this.matchingAlias(keyForDesiredRepo);
      let priorizedRepos: string[] =
        aliasWithPriorizedRepos == null // if null, no such alias is known
          ? []
          : aliasWithPriorizedRepos.priorizedRepoNames; // the list of repos the alias stands for
      completionItems = completionItems.concat(
        this.stepRecommendationsBuffer.getCompletionItemsForPriorizedRepos(
          priorizedRepos
        )
      );
    }
    return completionItems;
  }

  private completionItemsForGlobalRepos(
    document: string
  ): vscode.CompletionItem[] {
    let completionItemCandidates: vscode.CompletionItem[] = [];
    completionItemCandidates = completionItemCandidates.concat(
      this.stepRecommendationsBuffer.getCompletionItemsForBackendRepos()
    );
    // The user may have used a local repository without defining an alias for it
    // a.k.a. general repository. 
    // Make sure to include these, too.
    let desiredRepo: Nullable<AliasPriorities> = this.matchingAlias(
      this.KEY_OF_GENERAL_REPOS
    );
    if (desiredRepo != null) {
      completionItemCandidates = completionItemCandidates.concat(
        this.stepRecommendationsBuffer.getCompletionItemsForPriorizedRepos(
          desiredRepo.priorizedRepoNames
        )
      );
    }
    // Filter the completion items, so that only steps that match with 
    // the currently typed prefix are shown.
    return this.filterMatchingCompletions(completionItemCandidates, document);
  }

  private filterMatchingCompletions(
    completions: vscode.CompletionItem[],
    document: string
  ): vscode.CompletionItem[] {
    let currentLinePrefix: string = this.getLastLine(document);
    let completionItems: vscode.CompletionItem[] = [];
    for (let item of completions) {
      if (item.label.includes(currentLinePrefix.trim())) {
        completionItems.push(item);
      }
    }
    return completionItems;
  }

  private filterMatchingAliases(texts: string[], text: string): string[] {
    return texts.filter((x) => x.substring(0, text.length) === text);
  }

  private allDefinedAliasNames(): string[] {
    let aliasSuggestions: string[] = [];
    for (let key of this.makeArrayUnique(
      this.aliasPriorities.map((x) => x.aliasName)
    )) {
      aliasSuggestions.push(key);
    }
    return aliasSuggestions;
  }

  private makeArrayUnique<T>(array: T[]): T[] {
    return [...new Set(array)];
  }

  private getDesiredRepoKey(lastLine: string): string | undefined {
    if (!this.hasPrecedingDot(lastLine)) {
      return undefined;
    } else {
      return this.getReferencedAlias(lastLine);
    }
  }

  private getReferencedAlias(lastLine: string): string | undefined {
    let indexOfDot = lastLine.indexOf(".");
    let symbol: string = lastLine.substring(0, indexOfDot).trim();
    if (symbol === "") {
      return undefined;
    } else {
      return symbol;
    }
  }

  private isBlankLine(line: string): boolean {
    return line.trim().length == 0;
  }

  private hasPrecedingDot(lastLine: string): boolean {
    let indexOfDot = lastLine.indexOf(".");
    if (indexOfDot < 0) {
      return false;
    }
    for (let alias of this.aliasPriorities.map((x) => x.aliasName)) {
      if (lastLine.includes(alias)) {
        return true;
      }
    }
    return false;
  }

  private async bufferLocalRepos(
    document: string,
    uriFsPath: string
  ): Promise<void> {
    let repoModels: RepositoryModel[] = await RepoParser.parseUsedRepositories(
      document,
      retrieveWorkspacePath(uriFsPath)
    );
    this.stepRecommendationsBuffer.clearLocalRecommendations();
    for (let i = 0; i < repoModels.length; i++) {
      let alias: Nullable<string> = this.getAliasesForRepository(
        repoModels[i].name
      );

      if (alias === null) {
        console.log("No alias found for repository " + repoModels[i].name);
      } else {
        this.bufferSingleRepo(repoModels[i], alias);
      }
    }
  }

  private getAliasesForRepository(repoName: string): Nullable<string> {
    return this.aliasPriorities.map((x) => x.aliasName).length > 0
      ? this.aliasPriorities.map((x) => x.aliasName)[0]
      : null;
  }

  private bufferAliases(document: string): void {
    let linesContainingUse = getUseLines(document);
    this.aliasPriorities = [];
    for (let currentLine of linesContainingUse) {
      let aliasAndRepo: string[] = this.extractAliasAndRepoName(currentLine);
      let aliasName = aliasAndRepo[0];
      let repoName = aliasAndRepo[1];
      // If the repository has been used (a.k.a. included) in previous lines of the mateo script,
      // then any additional includes are invalid.
      // This in particular implies that two distinct aliases for the same repository are not allowed.
      if (this.repoNameNotUsedBefore(repoName)) {
        let matchingAliases: Nullable<AliasPriorities> =
          this.matchingAlias(aliasName);
        if (matchingAliases != null) {
          matchingAliases.priorizedRepoNames.push(repoName);
        } else {
          this.aliasPriorities.push({
            aliasName: aliasName,
            priorizedRepoNames: [repoName],
          });
        }
      }
    }
  }

  private extractAliasAndRepoName(currentLine: string): string[] {
    let repoName = "";
    let indexOfUse: number = currentLine.indexOf(this.INCLUDE_FLAG);
    let lastIndexOfAs: number = currentLine.lastIndexOf(
      this.INCLUDE_WITH_ALIAS_FLAG
    );
    // Retrieves the last occurence of " as " which, however, is not
    // necessarily present if the repository is used as a global repo (i.e. has no alias).
    let aliasName = "";
    if (lastIndexOfAs > 0) {
      repoName = currentLine
        .substring(indexOfUse + this.INCLUDE_FLAG.length, lastIndexOfAs)
        .trim();
      aliasName = currentLine.substring(
        lastIndexOfAs + this.INCLUDE_WITH_ALIAS_FLAG.length
      );
    } else {
      repoName = currentLine
        .substring(indexOfUse + this.INCLUDE_FLAG.length)
        .trim();
    }
    return [aliasName, repoName];
  }

  private matchingAlias(alias: string): Nullable<AliasPriorities> {
    let matchingAliases: AliasPriorities[] = this.aliasPriorities.filter(
      (x) => x.aliasName === alias
    );
    if (matchingAliases.length > 0) {
      return matchingAliases[0];
    } else {
      return null;
    }
  }

  private repoNameNotUsedBefore(name: string): boolean {
    for (let priorityAlias of this.aliasPriorities) {
      for (let savedName of priorityAlias.priorizedRepoNames) {
        if (savedName === name) {
          return false;
        }
      }
    }
    return true;
  }

  private async getReposHash(): Promise<number> {
    let config = vscode.workspace.getConfiguration("mateo");
    let queryParams: AxiosRequestConfig = {
      auth: await AxiosUtils.getAxiosAuth(),
      httpsAgent: new Agent({
        rejectUnauthorized: config.rejectUnauthorized,
      }),
      params: {},
    };
    let repoModelsHash: number = -1;
    await axios
      .get(config.mateoHostUrl + "/api/repository/get-all-hash", queryParams)
      .then(function (response: any) {
        repoModelsHash = response.data;
      })
      .catch(function (error: any) {
        console.log("Error during execution: " + error.response.data);
      })
      .then(undefined, (err) => {
        console.log("Something went wrong: " + err);
      });
    return repoModelsHash;
  }

  private async initializeGlobalRepos(): Promise<void> {
    let currentRepoHash: number = await this.getReposHash();
    if (this.lastReposHash === currentRepoHash) {
      return;
    }
    this.lastReposHash = currentRepoHash;
    let config = vscode.workspace.getConfiguration("mateo");
    let queryParams: AxiosRequestConfig = {
      auth: await AxiosUtils.getAxiosAuth(),
      httpsAgent: new Agent({
        rejectUnauthorized: config.rejectUnauthorized,
      }),
      params: {},
    };
    let repoModels: RepositoryModel[] = [];
    await axios
      .get(config.mateoHostUrl + "/api/repository/get-all", queryParams)
      .then(function (response: any) {
        repoModels = response.data;
      })
      .catch(function (error: any) {
        console.log("Error during execution: " + error.response.data);
      })
      .then(undefined, (err) => {
        console.log("Something went wrong: " + err);
      });
    this.stepRecommendationsBuffer.initializeGlobalRepos(repoModels);
  }

  private bufferSingleRepo(model: RepositoryModel, key: string): void {
    let snippets: Array<string> = RepositoryProcessor.convertStepToSnippet(
      model
    ).map((x) => x.snippet);
    this.stepRecommendationsBuffer.setSnippets(key, snippets, model.name);
  }

  public static getInstance(): RepoStepRecommender {
    if (!RepoStepRecommender.instance) {
      RepoStepRecommender.instance = new RepoStepRecommender();
    }
    return RepoStepRecommender.instance;
  }
}
