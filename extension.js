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

	const setting = vscode.workspace.getConfiguration('copy-project-structure');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('copy-project-structure.copy-project-structure', async function () {
		// The code you place here will be executed every time your command is executed

		const workspaceFolders = vscode.workspace.workspaceFolders;

		let proyectStructure = "";

		for (let i = 0; i < workspaceFolders.length; i++) {
			const workspaceFolder = workspaceFolders[i];

			// those arguments are passed as reference to a recursive function
			const refObj = {
				mainFolder: true,
				setting
			}

			proyectStructure = proyectStructure.concat(`--- Workspace: ${vscode.workspace.name} ---\n`);

			proyectStructure = proyectStructure.concat(await getFolderStructure(workspaceFolder.name, workspaceFolder.uri, refObj));

			proyectStructure = proyectStructure.concat("\n");
		}

		vscode.env.clipboard.writeText(proyectStructure);

		vscode.window.showInformationMessage("Project structure copied on the clipboard!");

	});

	context.subscriptions.push(disposable);
}


async function getFolderStructure(folderName, uri, refObj) {

	const directoryFiles = await fs.readDirectory(uri);

	let structure = "📂 " + folderName + "\n";

	let itemsToIgnore = refObj.setting.ignoreFilesOnAllFolders

	if (refObj.mainFolder) {
		refObj.mainFolder = false;
		itemsToIgnore = itemsToIgnore.concat(refObj.setting.ignoreFilesOnWorkspaceFolder);
	} else {
		itemsToIgnore = itemsToIgnore.concat(refObj.setting.ignoreFilesOnSubFolders);
	}


	if (directoryFiles.length > refObj.setting.maxNumberOfItemsPerFolder) {
		structure = structure.concat(`More than ${refObj.setting.maxNumberOfItemsPerFolder} items... \n`);
	} else {

		for (const index in directoryFiles) {
			const item = directoryFiles[index];

			// if it's find on the itemsToIgnore list
			// jumps to the next loop iteration
			if (itemsToIgnore.includes(item[0])){continue}


			if (item[1] == vscode.FileType.Directory) {


				structure = structure.concat(await getFolderStructure(item[0], vscode.Uri.joinPath(uri, item[0]), refObj));

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
