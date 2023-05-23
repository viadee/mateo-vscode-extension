# Installation options

## Run/Debug the source code
See "vsc-extension-quickstart.md".
(This opens a _separate_ VS Code window with the extension activated. It does not integrate the extension into your local VS Code instance.)

## Package and install the extension
Create a "vsix" file from the source code: Open a terminal.
 1a. Install node types: ``npm i @types/node``
 1b. Install typescript: ``npm install typescript``
 1c. Install the "VSCE" (Visual Studio Code Extension Manager) tool: `npm install --global @vscode/vsce`
 2. Build "mateo.vsix": In the project directory execute `vsce package` (optional: `-o mateo-vscode.vsix` for a more intutive name)
 3. Install the "vsix" file: In VS Code open the "Extensions" sidebar. From the options icon (3 dots: "...") choose "Install from VSIX".

(Alternatives to get the vsix file:
 -  Download the latest vsix build from GitHub.
 -  The mateo.zip also contains the latest vsix build.)
