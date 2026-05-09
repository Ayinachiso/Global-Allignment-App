"""alignment_logic
Simple, readable implementation of Needleman-Wunsch.

This module prefers plain, human-friendly comments so the code
reads like a short explanation you might leave for a teammate.
"""

from scoring import calculate_score


class NeedlemanWunsch:
    """Global alignment using Needleman-Wunsch (dynamic programming).

    The class keeps the matrices and provides a small, clear API:
    - `align()` runs the full pipeline
    - `get_results()` returns a plain dict suitable for JSON
    """

    def __init__(self, seq1, seq2, match_score, mismatch_penalty, gap_penalty):
        # store normalized sequences and scoring params
        self.seq1 = seq1.upper()
        self.seq2 = seq2.upper()
        self.match_score = match_score
        self.mismatch_penalty = mismatch_penalty
        self.gap_penalty = gap_penalty

        # matrix size (include the initial zero row/column)
        self.rows = len(self.seq1) + 1
        self.cols = len(self.seq2) + 1

        # the DP score matrix and a simple traceback matrix
        self.score_matrix = [[0] * self.cols for _ in range(self.rows)]
        self.traceback_matrix = [['' for _ in range(self.cols)] for _ in range(self.rows)]

        # outputs we will fill in
        self.optimal_score = 0
        self.aligned_seq1 = ''
        self.aligned_seq2 = ''
        self.alignment_path = []

    def initialize_matrix(self):
        """Fill the first row/column with cumulative gap penalties.

        This seeds the DP table with the cost of aligning prefixes against
        an all-gap sequence.
        """
        for j in range(self.cols):
            self.score_matrix[0][j] = j * self.gap_penalty
            if j > 0:
                self.traceback_matrix[0][j] = 'LEFT'

        for i in range(self.rows):
            self.score_matrix[i][0] = i * self.gap_penalty
            if i > 0:
                self.traceback_matrix[i][0] = 'UP'

    def fill_matrix(self):
        """Compute scores for every cell using the DP recurrence.

        For each cell we consider three options:
        - diagonal (match or mismatch)
        - up (gap in sequence 2)
        - left (gap in sequence 1)
        We record the best score and a simple direction for traceback.
        """
        for i in range(1, self.rows):
            for j in range(1, self.cols):
                a = self.seq1[i - 1]
                b = self.seq2[j - 1]

                diag = self.score_matrix[i - 1][j - 1] + calculate_score(a, b, self.match_score, self.mismatch_penalty)
                gap_up = self.score_matrix[i - 1][j] + self.gap_penalty
                gap_left = self.score_matrix[i][j - 1] + self.gap_penalty

                options = {
                    'DIAG': diag,
                    'UP': gap_up,
                    'LEFT': gap_left
                }

                best = max(options, key=options.get)
                self.score_matrix[i][j] = options[best]
                self.traceback_matrix[i][j] = best

        # bottom-right holds the optimal global score
        self.optimal_score = self.score_matrix[self.rows - 1][self.cols - 1]

    def traceback(self):
        """Walk back from bottom-right to reconstruct the alignment.

        The traceback is recorded as a list of (row, col) coordinates.
        """
        i = self.rows - 1
        j = self.cols - 1
        left = ''
        right = ''
        path = []

        while i > 0 or j > 0:
            path.append((i, j))

            if i == 0:
                # only moves left are possible
                right = self.seq2[j - 1] + right
                left = '-' + left
                j -= 1
            elif j == 0:
                # only moves up are possible
                left = self.seq1[i - 1] + left
                right = '-' + right
                i -= 1
            else:
                direction = self.traceback_matrix[i][j]
                if direction == 'DIAG':
                    left = self.seq1[i - 1] + left
                    right = self.seq2[j - 1] + right
                    i -= 1
                    j -= 1
                elif direction == 'UP':
                    left = self.seq1[i - 1] + left
                    right = '-' + right
                    i -= 1
                else:  # LEFT
                    left = '-' + left
                    right = self.seq2[j - 1] + right
                    j -= 1

        path.append((0, 0))
        path.reverse()

        self.aligned_seq1 = left
        self.aligned_seq2 = right
        self.alignment_path = path

    def align(self):
        """Run the full alignment and return a results dict.

        This method is what the rest of the app calls.
        """
        self.initialize_matrix()
        self.fill_matrix()
        self.traceback()
        return self.get_results()

    def get_results(self):
        """Return a friendly dictionary with results and the full matrix.

        The dict includes both `score_matrix` (historic name) and `matrix`
        for convenience in different consumers.
        """
        return {
            'score_matrix': self.score_matrix,
            'matrix': self.score_matrix,
            'aligned_seq1': self.aligned_seq1,
            'aligned_seq2': self.aligned_seq2,
            'optimal_score': self.optimal_score,
            'seq1_original': self.seq1,
            'seq2_original': self.seq2,
            'alignment_path': self.alignment_path,
            'matrix_rows': self.rows,
            'matrix_cols': self.cols
        }

    def get_match_indicators(self):
        """Return a short visual string showing matches, mismatches, and gaps.

        Uses `|` for match, `x` for mismatch, and space for gaps.
        """
        out = []
        for a, b in zip(self.aligned_seq1, self.aligned_seq2):
            if a == b:
                out.append('|')
            elif a == '-' or b == '-':
                out.append(' ')
            else:
                out.append('x')
        return ''.join(out)
