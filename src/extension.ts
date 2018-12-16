import * as vscode from 'vscode';
import { spawn } from 'child_process';
import { join } from 'path'

export function activate(context: vscode.ExtensionContext) {
    const diagnosticCollection = vscode.languages.createDiagnosticCollection();
    vscode.workspace.onDidChangeTextDocument(e => {
        if (e.document.languageId === 'css') lint()
    })
    lint()

    function lint() {
        const ps = spawn('seass', [], { cwd: vscode.workspace.rootPath })
        ps.stderr.on('data', (data) => {
            const entries: [vscode.Uri, vscode.Diagnostic[]][] = []
            const lines = data.toString()
            const re = /(.+)\.css:(\d+):(\d+)-(\d+):(\d+) - (.+)/gi
            while (true) {
                const match = re.exec(lines)
                if (!match) break
                const [_, path, lineStart, colStart, lineEnd, colEnd, message] = match
                
                entries.push([
                    vscode.Uri.file(join(vscode.workspace.rootPath || '',`${path}.css`)),
                    [
                        new vscode.Diagnostic(
                            new vscode.Range(
                                new vscode.Position(
                                    parseInt(lineStart) - 1,
                                    parseInt(colStart) - 1,
                                ),
                                new vscode.Position(
                                    parseInt(lineEnd) - 1,
                                    parseInt(colEnd) - 1,
                                ),
                            ),
                            message
                        )
                    ]
                ])
            }
            diagnosticCollection.set(entries)
        })
    }
}
