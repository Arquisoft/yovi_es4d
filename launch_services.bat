@echo off
echo Iniciando microservicios...

:: Lanzar webapp
start cmd /k "cd webapp && npm install && npm run dev"

:: Lanzar game
start cmd /k "cd game && npm install && npm start"

:: Lanzar gateway
start cmd /k "cd gateway && npm install && npm start"

:: Lanzar gamey (Rust)
start cmd /k "cd gamey && cargo build && cargo run"

:: Lanzar user-service
start cmd /k "cd users/userservice && npm install && npm start"

:: Lanzar authservice
start cmd /k "cd users/authservice && npm install && npm start"

echo Todos los microservicios se están ejecutando.
pause