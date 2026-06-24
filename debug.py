#!/usr/bin/env python3
"""Debug utility for the Authentication System.

Runs shell commands for debugging the auth system.
Usage:
    python debug.py <command> [args...]
    python debug.py check-server
    python debug.py check-db
    python debug.py list-routes
"""

import subprocess
import sys
import shlex


HELPERS = {
    "check-server": "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/",
    "check-db": 'node -e "const {initializeDatabase} = require("./utils/database"); initializeDatabase().then(() => console.log("DB OK")).catch(e => console.error("DB FAIL:", e.message))"',
    "list-routes": 'node -e "const express = require("express"); const app = express(); require("./index")(app).then(() => { app._router.stack.forEach(r => { if(r.route) console.log("%s %s", JSON.stringify(Object.keys(r.route.methods)), r.route.path); }); }).catch(console.error)"',
    "check-env": "node -e "console.log(JSON.stringify({NODE_ENV: process.env.NODE_ENV, DB_TYPE: process.env.DB_TYPE, JWT_SECRET: process.env.JWT_SECRET ? '***' : undefined, PORT: process.env.PORT || 3000}, null, 2))"",
    "show-config": "node -e "const {loadConfig} = require('./utils/configLoader'); console.log(JSON.stringify(loadConfig(), null, 2))"",
}


def print_help():
    print("Usage: python debug.py <command> [args...]")
    print()
    print("Commands:")
    for cmd, desc in [
        ("<shell command>", "Run an arbitrary shell command"),
        ("check-server", "Check if the auth server is running"),
        ("check-db", "Test database connectivity"),
        ("list-routes", "List all registered Express routes"),
        ("check-env", "Show key environment variables"),
        ("show-config", "Show loaded config"),
        ("help", "Show this help message"),
    ]:
        print(f"  {cmd:30s} {desc}")


def main():
    if len(sys.argv) < 2 or sys.argv[1] in ("-h", "--help", "help"):
        print_help()
        return

    command = sys.argv[1]

    if command in HELPERS:
        cmd_str = HELPERS[command]
        print(f"[debug] Running helper: {command}")
        print(f"[debug] $ {cmd_str}")
        print("-" * 60)
    else:
        cmd_str = " ".join(shlex.quote(a) for a in sys.argv[1:])
        print(f"[debug] $ {cmd_str}")
        print("-" * 60)

    result = subprocess.run(cmd_str, shell=True, capture_output=False, text=True)

    sys.exit(result.returncode)


if __name__ == "__main__":
    main()
