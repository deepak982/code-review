import { useState } from "react"
import ChatInterface from "./ChatInterface"
import GitLabConfigSidebar from "./Sidebar/GitLabConfigSidebar"
import { Button } from "./ui/button"
import { Settings } from "lucide-react"

export default function ChatLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <div className="relative">
      {/* Settings Button - Fixed in top right */}
      <Button
        onClick={() => setIsSidebarOpen(true)}
        className="fixed top-4 right-4 z-30 h-10 w-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg"
        size="icon"
      >
        <Settings className="h-5 w-5" />
      </Button>

      {/* Chat Interface */}
      <ChatInterface />

      {/* Sidebar */}
      <GitLabConfigSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
    </div>
  )
}
