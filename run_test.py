import re

def check_aria_labels():
    with open('public/app.js', 'r') as f:
        content = f.read()

    errors = []
    if 'aria-label="Close dialog">&times;</button>' not in content and 'aria-label="Close modal">&times;</button>' not in content:
        errors.append("Modal close button missing aria-label")
    if 'aria-label="Remove item">&times;</button>' not in content:
        errors.append("Remove item buttons missing aria-label")

    if errors:
        for e in errors:
            print(e)
        return False
    print("All checks passed.")
    return True

check_aria_labels()
