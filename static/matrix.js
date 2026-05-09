// Frontend logic for the alignment page.
// I kept this in one file so the page is easy to follow.

let latestAlignment = null;
let zoomLevel = 1;
let panOffsetX = 0;
let panOffsetY = 0;
let highlightPath = true;
let showLabels = true;
let matrixCanvas = null;
let matrixContext = null;

// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('Loading alignment page...');
    loadExamples();
    setupMatrixCanvas();
});

// Set up the drawing area for the matrix.

function setupMatrixCanvas() {
    matrixCanvas = document.getElementById('matrixCanvas');
    if (!matrixCanvas) return;

    matrixContext = matrixCanvas.getContext('2d');
    resizeMatrixCanvas();

    // Keep the matrix interactive so it feels less static.
    matrixCanvas.addEventListener('wheel', handleCanvasZoom, false);
    matrixCanvas.addEventListener('mousedown', handleCanvasMouseDown, false);
    document.addEventListener('mousemove', handleCanvasMouseMove, false);
    document.addEventListener('mouseup', handleCanvasMouseUp, false);
}

function resizeMatrixCanvas() {
    if (!matrixCanvas) return;

    const container = document.getElementById('matrixContainer');
    if (!container) return;

    const availableWidth = Math.max(container.getBoundingClientRect().width - 20, 320);
    matrixCanvas.width = availableWidth;
    matrixCanvas.height = 420;
}

let draggingCanvas = false;
let dragAnchorX = 0;
let dragAnchorY = 0;

function handleCanvasMouseDown(e) {
    draggingCanvas = true;
    dragAnchorX = e.clientX - panOffsetX;
    dragAnchorY = e.clientY - panOffsetY;
}

function handleCanvasMouseMove(e) {
    if (!draggingCanvas || !matrixCanvas) return;
    panOffsetX = e.clientX - dragAnchorX;
    panOffsetY = e.clientY - dragAnchorY;
    if (latestAlignment) drawMatrix(latestAlignment);
}

function handleCanvasMouseUp() {
    draggingCanvas = false;
}

function handleCanvasZoom(e) {
    if (!matrixCanvas) return;
    e.preventDefault();
    
    const zoomSpeed = 0.1;
    const previousZoom = zoomLevel;
    zoomLevel = Math.max(0.5, Math.min(3, zoomLevel - (e.deltaY > 0 ? zoomSpeed : -zoomSpeed)));
    
    // Keep the spot under the cursor close to where it was.
    const rect = matrixCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    panOffsetX = x - (x - panOffsetX) * (zoomLevel / previousZoom);
    panOffsetY = y - (y - panOffsetY) * (zoomLevel / previousZoom);
    
    if (latestAlignment) drawMatrix(latestAlignment);
}

// Load the example sequences shown on the page.

function loadExamples() {
    fetch('/api/examples')
        .then(response => response.json())
        .then(examples => {
            const container = document.getElementById('examplesContainer');
            container.innerHTML = '';
            
            examples.forEach(example => {
                const btn = document.createElement('button');
                btn.className = 'example-btn';
                btn.innerHTML = `
                    <div class="example-btn-title">${example.name}</div>
                    <div class="example-btn-desc">${example.description}</div>
                `;
                btn.onclick = () => loadExample(example);
                container.appendChild(btn);
            });
        })
        .catch(error => {
            console.error('Error loading examples:', error);
            showError('Failed to load examples');
        });
}

function loadExample(example) {
    document.getElementById('seq1').value = example.seq1;
    document.getElementById('seq2').value = example.seq2;
    updateSequenceInfo();
}

// Keep the little counter under each box in sync.

function updateSequenceInfo() {
    const seq1 = document.getElementById('seq1').value.trim();
    const seq2 = document.getElementById('seq2').value.trim();
    
    document.getElementById('seq1-info').textContent = seq1 ? `${seq1.length} characters` : '';
    document.getElementById('seq2-info').textContent = seq2 ? `${seq2.length} characters` : '';
}

document.getElementById('seq1')?.addEventListener('input', updateSequenceInfo);
document.getElementById('seq2')?.addEventListener('input', updateSequenceInfo);

// Reset the scoring values back to the defaults.

function resetMatchScore() {
    document.getElementById('matchScore').value = '5';
}

function resetMismatchPenalty() {
    document.getElementById('mismatchPenalty').value = '-3';
}

function resetGapPenalty() {
    document.getElementById('gapPenalty').value = '-4';
}

// Send the sequences to the backend and show the answer.

