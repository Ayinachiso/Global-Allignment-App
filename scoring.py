"""
Scoring module for Needleman-Wunsch algorithm.
Handles scoring rules for matches, mismatches, and gaps.
"""


def calculate_score(char1, char2, match_score, mismatch_penalty):
    """
    Calculate the score for two characters.
    
    Args:
        char1: First character
        char2: Second character
        match_score: Score for matching characters
        mismatch_penalty: Penalty for mismatching characters
        
    Returns:
        int: Match score if characters match, else mismatch penalty
    """
    if char1 == char2:
        return match_score
    else:
        return mismatch_penalty


def get_match_mismatch_count(aligned_seq1, aligned_seq2):
    """
    Count matches, mismatches, and gaps in aligned sequences.
    
    Args:
        aligned_seq1: First aligned sequence
        aligned_seq2: Second aligned sequence
        
    Returns:
        dict: Contains counts of matches, mismatches, gaps, and similarity percentage
    """
    matches = 0
    mismatches = 0
    gaps = 0
    
    for i in range(len(aligned_seq1)):
        if aligned_seq1[i] == '-' or aligned_seq2[i] == '-':
            gaps += 1
        elif aligned_seq1[i] == aligned_seq2[i]:
            matches += 1
        else:
            mismatches += 1
    
    total_positions = len(aligned_seq1)
    similarity = (matches / total_positions * 100) if total_positions > 0 else 0
    
    return {
        'matches': matches,
        'mismatches': mismatches,
        'gaps': gaps,
        'similarity': round(similarity, 2),
        'total_positions': total_positions
    }
