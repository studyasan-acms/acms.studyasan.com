export interface ExecutionResult {
    stdout: string;
    stderr: string;
    runTime?: number;
    hasError: boolean;
}

export async function executeCode(language: string, sourceCode: string, stdin: string = ""): Promise<ExecutionResult> {
    const languageIdMap: Record<string, number> = {
        python: 100,      // Python (3.12.5)
        javascript: 102,  // JavaScript (Node.js 22.08.0)
        typescript: 102,  // JavaScript (Node.js 22.08.0)
        java: 91,         // Java (JDK 17.0.6)
        cpp: 105,         // C++ (GCC 14.1.0)
    };

    const languageId = languageIdMap[language] || 100;

    try {
        const response = await fetch('https://ce.judge0.com/submissions?base64_encoded=false&wait=true', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                source_code: sourceCode,
                language_id: languageId,
                stdin: stdin,
            }),
        });

        if (!response.ok) {
            throw new Error(`Execution request failed with status ${response.status}`);
        }

        const data = await response.json();
        
        const stdout = data.stdout || '';
        const stderr = data.stderr || data.compile_output || data.message || '';
        const hasError = data.status?.id !== 3;

        return {
            stdout,
            stderr,
            runTime: data.time ? Number(data.time) : undefined,
            hasError,
        };
    } catch (error: any) {
        return {
            stdout: '',
            stderr: error.message || 'Execution error',
            hasError: true,
        };
    }
}