async function performAlignment() {
    const seq1 = document.getElementById('seq1').value.trim();
    const seq2 = document.getElementById('seq2').value.trim();
    const matchScore = parseInt(document.getElementById('matchScore').value);
    const mismatchPenalty = parseInt(document.getElementById('mismatchPenalty').value);
    const gapPenalty = parseInt(document.getElementById('gapPenalty').value);
    
    if (!seq1 || !seq2) {
        showError('Please enter both sequences');
        return;
    }
    
    if (!/^[a-zA-Z]+$/.test(seq1)) {
        showError('Sequence 1 contains invalid characters. Use only letters.');
        return;
    }
    
    if (!/^[a-zA-Z]+$/.test(seq2)) {
        showError('Sequence 2 contains invalid characters. Use only letters.');
        return;
    }
    
    if (seq1.length > 1000 || seq2.length > 1000) {
        showError('Sequences must be 1000 characters or less');
        return;
    }
    
    showLoading(true);
    hideError();
    
    try {
        const response = await fetch('/api/align', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                seq1: seq1,
                seq2: seq2,
                match_score: matchScore,
                mismatch_penalty: mismatchPenalty,
                gap_penalty: gapPenalty
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            showError(data.error || 'Alignment failed');
            return;
        }
        
        latestAlignment = data;
        displayResults(data);
        zoomLevel = 1;
        panOffsetX = 0;
        panOffsetY = 0;
        
    } catch (error) {
        console.error('Alignment error:', error);
        showError('An error occurred during alignment');
    } finally {
        showLoading(false);
    }
}

// Put the finished result on screen.

function displayResults(result) {
    const resultsSection = document.getElementById('resultsSection');
    resultsSection.classList.remove('hidden');
    resultsSection.scrollIntoView({ behavior: 'smooth' });
    
    document.getElementById('optimalScore').textContent = result.optimal_score;
    document.getElementById('similarityScore').textContent = result.analysis.similarity + '%';
    document.getElementById('matchesCount').textContent = result.analysis.matches;
    document.getElementById('mismatchesCount').textContent = result.analysis.mismatches;
    document.getElementById('gapsCount').textContent = result.analysis.gaps;
    
    document.getElementById('alignedSeq1').textContent = result.aligned_seq1;
    document.getElementById('alignedSeq2').textContent = result.aligned_seq2;
    document.getElementById('matchIndicators').textContent = result.match_indicators;
    
    resizeMatrixCanvas();

    drawMatrix(result);
    
    displayAnalysis(result);
    displayExplanation(result);
    displayInfo(result);
}

// Draw the matrix onto the canvas.

function drawMatrix(result) {
    const matrixData = result ? (result.score_matrix || result.matrix) : null;
    if (!matrixCanvas || !matrixContext || !result || !matrixData) return;

    resizeMatrixCanvas();
    
    const ctx = matrixContext;
    const matrix = matrixData;
    const seq1 = result.seq1_original || '';
    const seq2 = result.seq2_original || '';
    
    if (typeof seq1 !== 'string' || typeof seq2 !== 'string') return;
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, matrixCanvas.width, matrixCanvas.height);
    
    ctx.save();
    
    ctx.translate(panOffsetX, panOffsetY);
    ctx.scale(zoomLevel, zoomLevel);
    
    const cellSize = 40;
    const labelWidth = 40;
    const labelHeight = 40;

    const matrixWidth = labelWidth + (matrix[0].length * cellSize) + 20;
    const matrixHeight = labelHeight + (matrix.length * cellSize) + 20;

    if (matrixCanvas.width < matrixWidth) {
        matrixCanvas.width = matrixWidth;
    }
    if (matrixCanvas.height < matrixHeight) {
        matrixCanvas.height = matrixHeight;
    }
    
    // Top row shows sequence 2.
    ctx.fillStyle = '#2563eb';
    ctx.fillRect(labelWidth, 0, cellSize * seq2.length, labelHeight);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    if (showLabels) {
        for (let j = 0; j < seq2.length; j++) {
            ctx.fillText(seq2[j], labelWidth + j * cellSize + cellSize / 2, labelHeight / 2);
        }
    }
    
    // Left side shows sequence 1.
    ctx.fillStyle = '#2563eb';
    ctx.fillRect(0, labelHeight, labelWidth, cellSize * seq1.length);
    
    ctx.fillStyle = '#ffffff';
    if (showLabels) {
        for (let i = 0; i < seq1.length; i++) {
            ctx.fillText(seq1[i], labelWidth / 2, labelHeight + i * cellSize + cellSize / 2);
        }
    }
    
    // Draw the main score table.
    for (let i = 0; i < matrix.length; i++) {
        for (let j = 0; j < matrix[i].length; j++) {
            const x = labelWidth + j * cellSize;
            const y = labelHeight + i * cellSize;
            
            const inPath = result.alignment_path.some(p => p[0] === i && p[1] === j);
            
            if (inPath && highlightPath) {
                ctx.fillStyle = '#dcfce7';
                ctx.strokeStyle = '#22c55e';
                ctx.lineWidth = 2;
            } else {
                ctx.fillStyle = '#f0f4f8';
                ctx.strokeStyle = '#e2e8f0';
                ctx.lineWidth = 1;
            }
            
            ctx.fillRect(x, y, cellSize, cellSize);
            ctx.strokeRect(x, y, cellSize, cellSize);
            
            ctx.fillStyle = inPath && highlightPath ? '#22c55e' : '#1e293b';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(matrix[i][j], x + cellSize / 2, y + cellSize / 2);
        }
    }
    
    ctx.restore();
}

