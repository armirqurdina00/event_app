#!/bin/bash

# Exit on any error
set -e

# Push to 'github' remote
echo "Pushing to github remote..."
git push github main

# Push to 'gitlab' remote
echo "Pushing to gitlab remote..."
git push gitlab main

echo "Pushed to remotes successfully."