import * as vscode from 'vscode';

export const constantExtractor = vscode.commands.registerCommand('extension.mateo.constantExtractor', async () => {

  const editor = vscode.window.activeTextEditor;

  if (editor === undefined) {
    vscode.window.showErrorMessage("No editor available!")
    return
  }

  const selectedText = editor.document.getText(editor.selection);

  if (selectedText === undefined || selectedText.length == 0) {
    vscode.window.showErrorMessage("No text selected to extract. Please select some text.")
    return
  }

  const originalSelection = editor.selection

  // Retrieve constant name from user
  const constantName = await vscode.window.showInputBox({
    placeHolder: "Desired constant's name",
    prompt: "Replaces all occurrences of selected text with constant reference. Be sure to use this for elements occurring inside command parameters only.",
    value: ""
  });

  if (constantName == "" || constantName === undefined) {
    vscode.window.showErrorMessage("No constant name entered. Please enter a constant name.")
    return
  }

  // Replace all instances of selected text with constant name
  let doc = editor.document;
  const docText = doc.getText()
  const replacedText = docText.replaceAll(selectedText, `%${constantName}%`)

  // Append constant to beginning of script
  const constLine = `const ${constantName} = "${selectedText}"\n`

  // Replaces whole document
  // (There might be more elegant solution to this (i.e. only prepending the newly created line to the document)...)
  editor.edit(editBuilder => {
    editBuilder.replace(new vscode.Range(
      doc.lineAt(0).range.start, doc.lineAt(doc.lineCount - 1).range.end
    ), constLine + replacedText)
  })

  // Selects newly replaced content
  editor.selection = new vscode.Selection(
    originalSelection.anchor.line + 1,
    originalSelection.anchor.character,
    originalSelection.anchor.line + 1,
    originalSelection.anchor.character + constantName.length + 2
  )


});