// ============================================================
// ANALYSIS DISPLAY
// ============================================================

function displayAnalysis(result) {
    const analysis = result.analysis;
    const html = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
            <div style="padding: 1rem; background: #f0f9ff; border-radius: 8px; border-left: 4px solid #3b82f6;">
                <strong>Total Positions:</strong> ${analysis.total_positions}
            </div>
            <div style="padding: 1rem; background: #f0fdf4; border-radius: 8px; border-left: 4px solid #22c55e;">
                <strong>Matches:</strong> ${analysis.matches} (${analysis.similarity}%)
            </div>
            <div style="padding: 1rem; background: #fef2f2; border-radius: 8px; border-left: 4px solid #ef4444;">
                <strong>Mismatches:</strong> ${analysis.mismatches}
            </div>
            <div style="padding: 1rem; background: #fffbeb; border-radius: 8px; border-left: 4px solid #f59e0b;">
                <strong>Gaps:</strong> ${analysis.gaps}
            </div>
        </div>
        <div style="margin-top: 1.5rem; padding: 1rem; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
            <h4 style="margin-bottom: 0.5rem;">Interpretation</h4>
            <p>The alignment shows <strong>${analysis.similarity}%</strong> similarity between the two sequences. 
            This is determined by matching positions out of total aligned positions.</p>
        </div>
    `;
    document.getElementById('analysisContent').innerHTML = html;
}

function displayExplanation(result) {
    const explanation = result.explanation;
    let html = '<div style="background: #f0f4f8; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">';
    html += explanation.summary.replace(/\n/g, '<br>');
    html += '</div>';
    
    // Show first 10 steps
    const steps = explanation.step_explanations.slice(0, 10);
    for (const step of steps) {
        html += `
            <div class="step-explanation">
                <span class="step-number">Position ${step.position}:</span>
                <div class="step-text">'${step.seq1_char}' → '${step.seq2_char}' | Score: ${step.score_change} (Running: ${step.running_score})</div>
                <div class="step-text" style="margin-top: 0.5rem; font-style: italic;">${step.explanation}</div>
            </div>
        `;
    }
    
    if (explanation.step_explanations.length > 10) {
        html += `<p style="text-align: center; color: #64748b; font-style: italic;">
            ... and ${explanation.step_explanations.length - 10} more steps
        </p>`;
    }
    
    document.getElementById('explanationContent').innerHTML = html;
}

function displayInfo(result) {
    const params = result.parameters;
    const html = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem;">
            <div>
                <h4 style="margin-bottom: 0.5rem;">Algorithm Parameters</h4>
                <p><strong>Match Score:</strong> ${params.match_score}</p>
                <p><strong>Mismatch Penalty:</strong> ${params.mismatch_penalty}</p>
                <p><strong>Gap Penalty:</strong> ${params.gap_penalty}</p>
            </div>
            <div>
                <h4 style="margin-bottom: 0.5rem;">About Needleman-Wunsch</h4>
                <p>The Needleman-Wunsch algorithm performs <strong>global sequence alignment</strong> using dynamic programming. 
                It finds the optimal way to align entire sequences, considering matches, mismatches, and gaps.</p>
            </div>
            <div>
                <h4 style="margin-bottom: 0.5rem;">What the Score Means</h4>
                <p>The optimal score of <strong>${result.optimal_score}</strong> represents the overall quality of the alignment. 
                Higher scores indicate better alignment given the scoring parameters.</p>
            </div>
        </div>
    `;
    document.getElementById('infoContent').innerHTML = html;
}

// ============================================================
// TAB SWITCHING
// ============================================================

function switchTab(tabName, ev) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Deactivate all buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(tabName).classList.add('active');
    
    // Activate button (use the provided event if available)
    const target = ev && ev.target ? ev.target : (window.event && window.event.target);
    if (target) target.classList.add('active');
}

