import {
  generateUseResources,
  getUseLines,
} from "./runners/snippetRunner";
import * as vscode from "vscode";
import RepositoryModel from "./RepositoryModel";
import axios, { AxiosRequestConfig } from "axios";
import { AxiosUtils } from "./utils/axiosUtils";
import { Agent } from "https";

export default class RepoParser {
  public static async parseUsedRepositories(
    scriptContent: string, 
    workspacePath: string
  ): Promise<RepositoryModel[]> {
    let linesContainingUse: string[] = getUseLines(scriptContent);
    let usedReposSourceCodePromise = generateUseResources(
      linesContainingUse,
      "",
      workspacePath
    );
    let usedReposSourceCode = RepoParser.removeFirstLine(
      await usedReposSourceCodePromise
    );
    let config = vscode.workspace.getConfiguration("mateo");
    let queryParams: AxiosRequestConfig = {
      auth: await AxiosUtils.getAxiosAuth(),
      httpsAgent: new Agent({
        rejectUnauthorized: config.rejectUnauthorized,
      }),
      headers: {
        "Content-Type": "text/plain",
      },
      params: {},
    };
    let repoModels: RepositoryModel[] = [];
    await axios
      .post(
        config.mateoHostUrl + "/api/repository/parse-mrepo-files",
        usedReposSourceCode,
        queryParams
      )
      .then(function (response: any) {
        repoModels = response.data;
        for (let repoModel of repoModels){
          repoModel.name = RepoParser.toLocalPath(repoModel.repositoryFilePath);
        }
      })
      .catch(function (error: any) {
        console.log("Error during execution: " + error.response.data);
      })
      .then(undefined, (err) => {
        console.log("Something went wrong: " + err);
      });
    return repoModels;
  }

  public static toLocalPath(path:string):string{
    let localPath = path.split("mateoTmp")[1];
    localPath = localPath.substring(1,localPath.length); // trim redundant folder-separator.
    while(localPath.includes("currentDummy")){
      localPath = localPath.replace("currentDummy", ".");
    }
    while(localPath.includes("parentDummy")){
      localPath = localPath.replace("parentDummy", "..");
    }
    while(localPath.includes("\\")){
      localPath = localPath.replace("\\", "/");
    }
    return localPath;
  }

  public static removeFirstLine(text: string): string {
    let lines = text.split("\n");
    // remove one line, starting at the first position
    lines.splice(0, 1);
    // join the array back into a single string
    return lines.join("\n");
  }
}
