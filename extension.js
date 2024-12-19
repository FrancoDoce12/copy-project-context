// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */

const fs = vscode.workspace.fs;

// work space settings
const wsSetting = vscode.workspace.getConfiguration('copy-project-context');


function activate(context) {

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const copyProjectContext = vscode.commands.registerCommand('copy-project-context.copy-project-context', async function () {

		const workspaceFolders = vscode.workspace.workspaceFolders;

		let proyectStructure = "";

		for (let i = 0; i < workspaceFolders.length; i++) {
			const workspaceFolder = workspaceFolders[i];

			// those arguments are passed as reference to a recursive function
			const refObj = {
				mainFolder: true,
				setting: wsSetting
			}

			proyectStructure = proyectStructure.concat(`--- Workspace: ${vscode.workspace.name} ---\n`);

			proyectStructure = proyectStructure.concat(await getFolderStructure(workspaceFolder.name, workspaceFolder.uri, refObj));

			proyectStructure = proyectStructure.concat("\n");
		}

		proyectStructure = proyectStructure.concat(await getFilesContent());

		vscode.env.clipboard.writeText(proyectStructure);

		vscode.window.showInformationMessage("Project structure copied on the clipboard!");

	});



	const addPathForContext = vscode.commands.registerCommand('copy-project-context.add-file-path-to-context', async (uri) => {

		const fileName = getFileNameFromPath(uri.path);

		const isUriAlredyStored = wsSetting.filePathsToContext.some(contextUri => contextUri.path == uri.path);

		if (isUriAlredyStored) {
			vscode.window.showInformationMessage(`File "${fileName}" is alredy on the context`);
			return
		}

		let plural = "";

		wsSetting.filePathsToContext.push(uri);
		await wsSetting.update("filePathsToContext", wsSetting.filePathsToContext);

		if (wsSetting.filePathsToContext.length != 1) {
			plural = "s"
		}

		vscode.window.showInformationMessage(`File "${fileName}" added to the context.\nNow there are ${wsSetting.filePathsToContext.length} file${plural} in total`);

	});


	const deleteFilePathFromContext = vscode.commands.registerCommand('copy-project-context.delete-file-paths-of-context', async () => {

		const length = wsSetting.filePathsToContext.length

		let message;

		if (length == 1) { message = `Deleted 1 file from the context` }

		else if (length == 0) { message = "Deleted 0 files from the context" }

		else { message = `Deleted all ${wsSetting.filePathsToContext.length} files from the context` }


		wsSetting.filePathsToContext.splice(0, length);
		await wsSetting.update("filePathsToContext", []);


		vscode.window.showInformationMessage(message);
	});


	const showAllFilePathsFromContext = vscode.commands.registerCommand('copy-project-context.show-all-file-paths-from-context', () => {
		const filePaths = wsSetting.filePathsToContext;
		const length = filePaths.length;


		let message = `There are ${filePaths.length} files added:\n`;
		let conector = "";

		// if there are no files added to the context, this will be the message
		// and the foor loop will not be executed
		if (length == 0) { message = "There are 0 files added to the context" }

		else if (length > 1) { conector = "," }

		for (const i in filePaths) {
			const fileUri = filePaths[i];

			message = `${message} "${getFileNameFromPath(fileUri.path)}"${conector}\n`;
		}

		vscode.window.showInformationMessage(message);
	})


	context.subscriptions.push(showAllFilePathsFromContext);
	context.subscriptions.push(deleteFilePathFromContext);
	context.subscriptions.push(copyProjectContext);
	context.subscriptions.push(addPathForContext);
}


async function getFolderStructure(folderName, uri, refObj) {

	const directoryFiles = await fs.readDirectory(uri);

	let structure = "📂 " + folderName + "\n";

	let itemsToIgnore = refObj.setting.ignoreFilesOnAllFolders;

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
			if (itemsToIgnore.includes(item[0])) { continue };


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


async function getFilesContent() {

	// here we store the indexes of the uris that cause any errors
	const indexesToDelete = [];
	const errorMessages = [];

	const td = new TextDecoder('utf-8');

	let filesContent = "";

	for (const i in wsSetting.filePathsToContext) {

		// the entring uri must be from a file, not a directory
		const uri = wsSetting.filePathsToContext[i];

		// the last part of the path, will be the file name
		const fileName = getFileNameFromPath(uri.path);

		// start the string value with a top line with the file name:
		let fileContent = filesContent.concat(`--${fileName} content:\n`);

		try {
			const fileData = await fs.readFile(uri);

			fileContent = fileContent.concat(td.decode(fileData));

		} catch (err) {
			console.log(`Error: Uri file: ${uri.path} not found`);
			console.log(err);
			indexesToDelete.push(i);
			fileContent = "";

			let errMessege = `File "${fileName}" with error code: ${err.code}\n`;
			errorMessages.push(errMessege);
			continue;
		}

		// make shure to have a good spacing at the end of the file
		filesContent = (fileContent.trimEnd()).concat("\n\n");
	}

	// we remove the broken paths, or the problematics ones
	for (const i in indexesToDelete) {
		wsSetting.filePathsToContext.splice(indexesToDelete[i] - i, 1);
	}

	// update in the case of some change
	if (indexesToDelete.length > 0) {
		await wsSetting.update("filePathsToContext", wsSetting.filePathsToContext);
		let errMessege = "Some files were removed from the context due to errors:\n";

		// concat the error messages of each file
		errMessege = errMessege.concat(errorMessages);
		vscode.window.showErrorMessage(errMessege);
	}

	return filesContent;
}


function getFileNameFromPath(path) {
	// the last part of the path, will be the file name
	return path.substring((path).lastIndexOf("/") + 1);
}


// This method is called when your extension is deactivated
function deactivate() { }

module.exports = {
	activate,
	deactivate
}
