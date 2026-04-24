export function formatTimestamp() {
    const now = new Date();
    return `[${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}]`;
}

export function addLogEntry(message, type = 'info') {
    const logContainer = document.getElementById('event-log');
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    
    entry.innerHTML = `<span class="log-time">${formatTimestamp()}</span><span class="log-${type}">${message}</span>`;
    
    logContainer.appendChild(entry);
    logContainer.scrollTop = logContainer.scrollHeight;
}

export function showTooltip(e, title, desc) {
    const tooltip = document.getElementById('tooltip');
    tooltip.innerHTML = `<div class="tooltip-title">${title}</div><div>${desc}</div>`;
    tooltip.classList.remove('hidden');
    tooltip.style.opacity = '1';
    
    tooltip.style.left = `${e.pageX + 15}px`;
    tooltip.style.top = `${e.pageY + 15}px`;
}

export function hideTooltip() {
    const tooltip = document.getElementById('tooltip');
    tooltip.style.opacity = '0';
    setTimeout(() => tooltip.classList.add('hidden'), 200);
}

export function createSVGRect(x, y, w, h, rx, fill, stroke, strokeWidth) {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', x); rect.setAttribute('y', y);
    rect.setAttribute('width', w); rect.setAttribute('height', h);
    rect.setAttribute('rx', rx);
    rect.setAttribute('fill', fill);
    rect.setAttribute('stroke', stroke);
    rect.setAttribute('stroke-width', strokeWidth);
    return rect;
}

export function createSVGText(x, y, textContent, fill, fontSize, anchor='middle', fontWeight='500') {
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', x); text.setAttribute('y', y);
    text.setAttribute('fill', fill); text.setAttribute('font-size', fontSize);
    text.setAttribute('text-anchor', anchor);
    text.setAttribute('font-family', 'sans-serif');
    text.setAttribute('font-weight', fontWeight);
    text.textContent = textContent;
    return text;
}

export function createSVGPath(d, stroke, strokeWidth, dasharray = '') {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', stroke);
    path.setAttribute('stroke-width', strokeWidth);
    if(dasharray) path.setAttribute('stroke-dasharray', dasharray);
    return path;
}
