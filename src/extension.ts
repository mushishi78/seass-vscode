import * as vscode from 'vscode'
import * as lodash from 'lodash'
import { spawn } from 'child_process'
import { join } from 'path'

export function activate(context: vscode.ExtensionContext) {
    const debouncedLint = lodash.debounce(lint, 500)
    const diagnosticCollection = vscode.languages.createDiagnosticCollection()
    vscode.workspace.onDidChangeTextDocument(e => {
        if (e.document.languageId === 'css') debouncedLint(e.document.fileName)
    })
    debouncedLint()

    function lint(filename?: string) {
        const ps = spawn('seass', [], { cwd: vscode.workspace.rootPath })
        ps.stderr.on('data', (data) => {
            let entries: [vscode.Uri, vscode.Diagnostic[]][] = []
            const lines = data.toString()
            const re = /(.+)\.css:(\d+):(\d+)-(\d+):(\d+) - (.+)/gi
            while (true) {
                const match = re.exec(lines)
                if (!match) break
                const [path, lineStart, colStart, lineEnd, colEnd, message] = match.slice(1)
                
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

            // If inital call, set all of the entries
            if (filename == null) {
                diagnosticCollection.set(entries)
                return
            }

            // Otherwise only set the entry for the current file
            const uri = vscode.Uri.file(filename)
            entries = entries.filter(([fullPath, _]) => fullPath.path === uri.path)
            const groupedEntries = lodash.flatten(entries.map(([_, entry]) => entry))
            diagnosticCollection.set(uri, groupedEntries)
        })

        // Log other events
        const log = (prefix: string) => (data: any) => console.log(prefix, data)
        ps.on('error', log('seass-error:'))
        ps.on('exit', log('seass-exit:'))
        ps.stdout.on('data', log('seass-data:'))
    }
}
