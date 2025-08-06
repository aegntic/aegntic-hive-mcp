#!/bin/bash

echo "Installing Aegntic Hive MCP Server..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "npm is not installed. Please install npm first."
    exit 1
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cp .env.example .env
fi

# Make server executable
chmod +x server.js

echo "Installation complete!"
echo ""
echo "To start the server, run:"
echo "  npm start"
echo ""
echo "To configure with Claude Desktop, add this to your MCP configuration:"
echo "{"
echo "  \"mcpServers\": {"
echo "    \"aegntic-hive\": {"
echo "      \"command\": \"node\","
echo "      \"args\": [\"$(pwd)/server.js\"]"
echo "    }"
echo "  }"
echo "}"
echo ""
echo "Setting up shell aliases for deprecated commands..."

# Migration aliases for deprecated commands
# TODO: Remove these after one major release
echo "# Migration aliases for deprecated cldcde commands" >> ~/.bashrc
echo "# TODO: Remove these after one major release" >> ~/.bashrc
echo "alias cldex='echo \"⚠️ cldex is deprecated ⇒ use cldism\" && cldism \"\$@\"'" >> ~/.bashrc
echo "alias cldlist='echo \"⚠️ cldlist is deprecated ⇒ use cldism-list\" && cldism-list \"\$@\"'" >> ~/.bashrc
echo "alias cldshow='echo \"⚠️ cldshow is deprecated ⇒ use cldism-show\" && cldism-show \"\$@\"'" >> ~/.bashrc

# Also add to zshrc if it exists
if [ -f ~/.zshrc ]; then
    echo "# Migration aliases for deprecated cldcde commands" >> ~/.zshrc
    echo "# TODO: Remove these after one major release" >> ~/.zshrc
    echo "alias cldex='echo \"⚠️ cldex is deprecated ⇒ use cldism\" && cldism \"\$@\"'" >> ~/.zshrc
    echo "alias cldlist='echo \"⚠️ cldlist is deprecated ⇒ use cldism-list\" && cldism-list \"\$@\"'" >> ~/.zshrc
    echo "alias cldshow='echo \"⚠️ cldshow is deprecated ⇒ use cldism-show\" && cldism-show \"\$@\"'" >> ~/.zshrc
fi

echo "Migration aliases added to shell configuration files."
