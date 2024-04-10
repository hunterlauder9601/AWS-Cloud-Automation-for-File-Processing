#!/bin/bash

inputFile="$1"
inputText="$2"

# check if the input file exists
if [[ ! -f "$inputFile" ]]; then
  echo "The file $inputFile does not exist."
  exit 1
fi

outputFile="Output-${inputFile}"

cp "$inputFile" "$outputFile"
echo -n " : $inputText" >> "$outputFile"
