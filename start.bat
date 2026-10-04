@echo off
cd /d "%~dp0"
if not exist node_modules (
  echo Installing dependencies...
  npm install --cache ".\.npm-cache"
)
echo Starting Godot Frame Animator...
npm start
