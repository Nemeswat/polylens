#!/bin/bash

traverse_directory() {
  local directory="$1"
  local output=""

  while IFS= read -r -d $'\0' file; do
    if [[ -f "$file" && ("${file##*.}" == "ts" || "${file##*.}" == "tsx" || "${file##*.}" == "css") ]]; then
      file_content=$(cat "$file")
      output+="File Path: $file\n\n\`\`\`\n$file_content\n\`\`\`\n\n"
      echo "Copied: $file"
    fi
  done < <(git ls-files --exclude-standard -z "$directory")

  echo "$output"
}

# Get the project root from the command line argument or use the current directory
project_root="${1:-$(pwd)}"

# Traverse the project directory and generate the output
output=$(traverse_directory "$project_root")

# Format the output for the LLM
formatted_output="Here are the contents of the essential files in the React Next.js Tailwind project:\n\n$output"

# Copy the formatted output to the clipboard
echo "$formatted_output" | pbcopy

echo "The essential files and their contents have been copied to the clipboard."
