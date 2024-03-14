#!/bin/bash

copy_single_file() {
  local file_path="$1"
  if [[ -f "$file_path" && ("${file_path##*.}" == "ts" || "${file_path##*.}" == "tsx" || "${file_path##*.}" == "css") ]]; then
    file_content=$(cat "$file_path")
    formatted_output="File Path: $file_path\n\n\`\`\`\n$file_content\n\`\`\`\n\n"
    echo "$formatted_output" | pbcopy
    echo "Copied: $file_path"
    echo "The file content has been copied to the clipboard."
  else
    echo "Invalid file path or unsupported file type."
  fi
}

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

  # Check if package.json exists in the project root
  if [[ -f "$directory/package.json" ]]; then
    package_json_content=$(cat "$directory/package.json")
    output+="File Path: $directory/package.json\n\n\`\`\`json\n$package_json_content\n\`\`\`\n\n"
    echo "Copied: $directory/package.json"
  fi

  echo "$output"
}

# Check if a file path is provided as a command line argument
if [[ $1 == "--file" || $1 == "-f" ]]; then
  # Copy a single file
  file_path="$2"
  copy_single_file "$file_path"
else
  # Get the project root from the command line argument or use the current directory
  project_root="${1:-$(pwd)}"

  # Traverse the project directory and generate the output
  output=$(traverse_directory "$project_root")

  # Format the output for the LLM
  formatted_output="Here are the contents of the essential files in the React Next.js Tailwind project:\n\n$output"

  # Copy the formatted output to the clipboard
  echo "$formatted_output" | pbcopy

  echo "The essential files and their contents have been copied to the clipboard."
fi