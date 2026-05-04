#!/bin/bash
# GitHub Pages Deployment Script
# Run this on your local machine after cloning the repo

# 1. Build the project
npm install
npm run build

# 2. Deploy to gh-pages branch
cd dist
git init
git add -A
git commit -m "Deploy to GitHub Pages"
git branch -M gh-pages
git remote add origin "$1"
git push -f origin gh-pages

echo "Done! Enable GitHub Pages in repo Settings > Pages > Source: gh-pages branch"
