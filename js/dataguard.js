import { createSVGRect, createSVGText, createSVGPath } from './utils.js';

let svg, particles = [];

export function initDataGuardSVG(containerId) {
    const container = document.getElementById(containerId);
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 1200 350');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    
    // Draw Primary Side (Left box)
    const primGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    primGroup.id = 'dg_primary';
    primGroup.appendChild(createSVGRect(100, 50, 300, 250, 10, 'rgba(0,0,0,0.4)', '#3b82f6', 2));
    primGroup.appendChild(createSVGText(250, 80, 'PRIMARY DATABASE', '#93c5fd', 18, 'middle', 'bold'));
    
    primGroup.appendChild(createSVGRect(150, 120, 200, 60, 6, '#1e293b', '#ef4444', 1));
    primGroup.appendChild(createSVGText(250, 155, 'LNS / LGWR', '#fff', 15));
    
    primGroup.appendChild(createSVGRect(150, 210, 200, 60, 6, '#1e293b', '#eab308', 1));
    primGroup.appendChild(createSVGText(250, 245, 'Online Redo Logs', '#fff', 14));
    svg.appendChild(primGroup);
    
    // Draw Standby Side (Right box)
    const stdGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    stdGroup.id = 'dg_standby';
    stdGroup.appendChild(createSVGRect(800, 50, 300, 250, 10, 'rgba(0,0,0,0.4)', '#10b981', 2));
    stdGroup.appendChild(createSVGText(950, 80, 'PHYSICAL STANDBY', '#6ee7b7', 18, 'middle', 'bold'));
    
    stdGroup.appendChild(createSVGRect(850, 120, 200, 60, 6, '#1e293b', '#ef4444', 1));
    stdGroup.appendChild(createSVGText(950, 155, 'RFS Process', '#fff', 15));
    
    stdGroup.appendChild(createSVGRect(850, 210, 90, 60, 6, '#1e293b', '#eab308', 1));
    stdGroup.appendChild(createSVGText(895, 245, 'Standby Redo', '#fff', 12));
    
    stdGroup.appendChild(createSVGRect(960, 210, 90, 60, 6, '#1e293b', '#10b981', 1));
    stdGroup.appendChild(createSVGText(1005, 245, 'MRP (Apply)', '#fff', 13));
    svg.appendChild(stdGroup);

    // Network Path (Oracle Net)
    const path = createSVGPath('M 350,150 L 850,150', '#ef4444', 4, '8,8');
    path.style.opacity = '0.5';
    svg.appendChild(path);
    svg.appendChild(createSVGText(600, 140, 'Oracle Net (Redo Transport)', '#94a3b8', 14));

    container.appendChild(svg);
    requestAnimationFrame(renderParticles);
}

function renderParticles(time) {
    particles = particles.filter(p => {
        p.progress = (time - p.startTime) / p.duration;
        if(p.progress >= 1) {
            if(p.el.parentNode) svg.removeChild(p.el);
            return false;
        }
        p.el.setAttribute('cx', p.startX + (p.endX - p.startX) * p.progress);
        return true;
    });
    requestAnimationFrame(renderParticles);
}

export function simulateRedoTransport(latencyMs) {
    const particle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    particle.setAttribute('r', 8);
    particle.setAttribute('fill', '#ef4444');
    particle.setAttribute('cy', 150);
    particle.setAttribute('filter', 'drop-shadow(0 0 10px #ef4444)');
    svg.appendChild(particle);
    
    particles.push({
        el: particle, startX: 350, endX: 850,
        startTime: performance.now(), duration: latencyMs, progress: 0
    });
}

export function performSwitchoverVisuals() {
    document.querySelector('#dg_primary text').textContent = 'NEW STANDBY';
    document.querySelector('#dg_primary text').setAttribute('fill', '#6ee7b7');
    document.querySelector('#dg_primary rect').setAttribute('stroke', '#10b981');
    
    document.querySelector('#dg_standby text').textContent = 'NEW PRIMARY';
    document.querySelector('#dg_standby text').setAttribute('fill', '#93c5fd');
    document.querySelector('#dg_standby rect').setAttribute('stroke', '#3b82f6');
}

export function performFailoverVisuals() {
    document.querySelector('#dg_primary rect').setAttribute('stroke', '#475569');
    document.querySelector('#dg_primary text').textContent = 'FAILED PRIMARY';
    document.querySelector('#dg_primary text').setAttribute('fill', '#ef4444');
    
    document.querySelector('#dg_standby text').textContent = 'NEW PRIMARY';
    document.querySelector('#dg_standby text').setAttribute('fill', '#93c5fd');
    document.querySelector('#dg_standby rect').setAttribute('stroke', '#3b82f6');
}
