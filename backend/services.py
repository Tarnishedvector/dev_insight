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
        "example": "data = {'name': 'Alice'}\n# Instead of data['age']\nage = data.get('age', 25)",
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
        "example": "age = 25\n# Instead of 'Age: ' + age\nmessage = 'Age: ' + str(age)",
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
        "example": "items = [1, 2, 3]\nif len(items) > 3:\n    print(items[3])\nelse:\n    print('Index out of range')",
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
        "example": "user_input = 'abc'\ntry:\n    number = int(user_input)\nexcept ValueError:\n    print('Please enter a valid number')",
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
        "example": "divisor = 0\nif divisor != 0:\n    result = 10 / divisor\nelse:\n    result = None",
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
        "example": "if hasattr(my_object, 'my_method'):\n    my_object.my_method()\nelse:\n    print('Method not found')",
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
        "example": "# Make sure you installed the package, e.g., pip install requests\nimport requests",
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
        "example": "import os\nfilepath = 'data.txt'\nif os.path.exists(filepath):\n    with open(filepath, 'r') as f:\n        data = f.read()",
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
        "example": "counter = 0 # Define it first\ncounter += 1\nprint(counter)",
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
        "example": "# Missing colon at the end of the if statement\nif is_valid:\n    print('Valid!')",
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
        "example": "def my_func():\n    # Use 4 spaces for indentation\n    print('Hello')",
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
        "example": "my_iter = iter([1, 2])\n# Use default to avoid StopIteration\nval = next(my_iter, None)",
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
        "example": "items = [1, 2, 3]\n# Do not remove items while iterating over a list\nfor item in list(items):\n    items.remove(item)",
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
        "example": "import math\ntry:\n    res = math.exp(1000)\nexcept OverflowError:\n    res = float('inf')",
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
        "example": "import os\nif os.access('/secret.txt', os.R_OK):\n    with open('/secret.txt') as f:\n        print(f.read())\n",
    },
    {
        "pattern": r"Cannot read properties of (undefined|null)",
        "title": "TypeError: Cannot read properties of undefined/null (JS/React)",
        "explanation": "You are trying to access a property on a variable that is currently undefined or null.",
        "fixes": [
            "Use optional chaining (`obj?.property`).",
            "Initialize the state with a default value (e.g., an empty object `{}`).",
            "Add a conditional check before accessing the property.",
        ],
        "example": "// Instead of user.profile.name\nconst name = user?.profile?.name || 'Guest';",
    },
    {
        "pattern": r": Expected corresponding JSX closing tag for <(\w+)>",
        "title": "SyntaxError: Expected corresponding JSX closing tag",
        "explanation": "A JSX tag was opened but never closed, or closed in the wrong order.",
        "fixes": [
            "Ensure every opening tag like `<div>` has a closing tag `</div>`.",
            "If the element has no children, use a self-closing tag like `<img />`.",
        ],
        "example": "// Fix the missing slash or missing tag\nreturn (\n  <div>\n    <img src='...' alt='...' />\n  </div>\n);",
    },
    {
        "pattern": r"Each child in a list should have a unique \"key\" prop",
        "title": "React Warning: Missing Key Prop",
        "explanation": "React requires a unique 'key' prop for elements rendered inside an array or iterator to track changes efficiently.",
        "fixes": [
            "Add a `key` prop to the top-level element in your `.map()` callback.",
            "Use a unique ID from your data (e.g., `item.id`).",
            "Avoid using the array index as a key if the list can change.",
        ],
        "example": "items.map((item) => (\n  <div key={item.id}>{item.name}</div>\n))",
    },
    {
        "pattern": r"Too many re-renders\. React limits the number of renders to prevent an infinite loop",
        "title": "React Error: Too many re-renders",
        "explanation": "You called a state-updating function (like `setState`) directly inside the component body or directly in an event handler without an arrow function.",
        "fixes": [
            "Wrap the state update in an arrow function: `onClick={() => setCount(count + 1)}`.",
            "Move the state update inside a `useEffect` if it should happen on mount/update.",
        ],
        "example": "// Inside render:\n<button onClick={() => setOpen(true)}>Open</button>",
    },
    {
        "pattern": r"Unexpected token .* in JSON at position",
        "title": "SyntaxError: Unexpected token in JSON",
        "explanation": "You tried to parse a string using `JSON.parse()`, but the string is not valid JSON. This often happens when an API returns HTML (like a 404 page) instead of JSON.",
        "fixes": [
            "Check the API response status before calling `.json()`.",
            "Inspect the Network tab to see what the server is actually returning.",
        ],
        "example": "const response = await fetch('/api');\nif (!response.ok) throw new Error('Not OK');\nconst data = await response.json();",
    },
    {
        "pattern": r"ECONNREFUSED",
        "title": "Network Error: ECONNREFUSED",
        "explanation": "Your application tried to connect to a service, but the connection was refused. Usually, this means the target server or database is not running.",
        "fixes": [
            "Ensure your backend database or API server is running.",
            "Check that you are using the correct port and localhost address.",
            "Check for firewall rules blocking the port.",
        ],
        "example": "// Make sure the server processes are running locally:\n// e.g. npm run dev / uvicorn main:app",
    },
    {
        "pattern": r"CORS policy: No 'Access-Control-Allow-Origin' header is present",
        "title": "CORS Error (Cross-Origin Resource Sharing)",
        "explanation": "The browser blocked an API request because the backend server does not have CORS explicitly configured to allow your frontend's domain.",
        "fixes": [
            "If you control the backend, configure CORS middleware to allow the frontend origin.",
            "For local development, ensure your proxy is set up correctly.",
        ],
        "example": "# FastAPI Backend Fix:\nfrom fastapi.middleware.cors import CORSMiddleware\napp.add_middleware(CORSMiddleware, allow_origins=['*'])",
    },
    {
        "pattern": r"Maximum call stack size exceeded",
        "title": "RangeError: Maximum call stack size exceeded",
        "explanation": "You have a recursive function with no base case to stop it, causing an infinite loop that crashes the browser/Node environment.",
        "fixes": [
            "Check for recursive functions calling themselves repeatedly.",
            "Ensure `useEffect` dependencies do not cause a continuous update loop.",
        ],
        "example": "useEffect(() => {\n  // Do not update the dependency 'data' unconditionally if it triggers another fetch\n}, [data]);",
    },
]


def analyze_error(error_text: str) -> dict:
    """
    Match *error_text* against known Python error patterns.
    Returns a dict with title, explanation, suggested fixes, and an example snippet.
    """
    for rule in ERROR_RULES:
        if re.search(rule["pattern"], error_text, re.IGNORECASE | re.MULTILINE):
            return {
                "matched": True,
                "title": rule["title"],
                "explanation": rule["explanation"],
                "fixes": rule["fixes"],
                "example": rule.get("example", ""),
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
        "example": "try:\n    # Failing code here\n    pass\nexcept Exception as e:\n    print(f'Caught exception: {e}')",
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
