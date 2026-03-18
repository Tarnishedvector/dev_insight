"""
DevInsight — Service Layer
Contains the error-analysis engine (regex/rule-based) and the API tester.
"""

import re
import time
import requests as http_requests

# ---------------------------------------------------------------------------
# Error Analysis — rule-based matcher
# ---------------------------------------------------------------------------

ERROR_RULES: list[dict] = [
    {
        "pattern": r"KeyError\s*:\s*['\"]?(.+?)['\"]?$",
        "title": "KeyError",
        "explanation": (
            "A KeyError occurs when you try to access a dictionary key that doesn't exist."
        ),
        "fixes": [
            "Use `dict.get(key, default)` to provide a fallback value.",
            "Check if the key exists first with `if key in my_dict:`.",
            "Use `collections.defaultdict` for automatic default values.",
        ],
    },
    {
        "pattern": r"TypeError\s*:",
        "title": "TypeError",
        "explanation": (
            "A TypeError is raised when an operation or function receives an argument "
            "of the wrong type (e.g., adding a string to an integer)."
        ),
        "fixes": [
            "Verify the types of your variables before performing operations.",
            "Use explicit type conversion: `int()`, `str()`, `float()`.",
            "Check function signatures to ensure you're passing the correct types.",
        ],
    },
    {
        "pattern": r"IndexError\s*:",
        "title": "IndexError",
        "explanation": (
            "An IndexError means you tried to access a list/tuple index that is out of range."
        ),
        "fixes": [
            "Check the length of the list before accessing: `if i < len(my_list):`.",
            "Use try/except to handle the case gracefully.",
            "Use negative indexing (`my_list[-1]`) to access the last element safely.",
        ],
    },
    {
        "pattern": r"ValueError\s*:",
        "title": "ValueError",
        "explanation": (
            "A ValueError is raised when a function receives an argument of the right type "
            "but an inappropriate value (e.g., `int('abc')`)."
        ),
        "fixes": [
            "Validate input data before passing it to functions.",
            "Use try/except around conversion calls.",
            "Provide clear error messages to trace the invalid value.",
        ],
    },
    {
        "pattern": r"ZeroDivisionError\s*:",
        "title": "ZeroDivisionError",
        "explanation": (
            "A ZeroDivisionError occurs when you try to divide a number by zero."
        ),
        "fixes": [
            "Add a guard: `if divisor != 0:` before dividing.",
            "Use try/except to catch the error and return a default value.",
            "Validate user input to prevent zero as a divisor.",
        ],
    },
    {
        "pattern": r"AttributeError\s*:",
        "title": "AttributeError",
        "explanation": (
            "An AttributeError means you tried to access an attribute or method "
            "that doesn't exist on the object."
        ),
        "fixes": [
            "Use `hasattr(obj, 'attr')` to check before accessing.",
            "Verify the object type — it may be None unexpectedly.",
            "Check for typos in the attribute or method name.",
        ],
    },
    {
        "pattern": r"ImportError\s*:|ModuleNotFoundError\s*:",
        "title": "ImportError / ModuleNotFoundError",
        "explanation": (
            "This error occurs when Python cannot find the module you're trying to import."
        ),
        "fixes": [
            "Install the missing package: `pip install <package>`.",
            "Check for typos in the module name.",
            "Verify you're using the correct Python environment / virtual env.",
        ],
    },
    {
        "pattern": r"FileNotFoundError\s*:",
        "title": "FileNotFoundError",
        "explanation": (
            "A FileNotFoundError is raised when trying to open a file that doesn't exist."
        ),
        "fixes": [
            "Double-check the file path and name for typos.",
            "Use `os.path.exists(path)` before opening the file.",
            "Use absolute paths instead of relative paths when in doubt.",
        ],
    },
    {
        "pattern": r"NameError\s*:",
        "title": "NameError",
        "explanation": (
            "A NameError means you used a variable or function name that hasn't been defined yet."
        ),
        "fixes": [
            "Make sure the variable is defined before you use it.",
            "Check for typos or case-sensitivity issues in the name.",
            "Ensure the import statement for external names is present.",
        ],
    },
    {
        "pattern": r"SyntaxError\s*:",
        "title": "SyntaxError",
        "explanation": (
            "A SyntaxError means Python encountered invalid syntax in your code."
        ),
        "fixes": [
            "Check for missing colons, parentheses, or brackets.",
            "Make sure strings are properly quoted and closed.",
            "Look at the line number in the traceback to find the exact location.",
        ],
    },
    {
        "pattern": r"IndentationError\s*:",
        "title": "IndentationError",
        "explanation": (
            "An IndentationError means the indentation of your code is inconsistent or incorrect."
        ),
        "fixes": [
            "Use consistent indentation (4 spaces per level is standard).",
            "Don't mix tabs and spaces — configure your editor to use spaces.",
            "Re-indent the block of code that the error points to.",
        ],
    },
    {
        "pattern": r"StopIteration\s*:",
        "title": "StopIteration",
        "explanation": (
            "StopIteration is raised when `next()` is called on an exhausted iterator."
        ),
        "fixes": [
            "Use a for-loop instead of manually calling `next()`.",
            "Pass a default to `next(iterator, default)` to avoid the error.",
            "Check if the iterator still has items before calling next.",
        ],
    },
    {
        "pattern": r"RuntimeError\s*:",
        "title": "RuntimeError",
        "explanation": (
            "A RuntimeError is a generic error raised when no other category fits. "
            "It often signals a logic issue in your program."
        ),
        "fixes": [
            "Read the full error message — it often describes the exact problem.",
            "Check for infinite recursion or mutating a collection while iterating.",
            "Add defensive checks around the failing code path.",
        ],
    },
    {
        "pattern": r"OverflowError\s*:",
        "title": "OverflowError",
        "explanation": (
            "An OverflowError is raised when a numeric operation produces a result "
            "too large to be represented."
        ),
        "fixes": [
            "Use Python's arbitrary-precision integers instead of floats.",
            "Add bounds checking before performing large calculations.",
            "Consider using the `decimal` module for precise arithmetic.",
        ],
    },
    {
        "pattern": r"PermissionError\s*:",
        "title": "PermissionError",
        "explanation": (
            "A PermissionError means the program doesn't have the required OS permissions "
            "to perform the operation (e.g., reading/writing a file)."
        ),
        "fixes": [
            "Run the script with elevated permissions if appropriate.",
            "Check file/directory permissions with your OS tools.",
            "Make sure the file is not locked by another process.",
        ],
    },
]


