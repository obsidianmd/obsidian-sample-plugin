@echo on
IF EXIST "src/main.ts" (
    start /B code src/main.ts
) ELSE (
    start /B code main.ts
)
call npm install 
call npm run dev
pause