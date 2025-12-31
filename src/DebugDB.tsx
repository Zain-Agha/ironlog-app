import { useState } from 'react';
import { db } from './db'; // Adjust path if your db file is named differently or in a folder

export default function DebugDB() {
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);

  const runDiagnostics = async () => {
    setLogs([]);
    addLog("--- STARTING DIAGNOSTICS ---");

    // TEST 1: Check DB Open Status
    try {
      if (!db.isOpen()) {
        addLog("⚠️ DB is not open. Attempting to open...");
        await db.open();
        addLog("✅ DB Opened successfully.");
      } else {
        addLog("ℹ️ DB was already open.");
      }
    } catch (e: any) {
      addLog(`❌ FATAL: Could not open DB. ${e.message}`);
      return;
    }

    // TEST 2: Write Permission (Add Exercise)
    try {
      addLog("⏳ Attempting to write Test Exercise...");
      const id = await db.exercises.add({
        name: `Test-Ex-${Date.now()}`,
        targetMuscle: 'Test',
        category: 'strength',
        isCustom: true
      });
      addLog(`✅ WRITE SUCCESS! Exercise ID: ${id}`);
    } catch (e: any) {
      addLog(`❌ WRITE FAILED: ${e.message}`);
      addLog(`Type: ${e.name}`);
      console.error(e);
      return; // Stop if write fails
    }

    // TEST 3: Read Verification
    try {
      addLog("⏳ Verifying Data Integrity...");
      const count = await db.exercises.count();
      addLog(`✅ READ SUCCESS! Total Exercises in DB: ${count}`);
    } catch (e: any) {
      addLog(`❌ READ FAILED: ${e.message}`);
    }

    // TEST 4: Routine Structure Test
    try {
      addLog("⏳ Testing Routine Save (Deep Object)...");
      const rId = await db.routines.add({
        name: "Diagnostic Routine",
        elements: [{ exerciseId: 1, targetSets: 3, targetReps: 10, targetWeight: 50 }]
      });
      addLog(`✅ ROUTINE WRITE SUCCESS! ID: ${rId}`);
    } catch (e: any) {
      addLog(`❌ ROUTINE WRITE FAILED: ${e.message}`);
      if (e.name === 'DataCloneError') {
        addLog("💡 HINT: The structure of 'Routine' does not match what IndexedDB expects.");
      }
    }
    
    addLog("--- DIAGNOSTICS COMPLETE ---");
  };

  return (
    <div className="p-8 bg-black text-white min-h-screen font-mono">
      <h1 className="text-2xl font-bold text-red-500 mb-4">IronLog System Diagnostics</h1>
      <button 
        onClick={runDiagnostics} 
        className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded mb-6"
      >
        RUN SYSTEM CHECK
      </button>
      
      <div className="bg-zinc-900 p-4 rounded border border-zinc-700">
        {logs.length === 0 ? (
          <div className="text-zinc-500">Ready to run tests...</div>
        ) : (
          logs.map((log, i) => (
            <div key={i} className={`mb-1 ${log.includes('❌') ? 'text-red-400 font-bold' : log.includes('✅') ? 'text-green-400' : 'text-zinc-300'}`}>
              {log}
            </div>
          ))
        )}
      </div>
    </div>
  );
}