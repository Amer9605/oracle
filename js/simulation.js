import { addLogEntry } from './utils.js';
import { initArchitectureSVG, updateArchitecture, animateComponentGlow, shootArchParticle } from './architecture.js';
import { initDataGuardSVG, simulateRedoTransport, performSwitchoverVisuals, performFailoverVisuals } from './dataguard.js';

const state = {
    primaryStatus: 'UP',
    standbyStatus: 'UP',
    scn: 1000000,
    standbyScn: 1000000,
    redoBufferLevel: 0,
    dirtyBuffers: 0,
    applyQueue: 0
};

document.addEventListener('DOMContentLoaded', () => {
    initArchitectureSVG('arch-container');
    initDataGuardSVG('dg-container');
    addLogEntry('Oracle 19c Enterprise Simulator Initialized.', 'success');
    addLogEntry('Instance started. SGA allocated. Background processes started.', 'info');
    
    // UI Event Listeners
    document.getElementById('slide-latency').addEventListener('input', (e) => document.getElementById('val-latency').textContent = e.target.value);
    
    document.getElementById('btn-select').addEventListener('click', executeSelect);
    document.getElementById('btn-update').addEventListener('click', executeUpdate);
    document.getElementById('btn-ckpt').addEventListener('click', forceCheckpoint);
    document.getElementById('btn-logswitch').addEventListener('click', switchRedoLog);
    document.getElementById('btn-awr').addEventListener('click', awrSnapshot);
    document.getElementById('btn-im').addEventListener('click', populateIM);
    
    document.getElementById('btn-failover').addEventListener('click', simulatePrimaryFailure);
    document.getElementById('btn-switchover').addEventListener('click', executeSwitchover);
    
    setInterval(simulateMMNL, 8000);
});

function updateSCN(amount) {
    state.scn += amount;
    document.getElementById('scn-counter').textContent = state.scn;
    updateLag();
}

function updateLag() {
    const lag = state.scn - state.standbyScn;
    const badge = document.getElementById('lag-indicator');
    badge.textContent = lag === 0 ? 'In Sync (Lag: 0 SCN)' : `Apply Lag: ${lag} SCN`;
    badge.className = lag === 0 ? 'lag-badge' : 'lag-badge error';
}

function executeSelect() {
    if(state.primaryStatus !== 'UP') return addLogEntry('ORA-01034: ORACLE not available', 'error');
    
    addLogEntry('Client requesting SQL SELECT...', 'info');
    shootArchParticle('parse', 400); // User -> Shared Pool
    
    setTimeout(() => {
        const isHit = Math.random() > 0.4;
        if(isHit) {
            addLogEntry('Wait Event: SQL*Net message from client.', 'info');
            addLogEntry('Library Cache Hit (Soft Parse). Buffer Cache Hit (Logical Read).', 'success');
            animateComponentGlow('arch_BufferCache', 'read');
            shootArchParticle('fetch', 600); // Buffer Cache -> User
        } else {
            addLogEntry('Library Cache Miss (Hard Parse). Generating Execution Plan.', 'warn');
            addLogEntry('Wait Event: db file sequential read (Physical Read).', 'warn');
            
            shootArchParticle('readDisk', 800); // DataFile -> Buffer Cache
            animateComponentGlow('disk_DataFiles', 'read');
            
            setTimeout(() => {
                animateComponentGlow('arch_BufferCache', 'read');
                shootArchParticle('fetch', 600); // Buffer Cache -> User
                addLogEntry('Rows fetched to PGA and returned to Client.', 'success');
            }, 800);
        }
    }, 400);
}

function executeUpdate() {
    if(state.primaryStatus !== 'UP') return addLogEntry('ORA-01034: ORACLE not available', 'error');
    
    const burst = parseInt(document.getElementById('slide-dml').value);
    addLogEntry(`Executing DML UPDATE... (Rows: ${burst})`, 'highlight');
    
    shootArchParticle('parse', 300);
    setTimeout(() => {
        state.dirtyBuffers += burst;
        state.redoBufferLevel += burst * 3;
        
        shootArchParticle('redoGen', 500); // User -> Redo Buffer
        animateComponentGlow('arch_BufferCache', 'write');
        updateArchitecture(state);
        
        addLogEntry(`Blocks dirtied. Redo entries written to Log Buffer.`, 'info');
        
        if(state.redoBufferLevel >= 100) {
            addLogEntry('Redo Log Buffer filled. LGWR triggering...', 'warn');
            state.redoBufferLevel = 0;
            updateArchitecture(state);
            
            animateComponentGlow('proc_LGWR', 'write');
            shootArchParticle('lgwrWrite', 400); // LGWR -> Redo Disks
            
            setTimeout(() => {
                animateComponentGlow('disk_OnlineRedo', 'write');
                addLogEntry('Wait Event: log file parallel write. LGWR write complete.', 'success');
                updateSCN(Math.floor(Math.random() * 50) + 10);
                triggerTransport();
            }, 400);
        }
    }, 300);
}

function triggerTransport() {
    if(state.standbyStatus !== 'UP') return;
    const latency = parseInt(document.getElementById('slide-latency').value);
    const mode = document.getElementById('sel-protection').value;
    
    addLogEntry(`LNS shipping redo to Standby (Mode: ${mode})...`, 'info');
    simulateRedoTransport(latency + 500);
    
    setTimeout(() => {
        state.applyQueue++;
        addLogEntry('RFS received redo payload. Writing to Standby Redo Log.', 'success');
        applyRedo();
    }, latency + 500);
}

