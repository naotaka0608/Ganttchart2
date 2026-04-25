@echo off
echo ===================================
echo GanttFlow 実行ファイルの作成を開始します
echo ===================================

echo [1/2] PyInstallerをインストール/確認しています...
uv pip install pyinstaller

echo [2/2] exeファイルをビルドしています...
uv run pyinstaller --noconsole --onefile --add-data "static;static" --name "GanttFlow" main.py

echo ===================================
echo ビルドが完了しました！
echo 「dist」フォルダの中に「GanttFlow.exe」が作成されています。
echo ===================================
pause
