import * as vscode from 'vscode';
import axios, { AxiosRequestConfig } from 'axios';
import { AxiosUtils } from '../utils/axiosUtils';
import {Agent} from 'https';    

export const reloadGlobalRepos = vscode.commands.registerCommand('extension.mateo.reloadGlobalRepos', async() => {
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

    await axios
      .post(
        config.mateoHostUrl + "/api/repository/refresh",
        queryParams
      )
      .then(function (response: any) {
        vscode.window.showInformationMessage("Reloaded repositories in the backend (status: " + response.status+")");
      })
      .catch(function (error: any) {
        console.log("Error reloading of backend repos: " + error.response.data);
        vscode.window.showErrorMessage("Error during reload of repos in the backend.");
      })
      .then(undefined, (err) => {
        console.log("error while reloading the repos in the backend " + err);
      });
});