function applyRedo() {
    if(state.applyQueue > 0) {
        addLogEntry('MRP (Media Recovery Process) applying redo to Standby...', 'info');
        setTimeout(() => {
            state.applyQueue--;
            state.standbyScn = state.scn;
            updateLag();
            addLogEntry('MRP apply complete. Standby SCN updated.', 'success');
        }, 800);
    }
}

function forceCheckpoint() {
    if(state.primaryStatus !== 'UP') return;
    addLogEntry('ALTER SYSTEM CHECKPOINT; Command Issued.', 'highlight');
    
    animateComponentGlow('proc_CKPT', 'write');
    shootArchParticle('ckptToControl', 600); // CKPT -> Control file
    addLogEntry('CKPT updating Control Files and Data File headers.', 'info');
    
    setTimeout(() => {
        if(state.dirtyBuffers > 0) {
            addLogEntry(`DBWn triggering to write ${state.dirtyBuffers} dirty buffers.`, 'warn');
            animateComponentGlow('proc_DBWn', 'write');
            shootArchParticle('dbwWrite', 800); // Buffer Cache -> Data File
            
            setTimeout(() => {
                animateComponentGlow('disk_DataFiles', 'write');
                addLogEntry('Wait Event: db file parallel write. Checkpoint complete.', 'success');
                state.dirtyBuffers = 0;
            }, 800);
        } else {
            addLogEntry('Checkpoint complete. No dirty buffers in queue.', 'success');
        }
    }, 600);
}

function switchRedoLog() {
    if(state.primaryStatus !== 'UP') return;
    addLogEntry('ALTER SYSTEM SWITCH LOGFILE; Command Issued.', 'highlight');
    animateComponentGlow('proc_LGWR', 'write');
    
    setTimeout(() => {
        addLogEntry('ARCn (Archiver) process started archiving filled redo log.', 'warn');
        animateComponentGlow('proc_ARCn', 'write');
        setTimeout(() => {
            animateComponentGlow('disk_ArchiveLogs', 'write');
            addLogEntry('Archiving complete. Online Redo log available for reuse.', 'success');
        }, 800);
    }, 500);
}

function awrSnapshot() {
    if(state.primaryStatus !== 'UP') return;
    addLogEntry('MMON (Manageability Monitor) capturing AWR Snapshot.', 'info');
    animateComponentGlow('proc_MMON', 'read');
}

function populateIM() {
    if(state.primaryStatus !== 'UP') return;
    addLogEntry('IMCO (In-Memory Coordinator) populating IMCUs.', 'info');
    animateComponentGlow('arch_InMemory', 'write');
}

function simulateMMNL() {
    if(state.primaryStatus === 'UP') {
        addLogEntry('MMNL flushing ASH (Active Session History) buffer to disk.', 'info');
    }
}

function simulatePrimaryFailure() {
    addLogEntry('CRITICAL: ORA-01092: ORACLE instance terminated. Disconnection forced.', 'error');
    state.primaryStatus = 'DOWN';
    
    document.getElementById('left-title').textContent = 'FAILED PRIMARY DATABASE';
    document.querySelector('.status-indicator.online').className = 'status-indicator offline';
    document.querySelector('.status-indicator.offline').textContent = 'OFFLINE';
    
    // Disable primary controls
    ['btn-select', 'btn-update', 'btn-ckpt', 'btn-logswitch', 'btn-awr', 'btn-im', 'btn-switchover'].forEach(id => {
        document.getElementById(id).disabled = true;
    });

    performFailoverVisuals();
    
    const btn = document.getElementById('btn-failover');
    btn.textContent = 'EXECUTE FAILOVER (ACTIVATE)';
    btn.className = 'btn-warning';
    btn.onclick = executeFailover;
}

function executeFailover() {
    addLogEntry('ALTER DATABASE RECOVER MANAGED STANDBY DATABASE CANCEL;', 'warn');
    addLogEntry('ALTER DATABASE FAILOVER TO target_standby;', 'highlight');
    
    applyRedo(); // Apply remaining
    setTimeout(() => {
        addLogEntry('Standby transitioning to PRIMARY role. Opening database...', 'success');
        state.standbyStatus = 'PRIMARY';
        document.getElementById('right-title').textContent = 'NEW PRIMARY DATABASE';
        document.getElementById('primary-role').textContent = 'FAILOVER COMPLETED';
        document.getElementById('btn-failover').disabled = true;
    }, 2000);
}

function executeSwitchover() {
    if(state.primaryStatus !== 'UP' || state.standbyStatus !== 'UP') return addLogEntry('Instances must be UP for Switchover.', 'error');
    addLogEntry('ALTER DATABASE COMMIT TO SWITCHOVER TO PHYSICAL STANDBY;', 'warn');
    
    setTimeout(() => {
        addLogEntry('Primary shipping End-Of-Redo (EOR) to Standby.', 'info');
        triggerTransport(); // Ensure last redo is shipped
        
        setTimeout(() => {
            addLogEntry('Target Standby applied all redo (Zero Data Loss).', 'info');
            state.standbyScn = state.scn;
            updateLag();
            
            setTimeout(() => {
                addLogEntry('Role transition complete. Target opened read/write.', 'success');
                performSwitchoverVisuals();
                document.getElementById('primary-role').textContent = 'SWITCHOVER COMPLETED';
            }, 1500);
        }, 1500);
    }, 1000);
}
