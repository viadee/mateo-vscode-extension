import * as vscode from "vscode";
import IntellisenseModel from "./IntellisenseModel";
import RepositoryModel from "./RepositoryModel";
import StepCompletion from "./StepCompletion";
import { Nullable } from "./utils/Nullable";
import RepositoryProcessor from "./utils/RepositoryProcessor";

export class StepRecommendationsBuffer {
  /**
   * The list of potential code completions for the local repositories.
   */
  private localRecommendations: IntellisenseModel[] = [];
  /**
   * The list of potential code completions for the global repositories stored in the backend.
   */
  private globalRecommendations: IntellisenseModel[] = [];

  /**
   * Provides code completions based on the given ordered array of repositories.
   * @param repos The list of repositories from which to extract the steps and return as code completion.
   * Note that if a name appears in two distinct repositories,
   * then only the first repositories step is included in the resulting
   * list of code completions.
   * @returns A list of code completions that contains the steps of the repositories.
   */
  public getCompletionItemsForPriorizedRepos(
    repos: string[]
  ): vscode.CompletionItem[] {
    let completionItems: vscode.CompletionItem[] = [];
    let stepNamesAdded: string[] = [];
    for (let repo of repos) {
      for (let recommendation of this.localRecommendations) {
        if (
          recommendation.repoName === repo &&
          !stepNamesAdded.includes(recommendation.stepName)
        ) {
          completionItems.push(
            this.intellisenseModelToCodeCompletion(recommendation)
          );
          stepNamesAdded.push(recommendation.stepName);
        }
      }
    }
    return completionItems;
  }

  public getCompletionItemsForBackendRepos(): vscode.CompletionItem[] {
    return this.globalRecommendations.map((x) =>
      this.intellisenseModelToCodeCompletion(x)
    );
  }

  public getSnippetsForKey(key: string): string[] {
    return this.localRecommendations
      .filter((x) => x.aliasName === key)
      .map((x) => x.snippet);
  }

  /**
   * Regarding global repositories in the backend, we can assume that all step names are distinct.
   * @param models The models that need to be buffered.
   */
  public initializeGlobalRepos(models: RepositoryModel[]): void {
    this.globalRecommendations = [];
    for (let model of models) {
      this.globalRecommendations = this.globalRecommendations.concat(
        this.backendModelToIntellisenseArray(model)
      );
    }
  }

  private backendModelToIntellisenseArray(
    repoModel: RepositoryModel
  ): IntellisenseModel[] {
    let completionsForRepo: Array<StepCompletion> =
      RepositoryProcessor.convertStepToSnippet(repoModel);
    let intellisenseModels: IntellisenseModel[] = [];
    for (let completion of completionsForRepo) {
      intellisenseModels.push({
        aliasName: null,
        repoName: repoModel.name,
        snippet: completion.snippet,
        stepName: completion.stepname,
      });
    }
    return intellisenseModels;
  }

  private intellisenseModelToCodeCompletion(
    model: IntellisenseModel
  ): vscode.CompletionItem {
    let stepFromRepoCommandCompletion = new vscode.CompletionItem(
      model.stepName
    );
    stepFromRepoCommandCompletion.insertText = new vscode.SnippetString(
      model.snippet
    );
    stepFromRepoCommandCompletion.kind = vscode.CompletionItemKind.Snippet;
    stepFromRepoCommandCompletion.detail = "Step";
    stepFromRepoCommandCompletion.sortText = "AAABBB";  
    return stepFromRepoCommandCompletion;
  }

  public setSnippets(
    alias: Nullable<string>,
    snippets: Array<string>,
    repo: string
  ): void {
    if (
      this.localRecommendations.filter(
        (x) => x.aliasName === alias && x.repoName === repo
      ).length == 0
    ) {
      for (let currentSnippet of snippets) {
        this.localRecommendations.push({
          aliasName: alias,
          repoName: repo,
          snippet: currentSnippet,
          stepName: currentSnippet.split("(")[0],
        });
      }
    }
  }

  public clearLocalRecommendations(): void {
    this.localRecommendations = [];
  }
}
