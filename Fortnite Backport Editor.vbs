Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
appDir = fso.GetParentFolderName(WScript.ScriptFullName)
shell.CurrentDirectory = appDir

nodePath = FindOnPath(shell, "node.exe")
If nodePath = "" Then
  MsgBox "Node.js was not found. Install Node.js, then start Fortnite Backport Editor again.", 48, "Fortnite Backport Editor"
  WScript.Quit 1
End If

command = """" & nodePath & """ """ & appDir & "\src\Core\server.js"" --desktop"
shell.Run command, 0, False

Function FindOnPath(shell, exeName)
  On Error Resume Next
  result = shell.Exec("cmd /c where " & exeName).StdOut.ReadLine()
  If Err.Number <> 0 Then
    result = ""
  End If
  On Error GoTo 0
  FindOnPath = result
End Function
