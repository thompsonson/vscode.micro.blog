/**
 * Abstraction layers for complex business logic testing
 * Following Microsoft's recommendation for testable wrapper classes
 */

import * as vscode from 'vscode';

// Abstraction for VS Code Window API
export interface IWindowAPI {
    showInformationMessage(message: string): Thenable<string | undefined>;
    showErrorMessage(message: string): Thenable<string | undefined>;
    showInputBox(options?: vscode.InputBoxOptions): Thenable<string | undefined>;
    showQuickPick(items: string[]): Thenable<string | undefined>;
}

export class WindowAPI implements IWindowAPI {
    showInformationMessage(message: string): Thenable<string | undefined> {
        return vscode.window.showInformationMessage(message);
    }

    showErrorMessage(message: string): Thenable<string | undefined> {
        return vscode.window.showErrorMessage(message);
    }

    showInputBox(options?: vscode.InputBoxOptions): Thenable<string | undefined> {
        return vscode.window.showInputBox(options);
    }

    showQuickPick(items: string[]): Thenable<string | undefined> {
        return vscode.window.showQuickPick(items);
    }
}

// Abstraction for VS Code Commands API
export interface ICommandsAPI {
    executeCommand<T = unknown>(command: string, ...rest: any[]): Thenable<T>;
    registerCommand(command: string, callback: (...args: any[]) => any): vscode.Disposable;
    getCommands(filterInternal?: boolean): Thenable<string[]>;
}

export class CommandsAPI implements ICommandsAPI {
    executeCommand<T = unknown>(command: string, ...rest: any[]): Thenable<T> {
        return vscode.commands.executeCommand(command, ...rest);
    }

    registerCommand(command: string, callback: (...args: any[]) => any): vscode.Disposable {
        return vscode.commands.registerCommand(command, callback);
    }

    getCommands(filterInternal?: boolean): Thenable<string[]> {
        return vscode.commands.getCommands(filterInternal);
    }
}

// Abstraction for VS Code Workspace API
export interface IWorkspaceAPI {
    getWorkspaceFolder(uri: vscode.Uri): vscode.WorkspaceFolder | undefined;
    findFiles(include: vscode.GlobPattern, exclude?: vscode.GlobPattern): Thenable<vscode.Uri[]>;
    openTextDocument(uri: vscode.Uri): Thenable<vscode.TextDocument>;
    saveTextDocument(document: vscode.TextDocument): Thenable<boolean>;
}

export class WorkspaceAPI implements IWorkspaceAPI {
    getWorkspaceFolder(uri: vscode.Uri): vscode.WorkspaceFolder | undefined {
        return vscode.workspace.getWorkspaceFolder(uri);
    }

    findFiles(include: vscode.GlobPattern, exclude?: vscode.GlobPattern): Thenable<vscode.Uri[]> {
        return vscode.workspace.findFiles(include, exclude);
    }

    openTextDocument(uri: vscode.Uri): Thenable<vscode.TextDocument> {
        return vscode.workspace.openTextDocument(uri);
    }

    async saveTextDocument(document: vscode.TextDocument): Promise<boolean> {
        // VS Code doesn't have a direct saveTextDocument API
        // This would need to be implemented based on actual save requirements
        return true;
    }
}

// Abstraction for VS Code File System API
export interface IFileSystemAPI {
    readFile(uri: vscode.Uri): Thenable<Uint8Array>;
    writeFile(uri: vscode.Uri, content: Uint8Array): Thenable<void>;
    createDirectory(uri: vscode.Uri): Thenable<void>;
    delete(uri: vscode.Uri, options?: { recursive?: boolean }): Thenable<void>;
    stat(uri: vscode.Uri): Thenable<vscode.FileStat>;
}

export class FileSystemAPI implements IFileSystemAPI {
    readFile(uri: vscode.Uri): Thenable<Uint8Array> {
        return vscode.workspace.fs.readFile(uri);
    }

    writeFile(uri: vscode.Uri, content: Uint8Array): Thenable<void> {
        return vscode.workspace.fs.writeFile(uri, content);
    }

    createDirectory(uri: vscode.Uri): Thenable<void> {
        return vscode.workspace.fs.createDirectory(uri);
    }

    delete(uri: vscode.Uri, options?: { recursive?: boolean }): Thenable<void> {
        return vscode.workspace.fs.delete(uri, options);
    }

    stat(uri: vscode.Uri): Thenable<vscode.FileStat> {
        return vscode.workspace.fs.stat(uri);
    }
}

// Test service that uses abstractions for easier testing
export class TestableExtensionService {
    constructor(
        private windowAPI: IWindowAPI,
        private commandsAPI: ICommandsAPI,
        private workspaceAPI: IWorkspaceAPI,
        private fileSystemAPI: IFileSystemAPI
    ) {}

    async showMessage(message: string, isError = false): Promise<void> {
        if (isError) {
            await this.windowAPI.showErrorMessage(message);
        } else {
            await this.windowAPI.showInformationMessage(message);
        }
    }

    async executeCommand<T>(command: string, ...args: any[]): Promise<T> {
        return await this.commandsAPI.executeCommand<T>(command, ...args);
    }

    async createFileWithContent(uri: vscode.Uri, content: string): Promise<void> {
        const encoder = new TextEncoder();
        const data = encoder.encode(content);
        await this.fileSystemAPI.writeFile(uri, data);
    }

    async readFileContent(uri: vscode.Uri): Promise<string> {
        const data = await this.fileSystemAPI.readFile(uri);
        const decoder = new TextDecoder();
        return decoder.decode(data);
    }
}

// Factory for creating real implementations
export function createRealImplementations(): {
    windowAPI: IWindowAPI;
    commandsAPI: ICommandsAPI;
    workspaceAPI: IWorkspaceAPI;
    fileSystemAPI: IFileSystemAPI;
} {
    return {
        windowAPI: new WindowAPI(),
        commandsAPI: new CommandsAPI(),
        workspaceAPI: new WorkspaceAPI(),
        fileSystemAPI: new FileSystemAPI()
    };
}

// Factory for creating testable service
export function createTestableService(): TestableExtensionService {
    const implementations = createRealImplementations();
    return new TestableExtensionService(
        implementations.windowAPI,
        implementations.commandsAPI,
        implementations.workspaceAPI,
        implementations.fileSystemAPI
    );
}