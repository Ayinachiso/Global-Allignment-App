"""Small helpers that turn an alignment into a readable story.

The functions here are intentionally written in plain English so the
UI can show explanations that sound like a person wrote them.
"""


def explain_alignment_step(seq1_char, seq2_char, score_change, gap_penalty):
    """Return a simple sentence describing one aligned column.

    The text is concise and easy to read in the UI.
    """
    if seq1_char == '-':
        return f"Inserted gap in sequence 1 to align '{seq2_char}'. Penalty {gap_penalty}."
    if seq2_char == '-':
        return f"Inserted gap in sequence 2 to align '{seq1_char}'. Penalty {gap_penalty}."
    if seq1_char == seq2_char:
        return f"Match: '{seq1_char}' with '{seq2_char}' (+{score_change})."
    return f"Mismatch: '{seq1_char}' with '{seq2_char}' ({score_change})."


def get_full_alignment_explanation(aligned_seq1, aligned_seq2, match_score,
                                   mismatch_penalty, gap_penalty, optimal_score):
    """Build a short summary and a list of step explanations.

    Returns a dict with a friendly `summary` string and a list of
    `step_explanations` suitable for the UI.
    """
    total_matches = 0
    total_mismatches = 0
    total_gaps = 0
    step_explanations = []
    running_score = 0

    length = max(len(aligned_seq1), 1)

    for i in range(len(aligned_seq1)):
        a = aligned_seq1[i]
        b = aligned_seq2[i]

        if a == '-' or b == '-':
            total_gaps += 1
            running_score += gap_penalty
            step_explanations.append({
                'position': i + 1,
                'seq1_char': a,
                'seq2_char': b,
                'score_change': gap_penalty,
                'running_score': running_score,
                'explanation': explain_alignment_step(a, b, gap_penalty, gap_penalty)
            })
        elif a == b:
            total_matches += 1
            running_score += match_score
            step_explanations.append({
                'position': i + 1,
                'seq1_char': a,
                'seq2_char': b,
                'score_change': match_score,
                'running_score': running_score,
                'explanation': explain_alignment_step(a, b, match_score, gap_penalty)
            })
        else:
            total_mismatches += 1
            running_score += mismatch_penalty
            step_explanations.append({
                'position': i + 1,
                'seq1_char': a,
                'seq2_char': b,
                'score_change': mismatch_penalty,
                'running_score': running_score,
                'explanation': explain_alignment_step(a, b, mismatch_penalty, gap_penalty)
            })

    similarity = round((total_matches / length) * 100, 1)

    summary = (
        f"Aligned {len(aligned_seq1)} positions: {total_matches} matches, "
        f"{total_mismatches} mismatches, {total_gaps} gaps. Similarity: {similarity}%.")

    return {
        'summary': summary,
        'step_explanations': step_explanations,
        'total_matches': total_matches,
        'total_mismatches': total_mismatches,
        'total_gaps': total_gaps,
        'optimal_score': optimal_score
    }


def trace_matrix_path(alignment_path, seq1, seq2):
    """Turn the (row,col) traceback into a small list of annotated steps.

    This is mainly for debug views and small visualizations.
    """
    annotated = []
    for idx, (row, col) in enumerate(alignment_path):
        if row == 0 and col == 0:
            ann = 'START'
        elif row == len(seq1) and col == len(seq2):
            ann = 'END (optimal)'
        else:
            a = seq1[row - 1] if row > 0 else '-'
            b = seq2[col - 1] if col > 0 else '-'
            ann = f"{a} / {b}"

        annotated.append({'position': idx, 'row': row, 'col': col, 'annotation': ann})

    return annotated
