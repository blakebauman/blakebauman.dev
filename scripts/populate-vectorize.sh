#!/bin/bash

# Create Vectorize index
echo "Creating Vectorize index..."
wrangler vectorize create resume-index --preset "@cf/baai/bge-large-en-v1.5"

# Create a temporary directory for our vector files
TEMP_DIR=$(mktemp -d)
trap 'rm -rf "$TEMP_DIR"' EXIT

# Import resume data
echo "Importing resume data..."
RESUME_DATA=$(cat app/chat/resume.json)

# Create chunks and save as NDJSON
echo "Creating chunks..."
echo $RESUME_DATA | jq -c '
  [
    {
      "id": "personal",
      "values": ["Name: \(.name)\nTitle: \(.title)\nLocation: \(.location)\nContact: \(.email) | \(.phone)\nLinks: LinkedIn: \(.linkedin) | GitHub: \(.github) | Website: \(.website)"],
      "metadata": {
        "type": "personal",
        "section": "personal_info",
        "text": "Name: \(.name)\nTitle: \(.title)\nLocation: \(.location)\nContact: \(.email) | \(.phone)\nLinks: LinkedIn: \(.linkedin) | GitHub: \(.github) | Website: \(.website)"
      }
    },
    {
      "id": "skills",
      "values": ["Skills: \(.skills | join(", "))"],
      "metadata": {
        "type": "skills",
        "section": "skills",
        "text": "Skills: \(.skills | join(", "))"
      }
    }
  ] + (
    .experience | to_entries | map({
      "id": "experience_\(.key)",
      "values": ["Company: \(.value.company)\nRole: \(.value.role)\nYears: \(.value.years)\nDescription: \(.value.description)"],
      "metadata": {
        "type": "experience",
        "section": "work_experience",
        "company": .value.company,
        "role": .value.role,
        "years": .value.years,
        "text": "Company: \(.value.company)\nRole: \(.value.role)\nYears: \(.value.years)\nDescription: \(.value.description)"
      }
    })
  )
' | jq -c '.[]' > "$TEMP_DIR/vectors.ndjson"

# Show the first vector for debugging
echo "First vector:"
head -n 1 "$TEMP_DIR/vectors.ndjson"

# Insert vectors into the index
echo "Inserting vectors..."
wrangler vectorize insert resume-index --file "$TEMP_DIR/vectors.ndjson"

echo "Vectorize index population complete!" 