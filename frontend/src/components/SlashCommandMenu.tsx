import { Command } from "lucide-react"
import { Card } from "@/components/ui/card"

interface SlashCommand {
  id: string
  label: string
  description: string
  icon?: string
}

interface SlashCommandMenuProps {
  isOpen: boolean
  onSelect: (command: SlashCommand) => void
  position?: { top: number; left: number }
}

const SLASH_COMMANDS: SlashCommand[] = [
  {
    id: "show-mr",
    label: "Show Merge Request",
    description: "Display merge request details",
    icon: "📋"
  },
  {
    id: "review-mr",
    label: "Review MR",
    description: "AI-powered code review of merge request",
    icon: "🔍"
  }
]

/**
 * SlashCommandMenu component - Displays available slash commands
 *
 * @param {SlashCommandMenuProps} props - Component props
 * @param {boolean} props.isOpen - Whether the menu is visible
 * @param {Function} props.onSelect - Callback when a command is selected
 * @param {Object} props.position - Menu position (top, left)
 * @returns JSX element
 */
export default function SlashCommandMenu({ isOpen, onSelect, position }: SlashCommandMenuProps) {
  if (!isOpen) return null

  return (
    <Card
      className="absolute z-50 w-80 shadow-lg border-slate-200 overflow-hidden"
      style={{
        bottom: position?.top || 60,
        left: position?.left || 0,
      }}
    >
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-3 py-2 border-b border-slate-200">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
          <Command className="h-3 w-3" />
          <span>Slash Commands</span>
        </div>
      </div>
      <div className="max-h-64 overflow-y-auto">
        {SLASH_COMMANDS.map((command, index) => (
          <button
            key={command.id}
            onClick={() => onSelect(command)}
            className={`w-full text-left px-3 py-2.5 hover:bg-blue-50 transition-colors border-b border-slate-100 last:border-b-0 focus:outline-none focus:bg-blue-50 ${
              index === 0 ? "bg-slate-50" : ""
            }`}
          >
            <div className="flex items-start gap-2">
              {command.icon && <span className="text-lg">{command.icon}</span>}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-slate-900">{command.label}</div>
                <div className="text-xs text-slate-600 mt-0.5">{command.description}</div>
              </div>
            </div>
          </button>
        ))}
      </div>
      <div className="bg-slate-50 px-3 py-1.5 border-t border-slate-200">
        <p className="text-xs text-slate-500">
          Press <kbd className="px-1 py-0.5 bg-white border border-slate-300 rounded text-xs">↑</kbd>{" "}
          <kbd className="px-1 py-0.5 bg-white border border-slate-300 rounded text-xs">↓</kbd> to navigate,{" "}
          <kbd className="px-1 py-0.5 bg-white border border-slate-300 rounded text-xs">Enter</kbd> to select
        </p>
      </div>
    </Card>
  )
}
