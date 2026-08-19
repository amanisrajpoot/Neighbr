"""
1-Click Entry Point for Neighbr E2E Platform Test Suite
"""

import sys
import os

# Set root directory
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from testing.e2e.runner import run_master_e2e_suite

if __name__ == "__main__":
    run_master_e2e_suite()