// ============================================================
// MATRIX CONTROLS
// ============================================================

function togglePathHighlight() {
    highlightPath = document.getElementById('highlightPath').checked;
    if (latestAlignment) drawMatrix(latestAlignment);
}

function toggleMatrixLabels() {
    showLabels = document.getElementById('showLabels').checked;
    if (latestAlignment) drawMatrix(latestAlignment);
}

// ============================================================
// EXPORT FUNCTIONS
// ============================================================

function exportToJSON() {
    if (!latestAlignment) {
        showError('No results to export');
        return;
    }
    
    const dataStr = JSON.stringify(latestAlignment, null, 2);
    downloadFile(dataStr, 'alignment-results.json', 'application/json');
}

function exportToCSV() {
    if (!latestAlignment) {
        showError('No results to export');
        return;
    }
    
    let csv = 'Sequence Alignment Results\n\n';
    csv += `Original Sequence 1,${latestAlignment.seq1_original}\n`;
    csv += `Original Sequence 2,${latestAlignment.seq2_original}\n`;
    csv += `Aligned Sequence 1,${latestAlignment.aligned_seq1}\n`;
    csv += `Aligned Sequence 2,${latestAlignment.aligned_seq2}\n`;
    csv += `Optimal Score,${latestAlignment.optimal_score}\n`;
    csv += `\nAnalysis\n`;
    csv += `Total Positions,${latestAlignment.analysis.total_positions}\n`;
    csv += `Matches,${latestAlignment.analysis.matches}\n`;
    csv += `Mismatches,${latestAlignment.analysis.mismatches}\n`;
    csv += `Gaps,${latestAlignment.analysis.gaps}\n`;
    csv += `Similarity,${latestAlignment.analysis.similarity}%\n`;
    
    downloadFile(csv, 'alignment-results.csv', 'text/csv');
}

function exportToText() {
    if (!latestAlignment) {
        showError('No results to export');
        return;
    }
    
    let text = '==================================================\n';
    text += 'NEEDLEMAN-WUNSCH SEQUENCE ALIGNMENT RESULTS\n';
    text += '==================================================\n\n';
    
    text += 'ORIGINAL SEQUENCES\n';
    text += 'Sequence 1: ' + latestAlignment.seq1_original + '\n';
    text += 'Sequence 2: ' + latestAlignment.seq2_original + '\n\n';
    
    text += 'ALIGNED SEQUENCES\n';
    text += 'Seq 1: ' + latestAlignment.aligned_seq1 + '\n';
    text += 'Match: ' + latestAlignment.match_indicators + '\n';
    text += 'Seq 2: ' + latestAlignment.aligned_seq2 + '\n\n';
    
    text += 'ANALYSIS\n';
    text += 'Optimal Score: ' + latestAlignment.optimal_score + '\n';
    text += 'Total Positions: ' + latestAlignment.analysis.total_positions + '\n';
    text += 'Matches: ' + latestAlignment.analysis.matches + '\n';
    text += 'Mismatches: ' + latestAlignment.analysis.mismatches + '\n';
    text += 'Gaps: ' + latestAlignment.analysis.gaps + '\n';
    text += 'Similarity: ' + latestAlignment.analysis.similarity + '%\n';
    
    downloadFile(text, 'alignment-results.txt', 'text/plain');
}

function downloadFile(content, filename, mimeType) {
    const element = document.createElement('a');
    element.setAttribute('href', 'data:' + mimeType + ';charset=utf-8,' + encodeURIComponent(content));
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

// ============================================================
// UI STATE MANAGEMENT
// ============================================================

function showLoading(show) {
    const indicator = document.getElementById('loadingIndicator');
    const alignBtn = document.getElementById('alignBtn');
    
    if (show) {
        indicator.classList.remove('hidden');
        alignBtn.disabled = true;
    } else {
        indicator.classList.add('hidden');
        alignBtn.disabled = false;
    }
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
}

function hideError() {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.classList.add('hidden');
}

function clearAll() {
    document.getElementById('seq1').value = '';
    document.getElementById('seq2').value = '';
    document.getElementById('seq1-info').textContent = '';
    document.getElementById('seq2-info').textContent = '';
    document.getElementById('resultsSection').classList.add('hidden');
    hideError();
    latestAlignment = null;
}

// ============================================================
// KEYBOARD SHORTCUTS
// ============================================================

document.addEventListener('keydown', function(event) {
    // Ctrl/Cmd + Enter to perform alignment
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        performAlignment();
    }
});
