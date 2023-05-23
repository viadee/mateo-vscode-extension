import axios, { AxiosBasicCredentials } from 'axios';
import * as vscode from 'vscode';

export class AxiosUtils {

    public static password : string | undefined;

    public static async getAxiosAuth(): Promise<AxiosBasicCredentials> {
        let axiosAuth: AxiosBasicCredentials = { username: "", password: "" }
        let config = vscode.workspace.getConfiguration('mateo')
        if(!config.rejectUnauthorized){
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        }
        else{
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';
        }
        if (config.mateoAuthEnabled && AxiosUtils.password == undefined) {
            AxiosUtils.password = await vscode.window.showInputBox({ password: true, placeHolder: "PASSWORD" })
        }
        axiosAuth.username = config.user
        axiosAuth.password = AxiosUtils.password || ""
        return axiosAuth;
    }
}