import { Mention, MentionsInput } from "react-mentions"

interface NaturalLanguageInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

const mentionStyle = {
  backgroundColor: "#dbeafe",
  borderRadius: "2px",
}

const inputStyle = {
  control: {
    fontSize: 14,
    fontWeight: "normal",
  },
  input: {
    margin: 0,
    padding: "8px 12px",
    border: "1px solid hsl(var(--input))",
    borderRadius: "calc(var(--radius) - 2px)",
    outline: "none",
    width: "100%",
  },
  highlighter: {
    padding: "8px 12px",
    border: "1px solid transparent",
  },
  suggestions: {
    list: {
      backgroundColor: "white",
      border: "1px solid rgba(0,0,0,0.15)",
      fontSize: 14,
    },
    item: {
      padding: "5px 15px",
      borderBottom: "1px solid rgba(0,0,0,0.15)",
      "&focused": {
        backgroundColor: "#f0f4ff",
      },
    },
  },
}

function tagData(query: string) {
  if (!query) return []
  return [{ id: query, display: query }]
}

export function NaturalLanguageInput({
  value,
  onChange,
  placeholder,
}: NaturalLanguageInputProps) {
  return (
    <MentionsInput
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={inputStyle}
      allowSuggestionsAboveCursor
      a11ySuggestionsListLabel="Suggested tags"
    >
      <Mention
        trigger="@"
        data={tagData}
        style={mentionStyle}
        appendSpaceOnAdd
      />
    </MentionsInput>
  )
}
