#!/bin/bash
cd "$(dirname "$0")"
# Kill any process on port 3000 to ensure we get it
lsof -ti :3000 | xargs kill -9 2>/dev/null
npm run dev
