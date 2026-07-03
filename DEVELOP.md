# Installation options

The extension is currently being developed and built using Node.js 22 LTS.

## "Run and Debug" the source code from inside VS Code
This opens a _separate_ VS Code window with the extension activated. It does not integrate the extension into your current VS Code instance.

## Package and install the extension
Create a `.vsix` file from the source code:

* Open a terminal. In it, run:

  * `npm clean-install`

  * `npx vsce package -o mateo-vscode.vsix`

* Install `mateo-vscode.vsix`:

  * In VS Code, open the "Extensions" sidebar

  * From the options icon (3 dots: "...") choose "Install from VSIX"

  * Select the desired `mateo-vscode.vsix`

## Alternatives to get the VSIX file

* Download the latest build from GitHub: https://github.com/viadee/mateo-vscode-extension

* Get it from Visual Studio Marketplace: https://marketplace.visualstudio.com/items?itemName=viadee.mateo

* mateo (https://installer.mateo-automation.com/) comes with a pre-packged extension file