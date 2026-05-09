"""
Flask app for the Needleman-Wunsch alignment project.
It serves the page and gives the frontend the alignment results.
"""

from flask import Flask, render_template, request, jsonify
import json
from alignment_logic import NeedlemanWunsch
from scoring import get_match_mismatch_count
from explanation import get_full_alignment_explanation

app = Flask(__name__)

# Keep the most recent result around for debugging and simple reuse.
last_alignment_result = None


@app.route('/')
def index():
    """Show the main page."""
    return render_template('index.html')


@app.route('/api/align', methods=['POST'])
def align_sequences():
    """Align two sequences and return the result as JSON."""
    try:
        data = request.get_json()
        
        seq1 = data.get('seq1', '').strip()
        seq2 = data.get('seq2', '').strip()
        match_score = int(data.get('match_score', 5))
        mismatch_penalty = int(data.get('mismatch_penalty', -3))
        gap_penalty = int(data.get('gap_penalty', -4))
        
        if not seq1 or not seq2:
            return jsonify({'error': 'Both sequences are required'}), 400
        
        if not all(c.isalpha() for c in seq1):
            return jsonify({'error': 'Sequence 1 contains invalid characters'}), 400
        
        if not all(c.isalpha() for c in seq2):
            return jsonify({'error': 'Sequence 2 contains invalid characters'}), 400
        
        if len(seq1) > 1000 or len(seq2) > 1000:
            return jsonify({'error': 'Sequences must be 1000 characters or less'}), 400
        
        aligner = NeedlemanWunsch(seq1, seq2, match_score, mismatch_penalty, gap_penalty)
        alignment_result = aligner.align()
        
        analysis = get_match_mismatch_count(alignment_result['aligned_seq1'], alignment_result['aligned_seq2'])
        
        explanation = get_full_alignment_explanation(
            alignment_result['aligned_seq1'],
            alignment_result['aligned_seq2'],
            match_score,
            mismatch_penalty,
            gap_penalty,
            alignment_result['optimal_score']
        )
        
        match_indicators = aligner.get_match_indicators()
        
        result_payload = {
            'status': 'success',
            'aligned_seq1': alignment_result['aligned_seq1'],
            'aligned_seq2': alignment_result['aligned_seq2'],
            'optimal_score': alignment_result['optimal_score'],
            'match_indicators': match_indicators,
            'analysis': analysis,
            'explanation': explanation,
            'matrix': alignment_result['score_matrix'],
            'alignment_path': alignment_result['alignment_path'],
            'matrix_rows': alignment_result['matrix_rows'],
            'matrix_cols': alignment_result['matrix_cols'],
            'seq1_original': alignment_result['seq1_original'],
            'seq2_original': alignment_result['seq2_original'],
            'parameters': {
                'match_score': match_score,
                'mismatch_penalty': mismatch_penalty,
                'gap_penalty': gap_penalty
            }
        }
        
        global last_alignment_result
        last_alignment_result = result_payload
        
        return jsonify(result_payload)
    
    except ValueError as e:
        return jsonify({'error': f'Invalid input: {str(e)}'}), 400
    except Exception as e:
        return jsonify({'error': f'An error occurred: {str(e)}'}), 500


@app.route('/api/examples', methods=['GET'])
def get_examples():
    """Return a few example sequences the user can try right away."""
    examples = [
        {
            'name': 'DNA Sequences - Similar',
            'seq1': 'GAATTCAGTTA',
            'seq2': 'GGATCGA',
            'description': 'Two similar DNA sequences'
        },
        {
            'name': 'DNA Sequences - Variants',
            'seq1': 'ACGTACGTACGT',
            'seq2': 'ACGTACGTACGT',
            'description': 'Identical sequences (perfect match)'
        },
        {
            'name': 'Protein Sequences',
            'seq1': 'MVHLTPEEKS',
            'seq2': 'MSVLS',
            'description': 'Sample protein sequences'
        },
        {
            'name': 'Short DNA Test',
            'seq1': 'AGGCTATGCTG',
            'seq2': 'TAGCTAGCTAG',
            'description': 'Moderate similarity test'
        },
        {
            'name': 'RNA Sequences',
            'seq1': 'AUGCUAGCUAG',
            'seq2': 'AUGACUACUAC',
            'description': 'RNA sequences'
        }
    ]
    
    return jsonify(examples)


@app.route('/api/validate', methods=['POST'])
def validate_input():
    """Check the input before alignment starts."""
    try:
        data = request.get_json()
        seq1 = data.get('seq1', '').strip()
        seq2 = data.get('seq2', '').strip()
        
        errors = []
        
        if not seq1:
            errors.append('Sequence 1 is required')
        elif not all(c.isalpha() for c in seq1):
            errors.append('Sequence 1 contains invalid characters')
        elif len(seq1) > 1000:
            errors.append('Sequence 1 must be 1000 characters or less')
        
        if not seq2:
            errors.append('Sequence 2 is required')
        elif not all(c.isalpha() for c in seq2):
            errors.append('Sequence 2 contains invalid characters')
        elif len(seq2) > 1000:
            errors.append('Sequence 2 must be 1000 characters or less')
        
        if errors:
            return jsonify({'valid': False, 'errors': errors})
        
        return jsonify({
            'valid': True,
            'info': f'Ready to align {len(seq1)} vs {len(seq2)} characters'
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
