// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */

const fs = vscode.workspace.fs

function activate(context) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "copy-project-structure" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('copy-project-structure.helloWorld', async function () {
		// The code you place here will be executed every time your command is executed

		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from copy-project-structure!');
		console.log("hi i am executing this command!")


		const workspaceFolders = vscode.workspace.workspaceFolders;
		
		let proyectStructure = "";

		vscode.window.showInformationMessage("copying the project structure");

		for (let i = 0; i < workspaceFolders.length; i++) {
			const workspaceFolder = workspaceFolders[i];

			proyectStructure = proyectStructure.concat(`--- Workspace: ${vscode.workspace.name} ---\n`);

			proyectStructure = proyectStructure.concat(await getFolderStructure(workspaceFolder.name, workspaceFolder.uri));

			proyectStructure = proyectStructure.concat("\n");
		}

		vscode.env.clipboard.writeText(proyectStructure);

		vscode.window.showInformationMessage("Project structure copied on the clipboard!");

		console.log(context.globalState.get("key"));
	});

	context.subscriptions.push(disposable);
}


async function getFolderStructure(folderName, uri) {
	const directoryFiles = await fs.readDirectory(uri);

	let structure = "📂 " + folderName + "\n";

	if (directoryFiles.length > 30) {
		structure = structure.concat("More than 30 items... \n");
	} else {

		for (const index in directoryFiles) {
			const item = directoryFiles[index];

			if (item[1] == vscode.FileType.Directory) {

				const newUri = vscode.Uri.joinPath(uri, item[0]);

				structure = structure.concat(await getFolderStructure(item[0] ,newUri));

				// we need to delete all the multiples tab sapces created at 
				// the last new line of the string,
				// so as not to ruin the indentation of the next line
				structure = structure.trimEnd();
				structure = structure.concat("\n");
			}

			if (item[1] == vscode.FileType.File) {
				structure = structure.concat("📄 ", item[0], "\n");
			}
		}
	}

	// we add one spacing at the end because all the 
	// "structure" is the inside of the parameter folder
	structure = structure.replaceAll("\n", "\n    ");

	return structure;

}


// This method is called when your extension is deactivated
function deactivate() { }

module.exports = {
	activate,
	deactivate
}