def analyze_error(error_text: str) -> dict:
    """
    Match *error_text* against known Python error patterns.
    Returns a dict with title, explanation, and suggested fixes.
    """
    for rule in ERROR_RULES:
        if re.search(rule["pattern"], error_text, re.IGNORECASE | re.MULTILINE):
            return {
                "matched": True,
                "title": rule["title"],
                "explanation": rule["explanation"],
                "fixes": rule["fixes"],
            }

    # Fallback for unrecognised errors
    return {
        "matched": False,
        "title": "Unknown Error",
        "explanation": (
            "DevInsight couldn't match this error to a known pattern. "
            "Try pasting the full traceback for a better match."
        ),
        "fixes": [
            "Search the error message on Stack Overflow.",
            "Check the official Python documentation for details.",
            "Add try/except blocks to isolate the failing code.",
        ],
    }


# ---------------------------------------------------------------------------
# API Tester
# ---------------------------------------------------------------------------

MAX_PREVIEW_CHARS = 500


def test_api(url: str, method: str, body: dict | None = None, headers: dict | None = None) -> dict:
    """
    Send an HTTP request and return status code, response time, and a body preview.
    """
    method = method.upper()
    start = time.perf_counter()

    try:
        if method == "POST":
            resp = http_requests.post(url, json=body, headers=headers, timeout=15)
        else:
            resp = http_requests.get(url, headers=headers, timeout=15)

        elapsed = round(time.perf_counter() - start, 4)

        # Try to get JSON; fall back to text
        try:
            preview = resp.json()
        except Exception:
            preview = resp.text[:MAX_PREVIEW_CHARS]

        return {
            "success": True,
            "status_code": resp.status_code,
            "response_time": elapsed,
            "preview": preview,
        }

    except http_requests.exceptions.Timeout:
        elapsed = round(time.perf_counter() - start, 4)
        return {
            "success": False,
            "status_code": 0,
            "response_time": elapsed,
            "error": "Request timed out after 15 seconds.",
        }
    except http_requests.exceptions.ConnectionError:
        elapsed = round(time.perf_counter() - start, 4)
        return {
            "success": False,
            "status_code": 0,
            "response_time": elapsed,
            "error": "Could not connect to the specified URL. Check the address and try again.",
        }
    except Exception as exc:
        elapsed = round(time.perf_counter() - start, 4)
        return {
            "success": False,
            "status_code": 0,
            "response_time": elapsed,
            "error": str(exc),
        }
